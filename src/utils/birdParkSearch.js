// Species → state-parks search (birds), powering the universal species search.
//
// The county bird-frequency dataset already knows which birds are regularly
// recorded in every park's county (eBird checklist sampling, the same signal
// that drives state-park rarity). Inverting it answers "which of the 4,000+
// state parks have species X?" with NO new data file: the heavy ~12MB chunk is
// dynamically imported on first use (it's already lazy for the panels), and the
// inverted index is memoized for the session.
let _indexPromise = null;

async function buildIndex() {
  const m = await import('../data/stateParkBirdFreq');
  const byCounty = new Map();                       // county → [parkId]
  for (const [pid, county] of Object.entries(m.PARK_COUNTY)) {
    let arr = byCounty.get(county);
    if (!arr) byCounty.set(county, (arr = []));
    arr.push(pid);
  }
  const index = new Map();                          // species lowername → [parkId]
  for (const [county, species] of Object.entries(m.COUNTY_BIRD_FREQ)) {
    const parks = byCounty.get(county);
    if (!parks) continue;
    for (const sp of Object.keys(species)) {
      if (sp.startsWith('__')) continue;            // cache markers
      let arr = index.get(sp);
      if (!arr) index.set(sp, (arr = []));
      arr.push(...parks);
    }
  }
  return index;
}

// Returns the park ids whose county regularly records the bird (or [] —
// including for non-bird species, which simply aren't in the dataset).
export async function findStateParksWithBird(speciesName) {
  if (!speciesName) return [];
  _indexPromise ??= buildIndex().catch(() => { _indexPromise = null; return new Map(); });
  const index = await _indexPromise;
  return index.get(speciesName.toLowerCase()) ?? [];
}
