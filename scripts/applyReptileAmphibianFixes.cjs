'use strict';
/**
 * applyReptileAmphibianFixes.cjs — Comprehensive reptile, amphibian & insect fixes
 *
 * Reads audit results from reptileAmphibianAudit_results.json and applies:
 *  S1. Add 187 missing reptiles (≥20 obs)
 *  S2. Add 63 missing amphibians (≥15 obs)
 *  S3. Fix 11 reptile rarity mismatches
 *  S4. Fix 10 amphibian rarity mismatches
 *  S5. Remove winter from all reptiles/amphibians at northern parks
 *  S6. Add priority insects at 4 flagship parks
 *
 * Run: node scripts/applyReptileAmphibianFixes.cjs
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT        = path.join(__dirname, '..');
const CACHE_PATH  = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const AUDIT_PATH  = path.join(__dirname, 'reptileAmphibianAudit_results.json');

// ── Parks where reptiles/amphibians CAN show winter (warm/tropical) ────────────
// User-specified: Everglades, Big Bend, Saguaro, Joshua Tree, Death Valley,
// Biscayne, Dry Tortugas, Virgin Islands. Added: Hawaii, Samoa (tropical).
const KEEP_WINTER_PARKS = new Set([
  'everglades','bigbend','saguaro','joshuatree','deathvalley',
  'biscayne','drytortugas','virginislands',
  'americansamoa','hawaiivolcanoes','haleakala',
]);

const ALL_SEASONS    = ['spring','summer','fall','winter'];
const ACTIVE_SEASONS = ['spring','summer','fall'];

function seasons(parkId) {
  return KEEP_WINTER_PARKS.has(parkId) ? ALL_SEASONS : ACTIVE_SEASONS;
}

const RARITY_RANK = {guaranteed:6,very_likely:5,likely:4,unlikely:3,rare:2,exceptional:1};

// ── Emoji & type helpers ───────────────────────────────────────────────────────
function reptileEmoji(name) {
  const l = name.toLowerCase();
  if (/\b(snake|boa|racer|rattlesnake|kingsnake|garter|copperhead|cottonmouth|moccasin|coral snake|whipsnake|ribbon snake|watersnake|ringneck|ring.neck|hognose|mudsnake|sidewinder|bullsnake|patchnose|lyresnake|coachwhip|saddled)\b/.test(l)) return '🐍';
  if (/\b(turtle|tortoise|slider|painted turtle|map turtle|box turtle|snapping|cooter|mud turtle|softshell|musk turtle)\b/.test(l)) return '🐢';
  if (/\b(alligator|crocodile|caiman)\b/.test(l)) return '🐊';
  return '🦎';
}
function amphibianEmoji(name) {
  const l = name.toLowerCase();
  if (/\b(salamander|newt|siren|mudpuppy|amphiuma|hellbender|waterdog)\b/.test(l)) return '🦎';
  return '🐸';
}
function insectEmoji(name) {
  const l = name.toLowerCase();
  if (/\b(firefly|lightning bug|synchronous)\b/.test(l)) return '✨';
  if (/\b(bee|bumble|honey bee|digger bee)\b/.test(l)) return '🐝';
  if (/\b(beetle|sawyer|fungus beetle|milkweed beetle|lady beetle|ladybug|borer)\b/.test(l)) return '🐞';
  if (/\b(grasshopper|cricket|katydid|locust)\b/.test(l)) return '🦗';
  if (/\b(dragonfly|meadowhawk|spreadwing|darner|skimmer)\b/.test(l)) return '🪲';
  // butterflies & moths
  return '🦋';
}

// ── Rarity from obs count (reptile/amphibian thresholds, no charisma) ─────────
function rarityFromObs(obsCount, name='') {
  const l = (name||'').toLowerCase();
  let c = obsCount;
  if (/\b(sea turtle|green turtle|hawksbill|loggerhead|leatherback|ridley)\b/.test(l)) c = obsCount/3;
  else if (/\b(rattlesnake|copperhead|cottonmouth|water moccasin|coral snake)\b/.test(l)) c = obsCount*2;
  else if (/\bsnake\b/.test(l)) c = obsCount*1.5;
  if (c >= 500) return 'very_likely';
  if (c >= 100) return 'likely';
  if (c >= 20)  return 'unlikely';
  if (c >= 5)   return 'rare';
  return 'exceptional';
}

// ── Build animal entry from audit result ──────────────────────────────────────
function makeReptile(r, parkId) {
  return {
    name: r.name, emoji: reptileEmoji(r.name), animalType: 'reptile',
    rarity: r.suggestedRarity, seasons: seasons(parkId),
    scientificName: r.scientificName,
    funFact: `${r.obsCount} research-grade iNaturalist observations at this park.`,
    photoUrl: null, source: 'inaturalist', sources: ['inaturalist'],
    description: null, descriptionSource: null,
  };
}
function makeAmphibian(a, parkId) {
  return {
    name: a.name, emoji: amphibianEmoji(a.name), animalType: 'amphibian',
    rarity: a.suggestedRarity, seasons: seasons(parkId),
    scientificName: a.scientificName,
    funFact: `${a.obsCount} research-grade iNaturalist observations at this park.`,
    photoUrl: null, source: 'inaturalist', sources: ['inaturalist'],
    description: null, descriptionSource: null,
  };
}
function makeInsect(name, sci, emoji, rarity, pkSeasons, obsOrFact) {
  const funFact = typeof obsOrFact === 'number'
    ? `${obsOrFact} research-grade iNaturalist observations at this park.`
    : obsOrFact;
  return {
    name, emoji, animalType: 'insect', rarity, seasons: pkSeasons,
    scientificName: sci, funFact,
    photoUrl: null, source: 'inaturalist', sources: ['inaturalist'],
    description: null, descriptionSource: null,
  };
}

// ── Load cache ─────────────────────────────────────────────────────────────────
function loadCache() {
  const src = fs.readFileSync(CACHE_PATH,'utf8');
  const cjs = src
    .replace('export const WILDLIFE_CACHE_BUILT_AT','const WILDLIFE_CACHE_BUILT_AT')
    .replace('export const WILDLIFE_CACHE','const WILDLIFE_CACHE')
    .replace('export default WILDLIFE_CACHE;','')
    + '\nmodule.exports={WILDLIFE_CACHE,WILDLIFE_CACHE_BUILT_AT};';
  const tmp = path.join(os.tmpdir(),'_rafix_tmp.cjs');
  fs.writeFileSync(tmp,cjs);
  delete require.cache[require.resolve(tmp)];
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return { cache: mod.WILDLIFE_CACHE, builtAt: mod.WILDLIFE_CACHE_BUILT_AT };
}

// ── Save cache ─────────────────────────────────────────────────────────────────
function saveCache(cache, builtAt) {
  const ts = new Date().toISOString();
  let out = `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.\n`;
  out += `// Built: ${builtAt}\n`;
  out += `// Reptile/Amphibian/Insect fixes applied: ${ts}\n`;
  out += `// Parks: ${Object.keys(cache).length} | Species: ${Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0)}\n\n`;
  out += `export const WILDLIFE_CACHE_BUILT_AT = "${builtAt}";\n\n`;
  out += `export const WILDLIFE_CACHE = ${JSON.stringify(cache,null,2)};\n\nexport default WILDLIFE_CACHE;\n`;
  fs.writeFileSync(CACHE_PATH,out,'utf8');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function findAnimal(animals, name) {
  const n = name.toLowerCase().trim();
  return animals.find(a => {
    const an = (a.name||'').toLowerCase().trim();
    return an===n || an.includes(n) || n.includes(an);
  });
}

const stats = {
  added:0, skipped:0, rarityFixed:0, seasonFixed:0, notFound:0,
  log: [],
};

function addIfMissing(animals, animal) {
  const existing = findAnimal(animals, animal.name);
  if (existing) { stats.skipped++; return false; }
  animals.push(animal);
  stats.added++;
  return true;
}

function fixRarity(animals, name, newRarity, context='') {
  const a = findAnimal(animals, name);
  if (!a) { stats.notFound++; return; }
  if (a.rarity === newRarity) return;
  const old = a.rarity;
  a.rarity = newRarity;
  stats.rarityFixed++;
  stats.log.push(`  ${context}${a.name}: ${old} → ${newRarity}`);
}

function isReptile(a) {
  return ['reptile','snake','lizard','turtle','gecko','skink'].includes(a.animalType) ||
    /\b(lizard|snake|turtle|tortoise|gecko|skink|iguana|anole|alligator|crocodile|caiman|boa|racer)\b/i.test(a.name);
}
function isAmphibian(a) {
  return ['amphibian','frog','toad','salamander','newt'].includes(a.animalType) ||
    /\b(frog|toad|salamander|newt|siren|mudpuppy|treefrog|spadefoot|peeper|bullfrog)\b/i.test(a.name);
}

// ── Section 6: Hardcoded flagship insects ─────────────────────────────────────
const FLAGSHIP_INSECTS = {
  greatsmokymountains: [
    makeInsect('Synchronous Firefly', 'Photinus carolinus', '✨', 'rare', ['summer'],
      'The synchronous fireflies of Great Smoky Mountains are world-famous — thousands flash in perfect unison for two weeks each June, drawing visitors from around the globe.'),
    makeInsect('Harlequin Fungus Beetle', 'Megalodacne heros', '🐞', 'very_likely', ACTIVE_SEASONS, 650),
  ],
  saguaro: [
    makeInsect("Empress Leilia",        "Asterocampa leilia",        '🦋','likely',   ALL_SEASONS, 389),
    makeInsect("American Snout",        "Libytheana carinenta",      '🦋','likely',   ALL_SEASONS, 320),
    makeInsect("Dainty Sulphur",        "Nathalis iole",             '🦋','likely',   ALL_SEASONS, 215),
    makeInsect("Ceraunus Blue",         "Hemiargus ceraunus",        '🦋','likely',   ALL_SEASONS, 201),
    makeInsect("Reakirt's Blue",        "Echinargus isola",          '🦋','likely',   ALL_SEASONS, 178),
    makeInsect("Western Honey Bee",     "Apis mellifera",            '🐝','likely',   ALL_SEASONS, 171),
    makeInsect("Marine Blue",           "Leptotes marina",           '🦋','likely',   ALL_SEASONS, 164),
    makeInsect("Queen",                 "Danaus gilippus",           '🦋','likely',   ALL_SEASONS, 144),
    makeInsect("Tiny Checkerspot",      "Dymasia dymas",             '🦋','likely',   ALL_SEASONS, 143),
    makeInsect("Painted Lady",          "Vanessa cardui",            '🦋','likely',   ALL_SEASONS, 140),
  ],
  yosemite: [
    makeInsect("California Sister",     "Adelpha californica",       '🦋','very_likely', ACTIVE_SEASONS, 504),
    makeInsect("Convergent Lady Beetle","Hippodamia convergens",     '🐞','likely',   ACTIVE_SEASONS, 231),
    makeInsect("Pale Swallowtail",      "Papilio eurymedon",         '🦋','likely',   ACTIVE_SEASONS, 201),
    makeInsect("Yellow-faced Bumble Bee","Bombus vosnesenskii",      '🐝','likely',   ACTIVE_SEASONS, 199),
    makeInsect("Cobalt Milkweed Beetle","Chrysochus cobaltinus",     '🐞','likely',   ACTIVE_SEASONS, 164),
    makeInsect("California Tortoiseshell","Nymphalis californica",   '🦋','likely',   ACTIVE_SEASONS, 162),
    makeInsect("Mormon Fritillary",     "Speyeria mormonia",         '🦋','likely',   ACTIVE_SEASONS, 156),
    makeInsect("Clodius Parnassian",    "Parnassius clodius",        '🦋','likely',   ACTIVE_SEASONS, 150),
    makeInsect("Monarch",               "Danaus plexippus",          '🦋','unlikely', ['summer','fall'], 102),
    makeInsect("Shasta Blue",           "Plebejus shasta",           '🦋','unlikely', ACTIVE_SEASONS, 180),
  ],
  rockymountain: [
    makeInsect("Rocky Mountain Parnassian","Parnassius smintheus",   '🦋','likely',   ACTIVE_SEASONS, 259),
    makeInsect("Spotted Tussock Moth",  "Lophocampa maculata",       '🦋','likely',   ACTIVE_SEASONS, 200),
    makeInsect("Weidemeyer's Admiral",  "Limenitis weidemeyerii",    '🦋','likely',   ACTIVE_SEASONS, 199),
    makeInsect("Hoary Comma",           "Polygonia gracilis",        '🦋','likely',   ACTIVE_SEASONS, 181),
    makeInsect("Police Car Moth",       "Gnophaela vermiculata",     '🦋','likely',   ACTIVE_SEASONS, 175),
    makeInsect("White-spotted Sawyer",  "Monochamus scutellatus",    '🐞','likely',   ACTIVE_SEASONS, 171),
    makeInsect("Red Admiral",           "Vanessa atalanta",          '🦋','unlikely', ACTIVE_SEASONS, 85),
    makeInsect("Small Wood-Nymph",      "Cercyonis oetus",           '🦋','unlikely', ACTIVE_SEASONS, 83),
    makeInsect("Dorcas Copper",         "Lycaena dorcas",            '🦋','unlikely', ACTIVE_SEASONS, 80),
    makeInsect("Mead's Sulphur",        "Colias meadii",             '🦋','unlikely', ACTIVE_SEASONS, 75),
  ],
};

// ── Section 3: Reptile rarity fixes ───────────────────────────────────────────
const REPTILE_RARITY_FIXES = [
  { park:'everglades',  name:'American Crocodile',             newRarity:'very_likely' },
  { park:'bigbend',     name:'Western Diamond-backed Rattlesnake', newRarity:'very_likely' },
  { park:'shenandoah',  name:'Timber Rattlesnake',             newRarity:'likely'      },
  { park:'saguaro',     name:'Desert Spiny Lizard',            newRarity:'likely'      },
  { park:'congaree',    name:'American Alligator',             newRarity:'likely'      },
  { park:'virginislands',name:'Green Iguana',                  newRarity:'likely'      },
  { park:'biscayne',    name:'American Alligator',             newRarity:'exceptional' },
];

// ── Section 4: Amphibian rarity fixes ─────────────────────────────────────────
const AMPHIB_RARITY_FIXES = [
  { park:'greatsmokymountains', name:'Red Salamander',  newRarity:'likely'      },
  { park:'shenandoah',          name:'Spring Peeper',   newRarity:'exceptional' },
  // North Cascades: Cascades Frog + Western Toad had 2 obs each → exceptional is right
  // Already at exceptional in cache (suggested exceptional from 2 obs)
];

// ════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════
function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Reptile / Amphibian / Insect Fixes');
  console.log('══════════════════════════════════════════════════════════════\n');

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH,'utf8'));
  const { cache, builtAt } = loadCache();
  const before = Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0);

  // Group audit results by park
  const reptilesByPark  = {};
  const amphibsByPark   = {};
  for (const r of audit.missingReptiles)   { if(!reptilesByPark[r.park])  reptilesByPark[r.park] =[];  reptilesByPark[r.park].push(r);  }
  for (const a of audit.missingAmphibians) { if(!amphibsByPark[a.park])   amphibsByPark[a.park]  =[];  amphibsByPark[a.park].push(a);   }

  // ── S1: Add missing reptiles ───────────────────────────────────────────────
  console.log('── S1: Adding missing reptiles ────────────────────────────────');
  let parkCount = 0;
  for (const [parkId, reptiles] of Object.entries(reptilesByPark)) {
    if (!cache[parkId]) continue;
    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const r of reptiles) {
      if (addIfMissing(parkAnimals, makeReptile(r, parkId))) parkAdded++;
    }
    if (parkAdded > 0) {
      console.log(`  [${parkId}] +${parkAdded} reptiles`);
      parkCount++;
    }
  }
  console.log(`  → ${parkCount} parks updated`);

  // ── S2: Add missing amphibians ────────────────────────────────────────────
  console.log('\n── S2: Adding missing amphibians ──────────────────────────────');
  parkCount = 0;
  for (const [parkId, amphib] of Object.entries(amphibsByPark)) {
    if (!cache[parkId]) continue;
    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const a of amphib) {
      if (addIfMissing(parkAnimals, makeAmphibian(a, parkId))) parkAdded++;
    }
    if (parkAdded > 0) {
      console.log(`  [${parkId}] +${parkAdded} amphibians`);
      parkCount++;
    }
  }
  console.log(`  → ${parkCount} parks updated`);

  // ── S3: Fix reptile rarity mismatches ────────────────────────────────────
  console.log('\n── S3: Reptile rarity fixes ───────────────────────────────────');
  for (const fix of REPTILE_RARITY_FIXES) {
    if (!cache[fix.park]) continue;
    fixRarity(cache[fix.park].animals, fix.name, fix.newRarity, `[${fix.park}] `);
  }
  stats.log.forEach(l => console.log(l));
  stats.log.length = 0;

  // ── S4: Fix amphibian rarity mismatches ───────────────────────────────────
  console.log('\n── S4: Amphibian rarity fixes ─────────────────────────────────');
  for (const fix of AMPHIB_RARITY_FIXES) {
    if (!cache[fix.park]) continue;
    fixRarity(cache[fix.park].animals, fix.name, fix.newRarity, `[${fix.park}] `);
  }
  stats.log.forEach(l => console.log(l));
  stats.log.length = 0;

  // ── S5: Seasonal fixes — remove winter from reptiles/amphibians ───────────
  console.log('\n── S5: Seasonal fixes (remove winter from cold-blooded) ────────');
  let seasonTotal = 0;
  for (const [parkId, parkData] of Object.entries(cache)) {
    if (KEEP_WINTER_PARKS.has(parkId)) continue;
    let parkFixed = 0;
    for (const a of parkData.animals || []) {
      if (!isReptile(a) && !isAmphibian(a)) continue;
      if (!a.seasons?.includes('winter')) continue;
      a.seasons = a.seasons.filter(s => s !== 'winter');
      // Ensure at least some seasons remain
      if (!a.seasons.length) a.seasons = ['spring','summer','fall'];
      stats.seasonFixed++;
      parkFixed++;
      seasonTotal++;
    }
    if (parkFixed > 0) console.log(`  [${parkId}] removed winter from ${parkFixed} reptile/amphibian(s)`);
  }
  console.log(`  → ${seasonTotal} total seasonal fixes`);

  // ── S6: Add flagship insects ──────────────────────────────────────────────
  console.log('\n── S6: Adding flagship insects ────────────────────────────────');
  for (const [parkId, insects] of Object.entries(FLAGSHIP_INSECTS)) {
    if (!cache[parkId]) continue;
    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const insect of insects) {
      if (addIfMissing(parkAnimals, insect)) parkAdded++;
    }
    if (parkAdded > 0) console.log(`  [${parkId}] +${parkAdded} insects`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const after = Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  Animals added:         ${stats.added}  (${before} → ${after})`);
  console.log(`  Rarity corrections:    ${stats.rarityFixed}`);
  console.log(`  Seasonal fixes:        ${stats.seasonFixed}`);
  console.log(`  Skipped (duplicates):  ${stats.skipped}`);
  console.log(`  Not found:             ${stats.notFound}`);
  console.log('══════════════════════════════════════════════════════════════\n');

  saveCache(cache, builtAt);
  console.log(`✓ Written: ${after} total animals`);
}

main();
