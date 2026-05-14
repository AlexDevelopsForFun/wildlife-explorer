#!/usr/bin/env node
/**
 * scripts/auditTopNDropouts.js
 *
 * Surfaces flagship species that the build pipeline silently drops at
 * each park — species that iNaturalist explicitly returns as a top-N
 * mammal/bird at the park, but that don't appear in the cache after
 * the build pipeline runs.
 *
 * Why this matters: scripts/auditDataQuality.js catches species that
 * have an OVERRIDE referencing them but aren't in the cache. This
 * audit catches the broader class of dropouts — species that exist
 * at the park (per iNat) and would be flagship-level visible, but
 * have no override AND aren't in the cache.
 *
 * Methodology:
 *   1. For each park with a known iNat place_id, query the same
 *      species_counts endpoint the build pipeline uses
 *      (?place_id=N&per_page=10&iconic_taxa[]=Mammalia/Aves)
 *   2. Compare each returned species against the cache (with the
 *      same NAME_ALIASES + case-insensitive matching as the audit)
 *   3. Report missing flagship species sorted by iNat observation
 *      count (highest = most-photographed = most likely flagship)
 *
 * Output: text report listing all silent dropouts per park, sorted by
 * obs count desc, with the iNat preferred_common_name + sciName so a
 * curator can add MISSING_SPECIES_PATCHES entries if appropriate.
 *
 * Usage:
 *   node scripts/auditTopNDropouts.js                  # all parks, top 10 mammals + birds
 *   PARKS=yellowstone,denali node scripts/auditTopNDropouts.js
 *   TOP_N=20 node scripts/auditTopNDropouts.js          # check more candidates
 *
 * Rate-limited: ~200ms between calls to respect iNat's 60req/min.
 * For 63 parks × 2 taxa = ~126 calls, expect ~1-2 minutes.
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Mirror NAME_ALIASES from audit script (most common ones for cache lookups)
const NAME_ALIASES = {
  'roosevelt elk':       ['Wapiti', 'Elk', 'Roosevelt Elk'],
  'wapiti':              ['Wapiti', 'Elk', 'American Elk', 'Roosevelt Elk'],
  'american elk':        ['Elk', 'Wapiti', 'American Elk'],
  'elk':                 ['Elk', 'Wapiti', 'American Elk', 'Roosevelt Elk'],
  'gray wolf':           ['Gray Wolf', 'Wolf'],
  'wolf':                ['Wolf', 'Gray Wolf'],
  'grizzly bear':        ['Grizzly Bear', 'Brown Bear'],
  'brown bear':          ['Brown Bear', 'Grizzly Bear'],
  'black bear':          ['Black Bear', 'American Black Bear'],
  'american black bear': ['American Black Bear', 'Black Bear'],
  'mountain lion':       ['Mountain Lion', 'Cougar', 'Puma'],
  'cougar':              ['Mountain Lion', 'Cougar', 'Puma'],
  'puma':                ['Mountain Lion', 'Cougar', 'Puma'],
  'caribou':             ['Caribou', 'Reindeer'],
  'reindeer':            ['Caribou', 'Reindeer'],
  'dall sheep':          ['Dall Sheep', 'Thinhorn Sheep'],
  'mule deer':           ['Mule Deer', 'Black-tailed Deer', 'Columbian Black-tailed Deer'],
  'black-tailed deer':   ['Black-tailed Deer', 'Mule Deer'],
  'nene':                ['Nene', 'Hawaiian Goose'],
  'hawaiian goose':      ['Hawaiian Goose', 'Nene'],
  'common chuckwalla':   ['Common Chuckwalla', 'Chuckwalla'],
  'chuckwalla':          ['Chuckwalla', 'Common Chuckwalla'],
  'bottlenose dolphin':  ['Bottlenose Dolphin', 'Common Bottlenose Dolphin', "Tamanend's Bottlenose Dolphin"],
  'river otter':         ['River Otter', 'North American River Otter'],
  'samoan flying fox':   ['Samoan Flying Fox', 'Pacific Flying-fox'],
  'west indian manatee': ['West Indian Manatee', 'Manatee', 'Florida Manatee'],
  'florida manatee':     ['Florida Manatee', 'West Indian Manatee', 'Manatee'],
  // Round-2 audit additions — silent dropouts caught + real cache names:
  'bighorn sheep':       ['Bighorn Sheep', 'Rocky Mountain Bighorn Sheep', 'Desert Bighorn Sheep'],
  'desert bighorn sheep':['Desert Bighorn Sheep', 'Bighorn Sheep'],
  'thinhorn sheep':      ['Thinhorn Sheep', 'Dall Sheep'],
  'collared peccary':    ['Collared Peccary', 'Javelina'],
  'javelina':            ['Javelina', 'Collared Peccary'],
};

// Normalize a common name for cross-source comparison: lowercase, trim,
// strip Hawaiian ʻokina + macrons + similar diacritics (iNat uses ʻIʻiwi
// while our cache stores Iiwi). Conservative — only strips characters we
// know cause cross-source mismatches.
function normalizeCommonName(s) {
  if (!s) return '';
  return s.toLowerCase().trim()
    .replace(/['ʻʼ‘’]/g, '')   // apostrophes, ʻokina
    .replace(/̄/g, '')                              // combining macron
    .replace(/\s+/g, ' ');
}

function findInCache(animals, speciesName, sciName = null) {
  if (!Array.isArray(animals)) return null;
  const target = normalizeCommonName(speciesName);
  const sciTarget = sciName ? sciName.toLowerCase().trim() : null;
  // 1. Normalized common-name match (handles ʻIʻiwi ↔ Iiwi)
  let hit = animals.find(a => normalizeCommonName(a.name) === target);
  if (hit) return hit;
  // 2. Scientific name exact match (handles all subspecies + naming variants)
  if (sciTarget) {
    hit = animals.find(a => a.scientificName?.toLowerCase().trim() === sciTarget);
    if (hit) return hit;
    // Genus+species (drop subspecies) match
    const parts = sciTarget.split(/\s+/);
    if (parts.length >= 2) {
      const gs = `${parts[0]} ${parts[1]}`;
      hit = animals.find(a => {
        const asci = a.scientificName?.toLowerCase().trim().split(/\s+/);
        return asci && asci.length >= 2 && `${asci[0]} ${asci[1]}` === gs;
      });
      if (hit) return hit;
    }
  }
  // 3. Alias match (covers known curated synonyms)
  const aliases = NAME_ALIASES[target] ?? [];
  for (const alias of aliases) {
    const aliasNorm = normalizeCommonName(alias);
    hit = animals.find(a => normalizeCommonName(a.name) === aliasNorm);
    if (hit) return hit;
  }
  return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ICONIC_TAXA_TO_LABEL = {
  'Mammalia': 'mammal',
  'Aves': 'bird',
};

async function fetchTopSpecies(placeId, iconicTaxon, perPage = 10) {
  const url = `https://api.inaturalist.org/v1/observations/species_counts` +
    `?place_id=${placeId}&per_page=${perPage}` +
    `&quality_grade=research&order_by=observations_count&order=desc&locale=en&preferred_place_id=1` +
    `&iconic_taxa[]=${iconicTaxon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results ?? [])
      .filter(r => r.taxon?.rank === 'species' || r.taxon?.rank === 'subspecies')
      .map(r => ({
        count: r.count,
        commonName: r.taxon?.preferred_common_name ?? r.taxon?.name,
        sciName: r.taxon?.name ?? null,
      }));
  } catch {
    return [];
  }
}

async function main() {
  const PARK_FILTER = process.env.PARKS
    ? new Set(process.env.PARKS.split(',').map(s => s.trim()))
    : null;
  const TOP_N = process.env.TOP_N ? Number(process.env.TOP_N) : 10;
  const MIN_OBS_FLAG = process.env.MIN_OBS_FLAG ? Number(process.env.MIN_OBS_FLAG) : 50;

  // Load place_ids from build script via grep parsing (avoids importing the
  // build script's main() side-effect)
  const fs = await import('fs');
  const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'buildWildlifeCache.js'), 'utf8');
  const placeIdMatch = buildSrc.match(/const INAT_PLACE_IDS = \{([\s\S]*?)\n\};/);
  const placeIds = {};
  if (placeIdMatch) {
    const re = /"([a-zA-Z0-9_-]+)":\s*(\d+)/g;
    let m;
    while ((m = re.exec(placeIdMatch[1])) !== null) {
      placeIds[m[1]] = Number(m[2]);
    }
  }

  // Load cache (with patches applied — mirror runtime)
  const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');
  const { MISSING_SPECIES_PATCHES } = await import('../src/data/missingSpeciesPatches.js');
  for (const patch of MISSING_SPECIES_PATCHES) {
    const parkData = WILDLIFE_CACHE[patch.parkId];
    if (!parkData?.animals) continue;
    const nameLower = patch.name.toLowerCase().trim();
    const sciLower = patch.scientificName?.toLowerCase().trim();
    const exists = parkData.animals.some(a => {
      const an = a.name?.toLowerCase().trim();
      const asci = a.scientificName?.toLowerCase().trim();
      return an === nameLower || (sciLower && asci === sciLower);
    });
    if (exists) continue;
    parkData.animals.push({ name: patch.name, scientificName: patch.scientificName });
  }

  const parksToCheck = Object.keys(placeIds).filter(p => !PARK_FILTER || PARK_FILTER.has(p));

  console.log(`\n🔍 Top-N silent-dropout audit`);
  console.log(`   Parks:      ${parksToCheck.length}`);
  console.log(`   Top N:      ${TOP_N} per taxon group (mammal + bird)`);
  console.log(`   Flag obs ≥: ${MIN_OBS_FLAG}\n`);

  const dropouts = []; // { parkId, taxon, count, commonName, sciName }
  let apiCalls = 0;

  for (const parkId of parksToCheck) {
    const placeId = placeIds[parkId];
    const animals = WILDLIFE_CACHE[parkId]?.animals ?? [];
    process.stdout.write(`  [${parkId}] checking… `);
    let parkDropouts = 0;

    for (const [iconicTaxon, label] of Object.entries(ICONIC_TAXA_TO_LABEL)) {
      const top = await fetchTopSpecies(placeId, iconicTaxon, TOP_N);
      apiCalls++;
      for (const r of top) {
        if (!r.commonName) continue;
        if (r.count < MIN_OBS_FLAG) continue;
        const found = findInCache(animals, r.commonName, r.sciName);
        if (!found) {
          dropouts.push({ parkId, taxon: label, count: r.count, commonName: r.commonName, sciName: r.sciName });
          parkDropouts++;
        }
      }
      await sleep(200);
    }

    process.stdout.write(parkDropouts > 0 ? `${parkDropouts} dropouts\n` : `clean\n`);
  }

  console.log(`\n📊 Audit complete`);
  console.log(`   API calls:       ${apiCalls}`);
  console.log(`   Total dropouts:  ${dropouts.length}\n`);

  if (dropouts.length === 0) {
    console.log(`✅ No silent dropouts found.\n`);
    return;
  }

  // Sort by count desc — biggest dropouts first
  dropouts.sort((a, b) => b.count - a.count);

  // Group by park for readable output
  const byPark = new Map();
  for (const d of dropouts) {
    if (!byPark.has(d.parkId)) byPark.set(d.parkId, []);
    byPark.get(d.parkId).push(d);
  }

  console.log(`📋 Silent dropouts (sorted by park, then by iNat obs count desc):\n`);
  for (const [parkId, parkDropouts] of byPark) {
    parkDropouts.sort((a, b) => b.count - a.count);
    console.log(`   [${parkId}]`);
    for (const d of parkDropouts) {
      console.log(`     ${String(d.count).padStart(6)}  ${d.taxon.padEnd(7)}  ${(d.commonName ?? '?').padEnd(40)}  ${d.sciName ?? '?'}`);
    }
    console.log('');
  }

  // Top-20 across all parks (highest-impact targets for patches)
  console.log(`🏆 Top 20 silent dropouts (largest obs counts globally):\n`);
  for (const d of dropouts.slice(0, 20)) {
    console.log(`   ${String(d.count).padStart(6)}  [${d.parkId.padEnd(20)}]  ${d.taxon.padEnd(7)}  ${(d.commonName ?? '?').padEnd(40)}  ${d.sciName ?? '?'}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
