// Preview CATEGORY 2 and CATEGORY 3 changes before applying
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';

const ALASKA_PARKS = [
  'denali', 'gatesofthearctic', 'glacierbay', 'katmai',
  'kenaifjords', 'kobukvalley', 'lakeclark', 'wrangellstelias',
];

const HAWAII_PARKS = ['haleakala', 'hawaiivolcanoes'];

// Eastern-range species that should not be in AK or western parks
const EASTERN_SPECIES_OUT_OF_ALASKA = [
  'Scarlet Tanager',
  'Ruby-throated Hummingbird',
  'Baltimore Oriole',
  'American Goldfinch',
  'Eastern Box Turtle',
];

// Parks west of Rockies (roughly) — for removing Ruby-throated Hummingbird + Baltimore Oriole
const WESTERN_PARKS = [
  'yellowstone','grandteton','glacier','rockymountain','yosemite','sequoia','kingscanyon',
  'olympic','mountrainier','northcascades','crater lake','craterlake','redwood',
  'grandcanyon','zion','brycecanyon','arches','canyonlands','capitolreef','mesaverde',
  'petrifiedforest','saguaro','joshuatree','greatbasin','deathvalley','lassen','lassenvolcanic',
  'pinnacles','channelislands','greatsanddunes','blackcanyon','carlsbadcaverns',
  'whitesands','bigbend','guadalupemountains','badlands','windcave','theodoreroosevelt',
];

// Eastern parks (Scarlet Tanager, Baltimore Oriole, Ruby-throated Hummingbird CAN occur here)
// Gulf Coast parks may have Scarlet Tanager on migration.

console.log(`=== CATEGORY 2 PREVIEW — RANGE POLLUTION ===\n`);

let removals = 0;

console.log(`--- Alaska parks — remove eastern species ---`);
for (const park of ALASKA_PARKS) {
  const data = WILDLIFE_CACHE[park];
  if (!data) { console.log(`  ${park}: not in cache`); continue; }
  const hits = [];
  for (const a of data.animals || []) {
    // Hard-coded list + "Eastern" prefix species
    if (EASTERN_SPECIES_OUT_OF_ALASKA.includes(a.name)) hits.push(a.name);
    else if (/^Eastern /.test(a.name)) hits.push(a.name);
  }
  if (hits.length) {
    console.log(`  ${park}: ${hits.length} → ${hits.join(', ')}`);
    removals += hits.length;
  } else {
    console.log(`  ${park}: (clean)`);
  }
}

console.log(`\n--- Western parks — remove Scarlet Tanager, Ruby-throated Hummingbird, Baltimore Oriole ---`);
const westernTargets = ['Scarlet Tanager', 'Ruby-throated Hummingbird', 'Baltimore Oriole'];
for (const park of WESTERN_PARKS) {
  const data = WILDLIFE_CACHE[park];
  if (!data) continue;
  const hits = [];
  for (const a of data.animals || []) {
    if (westernTargets.includes(a.name)) hits.push(a.name);
  }
  if (hits.length) {
    console.log(`  ${park}: ${hits.length} → ${hits.join(', ')}`);
    removals += hits.length;
  }
}

console.log(`\n--- Hawaii parks — remove mainland-only species ---`);
const mainlandOnly = ['Snow Goose', 'American Goldfinch', 'Scarlet Tanager',
  'Ruby-throated Hummingbird', 'Baltimore Oriole', 'Eastern Box Turtle',
  'Dark-eyed Junco', 'American Robin', 'White-tailed Deer', 'Mule Deer',
  'Pronghorn', 'Bison', 'American Bison', 'Moose', 'Elk', 'Coyote', 'Gray Wolf',
  'Black Bear', 'American Black Bear', 'Grizzly Bear', 'Brown Bear'];
for (const park of HAWAII_PARKS) {
  const data = WILDLIFE_CACHE[park];
  if (!data) { console.log(`  ${park}: not in cache`); continue; }
  const hits = [];
  for (const a of data.animals || []) {
    if (mainlandOnly.includes(a.name)) hits.push(a.name);
  }
  if (hits.length) {
    console.log(`  ${park}: ${hits.length} → ${hits.join(', ')}`);
    removals += hits.length;
  } else {
    console.log(`  ${park}: (clean)`);
  }
}

console.log(`\n--- Wrangell-St. Elias — check for American Bison ---`);
{
  const data = WILDLIFE_CACHE['wrangellstelias'];
  if (data) {
    const bison = (data.animals || []).filter(a =>
      a.name === 'American Bison' || a.name === 'Bison');
    console.log(`  wrangellstelias bison entries: ${bison.length} → ${bison.map(a => a.name).join(', ') || '(none)'}`);
  }
}

console.log(`\n=== CATEGORY 3 PREVIEW — SEASON FIXES ===\n`);

let seasonFixes = 0;

// Snowy Owl at all lower-48 parks: seasons = ["winter"], migrationStatus = "winter_visitor"
console.log(`--- Snowy Owl at lower-48 parks ---`);
for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  if (ALASKA_PARKS.includes(park)) continue;
  if (HAWAII_PARKS.includes(park)) continue;
  for (const a of data.animals || []) {
    if (a.name === 'Snowy Owl') {
      console.log(`  ${park}: seasons=${JSON.stringify(a.seasons)} migrationStatus=${a.migrationStatus || '(none)'}`);
      seasonFixes++;
    }
  }
}

// Ruby-throated Hummingbird: remove "winter"
console.log(`\n--- Ruby-throated Hummingbird — remove winter ---`);
for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.name === 'Ruby-throated Hummingbird' && (a.seasons || []).includes('winter')) {
      console.log(`  ${park}: seasons=${JSON.stringify(a.seasons)}`);
      seasonFixes++;
    }
  }
}

// Baltimore Oriole: remove "winter"
console.log(`\n--- Baltimore Oriole — remove winter ---`);
for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.name === 'Baltimore Oriole' && (a.seasons || []).includes('winter')) {
      console.log(`  ${park}: seasons=${JSON.stringify(a.seasons)}`);
      seasonFixes++;
    }
  }
}

// Barn Swallow at Alaska: remove "winter"
console.log(`\n--- Barn Swallow at Alaska parks — remove winter ---`);
for (const park of ALASKA_PARKS) {
  const data = WILDLIFE_CACHE[park];
  if (!data) continue;
  for (const a of data.animals || []) {
    if (a.name === 'Barn Swallow' && (a.seasons || []).includes('winter')) {
      console.log(`  ${park}: seasons=${JSON.stringify(a.seasons)}`);
      seasonFixes++;
    }
  }
}

// Dark-eyed Junco at Everglades: seasons = ["winter"]
console.log(`\n--- Dark-eyed Junco at Everglades ---`);
{
  const data = WILDLIFE_CACHE['everglades'];
  if (data) {
    for (const a of data.animals || []) {
      if (a.name === 'Dark-eyed Junco') {
        console.log(`  everglades: seasons=${JSON.stringify(a.seasons)}`);
        seasonFixes++;
      }
    }
  }
}

console.log(`\n=== PREVIEW TOTALS ===`);
console.log(`Planned removals:     ${removals}`);
console.log(`Planned season fixes: ${seasonFixes}`);
