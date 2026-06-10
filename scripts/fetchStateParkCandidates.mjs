#!/usr/bin/env node
/**
 * scripts/fetchStateParkCandidates.mjs — reusable, pre-cleaning Wikidata pull of
 * a state's parks/forests/WMAs/preserves, as the seed list for a new
 * stateParksXX.js. Replaces the throwaway per-state _tmp_XXWikidata.mjs scripts.
 *
 * Given a state code it looks up the state's Wikidata QID, runs one SPARQL query
 * for the unit types we care about, then AUTO-DROPS the usual noise (golf
 * courses, "...District"/Dam/Office/Nature Center sub-features, numbered "State
 * Game Lands Number N", historic sites, heliports) and DE-DUPES near-identical
 * entries (same base name within ~5 km, e.g. "Devils Hole" / "Devil's Hole", or
 * a park + its "Day Use District"). Prints a clean candidate list to curate.
 *
 * Usage:  node scripts/fetchStateParkCandidates.mjs MD        (or STATE=MD)
 * Curation is still manual after this: pick the wildlife-significant units,
 * assign categories, fix any stray coords (cross-check via Nominatim/iNat).
 */
const STATE = (process.argv[2] || process.env.STATE || '').toUpperCase();
const QID = {
  AL:'Q173', AK:'Q797', AZ:'Q816', AR:'Q1612', CA:'Q99', CO:'Q1261', CT:'Q779',
  DE:'Q1393', FL:'Q812', GA:'Q1428', HI:'Q782', ID:'Q1221', IL:'Q1204', IN:'Q1415',
  IA:'Q1546', KS:'Q1558', KY:'Q1603', LA:'Q1588', ME:'Q724', MD:'Q1391', MA:'Q771',
  MI:'Q1166', MN:'Q1527', MS:'Q1494', MO:'Q1581', MT:'Q1212', NE:'Q1553', NV:'Q1227',
  NH:'Q759', NJ:'Q1408', NM:'Q1522', NY:'Q1384', NC:'Q1454', ND:'Q1207', OH:'Q1397',
  OK:'Q1649', OR:'Q824', PA:'Q1400', RI:'Q1387', SC:'Q1456', SD:'Q1211', TN:'Q1509',
  TX:'Q1439', UT:'Q829', VT:'Q16551', VA:'Q1370', WA:'Q1223', WV:'Q1371', WI:'Q1537', WY:'Q1214',
};
if (!QID[STATE]) { console.error(`Unknown state code: "${STATE}". Pass e.g. MD.`); process.exit(1); }

const QUERY = `
SELECT ?placeLabel ?lat ?lon WHERE {
  ?place wdt:P131* wd:${QID[STATE]} .
  ?place rdfs:label ?placeLabel . FILTER(LANG(?placeLabel)="en")
  FILTER(CONTAINS(?placeLabel,"State Park") || CONTAINS(?placeLabel,"State Forest")
      || CONTAINS(?placeLabel,"State Beach") || CONTAINS(?placeLabel,"Wildlife Management Area")
      || CONTAINS(?placeLabel,"State Recreation") || CONTAINS(?placeLabel,"Natural Area")
      || CONTAINS(?placeLabel,"State Reservation") || CONTAINS(?placeLabel,"Wilderness Area")
      || CONTAINS(?placeLabel,"Wild Forest") || CONTAINS(?placeLabel,"Public Reserved Land")
      || CONTAINS(?placeLabel,"State Preserve") || CONTAINS(?placeLabel,"Conservation Area"))
  ?place p:P625/psv:P625 ?v .
  ?v wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?placeLabel`;

// Drop obvious non-destination / sub-feature / numbered entries.
const DROP = /golf|heliport|cemetery|\boffice\b|nature center|visitor center|picnic area|maintenance|\branger|supply yard|swimming pool|boat launch|parking|^bridge,|\bdam$| number \w+$|state game land|historic site|historic district|day use district|family cabin|cabin district|whittaker lodge|octagonal lodge|\blodge district/i;
const haversine = (a, b, c, d) => { const R=6371,t=x=>x*Math.PI/180,dLat=t(c-a),dLng=t(d-b),h=Math.sin(dLat/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const baseNorm = s => s.toLowerCase().replace(/[^a-z ]/g,'')
  .replace(/\b(state park preserve|state park reserve|state park|state forest|state beach|state reservation|wildlife management area|public reserved land|wilderness area|wild forest|state recreation area|natural area|conservation area|state preserve|coop|scenic and research natural areas|scenic)\b/g,'')
  .replace(/\s+/g,' ').trim();

const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(QUERY);
const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': `wildlife-explorer ${STATE} seed (+https://wildlifeexplorer.us)` } });
if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1); }
const data = await res.json();

let rows = data.results.bindings.map(b => ({ name: b.placeLabel?.value ?? '', lat: +(+b.lat.value).toFixed(4), lon: +(+b.lon.value).toFixed(4) }));
const raw = rows.length;
// de-dup exact name (multiple P625 statements)
const byName = new Map(); for (const r of rows) if (!byName.has(r.name)) byName.set(r.name, r);
rows = [...byName.values()];
const afterExact = rows.length;
// drop noise
rows = rows.filter(r => !DROP.test(r.name));
const afterDrop = rows.length;
// collapse same-base-name within 5 km (keep the shortest display name)
const kept = [];
for (const r of rows.sort((a, b) => a.name.length - b.name.length)) {
  const bn = baseNorm(r.name);
  if (kept.some(k => baseNorm(k.name) === bn && haversine(k.lat, k.lon, r.lat, r.lon) < 5)) continue;
  kept.push(r);
}
kept.sort((a, b) => a.name.localeCompare(b.name));

console.log(`\n${STATE} (${QID[STATE]}): ${raw} raw → ${afterExact} unique names → ${afterDrop} after noise-drop → ${kept.length} after de-dup\n`);
for (const r of kept) console.log(`${r.name.padEnd(50)} ${String(r.lat).padEnd(9)} ${r.lon}`);
console.log(`\n(${kept.length} candidates — now curate to the wildlife destinations, assign categories, spot-check coords.)`);
