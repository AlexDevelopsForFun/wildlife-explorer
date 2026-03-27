'use strict';
/**
 * marineAuditAndFix.cjs — Marine fish & invertebrate audit + immediate fixes
 *
 * Fetches iNat data, adds all missing species above threshold, fixes seasonal
 * accuracy for salmon, saves cache in one pass.
 *
 * Run: node scripts/marineAuditAndFix.cjs
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT       = path.join(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');

// ── iNat place IDs ────────────────────────────────────────────────────────────
const INAT_PLACE_IDS = {
  yellowstone:10211, everglades:53957, acadia:49610, shenandoah:9012,
  congaree:53620, grandteton:69099, rockymountain:49676, glacier:72841,
  olympic:69094, biscayne:95108, drytortugas:70571, grandcanyon:69216,
  channelislands:3157, kenaifjords:95258, glacierbay:69113, katmai:95257,
  virginislands:95336, americansamoa:73645,
};

// ── Parks and their categories ────────────────────────────────────────────────
// Coastal saltwater fish parks (Actinopterygii, threshold ≥50)
const COASTAL_FISH_PARKS = [
  'channelislands','kenaifjords','biscayne','virginislands','drytortugas',
  'olympic','acadia','everglades','americansamoa',
];
// Freshwater fish parks (Actinopterygii, threshold ≥30)
const FRESHWATER_FISH_PARKS = [
  'yellowstone','grandteton','olympic','rockymountain','glacier',
  'everglades','congaree','shenandoah',
];
// Island parks for marine invertebrates (Mollusca + Echinodermata, threshold ≥100)
const INVERTEBRATE_PARKS = [
  'virginislands','drytortugas','americansamoa','biscayne','channelislands',
];

// ── Season rules ──────────────────────────────────────────────────────────────
const ALL_SEASONS    = ['spring','summer','fall','winter'];
const ACTIVE_SEASONS = ['spring','summer','fall'];
const SALMON_SEASONS = ['summer','fall'];

// Tropical parks — fish are year-round
const TROPICAL_PARKS = new Set([
  'virginislands','drytortugas','biscayne','americansamoa',
  'hawaiivolcanoes','haleakala','everglades',
]);
// Freshwater fish — year-round (active under ice)
const FRESHWATER_YEAR_ROUND = new Set([
  'yellowstone','grandteton','rockymountain','glacier','congaree','shenandoah',
]);

function fishSeasons(parkId, name) {
  const l = (name||'').toLowerCase();
  // Salmon: migratory, summer/fall only at Alaska parks
  if (/\b(salmon|steelhead)\b/.test(l) &&
      ['kenaifjords','glacierbay','katmai','wrangellstelias','lakeclark','denali'].includes(parkId))
    return SALMON_SEASONS;
  if (TROPICAL_PARKS.has(parkId)) return ALL_SEASONS;
  if (FRESHWATER_YEAR_ROUND.has(parkId)) return ALL_SEASONS;
  return ACTIVE_SEASONS;
}

// ── Emoji helpers ─────────────────────────────────────────────────────────────
function fishEmoji(name) {
  const l = (name||'').toLowerCase();
  if (/\b(shark|ray|skate)\b/.test(l)) return '🦈';
  if (/\b(garibaldi|damselfish|parrotfish|angelfish|butterflyfish|triggerfish|tang|surgeonfish|wrasse|clownfish|anthias)\b/.test(l)) return '🐠';
  if (/\b(salmon|trout|char|steelhead|grayling)\b/.test(l)) return '🐟';
  return '🐟';
}
function invertEmoji(name) {
  const l = (name||'').toLowerCase();
  if (/\b(octopus|squid|cuttlefish)\b/.test(l)) return '🐙';
  if (/\b(star|starfish|seastar|urchin)\b/.test(l)) return '⭐';
  if (/\b(crab|lobster|shrimp)\b/.test(l)) return '🦀';
  if (/\b(snail|slug|whelk|conch|abalone|limpet|cowrie|oyster|clam|mussel|scallop)\b/.test(l)) return '🐚';
  return '🐚';
}

// ── Rarity from obs count ─────────────────────────────────────────────────────
function rarityFromObs(obsCount, name='') {
  const l = (name||'').toLowerCase();
  let c = obsCount;
  if (/\b(whale|dolphin|orca|shark|ray)\b/.test(l)) c = obsCount / 3;
  if (c >= 500) return 'very_likely';
  if (c >= 100) return 'likely';
  if (c >= 20)  return 'unlikely';
  if (c >= 5)   return 'rare';
  return 'exceptional';
}

// ── Build animal entries ───────────────────────────────────────────────────────
function makeFish(r, parkId) {
  return {
    name: r.name, emoji: fishEmoji(r.name), animalType: 'marine',
    rarity: rarityFromObs(r.obsCount, r.name),
    seasons: fishSeasons(parkId, r.name),
    scientificName: r.scientificName,
    funFact: `${r.obsCount} research-grade iNaturalist observations at this park.`,
    photoUrl: null, source: 'inaturalist', sources: ['inaturalist'],
    description: null, descriptionSource: null,
  };
}
function makeInvert(r, parkId) {
  return {
    name: r.name, emoji: invertEmoji(r.name), animalType: 'marine',
    rarity: rarityFromObs(r.obsCount, r.name),
    seasons: TROPICAL_PARKS.has(parkId) ? ALL_SEASONS : ACTIVE_SEASONS,
    scientificName: r.scientificName,
    funFact: `${r.obsCount} research-grade iNaturalist observations at this park.`,
    photoUrl: null, source: 'inaturalist', sources: ['inaturalist'],
    description: null, descriptionSource: null,
  };
}

// ── iNat fetch ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function inatFetch(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      if ((res.status === 429 || res.status >= 500) && i < retries) {
        await sleep(3000 * (i+1)); continue;
      }
      return null;
    } catch { if (i < retries) { await sleep(2000*(i+1)); continue; } return null; }
  }
  return null;
}

async function fetchTaxa(placeId, taxon, perPage=100) {
  const url = `https://api.inaturalist.org/v1/observations/species_counts`
    + `?place_id=${placeId}&iconic_taxa[]=${taxon}&quality_grade=research&per_page=${perPage}&order_by=observations_count`;
  const data = await inatFetch(url);
  if (!data?.results) return [];
  return data.results.map(r => ({
    name:           r.taxon?.preferred_common_name ?? r.taxon?.name,
    scientificName: r.taxon?.name,
    obsCount:       r.count,
  })).filter(s => s.name);
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
function loadCache() {
  const src = fs.readFileSync(CACHE_PATH,'utf8');
  const cjs = src
    .replace('export const WILDLIFE_CACHE_BUILT_AT','const WILDLIFE_CACHE_BUILT_AT')
    .replace('export const WILDLIFE_CACHE','const WILDLIFE_CACHE')
    .replace('export default WILDLIFE_CACHE;','')
    + '\nmodule.exports={WILDLIFE_CACHE,WILDLIFE_CACHE_BUILT_AT};';
  const tmp = path.join(os.tmpdir(),'_marfix_tmp.cjs');
  fs.writeFileSync(tmp,cjs);
  delete require.cache[require.resolve(tmp)];
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return { cache: mod.WILDLIFE_CACHE, builtAt: mod.WILDLIFE_CACHE_BUILT_AT };
}
function saveCache(cache, builtAt) {
  const ts = new Date().toISOString();
  let out = `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.\n`;
  out += `// Built: ${builtAt}\n// Marine audit fixes applied: ${ts}\n`;
  out += `// Parks: ${Object.keys(cache).length} | Species: ${Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0)}\n\n`;
  out += `export const WILDLIFE_CACHE_BUILT_AT = "${builtAt}";\n\n`;
  out += `export const WILDLIFE_CACHE = ${JSON.stringify(cache,null,2)};\n\nexport default WILDLIFE_CACHE;\n`;
  fs.writeFileSync(CACHE_PATH,out,'utf8');
}
function findAnimal(animals, name) {
  const n = (name||'').toLowerCase().trim();
  return animals.find(a => {
    const an = (a.name||'').toLowerCase().trim();
    return an===n || an.includes(n) || n.includes(an);
  });
}
function addIfMissing(animals, animal, stats) {
  if (findAnimal(animals, animal.name)) { stats.skipped++; return false; }
  animals.push(animal);
  stats.added++;
  return true;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Marine Fish & Invertebrate Audit + Fix');
  console.log('══════════════════════════════════════════════════════════════\n');

  const { cache, builtAt } = loadCache();
  const before = Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0);
  const stats  = { added:0, skipped:0, seasonFixed:0 };
  const report = { coastal:[], freshwater:[], invertebrates:[], checks:[] };

  // ── 1. Coastal saltwater fish ─────────────────────────────────────────────
  console.log('── 1. Coastal fish audit ──────────────────────────────────────');
  for (const parkId of COASTAL_FISH_PARKS) {
    const placeId = INAT_PLACE_IDS[parkId];
    if (!placeId || !cache[parkId]) continue;
    process.stdout.write(`  [${parkId}] fetching fish... `);
    const fish = await fetchTaxa(placeId, 'Actinopterygii');
    await sleep(600);
    process.stdout.write(`${fish.length} species\n`);

    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const f of fish) {
      if (f.obsCount < 50) continue;
      if (addIfMissing(parkAnimals, makeFish(f, parkId), stats)) {
        parkAdded++;
        report.coastal.push({ park:parkId, name:f.name, obsCount:f.obsCount });
      }
    }
    if (parkAdded > 0) console.log(`    +${parkAdded} fish added`);
  }

  // ── 2. Freshwater fish ────────────────────────────────────────────────────
  console.log('\n── 2. Freshwater fish audit ───────────────────────────────────');
  for (const parkId of FRESHWATER_FISH_PARKS) {
    if (COASTAL_FISH_PARKS.includes(parkId)) continue; // already done
    const placeId = INAT_PLACE_IDS[parkId];
    if (!placeId || !cache[parkId]) continue;
    process.stdout.write(`  [${parkId}] fetching freshwater fish... `);
    const fish = await fetchTaxa(placeId, 'Actinopterygii');
    await sleep(600);
    process.stdout.write(`${fish.length} species\n`);

    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const f of fish) {
      if (f.obsCount < 30) continue;
      if (addIfMissing(parkAnimals, makeFish(f, parkId), stats)) {
        parkAdded++;
        report.freshwater.push({ park:parkId, name:f.name, obsCount:f.obsCount });
      }
    }
    if (parkAdded > 0) console.log(`    +${parkAdded} freshwater fish added`);
  }

  // ── 3. Marine invertebrates ───────────────────────────────────────────────
  console.log('\n── 3. Marine invertebrate audit ───────────────────────────────');
  for (const parkId of INVERTEBRATE_PARKS) {
    const placeId = INAT_PLACE_IDS[parkId];
    if (!placeId || !cache[parkId]) continue;
    process.stdout.write(`  [${parkId}] fetching Mollusca... `);
    const mollusca = await fetchTaxa(placeId, 'Mollusca');
    await sleep(500);
    process.stdout.write(`${mollusca.length} | Echinodermata... `);
    const echino = await fetchTaxa(placeId, 'Echinodermata');
    await sleep(500);
    process.stdout.write(`${echino.length}\n`);

    const parkAnimals = cache[parkId].animals;
    let parkAdded = 0;
    for (const inv of [...mollusca, ...echino]) {
      if (inv.obsCount < 100) continue;
      if (addIfMissing(parkAnimals, makeInvert(inv, parkId), stats)) {
        parkAdded++;
        report.invertebrates.push({ park:parkId, name:inv.name, obsCount:inv.obsCount });
      }
    }
    if (parkAdded > 0) console.log(`    +${parkAdded} invertebrates added`);
  }

  // ── 4. Specific species checks ────────────────────────────────────────────
  console.log('\n── 4. Specific species checks ─────────────────────────────────');

  function check(label, parkId, name, wantPresent=true) {
    const a = findAnimal(cache[parkId]?.animals||[], name);
    const ok = wantPresent ? !!a : !a;
    const icon = ok ? '✅' : '❌';
    const detail = a ? `${a.rarity}` : 'MISSING';
    console.log(`  ${icon} [${parkId}] ${name}: ${detail}`);
    report.checks.push({ label, park:parkId, name, rarity:a?.rarity??'MISSING', pass:ok });
    return a;
  }

  // Channel Islands iconic fish
  check('Garibaldi at Channel Islands',      'channelislands', 'Garibaldi');
  check('Kelp Bass at Channel Islands',      'channelislands', 'Kelp Bass');
  check('California Sheephead at CI',        'channelislands', 'California Sheephead');
  // Yellowstone freshwater
  check('Cutthroat Trout at Yellowstone',    'yellowstone',    'Cutthroat Trout');
  check('Brown Trout at Yellowstone',        'yellowstone',    'Brown Trout');
  // Everglades fish
  check('Largemouth Bass at Everglades',     'everglades',     'Largemouth Bass');
  // Katmai salmon
  check('Sockeye Salmon at Katmai',          'katmai',         'Sockeye Salmon');
  // Kenai Fjords
  check('Pacific Halibut at Kenai Fjords',   'kenaifjords',    'Pacific Halibut');
  // Virgin Islands
  check('Blue Tang at Virgin Islands',       'virginislands',  'Blue Tang');
  check('Queen Parrotfish at VI',            'virginislands',  'Queen Parrotfish');

  // ── 5. Salmon seasonal fix ────────────────────────────────────────────────
  console.log('\n── 5. Salmon seasonal accuracy fix ───────────────────────────');
  const ALASKA_PARKS = ['kenaifjords','glacierbay','katmai','wrangellstelias','lakeclark','denali'];
  for (const parkId of ALASKA_PARKS) {
    if (!cache[parkId]) continue;
    for (const a of cache[parkId].animals) {
      const l = (a.name||'').toLowerCase();
      if (!/\b(salmon|steelhead)\b/.test(l)) continue;
      // Already correct?
      const hasWinter = a.seasons?.includes('winter');
      const hasSpring = a.seasons?.includes('spring');
      if (!hasWinter && !hasSpring) continue;
      a.seasons = ['summer','fall'];
      stats.seasonFixed++;
      console.log(`  [${parkId}] ${a.name}: seasons fixed → summer/fall`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const after = Object.values(cache).reduce((s,p)=>s+(p.animals||[]).length,0);

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  Coastal fish added:       ${report.coastal.length}`);
  console.log(`  Freshwater fish added:    ${report.freshwater.length}`);
  console.log(`  Invertebrates added:      ${report.invertebrates.length}`);
  console.log(`  Salmon seasonal fixes:    ${stats.seasonFixed}`);
  console.log(`  Skipped (duplicates):     ${stats.skipped}`);
  console.log(`  TOTAL added:              ${stats.added}  (${before} → ${after})`);
  console.log('══════════════════════════════════════════════════════════════');

  if (report.coastal.length) {
    console.log('\n── New coastal fish ───────────────────────────────────────────');
    report.coastal.sort((a,b)=>b.obsCount-a.obsCount)
      .forEach(r => console.log(`  [${r.park}] ${r.name} — ${r.obsCount} obs`));
  }
  if (report.freshwater.length) {
    console.log('\n── New freshwater fish ────────────────────────────────────────');
    report.freshwater.sort((a,b)=>b.obsCount-a.obsCount)
      .forEach(r => console.log(`  [${r.park}] ${r.name} — ${r.obsCount} obs`));
  }
  if (report.invertebrates.length) {
    console.log('\n── New marine invertebrates ───────────────────────────────────');
    report.invertebrates.sort((a,b)=>b.obsCount-a.obsCount)
      .forEach(r => console.log(`  [${r.park}] ${r.name} — ${r.obsCount} obs`));
  }

  saveCache(cache, builtAt);
  console.log(`\n✓ Written: ${after} total animals`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
