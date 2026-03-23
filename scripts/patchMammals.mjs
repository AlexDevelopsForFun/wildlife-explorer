/**
 * patchMammals.mjs — patches wildlifeCache.js for parks with fewer than MIN_MAMMALS mammals.
 * For each thin park, fetches mammals from iNaturalist (research-grade, ordered by obs count),
 * runs histogram for seasonal data, applies charisma-corrected rarity, then writes cache back.
 *
 * Usage: node scripts/patchMammals.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');

const EBIRD_KEY   = process.env.VITE_EBIRD_API_KEY   ?? process.env.EBIRD_API_KEY   ?? '';
const INAT_BASE   = 'https://api.inaturalist.org/v1';
const MIN_MAMMALS = 8;
const DELAY_MS    = 350; // between iNat calls

// ── iNat place_id table (mirrors buildWildlifeCache.js) ──────────────────────
const INAT_PLACE_IDS = {
  yellowstone:52928, everglades:53957, denali:71077, acadia:49610,
  shenandoah:9012, newrivergorge:95209, cuyahogavalley:72639, isleroyale:95245,
  greatsmokymountains:72645, biscayne:95108, drytortugas:70571, congaree:53620,
  mammothcave:72649, voyageurs:69101, indianadunes:95241, badlands:72792,
  windcave:72794, theodoreroosevelt:72793, gatewayarch:137962, grandcanyon:69216,
  zion:50634, brycecanyon:69110, arches:53642, canyonlands:95131,
  capitolreef:69282, mesaverde:69108, petrifiedforest:57573, saguaro:65739,
  whitesands:62621, guadalupemountains:69313, bigbend:55071, grandteton:69099,
  rockymountain:49676, glacier:72841, greatsanddunes:53632, blackcanyon:72635,
  olympic:69094, northcascades:69097, mountrainier:8838, craterlake:52923,
  redwood:6021, lassenvolcanic:4509, yosemite:68542, kingscanyon:3378,
  sequoia:95321, joshuatree:3680, deathvalley:4504, channelislands:3157,
  pinnacles:5737, kenaifjords:95258, glacierbay:69113, katmai:95257,
  wrangellstelias:72658, lakeclark:69114, gatesofthearctic:69111,
  kobukvalley:69115, hawaiivolcanoes:7222, haleakala:56788, americansamoa:73645,
  virginislands:95336, hotsprings:56706, carlsbadcaverns:69109, greatbasin:69699,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = (attempt + 1) * 8000;
        console.log(`    ⚠  429 — retrying in ${wait/1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(2000); }
  }
  return null;
}

function applyCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const l = name.toLowerCase();
  if (/\bbald eagle\b/.test(l))                              return obsCount / 5;
  if (/\b(wolf|wolves|gray wolf|grey wolf)\b/.test(l))       return obsCount / 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(l))           return obsCount / 4;
  if (/\b(bear)\b/.test(l))                                  return obsCount / 5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(l)) return obsCount / 3;
  if (/\b(bison|buffalo)\b/.test(l))                         return obsCount / 2;
  if (/\b(elk|moose|alligator|crocodile)\b/.test(l))         return obsCount / 2;
  if (/\b(deer|squirrel)\b/.test(l))                         return obsCount / 1.5;
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(l))            return obsCount * 5;
  if (/\bbat\b/.test(l))                                     return obsCount * 4;
  if (/\bsnake\b/.test(l))                                   return obsCount * 2;
  return obsCount;
}

function rarityFromObsCount(obsCount, name = '') {
  const c = applyCharismaCorrection(obsCount, name);
  if (c >= 2000) return 'guaranteed';
  if (c >= 500)  return 'very_likely';
  if (c >= 100)  return 'likely';
  if (c >= 20)   return 'unlikely';
  if (c >= 5)    return 'rare';
  return 'exceptional';
}

const SEASON_MONTHS = { spring:[3,4,5], summer:[6,7,8], fall:[9,10,11], winter:[12,1,2] };

// monthOfYear: { "1": N, "2": N, ..., "12": N } (from iNat month_of_year interval)
function seasonsFromMonthOfYear(monthOfYear) {
  if (!monthOfYear) return null;
  const monthly = Object.fromEntries(
    Object.entries(monthOfYear).map(([k, v]) => [parseInt(k, 10), v ?? 0])
  );
  const total = Object.values(monthly).reduce((s, v) => s + v, 0);
  if (total < 3) return null; // insufficient data

  const present = Object.entries(SEASON_MONTHS)
    .filter(([, months]) => {
      const seasonTotal = months.reduce((s, m) => s + (monthly[m] ?? 0), 0);
      return (seasonTotal / total) >= 0.05; // ≥5% of obs in this season window
    })
    .map(([s]) => s);

  if (present.length === 0) return ['spring','summer','fall','winter'];
  if (present.length === 4) return ['year_round'];
  return present;
}

async function getHistogram(sciName, placeId) {
  await sleep(DELAY_MS);
  const url = `${INAT_BASE}/observations/histogram` +
    `?taxon_name=${encodeURIComponent(sciName)}&place_id=${placeId}` +
    `&date_field=observed&interval=month_of_year`;
  const data = await fetchJSON(url);
  const raw = data?.results?.month_of_year ?? null;
  return seasonsFromMonthOfYear(raw);
}

// ── Read cache via dynamic import (file uses JS syntax, not JSON) ─────────────
console.log('Reading cache…');
const cacheUrl = `file:///${CACHE_PATH.replace(/\\/g, '/')}?bust=${Date.now()}`;
const { WILDLIFE_CACHE } = await import(cacheUrl);
// Deep-clone so we can mutate freely
const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

// ── Process each thin park ────────────────────────────────────────────────────
let totalAdded = 0;

for (const [parkId, parkData] of Object.entries(cache)) {
  const existing   = parkData.animals ?? [];
  const mammals    = existing.filter(a => a.animalType === 'mammal');
  if (mammals.length >= MIN_MAMMALS) continue;

  const placeId = INAT_PLACE_IDS[parkId];
  if (!placeId) { console.log(`  [${parkId}] no place_id — skipping`); continue; }

  console.log(`\n[${parkId}] ${mammals.length} mammals — fetching from iNat (place_id=${placeId})…`);

  await sleep(DELAY_MS);
  const url = `${INAT_BASE}/observations/species_counts` +
    `?place_id=${placeId}&iconic_taxa[]=Mammalia&quality_grade=research` +
    `&per_page=50&order_by=observations_count&order=desc&locale=en&preferred_place_id=1`;
  const data = await fetchJSON(url);

  if (!data?.results?.length) { console.log(`  no iNat results returned`); continue; }
  console.log(`  iNat returned ${data.results.length} mammal species`);

  // Build set of existing sci names (case-insensitive)
  const existingSciNames = new Set(existing.map(a => (a.sciName ?? '').toLowerCase()));
  const existingNames    = new Set(existing.map(a => (a.name ?? '').toLowerCase()));

  let added = 0;
  for (const r of data.results) {
    const taxon   = r.taxon;
    const sciName = taxon?.name;
    const name    = taxon?.preferred_common_name
      ?? taxon?.english_common_name
      ?? sciName ?? 'Unknown';

    if (!sciName) continue;
    if (existingSciNames.has(sciName.toLowerCase())) continue;
    if (existingNames.has(name.toLowerCase())) continue;

    // Get seasonal histogram
    const seasons = await getHistogram(sciName, placeId)
      ?? ['spring','summer','fall','winter'];

    const rarity  = rarityFromObsCount(r.count, name);
    const sources = ['inaturalist'];

    const animal = {
      name,
      sciName,
      animalType: 'mammal',
      rarity,
      seasons,
      source:  'inaturalist',
      sources,
      funFact: `Recorded ${r.count.toLocaleString()} times on iNaturalist at this park.`,
    };

    parkData.animals.push(animal);
    existingSciNames.add(sciName.toLowerCase());
    existingNames.add(name.toLowerCase());
    added++;
    console.log(`  + ${name} (${sciName}) — rarity=${rarity} seasons=${JSON.stringify(seasons)}`);
  }

  console.log(`  → added ${added} mammals (total now: ${mammals.length + added})`);
  totalAdded += added;
}

console.log(`\nTotal mammals added across all parks: ${totalAdded}`);

// ── Write cache back ──────────────────────────────────────────────────────────
const builtAt = new Date().toISOString();
const totalSpecies = Object.values(cache).reduce((s, p) => s + (p.animals?.length ?? 0), 0);
const numParks = Object.keys(cache).length;

const output =
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.\n` +
  `// Built: ${builtAt}\n` +
  `// Parks: ${numParks} | Species bundled: ${totalSpecies}\n` +
  `export const WILDLIFE_CACHE_BUILT_AT = "${builtAt}";\n\n` +
  `export const WILDLIFE_CACHE = ${JSON.stringify(cache, null, 2)};\n`;

fs.writeFileSync(CACHE_PATH, output, 'utf8');
console.log(`\n✅ Cache written to ${CACHE_PATH}`);
console.log(`   Parks: ${numParks} | Total species: ${totalSpecies}`);
console.log(`   Total mammals added: ${totalAdded}`);
