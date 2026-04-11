#!/usr/bin/env node
// scripts/rarityAudit.mjs
// Comprehensive rarity accuracy audit for all 63 national parks.
// Run: node scripts/rarityAudit.mjs
//
// Outputs a full report to stdout and writes rarityAudit_results.json alongside.

import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = resolve(__dirname, '..');

const EBIRD_KEY = 'ssijljl3h4jd';

// ── Load source data ──────────────────────────────────────────────────────────
console.log('Loading wildlife data...');
const { wildlifeLocations } = await import(pathToFileURL(resolve(BASE, 'src/wildlifeData.js')));
const { WILDLIFE_CACHE }    = await import(pathToFileURL(resolve(BASE, 'src/data/wildlifeCache.js')));
console.log(`Loaded ${wildlifeLocations.length} locations, ${Object.keys(WILDLIFE_CACHE).length} cached parks.\n`);

// ── Rarity helpers ────────────────────────────────────────────────────────────
const TIERS = {
  guaranteed:  { min: 90,  max: 100  },
  very_likely: { min: 60,  max: 90   },
  likely:      { min: 30,  max: 60   },
  unlikely:    { min: 10,  max: 30   },
  rare:        { min: 2,   max: 10   },
  exceptional: { min: 0,   max: 2    },
};
const TIER_LABELS = {
  guaranteed:  'Guaranteed (90%+)',
  very_likely: 'Very Likely (60-90%)',
  likely:      'Likely (30-60%)',
  unlikely:    'Unlikely (10-30%)',
  rare:        'Rare (2-10%)',
  exceptional: 'Exceptional (<2%)',
};
const TIER_ORDER = ['guaranteed','very_likely','likely','unlikely','rare','exceptional'];

function tierFromPct(pct) {
  if (pct >= 90) return 'guaranteed';
  if (pct >= 60) return 'very_likely';
  if (pct >= 30) return 'likely';
  if (pct >= 10) return 'unlikely';
  if (pct >= 2)  return 'rare';
  return 'exceptional';
}

function tierIndex(t) { return TIER_ORDER.indexOf(t); }

function tiersApart(a, b) {
  return Math.abs(tierIndex(a) - tierIndex(b));
}

// ── eBird API helpers ─────────────────────────────────────────────────────────
const _hotspotCache = {};
async function getHotspot(lat, lng) {
  const key = `${lat},${lng}`;
  if (_hotspotCache[key] !== undefined) return _hotspotCache[key];
  try {
    const url = `https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=25&fmt=json`;
    const res = await fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
    if (!res.ok) { _hotspotCache[key] = null; return null; }
    const data = await res.json();
    const locId = data?.[0]?.locId ?? null;
    _hotspotCache[key] = locId;
    return locId;
  } catch { _hotspotCache[key] = null; return null; }
}

async function getBarChart(hotspotCode) {
  if (!hotspotCode) return null;
  try {
    const url = `https://api.ebird.org/v2/product/barChart?r=${hotspotCode}&bYear=2020&eYear=2024&bMonth=1&eMonth=12`;
    const res = await fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
    if (!res.ok) return null;
    const text = await res.text();
    const chart = {};
    for (const line of text.split('\n')) {
      const cols = line.split('\t');
      if (cols.length < 10) continue;
      const raw = cols[0].trim();
      if (!raw || raw.toLowerCase() === 'species') continue;
      const name = raw.replace(/\s*\([^)]+\)\s*$/, '').trim();
      if (!name) continue;
      const freqs = [];
      for (let i = 1; i <= 48; i++) {
        const v = parseFloat(cols[i]);
        freqs.push(isNaN(v) ? 0 : v);
      }
      if (freqs.some(v => v > 0)) chart[name] = freqs;
    }
    return Object.keys(chart).length > 5 ? chart : null;
  } catch { return null; }
}

// Peak seasonal average frequency from 48-period bar chart
function peakFreq(periods) {
  if (!periods || periods.length < 48) return 0;
  // Divide into 4 seasons of 12 periods each; return the max season average
  const seasons = [
    periods.slice(0,  12),   // winter
    periods.slice(12, 24),   // spring
    periods.slice(24, 36),   // summer
    periods.slice(36, 48),   // fall
  ];
  const avgs = seasons.map(s => s.reduce((a, b) => a + b, 0) / s.length);
  return Math.max(...avgs);
}

// Annual average (all 48 periods)
function annualAvg(periods) {
  if (!periods || periods.length < 48) return 0;
  return periods.reduce((a, b) => a + b, 0) / periods.length;
}

// Charisma correction (mirrors buildWildlifeCache.js)
function ebirdCorrection(name) {
  if (!name) return 1;
  const l = name.toLowerCase();
  if (/\bbald eagle\b/.test(l)) return 1/5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(l)) return 1/3;
  return 1;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Expected real-world ranges for key flagship species ───────────────────────
// min/max are % chance on a typical visit. tier = what our system SHOULD show.
const EXPECTED = {
  yellowstone: {
    'American Bison':  { min: 90,  max: 100, note: '90%+ per wildlife guides' },
    'American Elk':    { min: 85,  max: 100, note: '85%+ per wildlife guides' },
    'Pronghorn':       { min: 65,  max: 85,  note: '65%+ per wildlife guides — user says this should be ~65%+' },
    'Coyote':          { min: 55,  max: 80,  note: '55%+ per wildlife guides' },
    'Grizzly Bear':    { min: 25,  max: 40,  note: '25-40% per wildlife guides' },
    'Gray Wolf':       { min: 5,   max: 15,  note: '5-15% per wildlife guides' },
    'Moose':           { min: 15,  max: 25,  note: '15-25% per wildlife guides' },
    'River Otter':     { min: 5,   max: 10,  note: '5-10% per wildlife guides' },
  },
  grandteton: {
    'American Bison':  { min: 70,  max: 90,  note: '70%+ per wildlife guides' },
    'American Elk':    { min: 75,  max: 95,  note: '75%+ per wildlife guides' },
    'Moose':           { min: 40,  max: 60,  note: '40-60% per wildlife guides' },
    'Pronghorn':       { min: 60,  max: 85,  note: '60%+ per wildlife guides' },
    'Grizzly Bear':    { min: 15,  max: 25,  note: '15-25% per wildlife guides' },
    'Gray Wolf':       { min: 5,   max: 10,  note: '5-10% per wildlife guides' },
  },
  glacier: {
    'Mountain Goat':   { min: 50,  max: 70,  note: '50-70% per wildlife guides (Going-to-the-Sun Road)' },
    'Grizzly Bear':    { min: 15,  max: 25,  note: '15-25% per wildlife guides' },
    'Black Bear':      { min: 20,  max: 30,  note: '20-30% per wildlife guides' },
    'Bighorn Sheep':   { min: 40,  max: 60,  note: '40-60% per wildlife guides' },
    'Moose':           { min: 20,  max: 30,  note: '20-30% per wildlife guides' },
  },
  everglades: {
    'American Alligator':   { min: 95, max: 100, note: '95%+ per wildlife guides' },
    'Great Blue Heron':     { min: 90, max: 100, note: '90%+ per wildlife guides' },
    'Anhinga':              { min: 85, max: 100, note: '85%+ per wildlife guides' },
    'West Indian Manatee':  { min: 25, max: 40,  note: '25-40% per wildlife guides' },
    'American Crocodile':   { min: 5,  max: 15,  note: '5-15% per wildlife guides' },
    'Florida Panther':      { min: 0,  max: 1,   note: 'under 1% per wildlife guides' },
  },
  greatsmokymountains: {
    'White-tailed Deer':    { min: 90, max: 100, note: '90%+ per wildlife guides' },
    'Black Bear':           { min: 35, max: 50,  note: '35-50% per wildlife guides' },
    'Wild Turkey':          { min: 45, max: 60,  note: '45-60% per wildlife guides' },
    'Eastern Box Turtle':   { min: 20, max: 35,  note: '20-35% per wildlife guides' },
  },
  acadia: {
    'White-tailed Deer':    { min: 75, max: 95,  note: '75%+ per wildlife guides' },
    'Harbor Seal':          { min: 45, max: 60,  note: '45-60% per wildlife guides' },
    'Common Loon':          { min: 55, max: 70,  note: '55-70% per wildlife guides' },
    'Bald Eagle':           { min: 10, max: 20,  note: '10-20% per wildlife guides' },
    'Black Bear':           { min: 15, max: 25,  note: '15-25% per wildlife guides' },
  },
  badlands: {
    'American Bison':       { min: 85, max: 100, note: '85%+ per wildlife guides' },
    'Black-tailed Prairie Dog': { min: 90, max: 100, note: '90%+ per wildlife guides' },
    'Pronghorn':            { min: 80, max: 100, note: '80%+ per wildlife guides' },
    'Bighorn Sheep':        { min: 50, max: 65,  note: '50-65% per wildlife guides' },
    'Coyote':               { min: 60, max: 80,  note: '60%+ per wildlife guides' },
  },
  grandcanyon: {
    'Mule Deer':            { min: 60, max: 75,  note: '60-75% per wildlife guides' },
    'California Condor':    { min: 15, max: 25,  note: '15-25% per wildlife guides' },
    'Coyote':               { min: 40, max: 55,  note: '40-55% per wildlife guides' },
    'Elk':                  { min: 30, max: 45,  note: '30-45% per wildlife guides' },
    "Abert's Squirrel":     { min: 55, max: 70,  note: '55-70% per wildlife guides' },
  },
  zion: {
    'Mule Deer':            { min: 65, max: 80,  note: '65-80% per wildlife guides' },
    'California Condor':    { min: 10, max: 20,  note: '10-20% per wildlife guides' },
    'Desert Cottontail':    { min: 50, max: 65,  note: '50-65% per wildlife guides' },
    'Coyote':               { min: 35, max: 50,  note: '35-50% per wildlife guides' },
  },
  denali: {
    'Caribou':              { min: 70, max: 85,  note: '70-85% per wildlife guides' },
    'Brown Bear':           { min: 45, max: 60,  note: '45-60% per wildlife guides' },
    'Moose':                { min: 50, max: 65,  note: '50-65% per wildlife guides' },
    'Dall Sheep':           { min: 55, max: 70,  note: '55-70% per wildlife guides' },
    'Arctic Ground Squirrel': { min: 80, max: 100, note: '80%+ per wildlife guides' },
  },
  katmai: {
    'Brown Bear':           { min: 90, max: 100, note: '90%+ (Brooks Falls, in season)' },
    'Sockeye Salmon':       { min: 85, max: 100, note: '85%+ in season per wildlife guides' },
  },
  olympic: {
    'Roosevelt Elk':        { min: 60, max: 75,  note: '60-75% per wildlife guides' },
    'Black Bear':           { min: 20, max: 30,  note: '20-30% per wildlife guides' },
    'Harbor Seal':          { min: 50, max: 65,  note: '50-65% per wildlife guides' },
    'Sea Otter':            { min: 30, max: 45,  note: '30-45% per wildlife guides' },
  },
  rockymountain: {
    'Elk':                  { min: 75, max: 95,  note: '75%+ per wildlife guides' },
    'Mule Deer':            { min: 55, max: 70,  note: '55-70% per wildlife guides' },
    'Bighorn Sheep':        { min: 40, max: 55,  note: '40-55% per wildlife guides' },
    'Moose':                { min: 20, max: 30,  note: '20-30% per wildlife guides' },
    'Black Bear':           { min: 15, max: 25,  note: '15-25% per wildlife guides' },
  },
  shenandoah: {
    'White-tailed Deer':    { min: 85, max: 100, note: '85%+ per wildlife guides' },
    'Black Bear':           { min: 25, max: 40,  note: '25-40% per wildlife guides' },
    'Wild Turkey':          { min: 45, max: 60,  note: '45-60% per wildlife guides' },
  },
  arches: {
    'Mule Deer':            { min: 50, max: 65,  note: '50-65% per wildlife guides' },
    'Coyote':               { min: 30, max: 45,  note: '30-45% per wildlife guides' },
    'Desert Cottontail':    { min: 45, max: 60,  note: '45-60% per wildlife guides' },
  },
};

// ── Helper: find animal by name in cache ─────────────────────────────────────
function findAnimal(parkId, name) {
  const park = WILDLIFE_CACHE[parkId];
  if (!park?.animals) return null;
  // Exact match first
  let a = park.animals.find(a => a.name === name);
  if (a) return a;
  // Case-insensitive partial match
  const nl = name.toLowerCase();
  return park.animals.find(a => a.name?.toLowerCase().includes(nl) || nl.includes(a.name?.toLowerCase())) ?? null;
}

// Check if a rarity tier is within the expected % range
function rarityMatchesRange(tier, min, max) {
  const range = TIERS[tier];
  if (!range) return false;
  // The tier's midpoint should fall within [min, max], OR the ranges overlap significantly
  const tierMid = (range.min + range.max) / 2;
  const rangeMid = (min + max) / 2;
  // Pass if the tier's range overlaps with expected range
  return range.max >= min && range.min <= max;
}

// ── PART 1: Audit specific flagship species in key parks ─────────────────────
console.log('═'.repeat(70));
console.log('PART 1: FLAGSHIP SPECIES RARITY AUDIT');
console.log('═'.repeat(70));

const mammalResults = [];
let mammalPass = 0, mammalFail = 0, mammalMissing = 0;

for (const [parkId, targets] of Object.entries(EXPECTED)) {
  const loc = wildlifeLocations.find(l => l.id === parkId);
  const parkName = loc?.name ?? parkId;

  for (const [animalName, range] of Object.entries(targets)) {
    const animal = findAnimal(parkId, animalName);
    if (!animal) {
      mammalMissing++;
      mammalResults.push({
        park: parkName, animal: animalName,
        status: 'MISSING', currentTier: '—', currentPct: '—',
        expectedPct: `${range.min}-${range.max}%`,
        source: '—', fix: `Add ${animalName} to ${parkName} data`
      });
      continue;
    }

    const tier = animal.rarity;
    const passes = rarityMatchesRange(tier, range.min, range.max);
    const expectedTier = tierFromPct((range.min + range.max) / 2);
    const tierRange = TIERS[tier];
    const currentPct = tierRange ? `${tierRange.min}-${tierRange.max}%` : '?';
    const source = animal.source ?? 'unknown';

    if (passes) {
      mammalPass++;
      mammalResults.push({
        park: parkName, animal: animalName,
        status: 'PASS', currentTier: TIER_LABELS[tier], currentPct,
        expectedPct: `${range.min}-${range.max}%`,
        source, fix: null, note: range.note
      });
    } else {
      mammalFail++;
      const direction = tierIndex(tier) < tierIndex(expectedTier) ? 'OVER-RATED' : 'UNDER-RATED';
      mammalResults.push({
        park: parkName, animal: animalName,
        status: `FAIL (${direction})`, currentTier: TIER_LABELS[tier], currentPct,
        expectedPct: `${range.min}-${range.max}%`,
        expectedTier: TIER_LABELS[expectedTier],
        source, fix: `Change to ${TIER_LABELS[expectedTier]} — expected ${range.min}-${range.max}%`,
        note: range.note
      });
    }
  }
}

// Print Part 1 table
const parks1 = [...new Set(mammalResults.map(r => r.park))];
for (const park of parks1) {
  const rows = mammalResults.filter(r => r.park === park);
  console.log(`\n── ${park} ─────────────────────────────`);
  console.log(`${'Animal'.padEnd(30)} ${'Status'.padEnd(20)} ${'Current'.padEnd(22)} ${'Expected'}`);
  console.log('-'.repeat(95));
  for (const r of rows) {
    const status = r.status.padEnd(20);
    const current = `${r.currentTier} (${r.currentPct})`.padEnd(22);
    console.log(`${r.animal.padEnd(30)} ${status} ${current} ${r.expectedPct}`);
    if (r.fix) console.log(`  → FIX: ${r.fix}`);
  }
}

console.log(`\n── FLAGSHIP SPECIES SUMMARY ─────────────────`);
console.log(`PASS: ${mammalPass} | FAIL: ${mammalFail} | MISSING: ${mammalMissing}`);
console.log(`Pass rate: ${Math.round(100*mammalPass/(mammalPass+mammalFail+mammalMissing))}%`);

// ── PART 2: eBird Bar Chart cross-reference for key parks ────────────────────
console.log('\n' + '═'.repeat(70));
console.log('PART 2: eBIRD BAR CHART CROSS-REFERENCE (key parks, select birds)');
console.log('═'.repeat(70));

// Key birds to check in each park (common names must match eBird exactly)
const KEY_BIRDS = {
  everglades:         ['Great Blue Heron', 'Anhinga', 'Roseate Spoonbill', 'Osprey', 'Wood Stork'],
  acadia:             ['Common Loon', 'Bald Eagle', 'Osprey', 'Common Eider', 'Black-capped Chickadee'],
  greatsmokymountains:['Wild Turkey', 'Pileated Woodpecker', 'Barred Owl', 'Eastern Towhee'],
  yellowstone:        ['Bald Eagle', 'Sandhill Crane', 'Common Raven', 'Osprey'],
  grandcanyon:        ['California Condor', 'Steller\'s Jay', 'Common Raven', 'Peregrine Falcon'],
  zion:               ['California Condor', 'Peregrine Falcon', 'White-throated Swift', 'Canyon Wren'],
  badlands:           ['Burrowing Owl', 'Western Meadowlark', 'Northern Harrier'],
  olympic:            ['Bald Eagle', 'Steller\'s Jay', 'Common Raven', 'Pigeon Guillemot'],
  rockymountain:      ['American Dipper', 'Steller\'s Jay', 'Clark\'s Nutcracker', 'White-tailed Ptarmigan'],
  shenandoah:         ['Wild Turkey', 'Pileated Woodpecker', 'Ovenbird', 'Wood Thrush'],
  glacier:            ['Common Raven', 'Steller\'s Jay', 'Clark\'s Nutcracker', 'Osprey'],
  denali:             ['Willow Ptarmigan', 'Common Raven', 'Arctic Tern'],
};

const birdResults = [];

for (const [parkId, targetBirds] of Object.entries(KEY_BIRDS)) {
  const loc = wildlifeLocations.find(l => l.id === parkId);
  if (!loc) continue;
  const parkName = loc.name;
  console.log(`\nFetching eBird bar chart for ${parkName}...`);

  const hotspot = await getHotspot(loc.lat, loc.lng);
  await sleep(400);
  const chart = hotspot ? await getBarChart(hotspot) : null;
  await sleep(400);

  if (!chart) {
    console.log(`  ⚠ No bar chart data (hotspot: ${hotspot ?? 'none found'})`);
    for (const bird of targetBirds) {
      birdResults.push({ park: parkName, bird, status: 'NO_CHART', hotspot });
    }
    continue;
  }

  console.log(`  Hotspot: ${hotspot} | ${Object.keys(chart).length} species in bar chart`);

  for (const birdName of targetBirds) {
    const periods = chart[birdName];
    const cachedAnimal = findAnimal(parkId, birdName);

    if (!periods) {
      birdResults.push({
        park: parkName, bird: birdName, status: 'NOT_IN_CHART',
        hotspot, cachedRarity: cachedAnimal?.rarity ?? 'not in cache',
      });
      continue;
    }

    const rawPeak   = peakFreq(periods) * 100;
    const rawAnnual = annualAvg(periods) * 100;
    const corrPeak  = rawPeak * ebirdCorrection(birdName);
    const expectedTier = tierFromPct(corrPeak);
    const cachedTier   = cachedAnimal?.rarity ?? null;
    const apart = cachedTier ? tiersApart(cachedTier, expectedTier) : null;
    const passes = apart !== null && apart <= 1;

    birdResults.push({
      park: parkName, bird: birdName,
      status: !cachedTier ? 'NOT_IN_CACHE' : (passes ? 'PASS' : 'FAIL'),
      hotspot,
      rawPeak:      `${rawPeak.toFixed(1)}%`,
      rawAnnual:    `${rawAnnual.toFixed(1)}%`,
      correctedPeak:`${corrPeak.toFixed(1)}%`,
      expectedTier: TIER_LABELS[expectedTier],
      cachedRarity: cachedTier ? TIER_LABELS[cachedTier] : 'not in cache',
      apart,
    });
  }
}

// Print Part 2 table
const parks2 = [...new Set(birdResults.map(r => r.park))];
for (const park of parks2) {
  const rows = birdResults.filter(r => r.park === park);
  console.log(`\n── ${park} ─────────────────────────────`);
  console.log(`${'Bird'.padEnd(30)} ${'Status'.padEnd(12)} ${'Cached'.padEnd(22)} ${'eBird Peak'.padEnd(12)} ${'Expected Tier'}`);
  console.log('-'.repeat(100));
  for (const r of rows) {
    if (r.status === 'NO_CHART') { console.log(`  (no bar chart data available)`); break; }
    const status = r.status.padEnd(12);
    const cached = (r.cachedRarity ?? '—').padEnd(22);
    const peak   = (r.rawPeak ?? '—').padEnd(12);
    const exp    = r.expectedTier ?? '—';
    console.log(`${r.bird.padEnd(30)} ${status} ${cached} ${peak} ${exp}`);
    if (r.status === 'FAIL') console.log(`  → ${tiersApart(findAnimal(r.park.split(' ')[0].toLowerCase(), r.bird)?.rarity, TIER_ORDER.indexOf(r.expectedTier))} tier(s) off`);
  }
}

const birdPass    = birdResults.filter(r => r.status === 'PASS').length;
const birdFail    = birdResults.filter(r => r.status === 'FAIL').length;
const birdNoChart = birdResults.filter(r => ['NO_CHART','NOT_IN_CHART','NOT_IN_CACHE'].includes(r.status)).length;
console.log(`\n── BIRD ACCURACY SUMMARY ────────────────────────`);
console.log(`PASS: ${birdPass} | FAIL: ${birdFail} | NO DATA: ${birdNoChart}`);
if (birdPass + birdFail > 0) console.log(`Pass rate (where data exists): ${Math.round(100*birdPass/(birdPass+birdFail))}%`);

// ── PART 3: Systematic issues — all 63 parks ──────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('PART 3: SYSTEMATIC ISSUES — ALL 63 PARKS');
console.log('═'.repeat(70));

const systemicIssues = [];

for (const [parkId, parkData] of Object.entries(WILDLIFE_CACHE)) {
  const animals = parkData.animals ?? [];
  if (animals.length === 0) continue;

  const loc = wildlifeLocations.find(l => l.id === parkId);
  const parkName = loc?.name ?? parkId;

  const guaranteed  = animals.filter(a => a.rarity === 'guaranteed');
  const totalCount  = animals.length;
  const guarPct     = (guaranteed.length / totalCount) * 100;

  // Flag >15% guaranteed
  if (guarPct > 15 && guaranteed.length > 3) {
    systemicIssues.push({
      type: 'OVER_INFLATED_GUARANTEED',
      park: parkName,
      detail: `${guaranteed.length}/${totalCount} animals (${guarPct.toFixed(0)}%) are Guaranteed — exceeds 15% threshold`,
      severity: guarPct > 25 ? 'HIGH' : 'MEDIUM',
    });
  }

  // Flag <2 guaranteed (for parks with enough data)
  if (guaranteed.length < 2 && totalCount > 20) {
    systemicIssues.push({
      type: 'UNDER_ESTIMATED_GUARANTEED',
      park: parkName,
      detail: `Only ${guaranteed.length} Guaranteed animals out of ${totalCount} total — seems too few`,
      severity: 'MEDIUM',
    });
  }

  // Check top 5 mammals
  const mammals = animals.filter(a => a.animalType === 'mammal');
  const topMammals = [...mammals].sort((a, b) => tierIndex(a.rarity) - tierIndex(b.rarity)).slice(0, 5);

  // Flag obviously common mammals shown as Rare/Exceptional
  const commonMammalPatterns = [
    { pattern: /white.tailed deer|whitetail deer/i, minTier: 'unlikely' },
    { pattern: /\bblack bear\b/i, minTier: 'rare' },
    { pattern: /\bwhite-tailed deer\b/i, minTier: 'unlikely' },
    { pattern: /\bcoyote\b/i, minTier: 'rare' },
    { pattern: /\bmoose\b/i, minTier: 'exceptional' },
    { pattern: /\belk\b/i, minTier: 'exceptional' },
    { pattern: /\bbison\b/i, minTier: 'rare' },
    { pattern: /\bsquirrel\b/i, minTier: 'rare' },
    { pattern: /\brabbit|cottontail\b/i, minTier: 'rare' },
    { pattern: /\botter\b/i, minTier: 'exceptional' },
    { pattern: /\bprairie dog\b/i, minTier: 'unlikely' },
  ];

  for (const a of animals) {
    for (const { pattern, minTier } of commonMammalPatterns) {
      if (pattern.test(a.name) && tierIndex(a.rarity) > tierIndex(minTier)) {
        // rarity is WORSE than minTier threshold
        const expected = TIER_ORDER[Math.min(tierIndex(a.rarity), tierIndex(minTier))];
        systemicIssues.push({
          type: 'COMMON_ANIMAL_RARE',
          park: parkName,
          detail: `"${a.name}" is ${TIER_LABELS[a.rarity]} — seems too low for this species`,
          severity: tiersApart(a.rarity, minTier) >= 2 ? 'HIGH' : 'LOW',
          animal: a.name, currentRarity: a.rarity,
        });
      }
    }
  }

  // Flag obviously rare animals shown as common/very_likely
  const rareMammalPatterns = [
    { pattern: /\bwolverine\b/i, maxTier: 'unlikely' },
    { pattern: /\bpanther|mountain lion|cougar|bobcat\b/i, maxTier: 'rare' },
    { pattern: /\bwolf\b/i, maxTier: 'unlikely' },
    { pattern: /\bgrizzly|brown bear\b/i, maxTier: 'likely' },
    { pattern: /\bjaguar\b/i, maxTier: 'exceptional' },
    { pattern: /\bcondor\b/i, maxTier: 'unlikely' },
    { pattern: /\bmanatee\b/i, maxTier: 'likely' },
    { pattern: /\bsea otter\b/i, maxTier: 'likely' },
  ];

  for (const a of animals) {
    for (const { pattern, maxTier } of rareMammalPatterns) {
      if (pattern.test(a.name) && tierIndex(a.rarity) < tierIndex(maxTier)) {
        // rarity is BETTER than maxTier threshold
        systemicIssues.push({
          type: 'RARE_ANIMAL_COMMON',
          park: parkName,
          detail: `"${a.name}" is ${TIER_LABELS[a.rarity]} — seems too high for this species`,
          severity: tiersApart(a.rarity, maxTier) >= 2 ? 'HIGH' : 'LOW',
          animal: a.name, currentRarity: a.rarity,
        });
      }
    }
  }
}

// Print systemic issues
const highSeverity = systemicIssues.filter(i => i.severity === 'HIGH');
const medSeverity  = systemicIssues.filter(i => i.severity === 'MEDIUM');
const lowSeverity  = systemicIssues.filter(i => i.severity === 'LOW');

console.log(`\nTotal systemic issues found: ${systemicIssues.length}`);
console.log(`  HIGH severity: ${highSeverity.length}`);
console.log(`  MEDIUM severity: ${medSeverity.length}`);
console.log(`  LOW severity: ${lowSeverity.length}`);

if (highSeverity.length > 0) {
  console.log('\n── HIGH SEVERITY ISSUES ────────────────────────');
  for (const issue of highSeverity) {
    console.log(`  [${issue.type}] ${issue.park}: ${issue.detail}`);
  }
}

if (medSeverity.length > 0) {
  console.log('\n── MEDIUM SEVERITY ISSUES ───────────────────────');
  for (const issue of medSeverity.slice(0, 20)) { // cap at 20
    console.log(`  [${issue.type}] ${issue.park}: ${issue.detail}`);
  }
  if (medSeverity.length > 20) console.log(`  ... and ${medSeverity.length - 20} more medium issues`);
}

// Over-inflated guaranteed summary
const overInflated = systemicIssues.filter(i => i.type === 'OVER_INFLATED_GUARANTEED');
const underEstimated = systemicIssues.filter(i => i.type === 'UNDER_ESTIMATED_GUARANTEED');
console.log(`\n── GUARANTEED ANIMAL DISTRIBUTION ──────────────`);
console.log(`Parks with >15% guaranteed animals: ${overInflated.length}`);
if (overInflated.length > 0) {
  for (const i of overInflated) console.log(`  ${i.park}: ${i.detail}`);
}
console.log(`Parks with <2 guaranteed animals: ${underEstimated.length}`);
if (underEstimated.length > 0) {
  for (const i of underEstimated.slice(0, 10)) console.log(`  ${i.park}: ${i.detail}`);
}

// ── PART 4: Binary fallback count ────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('PART 4: BINARY FALLBACK DETECTION');
console.log('═'.repeat(70));

// Binary fallback birds have funFact = "Confirmed at this park's eBird hotspot."
// OR "Recorded in this region (eBird historical checklist)."
// Some may have been updated with better descriptions via improveDescriptions.js

const HOTSPOT_FALLBACK_TEXT  = "Confirmed at this park's eBird hotspot.";
const STATE_FALLBACK_TEXT    = "Recorded in this region (eBird historical checklist).";

let hotspotFallbackCount = 0;
let stateFallbackCount   = 0;
const highImpactFallbacks = [];

for (const [parkId, parkData] of Object.entries(WILDLIFE_CACHE)) {
  const loc = wildlifeLocations.find(l => l.id === parkId);
  const parkName = loc?.name ?? parkId;
  const animals = parkData.animals ?? [];

  for (const a of animals) {
    if (a.source !== 'ebird') continue;
    const ff = a.funFact ?? '';
    const isHotspotFallback = ff === HOTSPOT_FALLBACK_TEXT;
    const isStateFallback   = ff === STATE_FALLBACK_TEXT;

    if (isHotspotFallback) {
      hotspotFallbackCount++;
      // Flag common birds whose rarity seems wrong if based on 40% binary fallback
      if (['guaranteed','very_likely'].includes(a.rarity)) {
        highImpactFallbacks.push({ park: parkName, animal: a.name, rarity: TIER_LABELS[a.rarity], type: 'hotspot-fallback-likely' });
      }
    } else if (isStateFallback) {
      stateFallbackCount++;
    }
  }
}

// Also estimate: birds with description enriched but originally from binary fallback
// These are birds with source=ebird, rarity=likely or unlikely, and no description
// enrichment beyond standard enrichment. We can identify them partially via
// checking if their rarity is exactly what binary fallback produces.
// hotspot binary (0.40 → 'likely'), corrected for common raptors (0.13 → 'unlikely')
const totalBinaryFallback = hotspotFallbackCount + stateFallbackCount;
const totalEbirdBirds = Object.values(WILDLIFE_CACHE)
  .flatMap(p => p.animals ?? [])
  .filter(a => a.source === 'ebird').length;

console.log(`\nBinary fallback birds identified by original funFact text:`);
console.log(`  Hotspot fallback (40% base): ${hotspotFallbackCount}`);
console.log(`  State-list fallback (15% base): ${stateFallbackCount}`);
console.log(`  Total binary fallback identified: ${totalBinaryFallback}`);
console.log(`  Total eBird-sourced birds in cache: ${totalEbirdBirds}`);
console.log(`  Binary fallback as % of eBird birds: ${Math.round(100*totalBinaryFallback/Math.max(1,totalEbirdBirds))}%`);
console.log(`  Note: Many binary fallback birds have updated descriptions — actual count is higher`);

if (highImpactFallbacks.length > 0) {
  console.log(`\nHigh-impact fallbacks (binary fallback but Guaranteed/Very Likely rarity):`);
  for (const f of highImpactFallbacks.slice(0, 20)) {
    console.log(`  ${f.park}: ${f.animal} — ${f.rarity}`);
  }
  if (highImpactFallbacks.length > 20) console.log(`  ... and ${highImpactFallbacks.length - 20} more`);
}

// ── PART 5: Top 20 most inaccurate ratings ────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('PART 5: TOP MOST INACCURATE RATINGS (flagship species)');
console.log('═'.repeat(70));

const allFails = [
  ...mammalResults.filter(r => r.status.startsWith('FAIL')),
  ...mammalResults.filter(r => r.status === 'MISSING'),
];

// Sort by severity: MISSING > direction OVER (too optimistic) > direction UNDER
console.log(`\nAll failing/missing flagship species checks (${allFails.length} total):\n`);
for (const r of allFails) {
  console.log(`  ❌ [${r.park}] ${r.animal}`);
  console.log(`     Current: ${r.currentTier} (${r.currentPct}) | Expected: ${r.expectedPct}`);
  if (r.fix) console.log(`     Fix: ${r.fix}`);
  console.log();
}

// ── PART 6: Overall statistics ────────────────────────────────────────────────
console.log('═'.repeat(70));
console.log('PART 6: OVERALL STATISTICS & RECOMMENDED FIXES');
console.log('═'.repeat(70));

// Rarity distribution across all parks
const allAnimals = Object.values(WILDLIFE_CACHE).flatMap(p => p.animals ?? []);
const rarityDist = {};
for (const t of TIER_ORDER) rarityDist[t] = allAnimals.filter(a => a.rarity === t).length;

console.log('\nRarity distribution across all 63 parks:');
for (const [tier, count] of Object.entries(rarityDist)) {
  const pct = (count / allAnimals.length * 100).toFixed(1);
  console.log(`  ${TIER_LABELS[tier]?.padEnd(25) ?? tier.padEnd(25)} ${String(count).padStart(5)} (${pct}%)`);
}
console.log(`  TOTAL: ${allAnimals.length} animals`);

const totalChecked = mammalPass + mammalFail + mammalMissing;
const overallPassRate = Math.round(100 * mammalPass / Math.max(1, totalChecked));
console.log(`\nFlagship species pass rate: ${mammalPass}/${totalChecked} (${overallPassRate}%)`);

console.log('\n── SYSTEMATIC FIX RECOMMENDATIONS ────────────────');
console.log(`
1. BINARY FALLBACK BIRDS (${totalBinaryFallback}+ animals):
   These use fixed 40%/15% frequency — actual checklist rates vary widely.
   Fix: Run buildWildlifeCache.js again when eBird bar chart data is available
   for these hotspots, OR implement runtime bar-chart lookup during app load.

2. OVER/UNDER-RATED GUARANTEED ANIMALS:
   ${overInflated.length} parks have >15% guaranteed animals.
   ${underEstimated.length} parks have <2 guaranteed animals.
   Fix: Review guaranteed animals in over-inflated parks; apply stricter
   90%+ threshold enforcement.

3. CHARISMA CORRECTION IMPACT:
   Eagles, hawks, and condors get a 1/3 to 1/5 frequency correction.
   Verify these corrections aren't making rare animals too rare.
   California Condor especially — correct tier should be Unlikely (~15-25%).

4. TOP-PRIORITY INDIVIDUAL FIXES:`);

for (const r of allFails.filter(r => r.status.startsWith('FAIL'))) {
  console.log(`   • ${r.park} — ${r.animal}: ${r.fix}`);
}

// ── Save results JSON ─────────────────────────────────────────────────────────
const results = {
  generatedAt: new Date().toISOString(),
  summary: {
    flagshipPassRate: overallPassRate,
    flagshipPass: mammalPass, flagshipFail: mammalFail, flagshipMissing: mammalMissing,
    birdPassRate: birdPass + birdFail > 0 ? Math.round(100*birdPass/(birdPass+birdFail)) : null,
    systemicIssues: systemicIssues.length,
    highSeverityIssues: highSeverity.length,
    binaryFallbackDetected: totalBinaryFallback,
    totalEbirdBirds,
    rarityDistribution: rarityDist,
    totalAnimals: allAnimals.length,
  },
  flagshipAudit: mammalResults,
  birdAudit: birdResults,
  systemicIssues,
  highImpactFallbacks,
};

const outPath = resolve(BASE, 'scripts/rarityAudit_results.json');
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\n\nFull results saved to: scripts/rarityAudit_results.json`);
console.log('Audit complete.');
