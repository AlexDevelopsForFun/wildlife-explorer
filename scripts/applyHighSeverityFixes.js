// Apply CATEGORY 2 (range pollution) + CATEGORY 3 (season fixes) to wildlifeCache.js
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from '../src/data/wildlifeCache.js';
import { writeFileSync, readFileSync } from 'fs';

// ── Reference park lists ───────────────────────────────────────────────────────
const ALASKA_PARKS = [
  'denali', 'gatesofthearctic', 'glacierbay', 'katmai',
  'kenaifjords', 'kobukvalley', 'lakeclark', 'wrangellstelias',
];

const HAWAII_PARKS = ['haleakala', 'hawaiivolcanoes'];

// Parks west of the Rockies (includes Rockies) for removing RTHU + Baltimore Oriole
const WESTERN_PARKS = [
  'yellowstone','grandteton','glacier','rockymountain','yosemite','sequoia','kingscanyon',
  'olympic','mountrainier','northcascades','craterlake','redwood',
  'grandcanyon','zion','brycecanyon','arches','canyonlands','capitolreef','mesaverde',
  'petrifiedforest','saguaro','joshuatree','greatbasin','deathvalley','lassenvolcanic',
  'pinnacles','channelislands','greatsanddunes','blackcanyon','carlsbadcaverns',
  'whitesands','bigbend','guadalupemountains','badlands','windcave','theodoreroosevelt',
];

// ── Category 2: Range pollution ───────────────────────────────────────────────
const ALASKA_EASTERN_REMOVE = new Set([
  'Scarlet Tanager',
  'Ruby-throated Hummingbird',
  'Baltimore Oriole',
  'American Goldfinch',
  'Eastern Box Turtle',
]);

const WESTERN_REMOVE = new Set([
  'Scarlet Tanager',
  'Ruby-throated Hummingbird',
  'Baltimore Oriole',
]);

const HAWAII_REMOVE = new Set([
  'Snow Goose', 'American Goldfinch', 'Scarlet Tanager',
  'Ruby-throated Hummingbird', 'Baltimore Oriole', 'Eastern Box Turtle',
  'Dark-eyed Junco', 'White-tailed Deer', 'Mule Deer', 'Pronghorn',
  'Bison', 'American Bison', 'Moose', 'Elk', 'Coyote', 'Gray Wolf',
  'Black Bear', 'American Black Bear', 'Grizzly Bear', 'Brown Bear',
]);

const report = {
  removals: { byPark: {}, total: 0 },
  seasonFixes: { byPark: {}, total: 0 },
};

function removeAnimalByName(park, predicate, reason) {
  const data = WILDLIFE_CACHE[park];
  if (!data || !data.animals) return 0;
  const before = data.animals.length;
  const kept = [];
  const removedNames = [];
  for (const a of data.animals) {
    if (predicate(a)) removedNames.push(a.name);
    else kept.push(a);
  }
  data.animals = kept;
  const removed = before - kept.length;
  if (removed > 0) {
    if (!report.removals.byPark[park]) report.removals.byPark[park] = [];
    report.removals.byPark[park].push({ reason, count: removed, names: removedNames });
    report.removals.total += removed;
  }
  return removed;
}

// --- Alaska parks: remove eastern species + "Eastern *" prefix ---
for (const park of ALASKA_PARKS) {
  removeAnimalByName(park,
    a => ALASKA_EASTERN_REMOVE.has(a.name) || /^Eastern /.test(a.name),
    'alaska eastern pollution');
}

// --- Western parks: remove Scarlet Tanager, Ruby-throated Hummingbird, Baltimore Oriole ---
for (const park of WESTERN_PARKS) {
  removeAnimalByName(park,
    a => WESTERN_REMOVE.has(a.name),
    'western range pollution');
}

// --- Hawaii: remove mainland-only species ---
for (const park of HAWAII_PARKS) {
  removeAnimalByName(park,
    a => HAWAII_REMOVE.has(a.name),
    'hawaii mainland pollution');
}

// --- Wrangell-St. Elias: remove American Bison (no managed herd) ---
removeAnimalByName('wrangellstelias',
  a => a.name === 'American Bison' || a.name === 'Bison',
  'no bison herd at Wrangell-St. Elias');

// ── Category 3: Season fixes ──────────────────────────────────────────────────
function fixAnimal(park, predicate, fix, reason) {
  const data = WILDLIFE_CACHE[park];
  if (!data || !data.animals) return 0;
  let fixed = 0;
  for (const a of data.animals) {
    if (predicate(a)) {
      fix(a);
      fixed++;
      if (!report.seasonFixes.byPark[park]) report.seasonFixes.byPark[park] = [];
      report.seasonFixes.byPark[park].push({ reason, name: a.name, seasons: a.seasons });
      report.seasonFixes.total++;
    }
  }
  return fixed;
}

// Snowy Owl at all lower-48 parks: seasons = ["winter"], migrationStatus = "winter_visitor"
for (const park of Object.keys(WILDLIFE_CACHE)) {
  if (ALASKA_PARKS.includes(park)) continue;
  if (HAWAII_PARKS.includes(park)) continue;
  fixAnimal(park,
    a => a.name === 'Snowy Owl',
    a => { a.seasons = ['winter']; a.migrationStatus = 'winter_visitor'; },
    'Snowy Owl lower-48 winter only');
}

// Ruby-throated Hummingbird — remove winter (wherever still present after removals)
for (const park of Object.keys(WILDLIFE_CACHE)) {
  fixAnimal(park,
    a => a.name === 'Ruby-throated Hummingbird' && (a.seasons || []).includes('winter'),
    a => { a.seasons = a.seasons.filter(s => s !== 'winter'); },
    'RTHU no winter');
}

// Baltimore Oriole — remove winter
for (const park of Object.keys(WILDLIFE_CACHE)) {
  fixAnimal(park,
    a => a.name === 'Baltimore Oriole' && (a.seasons || []).includes('winter'),
    a => { a.seasons = a.seasons.filter(s => s !== 'winter'); },
    'Baltimore Oriole no winter');
}

// Barn Swallow at Alaska — remove winter
for (const park of ALASKA_PARKS) {
  fixAnimal(park,
    a => a.name === 'Barn Swallow' && (a.seasons || []).includes('winter'),
    a => { a.seasons = a.seasons.filter(s => s !== 'winter'); },
    'Barn Swallow Alaska no winter');
}

// Dark-eyed Junco at Everglades — seasons = ["winter"]
fixAnimal('everglades',
  a => a.name === 'Dark-eyed Junco',
  a => { a.seasons = ['winter']; },
  'Dark-eyed Junco Everglades winter only');

// ── Write cache back ──────────────────────────────────────────────────────────

const header = `// Auto-generated by scripts/buildWildlifeCache.js -- do not edit manually.
// Built: ${WILDLIFE_CACHE_BUILT_AT}
// Parks: ${Object.keys(WILDLIFE_CACHE).length} | Species bundled: ${Object.values(WILDLIFE_CACHE).reduce((n, p) => n + (p.animals?.length || 0), 0)}
// To regenerate: node scripts/buildWildlifeCache.js
// Updated: ${new Date().toISOString()} via applyHighSeverityFixes.js

export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(WILDLIFE_CACHE_BUILT_AT)};

export const WILDLIFE_CACHE = ${JSON.stringify(WILDLIFE_CACHE, null, 2)};
`;

writeFileSync('src/data/wildlifeCache.js', header, 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`=== APPLY HIGH-SEVERITY FIXES ===\n`);

console.log(`--- CATEGORY 2: Range pollution removals ---`);
for (const [park, items] of Object.entries(report.removals.byPark)) {
  for (const it of items) {
    console.log(`  ${park.padEnd(22)} | -${it.count} | ${it.reason.padEnd(28)} | ${it.names.join(', ')}`);
  }
}
console.log(`  TOTAL REMOVALS: ${report.removals.total}`);

console.log(`\n--- CATEGORY 3: Season fixes ---`);
for (const [park, items] of Object.entries(report.seasonFixes.byPark)) {
  for (const it of items) {
    console.log(`  ${park.padEnd(22)} | ${it.name.padEnd(32)} | ${JSON.stringify(it.seasons)}  (${it.reason})`);
  }
}
console.log(`  TOTAL SEASON FIXES: ${report.seasonFixes.total}`);

// Final post-fix counts
let totalAnimals = 0;
for (const data of Object.values(WILDLIFE_CACHE)) totalAnimals += data.animals?.length || 0;
console.log(`\nNew cache total: ${totalAnimals} animals across ${Object.keys(WILDLIFE_CACHE).length} parks.`);
console.log(`Cache written to src/data/wildlifeCache.js`);
