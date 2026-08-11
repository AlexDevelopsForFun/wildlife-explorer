// Species → state-parks search (birds), powering the universal species search.
//
// The county bird-frequency dataset already knows which birds are regularly
// recorded in every park's county (eBird checklist sampling, the same signal
// that drives state-park rarity). Inverting it answers "which of the 4,000+
// state parks have species X — and where are my best odds?" with NO new data
// file: the heavy ~12MB chunk is dynamically imported on first use (per-state
// chunks via the shared loader — search needs all states by design, and each
// chunk lands in the module cache so later panel opens are free).
//
// The index is deliberately COUNTY-level, not park-level. Frequency is a
// property of the county, so a park-level index would store the same number
// ~3x over (4,043 parks across 1,383 counties) and balloon to ~750k entries.
// Keeping it county-level matches the source data's size and expands to parks
// only for the one species actually searched.
import { loadAllBirdFreq } from '../data/birdFreq/loader.js';
import { rarityFromFrequency } from '../data/sourceWeighting.js';

let _indexPromise = null;

async function buildIndex() {
  const m = await loadAllBirdFreq();
  const byCounty = new Map();                       // county → [parkId]
  for (const [pid, county] of Object.entries(m.PARK_COUNTY)) {
    let arr = byCounty.get(county);
    if (!arr) byCounty.set(county, (arr = []));
    arr.push(pid);
  }
  const species = new Map();                        // species lowername → [[county, freq]]
  for (const [county, spp] of Object.entries(m.COUNTY_BIRD_FREQ)) {
    if (!byCounty.has(county)) continue;            // county with no parks
    for (const [sp, entry] of Object.entries(spp)) {
      if (sp.startsWith('__')) continue;            // cache markers
      // Entries are { f: <0..1 reporting frequency>, s: [seasons] } — NOT bare
      // numbers. Passing the object straight through silently yields NaN sorts
      // and an "Exceptional" tier for everything.
      const freq = entry?.f;
      if (!Number.isFinite(freq)) continue;
      let arr = species.get(sp);
      if (!arr) species.set(sp, (arr = []));
      arr.push([county, freq]);
    }
  }
  return { byCounty, species };
}

/**
 * Parks whose county regularly records the bird, each with the county's
 * reporting frequency and the matching likelihood tier.
 *
 * Returns `[{ id, freq, rarity }]` — unsorted, because callers rank it
 * differently depending on whether a user location is available. Empty for
 * non-bird species, which simply aren't in this dataset (state-park mammals
 * and reptiles are live-fetched from iNaturalist and have no static index).
 */
export async function findStateParksWithBird(speciesName) {
  if (!speciesName) return [];
  _indexPromise ??= buildIndex().catch(() => {
    _indexPromise = null;
    return { byCounty: new Map(), species: new Map() };
  });
  const { byCounty, species } = await _indexPromise;
  const counties = species.get(speciesName.toLowerCase());
  if (!counties) return [];

  const out = [];
  for (const [county, freq] of counties) {
    const rarity = rarityFromFrequency(freq);
    for (const id of byCounty.get(county) ?? []) out.push({ id, freq, rarity });
  }
  return out;
}
