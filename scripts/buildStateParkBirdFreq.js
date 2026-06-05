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
async function jget(url) {
  try { const r = await fetch(url, HDRS); return r.ok ? await r.json() : null; } catch { return null; }
}
const haversine = (a, b, c, d) => {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const SAMPLE_DAYS = [1, 8, 15, 22];
const SEASON_MONTHS = { spring: [3,4,5], summer: [6,7,8], fall: [9,10,11], winter: [12,1,2] };
const MIN_CHECKLISTS_PER_DATE = 5;
const MIN_VALID_DATES = 20;
const YEAR = new Date().getFullYear() - 1;

// Border parks whose nearest hotspot sits in an adjacent state — pin to the
// correct in-state county (which we also sample).
const COUNTY_OVERRIDE = {
  'nj-hewitt': 'US-NJ-031',          // on the NY line → Passaic, NJ
  'ri-buck-hill': 'US-RI-007',       // Burrillville, NW corner on the CT/MA line → Providence, RI
  'ri-pawcatuck-river': 'US-RI-009', // Westerly; the Pawcatuck R. is the CT border → Washington, RI
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

async function sampleCounty(county) {
  const cacheFile = path.join(CACHE_DIR, `${county}.json`);
  if (existsSync(cacheFile)) { console.log(`  [${county}] cached`); return JSON.parse(readFileSync(cacheFile, 'utf8')); }
  const datesPresent = new Map(), monthData = new Map(), monthValid = {};
  let valid = 0, total = 0;
  for (let month = 1; month <= 12; month++) {
    for (const day of SAMPLE_DAYS) {
      total++;
      const stats = await jget(`https://api.ebird.org/v2/product/stats/${county}/${YEAR}/${month}/${day}`);
      await sleep(180);
      if ((stats?.numChecklists ?? 0) < MIN_CHECKLISTS_PER_DATE) continue;
      valid++; monthValid[month] = (monthValid[month] ?? 0) + 1;
      const obs = await jget(`https://api.ebird.org/v2/data/obs/${county}/historic/${YEAR}/${month}/${day}`);
      await sleep(520);
      if (!Array.isArray(obs)) continue;
      for (const o of obs) {
        if (!o.comName) continue;
        datesPresent.set(o.comName, (datesPresent.get(o.comName) ?? 0) + 1);
        if (!monthData.has(o.comName)) monthData.set(o.comName, {});
        const mm = monthData.get(o.comName); mm[month] = (mm[month] ?? 0) + 1;
      }
    }
  }
  console.log(`  [${county}] ${valid}/${total} valid dates, ${datesPresent.size} species`);
  if (valid < MIN_VALID_DATES) { console.log(`  [${county}] ⚠ too few valid dates — skipping`); return null; }
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
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(out), 'utf8');
  return out;
}

async function main() {
  const allParks = Object.values(STATE_PARKS_BY_STATE).flat();
  console.log(`\n🐦 State-park county bird-frequency build — ${allParks.length} parks (year ${YEAR})\n`);
  const parkCounty = {};
  console.log('Resolving park → county…');
  for (const p of allParks) {
    const c = COUNTY_OVERRIDE[p.id] ?? await countyForPark(p.lat, p.lng);
    if (c) { parkCounty[p.id] = c; console.log(`  ${p.id.padEnd(22)} ${c}`); }
    else console.log(`  ${p.id.padEnd(22)} (none)`);
  }
  const counties = [...new Set(Object.values(parkCounty))];
  console.log(`\n${counties.length} unique counties to sample…\n`);
  const countyFreq = {};
  for (const c of counties) {
    const data = await sampleCounty(c);
    if (data) countyFreq[c] = data;
  }
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

main().catch(e => { console.error(e); process.exit(1); });
