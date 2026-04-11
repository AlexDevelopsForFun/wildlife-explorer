/**
 * patchRarity.mjs — Apply updated RARITY_OVERRIDES and mammal floor to
 * the existing wildlifeCache.js WITHOUT making any API calls.
 *
 * This is much faster than a full rebuild and is safe to run anytime
 * because it only changes rarity fields (no data removed, no API calls).
 *
 * Usage:  node scripts/patchRarity.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_IN = join(ROOT, 'src', 'data', 'wildlifeCache.js');

// ── Updated RARITY_OVERRIDES (synced with src/services/apiService.js) ──────────
const RARITY_OVERRIDES = {
  // ── Yellowstone / Tetons ─────────────────────────────────────────────────
  yellowstone:           { 'American Bison': 'guaranteed', 'American Elk': 'guaranteed', 'Elk': 'very_likely', 'Grizzly Bear': 'unlikely', 'Gray Wolf': 'rare', 'Moose': 'unlikely' },
  'grand-teton':         { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  grandteton:            { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  // ── Southeast ────────────────────────────────────────────────────────────
  everglades:            { 'American Alligator': 'guaranteed', 'West Indian Manatee': 'unlikely', 'Florida Manatee': 'unlikely', 'Great Blue Heron': 'guaranteed', 'Anhinga': 'guaranteed', 'Snowy Egret': 'very_likely', 'Roseate Spoonbill': 'likely', 'Eastern Lubber Grasshopper': 'very_likely', 'Florida Panther': 'exceptional' },
  congaree:              { 'American Alligator': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  biscayne:              { 'Brown Pelican': 'very_likely', 'Double-crested Cormorant': 'very_likely', 'Bottlenose Dolphin': 'unlikely' },
  drytortugas:           { 'Sooty Tern': 'guaranteed', 'Brown Noddy': 'guaranteed', 'Magnificent Frigatebird': 'very_likely', 'American Alligator': 'exceptional' },
  // ── East / Appalachian ───────────────────────────────────────────────────
  greatsmokymountains:   { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely', 'Wild Turkey': 'very_likely' },
  shenandoah:            { 'White-tailed Deer': 'guaranteed', 'Wild Turkey': 'very_likely', 'Black Bear': 'likely' },
  // Herring Gulls everywhere at Bar Harbor/ocean viewpoints (624 iNat obs — top species at Acadia)
  acadia:                { 'American Herring Gull': 'guaranteed', 'Bald Eagle': 'rare', 'White-tailed Deer': 'very_likely', 'Harbor Seal': 'likely', 'Common Loon': 'likely' },
  // Mule Deer: everywhere at Hurricane Ridge and meadows (1520 iNat obs, highest at Olympic)
  // Olympic Marmot: endemic, visible at Hurricane Ridge (759 obs — upgraded Part 1)
  olympic:               { 'Mule Deer': 'guaranteed', 'Bald Eagle': 'likely', 'Roosevelt Elk': 'likely', 'Harbor Seal': 'likely', 'Olympic Marmot': 'very_likely', 'Canada Jay': 'very_likely' },
  // Common Loon: iconic, heard/seen on virtually every Isle Royale lake
  isleroyale:            { 'Moose': 'likely', 'Common Loon': 'guaranteed' },
  newrivergorge:         { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely' },
  cuyahogavalley:        { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'very_likely' },
  mammothcave:           { 'Little Brown Bat': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  hotsprings:            { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'guaranteed' },
  indianadunes:          { 'White-tailed Deer': 'guaranteed', 'Sandhill Crane': 'very_likely' },
  // Eastern Gray Squirrels on every lawn around the Arch (urban park — squirrels guaranteed)
  gatewayarch:           { 'Eastern Gray Squirrel': 'guaranteed', 'American Robin': 'very_likely', 'White-tailed Deer': 'very_likely', 'Red Fox': 'unlikely' },
  voyageurs:             { 'Common Loon': 'guaranteed', 'Bald Eagle': 'very_likely', 'Moose': 'likely' },
  // ── Rocky Mountain / Great Plains ────────────────────────────────────────
  glacier:               { 'Mountain Goat': 'very_likely', 'Grizzly Bear': 'unlikely', 'Bighorn Sheep': 'very_likely', 'Bald Eagle': 'likely' },
  badlands:              { 'American Bison': 'guaranteed', 'Pronghorn': 'guaranteed', 'Black-tailed Prairie Dog': 'guaranteed' },
  windcave:              { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely' },
  theodoreroosevelt:     { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely', 'Wild Horse': 'very_likely' },
  // ── Rocky Mountain / Sierra Nevada / Southwest ───────────────────────────
  // Elk in RMNP: 90%+ of visitors see Elk (Estes Park meadows, Trail Ridge Road).
  // California Ground Squirrel: literally at every Yosemite Valley trailhead and picnic area.
  // Gambel's Quail: seen on 90%+ of Saguaro hikes — coveys on every trail.
  rockymountain:         { 'American Elk': 'guaranteed', 'Elk': 'guaranteed', 'Mule Deer': 'very_likely', 'Bighorn Sheep': 'likely' },
  yosemite:              { 'California Ground Squirrel': 'guaranteed', "Steller's Jay": 'very_likely', 'Mule Deer': 'very_likely', 'Black Bear': 'unlikely' },
  saguaro:               { "Gambel's Quail": 'guaranteed', 'Cactus Wren': 'very_likely', 'Gila Woodpecker': 'very_likely' },
  // Common Raven: sits at every overlook rim-wide, impossible to miss (1469 iNat obs)
  // Data quality corrections: Bison at GC (none live there); Alligator at Dry Tortugas (marine island)
  grandcanyon:           { 'Common Raven': 'guaranteed', 'Rock Squirrel': 'very_likely', 'Mule Deer': 'very_likely', 'Elk': 'likely', 'American Bison': 'exceptional' },
  drytortugas:           { 'Sooty Tern': 'guaranteed', 'Brown Noddy': 'guaranteed', 'Magnificent Frigatebird': 'very_likely', 'American Alligator': 'exceptional' },
  // Rock Squirrel: at every trailhead / viewpoint / picnic area (1303 iNat obs)
  zion:                  { 'Rock Squirrel': 'guaranteed', 'Mule Deer': 'very_likely', 'Desert Cottontail': 'likely', 'Coyote': 'likely' },
  // Golden-mantled Ground Squirrel: begs at every viewpoint rim-wide
  // Utah Prairie Dog: at Bryce Canyon visitor area (override ready for when in cache)
  brycecanyon:           { 'Utah Prairie Dog': 'guaranteed', "Common Golden-mantled Ground Squirrel": 'guaranteed', 'Mule Deer': 'very_likely', 'Common Raven': 'very_likely', 'Pronghorn': 'very_likely' },
  // Ravens at every arch overlook (524 iNat obs — most observed bird at Arches)
  arches:                { 'Common Raven': 'guaranteed', 'Mule Deer': 'likely', 'Coyote': 'likely', 'Desert Cottontail': 'likely' },
  // Ravens at Island in the Sky / The Needles overlooks (323 obs)
  canyonlands:           { 'Common Raven': 'guaranteed', 'Common Side-blotched Lizard': 'very_likely', 'Mule Deer': 'likely' },
  // Deer visit Capitol Reef orchards nightly, common throughout park (273 obs)
  capitolreef:           { 'Mule Deer': 'guaranteed', 'Common Raven': 'very_likely', 'Coyote': 'likely' },
  // Ravens at every Petrified Forest overlook (528 obs — top iNat species there)
  petrifiedforest:       { 'Common Raven': 'guaranteed', 'Pronghorn': 'very_likely' },
  mesaverde:             { 'Mule Deer': 'guaranteed', 'Wild Turkey': 'very_likely', "Gunnison's Prairie Dog": 'rare' },
  blackcanyon:           { 'Mule Deer': 'likely', 'Peregrine Falcon': 'unlikely' },
  // Steller's Jay: at every campsite/picnic table in the Wheeler Peak / Lehman Caves zone
  greatbasin:            { 'Mule Deer': 'very_likely', "Steller's Jay": 'very_likely', 'Pronghorn': 'likely' },
  guadalupemountains:    { 'Mule Deer': 'very_likely', 'Elk': 'likely' },
  // Common Side-blotched Lizard: 3563 iNat obs — highest corrected count of all 32 zero-guar parks
  joshuatree:            { 'Common Side-blotched Lizard': 'guaranteed', 'Common Chuckwalla': 'very_likely' },
  // Ravens at Furnace Creek, Badwater, every visitor area (372 obs)
  deathvalley:           { 'Common Raven': 'guaranteed', 'Coyote': 'very_likely', 'Common Side-blotched Lizard': 'very_likely' },
  // Western Earless Lizard: endemic white-sands color form, found on every dune walk (322 obs)
  whitesands:            { 'Western Earless Lizard': 'guaranteed' },
  // California Ground Squirrel: everywhere at visitor areas (735 obs); Condor upgraded to v_likely
  pinnacles:             { 'California Ground Squirrel': 'guaranteed', 'California Condor': 'very_likely', 'Acorn Woodpecker': 'very_likely', 'California Scrub-Jay': 'very_likely' },
  // Golden-mantled Ground Squirrel: approaches visitors at every Rim Drive overlook (701 obs)
  craterlake:            { "Common Golden-mantled Ground Squirrel": 'guaranteed', "Clark's Nutcracker": 'very_likely' },
  // Hoary Marmot: sunbathing on rocks at Paradise, Sunrise — can't miss them (1853 obs)
  mountrainier:          { 'Hoary Marmot': 'guaranteed', 'Canada Jay': 'very_likely', 'Sooty Grouse': 'very_likely' },
  // Roosevelt Elk herd at Prairie Creek / Gold Bluffs Beach section (1416 iNat obs as "Wapiti")
  redwood:               { 'Roosevelt Elk': 'guaranteed', "Steller's Jay": 'very_likely' },
  // Steller's Jay: at every campsite in Giant Forest / Cedar Grove (guaranteed in Sierra pines)
  kingscanyon:           { "Steller's Jay": 'guaranteed' },
  sequoia:               { "Steller's Jay": 'guaranteed' },
  lassenvolcanic:        { "Steller's Jay": 'guaranteed', "Common Golden-mantled Ground Squirrel": 'very_likely' },
  // Greater Roadrunner: seen near visitor center, roadsides, campgrounds throughout park (995 obs)
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
  // Nene walk freely near Kilauea Caldera / Crater Rim Drive visitor areas
  hawaiivolcanoes:       { 'Nene': 'guaranteed', 'Hawaiian Hawk': 'unlikely', 'Hawaiian Goose': 'guaranteed' },
  haleakala:             { 'Nene': 'guaranteed', 'Hawaiian Goose': 'guaranteed' },
  // ── Island / Tropical ────────────────────────────────────────────────────
  // Green Iguanas at every beach, parking lot, and overlook in USVI (invasive, extremely common)
  virginislands:         { 'Green Iguana': 'guaranteed', 'Green Sea Turtle': 'very_likely', 'Hawksbill Sea Turtle': 'unlikely' },
  americansamoa:         { 'Samoan Flying Fox': 'very_likely', 'Green Sea Turtle': 'likely' },
};

// ── Mammal rarity floor ─────────────────────────────────────────────────────────
// iNat under-reports common generalist mammals (coyote, rabbits, raccoons) because
// casual visitors don't bother submitting them. If iNaturalist independently found
// and verified this mammal at the park, 'exceptional' (<2%) is almost never correct.
// Floor: iNat-sourced exceptional mammals → 'rare' (2-10%) minimum.
// Static/curated animals (_priority=0, source='static') are skipped — already correct.
// This is conservative: Mountain Lion stays 'rare' not 'unlikely', which is still fair.
function applyMammalRarityFloor(animals) {
  return animals.map(a => {
    if (a.animalType !== 'mammal') return a;
    if (a.source === 'static' || a.source === 'nps') return a; // curated — skip
    if (a.rarity === 'exceptional' && a.source === 'inaturalist') {
      return { ...a, rarity: 'rare' };
    }
    return a;
  });
}

// ── Parse wildlifeCache.js ──────────────────────────────────────────────────────
console.log('Reading wildlifeCache.js…');
const src = readFileSync(CACHE_IN, 'utf8');

// Extract the builtAt timestamp from the header comment
const builtAtMatch = src.match(/Built:\s*(\S+)/);
const originalBuiltAt = builtAtMatch?.[1] ?? 'unknown';

// Parse the JS object using Function constructor (safe for known-format generated files)
const jsonMatch = src.match(/export const WILDLIFE_CACHE\s*=\s*(\{[\s\S]*?\});\s*$/m)
               ?? src.match(/export const WILDLIFE_CACHE\s*=\s*(\{[\s\S]*\});/);

if (!jsonMatch) {
  console.error('❌  Could not locate WILDLIFE_CACHE export in file');
  process.exit(1);
}

// Use Function() to evaluate the object literal (handles trailing commas etc.)
let cache;
try {
  cache = new Function(`return ${jsonMatch[1]}`)();
} catch (e) {
  console.error('❌  Failed to parse WILDLIFE_CACHE:', e.message);
  process.exit(1);
}

const parkIds = Object.keys(cache);
console.log(`   Loaded ${parkIds.length} parks, ${Object.values(cache).reduce((s,v)=>s+v.animals.length,0)} species`);

// ── Apply overrides ─────────────────────────────────────────────────────────────
let overrideCount = 0;
let floorCount    = 0;

for (const [locId, overrides] of Object.entries(RARITY_OVERRIDES)) {
  if (!cache[locId]) {
    console.warn(`  ⚠ Override park not in cache: ${locId}`);
    continue;
  }
  cache[locId].animals = cache[locId].animals.map(a => {
    const newRarity = overrides[a.name];
    if (newRarity && newRarity !== a.rarity) {
      overrideCount++;
      return { ...a, rarity: newRarity };
    }
    return a;
  });
}

// ── Apply mammal floor ──────────────────────────────────────────────────────────
for (const locId of parkIds) {
  const before = cache[locId].animals;
  const after  = applyMammalRarityFloor(before);
  let changed  = 0;
  after.forEach((a, i) => { if (a.rarity !== before[i].rarity) changed++; });
  floorCount += changed;
  cache[locId].animals = after;
}

console.log(`\n   Applied ${overrideCount} rarity overrides`);
console.log(`   Applied ${floorCount} mammal floor corrections`);

// ── Count guaranteed per park after patches ─────────────────────────────────────
const guaranteedCounts = parkIds.map(id => ({
  id,
  count: cache[id].animals.filter(a => a.rarity === 'guaranteed').length,
  total: cache[id].animals.length,
}));
const zeroGuar = guaranteedCounts.filter(p => p.count === 0);
const oneGuar  = guaranteedCounts.filter(p => p.count === 1);
console.log(`\n   Parks with 0 Guaranteed after patch: ${zeroGuar.length}`);
console.log(`   Parks with 1 Guaranteed after patch: ${oneGuar.length}`);
console.log(`   Parks with 2+ Guaranteed after patch: ${guaranteedCounts.filter(p=>p.count>=2).length}`);

// ── Write patched cache ─────────────────────────────────────────────────────────
const patchedAt    = new Date().toISOString();
const totalSpecies = Object.values(cache).reduce((s, v) => s + v.animals.length, 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Built: ${originalBuiltAt}`,
  `// Patched: ${patchedAt} (rarity overrides + mammal floor applied by patchRarity.mjs)`,
  `// Parks: ${parkIds.length} | Species bundled: ${totalSpecies}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(originalBuiltAt)};`,
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

writeFileSync(CACHE_IN, lines.join('\n'), 'utf8');
console.log(`\n✅  Patched cache written to src/data/wildlifeCache.js`);
console.log(`   ${parkIds.length} parks | ${totalSpecies} species`);
