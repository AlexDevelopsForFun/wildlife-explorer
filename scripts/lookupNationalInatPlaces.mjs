// Resolves every NATIONAL-side unit (static 63 parks, live NPS units, and all
// National Wildlife Refuges) to its official iNaturalist place_id, so iNat
// species queries use the park's TRUE BOUNDARY POLYGON instead of a radius
// circle. (Neither eBird nor iNat accepts arbitrary polygons — iNat only
// filters by its registered places — so this IS the boundary-accuracy path,
// the same one the 959 state parks with INAT_PLACE_IDS already use.)
//
// Output: src/data/nationalInatPlaces.js  → NATIONAL_INAT_PLACE_IDS { locId: placeId }
// Run:    node scripts/lookupNationalInatPlaces.mjs
import { writeFileSync, readFileSync } from 'fs';
import { wildlifeLocations } from '../src/wildlifeData.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

// ── NPS key from .env (same var the proxy injects server-side) ───────────────
let NPS_KEY = process.env.VITE_NPS_API_KEY || process.env.NPS_API_KEY || '';
if (!NPS_KEY) {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^(?:VITE_)?NPS_API_KEY=(.+)$/);
      if (m) { NPS_KEY = m[1].trim().replace(/^["']|["']$/g, ''); break; }
    }
  } catch {}
}
if (!NPS_KEY) { console.error('No NPS API key found in env/.env'); process.exit(1); }

// ── Same natural-designation filter as useNpsParks (v5) ──────────────────────
const NP_NATURAL = ['national park','national preserve','national seashore','national lakeshore','national recreation area','national reserve','national river','scenic river','scenic riverway','wild and scenic river','wild river'];
const NP_EXCLUDE = ['historic','memorial','battlefield','military','cemetery','heritage','parkway','scenic trail','historic trail'];
const NATURAL_MONUMENTS = new Set(['agfo','ania','band','buis','cabr','cakr','camo','cavo','cebr','chir','colm','crmo','depo','deto','dino','elma','flfo','fobu','hafo','jeca','joda','kaww','labe','muwo','nabr','orca','orpi','para','rabr','sucr','tica','tusk','vicr']);
const qualifies = (p) => {
  const d = (p.designation || '').toLowerCase();
  if (NP_EXCLUDE.some(x => d.includes(x))) return false;
  if (NP_NATURAL.some(x => d.includes(x))) return true;
  if (d.includes('national monument')) return NATURAL_MONUMENTS.has((p.parkCode || '').toLowerCase());
  return false;
};

// ── Build the unit list: { locId, name, lat, lng, big } ─────────────────────
const units = [];
const staticCodes = new Set(wildlifeLocations.filter(l => l.npsCode).map(l => l.npsCode));
for (const l of wildlifeLocations) units.push({ locId: l.id, name: l.name, lat: l.lat, lng: l.lng, big: true });

const npsRes = await fetch(`https://developer.nps.gov/api/v1/parks?limit=500&api_key=${NPS_KEY}`);
if (!npsRes.ok) { console.error('NPS API', npsRes.status); process.exit(1); }
const npsData = (await npsRes.json()).data ?? [];
for (const p of npsData) {
  if (!qualifies(p) || staticCodes.has(p.parkCode)) continue;
  const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) continue;
  units.push({ locId: `nps_${p.parkCode}`, name: p.fullName ?? p.name, lat, lng, big: true });
}
for (const r of NATIONAL_WILDLIFE_REFUGES) units.push({ locId: r.id, name: r.name, lat: r.lat, lng: r.lng, big: false });
console.log(`Units to resolve: ${units.length} (static ${wildlifeLocations.length}, nps ${units.length - wildlifeLocations.length - NATIONAL_WILDLIFE_REFUGES.length}, refuges ${NATIONAL_WILDLIFE_REFUGES.length})`);

// ── iNat place lookup with name + distance validation ────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const SUFFIX = / (national (park|preserve|seashore|lakeshore|recreation area|reserve|monument|wildlife refuge|river|scenic river(way)?s?|monument & preserve|park & preserve)|& preserve)$/i;
const hav = (a, b, c, d) => { const R = 6371, t = x => x * Math.PI / 180, dLa = t(c - a), dLo = t(d - b), h = Math.sin(dLa/2)**2 + Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const BAD_TYPES = new Set([8, 9, 12]); // state / county / country

async function fetchCands(q) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(q)}&per_page=15`,
        { headers: { 'User-Agent': 'wildlife-explorer national place lookup (+https://wildlifeexplorer.us)' } });
      if (r.status === 429 || r.status >= 500) { await sleep(2500 * (attempt + 1)); continue; }
      if (!r.ok) return [];
      return (await r.json()).results ?? [];
    } catch { await sleep(2000); }
  }
  return [];
}

function bestOf(cands, unit, queryNorm) {
  const cap = unit.big ? (unit.lat > 50 ? 250 : 80) : (unit.lat > 50 ? 120 : 50); // AK units are huge
  let best = null;
  for (const c of cands) {
    if (BAD_TYPES.has(c.place_type)) continue;
    const loc = (c.location || '').split(',').map(Number);
    if (loc.length !== 2 || !isFinite(loc[0])) continue;
    const dist = hav(unit.lat, unit.lng, loc[0], loc[1]);
    if (dist > cap) continue;
    const cn = norm(c.display_name?.split(',')[0] ?? c.name ?? '');
    const exact = cn === queryNorm ? 2 : (cn.startsWith(queryNorm) || queryNorm.startsWith(cn)) ? 1 : 0;
    if (!exact) continue;
    const score = exact * 1000 - dist;
    if (!best || score > best.score) best = { id: c.id, name: c.display_name ?? c.name, dist, exact, score };
  }
  return best;
}

const found = {}, review = [], missed = [];
let done = 0, running = 0, qi = 0;
await new Promise(resolve => {
  const next = () => {
    while (running < 2 && qi < units.length) {
      const unit = units[qi++]; running++;
      (async () => {
        let best = bestOf(await fetchCands(unit.name), unit, norm(unit.name));
        if (!best) {
          const short = unit.name.replace(SUFFIX, '').trim();
          if (short && short !== unit.name) {
            await sleep(1100);
            best = bestOf(await fetchCands(short), unit, norm(short));
            if (best) best.variant = true;
          }
        }
        if (best) {
          found[unit.locId] = best.id;
          const tag = best.exact === 2 ? '✓' : '?';
          if (best.exact < 2 || best.variant) review.push(`${unit.locId}=${best.id}@${Math.round(best.dist)}km(${best.name})`);
          console.log(`${tag} ${unit.locId.padEnd(28)} place_id=${best.id}  ${Math.round(best.dist)}km  ${best.name}${best.variant ? ' (variant)' : ''}`);
        } else {
          missed.push(unit.locId);
          console.log(`✗ ${unit.locId.padEnd(28)} no boundary match`);
        }
        await sleep(1100);
      })().finally(() => {
        running--; done++;
        if (done === units.length) resolve(); else next();
      });
    }
  };
  next();
});

console.log(`\n— resolved ${Object.keys(found).length}/${units.length} —`);
console.log(`Review (${review.length}): ${JSON.stringify(review)}`);
console.log(`Missed (radius fallback, ${missed.length}): ${JSON.stringify(missed)}`);

const body =
`// iNaturalist boundary place_ids for NATIONAL-side units — auto-generated by
// scripts/lookupNationalInatPlaces.mjs. Keyed by app location id (static park
// ids, nps_<code>, nwr_<slug>). Units absent here use the radius fallback.
export const NATIONAL_INAT_PLACE_IDS = ${JSON.stringify(found, null, 0)};
`;
writeFileSync(new URL('../src/data/nationalInatPlaces.js', import.meta.url), body);
console.log(`Wrote src/data/nationalInatPlaces.js (${Object.keys(found).length} entries).`);
