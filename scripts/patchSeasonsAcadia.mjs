/**
 * patchSeasonsAcadia.mjs — patches iNat histogram seasons for ALL Acadia birds
 * that currently have the hardcoded all-4-season fallback.
 *
 * Usage: node scripts/patchSeasonsAcadia.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');

const INAT_BASE       = 'https://api.inaturalist.org/v1';
const ACADIA_PLACE_ID = 49610;
const DELAY_MS        = 300;
const MIN_OBS         = 10;

const SEASON_MONTHS = { spring:[3,4,5], summer:[6,7,8], fall:[9,10,11], winter:[12,1,2] };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = (attempt + 1) * 8000;
        process.stdout.write(`\n    ⚠  429 — retrying in ${wait/1000}s `);
        await sleep(wait);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(2000); }
  }
  return null;
}

function seasonsFromMonthOfYear(monthOfYear) {
  if (!monthOfYear) return null;
  const monthly = Object.fromEntries(
    Object.entries(monthOfYear).map(([k, v]) => [parseInt(k, 10), v ?? 0])
  );
  const total = Object.values(monthly).reduce((s, v) => s + v, 0);
  if (total < MIN_OBS) return null; // insufficient data

  const present = Object.entries(SEASON_MONTHS)
    .filter(([, months]) => {
      const seasonTotal = months.reduce((s, m) => s + (monthly[m] ?? 0), 0);
      return (seasonTotal / total) >= 0.05;
    })
    .map(([s]) => s);

  if (present.length === 0) return null; // can't determine — skip
  if (present.length === 4) return ['year_round'];
  return present;
}

async function getHistogram(sciName) {
  await sleep(DELAY_MS);
  const url = `${INAT_BASE}/observations/histogram` +
    `?taxon_name=${encodeURIComponent(sciName)}&place_id=${ACADIA_PLACE_ID}` +
    `&date_field=observed&interval=month_of_year`;
  const data = await fetchJSON(url);
  return seasonsFromMonthOfYear(data?.results?.month_of_year ?? null);
}

// ── Load cache ────────────────────────────────────────────────────────────────
console.log('Reading cache…');
const cacheUrl = `file:///${CACHE_PATH.replace(/\\/g, '/')}?bust=${Date.now()}`;
const { WILDLIFE_CACHE } = await import(cacheUrl);
const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

const acadiaAnimals = cache['acadia']?.animals ?? [];

// Find all Acadia birds with hardcoded all-4 seasons
const targets = acadiaAnimals.filter(a => {
  if (a.animalType !== 'bird') return false;
  if (!a.scientificName || !a.scientificName.includes(' ')) return false;
  const s = a.seasons ?? [];
  return s.length === 4 && !s.includes('year_round');
});

console.log(`Found ${targets.length} Acadia birds with hardcoded all-4 seasons.`);
console.log(`Unique scientificNames: ${new Set(targets.map(b => b.scientificName.toLowerCase())).size}`);
console.log(`Estimated time: ~${Math.ceil(targets.length * DELAY_MS / 1000 / 60)} min\n`);

// Track results
let updated = 0, keptYearRound = 0, skippedThinData = 0;
const seen = new Map(); // sciName → derived seasons (cache across duplicates)

const TRACK = new Set([
  'turdus migratorius',     // American Robin
  'pandion haliaetus',      // Osprey
  'gavia immer',            // Common Loon
  'plectrophenax nivalis',  // Snow Bunting
  'progne subis',           // Purple Martin
  'poecile atricapillus',   // Black-capped Chickadee
]);

let i = 0;
for (const animal of targets) {
  const sciLower = animal.scientificName.toLowerCase();
  i++;

  let derived;
  if (seen.has(sciLower)) {
    derived = seen.get(sciLower);
  } else {
    process.stdout.write(`  [${i}/${targets.length}] ${animal.name}… `);
    derived = await getHistogram(animal.scientificName);
    seen.set(sciLower, derived);
    if (derived)         process.stdout.write(`→ ${JSON.stringify(derived)}\n`);
    else                 process.stdout.write(`→ skipped (thin data)\n`);
  }

  if (derived === null) {
    skippedThinData++;
    continue;
  }

  const before = JSON.stringify(animal.seasons);
  animal.seasons = derived;

  if (TRACK.has(sciLower)) {
    console.log(`  ★ ${animal.name}: ${before} → ${JSON.stringify(derived)}`);
  }

  if (derived.includes('year_round')) keptYearRound++;
  else updated++;
}

console.log(`\n=== RESULTS ===`);
console.log(`Updated with specific seasons: ${updated}`);
console.log(`Set to year_round (present all 4): ${keptYearRound}`);
console.log(`Skipped (< ${MIN_OBS} observations): ${skippedThinData}`);
console.log(`Total processed: ${updated + keptYearRound + skippedThinData}`);

// Season filter test
const allAcadiaBirds = cache['acadia'].animals.filter(a => a.animalType === 'bird');
const summerBirds  = allAcadiaBirds.filter(b => {
  const s = b.seasons ?? [];
  return s.includes('summer') || s.includes('year_round');
});
const winterBirds  = allAcadiaBirds.filter(b => {
  const s = b.seasons ?? [];
  return s.includes('winter') || s.includes('year_round');
});
console.log(`\n=== SEASON FILTER TEST ===`);
console.log(`Birds visible in Summer: ${summerBirds.length}`);
console.log(`Birds visible in Winter: ${winterBirds.length}`);
console.log(`Difference: ${summerBirds.length - winterBirds.length} fewer birds in winter`);

// ── Write cache back ──────────────────────────────────────────────────────────
const builtAt      = new Date().toISOString();
const totalSpecies = Object.values(cache).reduce((s, p) => s + (p.animals?.length ?? 0), 0);
const numParks     = Object.keys(cache).length;

const output =
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.\n` +
  `// Built: ${builtAt}\n` +
  `// Parks: ${numParks} | Species bundled: ${totalSpecies}\n` +
  `export const WILDLIFE_CACHE_BUILT_AT = "${builtAt}";\n\n` +
  `export const WILDLIFE_CACHE = ${JSON.stringify(cache, null, 2)};\n`;

fs.writeFileSync(CACHE_PATH, output, 'utf8');
console.log(`\n✅  Cache written.`);
console.log(`    Parks: ${numParks} | Total species: ${totalSpecies}`);
