/**
 * patchBirdSeasons.mjs
 * Comprehensive bird season patch for all 63 parks (EXCEPT Acadia, already correct).
 * Removes winter from migratory birds based on park region (lat-derived).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');

// ── Park lat lookup (from wildlifeData.js) ───────────────────────────────────
const PARK_LAT = {
  yellowstone:        44.428,
  everglades:         25.286,
  denali:             63.115,
  acadia:             44.357,
  shenandoah:         38.4937,
  newrivergorge:      37.8679,
  cuyahogavalley:     41.2808,
  isleroyale:         48.0058,
  greatsmokymountains:35.6117,
  biscayne:           25.4820,
  drytortugas:        24.6282,
  congaree:           33.7978,
  mammothcave:        37.1862,
  voyageurs:          48.4839,
  indianadunes:       41.6533,
  badlands:           43.8554,
  windcave:           43.5570,
  theodoreroosevelt:  46.9790,
  gatewayarch:        38.6247,
  grandcanyon:        36.1069,
  zion:               37.2982,
  brycecanyon:        37.5930,
  arches:             38.7331,
  canyonlands:        38.2000,
  capitolreef:        38.0877,
  mesaverde:          37.2309,
  petrifiedforest:    35.0654,
  saguaro:            32.2967,
  whitesands:         32.7872,
  guadalupemountains: 31.9231,
  bigbend:            29.1275,
  grandteton:         43.7904,
  rockymountain:      40.3428,
  glacier:            48.7596,
  greatsanddunes:     37.7928,
  blackcanyon:        38.5754,
  olympic:            47.8021,
  northcascades:      48.7718,
  mountrainier:       46.8523,
  craterlake:         42.9446,
  redwood:            41.2132,
  lassenvolcanic:     40.4977,
  yosemite:           37.8651,
  kingscanyon:        36.8879,
  sequoia:            36.4864,
  joshuatree:         33.8734,
  deathvalley:        36.5054,
  channelislands:     34.0069,
  pinnacles:          36.4906,
  kenaifjords:        59.9195,
  glacierbay:         58.6657,
  katmai:             58.5001,
  wrangellstelias:    61.7105,
  lakeclark:          60.4126,
  gatesofthearctic:   67.7776,
  kobukvalley:        67.3564,
  hawaiivolcanoes:    19.4194,
  haleakala:          20.7204,
  americansamoa:     -14.2555,
  virginislands:      18.3413,
  hotsprings:         34.5220,
  carlsbadcaverns:    32.1479,
  greatbasin:         38.9833,
};

// ── Region sets ───────────────────────────────────────────────────────────────
const TROPICAL_PARKS = new Set([
  'everglades','drytortugas','biscayne','virginislands','americansamoa',
]);
const HAWAII_PARKS = new Set(['haleakala','hawaiivolcanoes']);

function getRegion(parkId) {
  if (TROPICAL_PARKS.has(parkId)) return 'TROPICAL';
  if (HAWAII_PARKS.has(parkId))   return 'HAWAII';
  const lat = PARK_LAT[parkId];
  if (lat === undefined) return 'MID'; // safe fallback
  if (lat >= 44) return 'NORTHERN';
  if (lat >= 35) return 'MID';
  return 'SOUTHERN';
}

// ── Season helpers ────────────────────────────────────────────────────────────
function removeSeason(seasons, seasonToRemove) {
  if (!Array.isArray(seasons)) return seasons;
  if (seasons.includes('year_round')) {
    seasons = ['spring','summer','fall','winter'];
  }
  const result = seasons.filter(s => s !== seasonToRemove);
  return result.length > 0 ? result : ['spring','summer','fall'];
}

// ── Bird pattern helpers ──────────────────────────────────────────────────────

// TRUE = always remove winter (all non-tropical/non-hawaii regions)
const ALWAYS_REMOVE_WINTER = [
  // Swallows / Purple Martin
  /\b(barn|tree|cliff|bank|violet-green|northern rough-winged|cave)\s+swallow\b/i,
  /\bpurple martin\b/i,
  /\bswallow\b/i,
  // Flycatchers / tyrant flycatchers
  /\b(flycatcher|pewee|phoebe|kingbird|wood-pewee|empidonax|tyrant)\b/i,
  // Nighthawks / nightjars
  /\b(nighthawk|nightjar|chuck-will|whip-poor|poor-will)\b/i,
  // Cuckoos (exclude roadrunner explicitly)
  /\bcuckoo\b/i,
  /\bani\b/i,
  // Bobolink / Dickcissel
  /\b(bobolink|dickcissel)\b/i,
];

// TRUE = remove winter in NORTHERN parks (lat >= 44)
const NORTHERN_REMOVE_WINTER = [
  /\bwarbler\b/i,
  /\bvireo\b/i,
  /\btanager\b/i,
  /\boriole\b/i,
  // Migratory thrushes
  /\b(veery|swainson'?s thrush|wood thrush|gray-cheeked thrush|bicknell'?s thrush)\b/i,
  /\bveery\b/i,
  /\bhummingbird\b/i,
  // Migratory grosbeaks
  /\b(rose-breasted|blue grosbeak)\b/i,
  // Migratory buntings (NOT Snow Bunting)
  /\b(indigo|lazuli|painted|varied) bunting\b/i,
  /\bkinglet\b/i,
  /\bbrown creeper\b/i,
];

// TRUE = remove winter in NORTHERN + MID parks (lat >= 35)
const NORTHERN_MID_REMOVE_WINTER = [
  /\bchimney swift\b/i,
  /\bruby-throated hummingbird\b/i,
];

// Migratory raptors — remove winter regardless of other raptor rules
const MIGRATORY_RAPTOR_PATTERN = /\b(broad-winged hawk|swainson'?s hawk|mississippi kite)\b/i;

// ── KEEP-WINTER guards (checked BEFORE apply-remove logic) ──────────────────
// If any of these match, winter is KEPT regardless of other patterns.
const ALWAYS_KEEP_WINTER = [
  /\bowl\b/i,
  /\b(woodpecker|flicker|sapsucker)\b/i,
  /\b(jay|crow|raven|magpie|nutcracker)\b/i,
  /\b(chickadee|titmouse)\b/i,
  /\bnuthatch\b/i,
  /\b(finch|crossbill|redpoll|siskin|goldfinch)\b/i,
  /\bsnow bunting\b/i,
  // Waterfowl
  /\b(duck|goose|geese|swan|merganser|teal|wigeon|scaup|goldeneye|bufflehead|canvasback|redhead|pintail|shoveler|gadwall)\b/i,
  // Shorebirds that winter
  /\b(dunlin|sanderling|knot|dowitcher|turnstone)\b/i,
  // Gulls (not terns)
  /\bgull\b/i,
  // Dark-eyed Junco
  /\bdark-eyed junco\b/i,
  // American Robin (some winter)
  /\bamerican robin\b/i,
];

// ── Special-case overrides (evaluated after region logic) ────────────────────
// Returns null (= apply normal logic) or 'keep' / 'remove'
function specialCaseOverride(name, lat) {
  // Eastern Phoebe: keep winter in southern/mid (lat < 40), remove in northern
  if (/\beastern phoebe\b/i.test(name)) {
    return lat < 40 ? 'keep' : 'remove';
  }
  // Yellow-rumped Warbler: keep winter in southern parks (lat < 38)
  if (/\byellow-rumped warbler\b/i.test(name)) {
    return lat < 38 ? 'keep' : 'remove';
  }
  // Palm Warbler: keep winter in southern/Florida parks (lat < 32)
  if (/\bpalm warbler\b/i.test(name)) {
    return lat < 32 ? 'keep' : 'remove';
  }
  // Hermit Thrush: keep winter in southern parks (lat < 36)
  if (/\bhermit thrush\b/i.test(name)) {
    return lat < 36 ? 'keep' : 'remove';
  }
  // Roadrunner: never remove winter (resident)
  if (/\broadrunner\b/i.test(name)) {
    return 'keep';
  }
  return null;
}

// ── Main logic: should winter be removed for this bird in this park? ─────────
function shouldRemoveWinter(name, parkId) {
  const region = getRegion(parkId);
  const lat    = PARK_LAT[parkId] ?? 38;

  // Tropical / Hawaii: never remove winter from birds
  if (region === 'TROPICAL' || region === 'HAWAII') return false;

  // Migratory raptors: always remove winter
  if (MIGRATORY_RAPTOR_PATTERN.test(name)) return true;

  // KEEP-WINTER guards: if any match, never remove
  if (ALWAYS_KEEP_WINTER.some(p => p.test(name))) return false;

  // Special case overrides
  const override = specialCaseOverride(name, lat);
  if (override === 'keep') return false;
  if (override === 'remove') return true;

  // Terns: remove winter (not gulls)
  if (/\btern\b/i.test(name)) return true;

  // Always-remove patterns (all non-tropical)
  if (ALWAYS_REMOVE_WINTER.some(p => p.test(name))) return true;

  // Northern + Mid remove (lat >= 35)
  if (lat >= 35 && NORTHERN_MID_REMOVE_WINTER.some(p => p.test(name))) return true;

  // Northern-only remove (lat >= 44)
  if (lat >= 44 && NORTHERN_REMOVE_WINTER.some(p => p.test(name))) return true;

  return false;
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  const cacheUrl = new URL('../src/data/wildlifeCache.js', import.meta.url).href;
  const { WILDLIFE_CACHE } = await import(cacheUrl);
  const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

  const stats = {
    parksProcessed: 0,
    birdsPatched: 0,
    byRegion: { NORTHERN: 0, MID: 0, SOUTHERN: 0 },
    byPark: {},
  };

  // Capture Acadia bird count before (to verify no modification)
  const acadiaBefore = (cache['acadia']?.animals ?? []).filter(a => a.animalType === 'bird').length;

  for (const [parkId, parkData] of Object.entries(cache)) {
    // ── SKIP Acadia — already correct ────────────────────────────────────────
    if (parkId === 'acadia') continue;

    const animals = parkData.animals ?? [];
    const region  = getRegion(parkId);
    let parkPatched = 0;

    for (const animal of animals) {
      if (animal.animalType !== 'bird') continue;

      const hasWinter = (animal.seasons ?? []).includes('winter') ||
                        (animal.seasons ?? []).includes('year_round');
      if (!hasWinter) continue;

      if (shouldRemoveWinter(animal.name, parkId)) {
        animal.seasons = removeSeason(animal.seasons, 'winter');
        stats.birdsPatched++;
        parkPatched++;
        if (stats.byRegion[region] !== undefined) stats.byRegion[region]++;
      }
    }

    if (parkPatched > 0) {
      stats.parksProcessed++;
      stats.byPark[parkId] = parkPatched;
    }
  }

  // ── Verify Acadia was not modified ────────────────────────────────────────
  const acadiaAfter = (cache['acadia']?.animals ?? []).filter(a => a.animalType === 'bird').length;

  // ── Stats for 5 key parks ─────────────────────────────────────────────────
  const KEY_PARKS = ['yellowstone','everglades','greatsmokymountains','olympic','bigbend'];
  const keyParkStats = {};
  for (const pid of KEY_PARKS) {
    const birds = (cache[pid]?.animals ?? []).filter(a => a.animalType === 'bird');
    const hasSeason = s => birds.filter(b =>
      (b.seasons ?? []).includes(s) || (b.seasons ?? []).includes('year_round')
    ).length;
    keyParkStats[pid] = {
      total: birds.length,
      summer: hasSeason('summer'),
      winter: hasSeason('winter'),
    };
  }

  // ── Console report ────────────────────────────────────────────────────────
  console.log('\n=== BIRD SEASON PATCH STATS ===');
  console.log(`  Parks processed (had birds patched): ${stats.parksProcessed}`);
  console.log(`  Total birds with winter removed:     ${stats.birdsPatched}`);
  console.log(`  By region:`);
  console.log(`    NORTHERN (lat >= 44): ${stats.byRegion.NORTHERN}`);
  console.log(`    MID      (35-44):     ${stats.byRegion.MID}`);
  console.log(`    SOUTHERN (< 35):      ${stats.byRegion.SOUTHERN}`);

  console.log('\n=== KEY PARK BIRD SEASON SUMMARY ===');
  for (const [pid, s] of Object.entries(keyParkStats)) {
    console.log(`  ${pid.padEnd(24)} total=${s.total}  summer=${s.summer}  winter=${s.winter}`);
  }

  console.log('\n=== TOP PARKS BY BIRDS PATCHED ===');
  const sorted = Object.entries(stats.byPark).sort((a,b) => b[1]-a[1]).slice(0,15);
  for (const [pid, n] of sorted) {
    console.log(`  ${pid.padEnd(24)} ${n} birds patched`);
  }

  console.log('\n=== ACADIA VERIFICATION ===');
  console.log(`  Bird count before: ${acadiaBefore}`);
  console.log(`  Bird count after:  ${acadiaAfter}`);
  console.log(`  Modified: ${acadiaBefore !== acadiaAfter ? '⚠️  YES — ERROR!' : 'NO ✓ (correct)'}`);

  // ── Write cache ───────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const totalSpecies = Object.values(cache).reduce((n,p) => n + (p.animals?.length ?? 0), 0);
  const out = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${now}`,
    `// Parks: ${Object.keys(cache).length} | Species bundled: ${totalSpecies}`,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(now)};`,
    ``,
    `export const WILDLIFE_CACHE = ${JSON.stringify(cache, null, 2)};`,
  ].join('\n');
  fs.writeFileSync(CACHE_PATH, out, 'utf8');
  console.log(`\nCache written. Total species: ${totalSpecies}`);
}

main().catch(err => { console.error(err); process.exit(1); });
