/**
 * patchReptiles.mjs — patches wildlifeCache.js for parks with fewer than MIN_REPTILES reptiles.
 * Usage: node scripts/patchReptiles.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');

const INAT_BASE    = 'https://api.inaturalist.org/v1';
const MIN_REPTILES = 3;
const DELAY_MS     = 350;

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, retries = 4) {
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
  if (/\b(alligator|crocodile)\b/.test(l))                    return obsCount / 2;
  if (/\b(komodo|gila monster|monitor)\b/.test(l))            return obsCount / 3;
  if (/\b(rattlesnake|copperhead|cottonmouth|moccasin)\b/.test(l)) return obsCount * 3;
  if (/\bsnake\b/.test(l))                                    return obsCount * 2;
  if (/\b(turtle|tortoise)\b/.test(l))                        return obsCount * 1.5;
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

function seasonsFromMonthOfYear(monthOfYear) {
  if (!monthOfYear) return null;
  const monthly = Object.fromEntries(
    Object.entries(monthOfYear).map(([k, v]) => [parseInt(k, 10), v ?? 0])
  );
  const total = Object.values(monthly).reduce((s, v) => s + v, 0);
  if (total < 3) return null;
  const present = Object.entries(SEASON_MONTHS)
    .filter(([, months]) => {
      const seasonTotal = months.reduce((s, m) => s + (monthly[m] ?? 0), 0);
      return (seasonTotal / total) >= 0.05;
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

console.log('Reading cache…');
const cacheUrl = `file:///${CACHE_PATH.replace(/\\/g, '/')}?bust=${Date.now()}`;
const { WILDLIFE_CACHE } = await import(cacheUrl);
const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

let totalAdded = 0;

for (const [parkId, parkData] of Object.entries(cache)) {
  const existing  = parkData.animals ?? [];
  const reptiles  = existing.filter(a => a.animalType === 'reptile');
  if (reptiles.length >= MIN_REPTILES) continue;

  const placeId = INAT_PLACE_IDS[parkId];
  if (!placeId) { console.log(`  [${parkId}] no place_id — skipping`); continue; }

  console.log(`\n[${parkId}] ${reptiles.length} reptiles — fetching from iNat (place_id=${placeId})…`);

  await sleep(DELAY_MS);
  const url = `${INAT_BASE}/observations/species_counts` +
    `?place_id=${placeId}&iconic_taxa[]=Reptilia&quality_grade=research` +
    `&per_page=50&order_by=observations_count&order=desc&locale=en&preferred_place_id=1`;
  const data = await fetchJSON(url);

  if (!data?.results?.length) { console.log(`  no iNat results`); continue; }
  console.log(`  iNat returned ${data.results.length} reptile species`);

  const existingSciNames = new Set(existing.map(a => (a.sciName ?? '').toLowerCase()));
  const existingNames    = new Set(existing.map(a => (a.name ?? '').toLowerCase()));

  let added = 0;
  for (const r of data.results) {
    const taxon   = r.taxon;
    const sciName = taxon?.name;
    const name    = taxon?.preferred_common_name ?? taxon?.english_common_name ?? sciName ?? 'Unknown';

    if (!sciName) continue;
    if (existingSciNames.has(sciName.toLowerCase())) continue;
    if (existingNames.has(name.toLowerCase())) continue;

    const seasons = await getHistogram(sciName, placeId) ?? ['spring','summer','fall','winter'];
    const rarity  = rarityFromObsCount(r.count, name);

    parkData.animals.push({
      name, sciName, animalType: 'reptile', rarity, seasons,
      source: 'inaturalist', sources: ['inaturalist'],
      funFact: `Recorded ${r.count.toLocaleString()} times on iNaturalist at this park.`,
    });
    existingSciNames.add(sciName.toLowerCase());
    existingNames.add(name.toLowerCase());
    added++;
    console.log(`  + ${name} (${sciName}) — rarity=${rarity} seasons=${JSON.stringify(seasons)}`);
  }
  console.log(`  → added ${added} reptiles (total now: ${reptiles.length + added})`);
  totalAdded += added;
}

console.log(`\nTotal reptiles added across all parks: ${totalAdded}`);

const builtAt     = new Date().toISOString();
const totalSpecies = Object.values(cache).reduce((s, p) => s + (p.animals?.length ?? 0), 0);
const numParks    = Object.keys(cache).length;

const output =
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.\n` +
  `// Built: ${builtAt}\n` +
  `// Parks: ${numParks} | Species bundled: ${totalSpecies}\n` +
  `export const WILDLIFE_CACHE_BUILT_AT = "${builtAt}";\n\n` +
  `export const WILDLIFE_CACHE = ${JSON.stringify(cache, null, 2)};\n`;

fs.writeFileSync(CACHE_PATH, output, 'utf8');
console.log(`\n✅ Cache written.`);
console.log(`   Parks: ${numParks} | Total species: ${totalSpecies}`);
console.log(`   Total reptiles added: ${totalAdded}`);
