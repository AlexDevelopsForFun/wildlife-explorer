#!/usr/bin/env node
/**
 * scripts/buildZoneRarity.js
 *
 * Computes zone-specific rarity for the 5 mega-parks defined in
 * src/data/parkZones.js (Grand Canyon, Yellowstone, Yosemite, Glacier,
 * Great Smokies). The cache's park-level rarity is a single number across
 * an area that spans radically different habitats — Grand Canyon's South
 * Rim Village is nothing like Phantom Ranch a mile below. This script
 * queries iNaturalist with a bounding box around each zone's centroid,
 * then assigns each species an (optional) per-zone tier.
 *
 * Methodology per zone:
 *   1. Query /observations/species_counts with bbox = centroid ± radiusKm.
 *   2. For each species in the park's cache that ALSO has zone observations,
 *      compute frequency by normalizing zone obs against park obs (i.e. the
 *      same rarityFromObsCount thresholds, scaled by zone_share).
 *   3. Apply visitor-effort scalar + charisma overrides (same as v2).
 *   4. Store as `animal.zones[zoneId] = { rarity, frequency, obsCount, source }`.
 *
 * Species with no zone observations stay without a zones entry — the UI
 * will fall back to the park-level rarity for unknown zones.
 *
 * Usage:
 *   node scripts/buildZoneRarity.js                           # all zoned parks
 *   node scripts/buildZoneRarity.js --parks=grandcanyon,yellowstone
 *   DRY_RUN=1 node scripts/buildZoneRarity.js                  # preview, no write
 *   EFFORT=expert node scripts/buildZoneRarity.js              # skip visitor scalar
 *
 * Output: updates src/data/wildlifeCache.js in place (adds `.zones`
 * sub-object to each animal in a zoned park). Uses applyRarityV2 as a
 * post-step equivalent — call this BEFORE applyRarityV2 if you want V2
 * to also re-map zone rarities.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  CHARISMA_OVERRIDES_V2,
  VISITOR_EFFORT,
  DEFAULT_VISITOR_EFFORT,
  rarityFromFrequency,
} from '../src/data/speciesMetadata.js';
import { PARK_ZONES } from '../src/data/parkZones.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');

const DRY_RUN = process.env.DRY_RUN === '1';
const EFFORT  = process.env.EFFORT ?? DEFAULT_VISITOR_EFFORT;
const EFFORT_SCALAR = VISITOR_EFFORT[EFFORT] ?? VISITOR_EFFORT.casual;

const parksArg = process.argv.find(a => a.startsWith('--parks='));
const PARK_FILTER = parksArg
  ? new Set(parksArg.slice('--parks='.length).split(',').map(s => s.trim()))
  : null;

// ── Rate limiting ──────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INAT_DELAY_MS = 1200; // iNat asks for 1/sec — stay well under

// ── Geo helpers ─────────────────────────────────────────────────────────────
// Convert radius-km to lat/lng degrees (approximation, fine for our zones).
function bboxFromCentroid(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111;                   // ~111 km per degree lat
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  return {
    swlat: (lat - latDelta).toFixed(4),
    swlng: (lng - lngDelta).toFixed(4),
    nelat: (lat + latDelta).toFixed(4),
    nelng: (lng + lngDelta).toFixed(4),
  };
}

// ── iNat: fetch species counts within a bbox ────────────────────────────────
// Paginates through /observations/species_counts, returns { name -> obsCount }.
// Each page retried up to 3× on network transients (this is what caused
// Mariposa Grove to return 0 species on first build).
async function fetchPageWithRetry(url, label, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'wildlife-map-zone-rarity/1.0' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = 2000 * (attempt + 1);
        console.warn(`      ⚠  HTTP ${res.status} on ${label} — retrying in ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }
      console.warn(`      ⚠  HTTP ${res.status} on ${label} — giving up`);
      return null;
    } catch (err) {
      if (attempt < retries) {
        const delay = 2000 * (attempt + 1);
        console.warn(`      ⚠  ${err.message} on ${label} — retrying in ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }
      console.warn(`      ⚠  ${err.message} on ${label} — giving up`);
      return null;
    }
  }
  return null;
}

async function fetchZoneSpeciesCounts(bbox) {
  const out = new Map();
  let page = 1;
  const perPage = 500;
  for (;;) {
    const url =
      `https://api.inaturalist.org/v1/observations/species_counts?` +
      `swlat=${bbox.swlat}&swlng=${bbox.swlng}&nelat=${bbox.nelat}&nelng=${bbox.nelng}` +
      `&quality_grade=research&iconic_taxa=Aves,Mammalia,Reptilia,Amphibia,Actinopterygii,Insecta` +
      `&per_page=${perPage}&page=${page}`;
    const data = await fetchPageWithRetry(url, `bbox page ${page}`);
    const results = data?.results ?? [];
    if (!results.length) break;
    for (const r of results) {
      const taxon = r?.taxon;
      const name  = taxon?.preferred_common_name ?? taxon?.name;
      if (name) out.set(name, r.count);
    }
    if (results.length < perPage) break;
    if (page >= 20) break;                           // safety cap
    page++;
    await sleep(INAT_DELAY_MS);
  }
  return out;
}

// ── Threshold mapping (mirrors applyRarityV2.js / apiService.js) ───────────
function obsCountToFrequencyEstimate(obsCount, scale = 1) {
  if (obsCount == null) return null;
  if (obsCount >= 2000 * scale) return 0.95;
  if (obsCount >= 500  * scale) return 0.75;
  if (obsCount >= 100  * scale) return 0.45;
  if (obsCount >= 20   * scale) return 0.18;
  if (obsCount >= 5    * scale) return 0.05;
  return 0.01;
}

// Apply charisma override + visitor-effort to a zone frequency.
function applyZoneAdjustments(freq, name) {
  if (freq == null) return null;

  // Charisma override — V2 values assume the baseline was 1.0. Zone counts
  // are raw iNat observations with no prior ÷3 correction, so we apply the
  // override directly.
  if (name in CHARISMA_OVERRIDES_V2) {
    freq = freq * CHARISMA_OVERRIDES_V2[name];
  } else {
    // Blanket raptor/eagle default so zone tiers match park pipeline.
    const lower = name.toLowerCase();
    if (/bald eagle/.test(lower)) freq *= 0.2;
    else if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) {
      freq *= (1 / 3);
    }
  }

  // Visitor-effort scalar
  freq *= EFFORT_SCALAR;

  return Math.min(Math.max(freq, 0), 1);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const mod = await import(`file://${CACHE_PATH.replace(/\\/g, '/')}`);
  const cache = mod.WILDLIFE_CACHE;
  const builtAt = mod.WILDLIFE_CACHE_BUILT_AT;

  const zonedParkIds = Object.keys(PARK_ZONES)
    .filter(id => cache[id])
    .filter(id => !PARK_FILTER || PARK_FILTER.has(id));

  console.log(`🗺  Building zone rarity for ${zonedParkIds.length} parks (effort=${EFFORT}, scalar=${EFFORT_SCALAR})\n`);

  const newCache = { ...cache };
  const stats = { parks: 0, zones: 0, speciesUpdated: 0, tierBreakdown: {} };

  for (const parkId of zonedParkIds) {
    stats.parks++;
    const zones = PARK_ZONES[parkId];
    const parkAnimals = cache[parkId].animals;
    console.log(`  [${parkId}] ${zones.length} zones × ${parkAnimals.length} species`);

    // Build name → index for fast lookups when merging zones back in.
    const nameIdx = new Map(parkAnimals.map((a, i) => [a.name, i]));
    const updatedAnimals = parkAnimals.map(a => ({ ...a }));  // shallow clone

    // We need an across-zones reference for threshold scaling. Use max zone
    // total obs as the "full" park baseline. Compute zone fetches serially
    // so iNat isn't slammed.
    const zoneResults = [];
    for (const zone of zones) {
      stats.zones++;
      const bbox = bboxFromCentroid(zone.lat, zone.lng, zone.radiusKm);
      console.log(`    • ${zone.label}  bbox=(${bbox.swlat},${bbox.swlng})→(${bbox.nelat},${bbox.nelng})`);
      let counts;
      try {
        counts = await fetchZoneSpeciesCounts(bbox);
      } catch (err) {
        console.warn(`      ⚠  fetch failed: ${err.message}`);
        counts = new Map();
      }
      const total = Array.from(counts.values()).reduce((s, c) => s + c, 0);
      console.log(`      ✓ ${counts.size} species, ${total} total obs`);
      zoneResults.push({ zone, counts, total });
      await sleep(INAT_DELAY_MS);
    }

    // The largest zone's total obs becomes the park-level "scale = 1" anchor.
    // Smaller zones get a proportional scale so their thresholds shrink.
    const maxTotal = Math.max(1, ...zoneResults.map(z => z.total));

    // Merge each zone's species counts back into each matching animal.
    for (const { zone, counts, total } of zoneResults) {
      const scale = Math.max(0.05, total / maxTotal);

      for (const [speciesName, zoneObs] of counts) {
        const idx = nameIdx.get(speciesName);
        if (idx == null) continue;

        const rawFreq = obsCountToFrequencyEstimate(zoneObs, scale);
        const adjFreq = applyZoneAdjustments(rawFreq, speciesName);
        const tier    = rarityFromFrequency(adjFreq);

        const animal = updatedAnimals[idx];
        animal.zones = animal.zones || {};
        animal.zones[zone.id] = {
          rarity:    tier,
          frequency: Number(adjFreq.toFixed(4)),
          obsCount:  zoneObs,
          source:    'inat_bbox',
        };
        stats.tierBreakdown[tier] = (stats.tierBreakdown[tier] ?? 0) + 1;
        stats.speciesUpdated++;
      }
    }

    newCache[parkId] = { ...cache[parkId], animals: updatedAnimals };
  }

  console.log(`\n📊 Zone rarity summary`);
  console.log(`   Parks:     ${stats.parks}`);
  console.log(`   Zones:     ${stats.zones}`);
  console.log(`   Rows set:  ${stats.speciesUpdated}`);
  console.log(`   Tier distribution (per species-zone):`);
  for (const [tier, n] of Object.entries(stats.tierBreakdown).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / stats.speciesUpdated) * 100).toFixed(1);
    console.log(`     ${tier.padEnd(12)} ${n.toString().padStart(6)}  (${pct}%)`);
  }

  if (DRY_RUN) {
    console.log('\n   DRY_RUN=1 — not writing cache file.');
    return;
  }

  // Rewrite wildlifeCache.js preserving all non-zoned parks.
  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Zone rarity layered by scripts/buildZoneRarity.js on ${new Date().toISOString()}`,
    `// Parks with zone data: ${zonedParkIds.join(', ')}`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];
  for (const [id, val] of Object.entries(newCache)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);
  writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
  console.log(`\n✅ Wrote ${CACHE_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
