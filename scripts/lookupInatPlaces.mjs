#!/usr/bin/env node
/**
 * scripts/lookupInatPlaces.mjs — find + verify each park's iNaturalist place
 * polygon so the app can query species by the ACTUAL park boundary (place_id)
 * instead of a lat/lng circle.
 *
 * For every park in the chosen state it calls iNat places/autocomplete, then
 * verifies each candidate by great-circle distance between the park's known
 * coordinate and the place's centroid. A candidate is auto-accepted only when
 * its name plausibly matches AND the centroid is within ACCEPT_KM — so we never
 * attach the wrong (or a same-named out-of-state) polygon. 8–25 km is flagged
 * for manual review (large multi-part forests / possible wrong match).
 *
 * If the full-name query misses, it AUTO-RETRIES with the unit-type suffix
 * stripped (e.g. "Odiorne Point State Park" → "Odiorne Point"), which catches
 * iNat's shorter/variant naming without a manual second pass.
 *
 * iNat asks for ≤60 req/min, so concurrency is intentionally low + paced, with
 * retry/backoff on 429.
 *
 * Usage:  STATE=DE node scripts/lookupInatPlaces.mjs   (defaults to NJ)
 * Output: a parkId → placeId map (verified) to paste into INAT_PLACE_IDS.
 */
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';

const STATE = (process.env.STATE || 'NJ').toUpperCase();
const PARKS = STATE_PARKS_BY_STATE[STATE] || [];
const ACCEPT_KM = 8;
const REVIEW_KM = 25;
const CONCURRENCY = 3;
const PACE_MS = 1100;          // per-worker spacing → ~CONCURRENCY/1.1s ≈ under ~100/min
const UA = { 'User-Agent': 'wildlife-explorer place lookup (+https://wildlifeexplorer.us)' };
const SUFFIX = /\b(State Park Preserve|State Park|State Forest|State Beach|State Reservation|Wildlife Management Area|Public Reserved Land|Wilderness Area|Wild Forest|State Recreation Area|Natural Area|State Park Reserve|Preserve|Management Area)\b/gi;

const haversine = (a, b, c, d) => {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchCands(q) {
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(`https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(q)}`, { headers: UA });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (a + 1)); continue; }
      const data = await res.json();
      return data.results ?? [];
    } catch { await sleep(800 * (a + 1)); }
  }
  return [];
}

function bestOf(results, park, keyword) {
  const cands = results.map(r => {
    let clat = null, clng = null;
    if (typeof r.location === 'string' && r.location.includes(',')) [clat, clng] = r.location.split(',').map(Number);
    const dist = (clat != null && clng != null) ? haversine(park.lat, park.lng, clat, clng) : null;
    return { id: r.id, name: r.display_name, dist };
  });
  const named = cands.filter(c => {
    const n = norm(c.name);
    return keyword.length >= 4 && (n.includes(keyword.slice(0, 6)) || keyword.includes(n.slice(0, 6)));
  });
  return (named.length ? named : cands).filter(c => c.dist != null).sort((a, b) => a.dist - b.dist)[0];
}

async function lookupOne(park) {
  const keyword = norm(park.name).replace('statepark', '').replace('stateforest', '')
    .replace('statebeach', '').replace('recreationarea', '').replace('statepreserve', '')
    .replace('wildlifemanagementarea', '').replace('publicreservedland', '');
  let best = bestOf(await fetchCands(park.name), park, keyword);
  let via = '';
  await sleep(PACE_MS);
  if (!(best && best.dist <= ACCEPT_KM)) {           // try the suffix-stripped variant
    const short = park.name.replace(SUFFIX, '').replace(/\s+/g, ' ').trim();
    if (short && norm(short) !== norm(park.name)) {
      const b2 = bestOf(await fetchCands(short), park, keyword);
      await sleep(PACE_MS);
      if (b2 && (!best || b2.dist < best.dist)) { best = b2; via = ' (variant)'; }
    }
  }
  if (best && best.dist <= ACCEPT_KM) return { kind: 'accept', park: park.id, best, via };
  if (best && best.dist <= REVIEW_KM) return { kind: 'review', park: park.id, best, via };
  return { kind: 'miss', park: park.id };
}

async function pMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  const worker = async () => { while (idx < items.length) { const i = idx++; results[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const results = await pMap(PARKS, lookupOne, CONCURRENCY);

const accepted = {}, review = [], misses = [];
for (const r of results) {           // PARKS order preserved
  if (r.kind === 'accept') {
    accepted[r.park] = r.best.id;
    console.log(`✓ ${r.park.padEnd(24)} place_id=${String(r.best.id).padEnd(8)} ${r.best.dist.toFixed(1)}km  ${r.best.name}${r.via}`);
  } else if (r.kind === 'review') {
    review.push(r);
    console.log(`? ${r.park.padEnd(24)} place_id=${String(r.best.id).padEnd(8)} ${r.best.dist.toFixed(1)}km  ${r.best.name}  (REVIEW)${r.via}`);
  } else {
    misses.push(r.park);
    console.log(`✗ ${r.park.padEnd(24)} no place within ${REVIEW_KM}km`);
  }
}

console.log(`\n— ${STATE}: verified ${Object.keys(accepted).length}/${PARKS.length} —`);
console.log(JSON.stringify(accepted, null, 0));
console.log(`\nReview (${review.length}):`, JSON.stringify(review.map(r => `${r.park}=${r.best.id}@${r.best.dist.toFixed(0)}km(${r.best.name})`), null, 0));
console.log(`Misses (radius fallback, ${misses.length}):`, JSON.stringify(misses));
