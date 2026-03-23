/**
 * patchAcadiaSeasons.mjs
 * Fixes hardcoded all-4-season fallback for Acadia birds using:
 *   1. eBird taxonomy → family name → seasonal rules
 *   2. eBird-confirmed winter species as hard overrides
 *
 * Uses in-memory modification + full file rewrite (avoids multiline text replacement issues)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');
const EBIRD_KEY  = 'ssijljl3h4jd';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── eBird-confirmed winter species at Acadia (from real January checklists) ──
const EBIRD_CONFIRMED_WINTER = new Set([
  'Common Eider','King Eider','Surf Scoter','White-winged Scoter','Black Scoter',
  'Long-tailed Duck','Bufflehead','Common Goldeneye',"Barrow's Goldeneye",
  'Hooded Merganser','Common Merganser','Red-breasted Merganser','Greater Scaup',
  'Lesser Scaup','Canada Goose','Mallard','American Black Duck','Green-winged Teal',
  'Northern Pintail','American Wigeon','Canvasback','Redhead','Ring-necked Duck',
  'Razorbill','Common Murre','Thick-billed Murre','Black Guillemot','Dovekie',
  'Atlantic Puffin','Common Loon','Red-throated Loon','Horned Grebe','Red-necked Grebe',
  'Northern Gannet','Great Cormorant','Double-crested Cormorant',
  'Herring Gull','Great Black-backed Gull','Ring-billed Gull','Iceland Gull',
  'Glaucous Gull','Black-legged Kittiwake',"Bonaparte's Gull",'Purple Sandpiper',
  'Bald Eagle','Red-tailed Hawk','Sharp-shinned Hawk',"Cooper's Hawk",
  'Rough-legged Hawk','Northern Harrier','Peregrine Falcon','Merlin',
  'American Kestrel','Snowy Owl','Great Horned Owl','Barred Owl','Short-eared Owl',
  'Black-capped Chickadee','Tufted Titmouse','White-breasted Nuthatch',
  'Red-breasted Nuthatch','Brown Creeper','Golden-crowned Kinglet',
  'Ruby-crowned Kinglet','American Robin','Hermit Thrush','Eastern Bluebird',
  'Dark-eyed Junco','White-throated Sparrow','American Tree Sparrow',
  'Song Sparrow','Swamp Sparrow','Fox Sparrow','Snow Bunting','Lapland Longspur',
  'Common Raven','American Crow','Blue Jay','Downy Woodpecker','Hairy Woodpecker',
  'Pileated Woodpecker','Black-backed Woodpecker','Northern Flicker',
  'Yellow-bellied Sapsucker','Red-bellied Woodpecker','White-winged Crossbill',
  'Red Crossbill','Pine Siskin','American Goldfinch','Purple Finch','House Finch',
  'Common Redpoll','Hoary Redpoll','Evening Grosbeak','Pine Grosbeak',
  'Cedar Waxwing','Brown-headed Cowbird','European Starling','House Sparrow',
  'Northern Mockingbird','Carolina Wren','Winter Wren','Marsh Wren',
  'Northern Shrike','Bohemian Waxwing','Horned Lark','Red-winged Blackbird',
  'Common Grackle',
]);

// ─── Family-based seasonal rules ─────────────────────────────────────────────
// null = year_round; array = specific seasons present
const FAMILY_RULES = {
  // SUMMER ONLY
  'Hummingbirds':                           ['summer'],
  'Swifts':                                 ['summer'],
  'Nightjars and Allies':                   ['summer'],
  'Cuckoos':                                ['spring','summer','fall'],

  // SPRING/SUMMER/FALL (leave in winter)
  'Swallows':                               ['spring','summer','fall'],
  'Tyrant Flycatchers':                     ['spring','summer','fall'],
  'Vireos':                                 ['spring','summer','fall'],
  'New World Warblers':                     ['spring','summer','fall'],
  'Thrushes':                               ['spring','summer','fall'],
  'Wrens':                                  ['spring','summer','fall'],
  'Catbirds, Mockingbirds, and Thrashers':  ['spring','summer','fall'],
  'Orioles and Blackbirds':                 ['spring','summer','fall'],
  'Tanagers':                               ['spring','summer','fall'],
  'Grosbeaks and Buntings':                 ['spring','summer','fall'],
  'Rails, Gallinules, and Coots':           ['spring','summer','fall'],
  'Herons, Egrets, and Bitterns':           ['spring','summer','fall'],
  'Osprey':                                 ['spring','summer','fall'],
  'Kingfishers':                            ['spring','summer','fall'],
  'Flycatchers':                            ['spring','summer','fall'],

  // FALL/WINTER/SPRING (breed further north)
  'Longspurs and Snow Buntings':            ['fall','winter','spring'],

  // SHOREBIRDS — spring and fall migrants primarily
  'Sandpipers and Allies':                  ['spring','fall'],
  'Plovers':                                ['spring','summer','fall'],
  'Oystercatchers':                         ['spring','summer','fall'],

  // YEAR ROUND
  'Woodpeckers':                            null,
  'Chickadees and Titmice':                 null,
  'Nuthatches':                             null,
  'Creepers':                               null,
  'Corvids, Jays, and Magpies':             null,
  'Hawks, Eagles, and Kites':               null,
  'Falcons and Caracaras':                  null,
  'Owls':                                   null,
  'Barn-Owls':                              null,
  'Gulls, Terns, and Skimmers':             null,
  'Auks, Murres, and Puffins':              null,
  'Loons':                                  null,
  'Grebes':                                 null,
  'Gannets and Boobies':                    null,
  'Cormorants and Shags':                   null,
  'Pigeons and Doves':                      null,
  'Grouse, Quail, and Allies':              null,
  'Ducks, Geese, and Waterfowl':            null,
  'Finches, Euphonias, and Allies':         null,
  'New World Sparrows':                     null,
  'Kinglets':                               null,
  'Old World Sparrows':                     null,
  'Starlings':                              null,
  'Waxwings':                               null,
  'Tits, Chickadees, and Titmice':          null,
  'Crows, Jays, and Magpies':               null,

  // Seabirds — mostly pelagic/winter visitors
  'Shearwaters and Petrels':                ['spring','fall','winter'],
  'Northern Storm-Petrels':                 ['spring','fall','winter'],
  'Southern Storm-Petrels':                 ['spring','fall','winter'],
  'Skuas and Jaegers':                      ['spring','fall'],
  'Tropicbirds':                            ['summer','fall'],
  'Albatrosses':                            ['fall','winter'],
  'Frigatebirds':                           ['summer','fall'],

  // Waterbirds
  'Boobies and Gannets':                    null,
  'Anhingas':                               ['spring','summer','fall'],
  'Ibises and Spoonbills':                  ['spring','summer','fall'],
  'Pelicans':                               ['spring','summer','fall'],
  'Stilts and Avocets':                     ['spring','fall'],
  'Cranes':                                 ['spring','fall'],

  // Passerines
  'Cardinals and Allies':                   ['spring','summer','fall'],
  'Troupials and Allies':                   ['spring','summer','fall'],
  'Mockingbirds and Thrashers':             null,
  'Gnatcatchers':                           ['spring','summer','fall'],
  'Wagtails and Pipits':                    ['spring','fall'],
  'Shrikes':                                ['fall','winter','spring'],
  'Yellow-breasted Chat':                   ['spring','summer','fall'],
  'New World Vultures':                     null,

  // Others
  'New World and African Parrots':          null,
  'Old World Parrots':                      null,
  'Guineafowl':                             null,
  'New World Quail':                        null,
};

function getSeasonsForFamily(familyComName) {
  if (!familyComName) return undefined;
  if (FAMILY_RULES[familyComName] !== undefined) return FAMILY_RULES[familyComName];
  // Partial match
  for (const [key, val] of Object.entries(FAMILY_RULES)) {
    if (familyComName.toLowerCase().includes(key.toLowerCase().split(',')[0]) ||
        key.toLowerCase().includes(familyComName.toLowerCase().split(',')[0])) {
      return val;
    }
  }
  return undefined;
}

async function fetchEbirdTaxonomy() {
  console.log('Fetching eBird taxonomy...');
  const url = `https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&key=${EBIRD_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eBird taxonomy failed: ${res.status}`);
  const data = await res.json();
  // Build sciName → {familyComName, familySciName} lookup
  const lookup = {};
  for (const sp of data) {
    if (sp.sciName) lookup[sp.sciName.toLowerCase()] = { family: sp.familyComName, sciFamily: sp.familySciName };
    if (sp.comName) lookup[sp.comName.toLowerCase()] = { family: sp.familyComName, sciFamily: sp.familySciName };
  }
  console.log(`  Loaded ${data.length} eBird species`);
  return lookup;
}

async function main() {
  // Dynamically import cache (fresh)
  const cacheUrl = new URL('../src/data/wildlifeCache.js', import.meta.url).href;
  const { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } = await import(cacheUrl);

  // Deep clone so we can mutate
  const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

  const acadia = cache['acadia']?.animals ?? [];
  const birds = acadia.filter(a => a.animalType === 'bird');
  const allFourBirds = birds.filter(a =>
    Array.isArray(a.seasons) && a.seasons.length === 4 && !a.seasons.includes('year_round')
  );

  console.log(`Acadia: ${birds.length} birds total`);
  console.log(`  ${allFourBirds.length} with hardcoded all-4 seasons\n`);

  // Count before
  const countSeason = (list, s) => list.filter(b =>
    b.seasons?.includes(s) || b.seasons?.includes('year_round')
  ).length;
  console.log('BEFORE:');
  console.log(`  Spring: ${countSeason(birds,'spring')}, Summer: ${countSeason(birds,'summer')}, Fall: ${countSeason(birds,'fall')}, Winter: ${countSeason(birds,'winter')}`);

  // Fetch eBird taxonomy
  const familyLookup = await fetchEbirdTaxonomy();

  let ebirdOverridden = 0, familyReclassified = 0, madeYearRound = 0, skipped = 0;

  const VERIFY = ['Ruby-throated Hummingbird','Yellow Warbler','Common Eider','Snowy Owl',
                  'Barn Swallow','Black-capped Chickadee','Common Nighthawk','Osprey','American Robin'];

  for (const bird of allFourBirds) {
    const sciName  = bird.scientificName?.toLowerCase();
    const comName  = bird.name?.toLowerCase();
    const taxEntry = (sciName && familyLookup[sciName]) || (comName && familyLookup[comName]);
    const familyName = taxEntry?.family;

    // 1. eBird confirmed winter → year_round
    if (EBIRD_CONFIRMED_WINTER.has(bird.name)) {
      bird.seasons = ['year_round'];
      ebirdOverridden++;
      if (VERIFY.includes(bird.name)) console.log(`  [eBird confirmed] ${bird.name} → year_round`);
      continue;
    }

    // 2. Family-based rules
    const ruleSeason = getSeasonsForFamily(familyName);
    if (ruleSeason === undefined) {
      skipped++;
      if (VERIFY.includes(bird.name)) console.log(`  [SKIPPED - no rule] ${bird.name} | family: ${familyName ?? 'unknown'}`);
      continue;
    }

    if (ruleSeason === null) {
      bird.seasons = ['year_round'];
      madeYearRound++;
      if (VERIFY.includes(bird.name)) console.log(`  [family: ${familyName}] ${bird.name} → year_round`);
    } else {
      bird.seasons = ruleSeason;
      familyReclassified++;
      if (VERIFY.includes(bird.name)) console.log(`  [family: ${familyName}] ${bird.name} → ${JSON.stringify(ruleSeason)}`);
    }
  }

  console.log('\n=== PATCH STATS ===');
  console.log(`  eBird confirmed winter (→ year_round): ${ebirdOverridden}`);
  console.log(`  Family-reclassified to specific seasons: ${familyReclassified}`);
  console.log(`  Made year_round: ${madeYearRound}`);
  console.log(`  Skipped (no family rule found): ${skipped}`);

  // Count after (on in-memory updated birds)
  const updatedBirds = cache['acadia'].animals.filter(a => a.animalType === 'bird');
  console.log('\nAFTER:');
  console.log(`  Spring: ${countSeason(updatedBirds,'spring')}, Summer: ${countSeason(updatedBirds,'summer')}, Fall: ${countSeason(updatedBirds,'fall')}, Winter: ${countSeason(updatedBirds,'winter')}`);

  // Verify specific birds
  console.log('\n=== VERIFY TARGET SPECIES ===');
  for (const name of VERIFY) {
    const b = updatedBirds.find(x => x.name === name);
    const fam = (familyLookup[b?.scientificName?.toLowerCase()] || familyLookup[b?.name?.toLowerCase()])?.family ?? '?';
    console.log(`  ${name} [${fam}]: ${JSON.stringify(b?.seasons ?? 'NOT FOUND')}`);
  }

  // Write updated cache
  const now = new Date().toISOString();
  const totalSpecies = Object.values(cache).reduce((n, p) => n + (p.animals?.length ?? 0), 0);
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
