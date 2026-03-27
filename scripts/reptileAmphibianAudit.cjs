'use strict';
/**
 * reptileAmphibianAudit.cjs — Comprehensive reptile, amphibian & insect audit
 *
 * Sections:
 *  1. Reptile completeness — all 63 parks, flag missing species with ≥20 obs
 *  2. Amphibian completeness — all 63 parks, flag missing with ≥15 obs
 *  3. Seasonal accuracy — remove winter from cold-blooded animals in northern parks
 *  4. Rarity verification — flag mismatches > 1 tier
 *  5. Insect completeness — top-20 check for 5 flagship parks
 *
 * READ-ONLY — saves results to scripts/reptileAmphibianAudit_results.json
 * Run: node scripts/reptileAmphibianAudit.cjs
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT        = path.join(__dirname, '..');
const CACHE_PATH  = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const OUTPUT_PATH = path.join(__dirname, 'reptileAmphibianAudit_results.json');

// ── iNat place IDs ────────────────────────────────────────────────────────────
const INAT_PLACE_IDS = {
  yellowstone:10211, everglades:53957, denali:71077, acadia:49610,
  shenandoah:9012, newrivergorge:95209, cuyahogavalley:72639, isleroyale:95245,
  greatsmokymountains:72645, biscayne:95108, drytortugas:70571, congaree:53620,
  mammothcave:72649, voyageurs:69101, indianadunes:95241, badlands:72792,
  windcave:72794, theodoreroosevelt:72793, gatewayarch:137962, grandcanyon:69216,
  zion:50634, brycecanyon:69110, arches:53642, canyonlands:95131,
  capitolreef:69282, mesaverde:69108, petrifiedforest:57573, saguaro:65739,
  whitesands:62621, guadalupemountains:69313, bigbend:55071, grandteton:69099,
  rockymountain:49676, glacier:72841, greatsanddunes:53632, blackcanyon:72635,
  olympic:69094, northcascades:69097, mountrainier:8838, craterlake:52923,
  redwood:6021, lassenvolcanic:4509, yosemite:68542, kingscanyon:3378,
  sequoia:95321, joshuatree:3680, deathvalley:4504, channelislands:3157,
  pinnacles:5737, kenaifjords:95258, glacierbay:69113, katmai:95257,
  wrangellstelias:72658, lakeclark:69114, gatesofthearctic:69111,
  kobukvalley:69115, hawaiivolcanoes:7222, haleakala:56788, americansamoa:73645,
  virginislands:95336, hotsprings:56706, carlsbadcaverns:69109, greatbasin:69699,
};

// ── Northern parks (above ~40°N) — reptiles/amphibians should NOT show winter ─
const NORTHERN_PARKS = new Set([
  // Alaska — all parks
  'kenaifjords','glacierbay','denali','katmai','wrangellstelias','lakeclark',
  'gatesofthearctic','kobukvalley',
  // Pacific Northwest / Northwest
  'olympic','northcascades','mountrainier','craterlake','redwood','lassenvolcanic',
  // Rockies / Northern Plains
  'yellowstone','grandteton','glacier','rockymountain','badlands','windcave',
  'theodoreroosevelt','greatsanddunes','blackcanyon',
  // Great Lakes / Midwest
  'isleroyale','voyageurs','indianadunes','cuyahogavalley',
  // Northeast
  'acadia',
  // Borderline northern (cold winters, reptiles hibernate)
  'shenandoah','newrivergorge','mammothcave','arches','canyonlands',
  'capitolreef','brycecanyon','zion','mesaverde','greatbasin',
  'yosemite','sequoia','kingscanyon',
]);

// ── Rarity thresholds (reptiles & amphibians — no charisma correction) ────────
function rarityFromObsCount(obsCount, name = '') {
  const lower = (name || '').toLowerCase();
  let corrected = obsCount;
  // Sea turtles: charismatic, over-reported
  if (/\b(sea turtle|green turtle|hawksbill|loggerhead|leatherback|ridley)\b/.test(lower))
    corrected = obsCount / 3;
  // Rattlesnakes/venomous: under-reported (people don't approach)
  else if (/\b(rattlesnake|copperhead|cottonmouth|water moccasin|coral snake)\b/.test(lower))
    corrected = obsCount * 2;
  // Other snakes: mildly under-reported
  else if (/\bsnake\b/.test(lower))
    corrected = obsCount * 1.5;

  if (corrected >= 500) return 'very_likely';
  if (corrected >= 100) return 'likely';
  if (corrected >= 20)  return 'unlikely';
  if (corrected >= 5)   return 'rare';
  return 'exceptional';
}

const RARITY_RANK = { guaranteed:6, very_likely:5, likely:4, unlikely:3, rare:2, exceptional:1 };

function normalizeAnimalName(n) {
  return (n||'').toLowerCase().replace(/['']/g,"'").replace(/\s+/g,' ').trim();
}
function nameMatch(a, b) {
  const na = normalizeAnimalName(a), nb = normalizeAnimalName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

// ── Cache types that count as reptile / amphibian ─────────────────────────────
const REPTILE_TYPES  = new Set(['reptile','snake','lizard','turtle','crocodilian']);
const AMPHIB_TYPES   = new Set(['amphibian','frog','salamander','toad','newt']);
const INSECT_TYPES   = new Set(['insect','butterfly','moth','beetle','dragonfly','bee','ant']);

function isReptile(a) {
  return REPTILE_TYPES.has(a.animalType) ||
    /\b(lizard|snake|turtle|tortoise|gecko|skink|iguana|monitor|chameleon|alligator|crocodile|caiman|anole|salamander.*no|newt.*no)\b/i.test(a.name);
}
function isAmphibian(a) {
  return AMPHIB_TYPES.has(a.animalType) ||
    /\b(frog|toad|salamander|newt|siren|mudpuppy|amphiuma|axolotl|treefrog|tree frog)\b/i.test(a.name);
}
function isInsect(a) {
  return INSECT_TYPES.has(a.animalType) ||
    /\b(butterfly|moth|beetle|firefly|bee|wasp|ant|dragonfly|grasshopper|cricket|cicada|bug|fly|mosquito|mayfly|mantis|walkingstick|aphid|katydid|lacewing)\b/i.test(a.name);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function inatFetch(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      if ((res.status === 429 || res.status >= 500) && i < retries) {
        const delay = 3000 * (i + 1);
        console.log(`    ⚠  HTTP ${res.status} — retry in ${delay/1000}s`);
        await sleep(delay);
        continue;
      }
      return null;
    } catch (e) {
      if (i < retries) { await sleep(2000 * (i + 1)); continue; }
      return null;
    }
  }
  return null;
}

async function fetchInatTaxa(placeId, taxon) {
  const url = `https://api.inaturalist.org/v1/observations/species_counts`
    + `?place_id=${placeId}&iconic_taxa[]=${taxon}&quality_grade=research&per_page=100&order_by=observations_count`;
  const data = await inatFetch(url);
  if (!data?.results) return [];
  return data.results.map(r => ({
    name:           r.taxon?.preferred_common_name ?? r.taxon?.name,
    scientificName: r.taxon?.name,
    obsCount:       r.count,
    taxonId:        r.taxon?.id,
    iconicTaxon:    r.taxon?.iconic_taxon_name,
  })).filter(s => s.name);
}

// ── Load cache ─────────────────────────────────────────────────────────────────
function loadCache() {
  const src = fs.readFileSync(CACHE_PATH, 'utf8');
  const cjs = src
    .replace('export const WILDLIFE_CACHE_BUILT_AT','const WILDLIFE_CACHE_BUILT_AT')
    .replace('export const WILDLIFE_CACHE','const WILDLIFE_CACHE')
    .replace('export default WILDLIFE_CACHE;','')
    + '\nmodule.exports = { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT };';
  const tmp = path.join(os.tmpdir(), '_raaudit_tmp.cjs');
  fs.writeFileSync(tmp, cjs);
  delete require.cache[require.resolve(tmp)];
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod.WILDLIFE_CACHE;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Reptile / Amphibian / Insect Audit — All 63 Parks (READ-ONLY)');
  console.log('══════════════════════════════════════════════════════════════\n');

  const cache   = loadCache();
  const parkIds = Object.keys(INAT_PLACE_IDS);

  const results = {
    auditDate:           new Date().toISOString(),
    totalParks:          parkIds.length,
    // Reptile findings
    missingReptiles:     [],
    reptileRarityMismatches: [],
    reptileSeasonalIssues:   [],
    // Amphibian findings
    missingAmphibians:   [],
    amphibianRarityMismatches: [],
    amphibianSeasonalIssues:   [],
    // Insect findings
    missingInsects:      [],
    // Park-level summaries
    parkSummaries:       {},
    // Prioritized fix list
    criticalFixes:       [],
    highFixes:           [],
    mediumFixes:         [],
  };

  // ── Per-park reptile + amphibian audit ──────────────────────────────────────
  for (let pi = 0; pi < parkIds.length; pi++) {
    const parkId   = parkIds[pi];
    const placeId  = INAT_PLACE_IDS[parkId];
    const animals  = cache[parkId]?.animals || [];
    const cacheReptiles   = animals.filter(isReptile);
    const cacheAmphibians = animals.filter(isAmphibian);
    const isNorthern = NORTHERN_PARKS.has(parkId);

    if ((pi + 1) % 10 === 0 || pi === 0 || pi === parkIds.length - 1) {
      console.log(`\n── Progress: ${pi + 1}/${parkIds.length} parks ────────────────`);
    }
    process.stdout.write(`  [${parkId}] `);

    // Fetch reptiles
    const inatReptiles = await fetchInatTaxa(placeId, 'Reptilia');
    await sleep(400);
    // Fetch amphibians
    const inatAmphibians = await fetchInatTaxa(placeId, 'Amphibia');
    await sleep(400);

    process.stdout.write(`${inatReptiles.length}R/${inatAmphibians.length}A\n`);

    // ── Reptile analysis ─────────────────────────────────────────────────────
    for (const inat of inatReptiles) {
      const match = cacheReptiles.find(a => nameMatch(a.name, inat.name));
      const suggested = rarityFromObsCount(inat.obsCount, inat.name);

      if (!match) {
        if (inat.obsCount >= 20) {
          results.missingReptiles.push({
            park: parkId, name: inat.name, scientificName: inat.scientificName,
            obsCount: inat.obsCount, suggestedRarity: suggested,
          });
        }
      } else {
        const diff = (RARITY_RANK[suggested]??0) - (RARITY_RANK[match.rarity]??0);
        if (Math.abs(diff) > 1) {
          results.reptileRarityMismatches.push({
            park: parkId, name: inat.name, obsCount: inat.obsCount,
            cacheRarity: match.rarity, suggestedRarity: suggested,
            direction: diff > 0 ? 'upgrade' : 'downgrade', steps: Math.abs(diff),
          });
        }
      }
    }

    // ── Reptile seasonal check ───────────────────────────────────────────────
    if (isNorthern) {
      for (const a of cacheReptiles) {
        if (a.seasons?.includes('winter')) {
          results.reptileSeasonalIssues.push({
            park: parkId, name: a.name, issue: 'reptile has winter season (cold-blooded, northern park)',
          });
        }
      }
    }

    // ── Amphibian analysis ───────────────────────────────────────────────────
    for (const inat of inatAmphibians) {
      const match = cacheAmphibians.find(a => nameMatch(a.name, inat.name));
      const suggested = rarityFromObsCount(inat.obsCount, inat.name);

      if (!match) {
        if (inat.obsCount >= 15) {
          results.missingAmphibians.push({
            park: parkId, name: inat.name, scientificName: inat.scientificName,
            obsCount: inat.obsCount, suggestedRarity: suggested,
          });
        }
      } else {
        const diff = (RARITY_RANK[suggested]??0) - (RARITY_RANK[match.rarity]??0);
        if (Math.abs(diff) > 1) {
          results.amphibianRarityMismatches.push({
            park: parkId, name: inat.name, obsCount: inat.obsCount,
            cacheRarity: match.rarity, suggestedRarity: suggested,
            direction: diff > 0 ? 'upgrade' : 'downgrade', steps: Math.abs(diff),
          });
        }
      }
    }

    // ── Amphibian seasonal check ─────────────────────────────────────────────
    if (isNorthern) {
      for (const a of cacheAmphibians) {
        if (a.seasons?.includes('winter')) {
          results.amphibianSeasonalIssues.push({
            park: parkId, name: a.name, issue: 'amphibian has winter season (cold-blooded, northern park)',
          });
        }
      }
    }

    // ── Park summary ─────────────────────────────────────────────────────────
    results.parkSummaries[parkId] = {
      cacheReptiles:    cacheReptiles.length,
      cacheAmphibians:  cacheAmphibians.length,
      inatReptiles:     inatReptiles.length,
      inatAmphibians:   inatAmphibians.length,
      missingReptiles:  inatReptiles.filter(i => !cacheReptiles.some(c=>nameMatch(c.name,i.name)) && i.obsCount>=20).length,
      missingAmphibians:inatAmphibians.filter(i => !cacheAmphibians.some(c=>nameMatch(c.name,i.name)) && i.obsCount>=15).length,
      isNorthern,
    };
  }

  // ── Insect audit — flagship parks ────────────────────────────────────────────
  console.log('\n── Insect audit — flagship parks ────────────────────────────');
  const INSECT_PARKS = [
    { id: 'greatsmokymountains', note: 'Firefly capital, synchronous fireflies' },
    { id: 'saguaro',             note: 'Desert icons: tarantula hawk, cactus bee' },
    { id: 'rockymountain',       note: 'Alpine: Mormon fritillary, alpine beetles' },
    { id: 'yosemite',            note: 'Monarch corridor, oak woodland diversity' },
    { id: 'everglades',          note: 'Tropical: zebra longwing, monarch' },
  ];

  for (const {id: parkId, note} of INSECT_PARKS) {
    const placeId = INAT_PLACE_IDS[parkId];
    if (!placeId) continue;

    process.stdout.write(`  [${parkId}] (${note}) fetching insects... `);
    const inatInsects = await fetchInatTaxa(placeId, 'Insecta');
    await sleep(600);

    const animals       = cache[parkId]?.animals || [];
    const cacheInsects  = animals.filter(isInsect);
    const top20         = inatInsects.slice(0, 20);

    process.stdout.write(`${inatInsects.length} total, checking top 20\n`);

    for (const inat of top20) {
      const match = cacheInsects.find(a => nameMatch(a.name, inat.name));
      const suggested = rarityFromObsCount(inat.obsCount, inat.name);
      if (!match && inat.obsCount >= 50) {
        results.missingInsects.push({
          park: parkId, name: inat.name, scientificName: inat.scientificName,
          obsCount: inat.obsCount, suggestedRarity: suggested, parkNote: note,
        });
      }
    }
  }

  // ── Special checks ────────────────────────────────────────────────────────────
  console.log('\n── Special rarity checks ────────────────────────────────────');

  const specialChecks = [
    { park:'saguaro',   name:'Common Side-blotched Lizard', wantMin:'very_likely' },
    { park:'joshuatree',name:'Common Side-blotched Lizard', wantMin:'very_likely' },
    { park:'yosemite',  name:'Western Fence Lizard',        wantMin:'very_likely' },
    { park:'joshuatree',name:'Desert Tortoise',             wantExact:'unlikely'  },
    { park:'everglades',name:'American Alligator',          wantExact:'guaranteed'},
    { park:'everglades',name:'American Crocodile',          wantExact:'unlikely'  },
    { park:'virginislands',name:'Green Sea Turtle',         wantMin:'unlikely'    },
    { park:'drytortugas',  name:'Green Sea Turtle',         wantMin:'unlikely'    },
    { park:'greatsmokymountains',name:'Red-backed Salamander',wantMin:'likely'   },
    { park:'congaree',  name:'Cottonmouth',                 wantMin:'unlikely'    },
  ];

  const specialResults = [];
  for (const chk of specialChecks) {
    const animals = cache[chk.park]?.animals || [];
    const match = animals.find(a => nameMatch(a.name, chk.name));
    let pass = false, note = '';
    if (!match) {
      note = 'MISSING';
    } else if (chk.wantExact) {
      pass = match.rarity === chk.wantExact;
      note = pass ? 'OK' : `got ${match.rarity}, want ${chk.wantExact}`;
    } else if (chk.wantMin) {
      pass = (RARITY_RANK[match.rarity]??0) >= (RARITY_RANK[chk.wantMin]??0);
      note = pass ? 'OK' : `got ${match.rarity}, want ≥${chk.wantMin}`;
    }
    const icon = !match ? '❌' : (pass ? '✅' : '⚠ ');
    console.log(`  ${icon} [${chk.park}] ${chk.name}: ${note}`);
    specialResults.push({ ...chk, cacheRarity: match?.rarity ?? 'MISSING', pass, note });
  }
  results.specialChecks = specialResults;

  // ── Build prioritized fix list ─────────────────────────────────────────────────
  // Critical: missing species with ≥100 obs
  results.criticalFixes = [
    ...results.missingReptiles.filter(r=>r.obsCount>=100)
      .map(r=>({type:'reptile',priority:'critical',park:r.park,name:r.name,obsCount:r.obsCount,action:`Add to cache as ${r.suggestedRarity}`})),
    ...results.missingAmphibians.filter(a=>a.obsCount>=50)
      .map(a=>({type:'amphibian',priority:'critical',park:a.park,name:a.name,obsCount:a.obsCount,action:`Add to cache as ${a.suggestedRarity}`})),
    ...results.missingInsects.filter(i=>i.obsCount>=200)
      .map(i=>({type:'insect',priority:'critical',park:i.park,name:i.name,obsCount:i.obsCount,action:`Add to cache as ${i.suggestedRarity}`})),
  ].sort((a,b)=>b.obsCount-a.obsCount);

  // High: missing 20-99 obs reptiles, rarity mismatches ≥2 tiers
  results.highFixes = [
    ...results.missingReptiles.filter(r=>r.obsCount<100&&r.obsCount>=20)
      .map(r=>({type:'reptile',priority:'high',park:r.park,name:r.name,obsCount:r.obsCount,action:`Add as ${r.suggestedRarity}`})),
    ...results.missingAmphibians.filter(a=>a.obsCount<50&&a.obsCount>=15)
      .map(a=>({type:'amphibian',priority:'high',park:a.park,name:a.name,obsCount:a.obsCount,action:`Add as ${a.suggestedRarity}`})),
    ...results.reptileRarityMismatches.filter(r=>r.steps>=2)
      .map(r=>({type:'reptile',priority:'high',park:r.park,name:r.name,obsCount:r.obsCount,action:`${r.direction}: ${r.cacheRarity}→${r.suggestedRarity}`})),
    ...results.amphibianRarityMismatches.filter(a=>a.steps>=2)
      .map(a=>({type:'amphibian',priority:'high',park:a.park,name:a.name,obsCount:a.obsCount,action:`${a.direction}: ${a.cacheRarity}→${a.suggestedRarity}`})),
    ...results.missingInsects.filter(i=>i.obsCount<200)
      .map(i=>({type:'insect',priority:'high',park:i.park,name:i.name,obsCount:i.obsCount,action:`Add as ${i.suggestedRarity}`})),
    ...specialResults.filter(s=>!s.pass)
      .map(s=>({type:'special',priority:'high',park:s.park,name:s.name,obsCount:null,action:s.note})),
  ].sort((a,b)=>(b.obsCount??0)-(a.obsCount??0));

  // Medium: seasonal errors
  results.mediumFixes = [
    ...results.reptileSeasonalIssues.map(s=>({type:'reptile',priority:'medium',park:s.park,name:s.name,action:s.issue})),
    ...results.amphibianSeasonalIssues.map(s=>({type:'amphibian',priority:'medium',park:s.park,name:s.name,action:s.issue})),
  ];

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const summary = {
    missingReptiles:        results.missingReptiles.length,
    missingAmphibians:      results.missingAmphibians.length,
    missingInsects:         results.missingInsects.length,
    reptileRarityMismatches: results.reptileRarityMismatches.length,
    amphibianRarityMismatches: results.amphibianRarityMismatches.length,
    reptileSeasonalIssues:  results.reptileSeasonalIssues.length,
    amphibianSeasonalIssues: results.amphibianSeasonalIssues.length,
    criticalFixes:          results.criticalFixes.length,
    highFixes:              results.highFixes.length,
    mediumFixes:            results.mediumFixes.length,
  };
  results.summary = summary;

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');

  // ── Human-readable report ─────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AUDIT RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Parks audited:                   ${parkIds.length}`);
  console.log(`  Missing reptiles (≥20 obs):      ${summary.missingReptiles}`);
  console.log(`  Missing amphibians (≥15 obs):    ${summary.missingAmphibians}`);
  console.log(`  Missing insects (≥50 obs):       ${summary.missingInsects}`);
  console.log(`  Reptile rarity mismatches:       ${summary.reptileRarityMismatches}`);
  console.log(`  Amphibian rarity mismatches:     ${summary.amphibianRarityMismatches}`);
  console.log(`  Reptile seasonal issues:         ${summary.reptileSeasonalIssues}`);
  console.log(`  Amphibian seasonal issues:       ${summary.amphibianSeasonalIssues}`);
  console.log(`  CRITICAL fixes needed:           ${summary.criticalFixes}`);
  console.log(`  HIGH priority fixes:             ${summary.highFixes}`);
  console.log(`  MEDIUM (seasonal) fixes:         ${summary.mediumFixes}`);

  console.log('\n── CRITICAL: Top missing reptiles ───────────────────────────');
  results.missingReptiles
    .sort((a,b)=>b.obsCount-a.obsCount)
    .slice(0, 25)
    .forEach((r,i) => console.log(`  ${String(i+1).padStart(2)}. [${r.park}] ${r.name} — ${r.obsCount} obs → ${r.suggestedRarity}`));

  console.log('\n── CRITICAL: Top missing amphibians ─────────────────────────');
  results.missingAmphibians
    .sort((a,b)=>b.obsCount-a.obsCount)
    .slice(0, 25)
    .forEach((a,i) => console.log(`  ${String(i+1).padStart(2)}. [${a.park}] ${a.name} — ${a.obsCount} obs → ${a.suggestedRarity}`));

  if (results.missingInsects.length) {
    console.log('\n── Missing insects (flagship parks) ─────────────────────────');
    results.missingInsects
      .sort((a,b)=>b.obsCount-a.obsCount)
      .forEach(i => console.log(`  [${i.park}] ${i.name} — ${i.obsCount} obs → ${i.suggestedRarity}`));
  }

  if (results.reptileRarityMismatches.length) {
    console.log('\n── Reptile rarity mismatches (≥2 tiers) ────────────────────');
    results.reptileRarityMismatches
      .sort((a,b)=>b.steps-a.steps||b.obsCount-a.obsCount)
      .slice(0,20)
      .forEach(r => {
        const arrow = r.direction === 'upgrade' ? '↑' : '↓';
        console.log(`  ${arrow}${r.steps} [${r.park}] ${r.name}: ${r.cacheRarity} → ${r.suggestedRarity} (${r.obsCount} obs)`);
      });
  }

  if (results.amphibianRarityMismatches.length) {
    console.log('\n── Amphibian rarity mismatches (≥2 tiers) ──────────────────');
    results.amphibianRarityMismatches
      .sort((a,b)=>b.steps-a.steps||b.obsCount-a.obsCount)
      .slice(0,15)
      .forEach(a => {
        const arrow = a.direction === 'upgrade' ? '↑' : '↓';
        console.log(`  ${arrow}${a.steps} [${a.park}] ${a.name}: ${a.cacheRarity} → ${a.suggestedRarity} (${a.obsCount} obs)`);
      });
  }

  if (results.reptileSeasonalIssues.length) {
    console.log('\n── Reptile seasonal issues ──────────────────────────────────');
    results.reptileSeasonalIssues.slice(0,20).forEach(s =>
      console.log(`  [${s.park}] ${s.name}`));
    if (results.reptileSeasonalIssues.length > 20)
      console.log(`  ... and ${results.reptileSeasonalIssues.length - 20} more`);
  }

  if (results.amphibianSeasonalIssues.length) {
    console.log('\n── Amphibian seasonal issues ────────────────────────────────');
    results.amphibianSeasonalIssues.slice(0,20).forEach(s =>
      console.log(`  [${s.park}] ${s.name}`));
    if (results.amphibianSeasonalIssues.length > 20)
      console.log(`  ... and ${results.amphibianSeasonalIssues.length - 20} more`);
  }

  // Top parks by gap (most missing)
  const parkGaps = Object.entries(results.parkSummaries)
    .map(([id,s]) => ({ id, gap: s.missingReptiles + s.missingAmphibians }))
    .filter(p => p.gap > 0)
    .sort((a,b) => b.gap - a.gap)
    .slice(0, 15);
  if (parkGaps.length) {
    console.log('\n── Parks with most missing species ──────────────────────────');
    parkGaps.forEach(p => {
      const s = results.parkSummaries[p.id];
      console.log(`  [${p.id}] gap=${p.gap} (${s.missingReptiles}R + ${s.missingAmphibians}A | cache: ${s.cacheReptiles}R/${s.cacheAmphibians}A, iNat: ${s.inatReptiles}R/${s.inatAmphibians}A)`);
    });
  }

  console.log(`\n✓ Full results saved to ${OUTPUT_PATH}`);
  console.log('  NO CHANGES were made to wildlifeCache.js\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
