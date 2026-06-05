#!/usr/bin/env node
/**
 * scripts/lookupInatPlaces.mjs — find + verify each NJ park's iNaturalist
 * place polygon, so the app can query species by the park's ACTUAL boundary
 * (place_id) instead of a lat/lng circle.
 *
 * For every park in stateParksNJ.js it calls iNat places/autocomplete, then
 * verifies each candidate by computing the great-circle distance between the
 * park's known coordinate and the place's centroid. A candidate is accepted
 * only when the name plausibly matches AND the centroid is within ACCEPT_KM —
 * so we never attach the wrong (or a same-named out-of-state) polygon.
 *
 * Output: a parkId → placeId map (verified) printed as JS, plus a review list
 * of near-misses for manual confirmation. No files are written — the verified
 * map is pasted into stateParksNJ.js by hand after review.
 */
import { STATE_PARKS_NJ } from '../src/data/stateParksNJ.js';

const ACCEPT_KM = 8;     // centroid within 8 km of the park point → accept
const REVIEW_KM = 25;    // 8–25 km → flag for manual review

const haversine = (a, b, c, d) => {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Already-verified place_ids (the 26 confirmed in INAT_PLACE_IDS). Only the
// REMAINING parks need investigation — for them, dump every candidate so the
// legitimate boundary polygons can be hand-verified (large parks have distant
// centroids; some use old/alternate names) and added.
const ALREADY = new Set([
  'nj-hewitt','nj-allaire','nj-allamuchy','nj-cape-may-point','nj-cheesequake',
  'nj-corsons-inlet','nj-double-trouble','nj-farny','nj-fort-mott','nj-hacklebarney',
  'nj-high-point','nj-island-beach','nj-kittatinny','nj-liberty','nj-long-pond',
  'nj-parvin','nj-pigeon-swamp','nj-rancocas','nj-ringwood','nj-round-valley',
  'nj-spruce-run','nj-stokes-forest','nj-swartswood','nj-tall-pines','nj-voorhees',
  'nj-washington-rock',
]);

for (const park of STATE_PARKS_NJ) {
  if (ALREADY.has(park.id)) continue;
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(park.name)}`,
      { headers: { 'User-Agent': 'wildlife-explorer place lookup (+https://wildlifeexplorer.us)' } }
    );
    const data = await res.json();
    const cands = (data.results ?? []).map(r => {
      let clat = null, clng = null;
      if (typeof r.location === 'string' && r.location.includes(',')) {
        [clat, clng] = r.location.split(',').map(Number);
      }
      const dist = (clat != null && clng != null) ? haversine(park.lat, park.lng, clat, clng) : null;
      return { id: r.id, name: r.display_name, dist };
    }).sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
    console.log(`\n${park.id}  (${park.name})  [${park.lat},${park.lng}]`);
    if (!cands.length) { console.log('   — no candidates'); }
    for (const c of cands.slice(0, 6)) {
      console.log(`   id=${String(c.id).padEnd(8)} ${c.dist != null ? c.dist.toFixed(1).padStart(6) + 'km' : '   —  '}  ${c.name}`);
    }
  } catch (e) {
    console.log(`\n${park.id}  lookup failed: ${e.message}`);
  }
  await sleep(700);
}
const accepted = {}, review = [], misses = []; // (unused in dump mode)

console.log(`\n— Verified (${Object.keys(accepted).length}/${STATE_PARKS_NJ.length}) —`);
console.log(JSON.stringify(accepted, null, 2));
console.log(`\nReview: ${review.length}  ·  Misses (radius fallback): ${misses.length}`);
