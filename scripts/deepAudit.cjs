'use strict';
/**
 * deepAudit.cjs — Exhaustive pre-launch data quality audit
 * Covers all 12 audit sections from the launch checklist.
 * Run: node scripts/deepAudit.cjs
 * Output: scripts/deepAudit_results.json + console summary
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

// ── Load .env ──────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}
const ENV = loadEnv();
const NPS_KEY   = ENV.VITE_NPS_API_KEY || ENV.REACT_APP_NPS_API_KEY;
const EBIRD_KEY = ENV.VITE_EBIRD_API_KEY || ENV.REACT_APP_EBIRD_API_KEY;

// ── Load wildlifeCache ─────────────────────────────────────────────────────
function loadCache() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'wildlifeCache.js'), 'utf8');
  const cjs = src
    .replace('export const WILDLIFE_CACHE_BUILT_AT', 'const WILDLIFE_CACHE_BUILT_AT')
    .replace('export const WILDLIFE_CACHE', 'const WILDLIFE_CACHE')
    + '\nmodule.exports = { WILDLIFE_CACHE };';
  const tmp = path.join(__dirname, '_audit_cache_tmp.cjs');
  fs.writeFileSync(tmp, cjs);
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod.WILDLIFE_CACHE;
}

// ── Load wildlifeData (park metadata) ─────────────────────────────────────
function loadParkMeta() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'wildlifeData.js'), 'utf8');
  const cjs = src
    .replace(/^export const /mg, 'const ')
    .replace(/^export default /m, 'const __default = ')
    + '\nmodule.exports = { wildlifeLocations };';
  const tmp = path.join(__dirname, '_audit_meta_tmp.cjs');
  fs.writeFileSync(tmp, cjs);
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod.wildlifeLocations;
}

// ── Load photoCache ────────────────────────────────────────────────────────
function loadPhotoCache() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'photoCache.js'), 'utf8');
  const cjs = src.replace('export const BUNDLED_PHOTOS', 'const BUNDLED_PHOTOS')
    + '\nmodule.exports = { BUNDLED_PHOTOS };';
  const tmp = path.join(__dirname, '_audit_photo_tmp.cjs');
  fs.writeFileSync(tmp, cjs);
  const mod = require(tmp);
  fs.unlinkSync(tmp);
  return mod.BUNDLED_PHOTOS;
}

// ── HTTP helper ────────────────────────────────────────────────────────────
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.request({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: { 'User-Agent': 'WildlifeMap-Audit/1.0', ...headers },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Rarity helpers ─────────────────────────────────────────────────────────
const RARITY_TIERS = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
const RARITY_RANK  = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 1 — Data Integrity Scan
// ══════════════════════════════════════════════════════════════════════════════
function check1_integrity(cache) {
  console.log('\n[1/12] Data integrity scan…');
  const issues = {
    missingName: [], missingScientific: [], missingRarity: [],
    missingSeasons: [], missingDescription: [], missingAnimalType: [],
    missingSource: [], invalidRarity: [], invalidSeasons: [],
    shortDescription: [], foreignDescription: [], sciAsDescription: [],
    boilerplateDescription: [],
  };
  let total = 0;
  for (const [parkId, park] of Object.entries(cache)) {
    for (const a of (park.animals || [])) {
      total++;
      const loc = `${parkId}::${a.name || '(unnamed)'}`;
      if (!a.name || a.name.trim().length < 2) issues.missingName.push(loc);
      if (!a.scientificName) issues.missingScientific.push(loc);
      if (!a.rarity) issues.missingRarity.push(loc);
      else if (!RARITY_TIERS.includes(a.rarity)) issues.invalidRarity.push(`${loc} (${a.rarity})`);
      if (!a.seasons || a.seasons.length === 0) issues.missingSeasons.push(loc);
      else {
        const bad = (a.seasons || []).filter(s => !['spring','summer','fall','winter','year_round'].includes(s));
        if (bad.length) issues.invalidSeasons.push(`${loc} (${bad.join(',')})`);
      }
      if (!a.description || a.description.trim().length === 0) issues.missingDescription.push(loc);
      else {
        const d = a.description.trim();
        if (d.length < 50) issues.shortDescription.push(`${loc} => "${d}"`);
        if (a.scientificName && d === a.scientificName) issues.sciAsDescription.push(loc);
        if (/officially documented|verified in \d+ observations/i.test(d)) issues.boilerplateDescription.push(loc);
        // Foreign language heuristic: non-ASCII > 20% of chars
        const nonAscii = (d.match(/[^\x00-\x7F]/g) || []).length;
        if (nonAscii / d.length > 0.2) issues.foreignDescription.push(`${loc} => "${d.slice(0,60)}"`);
      }
      if (!a.animalType) issues.missingAnimalType.push(loc);
      if (!a.sources || a.sources.length === 0) {
        if (!a.source) issues.missingSource.push(loc);
      }
    }
  }
  // Summary
  const summary = {};
  for (const [k, v] of Object.entries(issues)) {
    summary[k] = { count: v.length, examples: v.slice(0, 5) };
  }
  console.log(`   Total animals: ${total}`);
  for (const [k, v] of Object.entries(issues)) {
    if (v.length) console.log(`   ❗ ${k}: ${v.length}`);
  }
  return { total, summary };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 2 — iNat top-10 rarity comparison
// ══════════════════════════════════════════════════════════════════════════════
async function check2_inatTopSpecies(cache, parks) {
  console.log('\n[2/12] iNat top-10 species comparison…');
  const results = {};
  for (const park of parks) {
    process.stdout.write(`   ${park.id}… `);
    const url = `https://api.inaturalist.org/v1/observations/species_counts?lat=${park.lat}&lng=${park.lng}&radius=30&quality_grade=research&per_page=15`;
    const data = await fetchJson(url);
    await sleep(700); // respect iNat rate limit
    const animals = (cache[park.id]?.animals || []);
    const ourNames = new Set(animals.map(a => a.name.toLowerCase()));
    const parkResult = { inatTop: [], flagged_underrated: [], flagged_overrated: [] };
    if (data?.results) {
      parkResult.inatTop = data.results.slice(0, 10).map(r => ({
        name: r.taxon.preferred_common_name || r.taxon.name,
        count: r.count,
        rank: r.taxon.rank,
      }));
      // Check iNat top 10 vs our data
      for (const inatSp of data.results.slice(0, 10)) {
        const commonName = (inatSp.taxon.preferred_common_name || '').toLowerCase();
        const sciName    = (inatSp.taxon.name || '').toLowerCase();
        const ourAnimal  = animals.find(a =>
          a.name.toLowerCase() === commonName ||
          a.name.toLowerCase() === sciName ||
          (a.scientificName && a.scientificName.toLowerCase() === sciName)
        );
        if (!ourAnimal) {
          parkResult.flagged_underrated.push({
            issue: 'MISSING from our data',
            inatName: inatSp.taxon.preferred_common_name || inatSp.taxon.name,
            inatCount: inatSp.count,
          });
        } else if (['rare', 'exceptional'].includes(ourAnimal.rarity)) {
          parkResult.flagged_underrated.push({
            issue: `Underrated: we show ${ourAnimal.rarity} but iNat has ${inatSp.count} obs`,
            inatName: inatSp.taxon.preferred_common_name || inatSp.taxon.name,
            ourRarity: ourAnimal.rarity,
            inatCount: inatSp.count,
          });
        }
      }
      // Check our Guaranteed/Very Likely vs iNat counts
      for (const a of animals.filter(a => ['guaranteed','very_likely'].includes(a.rarity))) {
        const inatEntry = data.results.find(r => {
          const cn = (r.taxon.preferred_common_name || '').toLowerCase();
          const sn = (r.taxon.name || '').toLowerCase();
          return cn === a.name.toLowerCase() || sn === (a.scientificName||'').toLowerCase();
        });
        if (inatEntry && inatEntry.count < 20) {
          parkResult.flagged_overrated.push({
            issue: `Overrated? We show ${a.rarity} but iNat nearby radius has only ${inatEntry.count} obs`,
            name: a.name,
            ourRarity: a.rarity,
            inatCount: inatEntry.count,
          });
        }
      }
    }
    results[park.id] = parkResult;
    process.stdout.write(parkResult.inatTop.length ? `✓ (${parkResult.inatTop.length} species)\n` : '⚠ no data\n');
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 3 — Season accuracy deep dive
// ══════════════════════════════════════════════════════════════════════════════
function check3_seasons(cache, parks) {
  console.log('\n[3/12] Season accuracy analysis…');
  const results = {};
  const NORTH_PARKS = new Set(['yellowstone','denali','isleroyale','glacier','olympic',
    'northcascades','mountrainier','voyageurs','acadia','glacierbay','katmai',
    'wrangellstelias','lakeclark','gatesofthearctic','kobukvalley','badlands',
    'theodoreroosevelt','windcave','grandteton','rockymountain','craterlake',
    'lassenvolcanic','yosemite','kingscanyon','sequoia']);
  const SOUTH_PARKS = new Set(['everglades','biscayne','drytortugas','bigbend',
    'saguaro','guadalupemountains','deathvalley','joshuatree','hawaiivolcanoes',
    'haleakala','americansamoa','virginislands','whitesands','carlsbadcaverns']);

  const flagged = [];
  for (const park of parks) {
    const animals = cache[park.id]?.animals || [];
    const birds = animals.filter(a => a.animalType === 'bird');
    const summerBirds = birds.filter(a => (a.seasons||[]).includes('summer'));
    const winterBirds = birds.filter(a => (a.seasons||[]).includes('winter'));
    const total = birds.length;
    const summerPct = total ? (summerBirds.length / total * 100).toFixed(1) : 0;
    const winterPct = total ? (winterBirds.length / total * 100).toFixed(1) : 0;
    const diff = Math.abs(summerBirds.length - winterBirds.length);
    const diffPct = total ? (diff / total * 100).toFixed(1) : 0;
    const flag = [];
    if (parseFloat(diffPct) < 5 && total > 10) flag.push('FLAT_SEASONS: summer/winter within 5% — seasons may not be working');
    if (NORTH_PARKS.has(park.id) && winterBirds.length > summerBirds.length * 0.85 && total > 10)
      flag.push('NORTHERN_PARK: winter count unexpectedly close to summer (expected 30-50% fewer winter birds)');
    if (SOUTH_PARKS.has(park.id) && winterBirds.length < summerBirds.length * 0.8 && total > 10)
      flag.push('SOUTHERN_PARK: winter count lower than summer (Everglades-type parks expect MORE winter birds)');
    results[park.id] = {
      totalBirds: total, summerBirds: summerBirds.length, winterBirds: winterBirds.length,
      summerPct: parseFloat(summerPct), winterPct: parseFloat(winterPct),
      diffPct: parseFloat(diffPct), flags: flag,
    };
    if (flag.length) flagged.push({ park: park.id, ...results[park.id] });
  }
  console.log(`   Flagged parks: ${flagged.length}`);
  flagged.forEach(f => console.log(`   ⚠ ${f.park}: summer=${f.summerBirds} winter=${f.winterBirds} diff=${f.diffPct}% — ${f.flags.join('; ')}`));
  return { perPark: results, flagged };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 4 — NPS Mammal Completeness
// ══════════════════════════════════════════════════════════════════════════════
async function check4_npsMammals(cache, parks) {
  console.log('\n[4/12] NPS mammal completeness…');
  if (!NPS_KEY) { console.log('   ⚠ NPS key not found — skipping'); return { skipped: true }; }
  const results = {};
  // Bats/small rodents to filter (visitor-invisible)
  const SKIP_KEYWORDS = /\bbat\b|\bmouse\b|\bmice\b|\bvole\b|\bshrew\b|\bmole\b|\bpocket\b|\bjumping mouse\b|\bkangaroo rat\b|\bwood rat\b|\bwoodrat\b|\bdeermouse\b|\bperomyscus\b|\bsorex\b|\bmyotis\b|\beptesicus\b|\blasiurus\b|\btadarida\b|\bperimyotis\b|\bcorynorhinus\b|\bantrozous\b/i;
  for (const park of parks.filter(p => p.npsCode)) {
    process.stdout.write(`   ${park.id} (${park.npsCode})… `);
    const url = `https://developer.nps.gov/api/v1/species?parkCode=${park.npsCode}&category=Mammals&limit=500&api_key=${NPS_KEY}`;
    const data = await fetchJson(url);
    await sleep(400);
    if (!data?.data) { console.log('no data'); continue; }
    const npsMammals = data.data
      .filter(s => s.commonNames && !SKIP_KEYWORDS.test(s.commonNames) && !SKIP_KEYWORDS.test(s.scientificName || ''))
      .map(s => ({
        name: s.commonNames?.split(',')[0]?.trim() || s.scientificName,
        sci: s.scientificName,
      }));
    const ourMammals = (cache[park.id]?.animals || []).filter(a => a.animalType === 'mammal');
    const ourNames = new Set([
      ...ourMammals.map(a => a.name.toLowerCase()),
      ...ourMammals.filter(a => a.scientificName).map(a => a.scientificName.toLowerCase()),
    ]);
    const missing = npsMammals.filter(m =>
      !ourNames.has(m.name.toLowerCase()) &&
      !ourNames.has((m.sci || '').toLowerCase()) &&
      // also try partial match
      !ourMammals.some(a => a.name.toLowerCase().includes(m.name.toLowerCase().split(' ').pop()))
    );
    results[park.id] = {
      npsCount: npsMammals.length, ourCount: ourMammals.length,
      missingCount: missing.length,
      missing: missing.slice(0, 20),
    };
    console.log(`${npsMammals.length} NPS / ${ourMammals.length} ours / ${missing.length} missing`);
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 5 — eBird Bird Completeness
// ══════════════════════════════════════════════════════════════════════════════
async function check5_ebird(cache, parks) {
  console.log('\n[5/12] eBird bird completeness…');
  if (!EBIRD_KEY) { console.log('   ⚠ eBird key not found — skipping'); return { skipped: true }; }
  const results = {};
  for (const park of parks) {
    process.stdout.write(`   ${park.id}… `);
    // Get recent observations near park (radius 10km, max 200)
    const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${park.lat}&lng=${park.lng}&dist=10&maxResults=200&back=30`;
    const data = await fetchJson(url, { 'X-eBirdApiToken': EBIRD_KEY });
    await sleep(400);
    if (!Array.isArray(data)) { console.log('no data'); continue; }
    // Count species frequency
    const freq = {};
    for (const obs of data) {
      freq[obs.comName] = (freq[obs.comName] || 0) + 1;
    }
    // Species seen in >10% of the returned checklist-proxied observations
    // (We use raw count > 5 as proxy since we don't have checklist denominators from this endpoint)
    const common = Object.entries(freq)
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([name, count]) => ({ name, count }));

    const ourBirds = (cache[park.id]?.animals || []).filter(a => a.animalType === 'bird');
    const ourNames = new Set(ourBirds.map(a => a.name.toLowerCase()));
    const missing = common.filter(b => !ourNames.has(b.name.toLowerCase()));

    results[park.id] = {
      eBirdCommonCount: common.length,
      ourBirdCount: ourBirds.length,
      missingCommonBirds: missing.slice(0, 15),
    };
    console.log(`${common.length} common eBird / ${ourBirds.length} ours / ${missing.length} missing`);
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 6 — Reptile & Amphibian Completeness
// ══════════════════════════════════════════════════════════════════════════════
async function check6_reptAmph(cache, parks) {
  console.log('\n[6/12] Reptile & amphibian completeness…');
  const results = {};
  for (const park of parks) {
    process.stdout.write(`   ${park.id}… `);
    const url = `https://api.inaturalist.org/v1/observations/species_counts?lat=${park.lat}&lng=${park.lng}&radius=30&quality_grade=research&iconic_taxa=Reptilia,Amphibia&per_page=20`;
    const data = await fetchJson(url);
    await sleep(700);
    if (!data?.results) { console.log('no data'); continue; }
    const inatSp = data.results.filter(r => r.count >= 10).map(r => ({
      name: r.taxon.preferred_common_name || r.taxon.name,
      sci: r.taxon.name,
      count: r.count,
    }));
    const ours = (cache[park.id]?.animals || []).filter(a =>
      a.animalType === 'reptile' || a.animalType === 'amphibian'
    );
    const ourNames = new Set([
      ...ours.map(a => a.name.toLowerCase()),
      ...ours.filter(a => a.scientificName).map(a => a.scientificName.toLowerCase()),
    ]);
    const missing = inatSp.filter(s =>
      !ourNames.has(s.name.toLowerCase()) &&
      !ourNames.has(s.sci.toLowerCase())
    );
    results[park.id] = {
      inatCount: inatSp.length, ourCount: ours.length,
      missingCount: missing.length, missing: missing.slice(0, 10),
    };
    const tag = missing.length > 0 ? `⚠ ${missing.length} missing` : '✓';
    console.log(`${inatSp.length} iNat / ${ours.length} ours / ${tag}`);
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 7 — Photo Completeness
// ══════════════════════════════════════════════════════════════════════════════
function check7_photos(cache, photos) {
  console.log('\n[7/12] Photo completeness…');
  const bundledNames = new Set(Object.keys(photos));
  // Count all unique animal names
  const allAnimals = new Map(); // name -> count across parks
  for (const park of Object.values(cache)) {
    for (const a of (park.animals || [])) {
      allAnimals.set(a.name, (allAnimals.get(a.name) || 0) + 1);
    }
  }
  // Top 50 by frequency
  const top50 = [...allAnimals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => ({ name, count, hasPhoto: bundledNames.has(name) }));

  const top50Missing = top50.filter(a => !a.hasPhoto);
  // All bundled photos
  const bundledCount = bundledNames.size;
  // What animals in cache have no bundled photo
  const uniqueAnimals = [...allAnimals.keys()];
  const withoutPhoto = uniqueAnimals.filter(n => !bundledNames.has(n));

  console.log(`   Bundled photos: ${bundledCount}`);
  console.log(`   Unique animals in cache: ${uniqueAnimals.length}`);
  console.log(`   Animals without bundled photo: ${withoutPhoto.length}`);
  console.log(`   Top-50 missing photos: ${top50Missing.map(a => a.name).join(', ')}`);
  return { bundledCount, uniqueAnimals: uniqueAnimals.length, withoutPhotoCount: withoutPhoto.length, top50, top50Missing };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 8 — Description Quality
// ══════════════════════════════════════════════════════════════════════════════
function check8_descriptions(cache) {
  console.log('\n[8/12] Description quality audit…');
  const issues = { tooShort: [], sciAsDesc: [], boilerplate: [], foreign: [], missingDesc: [] };
  let total = 0, withDesc = 0;
  // Sample 100 for quality
  const sample = [];
  const all = [];
  for (const [parkId, park] of Object.entries(cache)) {
    for (const a of (park.animals || [])) {
      total++;
      const loc = `${parkId}::${a.name}`;
      if (!a.description) { issues.missingDesc.push(loc); continue; }
      withDesc++;
      const d = a.description.trim();
      all.push({ name: a.name, park: parkId, desc: d, len: d.length });
      if (d.length < 50) issues.tooShort.push({ name: a.name, park: parkId, desc: d });
      if (a.scientificName && (d === a.scientificName || d.toLowerCase() === a.scientificName.toLowerCase()))
        issues.sciAsDesc.push({ name: a.name, park: parkId });
      if (/officially documented|verified in \d+|from (eBird|iNat|NPS) records/i.test(d))
        issues.boilerplate.push({ name: a.name, park: parkId, desc: d.slice(0,80) });
      const nonAscii = (d.match(/[^\x00-\x7F]/g) || []).length;
      if (nonAscii / d.length > 0.25 && d.length > 20)
        issues.foreign.push({ name: a.name, park: parkId, desc: d.slice(0, 60) });
    }
  }
  // Random sample of 100
  const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 100);
  const avgLen = all.reduce((s, a) => s + a.len, 0) / (all.length || 1);
  console.log(`   Total: ${total}, with description: ${withDesc}, avg length: ${avgLen.toFixed(0)} chars`);
  console.log(`   Too short (<50 chars): ${issues.tooShort.length}`);
  console.log(`   Boilerplate: ${issues.boilerplate.length}`);
  console.log(`   Foreign language: ${issues.foreign.length}`);
  console.log(`   Sci name as description: ${issues.sciAsDesc.length}`);
  return { total, withDesc, avgLen: Math.round(avgLen), issues: {
    tooShort: { count: issues.tooShort.length, examples: issues.tooShort.slice(0,5) },
    sciAsDesc: { count: issues.sciAsDesc.length, examples: issues.sciAsDesc.slice(0,5) },
    boilerplate: { count: issues.boilerplate.length, examples: issues.boilerplate.slice(0,5) },
    foreign: { count: issues.foreign.length, examples: issues.foreign.slice(0,5) },
    missingDesc: { count: issues.missingDesc.length, examples: issues.missingDesc.slice(0,5) },
  }, sampleDescriptions: shuffled.slice(0,20).map(a => ({ name: a.name, park: a.park, desc: a.desc.slice(0,120) })) };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 9 — Rarity Distribution Per Park
// ══════════════════════════════════════════════════════════════════════════════
function check9_rarityDistribution(cache) {
  console.log('\n[9/12] Rarity distribution analysis…');
  const results = {};
  const flagged = [];
  for (const [parkId, park] of Object.entries(cache)) {
    const animals = park.animals || [];
    const total = animals.length;
    if (total === 0) continue;
    const counts = {};
    for (const tier of RARITY_TIERS) counts[tier] = 0;
    for (const a of animals) if (a.rarity) counts[a.rarity] = (counts[a.rarity] || 0) + 1;
    const pcts = {};
    for (const [k, v] of Object.entries(counts)) pcts[k] = +(v / total * 100).toFixed(1);
    const flags = [];
    // Flag if >50% in single tier
    for (const [tier, pct] of Object.entries(pcts)) {
      if (pct > 50) flags.push(`DOMINANT_TIER: ${pct}% are ${tier}`);
    }
    // Flag if guaranteed+very_likely < 2%
    const topTwo = (pcts.guaranteed || 0) + (pcts.very_likely || 0);
    if (topTwo < 2) flags.push(`LOW_GUARANTEED: only ${topTwo}% are Guaranteed or Very Likely`);
    // Flag if exceptional > 20%
    if ((pcts.exceptional || 0) > 20) flags.push(`HIGH_EXCEPTIONAL: ${pcts.exceptional}% are Exceptional`);
    results[parkId] = { total, counts, pcts, flags };
    if (flags.length) {
      flagged.push({ park: parkId, flags, pcts });
      flags.forEach(f => console.log(`   ⚠ ${parkId}: ${f}`));
    }
  }
  return { perPark: results, flagged };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 10 — Cross-Park Consistency
// ══════════════════════════════════════════════════════════════════════════════
function check10_crossPark(cache) {
  console.log('\n[10/12] Cross-park consistency check…');
  const TARGET_ANIMALS = [
    'Coyote','White-tailed Deer','Bald Eagle','American Robin','Black Bear',
    'Mallard','Canada Goose','Great Blue Heron','Red-tailed Hawk','Raccoon',
    'Mule Deer','Wild Turkey','American Crow','Pronghorn','Elk','Moose',
    'Osprey','Peregrine Falcon','River Otter','Beaver',
  ];
  const results = {};
  const flagged = [];
  for (const target of TARGET_ANIMALS) {
    const appearances = [];
    for (const [parkId, park] of Object.entries(cache)) {
      const a = (park.animals || []).find(x => x.name.toLowerCase() === target.toLowerCase());
      if (a) appearances.push({ park: parkId, rarity: a.rarity, rank: RARITY_RANK[a.rarity] ?? 99 });
    }
    if (appearances.length < 2) {
      results[target] = { appearances, flags: [] };
      continue;
    }
    const ranks = appearances.map(a => a.rank);
    const minRank = Math.min(...ranks), maxRank = Math.max(...ranks);
    const spread = maxRank - minRank;
    const flags = [];
    if (spread >= 4) {
      const lo = appearances.find(a => a.rank === minRank);
      const hi = appearances.find(a => a.rank === maxRank);
      flags.push(`EXTREME_SPREAD: ${lo.park}=${lo.rarity} vs ${hi.park}=${hi.rarity} (${spread} tiers apart)`);
      flagged.push({ animal: target, spread, appearances });
      console.log(`   ⚠ ${target}: ${spread}-tier spread (${lo.rarity} to ${hi.rarity})`);
    }
    results[target] = { appearances, flags };
  }
  return { perAnimal: results, flagged };
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 11 — Visitor Experience Cross-Reference
// ══════════════════════════════════════════════════════════════════════════════
async function check11_visitorExperience(cache, parks) {
  console.log('\n[11/12] Visitor experience check (iNat top-5 per park)…');
  const TARGET_PARKS = [
    'yellowstone','grandcanyon','zion','rockymountain','acadia',
    'olympic','grandteton','glacier','yosemite','joshuatree',
    'cuyahogavalley','indianadunes','hotsprings','everglades','greatsmokymountains',
  ];
  const results = {};
  for (const parkId of TARGET_PARKS) {
    const park = parks.find(p => p.id === parkId);
    if (!park) continue;
    process.stdout.write(`   ${parkId}… `);
    const url = `https://api.inaturalist.org/v1/observations/species_counts?lat=${park.lat}&lng=${park.lng}&radius=25&quality_grade=research&per_page=10`;
    const data = await fetchJson(url);
    await sleep(700);
    const animals = cache[parkId]?.animals || [];
    const top5inat = (data?.results || []).slice(0, 5).map(r => {
      const name = r.taxon.preferred_common_name || r.taxon.name;
      const ours = animals.find(a => a.name.toLowerCase() === name.toLowerCase() ||
        (a.scientificName && a.scientificName.toLowerCase() === r.taxon.name.toLowerCase()));
      return {
        name, count: r.count,
        ourRarity: ours?.rarity || 'NOT IN DATA',
        ourSeasons: ours?.seasons || [],
        ok: ours && !['exceptional','rare'].includes(ours.rarity),
      };
    });
    const issues = top5inat.filter(s => !s.ok);
    results[parkId] = { top5inat, issues };
    console.log(issues.length ? `⚠ ${issues.length} issues` : '✓');
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHECK 12 — Summary Report
// ══════════════════════════════════════════════════════════════════════════════
function check12_summary(results) {
  console.log('\n[12/12] Generating summary report…');
  const issues = { critical: [], high: [], medium: [], low: [] };
  let score = 100;

  // Integrity issues
  const c1 = results.check1;
  if (c1.summary.missingName?.count > 0) { issues.critical.push(`${c1.summary.missingName.count} animals missing name`); score -= 5; }
  if (c1.summary.missingRarity?.count > 0) { issues.critical.push(`${c1.summary.missingRarity.count} animals missing rarity`); score -= 5; }
  if (c1.summary.invalidRarity?.count > 0) { issues.high.push(`${c1.summary.invalidRarity.count} animals with invalid rarity value`); score -= 3; }
  if (c1.summary.missingSeasons?.count > 0) { issues.high.push(`${c1.summary.missingSeasons.count} animals missing seasons`); score -= 2; }
  if (c1.summary.missingAnimalType?.count > 0) { issues.high.push(`${c1.summary.missingAnimalType.count} animals missing animalType`); score -= 2; }
  if (c1.summary.missingDescription?.count > 0) { issues.medium.push(`${c1.summary.missingDescription.count} animals missing description`); score -= Math.min(5, c1.summary.missingDescription.count / 100); }
  if (c1.summary.shortDescription?.count > 0) { issues.low.push(`${c1.summary.shortDescription.count} descriptions under 50 chars`); score -= 1; }
  if (c1.summary.boilerplateDescription?.count > 0) { issues.medium.push(`${c1.summary.boilerplateDescription.count} boilerplate descriptions`); score -= 1; }
  if (c1.summary.foreignDescription?.count > 0) { issues.high.push(`${c1.summary.foreignDescription.count} possible foreign-language descriptions`); score -= 2; }

  // Season flags
  const c3 = results.check3;
  if (c3.flagged?.length > 0) { issues.high.push(`${c3.flagged.length} parks with suspect season distributions`); score -= c3.flagged.length * 0.5; }

  // Rarity distribution flags
  const c9 = results.check9;
  if (c9.flagged?.length > 0) { issues.medium.push(`${c9.flagged.length} parks with skewed rarity distribution`); score -= c9.flagged.length * 0.3; }

  // Cross-park consistency
  const c10 = results.check10;
  if (c10.flagged?.length > 0) { issues.medium.push(`${c10.flagged.length} animals with extreme cross-park rarity spread`); score -= c10.flagged.length * 0.5; }

  // Photo completeness
  const c7 = results.check7;
  if (c7.top50Missing?.length > 5) { issues.medium.push(`${c7.top50Missing.length} top-50 animals missing photos`); score -= 2; }

  // iNat underrated
  const c2Flags = Object.values(results.check2 || {}).flatMap(p => p.flagged_underrated || []);
  if (c2Flags.length > 10) { issues.high.push(`${c2Flags.length} animals potentially underrated vs iNat data`); score -= 3; }

  // Mammal missing
  const c4Parks = Object.values(results.check4 || {}).filter(p => p.missingCount > 3);
  if (c4Parks.length > 5) { issues.medium.push(`${c4Parks.length} parks missing 3+ commonly-seen NPS mammals`); score -= 2; }

  // Reptile/amphibian missing
  const c6Flags = Object.values(results.check6 || {}).filter(p => p.missingCount > 2);
  if (c6Flags.length > 3) { issues.low.push(`${c6Flags.length} parks missing 2+ commonly-observed reptiles/amphibians`); score -= 1; }

  score = Math.max(0, Math.round(score));
  return { score, issues, totalAnimals: c1.total };
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log('  DEEP AUDIT — Pre-Launch Quality Check');
  console.log('  Wildlife Interactive Map');
  console.log('══════════════════════════════════════════════════');

  const cache  = loadCache();
  const parks  = loadParkMeta().filter(p => cache[p.id]);
  const photos = loadPhotoCache();

  console.log(`\nLoaded: ${parks.length} parks, ${Object.values(cache).reduce((s,p) => s + (p.animals||[]).length, 0)} animals, ${Object.keys(photos).length} bundled photos`);

  const results = {};

  // Offline checks (fast)
  results.check1  = check1_integrity(cache);
  results.check3  = check3_seasons(cache, parks);
  results.check7  = check7_photos(cache, photos);
  results.check8  = check8_descriptions(cache);
  results.check9  = check9_rarityDistribution(cache);
  results.check10 = check10_crossPark(cache);

  // API checks (slower, rate-limited)
  results.check2  = await check2_inatTopSpecies(cache, parks);
  results.check4  = await check4_npsMammals(cache, parks);
  results.check5  = await check5_ebird(cache, parks);
  results.check6  = await check6_reptAmph(cache, parks);
  results.check11 = await check11_visitorExperience(cache, parks);

  // Summary
  results.check12 = check12_summary(results);

  // Save results
  const outPath = path.join(__dirname, 'deepAudit_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  // Final console report
  const s = results.check12;
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  FINAL SCORE: ${s.score}/100`);
  console.log('══════════════════════════════════════════════════');
  console.log(`  Total animals audited: ${s.totalAnimals}`);
  console.log(`\n  🔴 CRITICAL (${s.issues.critical.length}):`);
  s.issues.critical.forEach(i => console.log(`     • ${i}`));
  console.log(`\n  🟠 HIGH (${s.issues.high.length}):`);
  s.issues.high.forEach(i => console.log(`     • ${i}`));
  console.log(`\n  🟡 MEDIUM (${s.issues.medium.length}):`);
  s.issues.medium.forEach(i => console.log(`     • ${i}`));
  console.log(`\n  🟢 LOW (${s.issues.low.length}):`);
  s.issues.low.forEach(i => console.log(`     • ${i}`));
  console.log(`\n  Full results → ${outPath}`);
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Audit failed:', err); process.exit(1); });
