// Apply PART 1 (species-specific overrides), PART 2 (insect guaranteed demotion),
// and PART 3 (other questionable guaranteed) rarity fixes to wildlifeCache.js
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from '../src/data/wildlifeCache.js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Park region classification ────────────────────────────────────────────────
const ALASKA_PARKS = new Set([
  'denali', 'kenaifjords', 'glacierbay', 'katmai', 'wrangell',
  'wrangellstelias', 'lakeclark', 'gatesofthearctic', 'kobukvalley',
]);

const HAWAII_PARKS     = new Set(['hawaiivolcanoes', 'haleakala']);
const TROPICAL_PARKS   = new Set(['americansamoa', 'virginislands']);

// Parks that clearly have minimal vegetation (for American Robin rule)
const DESERT_STARK = new Set(['deathvalley', 'whitesands']);

// Red-tailed Hawk open-terrain specials
const RTHA_OPEN_TERRAIN = new Set([
  'yellowstone', 'grandteton', 'badlands', 'theodoreroosevelt',
]);

// Eastern deciduous forest parks where Eastern Gray Squirrel is everywhere
const EGS_DECIDUOUS_GUARANTEED = new Set([
  'shenandoah', 'greatsmokymountains', 'mammothcave',
  'indianadunes', 'cuyahogavalley', 'newrivergorge', 'congaree',
]);

// Park lat/lng (extracted from wildlifeData.js — used for latitude rules)
const PARK_COORDS = {
  yellowstone:         { lat: 44.428, lng: -110.588 },
  everglades:          { lat: 25.286, lng: -80.899 },
  denali:              { lat: 63.115, lng: -151.193 },
  acadia:              { lat: 44.357, lng: -68.955 },
  shenandoah:          { lat: 38.494, lng: -78.470 },
  newrivergorge:       { lat: 37.868, lng: -81.081 },
  cuyahogavalley:      { lat: 41.281, lng: -81.568 },
  isleroyale:          { lat: 48.006, lng: -88.831 },
  greatsmokymountains: { lat: 35.612, lng: -83.490 },
  biscayne:            { lat: 25.482, lng: -80.427 },
  drytortugas:         { lat: 24.628, lng: -82.873 },
  congaree:            { lat: 33.798, lng: -80.778 },
  mammothcave:         { lat: 37.186, lng: -86.100 },
  voyageurs:           { lat: 48.484, lng: -92.839 },
  indianadunes:        { lat: 41.653, lng: -87.052 },
  badlands:            { lat: 43.855, lng: -102.340 },
  windcave:            { lat: 43.557, lng: -103.479 },
  theodoreroosevelt:   { lat: 46.979, lng: -103.539 },
  gatewayarch:         { lat: 38.625, lng: -90.185 },
  grandcanyon:         { lat: 36.107, lng: -112.113 },
  zion:                { lat: 37.298, lng: -113.026 },
  brycecanyon:         { lat: 37.593, lng: -112.187 },
  arches:              { lat: 38.733, lng: -109.593 },
  canyonlands:         { lat: 38.200, lng: -109.930 },
  capitolreef:         { lat: 38.088, lng: -111.143 },
  mesaverde:           { lat: 37.231, lng: -108.462 },
  petrifiedforest:     { lat: 35.065, lng: -109.787 },
  saguaro:             { lat: 32.297, lng: -110.992 },
  whitesands:          { lat: 32.787, lng: -106.326 },
  guadalupemountains:  { lat: 31.923, lng: -104.871 },
  bigbend:             { lat: 29.128, lng: -103.243 },
  grandteton:          { lat: 43.790, lng: -110.682 },
  rockymountain:       { lat: 40.343, lng: -105.684 },
  glacier:             { lat: 48.760, lng: -113.787 },
  greatsanddunes:      { lat: 37.793, lng: -105.594 },
  blackcanyon:         { lat: 38.575, lng: -107.742 },
  olympic:             { lat: 47.802, lng: -123.604 },
  northcascades:       { lat: 48.772, lng: -121.299 },
  mountrainier:        { lat: 46.852, lng: -121.760 },
  craterlake:          { lat: 42.945, lng: -122.109 },
  redwood:             { lat: 41.213, lng: -124.005 },
  lassenvolcanic:      { lat: 40.498, lng: -121.421 },
  yosemite:            { lat: 37.865, lng: -119.538 },
  kingscanyon:         { lat: 36.888, lng: -118.555 },
  sequoia:             { lat: 36.486, lng: -118.566 },
  joshuatree:          { lat: 33.873, lng: -115.901 },
  deathvalley:         { lat: 36.505, lng: -117.079 },
  channelislands:      { lat: 34.007, lng: -119.778 },
  pinnacles:           { lat: 36.491, lng: -121.183 },
  kenaifjords:         { lat: 59.920, lng: -150.158 },
  glacierbay:          { lat: 58.666, lng: -136.900 },
  katmai:              { lat: 58.500, lng: -154.976 },
  wrangellstelias:     { lat: 61.711, lng: -142.986 },
  lakeclark:           { lat: 60.413, lng: -153.489 },
  gatesofthearctic:    { lat: 67.778, lng: -153.309 },
  kobukvalley:         { lat: 67.356, lng: -159.123 },
  hawaiivolcanoes:     { lat: 19.419, lng: -155.289 },
  haleakala:           { lat: 20.720, lng: -156.155 },
  americansamoa:       { lat: -14.256, lng: -170.685 },
  virginislands:       { lat: 18.341, lng: -64.730 },
  hotsprings:          { lat: 34.522, lng: -93.042 },
  carlsbadcaverns:     { lat: 32.148, lng: -104.557 },
  greatbasin:          { lat: 38.983, lng: -114.300 },
};

function getRegion(parkId) {
  if (ALASKA_PARKS.has(parkId))   return 'alaska';
  if (HAWAII_PARKS.has(parkId))   return 'hawaii';
  if (TROPICAL_PARKS.has(parkId)) return 'tropical';
  const coords = PARK_COORDS[parkId];
  if (!coords) return 'unknown';
  if (coords.lng > -90) return 'eastern';
  return 'western';
}

function isLower48(parkId) {
  return !ALASKA_PARKS.has(parkId) && !HAWAII_PARKS.has(parkId) && !TROPICAL_PARKS.has(parkId);
}

// ── PART 2 & 3: INSECT GUARANTEED KEEPLIST ────────────────────────────────────
// Only these insects are allowed to stay "guaranteed" (invasives + seasonal fireflies)
const INSECT_KEEP_GUARANTEED = new Set([
  'shenandoah|Spotted Lanternfly',  // invasive, inescapable
]);

// ── Report ────────────────────────────────────────────────────────────────────
const report = {
  part1: { turkeyVulture: 0, redTailedHawk: 0, americanRobin: 0, robinRemoved: 0,
           raccoon: 0, easternGraySquirrel: 0 },
  part2: { insectsDemoted: 0, monarchFixed: 0 },
  part3: { yellowstoneGoldfinch: 0, yellowstoneSandhillCrane: 0, biscayneAlligator: 0 },
};

const RANK = { exceptional: 0, rare: 1, unlikely: 2, likely: 3, very_likely: 4, guaranteed: 5 };

function atLeast(current, target) {
  if (!current) return target;
  return RANK[current] >= RANK[target] ? current : target;
}

// ── Process cache ─────────────────────────────────────────────────────────────
for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
  if (!data.animals) continue;
  const region = getRegion(parkId);
  const coords = PARK_COORDS[parkId];
  const lat = coords?.lat;

  // American Robin removal from Hawaii (mutates array)
  if (HAWAII_PARKS.has(parkId)) {
    const before = data.animals.length;
    data.animals = data.animals.filter(a => a.name !== 'American Robin');
    report.part1.robinRemoved += before - data.animals.length;
  }

  for (const a of data.animals) {
    const name = a.name;

    // ── PART 1 — Turkey Vulture ─────────────────────────────────────────────
    if (name === 'Turkey Vulture') {
      if (region === 'alaska') {
        // Turkey Vultures are essentially absent from AK — leave alone, might be a vagrant
      } else if (isLower48(parkId) && lat != null) {
        const target = lat < 45 ? 'very_likely' : 'likely';
        if (a.rarity !== target) {
          a.rarity = target;
          a.raritySource = 'override_curated';
          report.part1.turkeyVulture++;
        }
      }
    }

    // ── PART 1 — Red-tailed Hawk ───────────────────────────────────────────
    if (name === 'Red-tailed Hawk') {
      if (isLower48(parkId)) {
        const target = RTHA_OPEN_TERRAIN.has(parkId) ? 'very_likely' : 'likely';
        const newRarity = atLeast(a.rarity, target);
        if (newRarity !== a.rarity) {
          a.rarity = newRarity;
          a.raritySource = 'override_curated';
          report.part1.redTailedHawk++;
        }
      }
    }

    // ── PART 1 — American Robin ────────────────────────────────────────────
    if (name === 'American Robin') {
      if (ALASKA_PARKS.has(parkId)) {
        if (a.rarity !== 'very_likely') {
          a.rarity = 'very_likely';
          a.raritySource = 'override_curated';
          report.part1.americanRobin++;
        }
      } else if (DESERT_STARK.has(parkId)) {
        if (a.rarity !== 'likely') {
          a.rarity = 'likely';
          a.raritySource = 'override_curated';
          report.part1.americanRobin++;
        }
      } else if (isLower48(parkId)) {
        if (a.rarity !== 'guaranteed') {
          a.rarity = 'guaranteed';
          a.raritySource = 'override_curated';
          report.part1.americanRobin++;
        }
      }
    }

    // ── PART 1 — Raccoon / Common Raccoon ──────────────────────────────────
    if (name === 'Common Raccoon' || name === 'Raccoon' || name === 'Northern Raccoon') {
      let target;
      if (region === 'alaska') target = 'unlikely';
      else if (region === 'eastern') target = 'very_likely';
      else if (region === 'western') target = 'likely';
      if (target) {
        const newRarity = atLeast(a.rarity, target);
        if (newRarity !== a.rarity) {
          a.rarity = newRarity;
          a.raritySource = 'override_curated';
          report.part1.raccoon++;
        }
      }
    }

    // ── PART 1 — Eastern Gray Squirrel ─────────────────────────────────────
    if (name === 'Eastern Gray Squirrel') {
      let target;
      if (EGS_DECIDUOUS_GUARANTEED.has(parkId)) target = 'guaranteed';
      else if (region === 'eastern') target = 'very_likely';
      // western/alaska/hawaii: leave as-is
      if (target) {
        const newRarity = atLeast(a.rarity, target);
        if (newRarity !== a.rarity) {
          a.rarity = newRarity;
          a.raritySource = 'override_curated';
          report.part1.easternGraySquirrel++;
        }
      }
    }

    // ── PART 2 — Monarch (anywhere; demote to 'likely' max) ────────────────
    if (name === 'Monarch' || name === 'Monarch Butterfly') {
      if (RANK[a.rarity] > RANK.likely) {
        a.rarity = 'likely';
        a.raritySource = 'override_curated';
        report.part2.monarchFixed++;
      }
    }

    // ── PART 2 — Insect guaranteed demotion ────────────────────────────────
    if (a.animalType === 'insect' && a.rarity === 'guaranteed') {
      const key = `${parkId}|${name}`;
      const isMonarch = name === 'Monarch' || name === 'Monarch Butterfly';
      if (!INSECT_KEEP_GUARANTEED.has(key) && !isMonarch) {
        a.rarity = 'very_likely';
        a.raritySource = 'override_curated';
        report.part2.insectsDemoted++;
      }
    }

    // ── PART 3 — Specific questionable guaranteed ──────────────────────────
    if (parkId === 'yellowstone' && name === 'American Goldfinch' && a.rarity === 'guaranteed') {
      a.rarity = 'very_likely';
      a.raritySource = 'override_curated';
      report.part3.yellowstoneGoldfinch++;
    }
    if (parkId === 'yellowstone' && name === 'Sandhill Crane' && a.rarity === 'guaranteed') {
      a.rarity = 'very_likely';
      a.raritySource = 'override_curated';
      report.part3.yellowstoneSandhillCrane++;
    }
    if (parkId === 'biscayne' && name === 'American Alligator' && a.rarity === 'guaranteed') {
      a.rarity = 'likely';
      a.raritySource = 'override_curated';
      report.part3.biscayneAlligator++;
    }
  }
}

// ── Count guaranteed before/after ────────────────────────────────────────────
let guaranteedAfter = 0;
for (const data of Object.values(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) if (a.rarity === 'guaranteed') guaranteedAfter++;
}

// ── Write cache back ──────────────────────────────────────────────────────────
const totalSpecies = Object.values(WILDLIFE_CACHE).reduce((n, p) => n + (p.animals?.length || 0), 0);
const header = `// Auto-generated by scripts/buildWildlifeCache.js -- do not edit manually.
// Built: ${WILDLIFE_CACHE_BUILT_AT}
// Parks: ${Object.keys(WILDLIFE_CACHE).length} | Species bundled: ${totalSpecies}
// To regenerate: node scripts/buildWildlifeCache.js
// Updated: ${new Date().toISOString()} via applyRarityFixes.js

export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(WILDLIFE_CACHE_BUILT_AT)};

export const WILDLIFE_CACHE = ${JSON.stringify(WILDLIFE_CACHE, null, 2)};
`;

writeFileSync(join(ROOT, 'src', 'data', 'wildlifeCache.js'), header, 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`=== APPLY RARITY FIXES ===\n`);
console.log(`--- PART 1: Species-specific overrides ---`);
console.log(`  Turkey Vulture         : ${report.part1.turkeyVulture} entries updated`);
console.log(`  Red-tailed Hawk        : ${report.part1.redTailedHawk} entries updated`);
console.log(`  American Robin         : ${report.part1.americanRobin} entries updated`);
console.log(`  American Robin removed : ${report.part1.robinRemoved} entries (Hawaii)`);
console.log(`  Raccoon / Common Raccoon: ${report.part1.raccoon} entries updated`);
console.log(`  Eastern Gray Squirrel  : ${report.part1.easternGraySquirrel} entries updated`);
const part1Total = report.part1.turkeyVulture + report.part1.redTailedHawk +
                   report.part1.americanRobin + report.part1.raccoon +
                   report.part1.easternGraySquirrel;
console.log(`  PART 1 TOTAL overrides: ${part1Total}`);

console.log(`\n--- PART 2: Insect guaranteed demotion ---`);
console.log(`  Insects demoted (guaranteed → very_likely): ${report.part2.insectsDemoted}`);
console.log(`  Monarch fixes (max 'likely')              : ${report.part2.monarchFixed}`);
console.log(`  Kept guaranteed: Spotted Lanternfly @ Shenandoah (invasive)`);

console.log(`\n--- PART 3: Other questionable guaranteed ---`);
console.log(`  Yellowstone American Goldfinch : ${report.part3.yellowstoneGoldfinch}`);
console.log(`  Yellowstone Sandhill Crane     : ${report.part3.yellowstoneSandhillCrane}`);
console.log(`  Biscayne American Alligator    : ${report.part3.biscayneAlligator}`);

console.log(`\n--- Guaranteed count ---`);
console.log(`  Before: 145`);
console.log(`  After : ${guaranteedAfter}`);

console.log(`\nCache written to src/data/wildlifeCache.js`);
