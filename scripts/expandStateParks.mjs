#!/usr/bin/env node
/**
 * scripts/expandStateParks.mjs — scale state-park coverage toward each state's
 * FULL catalog (the "all state parks in all states" goal) while preserving the
 * hand-curated, coordinate-verified units already in each stateParksXX.js.
 *
 * For each state it:
 *   1. Re-runs the same pre-cleaning Wikidata SPARQL as fetchStateParkCandidates
 *      (parks/forests/beaches/WMAs/preserves/natural+conservation areas).
 *   2. Applies the existing noise DROP plus a CIVIC/HISTORIC exclude (museum,
 *      battlefield, memorial, mansion, plantation, archaeological, …) and a
 *      SUB-PARCEL drop (… Tract / Parcel / Unit), so accuracy doesn't degrade.
 *   3. De-dupes against the EXISTING curated list by normalised base-name and
 *      coordinate proximity — existing entries are kept verbatim; only genuinely
 *      new wildlife units are added.
 *   4. Auto-categorises new units by name (forest/beach/preserve/recreation/park)
 *      and writes the merged array back to src/data/stateParksXX.js.
 *
 * Existing coords/categories/ids are never altered — this only APPENDS.
 *
 * Usage:  node scripts/expandStateParks.mjs FL CA PA        (specific states)
 *         node scripts/expandStateParks.mjs ALL             (all 50)
 */
import { readFileSync, writeFileSync } from 'fs';

const QID = {
  AL:'Q173', AK:'Q797', AZ:'Q816', AR:'Q1612', CA:'Q99', CO:'Q1261', CT:'Q779',
  DE:'Q1393', FL:'Q812', GA:'Q1428', HI:'Q782', ID:'Q1221', IL:'Q1204', IN:'Q1415',
  IA:'Q1546', KS:'Q1558', KY:'Q1603', LA:'Q1588', ME:'Q724', MD:'Q1391', MA:'Q771',
  MI:'Q1166', MN:'Q1527', MS:'Q1494', MO:'Q1581', MT:'Q1212', NE:'Q1553', NV:'Q1227',
  NH:'Q759', NJ:'Q1408', NM:'Q1522', NY:'Q1384', NC:'Q1454', ND:'Q1207', OH:'Q1397',
  OK:'Q1649', OR:'Q824', PA:'Q1400', RI:'Q1387', SC:'Q1456', SD:'Q1211', TN:'Q1509',
  TX:'Q1439', UT:'Q829', VT:'Q16551', VA:'Q1370', WA:'Q1223', WV:'Q1371', WI:'Q1537', WY:'Q1214',
};
const ALL = Object.keys(QID);
let states = process.argv.slice(2).map(s => s.toUpperCase());
if (states.length === 1 && states[0] === 'ALL') states = ALL;
if (!states.length || states.some(s => !QID[s])) { console.error('Pass state codes (e.g. FL CA) or ALL'); process.exit(1); }

// State bounding boxes (lat/lng min/max) — a generous box to reject grossly
// wrong Wikidata coords before they reach the file. From auditStateParks bounds.
const BOX = {
  AL:[30.1,35.1,-88.6,-84.8],AK:[51,71.5,-179.2,-129.9],AZ:[31.2,37.1,-114.9,-108.9],AR:[33.0,36.6,-94.7,-89.6],
  CA:[32.5,42.1,-124.5,-114.1],CO:[36.9,41.1,-109.1,-102.0],CT:[40.9,42.1,-73.8,-71.7],DE:[38.4,39.9,-75.8,-75.0],
  FL:[24.4,31.1,-87.7,-79.9],GA:[30.3,35.1,-85.7,-80.8],HI:[18.8,22.3,-160.3,-154.7],ID:[41.9,49.1,-117.3,-110.9],
  IL:[36.9,42.6,-91.6,-87.4],IN:[37.7,41.8,-88.2,-84.7],IA:[40.3,43.6,-96.7,-90.1],KS:[36.9,40.1,-102.1,-94.5],
  KY:[36.4,39.2,-89.7,-81.9],LA:[28.8,33.1,-94.1,-88.7],ME:[42.9,47.5,-71.2,-66.9],MD:[37.8,39.8,-79.5,-74.9],
  MA:[41.1,42.9,-73.6,-69.8],MI:[41.6,48.4,-90.5,-82.3],MN:[43.4,49.5,-97.3,-89.4],MS:[30.1,35.1,-91.7,-88.0],
  MO:[35.9,40.7,-95.9,-89.0],MT:[44.3,49.1,-116.1,-104.0],NE:[39.9,43.1,-104.1,-95.2],NV:[35.0,42.1,-120.1,-114.0],
  NH:[42.6,45.4,-72.6,-70.6],NJ:[38.8,41.4,-75.6,-73.8],NM:[31.2,37.1,-109.1,-102.9],NY:[40.4,45.1,-79.8,-71.8],
  NC:[33.7,36.6,-84.4,-75.4],ND:[45.9,49.1,-104.1,-96.5],OH:[38.3,42.4,-84.9,-80.5],OK:[33.6,37.1,-103.1,-94.4],
  OR:[41.9,46.4,-124.6,-116.4],PA:[39.7,42.3,-80.6,-74.6],RI:[41.1,42.1,-71.9,-71.1],SC:[32.0,35.3,-83.4,-78.5],
  SD:[42.4,45.99,-104.1,-96.4],TN:[34.9,36.7,-90.4,-81.6],TX:[25.8,36.6,-106.7,-93.5],UT:[36.9,42.1,-114.1,-108.9],
  VT:[42.7,45.1,-73.5,-71.4],VA:[36.5,39.5,-83.7,-75.1],WA:[45.5,49.1,-124.9,-116.9],WV:[37.1,40.7,-82.7,-77.7],
  WI:[42.4,47.4,-92.9,-86.7],WY:[40.9,45.1,-111.1,-104.0],
};

const SPARQL = (qid) => `
SELECT ?placeLabel ?lat ?lon WHERE {
  ?place wdt:P131* wd:${qid} .
  ?place rdfs:label ?placeLabel . FILTER(LANG(?placeLabel)="en")
  FILTER(CONTAINS(?placeLabel,"State Park") || CONTAINS(?placeLabel,"State Forest")
      || CONTAINS(?placeLabel,"State Beach") || CONTAINS(?placeLabel,"Wildlife Management Area")
      || CONTAINS(?placeLabel,"State Recreation") || CONTAINS(?placeLabel,"Natural Area")
      || CONTAINS(?placeLabel,"State Reservation") || CONTAINS(?placeLabel,"Wilderness Area")
      || CONTAINS(?placeLabel,"Wild Forest") || CONTAINS(?placeLabel,"Public Reserved Land")
      || CONTAINS(?placeLabel,"State Preserve") || CONTAINS(?placeLabel,"Conservation Area")
      || CONTAINS(?placeLabel,"Wildlife Area") || CONTAINS(?placeLabel,"State Natural"))
  ?place p:P625/psv:P625 ?v .
  ?v wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?placeLabel`;

// Same noise drop as fetchStateParkCandidates …
const DROP = /golf|heliport|cemetery|\boffice\b|nature center|visitor center|picnic area|maintenance|\branger|supply yard|swimming pool|boat launch|parking|^bridge,|\bdam$| number \w+$|state game land|historic site|historic district|day use district|family cabin|cabin district|whittaker lodge|octagonal lodge|\blodge district/i;
// … plus civic/historic exclusion (no wildlife purpose) …
const CIVIC = /\bmuseum\b|historical|battlefield|\bmemorial\b|\bmansion\b|plantation|archaeolog|petroglyph|\bruins?\b|birthplace|homestead|\bcapitol\b|\bfort\b.*\bhistoric|\bhistoric\b.*\b(site|home|house|village|mine|furnace|iron|mill|fort|railroad|rail trail)\b|cultur(e|al) center|folk culture|monument state historic/i;
// … exclude FEDERAL units (covered by the national layer, not state parks) …
const FEDERAL = /national (wildlife refuge|forest|park|preserve|seashore|lakeshore|monument|recreation area|grassland|historic|scenic)|\bnational\b.*\brefuge\b|bureau of land/i;
// … plus sub-parcel / sub-feature drop (one unit listed as several tracts).
const SUBPARCEL = /\b(tract|parcel|impoundment|recharge|addition|annex|subunit|trailhead)\b|\bbridge\b|\bboat ramp\b|\baccess\b$|\blanding\b$|gas field|aerodrome|\bbuilding\b|headquarters|shelter house|bath\s?house|pump\s?house|water tower|ranger station|comfort station|maintenance (shop|building)|\bgarage\b/i;
// … plus the BULK wildlife/management categories. Some states put hundreds of
// tiny hunting/management parcels in Wikidata (MN 574 WMAs, WI 341 SNAs); these
// aren't park destinations and would swamp the map. We add the formal park
// system comprehensively but only AUTO-ADD these bulk types is suppressed —
// the flagship WMAs/preserves a human already curated stay (they're existing).
const BULK = /wildlife management area|wildlife area|state natural area|natural area preserve|\bnatural area\b|conservation area|waterfowl production|game (management )?area|\bhunting\b|fishing access|state wildlife|scientific and natural/i;

const haversine = (a,b,c,d)=>{const R=6371,t=x=>x*Math.PI/180,dLat=t(c-a),dLng=t(d-b),h=Math.sin(dLat/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const baseNorm = s => s.toLowerCase().replace(/[^a-z ]/g,'')
  .replace(/\b(state park preserve|state park reserve|state park|state forest|state beach|state reservation|wildlife management area|wildlife area|public reserved land|wilderness area|wild forest|state recreation area|state recreation|natural area|conservation area|state natural area|state preserve|state park and|coop|scenic and research natural areas|scenic)\b/g,'')
  .replace(/\s+/g,' ').trim();
const slug = s => baseNorm(s).replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'park';

function categoryOf(name) {
  const n = name.toLowerCase();
  if (/state forest|wild forest|public reserved land/.test(n)) return 'state-forest';
  if (/state beach/.test(n)) return 'state-beach';
  if (/wildlife management area|wildlife area|conservation area|preserve|natural area|wilderness/.test(n)) return 'state-preserve';
  if (/recreation/.test(n)) return 'recreation-area';
  return 'state-park';
}

const wdqs = async (q) => {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q);
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { Accept:'application/sparql-results+json', 'User-Agent':'wildlife-explorer expand (+https://wildlifeexplorer.us)' } });
    if (r.ok) return (await r.json()).results.bindings;
    if (r.status === 429 || r.status >= 500) { await new Promise(s=>setTimeout(s, 4000*(attempt+1))); continue; }
    throw new Error('WDQS ' + r.status);
  }
  throw new Error('WDQS retries exhausted');
};

const summary = [];
for (const ST of states) {
  const box = BOX[ST];
  // existing curated list
  let existing;
  try { existing = (await import(`../src/data/stateParks${ST}.js?ts=${Date.now()}`))[`STATE_PARKS_${ST}`]; }
  catch (e) { console.error(`${ST}: cannot import existing file — ${e.message}`); continue; }
  const existingIds = new Set(existing.map(p => p.id));

  // candidates
  let rows;
  try { rows = await wdqs(SPARQL(QID[ST])); }
  catch (e) { console.error(`${ST}: Wikidata failed — ${e.message}`); summary.push(`${ST}: FAILED`); continue; }
  const byName = new Map();
  for (const b of rows) { const name=b.placeLabel?.value??''; if(name && !byName.has(name)) byName.set(name,{name,lat:+(+b.lat.value).toFixed(4),lon:+(+b.lon.value).toFixed(4)}); }
  let cands = [...byName.values()]
    .filter(r => !DROP.test(r.name) && !CIVIC.test(r.name) && !FEDERAL.test(r.name) && !SUBPARCEL.test(r.name) && !BULK.test(r.name))
    .filter(r => box ? (r.lat>=box[0]&&r.lat<=box[1]&&r.lon>=box[2]&&r.lon<=box[3]) : true);
  // collapse same-base-name within 5 km among candidates (keep shortest name)
  cands.sort((a,b)=>a.name.length-b.name.length);
  const collapsed = [];
  for (const r of cands) { const bn=baseNorm(r.name); if(collapsed.some(k=>baseNorm(k.name)===bn && haversine(k.lat,k.lon,r.lat,r.lon)<5)) continue; collapsed.push(r); }

  // drop candidates already represented in the curated list (base-name match OR <1.5 km)
  const fresh = [];
  for (const r of collapsed) {
    const bn = baseNorm(r.name);
    const dup = existing.some(p => {
      const pn = baseNorm(p.name);
      if (pn && pn === bn) return true;
      return haversine(p.lat, p.lng, r.lat, r.lon) < 1.5;
    }) || fresh.some(f => haversine(f.lat, f.lon, r.lat, r.lon) < 1.0);
    if (!dup) fresh.push(r);
  }

  // build new entries with unique ids
  const used = new Set(existingIds);
  const newEntries = fresh.map(r => {
    let id = `${ST.toLowerCase()}-${slug(r.name)}`;
    if (used.has(id)) { let i=2; while(used.has(`${id}-${i}`)) i++; id=`${id}-${i}`; }
    used.add(id);
    return { id, name: r.name, lat: r.lat, lng: r.lon, radiusKm: 4, category: categoryOf(r.name) };
  });

  const merged = [...existing.map(p => ({ id:p.id, name:p.name, lat:p.lat, lng:p.lng, radiusKm:p.radiusKm ?? 4, category:p.category ?? 'state-park', ...(p.framing?{framing:p.framing}:{}) })), ...newEntries];

  // serialize
  const esc = s => JSON.stringify(s);
  const lines = merged.map(p => `  { id: ${esc(p.id)}, name: ${esc(p.name)}, lat: ${p.lat}, lng: ${p.lng}, radiusKm: ${p.radiusKm}, category: ${esc(p.category)} },`);
  const fileUrl = new URL(`../src/data/stateParks${ST}.js`, import.meta.url);
  const current = readFileSync(fileUrl, 'utf8');
  if (current.includes('STATE_PARKS_BY_STATE')) {
    // This file is also the REGISTRY HUB (NJ): surgically replace ONLY the
    // `export const STATE_PARKS_XX = [ ... ];` block, preserving everything else
    // (imports, INAT_PLACE_IDS, STATE_PARKS_BY_STATE, highlights, helpers).
    const re = new RegExp(`export const STATE_PARKS_${ST} = \\[[\\s\\S]*?\\n\\];`);
    if (!re.test(current)) { console.error(`${ST}: could not locate array block in hub — skipped`); continue; }
    const block = `export const STATE_PARKS_${ST} = [\n${lines.join('\n')}\n];`;
    writeFileSync(fileUrl, current.replace(re, block));
  } else {
    const header = `/**
 * stateParks${ST}.js — ${ST} state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */
`;
    writeFileSync(fileUrl, `${header}\nexport const STATE_PARKS_${ST} = [\n${lines.join('\n')}\n];\n`);
  }
  console.log(`${ST}: ${existing.length} existing + ${newEntries.length} new = ${merged.length}`);
  summary.push(`${ST}: ${existing.length}→${merged.length} (+${newEntries.length})`);
  await new Promise(s=>setTimeout(s, 1500));
}

console.log('\n=== SUMMARY ===');
let tot=0; for (const s of summary) console.log(' ', s);
console.log(summary.join('  |  '));
