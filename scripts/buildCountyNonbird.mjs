#!/usr/bin/env node
/**
 * scripts/buildCountyNonbird.mjs — county-level NON-BIRD species floor.
 *
 * Mirror of the eBird bird-frequency build, but for the other taxa (mammals,
 * reptiles, amphibians, fish, insects) from iNaturalist. WHY: birds get a
 * county checklist floor; the other taxa came only from whatever iNat had logged
 * right at a park, so sparse parks silently dropped iconic animals (a Florida
 * refuge with no nearby gator obs). A county floor means every park shows the
 * animals documented in its county, rated by how often they're seen there.
 *
 * Per county: resolve the iNat place_id from a representative park coordinate
 * (/places/nearby → admin_level 20), then for each taxon pull the top species
 * by research-grade observation count (species_counts). Frequency =
 * sqrt(count/maxCount) per taxon — the same normalisation the live path uses.
 *
 * Output: src/data/countyNonbird/nb_<st>.js (one lazy chunk per state) +
 *         src/data/countyNonbird/loader.js
 * Keyed by the SAME county code as the bird floor (US-XX-###), so a park's
 * PARK_COUNTY / UNIT_COUNTY county maps to both.
 *
 * Resumable: per-county cache in scripts/_nonbird_cache/. Run:
 *   node scripts/buildCountyNonbird.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';
import { PARK_COUNTY } from '../src/data/stateParkBirdFreq.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '_nonbird_cache');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'countyNonbird');
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const envVal = (names) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  try {
    const txt = readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const n of names) { const m = txt.match(new RegExp(`^${n}=(.+)$`, 'm')); if (m) return m[1].trim().replace(/^["']|["']$/g, ''); }
  } catch {}
  return '';
};
const NPS_KEY = envVal(['NPS_API_KEY', 'VITE_NPS_API_KEY', 'REACT_APP_NPS_API_KEY']);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function jget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'wildlifeexplorer.us county build' } });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      return null;
    } catch { await sleep(800 * (i + 1)); }
  }
  return null;
}

// Domestic / non-wildlife names that can slip through as research-grade.
const DOMESTIC = /^domestic\b|domesticated|feral cat|feral dog|^human$|house cat/i;

// Offshore / territorial / giant-park counties where the US-county place lookup
// (iNat admin_level 20) returns nothing — resolve them to the right iNat place
// directly (admin_level 10 island/municipio for PR; the park place for wrst).
// Verified place_ids; this is the "best-accuracy" resolver for these units.
const PLACE_OVERRIDE = {
  'US-PR-023': 11636, // Cabo Rojo (nwr_cabo-rojo)
  'US-PR-049': 11648, // Culebra (nwr_culebra)
  'US-PR-097': 11665, // Mayagüez — Desecheo I. (nwr_desecheo)
  'US-PR-079': 11636, // Cabo Rojo — Laguna Cartagena (nwr_laguna-cartagena, adjacent municipio)
  'US-PR-147': 11697, // Vieques (nwr_vieques)
  'US-AK-261': 72658, // Wrangell–St. Elias NP (nps_wrst)
};

// iconic taxon → app group + per-county cap (top N by observation count).
const TAXA = [
  ['Mammalia', 'mammal', 60],
  ['Reptilia', 'reptile', 60],
  ['Amphibia', 'amphibian', 45],
  ['Actinopterygii', 'marine', 60],
  ['Insecta', 'insect', 80],
];

// Natural NPS units (for counties only covered by a national park).
const NP_NATURAL = ['national park','national preserve','national seashore','national lakeshore','national recreation area','national reserve','national river','scenic river','scenic riverway','wild and scenic river','wild river'];
const NP_EXCLUDE = ['historic','memorial','battlefield','military','cemetery','heritage','parkway','scenic trail','historic trail'];
const NATURAL_MONUMENTS = new Set(['agfo','ania','band','buis','cabr','cakr','camo','cavo','cebr','chir','colm','crmo','depo','deto','dino','elma','flfo','fobu','hafo','jeca','joda','kaww','labe','muwo','nabr','orca','orpi','para','rabr','sucr','tica','tusk','vicr']);
const npsQualifies = (d='',c='') => { d=d.toLowerCase(); if (NP_EXCLUDE.some(p=>d.includes(p))) return false; if (NP_NATURAL.some(p=>d.includes(p))) return true; if (d.includes('national monument')) return NATURAL_MONUMENTS.has(c.toLowerCase()); return false; };
async function nationalCoords() {
  const out = {};
  if (!NPS_KEY) return out;
  const j = await jget(`https://developer.nps.gov/api/v1/parks?limit=600&api_key=${NPS_KEY}`);
  for (const p of j?.data ?? []) {
    if (!npsQualifies(p.designation, p.parkCode)) continue;
    const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
    if (isFinite(lat) && isFinite(lng) && !(lat===0&&lng===0)) out[`nps_${p.parkCode}`] = [lat, lng];
  }
  return out;
}

// Resolve the iNat county place_id for a coordinate (admin_level 20).
async function placeIdFor(lat, lng) {
  const d = 0.04;
  const j = await jget(`https://api.inaturalist.org/v1/places/nearby?nelat=${lat+d}&nelng=${lng+d}&swlat=${lat-d}&swlng=${lng-d}`);
  const std = j?.results?.standard ?? [];
  return std.find(p => p.admin_level === 20)?.id ?? null;
}

async function sampleCounty(fips, coord) {
  const cacheFile = path.join(CACHE_DIR, `${fips}.json`);
  if (existsSync(cacheFile)) { try { return JSON.parse(readFileSync(cacheFile, 'utf8')); } catch {} }
  const out = { pid: null, groups: {} };
  let pid = PLACE_OVERRIDE[fips] ?? null;
  if (!pid) { pid = await placeIdFor(coord[0], coord[1]); await sleep(900); }
  out.pid = pid;
  if (pid) {
    for (const [iconic, group, cap] of TAXA) {
      const j = await jget(`https://api.inaturalist.org/v1/observations/species_counts?place_id=${pid}&iconic_taxa[]=${iconic}&quality_grade=research&per_page=${cap}`);
      await sleep(900);
      const results = j?.results ?? [];
      if (!results.length) continue;
      const maxCount = results[0].count || 1;
      const list = [];
      for (const r of results) {
        const name = (r.taxon?.preferred_common_name || r.taxon?.name || '').trim();
        // research-grade already = community-verified, wild. count>=1 is a real
        // documented occurrence — keep it. Because results are capped + sorted by
        // count desc, single-obs species only survive in SPARSE (sub-cap) counties
        // (a rich county fills its cap with high-count species first), so this
        // recovers expected animals in low-coverage counties (rural Iowa keeps its
        // cottontail/beaver) without polluting well-sampled ones. Skip domestics.
        if (!name || r.count < 1) continue;
        if (DOMESTIC.test(name)) continue;
        const f = Math.min(0.95, Math.sqrt(r.count / maxCount));
        list.push([name, Math.round(f * 100) / 100]);
      }
      if (list.length) out.groups[group] = list;
    }
  }
  writeFileSync(cacheFile, JSON.stringify(out));
  const n = Object.values(out.groups).reduce((s, l) => s + l.length, 0);
  console.log(`  [${fips}] place ${pid ?? 'NONE'} → ${n} non-bird species`);
  return out;
}

async function main() {
  // ── representative coord per county FIPS ──────────────────────────────────
  const coordByFips = {};
  const spById = {};
  for (const arr of Object.values(STATE_PARKS_BY_STATE)) for (const p of (arr ?? [])) spById[p.id] = p;
  for (const [pid, fips] of Object.entries(PARK_COUNTY)) {
    if (coordByFips[fips]) continue;
    const p = spById[pid]; if (p) coordByFips[fips] = [p.lat, p.lng];
  }
  const refById = {}; for (const r of NATIONAL_WILDLIFE_REFUGES) refById[r.id] = r;
  const npsById = await nationalCoords();
  for (const [uid, fips] of Object.entries(UNIT_COUNTY)) {
    if (coordByFips[fips]) continue;
    const c = refById[uid] ? [refById[uid].lat, refById[uid].lng] : npsById[uid];
    if (c) coordByFips[fips] = c;
  }
  // Hand-mapped edge counties (orphan state parks + water-centroid refuges that
  // aren't in PARK_COUNTY/UNIT_COUNTY). County CENTROID coords so the iNat place
  // lookup reliably resolves the right county. Keeps these parks from showing a
  // birds-only list. Mirror of the 5 edge mappings added to App.jsx/useLiveData.
  const EDGE_COORDS = {
    'US-AL-097': [30.4935, -88.1975],  // Mobile (al-cedar-creek)
    'US-MS-041': [31.1869, -88.5615],  // Greene (ms-kurtz-sf)
    'US-WA-009': [48.1761, -123.9991], // Clallam (nwr_quillayute-needles)
    'US-ND-027': [47.6859, -98.9503],  // Eddy (nwr Johnson Lake — refuge pt hit an empty place)
    'US-ND-063': [47.9394, -98.2827],  // Nelson (nwr Lambs Lake)
    'US-MA-019': [41.3030, -70.1041],  // Nantucket (nwr_nantucket — island county)
  };
  for (const [fips, c] of Object.entries(EDGE_COORDS)) coordByFips[fips] = c;  // authoritative centroids

  const fipsList = Object.keys(coordByFips).sort();
  console.log(`County non-bird floor: ${fipsList.length} counties to sample (mammal/reptile/amphibian/fish/insect).\n`);

  const data = {};   // fips -> { mammal:[...], ... }
  let done = 0, withData = 0;
  // SINGLE worker on purpose: iNat throttles hard at >60 req/min, and 2 workers
  // (≈90/min attempted) get rate-limited into a crawl that blew the 6h CI budget.
  // One worker with the per-call sleeps below paces at ~45/min — under the limit,
  // so it runs at full speed without 429 backoffs. Cached counties are instant,
  // so a resumed run only pays for the un-sampled ones.
  const todo = [...fipsList];
  const worker = async () => {
    while (todo.length) {
      const fips = todo.shift();
      try {
        const res = await sampleCounty(fips, coordByFips[fips]);
        if (res && Object.keys(res.groups).length) { data[fips] = res.groups; withData++; }
      } catch (e) { console.error(`  ! ${fips}: ${e.message}`); }
      if (++done % 50 === 0) console.log(`  …${done}/${fipsList.length} (${withData} with data)`);
    }
  };
  await worker();

  // ── emit per-state chunks + loader ────────────────────────────────────────
  const byState = {};
  for (const [fips, groups] of Object.entries(data)) {
    const st = fips.split('-')[1]?.toLowerCase(); if (!st) continue;
    (byState[st] ??= {})[fips] = groups;
  }
  for (const [st, obj] of Object.entries(byState)) {
    writeFileSync(path.join(OUT_DIR, `nb_${st}.js`),
      `// Auto-generated by scripts/buildCountyNonbird.mjs — do not edit.\n` +
      `// ${st.toUpperCase()}: ${Object.keys(obj).length} counties. county → { group: [[name, freq], …] }.\n` +
      `export const COUNTY_NONBIRD = ${JSON.stringify(obj)};\n`);
  }
  const states = Object.keys(byState).sort();
  const loaderEntries = states.map(s => `  ${s}: () => import('./nb_${s}.js'),`).join('\n');
  writeFileSync(path.join(OUT_DIR, 'loader.js'),
`// Per-state county non-bird floor loader (lazy chunks). Mirrors birdFreq/loader.js.
const LOADERS = {
${loaderEntries}
};
const _cache = {};
export async function loadCountyNonbird(stateLower) {
  const k = (stateLower || '').toLowerCase();
  if (!LOADERS[k]) return null;
  if (!_cache[k]) _cache[k] = LOADERS[k]().then(m => m.COUNTY_NONBIRD).catch(() => null);
  return _cache[k];
}
`);
  const totalSpp = Object.values(data).reduce((s, g) => s + Object.values(g).reduce((a, l) => a + l.length, 0), 0);
  console.log(`\n✅ ${withData} counties with non-bird data, ${totalSpp} species entries, ${states.length} state chunks.`);
}

main().catch(e => { console.error(e); process.exit(1); });
