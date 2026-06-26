#!/usr/bin/env node
/**
 * scripts/buildCountyBirdList.mjs — eBird species-LIST floor for the counties
 * that have NO frequency floor.
 *
 * The frequency build (buildStateParkBirdFreq) skips counties below its
 * sample-date threshold, leaving them with zero bird floor — so a park there
 * shows ~1 species the moment live eBird is sparse (e.g. Little Moreau SRA, SD:
 * "1 of 1", though its county has 221 species in eBird). We can't get reliable
 * per-species FREQUENCY for these sparse counties, but eBird's spplist gives the
 * full species LIST. This bakes that list in as a presence floor (flat rarity),
 * so those parks show their real county bird list instead of collapsing.
 *
 * Only builds counties that are (a) a park county (PARK_COUNTY / UNIT_COUNTY)
 * and (b) NOT already in COUNTY_BIRD_FREQ. Resumable (per-county cache).
 * Output: src/data/countyBirdList/cbl_<st>.js chunks + loader.js
 * Run: node scripts/buildCountyBirdList.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PARK_COUNTY, COUNTY_BIRD_FREQ } from '../src/data/stateParkBirdFreq.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '_cbl_cache');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'countyBirdList');
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const env = (() => { try { return readFileSync(path.join(ROOT, '.env'), 'utf8'); } catch { return ''; } })();
const getEnv = (n) => process.env[n] || (env.match(new RegExp(`^${n}=(.+)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
const KEY = getEnv('VITE_EBIRD_API_KEY') || getEnv('EBIRD_API_KEY') || getEnv('REACT_APP_EBIRD_API_KEY');
if (!KEY) { console.error('No eBird key'); process.exit(1); }
const HDRS = { headers: { 'X-eBirdApiToken': KEY } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Offshore/territorial counties with no eBird subnational2 spplist → aggregate
// nearby hotspots' lists. { county: [lat, lng, distKm] }. Wider dist for the
// isolated ones (Desecheo island, remote Wrangell–St. Elias).
const HOTSPOT_FALLBACK = {
  'US-PR-023': [17.9792, -67.1683, 20], // Cabo Rojo NWR
  'US-PR-049': [18.3383, -65.2579, 20], // Culebra NWR
  'US-PR-097': [18.3833, -67.4802, 35], // Desecheo NWR (offshore island)
  'US-PR-079': [18.0139, -67.1011, 20], // Laguna Cartagena NWR
  'US-PR-147': [18.1167, -65.4167, 20], // Vieques NWR
  'US-AK-261': [61.4182, -142.6028, 50],// Wrangell–St. Elias NP (remote)
};
// Aggregate the species lists of the eBird hotspots within [lat,lng,dist].
async function hotspotSpeciesList([lat, lng, dist], NAME) {
  let hs = [];
  try {
    const r = await fetch(`https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=${dist}&fmt=json`, { ...HDRS, signal: AbortSignal.timeout(20000) });
    if (r.ok) hs = await r.json();
  } catch {}
  const codes = new Set();
  for (const h of (hs || []).slice(0, 15)) {       // cap hotspots fetched
    try {
      const r = await fetch(`https://api.ebird.org/v2/product/spplist/${h.locId}`, { ...HDRS, signal: AbortSignal.timeout(20000) });
      if (r.ok) (await r.json()).forEach(c => codes.add(c));
    } catch {}
    await sleep(250);
  }
  return [...codes].map(c => NAME.get(c)).filter(Boolean);
}

// Cap per county — the list, ranked by eBird taxonomic order isn't ideal, but
// spplist has no frequency. Keep all (counties top out ~250).
async function main() {
  // 1. eBird taxonomy: speciesCode → common name (one big fetch).
  console.log('Fetching eBird taxonomy…');
  const taxRaw = await fetch('https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&cat=species', HDRS).then(r => r.json());
  const NAME = new Map(taxRaw.map(t => [t.speciesCode, t.comName]));
  console.log(`  ${NAME.size} species in taxonomy.`);

  // 2. Counties that are park counties but have NO frequency floor.
  // SUPPLEMENT = hand-mapped orphan counties not in PARK_COUNTY/UNIT_COUNTY
  // (al-cedar-creek→US-AL-097, ms-kurtz-sf→US-MS-041).
  const SUPPLEMENT = ['US-AL-097', 'US-MS-041', 'US-MA-019'];
  const have = new Set(Object.keys(COUNTY_BIRD_FREQ));
  const wanted = [...new Set([...Object.values(PARK_COUNTY), ...Object.values(UNIT_COUNTY), ...SUPPLEMENT])]
    .filter(c => /^US-[A-Z]{2}-\d+$/.test(c) && !have.has(c));
  console.log(`${wanted.length} park-counties missing a frequency floor → fetching species lists.\n`);

  const data = {};   // county -> [names]
  let done = 0, withData = 0;
  for (const county of wanted) {
    const cacheFile = path.join(CACHE_DIR, `${county}.json`);
    let names;
    if (existsSync(cacheFile)) { try { names = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch {} }
    if (!names) {
      let codes = null;
      for (let i = 0; i < 3 && !codes; i++) {
        try {
          const r = await fetch(`https://api.ebird.org/v2/product/spplist/${county}`, { ...HDRS, signal: AbortSignal.timeout(20000) });
          if (r.ok) codes = await r.json();
          else if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); }
          else break;
        } catch { await sleep(800 * (i + 1)); }
      }
      names = Array.isArray(codes) ? codes.map(c => NAME.get(c)).filter(Boolean) : [];
      // Offshore/territorial counties: eBird serves no subnational2 spplist (PR
      // municipios, remote AK boroughs), so aggregate the species lists of the
      // eBird HOTSPOTS around the unit instead — the best-accuracy bird floor
      // for these. (Verified: Vieques → 116 spp from nearby hotspots.)
      if (!names.length && HOTSPOT_FALLBACK[county]) {
        names = await hotspotSpeciesList(HOTSPOT_FALLBACK[county], NAME);
      }
      writeFileSync(cacheFile, JSON.stringify(names));
      await sleep(250);
    }
    if (names.length) { data[county] = names; withData++; }
    if (++done % 25 === 0) console.log(`  …${done}/${wanted.length} (${withData} with lists)`);
  }

  // 3. Emit per-state chunks + loader.
  const byState = {};
  for (const [county, names] of Object.entries(data)) {
    const st = county.split('-')[1].toLowerCase();
    (byState[st] ??= {})[county] = names;
  }
  for (const [st, obj] of Object.entries(byState)) {
    writeFileSync(path.join(OUT_DIR, `cbl_${st}.js`),
      `// Auto-generated by scripts/buildCountyBirdList.mjs — eBird county species\n` +
      `// LIST (presence, no frequency) for ${st.toUpperCase()} counties missing a frequency floor.\n` +
      `export const COUNTY_BIRD_LIST = ${JSON.stringify(obj)};\n`);
  }
  const states = Object.keys(byState).sort();
  writeFileSync(path.join(OUT_DIR, 'loader.js'),
`// Per-state county bird-LIST loader (presence floor for counties without a
// frequency floor). Lazy chunks, mirrors birdFreq/loader.js.
const LOADERS = {
${states.map(s => `  ${s}: () => import('./cbl_${s}.js'),`).join('\n')}
};
const _cache = {};
export async function loadCountyBirdList(stateLower) {
  const k = (stateLower || '').toLowerCase();
  if (!LOADERS[k]) return null;
  if (!_cache[k]) _cache[k] = LOADERS[k]().then(m => m.COUNTY_BIRD_LIST).catch(() => null);
  return _cache[k];
}
`);
  const tot = Object.values(data).reduce((s, l) => s + l.length, 0);
  console.log(`\n✅ ${withData} counties, ${tot} species entries, ${states.length} state chunks.`);
}
main().catch(e => { console.error(e); process.exit(1); });
