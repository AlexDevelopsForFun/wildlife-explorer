#!/usr/bin/env node
/**
 * scripts/buildStateParkBirdFreq.js
 *
 * Build-time eBird county-level bird-frequency cache for ALL wired state-park
 * states — the gold-standard signal national parks use (the live barChart API
 * 404s; real frequency comes from sampling county historic checklists). For
 * each park we resolve its eBird county (via the nearest hotspot's
 * subnational2Code — no hand-mapping), then sample 48 dates per county
 * (1st/8th/15th/22nd of each month, most recent full year):
 *   /v2/product/stats/{county}/{y}/{m}/{d}      (checklist count — skip thin dates)
 *   /v2/data/obs/{county}/historic/{y}/{m}/{d}  (species present that date)
 * → per-species peak-season checklist frequency (dates_present / valid_dates).
 *
 * Output: src/data/stateParkBirdFreq.js  (covers every state in the registry)
 *   PARK_COUNTY       = { parkId: 'US-XX-###' }
 *   COUNTY_BIRD_FREQ  = { 'US-XX-###': { '<lower comName>': { f: peak, s: seasons } } }
 *
 * County results are cached under scripts/_nj_county_cache/ (county codes are
 * unique, so the cache is shared across states) — re-runs only sample NEW
 * counties. Requires VITE_EBIRD_API_KEY (.env). Run: node scripts/buildStateParkBirdFreq.js
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'stateParkBirdFreq.js');
const CACHE_DIR = path.join(__dirname, '_nj_county_cache'); // shared county cache (codes are unique)

function loadEnv() {
  try {
    const txt = readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no .env */ }
}
loadEnv();
const EBIRD_KEY = process.env.VITE_EBIRD_API_KEY || process.env.EBIRD_API_KEY || '';
if (!EBIRD_KEY) { console.error('❌ VITE_EBIRD_API_KEY not set (.env)'); process.exit(1); }
const HDRS = { headers: { 'X-eBirdApiToken': EBIRD_KEY } };

const sleep = ms => new Promise(r => setTimeout(r, ms));
// Retry on rate-limit (429) / transient 5xx with backoff; 4xx (e.g. 404 "no
// data for date") returns null without retrying.
async function jget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      // 20s per-request timeout — a stalled/dropped eBird connection otherwise
      // blocks a worker forever (the whole parallel build can hang). Timeout →
      // throw → retry/backoff below.
      const r = await fetch(url, { ...HDRS, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) { await sleep(800 * (i + 1)); continue; }
      return null;
    } catch { await sleep(500 * (i + 1)); }
  }
  return null;
}
// Concurrency-limited map that PRESERVES input order in the result (so the
// generated file is deterministic regardless of which worker finishes first).
async function pMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  const worker = async () => { while (idx < items.length) { const i = idx++; results[i] = await fn(items[i], i); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
const haversine = (a, b, c, d) => {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const SAMPLE_DAYS = [1, 8, 15, 22];
// Denser "deep" pass (every other day) re-tried only for counties the 48-date
// pass finds too sparse — rural Appalachian / western counties genuinely have
// the checklists, just not on the 4-days-a-month grid. Finds the real ≥12 valid
// dates without lowering the quality bar.
const DEEP_DAYS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27];
const SEASON_MONTHS = { spring: [3,4,5], summer: [6,7,8], fall: [9,10,11], winter: [12,1,2] };
const MIN_CHECKLISTS_PER_DATE = 5;
// 12 valid sample-dates (of 48) is the floor for a usable peak-season frequency
// (~3/season). Lowering 20 → 15 → 12 brings the Northeast's sparsest-birded
// counties (VT Grand Isle/Essex; ME Piscataquis/Somerset — the Katahdin & Bigelow
// North Woods) up to county-grade instead of the radius fallback. The frequency
// is coarse for these, but the UI flags thin data as "approximate," and it only
// ever adds coverage (counties above the floor are unchanged).
const MIN_VALID_DATES = 12;
const YEAR = new Date().getFullYear() - 1;

// Border parks whose nearest hotspot sits in an adjacent state — pin to the
// correct in-state county (which we also sample).
const COUNTY_OVERRIDE = {
  'nj-hewitt': 'US-NJ-031',          // on the NY line → Passaic, NJ
  'ri-buck-hill': 'US-RI-007',       // Burrillville, NW corner on the CT/MA line → Providence, RI
  'ri-pawcatuck-river': 'US-RI-009', // Westerly; the Pawcatuck R. is the CT border → Washington, RI
  'ma-bash-bish-falls': 'US-MA-003', // Mount Washington, SW corner on the NY line → Berkshire, MA
  'wv-panther-sf': 'US-WV-047',      // Panther SF, far SW WV on the VA/KY line → McDowell, WV
  'in-falls-of-the-ohio': 'US-IN-019', // Clarksville IN, across the river from Louisville → Clark, IN
  'az-lake-havasu': 'US-AZ-015',     // on the AZ bank of the Colorado R. (the CA border) → Mohave, AZ
};

async function countyForPark(lat, lng) {
  for (const dist of [10, 25]) {
    const hs = await jget(`https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=${dist}&fmt=json`);
    await sleep(300);
    if (Array.isArray(hs) && hs.length) {
      let best = null, bestD = Infinity;
      for (const h of hs) {
        if (!h.subnational2Code || h.lat == null) continue;
        const d = haversine(lat, lng, h.lat, h.lng);
        if (d < bestD) { bestD = d; best = h; }
      }
      if (best) return best.subnational2Code;
    }
  }
  return null;
}

async function sampleDates(county, days, year) {
  const datesPresent = new Map(), monthData = new Map(), monthValid = {};
  let valid = 0, total = 0;
  for (let month = 1; month <= 12; month++) {
    for (const day of days) {
      total++;
      const stats = await jget(`https://api.ebird.org/v2/product/stats/${county}/${year}/${month}/${day}`);
      await sleep(150);
      if ((stats?.numChecklists ?? 0) < MIN_CHECKLISTS_PER_DATE) continue;
      valid++; monthValid[month] = (monthValid[month] ?? 0) + 1;
      const obs = await jget(`https://api.ebird.org/v2/data/obs/${county}/historic/${year}/${month}/${day}`);
      await sleep(400);
      if (!Array.isArray(obs)) continue;
      for (const o of obs) {
        if (!o.comName) continue;
        datesPresent.set(o.comName, (datesPresent.get(o.comName) ?? 0) + 1);
        if (!monthData.has(o.comName)) monthData.set(o.comName, {});
        const mm = monthData.get(o.comName); mm[month] = (mm[month] ?? 0) + 1;
      }
    }
  }
  return { valid, total, datesPresent, monthData, monthValid };
}

// Pool two sample results (same date grid, different years): sum valid/total
// sample-dates and per-species/per-month presence counts. The seasonal frequency
// (present/valid) is then computed over the pooled multi-year sample — more data
// for genuinely under-birded counties, not a lowered bar.
function mergeSamples(a, b) {
  const datesPresent = new Map(a.datesPresent);
  for (const [k, v] of b.datesPresent) datesPresent.set(k, (datesPresent.get(k) ?? 0) + v);
  const monthData = new Map();
  for (const src of [a.monthData, b.monthData]) {
    for (const [name, mm] of src) {
      if (!monthData.has(name)) monthData.set(name, {});
      const tgt = monthData.get(name);
      for (const [m, c] of Object.entries(mm)) tgt[m] = (tgt[m] ?? 0) + c;
    }
  }
  const monthValid = { ...a.monthValid };
  for (const [m, c] of Object.entries(b.monthValid)) monthValid[m] = (monthValid[m] ?? 0) + c;
  return { valid: a.valid + b.valid, total: a.total + b.total, datesPresent, monthData, monthValid };
}

export async function sampleCounty(county) {
  const cacheFile = path.join(CACHE_DIR, `${county}.json`);
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
    if (cached.__skip__) { console.log(`  [${county}] cached (skip)`); return null; }
    console.log(`  [${county}] cached`);
    return cached;
  }
  let samp = await sampleDates(county, SAMPLE_DAYS, YEAR);
  let note = '';
  if (samp.valid < MIN_VALID_DATES) {                 // sparse → denser deep pass…
    samp = await sampleDates(county, DEEP_DAYS, YEAR);
    note = ' (deep)';
    for (const y of [YEAR - 1, YEAR - 2]) {            // …then pool prior years until we clear the floor
      if (samp.valid >= MIN_VALID_DATES) break;
      samp = mergeSamples(samp, await sampleDates(county, DEEP_DAYS, y));
      note = ` (deep ${YEAR - y + 1}yr)`;
    }
  }
  const { datesPresent, monthData, monthValid } = samp;
  console.log(`  [${county}] ${samp.valid}/${samp.total} valid dates, ${datesPresent.size} species${note}`);
  mkdirSync(CACHE_DIR, { recursive: true });
  if (samp.valid < MIN_VALID_DATES) {                 // genuinely under-birded even over 3 years
    console.log(`  [${county}] ⚠ too few valid dates — skipping`);
    writeFileSync(cacheFile, JSON.stringify({ __skip__: 1 }), 'utf8'); // cache the skip → no re-sample next build
    return null;
  }
  const out = {};
  for (const [comName] of datesPresent) {
    const md = monthData.get(comName) ?? {};
    const seasonFreqs = {};
    for (const [season, months] of Object.entries(SEASON_MONTHS)) {
      let sv = 0, sp = 0;
      for (const m of months) { sv += monthValid[m] ?? 0; sp += md[m] ?? 0; }
      seasonFreqs[season] = sv > 0 ? sp / sv : 0;
    }
    const peak = Math.max(...Object.values(seasonFreqs));
    if (peak <= 0) continue;
    const present4 = Object.entries(seasonFreqs).filter(([, f]) => f >= 0.10).map(([s]) => s);
    const seasons = present4.length === 4 ? ['year_round'] : (present4.length ? present4 : ['spring','summer','fall']);
    out[comName.toLowerCase()] = { f: +peak.toFixed(3), s: seasons };
  }
  writeFileSync(cacheFile, JSON.stringify(out), 'utf8');
  return out;
}

async function main() {
  const allParks = Object.values(STATE_PARKS_BY_STATE).flat();
  console.log(`\n🐦 State-park county bird-frequency build — ${allParks.length} parks (year ${YEAR})\n`);
  const parkCounty = {};
  console.log('Resolving park → county… (6-way parallel)');
  const resolved = await pMap(
    allParks,
    async (p) => ({ id: p.id, c: COUNTY_OVERRIDE[p.id] ?? await countyForPark(p.lat, p.lng) }),
    6,
  );
  for (const { id, c } of resolved) {       // registry order preserved → deterministic
    if (c) { parkCounty[id] = c; console.log(`  ${id.padEnd(22)} ${c}`); }
    else console.log(`  ${id.padEnd(22)} (none)`);
  }
  const counties = [...new Set(Object.values(parkCounty))];
  console.log(`\n${counties.length} unique counties to sample… (4-way parallel; cached counties are instant)\n`);
  const countyFreq = {};
  const sampled = await pMap(counties, async (c) => ({ c, data: await sampleCounty(c) }), 4);
  for (const { c, data } of sampled) if (data) countyFreq[c] = data;  // counties order preserved
  const body =
    `// AUTO-GENERATED by scripts/buildStateParkBirdFreq.js — do not edit by hand.\n` +
    `// eBird county-level peak-season checklist frequency for state-park birds,\n` +
    `// all wired states (year ${YEAR}, 48-date sampling). f = peak seasonal\n` +
    `// frequency (0–1), s = present seasons. Gives state-park birds national-\n` +
    `// park-grade rarity. Counties with too few eBird dates are omitted →\n` +
    `// those parks gracefully fall back to the live recency/iNat signal.\n` +
    `export const PARK_COUNTY = ${JSON.stringify(parkCounty, null, 0)};\n\n` +
    `export const COUNTY_BIRD_FREQ = ${JSON.stringify(countyFreq)};\n`;
  writeFileSync(OUT, body, 'utf8');
  const spp = Object.values(countyFreq).reduce((n, c) => n + Object.keys(c).length, 0);
  console.log(`\n✅ Wrote ${OUT}`);
  console.log(`   ${Object.keys(parkCounty).length} parks → ${Object.keys(countyFreq).length} counties w/ data, ${spp} county-species entries.`);
}

// Only run the full build when invoked directly — allows importing sampleCounty
// (e.g. scripts/buildUnitCounties.mjs) without triggering the 4,050-park build.
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
