'use strict';
/**
 * mammalAudit.cjs — Comprehensive mammal audit across all 63 parks
 *
 * Does NOT modify any files. Reads wildlifeCache.js + calls iNat API.
 * Saves results to scripts/mammalAudit_results.json
 *
 * Run: node scripts/mammalAudit.cjs
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT        = path.join(__dirname, '..');
const CACHE_PATH  = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const OUTPUT_PATH = path.join(__dirname, 'mammalAudit_results.json');

// ── iNat place IDs for all 63 parks ─────────────────────────────────────────
const INAT_PLACE_IDS = {
  yellowstone:        10211,
  everglades:         53957,
  denali:             71077,
  acadia:             49610,
  shenandoah:          9012,
  newrivergorge:      95209,
  cuyahogavalley:     72639,
  isleroyale:         95245,
  greatsmokymountains:72645,
  biscayne:           95108,
  drytortugas:        70571,
  congaree:           53620,
  mammothcave:        72649,
  voyageurs:          69101,
  indianadunes:       95241,
  badlands:           72792,
  windcave:           72794,
  theodoreroosevelt:  72793,
  gatewayarch:       137962,
  grandcanyon:        69216,
  zion:               50634,
  brycecanyon:        69110,
  arches:             53642,
  canyonlands:        95131,
  capitolreef:        69282,
  mesaverde:          69108,
  petrifiedforest:    57573,
  saguaro:            65739,
  whitesands:         62621,
  guadalupemountains: 69313,
  bigbend:            55071,
  grandteton:         69099,
  rockymountain:      49676,
  glacier:            72841,
  greatsanddunes:     53632,
  blackcanyon:        72635,
  olympic:            69094,
  northcascades:      69097,
  mountrainier:        8838,
  craterlake:         52923,
  redwood:             6021,
  lassenvolcanic:      4509,
  yosemite:           68542,
  kingscanyon:         3378,
  sequoia:            95321,
  joshuatree:          3680,
  deathvalley:         4504,
  channelislands:      3157,
  pinnacles:           5737,
  kenaifjords:        95258,
  glacierbay:         69113,
  katmai:             95257,
  wrangellstelias:    72658,
  lakeclark:          69114,
  gatesofthearctic:   69111,
  kobukvalley:        69115,
  hawaiivolcanoes:     7222,
  haleakala:          56788,
  americansamoa:      73645,
  virginislands:      95336,
  hotsprings:         56706,
  carlsbadcaverns:    69109,
  greatbasin:         69699,
};

// ── Charisma correction (mirrors buildWildlifeCache.js) ──────────────────────
function applyCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower))                          return obsCount / 5;
  if (/\b(wolf|wolves|gray wolf|grey wolf)\b/.test(lower))   return obsCount / 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower))       return obsCount / 4;
  if (/\b(bear)\b/.test(lower))                              return obsCount / 5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return obsCount / 3;
  if (/\b(bison|buffalo)\b/.test(lower))                     return obsCount / 2;
  if (/\b(elk|moose|alligator|crocodile)\b/.test(lower))    return obsCount / 2;
  if (/\b(deer|squirrel)\b/.test(lower))                     return obsCount / 1.5;
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower))        return obsCount * 5;
  if (/\bbat\b/.test(lower))                                 return obsCount * 4;
  if (/\bsnake\b/.test(lower))                               return obsCount * 2;
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

// ── Rarity rank for comparison ────────────────────────────────────────────────
const RARITY_RANK = { guaranteed:6, very_likely:5, likely:4, unlikely:3, rare:2, exceptional:1 };

function rarityDiff(cache, suggested) {
  return (RARITY_RANK[suggested] ?? 0) - (RARITY_RANK[cache] ?? 0);
}

// ── Load wildlifeCache ────────────────────────────────────────────────────────
function loadCache() {
  const src = fs.readFileSync(CACHE_PATH, 'utf8');
  const cjs = src
    .replace('export const WILDLIFE_CACHE_BUILT_AT', 'const WILDLIFE_CACHE_BUILT_AT')
    .replace('export const WILDLIFE_CACHE', 'const WILDLIFE_CACHE')
    .replace('export default WILDLIFE_CACHE;', '')
    + '\nmodule.exports = { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT };';
  const tmp = path.join(os.tmpdir(), '_mamaudit_tmp.cjs');
  fs.writeFileSync(tmp, cjs);
  delete require.cache[require.resolve(tmp)];
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod.WILDLIFE_CACHE;
}

// ── iNat API fetch with retry ─────────────────────────────────────────────────
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

// ── Fetch iNat mammal species for a park ─────────────────────────────────────
async function fetchInatMammals(placeId, parkId) {
  const url = `https://api.inaturalist.org/v1/observations/species_counts`
    + `?place_id=${placeId}&iconic_taxa[]=Mammalia&quality_grade=research&per_page=100&order_by=observations_count`;
  const data = await inatFetch(url);
  if (!data?.results) return [];
  return data.results.map(r => ({
    name:           r.taxon?.preferred_common_name ?? r.taxon?.name,
    scientificName: r.taxon?.name,
    obsCount:       r.count,
    taxonId:        r.taxon?.id,
  })).filter(s => s.name);
}

// ── Fetch NPS species inventory for mammals ───────────────────────────────────
async function fetchNpsMammals(npsCode, npsKey) {
  if (!npsCode || !npsKey) return [];
  const url = `https://developer.nps.gov/api/v1/species?parkCode=${npsCode}&category=Mammals&limit=500&api_key=${npsKey}`;
  const data = await inatFetch(url);
  if (!data?.data) return [];
  return data.data.map(s => ({
    name:           s.commonNames?.[0] ?? s.name,
    scientificName: s.scientificName ?? s.name,
    npsCategorySort: s.order ?? '',
  }));
}

// ── Is this animal a bat? ──────────────────────────────────────────────────────
function isBat(name) {
  return /\bbat\b/i.test(name);
}
function isMarineMammal(name) {
  const lower = (name || '').toLowerCase();
  return /\b(whale|dolphin|porpoise|orca|seal|sea lion|sea otter|manatee|dugong|walrus|fur seal)\b/.test(lower);
}

// ── Name matching (case-insensitive, handle "Western/Northern" prefixes) ────────
function normalizeAnimalName(name) {
  return (name || '').toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function nameMatch(a, b) {
  const na = normalizeAnimalName(a);
  const nb = normalizeAnimalName(b);
  if (na === nb) return true;
  // Check if one contains the other (handles "Mountain Lion" vs "Mountain Lion (Cougar)")
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

// ── Coastal/island parks that should have marine mammals ──────────────────────
const MARINE_PARKS = new Set([
  'acadia', 'olympic', 'channelislands', 'redwood', 'kenaifjords',
  'glacierbay', 'katmai', 'biscayne', 'drytortugas', 'virginislands',
  'americansamoa', 'hawaiivolcanoes', 'isleroyale',
]);

// ── Seasonal accuracy rules ────────────────────────────────────────────────────
function checkSeasonalAccuracy(animal) {
  const issues = [];
  const name  = (animal.name || '').toLowerCase();
  const seaS  = animal.seasons || [];

  // Bats and bears shouldn't be winter
  if (isBat(name) && seaS.includes('winter')) {
    issues.push('bat listed as winter-active (should hibernate)');
  }
  if (/\b(black bear|grizzly bear|brown bear)\b/.test(name) && seaS.includes('winter')) {
    issues.push('bear listed as winter-active (should hibernate)');
  }
  // Ground squirrels no winter
  if (/\b(ground squirrel|prairie dog|marmot|groundhog)\b/.test(name) && seaS.includes('winter')) {
    issues.push('hibernating species listed as winter-active');
  }
  return issues;
}

// ── Cross-park consistency check for 25 key mammals ──────────────────────────
const CROSS_PARK_MAMMALS = {
  'White-tailed Deer':      { parks: ['shenandoah','greatsmokymountains','acadia','newrivergorge','congaree','cuyahogavalley','indianadunes','mammothcave','voyageurs','badlands','windcave','theodoreroosevelt','hotsprings'], minRarity: 'likely' },
  'Mule Deer':              { parks: ['grandcanyon','zion','brycecanyon','arches','canyonlands','capitolreef','mesaverde','rockymountain','grandteton','yellowstone','glacier','blackcanyon','greatsanddunes','deathvalley'], minRarity: 'likely' },
  'Black Bear':             { parks: ['greatsmokymountains','shenandoah','yosemite','glacier','olympic','sequoia','kingscanyon','redwood','northcascades','mountrainier','acadia','congaree','newrivergorge'], minRarity: 'unlikely' },
  'Coyote':                 { parks: ['yellowstone','grandcanyon','zion','yosemite','deathvalley','joshuatree','saguaro','bigbend','rockymountain','glacier','grandteton'], minRarity: 'unlikely' },
  'Raccoon':                { parks: ['shenandoah','greatsmokymountains','acadia','congaree','mammothcave','cuyahogavalley','hotsprings','newrivergorge'], minRarity: 'unlikely' },
  'American Beaver':        { parks: ['yellowstone','glacier','rockymountain','grandteton','voyageurs','acadia','shenandoah','greatsmokymountains'], minRarity: 'unlikely' },
  'North American River Otter': { parks: ['everglades','congaree','voyageurs','olympic','kenaifjords','glacierbay'], minRarity: 'rare' },
  'Striped Skunk':          { parks: ['shenandoah','greatsmokymountains','yosemite','glacier','grandcanyon'], minRarity: 'rare' },
  'Virginia Opossum':       { parks: ['shenandoah','greatsmokymountains','congaree','mammothcave','hotsprings','cuyahogavalley'], minRarity: 'unlikely' },
  'Eastern Gray Squirrel':  { parks: ['shenandoah','acadia','greatsmokymountains','cuyahogavalley','newrivergorge'], minRarity: 'likely' },
  'Red Squirrel':           { parks: ['glacier','rockymountain','acadia','olympic','denali'], minRarity: 'unlikely' },
  'American Black Bear':    { parks: ['greatsmokymountains','shenandoah','glacier','yosemite','olympic'], minRarity: 'unlikely' },
  'Moose':                  { parks: ['yellowstone','glacier','grandteton','denali','voyageurs','isleroyale','rockymountain','olympic','northcascades'], minRarity: 'unlikely' },
  'Elk':                    { parks: ['yellowstone','glacier','grandteton','rockymountain','olympic','greatsmokymountains','grandcanyon'], minRarity: 'unlikely' },
  'Gray Wolf':              { parks: ['yellowstone','glacier','denali'], minRarity: 'rare' },
  'Mountain Lion':          { parks: ['zion','grandcanyon','yosemite','glacier','rockymountain','bigbend','saguaro'], minRarity: 'rare' },
  'American Bison':         { parks: ['yellowstone','grandteton','badlands','windcave','theodoreroosevelt'], minRarity: 'likely' },
  'Pronghorn':              { parks: ['yellowstone','grandteton','badlands','windcave','grandcanyon'], minRarity: 'unlikely' },
  'Bighorn Sheep':          { parks: ['glacier','rockymountain','zion','grandcanyon','deathvalley','capitolreef'], minRarity: 'rare' },
  'River Otter':            { parks: ['everglades','congaree','voyageurs'], minRarity: 'rare' },
  'Sea Otter':              { parks: ['channelislands','kenaifjords','glacierbay','olympic'], minRarity: 'unlikely' },
  'Harbor Seal':            { parks: ['acadia','olympic','channelislands','kenaifjords','glacierbay','redwood'], minRarity: 'unlikely' },
  'California Sea Lion':    { parks: ['channelislands','kenaifjords'], minRarity: 'likely' },
  'Florida Manatee':        { parks: ['everglades','biscayne'], minRarity: 'rare' },
  'Humpback Whale':         { parks: ['kenaifjords','glacierbay','olympic','channelislands','acadia'], minRarity: 'rare' },
};

// ── Iconic mammal verification ────────────────────────────────────────────────
const ICONIC_MAMMALS = [
  { park:'yellowstone',        name:'American Bison',          targetRarity:'guaranteed' },
  { park:'yellowstone',        name:'Gray Wolf',               targetRarity:'rare' },
  { park:'yellowstone',        name:'Grizzly Bear',            targetRarity:'unlikely' },
  { park:'yellowstone',        name:'Elk',                     targetRarity:'likely' },
  { park:'everglades',         name:'American Alligator',      targetRarity:'guaranteed' },
  { park:'everglades',         name:'American Crocodile',      targetRarity:'unlikely' },
  { park:'everglades',         name:'West Indian Manatee',     targetRarity:'rare' },
  { park:'everglades',         name:'Florida Panther',         targetRarity:'exceptional' },
  { park:'grandcanyon',        name:'American Bison',          targetRarity:'rare' },
  { park:'glacierbay',         name:'Humpback Whale',          targetRarity:'likely' },
  { park:'channelislands',     name:'California Sea Lion',     targetRarity:'likely' },
  { park:'zion',               name:'Desert Bighorn Sheep',    targetRarity:'very_likely' },
  { park:'glacier',            name:'Grizzly Bear',            targetRarity:'unlikely' },
  { park:'glacier',            name:'Mountain Goat',           targetRarity:'unlikely' },
  { park:'glacier',            name:'Wolverine',               targetRarity:'exceptional' },
  { park:'saguaro',            name:'Javelina',                targetRarity:'likely' },
  { park:'greatsmokymountains',name:'Black Bear',              targetRarity:'unlikely' },
  { park:'greatsmokymountains',name:'White-tailed Deer',       targetRarity:'guaranteed' },
  { park:'denali',             name:'Moose',                   targetRarity:'unlikely' },
  { park:'denali',             name:'Grizzly Bear',            targetRarity:'unlikely' },
  { park:'badlands',           name:'American Bison',          targetRarity:'likely' },
  { park:'windcave',           name:'American Bison',          targetRarity:'guaranteed' },
  { park:'isleroyale',         name:'Moose',                   targetRarity:'likely' },
  { park:'katmai',             name:'Brown Bear',              targetRarity:'guaranteed' },
];

// ── Park details (npsCode for NPS API) ───────────────────────────────────────
const NPS_CODES = {
  yellowstone:'yell', everglades:'ever', denali:'dena', acadia:'acad',
  shenandoah:'shen', newrivergorge:'neri', cuyahogavalley:'cuva',
  isleroyale:'isro', greatsmokymountains:'grsm', biscayne:'bisc',
  drytortugas:'drto', congaree:'cong', mammothcave:'maca', voyageurs:'voya',
  indianadunes:'indu', badlands:'badl', windcave:'wica', theodoreroosevelt:'thro',
  gatewayarch:'jeff', grandcanyon:'grca', zion:'zion', brycecanyon:'brca',
  arches:'arch', canyonlands:'cany', capitolreef:'care', mesaverde:'meve',
  petrifiedforest:'pefo', saguaro:'sagu', whitesands:'whsa',
  guadalupemountains:'gumo', bigbend:'bibe', grandteton:'grte',
  rockymountain:'romo', glacier:'glac', greatsanddunes:'grsa',
  blackcanyon:'blca', olympic:'olym', northcascades:'noca',
  mountrainier:'mora', craterlake:'crla', redwood:'redw',
  lassenvolcanic:'lavo', yosemite:'yose', kingscanyon:'kica',
  sequoia:'sequ', joshuatree:'jotr', deathvalley:'deva',
  channelislands:'chis', pinnacles:'pinn', kenaifjords:'kefj',
  glacierbay:'glba', katmai:'katm', wrangellstelias:'wrst',
  lakeclark:'lacl', gatesofthearctic:'gaar', kobukvalley:'kova',
  hawaiivolcanoes:'havo', haleakala:'hale', americansamoa:'npsa',
  virginislands:'viis', hotsprings:'hosp', carlsbadcaverns:'cave',
  greatbasin:'grba',
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Comprehensive Mammal Audit — All 63 Parks (READ-ONLY)');
  console.log('══════════════════════════════════════════════════════════════\n');

  const cache = loadCache();
  const parkIds = Object.keys(INAT_PLACE_IDS);

  const results = {
    auditDate:          new Date().toISOString(),
    totalParks:         parkIds.length,
    missingMammals:     [],   // { park, name, obsCount, suggestedRarity, scientificName }
    rarityMismatches:   [],   // { park, name, cacheRarity, suggestedRarity, obsCount, direction }
    seasonalIssues:     [],   // { park, name, issue }
    crossParkIssues:    [],   // { mammal, park, issue, cacheRarity }
    iconicMammalCheck:  [],   // { park, name, targetRarity, cacheRarity, pass }
    batCompleteness:    [],   // { park, inatBats, cacheBats, missing }
    marineMammals:      [],   // { park, inatMarine, cacheMarine, missing }
    parkSummaries:      {},   // { [parkId]: { inatCount, cacheCount, mammalCount, missingCount } }
    topMissing:         [],   // sorted by obsCount desc
  };

  // ── Per-park audit ───────────────────────────────────────────────────────────
  for (let pi = 0; pi < parkIds.length; pi++) {
    const parkId  = parkIds[pi];
    const placeId = INAT_PLACE_IDS[parkId];
    const cacheAnimals = cache[parkId]?.animals || [];
    const cacheMammals = cacheAnimals.filter(a =>
      a.animalType === 'mammal' ||
      // Some entries use type=reptile but are actually marine mammals — catch by name
      isMarineMammal(a.name)
    );

    if ((pi + 1) % 10 === 0 || pi === 0 || pi === parkIds.length - 1) {
      console.log(`\n── Progress: ${pi + 1}/${parkIds.length} parks ────────────────`);
    }
    process.stdout.write(`  [${parkId}] fetching iNat... `);

    const inatMammals = await fetchInatMammals(placeId, parkId);
    await sleep(600); // rate-limit courtesy

    process.stdout.write(`${inatMammals.length} species found\n`);

    // ── Check for missing / rarity mismatches ────────────────────────────────
    for (const inat of inatMammals) {
      if (!inat.name) continue;
      const match = cacheMammals.find(cm => nameMatch(cm.name, inat.name));
      const suggestedRarity = rarityFromObsCount(inat.obsCount, inat.name);

      if (!match) {
        // Not in cache at all
        if (inat.obsCount >= 20) {
          results.missingMammals.push({
            park:            parkId,
            name:            inat.name,
            scientificName:  inat.scientificName,
            obsCount:        inat.obsCount,
            suggestedRarity,
            isBat:           isBat(inat.name),
            isMarine:        isMarineMammal(inat.name),
          });
        }
      } else {
        // In cache — check rarity accuracy
        const diff = rarityDiff(match.rarity, suggestedRarity);
        if (Math.abs(diff) >= 2) {
          results.rarityMismatches.push({
            park:            parkId,
            name:            inat.name,
            scientificName:  inat.scientificName,
            obsCount:        inat.obsCount,
            cacheRarity:     match.rarity,
            suggestedRarity,
            direction:       diff > 0 ? 'upgrade' : 'downgrade',
            steps:           Math.abs(diff),
          });
        }
      }
    }

    // ── Seasonal accuracy for all cache mammals ──────────────────────────────
    for (const cm of cacheMammals) {
      const issues = checkSeasonalAccuracy(cm);
      for (const issue of issues) {
        results.seasonalIssues.push({ park: parkId, name: cm.name, issue });
      }
    }

    // ── Bat completeness ─────────────────────────────────────────────────────
    const inatBats  = inatMammals.filter(m => isBat(m.name));
    const cacheBats = cacheMammals.filter(m => isBat(m.name));
    if (inatBats.length >= 3 && inatBats.length > cacheBats.length + 1) {
      const missingBats = inatBats
        .filter(ib => !cacheBats.some(cb => nameMatch(cb.name, ib.name)) && ib.obsCount >= 5)
        .map(b => ({ name: b.name, obsCount: b.obsCount }));
      if (missingBats.length) {
        results.batCompleteness.push({
          park:         parkId,
          inatBatCount: inatBats.length,
          cacheBatCount: cacheBats.length,
          missingBats,
        });
      }
    }

    // ── Marine mammal completeness (coastal parks only) ──────────────────────
    if (MARINE_PARKS.has(parkId)) {
      const inatMarine  = inatMammals.filter(m => isMarineMammal(m.name));
      const cacheMarine = cacheAnimals.filter(a => isMarineMammal(a.name));
      const missingMarine = inatMarine
        .filter(im => !cacheMarine.some(cm => nameMatch(cm.name, im.name)) && im.obsCount >= 5)
        .map(m => ({ name: m.name, obsCount: m.obsCount, suggestedRarity: rarityFromObsCount(m.obsCount, m.name) }));
      if (missingMarine.length || inatMarine.length > 0) {
        results.marineMammals.push({
          park:              parkId,
          inatMarineCount:   inatMarine.length,
          cacheMarineCount:  cacheMarine.length,
          missingMarine,
          cachedMarineNames: cacheMarine.map(m => m.name),
        });
      }
    }

    // ── Park summary ─────────────────────────────────────────────────────────
    results.parkSummaries[parkId] = {
      inatMammalCount:  inatMammals.length,
      cacheMammalCount: cacheMammals.length,
      cacheTotal:       cacheAnimals.length,
      missingCount:     inatMammals.filter(m => !cacheMammals.some(cm => nameMatch(cm.name, m.name)) && m.obsCount >= 20).length,
    };
  }

  // ── Cross-park consistency check ─────────────────────────────────────────────
  console.log('\n── Cross-park consistency check ────────────────────────────');
  for (const [mammalName, config] of Object.entries(CROSS_PARK_MAMMALS)) {
    const minRank = RARITY_RANK[config.minRarity] ?? 0;
    for (const parkId of config.parks) {
      const cacheAnimals = cache[parkId]?.animals || [];
      const match = cacheAnimals.find(a => nameMatch(a.name, mammalName));
      if (!match) {
        results.crossParkIssues.push({
          mammal: mammalName, park: parkId,
          issue: 'missing from cache',
          cacheRarity: null,
        });
      } else if ((RARITY_RANK[match.rarity] ?? 0) < minRank) {
        results.crossParkIssues.push({
          mammal: mammalName, park: parkId,
          issue: `rarity too low: ${match.rarity} (should be ≥${config.minRarity})`,
          cacheRarity: match.rarity,
        });
      }
    }
  }

  // ── Iconic mammal verification ────────────────────────────────────────────────
  console.log('── Iconic mammal verification ───────────────────────────────');
  for (const check of ICONIC_MAMMALS) {
    const cacheAnimals = cache[check.park]?.animals || [];
    const match = cacheAnimals.find(a => nameMatch(a.name, check.name));
    const pass = match?.rarity === check.targetRarity;
    results.iconicMammalCheck.push({
      park:          check.park,
      name:          check.name,
      targetRarity:  check.targetRarity,
      cacheRarity:   match?.rarity ?? 'NOT IN CACHE',
      pass,
      note: !match ? 'MISSING' : (pass ? 'OK' : `MISMATCH`),
    });
    const icon = !match ? '❌ MISSING' : (pass ? '✅' : '⚠ ');
    console.log(`  ${icon} ${check.park} / ${check.name}: want ${check.targetRarity}, got ${match?.rarity ?? 'N/A'}`);
  }

  // ── Compile top missing ───────────────────────────────────────────────────────
  results.topMissing = [...results.missingMammals]
    .sort((a, b) => b.obsCount - a.obsCount)
    .slice(0, 50);

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalMissing   = results.missingMammals.length;
  const totalMismatch  = results.rarityMismatches.length;
  const totalSeasonal  = results.seasonalIssues.length;
  const totalCross     = results.crossParkIssues.length;
  const iconicFails    = results.iconicMammalCheck.filter(c => !c.pass).length;
  const batIssues      = results.batCompleteness.length;
  const marineIssues   = results.marineMammals.reduce((s, m) => s + m.missingMarine.length, 0);

  results.summary = {
    totalMissingMammals:   totalMissing,
    totalRarityMismatches: totalMismatch,
    totalSeasonalIssues:   totalSeasonal,
    totalCrossParkIssues:  totalCross,
    iconicFailCount:       iconicFails,
    batCompletenessParks:  batIssues,
    missingMarineSpecies:  marineIssues,
  };

  // ── Save results ──────────────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');

  // ── Print human-readable report ───────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AUDIT RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Parks audited:            ${parkIds.length}`);
  console.log(`  Missing mammals (≥20 obs): ${totalMissing}`);
  console.log(`  Rarity mismatches (≥2 tiers): ${totalMismatch}`);
  console.log(`  Seasonal accuracy issues: ${totalSeasonal}`);
  console.log(`  Cross-park issues:        ${totalCross}`);
  console.log(`  Iconic mammal failures:   ${iconicFails}/${ICONIC_MAMMALS.length}`);
  console.log(`  Bat completeness issues:  ${batIssues} parks`);
  console.log(`  Missing marine mammals:   ${marineIssues} species`);

  console.log('\n── Top 20 Missing Mammals (by iNat obs count) ──────────────');
  results.topMissing.slice(0, 20).forEach((m, i) => {
    const tag = m.isBat ? '🦇' : m.isMarine ? '🐋' : '🦌';
    console.log(`  ${String(i+1).padStart(2)}. ${tag} [${m.park}] ${m.name} — ${m.obsCount} obs → ${m.suggestedRarity}`);
  });

  if (results.rarityMismatches.length) {
    console.log('\n── Top Rarity Mismatches (most severe) ─────────────────────');
    const topMismatch = [...results.rarityMismatches]
      .sort((a, b) => b.steps - a.steps || b.obsCount - a.obsCount)
      .slice(0, 15);
    topMismatch.forEach(m => {
      const arrow = m.direction === 'upgrade' ? '↑' : '↓';
      console.log(`  ${arrow}${m.steps} [${m.park}] ${m.name}: ${m.cacheRarity} → ${m.suggestedRarity} (${m.obsCount} obs)`);
    });
  }

  if (results.seasonalIssues.length) {
    console.log('\n── Seasonal Issues ──────────────────────────────────────────');
    results.seasonalIssues.slice(0, 15).forEach(s => {
      console.log(`  [${s.park}] ${s.name}: ${s.issue}`);
    });
    if (results.seasonalIssues.length > 15)
      console.log(`  ... and ${results.seasonalIssues.length - 15} more`);
  }

  if (results.batCompleteness.length) {
    console.log('\n── Bat Completeness Issues ──────────────────────────────────');
    results.batCompleteness.forEach(b => {
      console.log(`  [${b.park}] iNat: ${b.inatBatCount} bat spp / cache: ${b.cacheBatCount} — missing: ${b.missingBats.map(x=>x.name).join(', ')}`);
    });
  }

  if (results.marineMammals.some(m => m.missingMarine.length)) {
    console.log('\n── Missing Marine Mammals ────────────────────────────────────');
    results.marineMammals.filter(m => m.missingMarine.length).forEach(m => {
      m.missingMarine.forEach(s => {
        console.log(`  [${m.park}] ${s.name} — ${s.obsCount} obs → ${s.suggestedRarity}`);
      });
    });
  }

  if (results.crossParkIssues.length) {
    console.log('\n── Cross-Park Issues (sample) ───────────────────────────────');
    results.crossParkIssues.slice(0, 20).forEach(c => {
      console.log(`  [${c.park}] ${c.mammal}: ${c.issue}`);
    });
    if (results.crossParkIssues.length > 20)
      console.log(`  ... and ${results.crossParkIssues.length - 20} more`);
  }

  console.log(`\n✓ Full results saved to ${OUTPUT_PATH}`);
  console.log('  NO CHANGES were made to wildlifeCache.js\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
