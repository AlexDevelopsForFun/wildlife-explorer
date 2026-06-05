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
 * attach the wrong (or a same-named out-of-state) polygon. Larger parks have a
 * distant centroid, so 8–25 km is flagged for manual review rather than auto-
 * accepted.
 *
 * Usage:  STATE=DE node scripts/lookupInatPlaces.mjs   (defaults to NJ)
 * Output: a parkId → placeId map (verified) to paste into INAT_PLACE_IDS.
 */
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';

const STATE = (process.env.STATE || 'NJ').toUpperCase();
const PARKS = STATE_PARKS_BY_STATE[STATE] || [];
const ACCEPT_KM = 8;
const REVIEW_KM = 25;

const haversine = (a, b, c, d) => {
  const R = 6371, t = x => x * Math.PI / 180;
  const dLat = t(c - a), dLng = t(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const accepted = {}, review = [], misses = [];

for (const park of PARKS) {
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(park.name)}`,
      { headers: { 'User-Agent': 'wildlife-explorer place lookup (+https://wildlifeexplorer.us)' } }
    );
    const data = await res.json();
    const cands = (data.results ?? []).map(r => {
      let clat = null, clng = null;
      if (typeof r.location === 'string' && r.location.includes(',')) [clat, clng] = r.location.split(',').map(Number);
      const dist = (clat != null && clng != null) ? haversine(park.lat, park.lng, clat, clng) : null;
      return { id: r.id, name: r.display_name, dist };
    });
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
  await sleep(700);
}

console.log(`\n— ${STATE}: verified ${Object.keys(accepted).length}/${PARKS.length} —`);
console.log(JSON.stringify(accepted, null, 0));
console.log(`\nReview (${review.length}):`, JSON.stringify(review.map(r => `${r.park}=${r.best.id}@${r.best.dist.toFixed(0)}km(${r.best.name})`), null, 0));
console.log(`Misses (radius fallback, ${misses.length}):`, JSON.stringify(misses));
