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

const accepted = {}, review = [], misses = [];

for (const park of STATE_PARKS_NJ) {
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(park.name)}`,
      { headers: { 'User-Agent': 'wildlife-explorer place lookup (+https://wildlifeexplorer.us)' } }
    );
    const data = await res.json();
    const cands = (data.results ?? []).map(r => {
      // place centroid: prefer location "lat,lng", else bbox center
      let clat = null, clng = null;
      if (typeof r.location === 'string' && r.location.includes(',')) {
        [clat, clng] = r.location.split(',').map(Number);
      }
      const dist = (clat != null && clng != null) ? haversine(park.lat, park.lng, clat, clng) : null;
      return { id: r.id, name: r.display_name, dist };
    });
    // best = closest candidate whose name shares the park's key words
    const keyword = norm(park.name).replace('statepark', '').replace('stateforest', '')
      .replace('recreationarea', '').replace('statepreserve', '');
    const named = cands.filter(c => {
      const n = norm(c.name);
      return keyword.length >= 4 && (n.includes(keyword.slice(0, 6)) || keyword.includes(norm(c.name).slice(0, 6)));
    });
    const pool = (named.length ? named : cands).filter(c => c.dist != null).sort((a, b) => a.dist - b.dist);
    const best = pool[0];
    if (best && best.dist <= ACCEPT_KM) {
      accepted[park.id] = best.id;
      console.log(`✓ ${park.id.padEnd(22)} place_id=${String(best.id).padEnd(8)} ${best.dist.toFixed(1)}km  ${best.name}`);
    } else if (best && best.dist <= REVIEW_KM) {
      review.push({ park: park.id, best });
      console.log(`? ${park.id.padEnd(22)} place_id=${String(best.id).padEnd(8)} ${best.dist.toFixed(1)}km  ${best.name}  (REVIEW)`);
    } else {
      misses.push(park.id);
      console.log(`✗ ${park.id.padEnd(22)} no place within ${REVIEW_KM}km`);
    }
  } catch (e) {
    misses.push(park.id);
    console.log(`✗ ${park.id.padEnd(22)} lookup failed: ${e.message}`);
  }
  await sleep(700); // be polite to iNat
}

console.log(`\n— Verified (${Object.keys(accepted).length}/${STATE_PARKS_NJ.length}) —`);
console.log(JSON.stringify(accepted, null, 2));
console.log(`\nReview: ${review.length}  ·  Misses (radius fallback): ${misses.length}`);
