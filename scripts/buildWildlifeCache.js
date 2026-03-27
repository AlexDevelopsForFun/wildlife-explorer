#!/usr/bin/env node
/**
 * scripts/buildWildlifeCache.js
 *
 * Calls eBird, iNaturalist, NPS, and GBIF APIs for every park in
 * wildlifeData.js, collects ALL confirmed species per park (no cap),
 * and writes the result to src/data/wildlifeCache.js as a static
 * JavaScript literal — no imports, no runtime cost.
 *
 * Usage:
 *   node scripts/buildWildlifeCache.js
 *
 * Requirements:
 *   Node.js 18+ (built-in fetch)
 *   .env in the project root with:
 *     VITE_EBIRD_API_KEY=your-key
 *     VITE_NPS_API_KEY=your-key
 *
 * Key fixes vs previous version:
 *   - NPS: uses categoryName field (not taxonCode) + full pagination
 *   - eBird: uses /product/spplist/{hotspot} historical list (not recent obs)
 *   - iNat: uses /observations/species_counts, per_page=200, no species cap
 *   - No 20-species cap anywhere — all confirmed species are stored
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
const NPS_KEY   = env.VITE_NPS_API_KEY   ?? process.env.VITE_NPS_API_KEY   ?? '';

if (!EBIRD_KEY) console.warn('⚠  VITE_EBIRD_API_KEY not set — eBird results will be skipped');
if (!NPS_KEY)   console.warn('⚠  VITE_NPS_API_KEY not set — NPS results will be skipped');

// ── Import park list ─────────────────────────────────────────────────────────
const { wildlifeLocations } = await import('../src/wildlifeData.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, opts = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      // Rate-limited or server error — back off and retry
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = 2000 * (attempt + 1); // 2 s, 4 s, 6 s
        console.warn(`    ⚠  HTTP ${res.status} — retrying in ${delay / 1000}s (${url.slice(0, 80)}…)`);
        await sleep(delay);
        continue;
      }
      return null; // non-retryable error (4xx other than 429)
    } catch {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Text-only variant of safeFetch — for CSV/text responses (eBird bar chart).
async function safeTextFetch(url, opts = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = 2000 * (attempt + 1);
        console.warn(`    ⚠  HTTP ${res.status} — retrying in ${delay / 1000}s`);
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

// ── Rarity tiers — probability of seeing on a typical park visit ──────────────
// guaranteed  > 90%   — almost certain to see on any visit
// very_likely 60-90%  — probably will see with a little looking
// likely      30-60%  — good chance spending a full day
// unlikely    10-30%  — possible but not expected
// rare         2-10%  — lucky sighting, worth reporting
// exceptional  < 2%   — once in a season or lifetime

function rarityFromFreq(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// Mirrors getCorrectionFactor() in apiService.js — applied to eBird bar chart
// frequency before mapping to rarity tier. Values < 1 reduce apparent frequency
// for charismatic over-reported species.
function ebirdCharismaCorrectionFactor(name) {
  if (!name) return 1;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower))   return 1 / 5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return 1 / 3;
  return 1;
}

function rarityFromChecklist(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// ── Charisma correction for iNat observation counts ──────────────────────────
// Over-reported charismatic species inflate raw counts; divide to normalise.
function applyCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const lower = name.toLowerCase();
  // Individual high-charisma species
  if (/\bbald eagle\b/.test(lower))                          return obsCount / 5;
  if (/\b(wolf|wolves|gray wolf|grey wolf)\b/.test(lower))   return obsCount / 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower))       return obsCount / 4;
  if (/\b(bear)\b/.test(lower))                              return obsCount / 5;
  // Raptor/owl family (excluding Bald Eagle, already handled)
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return obsCount / 3;
  if (/\b(bison|buffalo)\b/.test(lower))                     return obsCount / 2;
  if (/\b(elk|moose|alligator|crocodile)\b/.test(lower))    return obsCount / 2;
  if (/\b(deer|squirrel)\b/.test(lower))                     return obsCount / 1.5;
  // Under-reported: small/cryptic species
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower))        return obsCount * 5;
  if (/\bbat\b/.test(lower))                                 return obsCount * 4;
  if (/\bsnake\b/.test(lower))                               return obsCount * 2;
  return obsCount;
}

// Absolute iNat observation count → visit-probability tier, with charisma correction.
// Conservative thresholds: only truly abundant species reach guaranteed/very_likely.
function rarityFromObsCount(obsCount, name = '') {
  const corrected = applyCharismaCorrection(obsCount, name);
  if (corrected >= 2000) return 'guaranteed';
  if (corrected >= 500)  return 'very_likely';
  if (corrected >= 100)  return 'likely';
  if (corrected >= 20)   return 'unlikely';
  if (corrected >= 5)    return 'rare';
  return 'exceptional';
}

// ── eBird bar chart helpers (mirrors apiService.js for use at build time) ───────
// 48 ~weekly periods map to months exactly as in the runtime code.
const MONTH_TO_PERIODS_BUILD = {
  1:[0,1,2,3],   2:[4,5,6,7],   3:[8,9,10,11],  4:[12,13,14,15],
  5:[16,17,18,19], 6:[20,21,22,23], 7:[24,25,26,27], 8:[28,29,30,31],
  9:[32,33,34,35], 10:[36,37,38,39], 11:[40,41,42,43], 12:[44,45,46,47],
};
const SEASON_MONTHS_BUILD = {
  spring:[3,4,5], summer:[6,7,8], fall:[9,10,11], winter:[12,1,2],
};

function monthlyFreqBuild(periods, month) {
  const idxs = MONTH_TO_PERIODS_BUILD[month] ?? [0,1,2,3];
  return idxs.reduce((s, i) => s + (periods[i] ?? 0), 0) / idxs.length;
}
function seasonalFreqBuild(periods, season) {
  const months = SEASON_MONTHS_BUILD[season];
  const freqs  = months.map(m => monthlyFreqBuild(periods, m));
  return freqs.reduce((s, v) => s + v, 0) / freqs.length;
}

// Returns season array from bar chart. threshold = min average frequency per season.
// Returns ['year_round'] when all 4 seasons meet threshold.
// Returns null when no bar chart data produced a result.
function getSeasonsFromBarChartBuild(periods, threshold = 0.05) {
  const present = ['spring','summer','fall','winter'].filter(
    s => seasonalFreqBuild(periods, s) >= threshold
  );
  if (present.length === 4) return ['year_round'];
  return present.length > 0 ? present : null;
}

// Peak seasonal frequency — the best single-season average.
// Used with rarityFromFreq() to assign rarity from bar chart data.
function peakSeasonalFreqBuild(periods) {
  return Math.max(
    ...['spring','summer','fall','winter'].map(s => seasonalFreqBuild(periods, s))
  );
}

// Parse eBird bar chart tab-separated CSV → { [comName]: number[48] }
// Format: each data row is "Species Name (Sci Name)\tfreq1\tfreq2\t...\tfreq48"
function parseBarChart(text) {
  if (!text) return null;
  const barChart = {};
  for (const line of text.split('\n')) {
    const cols = line.split('\t');
    if (cols.length < 10) continue;
    const rawName = cols[0].trim();
    if (!rawName || rawName.toLowerCase() === 'species') continue;
    const comName = rawName.replace(/\s*\([^)]+\)\s*$/, '').trim();
    if (!comName) continue;
    const freqs = [];
    for (let i = 1; i <= 48; i++) {
      const v = parseFloat(cols[i]);
      freqs.push(isNaN(v) ? 0 : v);
    }
    if (freqs.some(v => v > 0)) barChart[comName] = freqs;
  }
  return Object.keys(barChart).length > 5 ? barChart : null;
}

// ── iNat histogram helpers ───────────────────────────────────────────────────
// Monthly observation histogram → season array.
// threshold: fraction of annual observations a season must have to be 'present'.
// 0.05 = at least 5% of yearly obs — a season window with meaningful presence.
function getSeasonsFromMonthlyHistogram(monthCounts, threshold = 0.05) {
  if (!monthCounts) return null;
  const total = Object.values(monthCounts).reduce((s, v) => s + (v ?? 0), 0);
  if (total < 10) return null; // too few observations for reliable seasonality
  const frac = (months) => months.reduce((s, m) => s + (monthCounts[m] ?? 0), 0) / total;
  const spring = frac([3,4,5]);
  const summer = frac([6,7,8]);
  const fall   = frac([9,10,11]);
  const winter = frac([12,1,2]);
  const present = [];
  if (spring >= threshold) present.push('spring');
  if (summer >= threshold) present.push('summer');
  if (fall   >= threshold) present.push('fall');
  if (winter >= threshold) present.push('winter');
  if (present.length === 4) return ['year_round'];
  return present.length > 0 ? present : null;
}

// Peak-month share of annual observations → rarity tier.
// Maps iNat histogram total observation count → rarity tier via rarityFromObsCount.
// Previously used peak/total fraction which measured temporal concentration, not
// abundance — a species with 20 obs all in one month hit "guaranteed" incorrectly.
// Now uses total obs count with charisma correction, same scale as rarityFromObsCount.
function rarityFromInatHistogram(monthCounts, name = '') {
  if (!monthCounts) return null;
  const total = Object.values(monthCounts).reduce((s, v) => s + (v ?? 0), 0);
  if (total < 5) return null; // insufficient data — fall back to rarityFromObsCount
  return rarityFromObsCount(total, name);
}

function isTaxonomicJunk(name) {
  if (!name?.trim()) return true;
  const n = name.trim();
  if (/,\s*\d{4}/.test(n)) return true;
  if (/\b(Linnaeus|Gray|Cuvier|Say|Ord|Leach|Rafinesque|Wagler|Temminck|Swainson|Bonaparte|Schreber|Merriam|Kerr|Baird)\b/.test(n)) return true;
  if (/^[A-Z][a-z]+ [a-z]+(\s[a-z]+)?$/.test(n)) return true;
  if (/^(genus|family|order|class|phylum|kingdom|suborder|subclass|subfamily|tribe|superfamily)$/i.test(n)) return true;
  return false;
}

// ── Permanent entry validator ─────────────────────────────────────────────────
// Rejects entries that are genus-level, taxonomic ranks, unidentified, or garbage.
// Called from slim() so bad entries can never enter the cache.
const _REJECT_PATTERNS = [
  /\b(unidentified|unknown|hybrid)\b/i,
  /\bspp?\./i,
  /,\s*\d{4}/,                    // author-year: "Gray, 1865"
  /\b(family|order|class|phylum|suborder|tribe)\s+[A-Z]/i,
  /[\u0400-\u04FF\u4E00-\u9FFF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F]/, // non-Latin script
];
function _isGenusOnlySci(sci) {
  if (!sci) return false;
  const parts = sci.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return true;
  if (parts.length === 2 && /^spp?\.?$/i.test(parts[1])) return true;
  return false;
}
export function isValidAnimalEntry(a) {
  const n = a?.name?.trim();
  if (!n) return false;
  if (_REJECT_PATTERNS.some(p => p.test(n))) return false;
  if (_isGenusOnlySci(a.scientificName)) return false;
  // Single-word name requires at least a scientific name to be considered valid
  if (!n.includes(' ') && !a.scientificName) return false;
  return true;
}

// Slim an animal for the static bundle — drop debug / source metadata.
function slim(a, source = 'static') {
  // Prefer the merged sources array from dedup(); fall back to [source]
  const sources = (a.sources?.length ? a.sources : [source]);
  return {
    name:           a.name,
    emoji:          a.emoji          ?? '🐾',
    animalType:     a.animalType     ?? 'other',
    rarity:         a.rarity         ?? 'likely',
    seasons:        a.seasons        ?? ['spring', 'summer', 'fall'],
    scientificName: a.scientificName ?? null,
    funFact:        a.funFact        ?? null,
    photoUrl:       a.photoUrl       ?? null,
    source:         sources[0],
    sources,
  };
}

// ── Rarity overrides — applied to cache just before writing ──────────────────
// Mirrors the RARITY_OVERRIDES in src/services/apiService.js.
// These park-specific overrides correct species whose iNat observation counts
// are low due to remoteness or low visitor numbers, not actual rarity.
// KEEP IN SYNC with both apiService.js and scripts/patchRarity.mjs.
const RARITY_OVERRIDES = {
  // ── Yellowstone / Tetons ─────────────────────────────────────────────────
  yellowstone:           { 'American Bison': 'guaranteed', 'American Elk': 'guaranteed', 'Elk': 'very_likely', 'Grizzly Bear': 'unlikely', 'Gray Wolf': 'rare', 'Moose': 'unlikely' },
  'grand-teton':         { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  grandteton:            { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  // ── Southeast ────────────────────────────────────────────────────────────
  everglades:            { 'American Alligator': 'guaranteed', 'West Indian Manatee': 'unlikely', 'Florida Manatee': 'unlikely', 'Great Blue Heron': 'guaranteed', 'Anhinga': 'guaranteed', 'Snowy Egret': 'very_likely', 'Roseate Spoonbill': 'likely', 'Eastern Lubber Grasshopper': 'very_likely', 'Florida Panther': 'exceptional' },
  congaree:              { 'American Alligator': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  biscayne:              { 'Brown Pelican': 'very_likely', 'Double-crested Cormorant': 'very_likely', 'Bottlenose Dolphin': 'unlikely' },
  drytortugas:           { 'Sooty Tern': 'guaranteed', 'Brown Noddy': 'guaranteed', 'Magnificent Frigatebird': 'very_likely', 'American Alligator': 'exceptional' }, // data quality: no alligators at DT
  // ── East / Appalachian ───────────────────────────────────────────────────
  greatsmokymountains:   { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely', 'Wild Turkey': 'very_likely' },
  shenandoah:            { 'White-tailed Deer': 'guaranteed', 'Wild Turkey': 'very_likely', 'Black Bear': 'likely' },
  acadia:                { 'American Herring Gull': 'guaranteed', 'Bald Eagle': 'rare', 'White-tailed Deer': 'very_likely', 'Harbor Seal': 'likely', 'Common Loon': 'likely' },
  olympic:               { 'Mule Deer': 'guaranteed', 'Bald Eagle': 'likely', 'Roosevelt Elk': 'likely', 'Harbor Seal': 'likely', 'Olympic Marmot': 'very_likely', 'Canada Jay': 'very_likely' },
  isleroyale:            { 'Moose': 'likely', 'Common Loon': 'guaranteed' },
  newrivergorge:         { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely' },
  cuyahogavalley:        { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'very_likely' },
  mammothcave:           { 'Little Brown Bat': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  hotsprings:            { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'guaranteed' },
  indianadunes:          { 'White-tailed Deer': 'guaranteed', 'Sandhill Crane': 'very_likely' },
  gatewayarch:           { 'Eastern Gray Squirrel': 'guaranteed', 'American Robin': 'very_likely', 'White-tailed Deer': 'very_likely', 'Red Fox': 'unlikely' },
  voyageurs:             { 'Common Loon': 'guaranteed', 'Bald Eagle': 'very_likely', 'Moose': 'likely' },
  // ── Rocky Mountain / Great Plains ────────────────────────────────────────
  glacier:               { 'Mountain Goat': 'very_likely', 'Grizzly Bear': 'unlikely', 'Bighorn Sheep': 'very_likely', 'Bald Eagle': 'likely' },
  badlands:              { 'American Bison': 'guaranteed', 'Pronghorn': 'guaranteed', 'Black-tailed Prairie Dog': 'guaranteed' },
  windcave:              { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely' },
  theodoreroosevelt:     { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely', 'Wild Horse': 'very_likely' },
  // ── Rocky Mountain / Sierra Nevada / Southwest ───────────────────────────
  rockymountain:         { 'American Elk': 'guaranteed', 'Elk': 'guaranteed', 'Mule Deer': 'very_likely', 'Bighorn Sheep': 'likely' },
  yosemite:              { 'California Ground Squirrel': 'guaranteed', "Steller's Jay": 'very_likely', 'Mule Deer': 'very_likely', 'Black Bear': 'unlikely' },
  saguaro:               { "Gambel's Quail": 'guaranteed', 'Cactus Wren': 'very_likely', 'Gila Woodpecker': 'very_likely' },
  grandcanyon:           { 'Common Raven': 'guaranteed', 'Rock Squirrel': 'very_likely', 'Mule Deer': 'very_likely', 'Elk': 'likely', 'American Bison': 'exceptional' }, // no bison at GC
  zion:                  { 'Rock Squirrel': 'guaranteed', 'Mule Deer': 'very_likely', 'Desert Cottontail': 'likely', 'Coyote': 'likely' },
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
  // ── Southwest caves ──────────────────────────────────────────────────────
  carlsbadcaverns:       { 'Mexican Free-tailed Bat': 'guaranteed' },
  // ── Alaska ───────────────────────────────────────────────────────────────
  denali:                { 'Brown Bear': 'likely', 'Caribou': 'very_likely', 'Moose': 'very_likely', 'Dall Sheep': 'very_likely', 'Arctic Ground Squirrel': 'guaranteed', 'Grizzly Bear': 'likely' },
  katmai:                { 'Brown Bear': 'guaranteed' },
  glacierbay:            { 'Humpback Whale': 'very_likely', 'Harbor Seal': 'guaranteed', 'Sea Otter': 'very_likely' },
  kenaifjords:           { 'Sea Otter': 'guaranteed', 'Harbor Seal': 'guaranteed', 'Tufted Puffin': 'very_likely', 'Horned Puffin': 'very_likely', 'Orca': 'unlikely' },
  wrangell:              { 'Dall Sheep': 'very_likely', 'Moose': 'very_likely', 'Brown Bear': 'likely' },
  wrangellstelias:       { 'Dall Sheep': 'very_likely', 'Moose': 'very_likely', 'Brown Bear': 'likely' },
  lakeclark:             { 'Brown Bear': 'guaranteed', 'Sockeye Salmon': 'guaranteed' },
  // ── Hawaii ───────────────────────────────────────────────────────────────
  hawaiivolcanoes:       { 'Nene': 'guaranteed', 'Hawaiian Hawk': 'unlikely', 'Hawaiian Goose': 'guaranteed' },
  haleakala:             { 'Nene': 'guaranteed', 'Hawaiian Goose': 'guaranteed' },
  // ── Island / Tropical ────────────────────────────────────────────────────
  virginislands:         { 'Green Iguana': 'guaranteed', 'Green Sea Turtle': 'very_likely', 'Hawksbill Sea Turtle': 'unlikely' },
  americansamoa:         { 'Samoan Flying Fox': 'very_likely', 'Green Sea Turtle': 'likely' },
};

// ── iNat taxon parameters ────────────────────────────────────────────────────
// Major groups use iconic_taxa[] — the correct iNat API parameter for filtering
// by kingdom-level iconic taxon. Using taxon_id for these groups was wrong and
// caused poor/missing mammal results (taxon_id=40151 is Theria, not Mammalia).
const ICONIC_TAXA = {
  bird:      'Aves',
  mammal:    'Mammalia',
  reptile:   'Reptilia',
  amphibian: 'Amphibia',
  insect:    'Insecta',
  marine:    'Actinopterygii',
};

// Subgroups still use taxon_id for precise targeting within a parent iconic group.
const INAT_SUBGROUP_IDS = {
  bat:    49447, // Chiroptera
  snake:  85553, // Serpentes
  lizard: 86258, // Lacertilia
  frog:   20979, // Anura
};

const INAT_TYPE_MAP = {
  aves:          { type: 'bird',      emoji: '🐦' },
  mammalia:      { type: 'mammal',    emoji: '🦌' },
  reptilia:      { type: 'reptile',   emoji: '🐊' },
  amphibia:      { type: 'amphibian', emoji: '🐸' },
  insecta:       { type: 'insect',    emoji: '🦋' },
  actinopterygii:{ type: 'marine',    emoji: '🐟' },
  chondrichthyes:{ type: 'marine',    emoji: '🦈' },
  mollusca:      { type: 'marine',    emoji: '🐚' },
};

// NPS taxon map — keys match lowercase categoryName values from the NPS API
const NPS_TAXON_MAP = {
  'mammal':              { animalType: 'mammal',    emoji: '🦌' },
  'bird':                { animalType: 'bird',      emoji: '🐦' },
  'reptile':             { animalType: 'reptile',   emoji: '🦎' },
  'amphibian':           { animalType: 'amphibian', emoji: '🐸' },
  'insect':              { animalType: 'insect',    emoji: '🦋' },
  'spider/scorpion':     { animalType: 'insect',    emoji: '🕷️' },
  'fish':                { animalType: 'marine',    emoji: '🐟' },
  'marine invertebrate': { animalType: 'marine',    emoji: '🦑' },
};

// ── eBird: find nearest hotspot (used only by thin-park retry) ───────────────
async function getEbirdHotspot(lat, lng) {
  if (!EBIRD_KEY) return null;
  const url = `https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=50&fmt=json`;
  const data = await safeFetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
  return data?.[0]?.locId ?? null;
}

// ── eBird: fetch bar chart for a hotspot or state region ──────────────────────
// Returns { [comName]: number[48] } (48 weekly frequency values per species).
// Tries the nearest hotspot first; falls back to US-{stateCode} region.
async function fetchParkBarChart(hotspotLocId, stateCode) {
  if (!EBIRD_KEY) return null;
  const hdrs = { headers: { 'X-eBirdApiToken': EBIRD_KEY } };
  if (hotspotLocId) {
    const text = await safeTextFetch(
      `https://api.ebird.org/v2/product/barChart?r=${hotspotLocId}&bYear=2020&eYear=2024&bMonth=1&eMonth=12`,
      hdrs
    );
    const chart = parseBarChart(text);
    if (chart) return chart;
    await sleep(300);
  }
  if (stateCode) {
    const text = await safeTextFetch(
      `https://api.ebird.org/v2/product/barChart?r=US-${stateCode}&bYear=2020&eYear=2024&bMonth=1&eMonth=12`,
      hdrs
    );
    const chart = parseBarChart(text);
    if (chart) return chart;
  }
  return null;
}

// ── iNat: monthly observation histogram for a species at a park ───────────────
// Uses taxon_name (scientific name) — taxon_id returns empty results from this endpoint.
// Uses interval=month_of_year to get numeric keys {1..12} directly.
// Returns { 1: count, ..., 12: count } or null.
async function getInatHistogram(sciName, placeId) {
  if (!sciName || !placeId) return null;
  const url =
    `https://api.inaturalist.org/v1/observations/histogram` +
    `?taxon_name=${encodeURIComponent(sciName)}&place_id=${placeId}` +
    `&date_field=observed&interval=month_of_year`;
  const data = await safeFetch(url);
  const raw = data?.results?.month_of_year ?? null;
  if (!raw || !Object.keys(raw).length) return null;
  // Normalise keys to integers
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [parseInt(k, 10), v ?? 0]));
}

// Global histogram cache — key: "sciName:placeId"
// Prevents duplicate API calls for the same species appearing in multiple
// data sources (eBird + iNat) within a single park, and across thin-park retries.
const _histogramCache = new Map();

// ── eBird: full taxonomy lookup (one-time per run, cached in memory) ──────────
let _ebirdTaxonomy = null;

async function loadEbirdTaxonomy() {
  if (_ebirdTaxonomy) return _ebirdTaxonomy;
  if (!EBIRD_KEY) return {};
  console.log('  Loading eBird taxonomy (one-time download)…');
  const data = await safeFetch(
    'https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&locale=en',
    { headers: { 'X-eBirdApiToken': EBIRD_KEY } }
  );
  if (!Array.isArray(data)) {
    console.warn('  eBird taxonomy fetch failed — birds will use geo/recent fallback');
    return {};
  }
  _ebirdTaxonomy = {};
  data.forEach(t => { _ebirdTaxonomy[t.speciesCode] = t; });
  console.log(`  eBird taxonomy loaded: ${data.length} taxa`);
  return _ebirdTaxonomy;
}

// ── eBird: full historical species list — union of nearby hotspots + state ────
// Strategy:
//   1. Fetch spplists for top-5 hotspots within 50km, union all codes.
//   2. If the union has < 150 bird species (sparse park coverage), supplement
//      with the full state-level list (e.g. US-UT) — guaranteed comprehensive.
// This ensures remote parks (Canyonlands etc.) still get 200+ birds while
// well-studied parks keep their accurate location-specific lists.
async function getEbirdHistorical(lat, lng, stateCode, barChart = null) {
  if (!EBIRD_KEY) return [];
  const taxonomy = await loadEbirdTaxonomy();
  if (!Object.keys(taxonomy).length) return [];

  const allCodes     = new Set();  // union of hotspot + state codes
  const hotspotCodes = new Set();  // only codes seen in a nearby hotspot spplist

  // 1. Union of spplists for up to 5 hotspots within 50 km
  const hotspots = await safeFetch(
    `https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=50&fmt=json`,
    { headers: { 'X-eBirdApiToken': EBIRD_KEY } }
  );
  if (Array.isArray(hotspots) && hotspots.length > 0) {
    for (const h of hotspots.slice(0, 5)) {
      const codes = await safeFetch(
        `https://api.ebird.org/v2/product/spplist/${h.locId}`,
        { headers: { 'X-eBirdApiToken': EBIRD_KEY } }
      );
      if (Array.isArray(codes)) {
        codes.forEach(c => { allCodes.add(c); hotspotCodes.add(c); });
      }
      await sleep(120);
    }
  }

  // 2. If hotspot coverage is thin, supplement with state-level list
  const hotspotSpeciesCount = [...hotspotCodes].filter(c => taxonomy[c]?.category === 'species').length;
  if (hotspotSpeciesCount < 150 && stateCode) {
    const regionCode = `US-${stateCode}`;
    const codes = await safeFetch(
      `https://api.ebird.org/v2/product/spplist/${regionCode}`,
      { headers: { 'X-eBirdApiToken': EBIRD_KEY } }
    );
    if (Array.isArray(codes)) codes.forEach(c => allCodes.add(c));
  }

  if (!allCodes.size) return [];

  // Build a lowercase-keyed lookup for case-insensitive bar chart matching.
  const barChartLC = barChart
    ? Object.fromEntries(Object.entries(barChart).map(([k, v]) => [k.toLowerCase(), v]))
    : null;

  return [...allCodes]
    .filter(code => taxonomy[code]?.category === 'species')
    .map(code => {
      const t         = taxonomy[code];
      const isHotspot = hotspotCodes.has(code);

      // Look up this species in the bar chart (exact name, then case-insensitive).
      const periods = barChart?.[t.comName]
        ?? barChartLC?.[t.comName?.toLowerCase()]
        ?? null;

      let seasons, rarity, frequency;
      if (periods) {
        // Gold-standard path: derive seasons and rarity from real eBird frequency data.
        const derived = getSeasonsFromBarChartBuild(periods);
        seasons   = derived ?? ['spring', 'summer', 'fall'];  // null → assume 3-season
        const peak = peakSeasonalFreqBuild(periods);
        frequency  = peak;
        // Apply charisma correction before mapping to rarity — charismatic species
        // (Bald Eagle, raptors) are over-reported on checklists vs actual encounter rate.
        const correctedPeak = peak * ebirdCharismaCorrectionFactor(t.comName);
        rarity     = rarityFromFreq(correctedPeak);
      } else {
        // No bar chart data: binary fallback — apply charisma correction to the
        // proxy frequency so charismatic species (eagles, raptors) get a lower tier
        // than ordinary hotspot birds even without real frequency data.
        seasons   = ['spring', 'summer', 'fall', 'winter'];
        const baseFq      = isHotspot ? 0.4 : 0.15;
        const correctedFq = baseFq * ebirdCharismaCorrectionFactor(t.comName);
        rarity    = rarityFromFreq(correctedFq);
        frequency = correctedFq;
      }

      return {
        name:           t.comName,
        scientificName: t.sciName,
        emoji:          '🐦',
        animalType:     'bird',
        seasons,
        bestSeason:     'spring',
        source:         'ebird',
        rarity,
        frequency,
        funFact:        isHotspot
          ? `Confirmed at this park's eBird hotspot.`
          : `Recorded in this region (eBird historical checklist).`,
      };
    });
}

// ── eBird: geo/recent fallback (used in thin-park retry when no hotspot) ──────
// Uses back=30 (eBird max; back=90 returns HTTP 400 silently) and dist=15.
async function getEbirdObsWide(lat, lng) {
  if (!EBIRD_KEY) return [];
  const url =
    `https://api.ebird.org/v2/data/obs/geo/recent` +
    `?lat=${lat}&lng=${lng}&dist=15&back=30&maxResults=500&includeProvisional=true`;
  const obs = await safeFetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
  if (!Array.isArray(obs)) return [];

  return obs
    .filter(o => o.comName && /^[a-z]{6}$/i.test(o.speciesCode ?? ''))
    .map(o => ({
      name: o.comName, scientificName: o.sciName ?? null,
      emoji: '🐦', animalType: 'bird',
      seasons: ['spring', 'summer', 'fall', 'winter'], bestSeason: 'spring',
      rarity: 'very_likely', frequency: 0.7,
      funFact: `Recently reported within 15 km of this park (eBird).`,
    }));
}

// ── iNat place_id lookup table — hardcoded for all 63 US national parks ────────
// Resolved via api.inaturalist.org/v1/places/autocomplete on 2026-03-20.
// Using exact park boundary (place_id) is more accurate than lat/lng radius.
const INAT_PLACE_IDS = {
  "yellowstone":        10211,  // Yellowstone National Park
  "everglades":         53957,  // Everglades National Park
  "denali":             71077,  // Denali National Park
  "acadia":             49610,  // Acadia National Park
  "shenandoah":          9012,  // Shenandoah National Park
  "newrivergorge":      95209,  // New River Gorge National Park and Preserve
  "cuyahogavalley":     72639,  // Cuyahoga Valley National Park
  "isleroyale":         95245,  // Isle Royale National Park
  "greatsmokymountains":72645,  // Great Smoky Mountains National Park
  "biscayne":           95108,  // Biscayne National Park
  "drytortugas":        70571,  // Dry Tortugas National Park
  "congaree":           53620,  // Congaree National Park
  "mammothcave":        72649,  // Mammoth Cave National Park
  "voyageurs":          69101,  // Voyageurs National Park
  "indianadunes":       95241,  // Indiana Dunes National Lakeshore (renamed 2019)
  "badlands":           72792,  // Badlands National Park
  "windcave":           72794,  // Wind Cave National Park
  "theodoreroosevelt":  72793,  // Theodore Roosevelt National Park
  "gatewayarch":       137962,  // Gateway Arch National Park
  "grandcanyon":        69216,  // Grand Canyon National Park
  "zion":               50634,  // Zion National Park
  "brycecanyon":        69110,  // Bryce Canyon National Park
  "arches":             53642,  // Arches National Park
  "canyonlands":        95131,  // Canyonlands National Park
  "capitolreef":        69282,  // Capitol Reef National Park
  "mesaverde":          69108,  // Mesa Verde National Park
  "petrifiedforest":    57573,  // Petrified Forest National Park
  "saguaro":            65739,  // Saguaro National Park
  "whitesands":         62621,  // White Sands National Park
  "guadalupemountains": 69313,  // Guadalupe Mountains National Park
  "bigbend":            55071,  // Big Bend National Park
  "grandteton":         69099,  // Grand Teton National Park
  "rockymountain":      49676,  // Rocky Mountain National Park
  "glacier":            72841,  // Glacier National Park
  "greatsanddunes":     53632,  // Great Sand Dunes National Park
  "blackcanyon":        72635,  // Black Canyon of the Gunnison National Park
  "olympic":            69094,  // Olympic National Park
  "northcascades":      69097,  // North Cascades National Park
  "mountrainier":        8838,  // Mount Rainier National Park
  "craterlake":         52923,  // Crater Lake National Park
  "redwood":             6021,  // Redwood National Park
  "lassenvolcanic":      4509,  // Lassen Volcanic National Park
  "yosemite":           68542,  // Yosemite National Park
  "kingscanyon":         3378,  // Kings Canyon National Park
  "sequoia":            95321,  // Sequoia National Park
  "joshuatree":          3680,  // Joshua Tree National Park
  "deathvalley":         4504,  // Death Valley National Park
  "channelislands":      3157,  // Channel Islands National Park
  "pinnacles":           5737,  // Pinnacles National Park
  "kenaifjords":        95258,  // Kenai Fjords National Park
  "glacierbay":         69113,  // Glacier Bay National Park
  "katmai":             95257,  // Katmai National Park
  "wrangellstelias":    72658,  // Wrangell-St. Elias National Park
  "lakeclark":          69114,  // Lake Clark National Park
  "gatesofthearctic":   69111,  // Gates of the Arctic National Park
  "kobukvalley":        69115,  // Kobuk Valley National Park
  "hawaiivolcanoes":     7222,  // Hawaii Volcanoes National Park
  "haleakala":          56788,  // Haleakalā National Park
  "americansamoa":      73645,  // National Park of American Samoa
  "virginislands":      95336,  // Virgin Islands National Park
  "hotsprings":         56706,  // Hot Springs National Park
  "carlsbadcaverns":    69109,  // Carlsbad Caverns National Park
  "greatbasin":         69699,  // Great Basin National Park
};

// ── iNat: resolve place_id for a park ─────────────────────────────────────────
// Uses hardcoded table first; falls back to autocomplete API for unlisted parks.
const _inatPlaceCache = {};

async function getInatPlaceId(loc) {
  // Prefer hardcoded table (exact park boundary, pre-verified)
  if (INAT_PLACE_IDS[loc.id] !== undefined) return INAT_PLACE_IDS[loc.id];
  // Dynamic fallback for any park not in the table
  const parkName = loc.name ?? loc.id;
  if (_inatPlaceCache[parkName] !== undefined) return _inatPlaceCache[parkName];
  const url =
    `https://api.inaturalist.org/v1/places/autocomplete` +
    `?q=${encodeURIComponent(parkName)}&place_type=open_space&per_page=5`;
  const data = await safeFetch(url);
  const id = data?.results?.[0]?.id ?? null;
  _inatPlaceCache[parkName] = id;
  return id;
}

// ── iNat: species counts near a point ────────────────────────────────────────
// Uses /observations/species_counts for efficient per-species aggregation.
// Returns up to 200 species per taxon group, sorted by observation count.
// placeId: when provided, uses place_id boundary instead of lat/lng radius.
// noQualityFilter: when true, omits quality_grade=research — used for remote
//   parks (e.g. Gates of the Arctic, Kobuk Valley, North Cascades) where
//   research-grade observations are extremely sparse. All grades are included.
async function getInatSpecies(lat, lng, taxonKey, wideNet = false, placeId = null, noQualityFilter = false) {
  const isIconic   = taxonKey in ICONIC_TAXA;
  const isSubgroup = taxonKey in INAT_SUBGROUP_IDS;
  if (!isIconic && !isSubgroup) return [];

  const radius  = wideNet ? 50 : 20;
  // Date restriction only helps for lat/lng radius queries (finds recent nearby activity).
  // When using a place_id boundary, skip it — we want all-time records for the full park.
  const days    = (!placeId && wideNet) ? 365 : 0;
  const dateParam = days > 0
    ? `&d1=${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}` +
      `&d2=${new Date().toISOString().slice(0, 10)}`
    : '';
  // Use iconic_taxa[] for major groups (correct iNat API param),
  // taxon_id only for precise subgroup targeting (bat, snake, lizard, frog).
  const taxonParam = isIconic
    ? `iconic_taxa[]=${ICONIC_TAXA[taxonKey]}`
    : `taxon_id=${INAT_SUBGROUP_IDS[taxonKey]}`;
  // Prefer place_id boundary; fall back to lat/lng radius circle.
  const locationParam = placeId
    ? `place_id=${placeId}`
    : `lat=${lat}&lng=${lng}&radius=${radius}`;
  // quality_grade filter: omit entirely for remote parks with sparse research-grade data
  const qualityParam = noQualityFilter ? '' : '&quality_grade=research';
  const url =
    `https://api.inaturalist.org/v1/observations/species_counts` +
    `?${locationParam}&per_page=200` +
    `${qualityParam}&order_by=observations_count&order=desc&locale=en&preferred_place_id=1` +
    `&${taxonParam}${dateParam}`;
  const data = await safeFetch(url);
  if (!data?.results?.length) return [];

  return data.results
    .filter(r => {
      const rank = r.taxon?.rank;
      return rank === 'species' || rank === 'subspecies';
    })
    .map(r => {
      const taxon = r.taxon;
      const name  = taxon.preferred_common_name ?? taxon.name;
      if (!name) return null;
      const iconic   = (taxon.iconic_taxon_name ?? '').toLowerCase();
      const typeInfo = INAT_TYPE_MAP[iconic] ?? { type: 'other', emoji: '🐾' };
      return {
        name,
        scientificName: taxon.name ?? null,
        emoji:          typeInfo.emoji,
        animalType:     typeInfo.type,
        seasons:        ['spring', 'summer', 'fall', 'winter'],
        bestSeason:     'summer',
        source:         'inaturalist',
        // Absolute observation count → rarity (avoids relative-scarcity distortion)
        rarity:         rarityFromObsCount(r.count),
        funFact:        `${r.count} research-grade iNaturalist observations at this park.`,
        // Internal fields for histogram enrichment in fetchPark — stripped by slim().
        _taxonId:       taxon.id ?? null,
        _count:         r.count,
      };
    })
    .filter(Boolean);
}

// ── NPS: wildlife topic tags via /parks?fields=topics ────────────────────────
// The NPS /v1/species endpoint returns 404 — it was removed.
// The /parks?fields=topics endpoint is the only working NPS wildlife source.
//
// IMPORTANT: Keys must match exact NPS topic names (verified by fetching all 63
// parks and extracting every unique topic name). Topics not in this list are
// silently ignored. Audit date: 2026-03-15 — all 8 entries below are confirmed
// real NPS topic names present in at least one park's topic list.
//
// Removed (never appeared in any park's actual topic list):
//   'Moose', 'Bears - Grizzly', 'Bears - Black', 'Deer', 'Otters',
//   'Manatees', 'Seals and Sea Lions', 'Eagles', 'Salamanders', 'Butterflies and Moths'
const NPS_WILDLIFE_TOPICS = {
  // ── Ungulates ───────────────────────────────────────────────────────────────
  'Bison':                    { name: 'American Bison',     emoji: '🦬', animalType: 'mammal',  rarity: 'guaranteed'  },
  'Elk':                      { name: 'Elk',                emoji: '🦌', animalType: 'mammal',  rarity: 'likely'      },
  'Horses (wild)':            { name: 'Wild Horse',         emoji: '🐴', animalType: 'mammal',  rarity: 'unlikely'    },
  // ── Carnivores ──────────────────────────────────────────────────────────────
  'Wolves':                   { name: 'Gray Wolf',          emoji: '🐺', animalType: 'mammal',  rarity: 'unlikely'    },
  'Cats (wild)':              { name: 'Mountain Lion',      emoji: '🐆', animalType: 'mammal',  rarity: 'exceptional' },
  // ── Marine ──────────────────────────────────────────────────────────────────
  'Whales':                   { name: 'Humpback Whale',     emoji: '🐋', animalType: 'marine',  rarity: 'unlikely'    },
  // ── Reptiles ────────────────────────────────────────────────────────────────
  'Alligators or Crocodiles': { name: 'American Alligator', emoji: '🐊', animalType: 'reptile', rarity: 'guaranteed'  },
  // 'Tortoises and Turtles' resolved per-park in getNpsTopics via NPS_TURTLE_BY_PARK
};

// Per-park turtle species for the 'Tortoises and Turtles' NPS topic (mirrors apiService.js).
const NPS_TURTLE_BY_PARK = {
  zion:    { name: 'Desert Tortoise',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  grca:    { name: 'Desert Tortoise',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  jotr:    { name: 'Desert Tortoise',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  moja:    { name: 'Desert Tortoise',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  deva:    { name: 'Desert Tortoise',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  cong:    { name: 'Eastern Box Turtle',   emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  shen:    { name: 'Eastern Box Turtle',   emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  grsm:    { name: 'Eastern Box Turtle',   emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  ever:    { name: 'Green Sea Turtle',     emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  bith:    { name: 'Green Sea Turtle',     emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  cuis:    { name: 'Loggerhead Sea Turtle',emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  capehe:  { name: 'Loggerhead Sea Turtle',emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  acad:    { name: 'Painted Turtle',       emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  sara:    { name: 'Painted Turtle',       emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
};
const NPS_TURTLE_DEFAULT = { name: 'Desert Tortoise', emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' };

async function getNpsTopics(parkCode) {
  if (!NPS_KEY || !parkCode) return [];
  const url =
    `https://developer.nps.gov/api/v1/parks` +
    `?parkCode=${parkCode}&fields=topics`;
  const data = await safeFetch(url, { headers: { 'X-Api-Key': NPS_KEY } });
  const park = data?.data?.[0];
  if (!park?.topics?.length) return [];
  const topicSet = new Set(park.topics.map(t => t.name));

  const animals = [];

  // Standard topic → species mappings
  for (const [topic, info] of Object.entries(NPS_WILDLIFE_TOPICS)) {
    if (!topicSet.has(topic)) continue;
    animals.push({
      ...info,
      scientificName: null,
      seasons: ['spring', 'summer', 'fall', 'winter'],
      bestSeason: 'summer',
      source: 'nps',
      funFact: `Officially documented in the NPS wildlife registry for ${park.fullName ?? parkCode.toUpperCase()}.`,
    });
  }

  // 'Tortoises and Turtles' resolved per-park — species varies by region
  if (topicSet.has('Tortoises and Turtles')) {
    const turtleInfo = NPS_TURTLE_BY_PARK[parkCode] ?? NPS_TURTLE_DEFAULT;
    animals.push({
      ...turtleInfo,
      scientificName: null,
      seasons: ['spring', 'summer', 'fall'],
      bestSeason: 'summer',
      source: 'nps',
      funFact: `Officially documented in the NPS wildlife registry for ${park.fullName ?? parkCode.toUpperCase()}.`,
    });
  }

  return animals;
}

// ── NPS: complete species inventory with full pagination ──────────────────────
// NOTE: /v1/species endpoint returns 404 — kept here for reference only.
// The working path is getNpsTopics above, wired into fetchPark.
async function getNpsSpecies(parkCode) {
  if (!NPS_KEY || !parkCode) return [];
  const allAnimals = [];
  let start = 0;

  while (true) {
    const url =
      `https://developer.nps.gov/api/v1/species` +
      `?parkCode=${parkCode}&limit=500&start=${start}`;
    const data = await safeFetch(url, { headers: { 'X-Api-Key': NPS_KEY } });
    if (!data?.data?.length) break;

    for (const sp of data.data) {
      // NPS API uses categoryName (e.g. "Bird", "Mammal") — taxonCode is unreliable
      const taxonLower = (sp.categoryName ?? sp.taxonCode ?? '').toLowerCase();
      const typeInfo = Object.entries(NPS_TAXON_MAP)
        .find(([k]) => taxonLower.includes(k))?.[1];
      if (!typeInfo) continue;

      const sciName = sp.sciName ?? null;
      if (!sciName || !/^[A-Z][a-z]+ [a-z]/.test(sciName)) continue;

      // commonNames may be an array or a single string depending on NPS API version
      let commonName = null;
      if (Array.isArray(sp.commonNames)) {
        commonName = sp.commonNames.find(n => n?.trim() && !isTaxonomicJunk(n)) ?? null;
      } else if (typeof sp.commonNames === 'string' && sp.commonNames.trim()) {
        commonName = isTaxonomicJunk(sp.commonNames) ? null : sp.commonNames.trim();
      }
      if (!commonName) continue;

      const abundanceLower = (sp.abundance ?? '').toLowerCase();
      let rarity = 'unlikely';
      if (abundanceLower === 'abundant') rarity = 'very_likely';
      else if (abundanceLower === 'common') rarity = 'likely';
      else if (abundanceLower === 'rare') rarity = 'rare';
      else if (abundanceLower === 'accidental' || abundanceLower === 'extirpated') rarity = 'exceptional';

      allAnimals.push({
        name:           commonName,
        scientificName: sciName,
        emoji:          typeInfo.emoji,
        animalType:     typeInfo.animalType,
        seasons:        ['spring', 'summer', 'fall', 'winter'],
        bestSeason:     'summer',
        rarity,
        funFact:        `Listed in the NPS species inventory for ${parkCode.toUpperCase()}.`,
      });
    }

    start += data.data.length;
    const total = parseInt(data.total ?? '0', 10);
    if (start >= total || data.data.length < 500) break;
    await sleep(800); // NPS rate limit between pages
    console.log(`    [NPS ${parkCode}] page 2+ … ${start}/${total}`);
  }

  return allAnimals;
}

// ── GBIF: occurrence records near a point ─────────────────────────────────────
const GBIF_TYPE_MAP = {
  aves: { type: 'bird', emoji: '🐦' },
  mammalia: { type: 'mammal', emoji: '🦌' },
  reptilia: { type: 'reptile', emoji: '🐊' },
  amphibia: { type: 'amphibian', emoji: '🐸' },
  insecta: { type: 'insect', emoji: '🦋' },
  actinopterygii: { type: 'marine', emoji: '🐟' },
  chondrichthyes: { type: 'marine', emoji: '🦈' },
};

async function getGbif(lat, lng) {
  const d = 0.14;
  const url =
    `https://api.gbif.org/v1/occurrence/search` +
    `?decimalLatitude=${lat - d},${lat + d}` +
    `&decimalLongitude=${lng - d},${lng + d}` +
    `&limit=100&basisOfRecord=HUMAN_OBSERVATION&hasCoordinate=true`;
  const data = await safeFetch(url);
  if (!data?.results?.length) return [];

  const specMap = {};
  data.results.forEach(o => {
    const kingdom = (o.kingdom ?? '').toLowerCase();
    if (kingdom && kingdom !== 'animalia') return;
    const cls = (o.class ?? '').toLowerCase();
    const typeInfo = GBIF_TYPE_MAP[cls];
    if (!typeInfo) return;
    const sciName = o.species ?? null;
    if (!sciName) return;
    const key = o.speciesKey ?? sciName;
    if (!specMap[key]) specMap[key] = { count: 0, cls, sciName, speciesKey: o.speciesKey };
    specMap[key].count++;
  });

  const total = data.results.length;
  return Object.entries(specMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([, info]) => ({
      _gbifSciName: info.sciName,
      _gbifType: GBIF_TYPE_MAP[info.cls]?.type ?? 'other',
      _gbifEmoji: GBIF_TYPE_MAP[info.cls]?.emoji ?? '🐾',
      _gbifFreq: info.count / Math.max(1, total),
      _gbifCount: info.count,
    }));
}

// ── Merge + deduplicate ───────────────────────────────────────────────────────
function normSci(name) {
  if (!name?.trim()) return null;
  const parts = name.toLowerCase().trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
}

function dedup(animals) {
  const groups = new Map();
  const sciToKey = new Map();
  animals.forEach(a => {
    const nameKey = a.name.toLowerCase().trim();
    const sciKey  = normSci(a.scientificName);
    let gk = (sciKey && sciToKey.has(sciKey)) ? sciToKey.get(sciKey) : null;
    if (!gk && groups.has(nameKey)) gk = nameKey;
    if (!gk) gk = nameKey;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(a);
    if (sciKey && !sciToKey.has(sciKey)) sciToKey.set(sciKey, gk);
  });
  return [...groups.values()].map(g => {
    const primary = g.reduce((b, a) => ((a.frequency ?? 0) > (b.frequency ?? 0) ? a : b));
    // Collect all unique source keys from every member of this group
    const allSources = [...new Set(
      g.flatMap(a => a.sources ?? (a.source ? [a.source] : [])).filter(Boolean)
    )];

    // Propagate specific seasons from any group member (e.g. iNat histogram enrichment).
    // A member with fewer than 4 seasons, or with ['year_round'], has real seasonal data;
    // prefer it over the all-4-season default that eBird historical assigns to every bird.
    const specificSeasonMember = g.find(a => {
      const s = a.seasons ?? [];
      return s.includes('year_round') || (s.length > 0 && s.length < 4);
    });
    const mergedSeasons = specificSeasonMember?.seasons ?? primary.seasons;

    // For birds: keep eBird-derived rarity — iNat obs counts at popular parks
    // inflate charismatic birds (eagle photos) far beyond real encounter probability.
    // For non-birds: propagate iNat obs-count rarity if eBird only has binary likely/unlikely.
    const BINARY_RARITIES = new Set(['likely', 'unlikely']);
    const inatMember = primary.animalType !== 'bird'
      ? g.find(a => a.source === 'inaturalist' && a.rarity && !BINARY_RARITIES.has(a.rarity))
      : null;
    const mergedRarity = (BINARY_RARITIES.has(primary.rarity) && inatMember)
      ? inatMember.rarity
      : primary.rarity;

    return { ...primary, seasons: mergedSeasons, rarity: mergedRarity, sources: allSources.length ? allSources : undefined };
  });
}

// Sort animals: abundant first, then common, uncommon, rare, exceptional.
const RARITY_RANK = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };

// ── Mammal minimum rarity floor ───────────────────────────────────────────────
// iNaturalist observation counts severely under-represent common generalist mammals
// (coyote, deer, rabbits) because casual visitors don't bother submitting them.
// A mammal with verified iNat sightings (≥5 obs) is genuinely present and active
// in the park — 'exceptional' (<2%) is almost never the correct tier for these.
// Floor: exceptional → rare for any mammal with 5+ verified iNat observations.
// Floor: exceptional or rare → unlikely for mammals with 25+ iNat observations.
// Hardcoded wildlifeData.js animals (_priority=0) are always exempt (rarity already curated).
// Note: runtime RARITY_OVERRIDES in apiService.js protect legitimately rare species
// (e.g. Florida Panther) from this floor if an explicit override is present.
function applyMammalRarityFloor(deduped) {
  for (const a of deduped) {
    if (a.animalType !== 'mammal') continue;
    if (a._priority === 0) continue;              // curated hardcoded animal — skip
    const obs = a._count ?? 0;
    if (obs >= 25 && (a.rarity === 'exceptional' || a.rarity === 'rare')) {
      a.rarity = 'unlikely';                      // well-documented mammal: min unlikely
    } else if (obs >= 5 && a.rarity === 'exceptional') {
      a.rarity = 'rare';                          // confirmed mammal: min rare
    }
  }
}

// ── Per-park fetch ────────────────────────────────────────────────────────────
async function fetchPark(loc, { noQualityFilter = false } = {}) {
  console.log(`  [${loc.id}] fetching…${noQualityFilter ? ' [no quality filter]' : ''}`);
  const pool = [];
  const stateCode = loc.stateCodes?.[0] ?? null;

  // National parks are large — use wider iNat radius (50km, 365d) by default
  const isNationalPark = !!loc.npsCode;

  try {
    // ── 1. Hardcoded animals first (highest quality, always shown) ──
    if (loc.animals?.length) {
      loc.animals.forEach(a => pool.push({ ...a, _priority: 0 }));
    }

    // ── 2. NPS topic tags (national parks only, working endpoint) ──────
    if (loc.npsCode) {
      const npsAnimals = await getNpsTopics(loc.npsCode);
      npsAnimals.forEach(a => pool.push({ ...a, _priority: 0 })); // same priority as hardcoded
      if (npsAnimals.length) console.log(`  [${loc.id}] NPS topics: ${npsAnimals.length} animals`);
      await sleep(300);
    }

    // ── 3. Bar chart fetch — before eBird historical so season/rarity use real data ──
    // Node.js has no CORS restriction, so we call the eBird barChart endpoint directly.
    const nearestHotspot = await getEbirdHotspot(loc.lat, loc.lng);
    let parkBarChart = null;
    if (stateCode || nearestHotspot) {
      parkBarChart = await fetchParkBarChart(nearestHotspot, stateCode);
      if (parkBarChart) {
        console.log(`  [${loc.id}] Bar chart: ${Object.keys(parkBarChart).length} species`);
      }
    }
    await sleep(300);

    // ── 4. eBird: union of nearby hotspot spplists + state supplement ──
    const ebirdBirds = await getEbirdHistorical(loc.lat, loc.lng, stateCode, parkBarChart);
    ebirdBirds.forEach(a => pool.push({ ...a, _priority: 1 }));
    await sleep(300);

    // ── 5. iNat place_id lookup (national parks only) ──
    // Querying by iNat place_id uses the exact park boundary instead of a
    // lat/lng radius circle, yielding much more accurate species lists.
    let inatPlaceId = null;
    if (isNationalPark) {
      inatPlaceId = await getInatPlaceId(loc);
      if (inatPlaceId) console.log(`  [${loc.id}] iNat place_id: ${inatPlaceId}`);
      else await sleep(150); // only delay when dynamic API call was made
    }

    // ── 6. iNat — key taxon groups (2 at a time) ──
    // National parks use 50km/365d for comprehensive coverage of large areas.
    // Sleep 1500 ms between pairs to stay comfortably under iNat's 60 req/min
    // rate limit even when BATCH=3 parks run in parallel.
    const useWide = isNationalPark || !!loc.wideNet;
    const taxaGroups = [
      ['mammal', 'bird'],
      ['reptile', 'amphibian'],
      ['insect', 'marine'],
      ['bat', 'snake'],
      ['lizard', 'frog'],
    ];
    for (const pair of taxaGroups) {
      const results = await Promise.all(
        pair.map(t => getInatSpecies(loc.lat, loc.lng, t, useWide, inatPlaceId, noQualityFilter))
      );
      results.flat().forEach(a => pool.push({ ...a, _priority: 2 }));
      await sleep(1500);
    }

    // ── 7. iNat histogram enrichment — ALL animal types including birds ──────────
    // Fetch monthly observation histograms keyed by scientific name.
    // Uses taxon_name= (not taxon_id=) which is the only param the histogram endpoint
    // accepts reliably. The eBird bar chart API returns HTTP 404 — iNat histogram is
    // our only source of real seasonal data for all species including birds.
    //
    // Candidates: separate quotas for birds (50) and non-birds (50) = 100 max.
    // Birds are sorted by _count (iNat obs) when available, falling back to
    // frequency * 200 for eBird-only birds (hotspot birds score ~80, state-only ~30).
    // Separate quotas prevent non-bird iNat species from crowding out all birds.
    // After enrichment, ALL pool entries with the same sciName are updated so that
    // dedup() later sees consistent seasons/rarity across eBird + iNat entries.
    // Rate: 200 ms between calls; global cache prevents duplicate calls per build run.
    if (inatPlaceId) {
      const seenSci = new Set();
      // Helper: collect top-N unique candidates of a given set of animalTypes
      function pickCandidates(types, limit) {
        const typeSet = new Set(types);
        return pool
          .filter(a => {
            if (!a.scientificName || !typeSet.has(a.animalType)) return false;
            const sci = a.scientificName.toLowerCase().trim();
            if (seenSci.has(sci)) return false;
            seenSci.add(sci);
            return true;
          })
          // Sort by iNat count when available; fall back to eBird frequency proxy
          .sort((a, b) => {
            const sa = a._count ?? (a.frequency ?? 0) * 200;
            const sb = b._count ?? (b.frequency ?? 0) * 200;
            return sb - sa;
          })
          .slice(0, limit);
      }
      // 50 birds + 50 non-birds (mammals, reptiles, amphibians, insects)
      const candidates = [
        ...pickCandidates(['bird'], 50),
        ...pickCandidates(['mammal', 'reptile', 'amphibian', 'insect'], 50),
      ];

      if (candidates.length > 0) {
        console.log(`  [${loc.id}] iNat histograms: ${candidates.length} species…`);
        for (const a of candidates) {
          const cacheKey = `${a.scientificName}:${inatPlaceId}`;
          let hist;
          if (_histogramCache.has(cacheKey)) {
            hist = _histogramCache.get(cacheKey);
          } else {
            hist = await getInatHistogram(a.scientificName, inatPlaceId);
            _histogramCache.set(cacheKey, hist);
            await sleep(300);
          }
          const derivedSeasons = getSeasonsFromMonthlyHistogram(hist);
          const derivedRarity  = rarityFromInatHistogram(hist, a.name ?? '');
          // Update ALL pool entries with this sciName (eBird + iNat duplicates)
          const sciLower = a.scientificName.toLowerCase().trim();
          for (const p of pool) {
            if (p.scientificName?.toLowerCase().trim() !== sciLower) continue;
            if (derivedSeasons) p.seasons = derivedSeasons;
            // Birds keep eBird checklist-frequency rarity — iNat obs counts at popular
            // parks inflate wildly (thousands of eagle photos) and don't reflect the
            // probability a casual visitor will encounter the species.
            // Only override rarity for non-birds where eBird data isn't available.
            if (derivedRarity && p.animalType !== 'bird') p.rarity = derivedRarity;
          }
        }
      }
    }

  } catch (err) {
    console.warn(`  [${loc.id}] error:`, err.message);
  }

  // Deduplicate and sort by rarity + source priority — no species cap
  const deduped = dedup(pool);
  applyMammalRarityFloor(deduped);              // fix iNat under-reporting for mammals
  deduped.sort((a, b) => {
    const rDiff = (RARITY_RANK[a.rarity] ?? 2) - (RARITY_RANK[b.rarity] ?? 2);
    if (rDiff !== 0) return rDiff;
    return (a._priority ?? 99) - (b._priority ?? 99);
  });

  const final = deduped
    .filter(a => isValidAnimalEntry(a))   // ← permanent validation guard
    .map(a => slim(a, a.source ?? 'static'));
  console.log(`  [${loc.id}] ✓ ${final.length} species`);
  return final;
}

// ── Thin-park retry: wider radius + 365-day lookback ─────────────────────────
// Called for parks that ended up with < 5 species after the main pass.
async function fetchParkWide(loc) {
  console.log(`  [${loc.id}] wide retry (50 km, 365d)…`);
  const pool = [];
  const stateCode = loc.stateCodes?.[0] ?? null;

  try {
    const nearestHotspot = await getEbirdHotspot(loc.lat, loc.lng);
    let parkBarChart = null;
    if (stateCode || nearestHotspot) {
      parkBarChart = await fetchParkBarChart(nearestHotspot, stateCode);
    }
    await sleep(400);

    const ebirdBirds = await getEbirdHistorical(loc.lat, loc.lng, stateCode, parkBarChart);
    ebirdBirds.forEach(a => pool.push({ ...a, _priority: 1 }));
    await sleep(400);

    let inatPlaceId = null;
    if (loc.npsCode) {
      inatPlaceId = await getInatPlaceId(loc);
      if (inatPlaceId) console.log(`  [${loc.id}] iNat place_id: ${inatPlaceId}`);
      else await sleep(150);
    }

    const taxaGroups = [
      ['mammal', 'bird'], ['reptile', 'amphibian'],
      ['insect', 'marine'], ['bat', 'snake'], ['lizard', 'frog'],
    ];
    for (const pair of taxaGroups) {
      const results = await Promise.all(
        pair.map(t => getInatSpecies(loc.lat, loc.lng, t, true, inatPlaceId)) // wideNet=true: 50km, 365d
      );
      results.flat().forEach(a => pool.push({ ...a, _priority: 3 }));
      await sleep(1500);
    }
  } catch (err) {
    console.warn(`  [${loc.id}] wide retry error:`, err.message);
  }

  const deduped = dedup(pool);
  applyMammalRarityFloor(deduped);              // fix iNat under-reporting for mammals
  deduped.sort((a, b) => {
    const rDiff = (RARITY_RANK[a.rarity] ?? 2) - (RARITY_RANK[b.rarity] ?? 2);
    if (rDiff !== 0) return rDiff;
    return (a._priority ?? 99) - (b._priority ?? 99);
  });
  const final = deduped
    .filter(a => isValidAnimalEntry(a))   // ← permanent validation guard
    .map(a => slim(a, a.source ?? 'static'));
  console.log(`  [${loc.id}] ✓ ${final.length} species after wide retry`);
  return final;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const builtAt = new Date().toISOString();

  // ── Optional targeted rebuild ────────────────────────────────────────────────
  // Usage: PARKS=yell,grca,zion node scripts/buildWildlifeCache.js
  // Only the listed parks are re-fetched; all others are preserved from the
  // existing wildlifeCache.js.  If PARKS is unset, full rebuild runs as normal.
  const PARK_FILTER = process.env.PARKS
    ? new Set(process.env.PARKS.split(',').map(s => s.trim()).filter(Boolean))
    : null;
  const locationsToProcess = PARK_FILTER
    ? wildlifeLocations.filter(l => PARK_FILTER.has(l.id))
    : wildlifeLocations;

  // Parks listed in NO_QUALITY_FILTER skip quality_grade=research on iNat calls.
  // Use for remote/low-observer parks (Alaska, remote Cascades) where research-grade
  // observations are extremely sparse and all-grades data is needed.
  const NO_QUALITY_SET = process.env.NO_QUALITY_FILTER
    ? new Set(process.env.NO_QUALITY_FILTER.split(',').map(s => s.trim()).filter(Boolean))
    : new Set();

  console.log(`\n🌿 Wildlife Cache Builder`);
  if (PARK_FILTER) {
    console.log(`   Mode:      targeted (${locationsToProcess.length} parks)`);
    console.log(`   Parks:     ${[...PARK_FILTER].join(', ')}`);
  } else {
    console.log(`   Parks: ${wildlifeLocations.length}`);
  }
  console.log(`   eBird key: ${EBIRD_KEY ? '✓' : '✗ missing'}`);
  console.log(`   NPS key:   ${NPS_KEY   ? '✓' : '✗ missing'}`);
  console.log(`   Started:   ${builtAt}\n`);

  // Seed cache from existing file when doing a targeted rebuild so untouched
  // parks are preserved verbatim.
  let cache = {};
  if (PARK_FILTER) {
    try {
      const existing = await import('../src/data/wildlifeCache.js');
      const existingCache = existing.WILDLIFE_CACHE ?? {};
      Object.assign(cache, existingCache);
      console.log(`   Loaded existing cache: ${Object.keys(cache).length} parks\n`);
    } catch {
      console.log('   No existing cache found — will build targeted parks from scratch\n');
    }
  }

  const BATCH = 1; // one park at a time — eliminates iNat 429 rate-limiting on histogram calls
  const BATCH_DELAY = 3000; // ms between batches (increased from 1500 for rate-limit headroom)

  for (let i = 0; i < locationsToProcess.length; i += BATCH) {
    const batch = locationsToProcess.slice(i, i + BATCH);
    console.log(`Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(locationsToProcess.length / BATCH)}: ${batch.map(l => l.id).join(', ')}`);

    const results = await Promise.all(
      batch.map(loc => fetchPark(loc, { noQualityFilter: NO_QUALITY_SET.has(loc.id) }))
    );
    batch.forEach((loc, idx) => {
      cache[loc.id] = { animals: results[idx], builtAt };
    });

    if (i + BATCH < locationsToProcess.length) await sleep(BATCH_DELAY);
  }

  // ── Thin-park retry pass ───────────────────────────────────────────────────
  // Only retry parks that were processed this run (skip untouched cached parks).
  const thinParks = locationsToProcess.filter(loc => (cache[loc.id]?.animals?.length ?? 0) < 5);
  if (thinParks.length > 0) {
    console.log(`\n🔄 Thin-park retry: ${thinParks.length} parks with <5 species`);
    for (let i = 0; i < thinParks.length; i += BATCH) {
      const batch = thinParks.slice(i, i + BATCH);
      console.log(`  Retry batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(thinParks.length / BATCH)}: ${batch.map(l => l.id).join(', ')}`);
      const results = await Promise.all(batch.map(loc => fetchParkWide(loc)));
      batch.forEach((loc, idx) => {
        if (results[idx].length > (cache[loc.id]?.animals?.length ?? 0)) {
          cache[loc.id] = { animals: results[idx], builtAt: cache[loc.id]?.builtAt ?? new Date().toISOString() };
        }
      });
      if (i + BATCH < thinParks.length) await sleep(BATCH_DELAY);
    }
  }

  // ── Apply rarity overrides to cached animals ──────────────────────────────
  for (const [locId, overrides] of Object.entries(RARITY_OVERRIDES)) {
    if (!cache[locId]) continue;
    cache[locId].animals = cache[locId].animals.map(a => {
      const override = overrides[a.name];
      return override ? { ...a, rarity: override } : a;
    });
  }

  // ── Write output file ─────────────────────────────────────────────────────
  const totalSpecies = Object.values(cache).reduce((s, v) => s + v.animals.length, 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${builtAt}`,
    `// Parks: ${wildlifeLocations.length} | Species bundled: ${totalSpecies}`,
    `// To regenerate: node scripts/buildWildlifeCache.js`,
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
  console.log(`   Parks: ${wildlifeLocations.length} | Species: ${totalSpecies}`);
  console.log(`   Built: ${builtAt}\n`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
