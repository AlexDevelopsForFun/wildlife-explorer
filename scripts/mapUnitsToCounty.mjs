#!/usr/bin/env node
/**
 * scripts/mapUnitsToCounty.mjs — map each National Wildlife Refuge and natural
 * NPS unit to its county (eBird subnational2Code, e.g. "US-NJ-029").
 *
 * WHY: state parks have a baked-in county bird list (PARK_COUNTY +
 * COUNTY_BIRD_FREQ) so they always show hundreds of species even when the live
 * eBird call is slow or rate-limited. Refuges + national parks had NO such
 * floor — a single failed live call left them showing ~14 GBIF records (the
 * "Barnegat shows 14 species" bug). A county lets the popup seed the same
 * comprehensive list state parks already use.
 *
 * Method: OFFLINE point-in-polygon against the US county GeoJSON (no eBird rate
 * limits, ~100% of mainland units). FIPS → eBird code: STATE FIPS → abbr,
 * COUNTY (3-digit) kept, e.g. "34029" → "US-NJ-029". Ocean-only / Canadian /
 * territorial units that match no US county are left unmapped (they keep the
 * live path).
 *
 * Output: src/data/unitCounty.js  ->  UNIT_COUNTY = { 'nwr_barnegat':'US-NJ-029', … }
 * Also reports which mapped counties are NOT yet in the per-state freq chunks
 * (those units still need a freq build before they can be seeded).
 *
 * Run:  node scripts/mapUnitsToCounty.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envVal = (names) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  try {
    const txt = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const n of names) {
      const m = txt.match(new RegExp(`^${n}=(.+)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
};

const STATE_FIPS = { '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY',
  '22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR',
  '42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY','72':'PR' };

// ── Counties GeoJSON (cached locally so re-runs are offline) ────────────────
const GEO_FILE = path.join(__dirname, '_us_counties.geojson');
async function loadCounties() {
  let raw;
  if (existsSync(GEO_FILE)) raw = readFileSync(GEO_FILE, 'utf8');
  else {
    const r = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
    raw = await r.text();
    writeFileSync(GEO_FILE, raw);
  }
  const gj = JSON.parse(raw);
  // Pre-compute a bbox per feature for a fast reject.
  for (const f of gj.features) {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
                : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
    for (const poly of polys) for (const [x, y] of poly[0]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    f._bbox = [minX, minY, maxX, maxY];
  }
  return gj.features;
}

const pointInRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};
const pointInFeature = (lng, lat, f) => {
  const [minX, minY, maxX, maxY] = f._bbox;
  if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
              : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  for (const poly of polys) {
    if (pointInRing(lng, lat, poly[0])) {
      let inHole = false;
      for (let h = 1; h < poly.length; h++) if (pointInRing(lng, lat, poly[h])) { inHole = true; break; }
      if (!inHole) return true;
    }
  }
  return false;
};
function countyCode(lat, lng, features) {
  for (const f of features) {
    if (pointInFeature(lng, lat, f)) {
      const st = STATE_FIPS[f.properties.STATE];
      if (st) return `US-${st}-${f.properties.COUNTY}`;
    }
  }
  return null;
}

// ── Natural NPS units (mirror useNpsParks.js) ──────────────────────────────
const NPS_KEY = envVal(['NPS_API_KEY', 'VITE_NPS_API_KEY', 'REACT_APP_NPS_API_KEY']);
const NP_NATURAL = ['national park', 'national preserve', 'national seashore', 'national lakeshore',
  'national recreation area', 'national reserve', 'national river', 'scenic river', 'scenic riverway',
  'wild and scenic river', 'wild river'];
const NP_EXCLUDE = ['historic', 'memorial', 'battlefield', 'military', 'cemetery', 'heritage',
  'parkway', 'scenic trail', 'historic trail'];
const NATURAL_MONUMENTS = new Set(['agfo','ania','band','buis','cabr','cakr','camo','cavo','cebr','chir',
  'colm','crmo','depo','deto','dino','elma','flfo','fobu','hafo','jeca','joda','kaww','labe','muwo','nabr',
  'orca','orpi','para','rabr','sucr','tica','tusk','vicr']);
const npsQualifies = (d = '', code = '') => {
  d = d.toLowerCase();
  if (NP_EXCLUDE.some(p => d.includes(p))) return false;
  if (NP_NATURAL.some(p => d.includes(p))) return true;
  if (d.includes('national monument')) return NATURAL_MONUMENTS.has(code.toLowerCase());
  return false;
};
async function fetchNationalUnits() {
  if (!NPS_KEY) { console.warn('  (no NPS key — skipping national units)'); return []; }
  const r = await fetch(`https://developer.nps.gov/api/v1/parks?limit=600&api_key=${NPS_KEY}`);
  if (!r.ok) { console.warn(`  (NPS ${r.status})`); return []; }
  const { data } = await r.json();
  const out = [];
  for (const p of data ?? []) {
    if (!npsQualifies(p.designation, p.parkCode)) continue;
    const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) continue;
    out.push({ id: `nps_${p.parkCode}`, lat, lng });
  }
  return out;
}

async function main() {
  const features = await loadCounties();
  console.log(`Loaded ${features.length} county polygons.`);

  const units = [];
  for (const r of NATIONAL_WILDLIFE_REFUGES) units.push({ id: r.id, lat: r.lat, lng: r.lng });
  const national = await fetchNationalUnits();
  for (const n of national) units.push(n);
  console.log(`Mapping ${units.length} units (${units.length - national.length} refuges + ${national.length} national)…`);

  const map = {};
  let found = 0;
  for (const u of units) {
    const c = countyCode(u.lat, u.lng, features);
    if (c) { map[u.id] = c; found++; }
  }

  // Coverage check vs the per-state freq chunks.
  const byState = {};
  for (const [id, fips] of Object.entries(map)) {
    const st = fips.split('-')[1]?.toLowerCase();
    if (st) (byState[st] ??= []).push([id, fips]);
  }
  let covered = 0, uncovered = 0; const gaps = {};
  for (const [st, entries] of Object.entries(byState)) {
    let freq = null;
    try { freq = (await import(`../src/data/birdFreq/freq_${st}.js`)).COUNTY_BIRD_FREQ; } catch {}
    for (const [id, fips] of entries) {
      if (freq && freq[fips]) covered++;
      else { uncovered++; (gaps[fips] ??= []).push(id); }
    }
  }

  const sorted = Object.fromEntries(Object.entries(map).sort());
  writeFileSync(path.join(__dirname, '..', 'src', 'data', 'unitCounty.js'),
`// Refuge + national-park → county (eBird subnational2Code). Generated by
// scripts/mapUnitsToCounty.mjs (offline point-in-polygon). Lets the popup seed
// the comprehensive county bird list (COUNTY_BIRD_FREQ) for units that aren't
// in PARK_COUNTY, so they never collapse to a tiny live-only / GBIF list.
export const UNIT_COUNTY = ${JSON.stringify(sorted, null, 0)};
`);
  console.log(`\nMapped ${found}/${units.length} units to a US county (${units.length - found} unmapped: offshore/AK/territorial/Canada).`);
  console.log(`Freq coverage: ${covered} units in counties WITH bird data, ${uncovered} in counties NOT yet in freq.`);
  console.log(`Counties needing a freq build (${Object.keys(gaps).length}): units affected = ${uncovered}`);
}

main().catch(e => { console.error(e); process.exit(1); });
