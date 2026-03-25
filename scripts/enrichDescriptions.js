#!/usr/bin/env node
/**
 * scripts/enrichDescriptions.js
 *
 * Reads the existing wildlifeCache.js, fetches a Wikipedia/iNaturalist
 * description for every animal that has a placeholder fun fact, and writes
 * the result back with two new fields per animal:
 *   description        — 1-2 sentence plain-text description
 *   descriptionSource  — 'iNaturalist' | 'Wikipedia' | 'Park Records'
 *
 * Animals with curated fun facts (hardcoded in wildlifeData.js) are left
 * unchanged — their funFact field already contains a good description.
 *
 * Progress is saved to scripts/description-cache.json so the script is
 * fully resumable — interrupted runs don't lose work.
 *
 * Usage:
 *   node scripts/enrichDescriptions.js                 # all parks
 *   PARKS=acadia node scripts/enrichDescriptions.js    # one park
 *   PARKS=acadia,yellowstone node scripts/enrichDescriptions.js
 *   DRY_RUN=1 node scripts/enrichDescriptions.js       # preview only
 *
 * Estimated time: ~4 hours for all 63 parks (~21,000 placeholder animals).
 * Run with PARKS= to do one park at a time.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH   = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const DESC_CACHE_PATH = path.join(__dirname, 'description-cache.json');

const DRY_RUN = process.env.DRY_RUN === '1';

// ── Placeholder detection ────────────────────────────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /^Confirmed at this park's eBird hotspot\.?$/i,
  /^Recorded in this region \(eBird historical checklist\)\.?$/i,
  /^\d+ research-grade iNaturalist observations at this park\.?$/i,
  /^Recorded \d+ times on iNaturalist at this park\.?$/i,
  /^Appears on \d+% of .+ eBird checklists/i,
  /^Officially documented in the NPS wildlife registry/i,
  /^Recently reported within/i,
  /^Listed in the NPS species inventory/i,
];

function needsDescription(animal) {
  // Skip if already enriched
  if (animal.description) return false;
  // Skip if funFact is a real curated description (not a placeholder)
  const f = animal.funFact?.trim();
  if (!f) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(f));
}

// ── Utilities ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function firstNSentences(text, n = 2) {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentenceRe = /[^.!?]+(?:[.!?](?:\s|$))+/g;
  const matches = [...cleaned.matchAll(sentenceRe)]
    .map(m => m[0].trim())
    .filter(s => s.length > 15);
  if (!matches.length) return cleaned.length > 300 ? cleaned.slice(0, 300) + '…' : cleaned;
  return matches.slice(0, n).join(' ').trim();
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildlifeExplorerMap/1.0 (educational; non-commercial)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── Description sources ───────────────────────────────────────────────────────

async function fetchInatDescription(name, scientificName) {
  const query = scientificName || name;
  const data = await safeFetch(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=1&locale=en&is_active=true`
  );
  const taxon = data?.results?.[0];
  if (!taxon) return null;

  const summary = taxon.wikipedia_summary?.replace(/<[^>]+>/g, '').trim();
  if (!summary || summary.length < 30) return null;

  const commonLower = name.toLowerCase();
  const returnedCommon = (taxon.preferred_common_name ?? '').toLowerCase();
  const returnedSci = (taxon.name ?? '').toLowerCase();
  const sciLower = (scientificName ?? '').toLowerCase();

  const nameMatches =
    returnedCommon.includes(commonLower.split(' ').pop()) ||
    commonLower.includes(returnedCommon.split(' ').pop()) ||
    (sciLower && returnedSci.startsWith(sciLower.split(' ')[0]));

  if (!nameMatches) return null;

  return { text: firstNSentences(summary, 2), source: 'iNaturalist' };
}

async function fetchWikipediaDescription(name) {
  const url =
    `https://en.wikipedia.org/api/rest_v1/page/summary/` +
    `${encodeURIComponent(name.replace(/ /g, '_'))}`;
  const data = await safeFetch(url);

  if (!data?.extract || data.type === 'disambiguation' || data.extract.length < 30) return null;

  const desc = (data.description ?? '').toLowerCase();
  const badTypes = ['city', 'town', 'county', 'region', 'river', 'mountain',
                    'lake', 'disambiguation', 'village', 'municipality'];
  if (badTypes.some(t => desc.includes(t))) return null;

  return { text: firstNSentences(data.extract, 2), source: 'Wikipedia' };
}

function buildFactualFallback(animal, parkName) {
  const seasons = (animal.seasons ?? []).filter(s => s !== 'year_round');
  const bestSeason =
    seasons.length === 1 ? seasons[0]
    : seasons.includes('summer') ? 'summer'
    : seasons.includes('spring') ? 'spring'
    : seasons.includes('fall')   ? 'fall'
    : seasons[0] ?? 'summer';
  const seasonLabel = bestSeason.charAt(0).toUpperCase() + bestSeason.slice(1);
  return {
    text:   `${animal.name} is officially documented in the species inventory for ${parkName}. ` +
            `Visit during ${seasonLabel} for the best chance of a sighting.`,
    source: 'Park Records',
  };
}

async function fetchDescription(animal, parkName) {
  const inat = await fetchInatDescription(animal.name, animal.scientificName);
  if (inat) return inat;
  await sleep(250);
  const wiki = await fetchWikipediaDescription(animal.name);
  if (wiki) return wiki;
  return buildFactualFallback(animal, parkName);
}

// ── Persistent description cache ──────────────────────────────────────────────
// Key: "{scientificName || commonName}" — species-level, not park-specific.
// Same description is reused across parks (Wikipedia/iNat descriptions are
// species-wide). Only the factual fallback is park-specific (observation count).

function loadDescriptionCache() {
  if (!existsSync(DESC_CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(DESC_CACHE_PATH, 'utf8'));
  } catch { return {}; }
}

function saveDescriptionCache(cache) {
  writeFileSync(DESC_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const PARK_FILTER = process.env.PARKS
    ? new Set(process.env.PARKS.split(',').map(s => s.trim().toLowerCase()))
    : null;

  console.log(`\n📚  Description Enrichment Script`);
  if (PARK_FILTER) console.log(`   Parks:   ${[...PARK_FILTER].join(', ')}`);
  else             console.log(`   Parks:   ALL (this will take several hours)`);
  console.log(`   Dry run: ${DRY_RUN ? 'YES — no files will be written' : 'no'}\n`);

  // Load existing cache, description store, and park names
  const { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } = await import('../src/data/wildlifeCache.js');
  const { wildlifeLocations } = await import('../src/wildlifeData.js');
  const parkNames = Object.fromEntries(wildlifeLocations.map(l => [l.id, l.name]));
  const descCache = loadDescriptionCache();

  const parksToProcess = Object.keys(WILDLIFE_CACHE)
    .filter(id => !PARK_FILTER || PARK_FILTER.has(id));

  let totalFetched = 0, totalSkipped = 0, totalFailed = 0;
  const sourceStats = { iNaturalist: 0, Wikipedia: 0, 'Park Records': 0 };

  for (const parkId of parksToProcess) {
    const entry = WILDLIFE_CACHE[parkId];
    const animals = entry?.animals ?? [];
    const toEnrich = animals.filter(a => needsDescription(a));

    if (toEnrich.length === 0) {
      console.log(`  [${parkId}] all ${animals.length} animals already have descriptions — skipping`);
      continue;
    }

    console.log(`\n  [${parkId}] ${animals.length} animals, ${toEnrich.length} need descriptions`);
    const parkName = parkNames[parkId] ?? `${parkId.charAt(0).toUpperCase() + parkId.slice(1)} National Park`;

    let parkFetched = 0;

    for (const animal of toEnrich) {
      const cacheKey = animal.scientificName || animal.name;

      // Species-level cache hit (same species across different parks)
      if (descCache[cacheKey] && descCache[cacheKey].source !== 'Park Records') {
        animal.description = descCache[cacheKey].text;
        animal.descriptionSource = descCache[cacheKey].source;
        totalSkipped++;
        continue;
      }

      process.stdout.write(`    ${animal.name}… `);
      try {
        const result = await fetchDescription(animal, parkName);
        animal.description = result.text;
        animal.descriptionSource = result.source;

        // Only cache species-level results (not factual fallback — those are park-specific)
        if (result.source !== 'Park Records') {
          descCache[cacheKey] = { text: result.text, source: result.source };
        }

        sourceStats[result.source] = (sourceStats[result.source] ?? 0) + 1;
        parkFetched++;
        totalFetched++;
        process.stdout.write(`✓ ${result.source}\n`);

        // Save description cache every 25 fetches to preserve progress
        if (totalFetched % 25 === 0) {
          if (!DRY_RUN) saveDescriptionCache(descCache);
        }

        await sleep(450); // ~2 req/s — well within free tier limits
      } catch (err) {
        console.warn(`\n    ⚠  Failed: ${err.message}`);
        totalFailed++;
      }
    }

    console.log(`  [${parkId}] ✓ ${parkFetched} fetched, ${toEnrich.length - parkFetched} from cache`);
  }

  // ── Write updated cache ───────────────────────────────────────────────────
  if (!DRY_RUN) {
    saveDescriptionCache(descCache);

    // Reconstruct the JS file with description fields included
    const totalSpecies = Object.values(WILDLIFE_CACHE)
      .reduce((s, v) => s + (v.animals?.length ?? 0), 0);

    const builtAt = WILDLIFE_CACHE_BUILT_AT;
    const lines = [
      `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
      `// Built: ${builtAt}`,
      `// Descriptions enriched: ${new Date().toISOString()}`,
      `// Parks: ${Object.keys(WILDLIFE_CACHE).length} | Species bundled: ${totalSpecies}`,
      ``,
      `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
      ``,
      `export const WILDLIFE_CACHE = {`,
    ];

    for (const [id, val] of Object.entries(WILDLIFE_CACHE)) {
      lines.push(`  ${JSON.stringify(id)}: {`);
      lines.push(`    "builtAt": ${JSON.stringify(val.builtAt)},`);
      lines.push(`    "animals": ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
      lines.push(`  },`);
    }
    lines.push(`};`);
    lines.push(``);

    writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
    console.log(`\n✅  Written to ${CACHE_PATH}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n📊  Summary`);
  console.log(`   Fetched new:   ${totalFetched}`);
  console.log(`   From cache:    ${totalSkipped}`);
  console.log(`   Failed:        ${totalFailed}`);
  console.log(`   iNaturalist:   ${sourceStats.iNaturalist}`);
  console.log(`   Wikipedia:     ${sourceStats.Wikipedia}`);
  console.log(`   Park Records:  ${sourceStats['Park Records']}\n`);
}

main().catch(err => {
  console.error('\n❌  Enrichment failed:', err.message);
  process.exit(1);
});
