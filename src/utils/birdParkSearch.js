// Species → state-parks search, powering the universal species search.
//
// Two county-level datasets already know which animals turn up where, so this
// answers "which of the 4,000+ state parks have species X — and where are my
// best odds?" with NO new data file:
//
//   • birds     — COUNTY_BIRD_FREQ, eBird checklist sampling. `f` is a genuine
//                 reporting rate: the share of county checklists listing it.
//   • non-birds — COUNTY_NONBIRD, iNaturalist observation density. `f` is a
//                 relative OBSERVABILITY index, NOT a sighting probability.
//                 Callers must not present the two as the same unit.
//
// Both indexes are COUNTY-level, not park-level. Frequency belongs to the
// county, so a park-level index would store the same number ~3x over (4,043
// parks across 1,383 counties). They expand to parks only for the species
// actually searched.
//
// The non-bird chunks (~8MB) load ONLY when a search misses the bird index, so
// looking up a Bald Eagle never pays for the mammal data.
import { loadAllBirdFreq } from '../data/birdFreq/loader.js';
import { loadCountyNonbird, NONBIRD_STATE_KEYS } from '../data/countyNonbird/loader.js';
import { rarityFromFrequency } from '../data/sourceWeighting.js';

let _birdPromise = null;
let _nonbirdPromise = null;

async function buildBirdIndex() {
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

// COUNTY_NONBIRD is { county: { mammal: [[name, f], …], reptile: […], … } } —
// arrays of pairs, unlike the bird file's objects. Names arrive Title Cased
// ("Canada Lynx") while bird names are lowercase, so both are keyed lowercase.
async function buildNonbirdIndex(byCounty) {
  const species = new Map();
  // name -> Set(taxon group). Kept beside `species` rather than folded into it
  // so `expand()` keeps taking a plain [[county, freq]] array. A name can carry
  // more than one group: "sea otter" is filed under both mammal and marine.
  const groupsOf = new Map();
  const mods = await Promise.all(NONBIRD_STATE_KEYS.map(k => loadCountyNonbird(k)));
  for (const mod of mods) {
    if (!mod) continue;
    for (const [county, groups] of Object.entries(mod)) {
      if (!byCounty.has(county)) continue;
      for (const [group, list] of Object.entries(groups)) {
        if (!Array.isArray(list)) continue;
        for (const pair of list) {
          const name = pair?.[0], f = pair?.[1];
          if (!name || !Number.isFinite(f)) continue;
          const key = String(name).toLowerCase();
          let arr = species.get(key);
          if (!arr) species.set(key, (arr = []));
          arr.push([county, f]);
          let g = groupsOf.get(key);
          if (!g) groupsOf.set(key, (g = new Set()));
          g.add(group);
        }
      }
    }
  }
  return { species, groupsOf };
}

// The datasets disagree on common names: WILDLIFE_CACHE (which feeds the search
// suggestions) says "Black Bear" while COUNTY_NONBIRD says "American Black
// Bear", so exact matching silently returns nothing for the name users actually
// type. One is a suffix of the other in the overwhelming majority of cases
// ("American …", "Common …", "Northern …"), so on an exact miss fall back to a
// suffix match and keep the best-attested candidate.
//
// Deliberately not a fuzzy/substring match — "bear" must not match "Bearded
// Seal". Requiring a word boundary via the leading space keeps it tight.
//
// `wantGroup` (the caller's animalType) breaks ties by taxon group, so a
// mammal query prefers a mammal candidate over an insect one. It is a
// PREFERENCE, not a filter, and that is deliberate: auditing every non-bird
// name a user can actually search for, only 38 reach this fallback and just 2
// land outside their declared group — "california sea otter" -> "sea otter"
// (filed mammal, correct) and "northern chiselmouth" -> "chiselmouth" (a fish
// that WILDLIFE_CACHE mislabels insect). Both are RIGHT. A hard same-group
// filter would reject them and fix nothing, because the group labels on the
// query side are themselves unreliable. Preferring instead of filtering can
// only ever improve the pick, never return less than before.
function lookup(map, q, groupsOf, wantGroup) {
  const exact = map.get(q);
  if (exact) return exact;
  let best = null, bestSameGroup = false;
  for (const [k, arr] of map) {
    if (!(k.endsWith(` ${q}`) || q.endsWith(` ${k}`))) continue;
    const sameGroup = !!(wantGroup && groupsOf?.get(k)?.has(wantGroup));
    // A same-group candidate outranks any other; within the same tier, keep
    // the best-attested one (most counties).
    if (sameGroup && !bestSameGroup) { best = arr; bestSameGroup = true; continue; }
    if (sameGroup === bestSameGroup && (!best || arr.length > best.length)) best = arr;
  }
  return best;
}

function expand(counties, byCounty) {
  const out = [];
  for (const [county, freq] of counties) {
    const rarity = rarityFromFrequency(freq);
    for (const id of byCounty.get(county) ?? []) out.push({ id, freq, rarity });
  }
  return out;
}

/**
 * Parks whose county records the species, each with the county's frequency and
 * the matching likelihood tier.
 *
 * Returns `{ kind, hits }` where kind is 'bird' | 'nonbird' | 'none' and hits
 * is `[{ id, freq, rarity }]`, unsorted — callers rank it differently depending
 * on whether a user location is available. **`kind` matters for labelling**:
 * bird frequencies are checklist reporting rates, non-bird frequencies are
 * observability indexes, and calling both "% of checklists" would be a lie.
 *
 * `animalType` is an optional hint ('mammal' | 'reptile' | 'amphibian' |
 * 'marine' | 'insect') used only to break ties in the non-bird name fallback.
 * Omitting it reproduces the previous behaviour exactly.
 */
export async function findStateParksWithSpecies(speciesName, animalType) {
  if (!speciesName) return { kind: 'none', hits: [] };
  _birdPromise ??= buildBirdIndex().catch(() => {
    _birdPromise = null;
    return { byCounty: new Map(), species: new Map() };
  });
  const { byCounty, species } = await _birdPromise;
  const key = speciesName.toLowerCase();

  const birdCounties = lookup(species, key);   // one taxon — no group hint applies
  if (birdCounties) return { kind: 'bird', hits: expand(birdCounties, byCounty) };

  // Miss on birds — only now is the ~8MB non-bird index worth fetching.
  _nonbirdPromise ??= buildNonbirdIndex(byCounty).catch(() => {
    _nonbirdPromise = null;
    return { species: new Map(), groupsOf: new Map() };
  });
  const { species: nonbird, groupsOf } = await _nonbirdPromise;
  const nbCounties = lookup(nonbird, key, groupsOf, animalType);
  if (nbCounties) return { kind: 'nonbird', hits: expand(nbCounties, byCounty) };

  return { kind: 'none', hits: [] };
}
