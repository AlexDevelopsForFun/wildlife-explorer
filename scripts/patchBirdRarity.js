#!/usr/bin/env node
/**
 * scripts/patchBirdRarity.js
 *
 * Patches bird rarity + migration in the existing wildlifeCache.js
 * using real eBird county-level historic frequency data.
 *
 * This script does NOT call iNaturalist, NPS, or GBIF.
 * It only re-fetches eBird county data (~65 min) and recalculates
 * bird rarity, raritySource, seasons, and migrationStatus in-place.
 *
 * Non-bird animals are left completely untouched.
 *
 * Usage:
 *   node scripts/patchBirdRarity.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Resolve project root ────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Read API keys from .env ─────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = val;
  }
  return out;
}

const env = loadDotEnv();
const EBIRD_KEY = env.VITE_EBIRD_API_KEY ?? process.env.VITE_EBIRD_API_KEY ?? '';
if (!EBIRD_KEY) { console.error('ERROR: VITE_EBIRD_API_KEY not set'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, opts = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = 2000 * (attempt + 1);
        console.warn(`    ⚠  HTTP ${res.status} — retrying in ${delay / 1000}s (${url.slice(0, 80)}…)`);
        await sleep(delay);
        continue;
      }
      return null;
    } catch {
      if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
      return null;
    }
  }
  return null;
}

// ── Rarity tiers ────────────────────────────────────────────────────────────
function rarityFromFreq(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// ── Charisma correction ─────────────────────────────────────────────────────
function ebirdCharismaCorrectionFactor(name) {
  if (!name) return 1;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower))   return 1 / 5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return 1 / 3;
  return 1;
}

// ── County-to-park mapping (replicated from buildWildlifeCache.js) ──────────
const PARK_COUNTY_MAP = {
  yellowstone:          'US-WY-029',
  grandteton:           'US-WY-039',
  everglades:           'US-FL-025',
  biscayne:             'US-FL-025',
  drytortugas:          'US-FL-087',
  congaree:             'US-SC-079',
  greatsmokymountains:  'US-TN-155',
  shenandoah:           'US-VA-113',
  acadia:               'US-ME-009',
  newrivergorge:        'US-WV-019',
  cuyahogavalley:       'US-OH-153',
  mammothcave:          'US-KY-061',
  isleroyale:           'US-MI-083',
  voyageurs:            'US-MN-071',
  indianadunes:         'US-IN-127',
  hotsprings:           'US-AR-051',
  gatewayarch:          'US-MO-510',
  badlands:             'US-SD-071',
  windcave:             'US-SD-033',
  theodoreroosevelt:    'US-ND-007',
  rockymountain:        'US-CO-069',
  glacier:              'US-MT-029',
  greatsanddunes:       'US-CO-003',
  blackcanyon:          'US-CO-085',
  grandcanyon:          'US-AZ-005',
  zion:                 'US-UT-053',
  brycecanyon:          'US-UT-017',
  arches:               'US-UT-019',
  canyonlands:          'US-UT-019',
  capitolreef:          'US-UT-055',
  mesaverde:            'US-CO-083',
  petrifiedforest:      'US-AZ-017',
  saguaro:              'US-AZ-019',
  whitesands:           'US-NM-035',
  guadalupemountains:   'US-TX-109',
  bigbend:              'US-TX-043',
  greatbasin:           'US-NV-033',
  carlsbadcaverns:      'US-NM-015',
  joshuatree:           'US-CA-065',
  deathvalley:          'US-CA-027',
  olympic:              'US-WA-009',
  northcascades:        'US-WA-073',
  mountrainier:         'US-WA-053',
  craterlake:           'US-OR-035',
  redwood:              'US-CA-015',
  lassenvolcanic:       'US-CA-089',
  yosemite:             'US-CA-043',
  kingscanyon:          'US-CA-019',
  sequoia:              'US-CA-107',
  channelislands:       'US-CA-083',
  pinnacles:            'US-CA-069',
  denali:               'US-AK-068',
  katmai:               'US-AK-164',
  glacierbay:           'US-AK-105',
  kenaifjords:          'US-AK-122',
  wrangellstelias:      'US-AK-261',
  lakeclark:            'US-AK-122',
  gatesofthearctic:     'US-AK-090',
  kobukvalley:          'US-AK-188',
  hawaiivolcanoes:      'US-HI-001',
  haleakala:            'US-HI-009',
  americansamoa:        'AS',
  virginislands:        'US-VI-020',
};

const PARK_COUNTY_FALLBACK = {
  voyageurs:         'US-MN-137',
  badlands:          'US-SD-103',
  theodoreroosevelt: 'US-ND-015',
  kobukvalley:       'US-AK-090',
  americansamoa:     'AS',
  virginislands:     'US-VI',
  gatewayarch:       'US-MO-189',
  // New fallbacks for parks with sparse/null primary county data
  everglades:        'US-FL-087',  // Monroe County
  biscayne:          'US-FL-087',  // Monroe County
  shenandoah:        'US-VA-015',  // Augusta County
  denali:            'US-AK-090',  // Fairbanks North Star
  carlsbadcaverns:   'US-NM-015',  // Eddy County
  newrivergorge:     'US-WV-025',  // Greenbrier County
  mammothcave:       'US-KY-227',  // Warren County
  windcave:          'US-SD-103',  // Pennington County
  capitolreef:       'US-UT-041',  // Sevier County
  guadalupemountains:'US-TX-141',  // El Paso County
  greatsanddunes:    'US-CO-021',  // Costilla County
  glacierbay:        'US-AK-110',  // Juneau Borough
  katmai:            'US-AK-122',  // Kenai Peninsula
  wrangellstelias:   'US-AK-170',  // Matanuska-Susitna Borough
};

// ── Per-park county-to-park correction factors ─────────────────────────────
// User-specified values for top 15 parks; remaining estimated by acreage.
const PARK_COUNTY_FIT = {
  // User-specified fit factors (top 15)
  yellowstone: 0.90, grandteton: 0.85, glacier: 0.80, denali: 0.75,
  greatsmokymountains: 0.70, yosemite: 0.65, olympic: 0.65,
  grandcanyon: 0.60, everglades: 0.55, zion: 0.50, rockymountain: 0.50,
  shenandoah: 0.45, acadia: 0.30, cuyahogavalley: 0.20, hotsprings: 0.15,
  // >500K acres → 0.75
  deathvalley: 0.75, bigbend: 0.75, gatesofthearctic: 0.75,
  wrangellstelias: 0.75, katmai: 0.75, lakeclark: 0.75,
  glacierbay: 0.75, kobukvalley: 0.75,
  // >100K acres → 0.60
  northcascades: 0.60, canyonlands: 0.60, capitolreef: 0.60,
  sequoia: 0.60, kingscanyon: 0.60, mountrainier: 0.60,
  craterlake: 0.60, redwood: 0.60, lassenvolcanic: 0.60,
  joshuatree: 0.60, voyageurs: 0.60, isleroyale: 0.60,
  theodoreroosevelt: 0.60, badlands: 0.60, mesaverde: 0.60,
  whitesands: 0.60, guadalupemountains: 0.60, greatbasin: 0.60,
  carlsbadcaverns: 0.60, petrifiedforest: 0.60, saguaro: 0.60,
  windcave: 0.60, kenaifjords: 0.60, hawaiivolcanoes: 0.60,
  channelislands: 0.60, mammothcave: 0.60, greatsanddunes: 0.60,
  // >10K acres → 0.40
  brycecanyon: 0.40, arches: 0.40, pinnacles: 0.40, blackcanyon: 0.40,
  congaree: 0.40, newrivergorge: 0.40, indianadunes: 0.40,
  haleakala: 0.40, biscayne: 0.40, drytortugas: 0.40,
  // <10K acres → 0.25
  gatewayarch: 0.25, americansamoa: 0.25, virginislands: 0.25,
};
const DEFAULT_COUNTY_FIT = 0.60;

// ── Rarity overrides (replicated from buildWildlifeCache.js) ────────────────
const RARITY_OVERRIDES = {
  yellowstone:           { 'American Bison': 'guaranteed', 'American Elk': 'guaranteed', 'Elk': 'very_likely', 'Grizzly Bear': 'unlikely', 'Gray Wolf': 'rare', 'Moose': 'unlikely' },
  grandteton:            { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  everglades:            { 'American Alligator': 'guaranteed', 'West Indian Manatee': 'unlikely', 'Florida Manatee': 'unlikely', 'Great Blue Heron': 'guaranteed', 'Anhinga': 'guaranteed', 'Snowy Egret': 'very_likely', 'Roseate Spoonbill': 'likely', 'Eastern Lubber Grasshopper': 'very_likely', 'Florida Panther': 'exceptional' },
  congaree:              { 'American Alligator': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  biscayne:              { 'Brown Pelican': 'very_likely', 'Double-crested Cormorant': 'very_likely', 'Bottlenose Dolphin': 'unlikely' },
  drytortugas:           { 'Sooty Tern': 'guaranteed', 'Brown Noddy': 'guaranteed', 'Magnificent Frigatebird': 'very_likely', 'American Alligator': 'exceptional' },
  greatsmokymountains:   { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely', 'Wild Turkey': 'very_likely' },
  shenandoah:            { 'White-tailed Deer': 'guaranteed', 'Wild Turkey': 'very_likely', 'Black Bear': 'likely' },
  acadia:                { 'American Herring Gull': 'guaranteed', 'Bald Eagle': 'rare', 'White-tailed Deer': 'very_likely', 'Harbor Seal': 'likely', 'Common Loon': 'likely', 'Atlantic Puffin': 'unlikely' },
  olympic:               { 'Mule Deer': 'guaranteed', 'Bald Eagle': 'likely', 'Roosevelt Elk': 'likely', 'Harbor Seal': 'likely', 'Olympic Marmot': 'very_likely', 'Canada Jay': 'very_likely' },
  isleroyale:            { 'Moose': 'likely', 'Common Loon': 'guaranteed' },
  newrivergorge:         { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely' },
  cuyahogavalley:        { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'very_likely' },
  mammothcave:           { 'Little Brown Bat': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  hotsprings:            { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'guaranteed' },
  indianadunes:          { 'White-tailed Deer': 'guaranteed', 'Sandhill Crane': 'very_likely' },
  gatewayarch:           { 'Eastern Gray Squirrel': 'guaranteed', 'American Robin': 'very_likely', 'White-tailed Deer': 'very_likely', 'Red Fox': 'unlikely' },
  voyageurs:             { 'Common Loon': 'guaranteed', 'Bald Eagle': 'very_likely', 'Moose': 'likely' },
  glacier:               { 'Mountain Goat': 'very_likely', 'Grizzly Bear': 'unlikely', 'Bighorn Sheep': 'very_likely', 'Bald Eagle': 'likely' },
  badlands:              { 'American Bison': 'guaranteed', 'Pronghorn': 'guaranteed', 'Black-tailed Prairie Dog': 'guaranteed' },
  windcave:              { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely' },
  theodoreroosevelt:     { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely', 'Wild Horse': 'very_likely' },
  rockymountain:         { 'American Elk': 'guaranteed', 'Elk': 'guaranteed', 'Mule Deer': 'very_likely', 'Rocky Mountain Bighorn Sheep': 'likely' },
  yosemite:              { 'California Ground Squirrel': 'guaranteed', "Steller's Jay": 'very_likely', 'Mule Deer': 'very_likely', 'Black Bear': 'unlikely' },
  saguaro:               { "Gambel's Quail": 'guaranteed', 'Cactus Wren': 'very_likely', 'Gila Woodpecker': 'very_likely' },
  grandcanyon:           { 'Common Raven': 'guaranteed', 'Rock Squirrel': 'very_likely', 'Mule Deer': 'very_likely', 'Elk': 'likely', 'American Bison': 'exceptional' },
  zion:                  { 'Rock Squirrel': 'guaranteed', 'Mule Deer': 'very_likely', 'Desert Cottontail': 'likely', 'Coyote': 'likely', 'Desert Bighorn Sheep': 'likely' },
  brycecanyon:           { 'Utah Prairie Dog': 'guaranteed', "Common Golden-mantled Ground Squirrel": 'guaranteed', 'Mule Deer': 'very_likely', 'Common Raven': 'very_likely', 'Pronghorn': 'very_likely' },
  arches:                { 'Common Raven': 'guaranteed', 'Mule Deer': 'likely', 'Coyote': 'likely', 'Desert Cottontail': 'likely' },
  canyonlands:           { 'Common Raven': 'guaranteed', 'Common Side-blotched Lizard': 'very_likely', 'Mule Deer': 'likely' },
  capitolreef:           { 'Mule Deer': 'guaranteed', 'Common Raven': 'very_likely', 'Coyote': 'likely' },
  petrifiedforest:       { 'Common Raven': 'guaranteed', 'Pronghorn': 'very_likely' },
  mesaverde:             { 'Mule Deer': 'guaranteed', 'Wild Turkey': 'very_likely', "Gunnison's Prairie Dog": 'rare' },
  blackcanyon:           { 'Mule Deer': 'likely', 'Peregrine Falcon': 'unlikely' },
  greatbasin:            { 'Mule Deer': 'very_likely', "Steller's Jay": 'very_likely', 'Pronghorn': 'likely' },
  guadalupemountains:    { 'Mule Deer': 'very_likely', 'Elk': 'likely' },
  joshuatree:            { 'Common Side-blotched Lizard': 'guaranteed', 'Common Chuckwalla': 'very_likely' },
  deathvalley:           { 'Common Raven': 'guaranteed', 'Coyote': 'very_likely', 'Common Side-blotched Lizard': 'very_likely' },
  whitesands:            { 'Western Earless Lizard': 'guaranteed' },
  pinnacles:             { 'California Ground Squirrel': 'guaranteed', 'California Condor': 'very_likely', 'Acorn Woodpecker': 'very_likely', 'California Scrub-Jay': 'very_likely' },
  craterlake:            { "Common Golden-mantled Ground Squirrel": 'guaranteed', "Clark's Nutcracker": 'very_likely' },
  mountrainier:          { 'Hoary Marmot': 'guaranteed', 'Canada Jay': 'very_likely', 'Sooty Grouse': 'very_likely' },
  redwood:               { 'Roosevelt Elk': 'guaranteed', "Steller's Jay": 'very_likely' },
  kingscanyon:           { "Steller's Jay": 'guaranteed' },
  sequoia:               { "Steller's Jay": 'guaranteed' },
  lassenvolcanic:        { "Steller's Jay": 'guaranteed', "Common Golden-mantled Ground Squirrel": 'very_likely' },
  bigbend:               { 'Greater Roadrunner': 'guaranteed', 'Mexican Jay': 'very_likely', 'Cactus Wren': 'very_likely' },
  carlsbadcaverns:       { 'Mexican Free-tailed Bat': 'guaranteed' },
  denali:                { 'Grizzly Bear': 'unlikely', 'Caribou': 'very_likely', 'Moose': 'very_likely', 'Dall Sheep': 'very_likely', 'Arctic Ground Squirrel': 'guaranteed' },
  katmai:                { 'Brown Bear': 'guaranteed' },
  glacierbay:            { 'Humpback Whale': 'very_likely', 'Harbor Seal': 'guaranteed', 'Sea Otter': 'very_likely' },
  kenaifjords:           { 'Sea Otter': 'guaranteed', 'Harbor Seal': 'guaranteed', 'Tufted Puffin': 'very_likely', 'Horned Puffin': 'very_likely', 'Orca': 'unlikely' },
  wrangellstelias:       { 'Dall Sheep': 'very_likely', 'Moose': 'very_likely', 'Brown Bear': 'likely' },
  lakeclark:             { 'Brown Bear': 'guaranteed', 'Sockeye Salmon': 'guaranteed' },
  hawaiivolcanoes:       { 'Nene': 'guaranteed', 'Hawaiian Hawk': 'unlikely', 'Hawaiian Goose': 'guaranteed' },
  haleakala:             { 'Nene': 'guaranteed', 'Hawaiian Goose': 'guaranteed' },
  virginislands:         { 'Green Iguana': 'guaranteed', 'Green Sea Turtle': 'very_likely', 'Hawksbill Sea Turtle': 'unlikely' },
  americansamoa:         { 'Samoan Flying Fox': 'very_likely', 'Green Sea Turtle': 'likely' },
};

// ── County frequency fetch ──────────────────────────────────────────────────
const SAMPLE_DAYS = [1, 8, 15, 22];
const SEASON_MONTH_MAP = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall:   [9, 10, 11],
  winter: [12, 1, 2],
};
const MIN_CHECKLISTS_PER_DATE = 5;
const MIN_VALID_DATES = 20;
const _countyDataCache = new Map();

// ── File-based county cache for resume support ─────────────────────────────
const COUNTY_CACHE_DIR = path.join(ROOT, 'scripts', '_county_cache');
import { mkdirSync } from 'fs';
try { mkdirSync(COUNTY_CACHE_DIR, { recursive: true }); } catch {}

function countyDiskCachePath(countyCode) {
  return path.join(COUNTY_CACHE_DIR, `${countyCode.replace(/[^a-zA-Z0-9-]/g, '_')}.json`);
}

function loadCountyFromDisk(countyCode) {
  const p = countyDiskCachePath(countyCode);
  if (existsSync(p)) {
    try {
      const raw = readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      // null means "we tried and it was too sparse" — that's a valid cached result
      return { found: true, data };
    } catch { return { found: false }; }
  }
  return { found: false };
}

function saveCountyToDisk(countyCode, freqMap) {
  const p = countyDiskCachePath(countyCode);
  writeFileSync(p, JSON.stringify(freqMap), 'utf8');
}

async function fetchCountyHistoricData(countyCode) {
  // Check disk cache first (survives process restarts)
  const disk = loadCountyFromDisk(countyCode);
  if (disk.found) {
    if (disk.data) {
      console.log(`    [county ${countyCode}] loaded from disk cache — ${Object.keys(disk.data).length} species`);
    } else {
      console.log(`    [county ${countyCode}] disk cache says too sparse — skipping`);
    }
    return disk.data;
  }

  if (_countyDataCache.has(countyCode)) return _countyDataCache.get(countyCode);
  const promise = _fetchCountyHistoricDataImpl(countyCode);
  _countyDataCache.set(countyCode, promise);
  const result = await promise;
  // Save to disk for resume
  saveCountyToDisk(countyCode, result);
  return result;
}

async function _fetchCountyHistoricDataImpl(countyCode) {
  const now = new Date();
  const year = now.getFullYear() - 1;
  const hdrs = { headers: { 'X-eBirdApiToken': EBIRD_KEY } };
  const speciesDateMap = new Map();
  let validDates = 0;
  let totalDates = 0;
  const monthValidDates = {};
  const speciesMonthMap = new Map();

  for (let month = 1; month <= 12; month++) {
    for (const day of SAMPLE_DAYS) {
      totalDates++;
      const statsUrl = `https://api.ebird.org/v2/product/stats/${countyCode}/${year}/${month}/${day}`;
      const stats = await safeFetch(statsUrl, hdrs);
      await sleep(200);

      const numChecklists = stats?.numChecklists ?? 0;
      if (numChecklists < MIN_CHECKLISTS_PER_DATE) continue;
      validDates++;
      monthValidDates[month] = (monthValidDates[month] ?? 0) + 1;

      const obsUrl = `https://api.ebird.org/v2/data/obs/${countyCode}/historic/${year}/${month}/${day}`;
      const obs = await safeFetch(obsUrl, hdrs);
      await sleep(600);

      if (!Array.isArray(obs)) continue;
      for (const o of obs) {
        if (!o.comName) continue;
        if (!speciesDateMap.has(o.comName)) speciesDateMap.set(o.comName, 0);
        speciesDateMap.set(o.comName, speciesDateMap.get(o.comName) + 1);
        if (!speciesMonthMap.has(o.comName)) speciesMonthMap.set(o.comName, {});
        const mMap = speciesMonthMap.get(o.comName);
        mMap[month] = (mMap[month] ?? 0) + 1;
      }
    }
  }

  console.log(`    [county ${countyCode}] ${validDates}/${totalDates} valid dates, ${speciesDateMap.size} species`);

  if (validDates < MIN_VALID_DATES) {
    console.log(`    [county ${countyCode}] ⚠ too few valid dates (${validDates} < ${MIN_VALID_DATES}) — skipping`);
    return null;
  }

  const freqMap = {};
  for (const [comName, datesPresent] of speciesDateMap) {
    const rawFreq = datesPresent / validDates;
    const seasonFreqs = {};
    const monthData = speciesMonthMap.get(comName) ?? {};
    for (const [season, months] of Object.entries(SEASON_MONTH_MAP)) {
      let seasonPresent = 0;
      let seasonValid = 0;
      for (const m of months) {
        seasonValid += monthValidDates[m] ?? 0;
        seasonPresent += monthData[m] ?? 0;
      }
      seasonFreqs[season] = seasonValid > 0 ? seasonPresent / seasonValid : 0;
    }

    const peakFreq = Math.max(...Object.values(seasonFreqs));

    const presentSeasons = Object.entries(seasonFreqs)
      .filter(([, f]) => f >= 0.10)
      .map(([s]) => s);
    const seasons = presentSeasons.length === 4 ? ['year_round']
      : presentSeasons.length > 0 ? presentSeasons
      : ['spring', 'summer', 'fall'];

    let migrationStatus;
    const hasSpring = seasonFreqs.spring >= 0.10;
    const hasSummer = seasonFreqs.summer >= 0.10;
    const hasFall   = seasonFreqs.fall   >= 0.10;
    const hasWinter = seasonFreqs.winter >= 0.10;

    if (hasSpring && hasSummer && hasFall && hasWinter) {
      migrationStatus = 'year_round';
    } else if ((hasSpring || hasSummer) && !hasWinter) {
      migrationStatus = 'summer_resident';
    } else if (hasWinter && !hasSummer) {
      migrationStatus = 'winter_visitor';
    } else if ((hasSpring || hasFall) && !hasSummer && !hasWinter) {
      migrationStatus = 'migratory';
    } else {
      migrationStatus = 'year_round';
    }

    freqMap[comName] = { rawFreq, peakFreq, seasonFreqs, seasons, migrationStatus };
  }

  return freqMap;
}

// ── No parks skipped — re-patch all with per-park PARK_COUNTY_FIT ──────────
const ALREADY_FIXED = new Set();

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔧 Bird Rarity Patch Script');
  console.log('   Patches bird rarity + migration using eBird county frequency data');
  console.log('   Non-bird animals are left untouched\n');

  // Step A: Load existing cache
  const existing = await import('../src/data/wildlifeCache.js');
  const cache = { ...existing.WILDLIFE_CACHE };
  const allParkIds = Object.keys(cache);
  const parksToPatch = allParkIds.filter(id => !ALREADY_FIXED.has(id));

  console.log(`   Total parks in cache: ${allParkIds.length}`);
  console.log(`   Parks to patch: ${parksToPatch.length} (skipping ${ALREADY_FIXED.size} already fixed)\n`);

  // Step B: Fetch county data for all parks to patch
  const countyFreqByPark = {};
  const countiesToFetch = new Map();
  for (const parkId of parksToPatch) {
    const county = PARK_COUNTY_MAP[parkId];
    if (!county) continue;
    if (!countiesToFetch.has(county)) countiesToFetch.set(county, []);
    countiesToFetch.get(county).push(parkId);
  }

  console.log(`📊 Fetching county-level eBird frequency data…`);
  console.log(`   Unique counties: ${countiesToFetch.size}`);
  console.log(`   Estimated API calls: ~${countiesToFetch.size * 96}\n`);

  for (const [countyCode, parkIds] of countiesToFetch) {
    console.log(`  Fetching county ${countyCode} (for ${parkIds.join(', ')})…`);
    let freqMap = await fetchCountyHistoricData(countyCode);

    // Fallback to alternate county if primary was too sparse
    if (!freqMap) {
      const firstPark = parkIds[0];
      const fallback = PARK_COUNTY_FALLBACK[firstPark];
      if (fallback && fallback !== countyCode) {
        console.log(`    → Falling back to ${fallback}`);
        freqMap = await fetchCountyHistoricData(fallback);
      }
    }

    if (freqMap) {
      for (const pid of parkIds) countyFreqByPark[pid] = freqMap;
      console.log(`    ✓ ${Object.keys(freqMap).length} species with frequency data`);
    } else {
      console.log(`    ✗ No usable county data — birds unchanged`);
    }
  }

  const parksWithData = Object.keys(countyFreqByPark).length;
  console.log(`\n   County data ready for ${parksWithData}/${parksToPatch.length} parks\n`);

  // Step C: Patch bird rarity in each park
  let totalBirdsPatched = 0;
  let totalBirdsKeptBinary = 0;
  let totalBirdsUnchanged = 0;

  for (const parkId of parksToPatch) {
    const parkData = cache[parkId];
    if (!parkData?.animals) continue;

    const freqMap = countyFreqByPark[parkId] ?? null;
    let parkPatched = 0;
    let parkBinary = 0;

    parkData.animals = parkData.animals.map(animal => {
      // Only patch birds
      if (animal.animalType !== 'bird') return animal;

      // Check rarity override — if this bird has an override, apply it
      const overrides = RARITY_OVERRIDES[parkId];
      if (overrides?.[animal.name]) {
        return { ...animal, rarity: overrides[animal.name], raritySource: 'override' };
      }

      if (!freqMap) {
        // No county data for this park — leave bird unchanged
        totalBirdsUnchanged++;
        return animal;
      }

      const countyData = freqMap[animal.name] ?? null;
      if (!countyData) {
        // Bird not found in county data — keep existing rarity
        parkBinary++;
        return animal;
      }

      // Apply per-park county-to-park correction + charisma correction
      const correctedFreq = countyData.peakFreq * (PARK_COUNTY_FIT[parkId] ?? DEFAULT_COUNTY_FIT) * ebirdCharismaCorrectionFactor(animal.name);
      const newRarity = rarityFromFreq(correctedFreq);

      parkPatched++;
      return {
        ...animal,
        rarity: newRarity,
        raritySource: 'ebird_county_freq',
        seasons: countyData.seasons,
        migrationStatus: countyData.migrationStatus,
      };
    });

    totalBirdsPatched += parkPatched;
    totalBirdsKeptBinary += parkBinary;

    if (parkPatched > 0) {
      process.stdout.write(`  ✓ ${parkId}: ${parkPatched} birds patched`);
      if (parkBinary > 0) process.stdout.write(`, ${parkBinary} kept existing`);
      process.stdout.write('\n');
    }
  }

  console.log(`\n📊 Patch Summary:`);
  console.log(`   Birds patched with county freq: ${totalBirdsPatched}`);
  console.log(`   Birds kept existing (not in county data): ${totalBirdsKeptBinary}`);
  console.log(`   Birds unchanged (no county data for park): ${totalBirdsUnchanged}`);

  // Step D: Write patched cache
  const builtAt = new Date().toISOString();
  const totalSpecies = Object.values(cache).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${builtAt}`,
    `// Parks: ${allParkIds.length} | Species bundled: ${totalSpecies}`,
    `// To regenerate: node scripts/buildWildlifeCache.js`,
    `// Bird rarity patched: ${new Date().toISOString().slice(0, 10)} via patchBirdRarity.js`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];

  for (const [id, val] of Object.entries(cache)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  const outPath = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(`\n✅  Written to ${outPath}`);
  console.log(`   Parks: ${allParkIds.length} | Species: ${totalSpecies}`);

  // Step E: Print rarity distribution
  const rarityDist = {};
  const migrationDist = {};
  let globalGuaranteed = 0;
  for (const [parkId, parkData] of Object.entries(cache)) {
    if (!parkData?.animals) continue;
    for (const a of parkData.animals) {
      rarityDist[a.rarity] = (rarityDist[a.rarity] ?? 0) + 1;
      if (a.rarity === 'guaranteed') globalGuaranteed++;
      if (a.migrationStatus) migrationDist[a.migrationStatus] = (migrationDist[a.migrationStatus] ?? 0) + 1;
    }
  }

  console.log(`\n📊 Global Rarity Distribution:`);
  for (const tier of ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional']) {
    console.log(`   ${tier.padEnd(14)}: ${rarityDist[tier] ?? 0}`);
  }

  console.log(`\n📊 Global Migration Status Distribution:`);
  for (const [status, count] of Object.entries(migrationDist).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${status.padEnd(18)}: ${count}`);
  }

  // Step F: Spot checks
  console.log(`\n🔍 Spot Checks:`);
  const spotChecks = [
    // Per-park fit factor comparisons
    { park: 'yellowstone',           bird: 'Killdeer', label: 'Killdeer @ Yellowstone (0.85)' },
    { park: 'hotsprings',            bird: 'Killdeer', label: 'Killdeer @ Hot Springs (0.4)' },
    { park: 'greatsmokymountains',   bird: 'American Robin', label: 'American Robin @ Smokies (0.55)' },
    { park: 'acadia',               bird: 'Great Blue Heron', label: 'Great Blue Heron @ Acadia (0.55)' },
    // Migration badge recovery checks
    { park: 'everglades',           bird: 'Killdeer', label: 'Killdeer @ Everglades' },
    { park: 'shenandoah',           bird: 'American Robin', label: 'American Robin @ Shenandoah' },
    { park: 'denali',               bird: 'Killdeer', label: 'Killdeer @ Denali' },
    // General checks
    { park: 'grandcanyon',          bird: 'Killdeer', label: 'Killdeer @ Grand Canyon' },
    { park: 'acadia',               bird: 'Barn Swallow', label: 'Barn Swallow @ Acadia' },
    { park: 'acadia',               bird: 'Snowy Owl', label: 'Snowy Owl @ Acadia' },
  ];

  for (const { park, bird, label } of spotChecks) {
    const a = cache[park]?.animals?.find(x => x.name === bird);
    if (a) {
      console.log(`   ${label.padEnd(40)} rarity: ${(a.rarity || '').padEnd(13)} migration: ${(a.migrationStatus || 'n/a').padEnd(18)} source: ${a.raritySource || 'n/a'}`);
    } else {
      console.log(`   ${label.padEnd(40)} NOT FOUND`);
    }
  }

  console.log(`\nDone. ${totalBirdsPatched} birds patched across ${parksToPatch.length} parks.`);
}

main().catch(err => {
  console.error('Patch failed:', err);
  process.exit(1);
});
