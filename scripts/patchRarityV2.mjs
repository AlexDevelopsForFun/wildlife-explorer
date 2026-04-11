/**
 * patchRarityV2.mjs — Two-part live rarity improvement patch
 *
 * PART 1: For every park currently showing 0 Guaranteed animals, query the
 *         iNaturalist species_counts API to find the most-observed species.
 *         If a species has 500+ obs (charisma-corrected) it becomes Guaranteed.
 *         If 200+ obs it becomes Very Likely (at minimum).
 *
 * PART 2: For the 10 most-visited national parks, fetch iNat monthly histograms
 *         for their top 50 birds. Replace the flat eBird binary-fallback rarity
 *         (40% → Likely, or 15% → Unlikely) with a real data-driven tier.
 *
 * Usage:  node scripts/patchRarityV2.mjs
 *         node scripts/patchRarityV2.mjs --dry-run   (no file writes)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_IN = join(ROOT, 'src', 'data', 'wildlifeCache.js');

// ── iNat place_ids (from buildWildlifeCache.js) ─────────────────────────────
const INAT_PLACE_IDS = {
  yellowstone:72645/*wrong→*/,
};
// Full table (copy from buildWildlifeCache.js):
const PLACE_IDS = {
  yellowstone:10211, everglades:53957, denali:71077, acadia:49610,
  shenandoah:9012, newrivergorge:95209, cuyahogavalley:72639, isleroyale:95245,
  greatsmokymountains:72645, biscayne:95108, drytortugas:70571, congaree:53620,
  mammothcave:72649, voyageurs:69101, indianadunes:95241, badlands:72792,
  windcave:72794, theodoreroosevelt:72793, gatewayarch:137962, grandcanyon:69216,
  zion:50634, brycecanyon:69110, arches:53642, canyonlands:95131, capitolreef:69282,
  mesaverde:69108, petrifiedforest:57573, saguaro:65739, whitesands:62621,
  guadalupemountains:69313, bigbend:55071, grandteton:69099, rockymountain:49676,
  glacier:72841, greatsanddunes:53632, blackcanyon:72635, olympic:69094,
  northcascades:69097, mountrainier:8838, craterlake:52923, redwood:6021,
  lassenvolcanic:4509, yosemite:68542, kingscanyon:3378, sequoia:95321,
  joshuatree:3680, deathvalley:4504, channelislands:3157, pinnacles:5737,
  kenaifjords:95258, glacierbay:69113, katmai:95257, wrangellstelias:72658,
  lakeclark:69114, gatesofthearctic:69111, kobukvalley:69115, hawaiivolcanoes:7222,
  haleakala:56788, americansamoa:73645, virginislands:95336, hotsprings:56706,
  carlsbadcaverns:69109, greatbasin:69699,
};

// 10 most-visited parks for bird histogram upgrade
const TOP_10_PARKS = [
  'greatsmokymountains','grandcanyon','zion','rockymountain','yellowstone',
  'acadia','olympic','glacier','yosemite','everglades',
];

// ── Rarity helpers (mirrors buildWildlifeCache.js) ───────────────────────────
function rarityFromFreq(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

function applyCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower))  return obsCount / 5;
  if (/\b(wolf|wolves|gray wolf|grey wolf)\b/.test(lower)) return obsCount / 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower))    return obsCount / 4;
  if (/\b(bear)\b/.test(lower))       return obsCount / 5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return obsCount / 3;
  if (/\b(bison|buffalo)\b/.test(lower))   return obsCount / 2;
  if (/\b(elk|moose|alligator|crocodile)\b/.test(lower)) return obsCount / 2;
  if (/\b(deer|squirrel)\b/.test(lower))   return obsCount / 1.5;
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower)) return obsCount * 5;
  if (/\bbat\b/.test(lower))          return obsCount * 4;
  if (/\bsnake\b/.test(lower))        return obsCount * 2;
  return obsCount;
}

function rarityFromObsCount(obsCount, name = '') {
  const corrected = applyCharismaCorrection(obsCount, name);
  if (corrected >= 2000) return 'guaranteed';
  if (corrected >= 500)  return 'very_likely';
  if (corrected >= 100)  return 'likely';
  if (corrected >= 20)   return 'unlikely';
  if (corrected >= 5)    return 'rare';
  return 'exceptional';
}

function rarityFromInatHistogram(monthCounts, name = '') {
  if (!monthCounts) return null;
  const total = Object.values(monthCounts).reduce((s, v) => s + (v ?? 0), 0);
  if (total < 5) return null;
  return rarityFromObsCount(total, name);
}

const RARITY_RANK = { guaranteed:0, very_likely:1, likely:2, unlikely:3, rare:4, exceptional:5 };

// ── HTTP helpers ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WildlifeMap/1.0 (educational project)' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        const delay = 3000 * (attempt + 1);
        console.warn(`  ⚠ 429 — retrying in ${delay/1000}s`);
        await sleep(delay);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (attempt < retries - 1) { await sleep(1500 * (attempt + 1)); continue; }
      return null;
    }
  }
  return null;
}

// ── PART 1: Query top species for zero-Guaranteed parks ──────────────────────
async function getTopSpecies(placeId, limit = 5) {
  const url = `https://api.inaturalist.org/v1/observations/species_counts` +
    `?place_id=${placeId}&quality_grade=research&order_by=observations_count` +
    `&order=desc&per_page=${limit}&iconic_taxa[]=Mammalia&iconic_taxa[]=Aves` +
    `&iconic_taxa[]=Reptilia&iconic_taxa[]=Amphibia`;
  const data = await safeFetch(url);
  if (!data?.results) return [];
  return data.results.map(r => ({
    name:     r.taxon?.preferred_common_name ?? r.taxon?.name ?? '?',
    sciName:  r.taxon?.name ?? '',
    count:    r.count,
    taxonId:  r.taxon?.id,
    iconic:   r.taxon?.iconic_taxon_name ?? '',
    correctedCount: applyCharismaCorrection(r.count, r.taxon?.preferred_common_name ?? ''),
  }));
}

// ── PART 2: Fetch bird histogram for a species at a park ─────────────────────
async function getBirdHistogram(sciName, placeId) {
  if (!sciName || !placeId) return null;
  const url = `https://api.inaturalist.org/v1/observations/histogram` +
    `?taxon_name=${encodeURIComponent(sciName)}&place_id=${placeId}` +
    `&quality_grade=research&interval=month_of_year`;
  const data = await safeFetch(url);
  const raw = data?.results?.month_of_year;
  if (!raw) return null;
  // Convert {1: n, 2: n, ...} to plain object with numeric keys
  const counts = {};
  for (let m = 1; m <= 12; m++) counts[m] = raw[String(m)] ?? 0;
  return counts;
}

// ── Load cache ───────────────────────────────────────────────────────────────
console.log('\n🔍  Loading wildlife cache…');
const src = readFileSync(CACHE_IN, 'utf8');
const builtAtMatch = src.match(/Built:\s*(\S+)/);
const originalBuiltAt = builtAtMatch?.[1] ?? 'unknown';
const match = src.match(/export const WILDLIFE_CACHE\s*=\s*(\{[\s\S]*\});/);
if (!match) { console.error('❌  Could not parse cache'); process.exit(1); }
const cache = new Function(`return ${match[1]}`)();
const allParkIds = Object.keys(cache);
console.log(`   ${allParkIds.length} parks, ${allParkIds.reduce((s,id)=>s+cache[id].animals.length,0)} species`);

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Zero-Guaranteed parks: iNat species_counts → targeted overrides
// ═══════════════════════════════════════════════════════════════════════════
const zeroGuarParks = allParkIds.filter(id =>
  !cache[id].animals.some(a => a.rarity === 'guaranteed')
);
console.log(`\n══ PART 1: ${zeroGuarParks.length} parks with 0 Guaranteed ══`);

const part1Overrides = {};   // parkId → { animalName: rarity }
const part1Report    = [];

for (const parkId of zeroGuarParks) {
  const placeId = PLACE_IDS[parkId];
  if (!placeId) { console.log(`  ⚠ ${parkId}: no placeId — skip`); continue; }

  process.stdout.write(`  ${parkId} (place=${placeId})… `);
  const top = await getTopSpecies(placeId, 5);
  await sleep(400);

  if (!top.length) { console.log('no data'); continue; }

  const topStr = top.map(t =>
    `${t.name}(${t.count}obs→${t.correctedCount.toFixed(0)}corr)`
  ).join(', ');
  process.stdout.write(`top: ${topStr}\n`);

  part1Report.push({ parkId, top });

  // Decide overrides: apply to animals already in the cache for this park
  const existingNames = new Set(cache[parkId].animals.map(a => a.name));
  const overrides = {};
  for (const sp of top) {
    const newRarity = rarityFromObsCount(sp.count, sp.name);
    const current   = cache[parkId].animals.find(a => a.name === sp.name);
    const curRarity = current?.rarity ?? null;

    // Only improve rarity (never downgrade), skip if already guaranteed/very_likely
    if (!existingNames.has(sp.name)) { continue; }
    if (curRarity === 'guaranteed' || curRarity === 'very_likely') { continue; }

    const newRank = RARITY_RANK[newRarity] ?? 99;
    const curRank = RARITY_RANK[curRarity] ?? 99;

    if (newRank < curRank) {
      overrides[sp.name] = newRarity;
      console.log(`    ✅ ${sp.name}: ${curRarity} → ${newRarity} (${sp.count} obs, ${sp.correctedCount.toFixed(0)} corrected)`);
    }
  }

  if (Object.keys(overrides).length > 0) {
    part1Overrides[parkId] = overrides;
  }
}

// Apply Part 1 overrides to cache
let part1ChangeCount = 0;
for (const [parkId, overrides] of Object.entries(part1Overrides)) {
  cache[parkId].animals = cache[parkId].animals.map(a => {
    const newRarity = overrides[a.name];
    if (newRarity && newRarity !== a.rarity) {
      part1ChangeCount++;
      return { ...a, rarity: newRarity };
    }
    return a;
  });
}

// Recheck guaranteed counts
const zeroAfterP1 = allParkIds.filter(id =>
  !cache[id].animals.some(a => a.rarity === 'guaranteed')
);
console.log(`\n  Part 1 applied ${part1ChangeCount} overrides`);
console.log(`  Parks with 0 Guaranteed after Part 1: ${zeroAfterP1.length}`);

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Bird histogram rarity for top 10 most-visited parks
// ═══════════════════════════════════════════════════════════════════════════
console.log(`\n══ PART 2: Bird histogram rarity for ${TOP_10_PARKS.length} most-visited parks ══`);

const part2Report = [];

for (const parkId of TOP_10_PARKS) {
  const placeId = PLACE_IDS[parkId];
  if (!placeId) { console.log(`  ⚠ ${parkId}: no placeId`); continue; }

  const parkAnimals = cache[parkId]?.animals ?? [];
  // Top 50 birds sorted by current rarity then alphabetically
  const birds = parkAnimals
    .filter(a => a.animalType === 'bird' && a.scientificName)
    .sort((a,b) => (RARITY_RANK[a.rarity]??99) - (RARITY_RANK[b.rarity]??99))
    .slice(0, 50);

  console.log(`\n  ${parkId} (${birds.length} birds for histogram):`);

  const changes = [];
  let improved = 0, worsened = 0, unchanged = 0;

  for (const bird of birds) {
    const hist = await getBirdHistogram(bird.scientificName, placeId);
    await sleep(350);

    if (!hist) { unchanged++; continue; }

    const newRarity = rarityFromInatHistogram(hist, bird.name);
    if (!newRarity) { unchanged++; continue; }

    const oldRank = RARITY_RANK[bird.rarity] ?? 99;
    const newRank = RARITY_RANK[newRarity]   ?? 99;

    if (newRank === oldRank) { unchanged++; continue; }

    // iNat under-reports birds (birders use eBird, not iNat), so obs counts are
    // artificially low — common residents like Mountain Chickadee get just 3-10 obs
    // at a park and would be misclassified as rare. Only apply UPGRADES (newRank <
    // oldRank) where iNat confirms a higher frequency than eBird's binary fallback.
    // Never downgrade based on iNat histogram alone.
    if (newRank > oldRank) { unchanged++; continue; }   // skip downgrades

    // Record upgrade
    const direction = 'UP';
    changes.push({
      name:      bird.name,
      sciName:   bird.scientificName,
      oldRarity: bird.rarity,
      newRarity,
      direction,
    });

    improved++;

    // Apply change to cache
    const idx = cache[parkId].animals.findIndex(a => a.name === bird.name && a.animalType === 'bird');
    if (idx >= 0) {
      cache[parkId].animals[idx] = { ...cache[parkId].animals[idx], rarity: newRarity };
    }
  }

  // Print summary for this park
  console.log(`    ${improved} birds upgraded (UP), ${unchanged} unchanged / skipped downgrades`);

  // Show 5 example changes
  const examples = [...changes].sort((a,b) =>
    Math.abs(RARITY_RANK[a.oldRarity]-RARITY_RANK[a.newRarity]) -
    Math.abs(RARITY_RANK[b.oldRarity]-RARITY_RANK[b.newRarity])
  ).reverse().slice(0, 5);

  for (const ex of examples) {
    const arrow = ex.direction === 'UP' ? '⬆' : '⬇';
    console.log(`    ${arrow} ${ex.name}: ${ex.oldRarity} → ${ex.newRarity}`);
  }

  part2Report.push({ parkId, improved, worsened, unchanged, examples });
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE PATCHED CACHE
// ═══════════════════════════════════════════════════════════════════════════
const patchedAt    = new Date().toISOString();
const totalSpecies = allParkIds.reduce((s, id) => s + cache[id].animals.length, 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Built: ${originalBuiltAt}`,
  `// Patched: ${patchedAt} (patchRarityV2: iNat species_counts + bird histograms)`,
  `// Parks: ${allParkIds.length} | Species bundled: ${totalSpecies}`,
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

if (!DRY_RUN) {
  writeFileSync(CACHE_IN, lines.join('\n'), 'utf8');
  console.log(`\n✅  Patched cache written → ${CACHE_IN}`);
} else {
  console.log('\n🔵  DRY RUN — no files written');
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY REPORT
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                  PATCH V2 — SUMMARY                     ║');
console.log('╚══════════════════════════════════════════════════════════╝');

const finalZeroGuar = allParkIds.filter(id =>
  !cache[id].animals.some(a => a.rarity === 'guaranteed')
);
const finalGuar = allParkIds.map(id => ({
  id, count: cache[id].animals.filter(a=>a.rarity==='guaranteed').length
}));

console.log(`\nPART 1 — Zero-Guaranteed parks`);
console.log(`  Before: ${zeroGuarParks.length} parks with 0 Guaranteed`);
console.log(`  After:  ${finalZeroGuar.length} parks with 0 Guaranteed`);
console.log(`  Fixed:  ${zeroGuarParks.length - finalZeroGuar.length} parks gained ≥1 Guaranteed`);
console.log(`  Parks still at 0: ${finalZeroGuar.join(', ')}`);

console.log(`\nPART 2 — Bird histogram rarity (10 most-visited parks)`);
for (const r of part2Report) {
  console.log(`\n  ${r.parkId}:`);
  console.log(`    ⬆ ${r.improved} birds upgraded, ─ ${r.unchanged} unchanged (downgrades skipped)`);
  if (r.examples.length > 0) {
    console.log(`    5 biggest changes:`);
    r.examples.forEach(ex => {
      const arrow = ex.direction === 'UP' ? '⬆' : '⬇';
      console.log(`      ${arrow} ${ex.name}: ${ex.oldRarity} → ${ex.newRarity}`);
    });
  }
}

console.log(`\nTotal species: ${totalSpecies}`);
console.log(`Parks with 2+ Guaranteed: ${finalGuar.filter(p=>p.count>=2).length}`);
console.log(`\nDone ✅`);
