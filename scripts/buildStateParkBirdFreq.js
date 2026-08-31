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
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { UNIT_COUNTY_EXTRA } from '../src/data/unitCountyExtra.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'data', 'stateParkBirdFreq.js');
const CACHE_DIR = path.join(__dirname, '_nj_county_cache'); // shared county cache (codes are unique)

// ── Park → county resolution cache ────────────────────────────────────────
// countyForPark() costs 1-2 eBird calls at 300 ms each, and the build ran it
// for ALL 4,050 parks on every single run — ~5,000 requests and 15-30 minutes
// spent rediscovering a mapping that does not change, before any sampling even
// begins. Parks do not move.
//
// The cache key embeds the COORDINATES, not just the id, so a curation fix
// that nudges a park's lat/lng invalidates its entry automatically instead of
// silently pinning it to the old county. That is the failure mode worth
// designing against here: a wrong county is far more damaging than a slow
// build, because every species reading for that park inherits it.
//
// Only successful resolutions are cached. A null means eBird had no hotspot
// within 25 km, which CAN become resolvable as hotspots are added, and it is
// only ~7 parks — not worth freezing in to save 14 calls.
const PARK_COUNTY_CACHE = path.join(__dirname, '_park_county_cache.json');
const _parkCountyKey = (p) => `${p.id}@${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;

function loadParkCountyCache() {
  try {
    if (!existsSync(PARK_COUNTY_CACHE)) return {};
    const o = JSON.parse(readFileSync(PARK_COUNTY_CACHE, 'utf8'));
    return (o && typeof o === 'object') ? o : {};
  } catch { return {}; }        // corrupt → rebuild it rather than die
}

function saveParkCountyCache(map) {
  try {
    // Sorted so the committed file diffs cleanly instead of reshuffling.
    const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a < b ? -1 : 1));
    writeFileSync(PARK_COUNTY_CACHE, JSON.stringify(sorted, null, 0), 'utf8');
  } catch (e) {
    console.warn(`  ⚠  could not write park→county cache: ${e.message}`);
  }
}

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
// eBird request stats. jget() used to swallow every failure and return null,
// which is how 2,789 parks silently became "(none)" on 2026-08-20 and the
// build wrote a 44%-truncated file with a success line at the end. A run that
// is being throttled must SAY SO.
const EBIRD_STATS = { ok: 0, throttled: 0, failed: 0, penaltyMs: 0 };

async function jget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      // Adaptive penalty: once eBird starts pushing back, every subsequent
      // request slows down too, instead of each one re-earning its own 429.
      if (EBIRD_STATS.penaltyMs) await sleep(EBIRD_STATS.penaltyMs);
      // 20s per-request timeout -- a stalled/dropped eBird connection otherwise
      // blocks a worker forever (the whole parallel build can hang). Timeout ->
      // throw -> retry/backoff below.
      const r = await fetch(url, { ...HDRS, signal: AbortSignal.timeout(20000) });
      if (r.ok) {
        EBIRD_STATS.ok++;
        if (EBIRD_STATS.penaltyMs && EBIRD_STATS.ok % 50 === 0) {
          EBIRD_STATS.penaltyMs = Math.max(0, EBIRD_STATS.penaltyMs - 50);
        }
        return await r.json();
      }
      if (r.status === 429 || r.status >= 500) {
        if (r.status === 429) {
          EBIRD_STATS.throttled++;
          EBIRD_STATS.penaltyMs = Math.min(EBIRD_STATS.penaltyMs + 100, 2000);
        }
        const ra = Number(r.headers.get('retry-after'));
        await sleep(Number.isFinite(ra) && ra > 0
          ? Math.min(ra * 1000, 20000)
          : 800 * (i + 1));
        continue;
      }
      EBIRD_STATS.failed++;
      return null;
    } catch { await sleep(500 * (i + 1)); }
  }
  EBIRD_STATS.failed++;
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
  // ── Cross-BORDER misfires (found 2026-08-20) ────────────────────────────────
  // These five resolved to CANADIAN and MEXICAN counties, and each already had
  // frequency data — so US parks were serving foreign checklist rates in
  // production. countyForPark() takes the nearest eBird hotspot, and on a
  // border (or an island in a shared waterway) that is often the other
  // country's. Counties below are the point-in-polygon result from
  // scripts/_us_counties.geojson, which is authoritative for where the park
  // physically sits.
  'vt-black-turn-brook': 'US-VT-009',   // was CA-QC-CT (Quebec)   → Essex, VT
  'ny-mary-island': 'US-NY-045',        // was CA-ON-LG (Ontario)  → Jefferson, NY (Thousand Islands)
  'mi-lime-island': 'US-MI-033',        // was CA-ON-AL (Ontario)  → Chippewa, MI (St Marys River island)
  'mn-lake-of-the-woods': 'US-MN-077',  // was CA-ON-RR (Ontario)  → Lake of the Woods, MN
  'ca-border-field': 'US-CA-073',       // was MX-BCN-005 (Baja)   → San Diego, CA
  // ── Parks eBird could not resolve at all (found 2026-08-20) ────────────────
  // countyForPark() found no hotspot within 25 km, so these had NO county and
  // therefore no floor of any kind — not bird, not non-bird. Counties are the
  // point-in-polygon result from _us_counties.geojson; every one is 'inside'
  // its polygon (not a nearest-neighbour guess) and matches the park's own
  // state. Sparse-hotspot country, which is exactly where a county floor
  // matters most.
  'al-cedar-creek': 'US-AL-097',        // Mobile, AL
  'ms-holmes-county': 'US-MS-051',      // Holmes, MS
  'ms-kurtz-sf': 'US-MS-041',           // Greene, MS
  'ak-wood-tikchik': 'US-AK-070',       // Dillingham, AK (county sampled 2026-08-20: too sparse for a bird floor)
  // 'nv-forty-mile' was DELETED from the registry (2026-08-31). Its coordinates
  // (37.0739, -116.3489) fell inside the Nevada National Security Site, closed
  // to the public, where Nevada's park system has no unit — a bad Wikidata
  // import. It had been inheriting Nye County's 198-species floor via
  // PARK_COUNTY_EXTRA, i.e. publishing confident wildlife odds for a nuclear
  // test site. Do not re-add it from a Wikidata refresh without checking.
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
  const pcCache = loadParkCountyCache();
  let pcHits = 0, pcMiss = 0;
  console.log('Resolving park → county… (6-way parallel, cached)');
  const resolved = await pMap(
    allParks,
    async (p) => {
      // Override wins outright — it is a hand-made correction and must never
      // be shadowed by a cached automatic result.
      const ov = COUNTY_OVERRIDE[p.id];
      if (ov) return { id: p.id, c: ov, key: null };
      const key = _parkCountyKey(p);
      const hit = pcCache[key];
      if (hit) { pcHits++; return { id: p.id, c: hit, key }; }
      pcMiss++;
      return { id: p.id, c: await countyForPark(p.lat, p.lng), key };
    },
    6,
  );
  for (const { c, key } of resolved) if (key && c) pcCache[key] = c;
  saveParkCountyCache(pcCache);
  const noneCount = resolved.filter(r => !r.c).length;
  console.log(`  park→county: ${pcHits} cached, ${pcMiss} resolved via eBird, ${noneCount} unresolved`);
  console.log(`  eBird requests: ${EBIRD_STATS.ok} ok, ${EBIRD_STATS.throttled} throttled(429), ${EBIRD_STATS.failed} failed`);
  // Loud, early warning. The regression gate at the end is the hard stop, but
  // by then an hour of sampling has already been spent -- better to see the
  // problem here, while there is still a choice about continuing.
  if (noneCount > allParks.length * 0.05) {
    console.warn(`
  ⚠  ${noneCount}/${allParks.length} parks did not resolve to a county.`);
    console.warn(`     That is almost certainly eBird throttling, not bad data.`);
    console.warn(`     The build will refuse to overwrite good data if this holds.
`);
  }
  for (const { id, c } of resolved) {       // registry order preserved → deterministic
    if (c) { parkCounty[id] = c; console.log(`  ${id.padEnd(22)} ${c}`); }
    else console.log(`  ${id.padEnd(22)} (none)`);
  }
  // Sample the counties of FEDERAL units too (refuges + NPS monuments,
  // preserves, seashores) — not just state parks. This build iterated
  // PARK_COUNTY alone, so a county holding a refuge but no state park was
  // never sampled, leaving 213 refuges and 41 NPS units with no bird floor at
  // all: precisely the places people visit FOR birds. UNIT_COUNTY_EXTRA holds
  // the hand-mapped coastal/island refuges.
  //
  // PARK_COUNTY itself is deliberately NOT widened — it means "state park →
  // county" to every consumer, and federal units have their own maps.
  const parkCounties = new Set(Object.values(parkCounty));
  const unitCounties = new Set(
    [...Object.values(UNIT_COUNTY), ...Object.values(UNIT_COUNTY_EXTRA)].filter(Boolean));
  const extra = [...unitCounties].filter(c => !parkCounties.has(c));
  const counties = [...parkCounties, ...extra];
  console.log(`
${counties.length} unique counties to sample `
    + `(${parkCounties.size} state-park + ${extra.length} federal-unit-only)`
    + ` — 4-way parallel; cached counties are instant
`);
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

  // -- Regression gate --------------------------------------------------------
  // 2026-08-20: a local run resolved only 1,261 of 4,050 parks because eBird
  // throttled the hotspot lookups and jget() returns null SILENTLY. The build
  // then cheerfully overwrote 13.5 MB of good data with a 7.6 MB file -- a 44%
  // loss, signed off with a success line. The CI workflow has sanity gates
  // (parks>=3500) but running this script by hand bypasses them, so the gate
  // belongs HERE, where the write actually happens.
  //
  // Compares against whatever is already on disk rather than a hard-coded
  // number, so it keeps working as the park registry grows.
  const parkCount = Object.keys(parkCounty).length;
  const countyCount = Object.keys(countyFreq).length;
  if (existsSync(OUT) && !process.env.ALLOW_SHRINK) {
    const prev = readFileSync(OUT, 'utf8');
    const mP = prev.match(/PARK_COUNTY = (\{.*?\});/s);
    const mC = prev.match(/COUNTY_BIRD_FREQ = (\{.*\});/s);
    const nPrevParks = mP ? Object.keys(JSON.parse(mP[1])).length : 0;
    const nPrevCounties = mC ? Object.keys(JSON.parse(mC[1])).length : 0;
    const parkFloor = Math.floor(nPrevParks * 0.9);
    const countyFloor = Math.floor(nPrevCounties * 0.9);
    if (parkCount < parkFloor || countyCount < countyFloor) {
      console.error('\nREFUSING TO WRITE -- this build LOST data.');
      console.error(`   parks:    ${parkCount} (on disk: ${nPrevParks}, floor: ${parkFloor})`);
      console.error(`   counties: ${countyCount} (on disk: ${nPrevCounties}, floor: ${countyFloor})`);
      console.error('   Almost always eBird throttling the park->county lookups:');
      console.error("   grep '(none)' in the build log. Existing data left untouched.");
      console.error('   Override with ALLOW_SHRINK=1 only if the shrink is intended.\n');
      process.exit(1);
    }
  }

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
