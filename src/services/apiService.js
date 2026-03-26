// ── NPS fetch helpers ─────────────────────────────────────────────────────────

// Retry once on connection-reset errors; wait 3 s before the retry.
async function fetchWithRetry(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const isConnReset = /ECONNRESET|ECONNREFUSED|ECONNABORTED|network/i.test(err.message ?? '');
    if (!isConnReset) throw err;
    await new Promise(r => setTimeout(r, 3000));
    return fetch(url, options); // single retry — let caller handle any error
  }
}

// Rate-limit: ensure at least 500 ms between successive NPS API calls
// (shared across all fetchNps / fetchNpsTopics invocations in the module).
let _lastNpsCallAt = 0;
async function npsThrottle() {
  const gap = 500 - (Date.now() - _lastNpsCallAt);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  _lastNpsCallAt = Date.now();
}

// ── Cache helpers ─────────────────────────────────────────────────────────────
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`wm_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`wm_${key}`); return null; }
    return data;
  } catch { return null; }
}

// Write to localStorage with LRU eviction on quota exceeded.
function cacheSet(key, data) {
  const payload = JSON.stringify({ data, ts: Date.now() });
  const lsKey   = `wm_${key}`;
  try {
    localStorage.setItem(lsKey, payload);
  } catch (e) {
    const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 ||
                    e?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    if (!isQuota) return;
    // Evict oldest loc_v2 entries first, then retry
    try {
      const locKeys = Object.keys(localStorage)
        .filter(k => k.startsWith('wm_loc_v2_') || k.startsWith('wm_loc_v1_'))
        .map(k => {
          try { return { k, ts: JSON.parse(localStorage.getItem(k))?.ts ?? 0 }; }
          catch { return { k, ts: 0 }; }
        })
        .sort((a, b) => a.ts - b.ts);
      locKeys.slice(0, Math.max(5, Math.ceil(locKeys.length / 4))).forEach(({ k }) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      localStorage.setItem(lsKey, payload); // retry after eviction
    } catch { /* localStorage truly unavailable — skip caching */ }
  }
}

// ── Animal field compression ─────────────────────────────────────────────────
// Shortens field names when writing to localStorage (loc_v2) to reduce storage
// usage by ~25%. Expanded back to full names on read.
const _COMPRESS = {
  name: 'n', emoji: 'e', animalType: 't', rarity: 'r', seasons: 'se',
  scientificName: 's', funFact: 'f', photoUrl: 'p', source: 'sr', sources: 'ss',
  frequency: 'fr',
};
const _EXPAND = Object.fromEntries(Object.entries(_COMPRESS).map(([k, v]) => [v, k]));

function _compressAnimal(a) {
  const c = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined) continue; // skip nulls — saves ~15% space
    c[_COMPRESS[k] ?? k] = v;
  }
  return c;
}
function _expandAnimal(c) {
  const a = { scientificName: null, funFact: null, photoUrl: null }; // ensure nulls exist
  for (const [k, v] of Object.entries(c)) a[_EXPAND[k] ?? k] = v;
  return a;
}

// ── Per-location compiled cache ─────────────────────────────────────────────
// loc_v2: compressed animal keys + returns _cacheTs so UI can show cache age.
// loc_v1: legacy uncompressed — read-only fallback, never written.
export function locationCacheGet(locId) {
  try {
    // v2 (compressed) first
    const raw2 = localStorage.getItem(`wm_loc_v2_${locId}`);
    if (raw2) {
      const { data, ts } = JSON.parse(raw2);
      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`wm_loc_v2_${locId}`); }
      else {
        const animals = (data.animals ?? []).map(_expandAnimal);
        return { ...data, animals, _cacheTs: ts };
      }
    }
    // v1 fallback (no compression)
    const raw1 = localStorage.getItem(`wm_loc_v1_${locId}`);
    if (raw1) {
      const { data, ts } = JSON.parse(raw1);
      if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`wm_loc_v1_${locId}`); }
      else return { ...data, _cacheTs: ts };
    }
  } catch { /* ignore */ }
  return null;
}

export function locationCacheSet(locId, data) {
  if (data?._partial) return;
  const { _partial, _cacheTs, ...clean } = data; // strip runtime-only flags
  const compressed = { ...clean, animals: (clean.animals ?? []).map(_compressAnimal) };
  cacheSet(`loc_v2_${locId}`, compressed);
}

// ── Rarity tiers — probability of seeing on a typical park visit ──────────────
// guaranteed  > 90%   — almost certain to see on any visit
// very_likely 60-90%  — probably will see with a little looking
// likely      30-60%  — good chance spending a full day
// unlikely    10-30%  — possible but not expected
// rare         2-10%  — lucky sighting, worth reporting
// exceptional  < 2%   — once in a season or lifetime

// GBIF / iNat relative frequency → visit-probability tier
export function rarityFromFreq(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// ── Charisma correction for iNat mammal observation counts ───────────────────
// Over-reported charismatic species inflate raw counts; divide to normalise.
// Under-reported small/cryptic species deflate counts; multiply to compensate.
function applyCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const lower = name.toLowerCase();
  // Individual high-charisma species
  if (/\bbald eagle\b/.test(lower))                          return obsCount / 5;
  if (/\b(wolf|wolves|gray wolf|grey wolf)\b/.test(lower))   return obsCount / 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower))       return obsCount / 4;
  if (/\b(bear)\b/.test(lower))                              return obsCount / 5;
  // Raptor/owl family (excluding Bald Eagle, already handled)
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return obsCount / 3;
  if (/\b(bison|buffalo)\b/.test(lower))                     return obsCount / 2;
  if (/\b(elk|moose|alligator|crocodile)\b/.test(lower))    return obsCount / 2;
  if (/\b(deer|squirrel)\b/.test(lower))                     return obsCount / 1.5;
  // Under-reported: small/cryptic species
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower))        return obsCount * 5;
  if (/\bbat\b/.test(lower))                                 return obsCount * 4;
  if (/\bsnake\b/.test(lower))                               return obsCount * 2;
  return obsCount;
}

// Absolute iNat observation count → visit-probability tier, with charisma correction.
// Conservative thresholds: only truly abundant species reach guaranteed/very_likely.
export function rarityFromObsCount(obsCount, name = '') {
  const corrected = applyCharismaCorrection(obsCount, name);
  if (corrected >= 2000) return 'guaranteed';
  if (corrected >= 500)  return 'very_likely';
  if (corrected >= 100)  return 'likely';
  if (corrected >= 20)   return 'unlikely';
  if (corrected >= 5)    return 'rare';
  return 'exceptional';
}

// ── Rarity calibrated for eBird checklist frequency ───────────────────────────
// Frequency = fraction of eBird checklists that reported this species.
// This IS the visit probability — maps directly to tiers.
// >90%  = Guaranteed every visit
// 60-90% = Very Likely
// 30-60% = Likely
// 10-30% = Unlikely
// 2-10%  = Rare (lucky sighting)
// <2%    = Exceptional (once in a lifetime)
export function rarityFromChecklist(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// ── Frequency correction factors ─────────────────────────────────────────────
// Charismatic species get over-reported (excited birders log even rare sightings),
// so their raw checklist frequency is inflated. We divide to compensate.
const CHARISMA_CORRECTIONS = {
  'Bald Eagle': 1 / 5,   // ÷5 — iconic, logged on every visit even when briefly glimpsed
  'Osprey':     1 / 3,   // ÷3 — very charismatic raptor
};

// Common species that birders and naturalists rarely bother logging because
// they see them on every visit. We multiply their frequency to compensate.
const UNDERREPORT_CORRECTIONS = {
  'Great Blue Heron':      1.5,
  'Great Egret':           1.4,
  'Mallard':               1.3,
  'White-tailed Deer':     1.5,
  'Eastern Gray Squirrel': 1.5,
  'Eastern Cottontail':    1.3,
};

// Keywords identifying raptors/owls (other than Bald Eagle/Osprey handled above)
const RAPTOR_OWL_KEYWORDS = ['hawk', 'owl', 'falcon', 'kite', 'harrier', 'kestrel', 'merlin', 'eagle', 'vulture', 'condor'];

// Returns the multiplicative correction factor for a species name.
// Values < 1 reduce frequency (charismatic), > 1 boost it (under-reported), 1 = no change.
export function getCorrectionFactor(name) {
  if (!name) return 1;
  if (name in CHARISMA_CORRECTIONS)    return CHARISMA_CORRECTIONS[name];
  if (name in UNDERREPORT_CORRECTIONS) return UNDERREPORT_CORRECTIONS[name];
  const lower = name.toLowerCase();
  if (RAPTOR_OWL_KEYWORDS.some(kw => lower.includes(kw))) return 1 / 3; // ÷3
  return 1;
}

// ── Park-specific rarity overrides for iconic species ────────────────────────
// These encode known visitor-encounter probabilities that APIs can't calculate.
// Applied during deduplication — override wins if the species name matches.
const RARITY_OVERRIDES = {
  // ── Yellowstone / Tetons ─────────────────────────────────────────────────
  yellowstone:           { 'American Bison': 'guaranteed', 'American Elk': 'guaranteed', 'Elk': 'very_likely', 'Grizzly Bear': 'unlikely', 'Gray Wolf': 'rare', 'Moose': 'unlikely' },
  'grand-teton':         { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  grandteton:            { 'American Bison': 'guaranteed', 'Moose': 'likely' },
  // ── Southeast ────────────────────────────────────────────────────────────
  // Great Blue Heron and Anhinga are flagship guaranteed species at Everglades (seen on 90%+ of visits).
  // Florida Panther is explicitly kept exceptional — genuinely <2% chance per visit.
  // American Crocodile: 1,470 iNat obs — recovering population, unlikely but real (was rare)
  everglades:            { 'American Alligator': 'guaranteed', 'West Indian Manatee': 'unlikely', 'Florida Manatee': 'unlikely', 'Great Blue Heron': 'guaranteed', 'Anhinga': 'guaranteed', 'Snowy Egret': 'very_likely', 'Roseate Spoonbill': 'likely', 'Eastern Lubber Grasshopper': 'very_likely', 'Florida Panther': 'exceptional', 'American Crocodile': 'unlikely' },
  congaree:              { 'American Alligator': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  biscayne:              { 'Brown Pelican': 'very_likely', 'Double-crested Cormorant': 'very_likely', 'Bottlenose Dolphin': 'unlikely' },
  drytortugas:           { 'Sooty Tern': 'guaranteed', 'Brown Noddy': 'guaranteed', 'Magnificent Frigatebird': 'very_likely', 'American Alligator': 'exceptional' }, // data quality: no alligators at DT
  // ── East / Appalachian ───────────────────────────────────────────────────
  // Elk: reintroduced 2001, 200+ animal herd in Cataloochee Valley (was unlikely)
  greatsmokymountains:   { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely', 'Wild Turkey': 'very_likely', 'Elk': 'likely' },
  shenandoah:            { 'White-tailed Deer': 'guaranteed', 'Wild Turkey': 'very_likely', 'Black Bear': 'likely' },
  // Herring Gulls everywhere at Bar Harbor/ocean viewpoints (624 iNat obs — top species at Acadia)
  acadia:                { 'American Herring Gull': 'guaranteed', 'Bald Eagle': 'rare', 'White-tailed Deer': 'very_likely', 'Harbor Seal': 'likely', 'Common Loon': 'likely' },
  // Mule Deer: everywhere at Hurricane Ridge and meadows (1520 iNat obs, highest at Olympic)
  olympic:               { 'Mule Deer': 'guaranteed', 'Bald Eagle': 'likely', 'Roosevelt Elk': 'likely', 'Harbor Seal': 'likely', 'Olympic Marmot': 'very_likely', 'Canada Jay': 'very_likely' },
  // Common Loon: iconic, heard/seen on virtually every Isle Royale lake
  isleroyale:            { 'Moose': 'likely', 'Common Loon': 'guaranteed' },
  newrivergorge:         { 'White-tailed Deer': 'guaranteed', 'Black Bear': 'likely' },
  cuyahogavalley:        { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'very_likely' },
  mammothcave:           { 'Little Brown Bat': 'guaranteed', 'White-tailed Deer': 'guaranteed' },
  hotsprings:            { 'White-tailed Deer': 'guaranteed', 'Eastern Gray Squirrel': 'guaranteed' },
  indianadunes:          { 'White-tailed Deer': 'guaranteed', 'Sandhill Crane': 'very_likely' },
  // Eastern Gray Squirrels on every lawn around the Arch (urban park — squirrels guaranteed)
  gatewayarch:           { 'Eastern Gray Squirrel': 'guaranteed', 'American Robin': 'very_likely', 'White-tailed Deer': 'very_likely', 'Red Fox': 'unlikely' },
  voyageurs:             { 'Common Loon': 'guaranteed', 'Bald Eagle': 'very_likely', 'Moose': 'likely' },
  // ── Rocky Mountain / Great Plains ────────────────────────────────────────
  // Mountain Goat corrected: very common on Going-to-the-Sun Road but not 90%+ guaranteed.
  // Grizzly Bear corrected: 15-25% encounter rate at Glacier.
  glacier:               { 'Mountain Goat': 'very_likely', 'Grizzly Bear': 'unlikely', 'Bighorn Sheep': 'very_likely', 'Bald Eagle': 'likely' },
  badlands:              { 'American Bison': 'guaranteed', 'Pronghorn': 'guaranteed', 'Black-tailed Prairie Dog': 'guaranteed' },
  // Mule Deer: common throughout Wind Cave grasslands (was unlikely)
  windcave:              { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely', 'Mule Deer': 'likely' },
  theodoreroosevelt:     { 'American Bison': 'guaranteed', 'Pronghorn': 'very_likely', 'Black-tailed Prairie Dog': 'very_likely', 'Wild Horse': 'very_likely' },
  // ── Rocky Mountain / Sierra Nevada / Southwest ───────────────────────────
  rockymountain:         { 'American Elk': 'guaranteed', 'Elk': 'guaranteed', 'Mule Deer': 'very_likely', 'Bighorn Sheep': 'likely' },
  yosemite:              { 'California Ground Squirrel': 'guaranteed', "Steller's Jay": 'very_likely', 'Mule Deer': 'very_likely', 'Black Bear': 'unlikely' },
  saguaro:               { "Gambel's Quail": 'guaranteed', 'Cactus Wren': 'very_likely', 'Gila Woodpecker': 'very_likely' },
  // Common Raven: at every overlook rim-wide, impossible to miss (1469 iNat obs)
  grandcanyon:           { 'Common Raven': 'guaranteed', 'Rock Squirrel': 'very_likely', 'Mule Deer': 'very_likely', 'Elk': 'likely', 'American Bison': 'exceptional' }, // no bison at GC
  // Desert Bighorn Sheep: 986 iNat obs, year-round on canyon walls (was unlikely)
  zion:                  { 'Rock Squirrel': 'guaranteed', 'Mule Deer': 'very_likely', 'Desert Cottontail': 'likely', 'Coyote': 'likely', 'Desert Bighorn Sheep': 'very_likely' },
  // Golden-mantled Ground Squirrel: begs at every viewpoint rim-wide
  brycecanyon:           { 'Utah Prairie Dog': 'guaranteed', "Common Golden-mantled Ground Squirrel": 'guaranteed', 'Mule Deer': 'very_likely', 'Common Raven': 'very_likely', 'Pronghorn': 'very_likely' },
  // Ravens at every arch overlook (524 iNat obs — most observed bird at Arches)
  arches:                { 'Common Raven': 'guaranteed', 'Mule Deer': 'likely', 'Coyote': 'likely', 'Desert Cottontail': 'likely' },
  // Ravens at Island in the Sky / Needles overlooks
  canyonlands:           { 'Common Raven': 'guaranteed', 'Common Side-blotched Lizard': 'very_likely', 'Mule Deer': 'likely' },
  // Deer visit Capitol Reef orchards nightly, common throughout (273 obs)
  capitolreef:           { 'Mule Deer': 'guaranteed', 'Common Raven': 'very_likely', 'Coyote': 'likely' },
  // Ravens at every Petrified Forest overlook (528 obs — top iNat species)
  petrifiedforest:       { 'Common Raven': 'guaranteed', 'Pronghorn': 'very_likely' },
  mesaverde:             { 'Mule Deer': 'guaranteed', 'Wild Turkey': 'very_likely', "Gunnison's Prairie Dog": 'rare' },
  blackcanyon:           { 'Mule Deer': 'likely', 'Peregrine Falcon': 'unlikely' },
  // Steller's Jay: at every campsite / picnic table in the Lehman Caves zone
  greatbasin:            { 'Mule Deer': 'very_likely', "Steller's Jay": 'very_likely', 'Pronghorn': 'likely' },
  guadalupemountains:    { 'Mule Deer': 'very_likely', 'Elk': 'likely' },
  // Common Side-blotched Lizard: 3563 iNat obs — highest count of all zero-guar parks
  joshuatree:            { 'Common Side-blotched Lizard': 'guaranteed', 'Common Chuckwalla': 'very_likely' },
  // Ravens at Furnace Creek / Badwater / every visitor area
  deathvalley:           { 'Common Raven': 'guaranteed', 'Coyote': 'very_likely', 'Common Side-blotched Lizard': 'very_likely' },
  // Western Earless Lizard: common white-sands color form on every dune walk (322 obs)
  whitesands:            { 'Western Earless Lizard': 'guaranteed' },
  // California Ground Squirrel: everywhere at visitor areas (735 obs)
  pinnacles:             { 'California Ground Squirrel': 'guaranteed', 'California Condor': 'very_likely', 'Acorn Woodpecker': 'very_likely', 'California Scrub-Jay': 'very_likely' },
  // Golden-mantled Ground Squirrel: approaches visitors at every Rim Drive overlook (701 obs)
  craterlake:            { "Common Golden-mantled Ground Squirrel": 'guaranteed', "Clark's Nutcracker": 'very_likely' },
  // Hoary Marmot: sunbathing on rocks at Paradise / Sunrise — unavoidable (1853 obs)
  mountrainier:          { 'Hoary Marmot': 'guaranteed', 'Canada Jay': 'very_likely', 'Sooty Grouse': 'very_likely' },
  // Roosevelt Elk herd at Prairie Creek / Gold Bluffs Beach (1416 obs as "Wapiti" on iNat)
  redwood:               { 'Roosevelt Elk': 'guaranteed', "Steller's Jay": 'very_likely' },
  // Steller's Jay: guaranteed at every Sierra Nevada campground / picnic area
  kingscanyon:           { "Steller's Jay": 'guaranteed' },
  sequoia:               { "Steller's Jay": 'guaranteed' },
  lassenvolcanic:        { "Steller's Jay": 'guaranteed', "Common Golden-mantled Ground Squirrel": 'very_likely' },
  // Greater Roadrunner: 995 iNat obs — seen near visitor center, roads, campgrounds throughout
  bigbend:               { 'Greater Roadrunner': 'guaranteed', 'Mexican Jay': 'very_likely', 'Cactus Wren': 'very_likely' },
  // ── Southwest caves ──────────────────────────────────────────────────────
  carlsbadcaverns:       { 'Mexican Free-tailed Bat': 'guaranteed' },
  // ── Alaska ───────────────────────────────────────────────────────────────
  // Denali: Brown Bear/Caribou corrected — not guaranteed on every road trip, 45-85% encounter rate.
  denali:                { 'Brown Bear': 'likely', 'Caribou': 'very_likely', 'Moose': 'very_likely', 'Dall Sheep': 'very_likely', 'Arctic Ground Squirrel': 'guaranteed', 'Grizzly Bear': 'likely' },
  katmai:                { 'Brown Bear': 'guaranteed' },
  glacierbay:            { 'Humpback Whale': 'very_likely', 'Harbor Seal': 'guaranteed', 'Sea Otter': 'very_likely' },
  kenaifjords:           { 'Sea Otter': 'guaranteed', 'Harbor Seal': 'guaranteed', 'Tufted Puffin': 'very_likely', 'Horned Puffin': 'very_likely', 'Orca': 'unlikely' },
  wrangell:              { 'Dall Sheep': 'very_likely', 'Moose': 'very_likely', 'Brown Bear': 'likely' },
  wrangellstelias:       { 'Dall Sheep': 'very_likely', 'Moose': 'very_likely', 'Brown Bear': 'likely' },
  lakeclark:             { 'Brown Bear': 'guaranteed', 'Sockeye Salmon': 'guaranteed' },
  // ── Hawaii ───────────────────────────────────────────────────────────────
  // Nene walk freely near Kilauea Caldera / Crater Rim Drive visitor areas
  hawaiivolcanoes:       { 'Nene': 'guaranteed', 'Hawaiian Hawk': 'unlikely', 'Hawaiian Goose': 'guaranteed' },
  haleakala:             { 'Nene': 'guaranteed', 'Hawaiian Goose': 'guaranteed' },
  // ── Island / Tropical ────────────────────────────────────────────────────
  // Green Iguanas at every beach / parking lot in USVI (invasive, extremely common)
  // Green Sea Turtle: corrected to unlikely — present but not reliably seen on snorkel trips (was very_likely)
  virginislands:         { 'Green Iguana': 'guaranteed', 'Green Sea Turtle': 'unlikely', 'Hawksbill Sea Turtle': 'unlikely' },
  americansamoa:         { 'Samoan Flying Fox': 'very_likely', 'Green Sea Turtle': 'likely' },
};

export function applyRarityOverride(locationId, animalName, currentRarity) {
  const overrides = RARITY_OVERRIDES[locationId];
  if (!overrides) return currentRarity;
  return overrides[animalName] ?? currentRarity;
}

// ── Permanent animal entry validator ─────────────────────────────────────────
// Rejects genus-level, taxonomic rank, unidentified, or garbage entries.
// Used as a guard in both the build script and runtime API responses.
const _ENTRY_REJECT_PATTERNS = [
  /\b(unidentified|unknown|hybrid)\b/i,
  /\bspp?\./i,
  /,\s*\d{4}/,                    // author-year: "Gray, 1865"
  /\b(family|order|class|phylum|suborder|tribe)\s+[A-Z]/i,
  /[\u0400-\u04FF\u4E00-\u9FFF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F]/, // non-Latin script
];
function _isGenusOnlySci(sci) {
  if (!sci) return false;
  const parts = sci.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return true;
  if (parts.length === 2 && /^spp?\.?$/i.test(parts[1])) return true;
  return false;
}
export function isValidAnimalEntry(a) {
  const n = a?.name?.trim();
  if (!n) return false;
  if (_ENTRY_REJECT_PATTERNS.some(p => p.test(n))) return false;
  if (_isGenusOnlySci(a.scientificName)) return false;
  // Single-word name requires at least a scientific name
  if (!n.includes(' ') && !a.scientificName) return false;
  return true;
}

// ── eBird bar chart period helpers ───────────────────────────────────────────
// The bar chart uses 48 periods (~1 per week). Each calendar month maps to 4.
const MONTH_TO_PERIODS = {
  1:[0,1,2,3],   2:[4,5,6,7],   3:[8,9,10,11],  4:[12,13,14,15],
  5:[16,17,18,19], 6:[20,21,22,23], 7:[24,25,26,27], 8:[28,29,30,31],
  9:[32,33,34,35], 10:[36,37,38,39], 11:[40,41,42,43], 12:[44,45,46,47],
};

// Average frequency across the 4 periods that belong to a calendar month.
export function getMonthlyFrequency(periods, month) {
  const idxs = MONTH_TO_PERIODS[month] ?? [0,1,2,3];
  return idxs.reduce((s, i) => s + (periods[i] ?? 0), 0) / idxs.length;
}

// Season → months mapping (used to pick which periods to average).
const SEASON_MONTHS_MAP = {
  spring: [3,4,5], summer: [6,7,8], fall: [9,10,11], winter: [12,1,2],
};

// Average frequency across all months in a season. When season='all', uses the
// current calendar month (best estimate of "today's" encounter probability).
export function getSeasonalFreq(periods, season) {
  const months = SEASON_MONTHS_MAP[season];
  if (!months) return getMonthlyFrequency(periods, new Date().getMonth() + 1);
  const freqs = months.map(m => getMonthlyFrequency(periods, m));
  return freqs.reduce((s, v) => s + v, 0) / freqs.length;
}

// ── Multi-season presence from eBird bar chart data ───────────────────────────
// Returns which seasons the species is present in, based on whether its corrected
// checklist frequency meets the threshold (default 5%) for each season.
// Returns ['year-round'] when all 4 seasons meet the threshold, so callers can
// show a single 🌀 Year Round badge instead of four separate badges.
// Falls back to ['spring'] if no season passes (extremely sparse data).
export function getSeasonsFromBarChart(periods, factor = 1, threshold = 0.05) {
  const seasonKeys = ['spring', 'summer', 'fall', 'winter'];
  const present = seasonKeys.filter(s => {
    const raw = getSeasonalFreq(periods, s);
    return Math.min(1, raw * factor) >= threshold;
  });
  if (present.length === 4) return ['year-round'];
  return present.length > 0 ? present : ['spring'];
}

// ── Emoji / type helpers ──────────────────────────────────────────────────────
const ICONIC_EMOJI = {
  mammalia: '🦌', aves: '🐦', reptilia: '🐊', amphibia: '🐸',
  insecta: '🦋', actinopterygii: '🐟', mollusca: '🐚', arachnida: '🕷️',
};
const ICONIC_TYPE = {
  mammalia: 'mammal', aves: 'bird', reptilia: 'reptile', amphibia: 'amphibian',
  insecta: 'insect', actinopterygii: 'marine', mollusca: 'marine',
};
function iconicEmoji(name) { return ICONIC_EMOJI[name?.toLowerCase()] ?? '🐾'; }
function iconicType(name)  { return ICONIC_TYPE[name?.toLowerCase()]  ?? 'other'; }

// ── GBIF vernacular name lookup ───────────────────────────────────────────────
// Fetches the English common name for a GBIF speciesKey via the species API.
// In-memory cache lives for the session; localStorage cache persists indefinitely
// (species common names essentially never change, so no TTL is applied).
const _gbifVernacularCache = new Map();

// English language codes used by GBIF (the API's language filter is unreliable,
// so we fetch all vernacular names and filter client-side).
const GBIF_ENG_CODES = new Set(['eng', 'en', 'english', 'en-us', 'en-gb']);

// ── GBIF vernacular name overrides ───────────────────────────────────────────
// Species where GBIF's English vernacular record is non-standard, ambiguous,
// or mis-tagged to a foreign-language entry. Keys are lowercase scientific names
// (genus + species only). Checked in fetchGbif before the API result is used.
const GBIF_VERNACULAR_OVERRIDES = {
  'puma concolor':  'Mountain Lion',    // GBIF returns 'Catamount' (regional synonym)
  'alces alces':    'Moose',            // GBIF returns 'Alce'  (Spanish, mis-tagged as English)
  'chelonia mydas': 'Green Sea Turtle', // GBIF returns 'Black Turtle' (incorrect English record)
  'ursus arctos':   'Brown Bear',       // GBIF sometimes returns 'Kodiak Bear' (subspecies name)
  'lynx rufus':     'Bobcat',           // GBIF returns 'Bobcat' — correct, but added as anchor
};

// Returns false if the name is almost certainly not a valid English common name:
//   • Contains non-ASCII characters (indicates a foreign-language entry)
//   • Is a single word shorter than 4 characters (e.g. "Alce", "Elk" is fine at 3 but is a real English word)
function isValidVernacular(name) {
  if (!name?.trim()) return false;
  if (/[^\x00-\x7F]/.test(name)) return false;          // non-ASCII → foreign language
  if (!/\s/.test(name) && name.trim().length < 4) return false; // single short token
  return true;
}

async function fetchGbifVernacularName(speciesKey) {
  if (!speciesKey) return null;
  if (_gbifVernacularCache.has(speciesKey)) return _gbifVernacularCache.get(speciesKey);

  // Check localStorage for a previously looked-up name (may be null = "not found")
  const lsKey = `wm_gbif_vn_${speciesKey}`;
  try {
    const stored = localStorage.getItem(lsKey);
    if (stored !== null) {
      const name = JSON.parse(stored);
      _gbifVernacularCache.set(speciesKey, name);
      return name;
    }
  } catch {}

  try {
    // Fetch all vernacular names without a language URL filter (that filter is
    // unreliable in GBIF's API and sometimes returns non-English results).
    // We filter client-side for known English language codes instead.
    const res = await fetch(
      `https://api.gbif.org/v1/species/${speciesKey}/vernacularNames?limit=20`
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    const eng = results?.find(r => GBIF_ENG_CODES.has(r.language?.toLowerCase()));
    const name = eng?.vernacularName ?? null;
    _gbifVernacularCache.set(speciesKey, name);
    try { localStorage.setItem(lsKey, JSON.stringify(name)); } catch {}
    return name;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// eBird  — resolve the closest official hotspot for a lat/lng
// Returns the eBird locId string (e.g. "L99381") or null.
// API docs: https://documenter.getpostman.com/view/664302/S1ENwy59
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchEbirdHotspot(lat, lng) {
  const cacheKey = `ebird_hs_v2_${lat}_${lng}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const key = import.meta.env.VITE_EBIRD_API_KEY;
    const url = `https://api.ebird.org/v2/ref/hotspot/geo?lat=${lat}&lng=${lng}&dist=25&fmt=json`;
    const res = await fetch(url, { headers: { 'X-eBirdApiToken': key } });
    if (!res.ok) return null;
    const hotspots = await res.json();
    const locId = hotspots?.[0]?.locId ?? null;
    if (locId) cacheSet(cacheKey, locId);
    return locId;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// eBird  — bar chart frequency data for a hotspot.
//
// Returns a plain object: { [comName]: number[48] }  where the 48 values are
// the fraction of checklists that reported that species in each ~weekly period.
// This is the gold-standard "encounter probability" metric used by eBird's own
// bar charts and is far more accurate than raw observation counts.
//
// Parsed from the tab-separated CSV that the barChart endpoint returns.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchEbirdBarChart(hotspotCode, locId) {
  if (!hotspotCode) return null;
  const cacheKey = `ebird_barchart_v3_${locId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const apiKey = import.meta.env.VITE_EBIRD_API_KEY;
    const res = await fetch(
      `/ebird-chart/v2/product/barChart?r=${hotspotCode}&bYear=2014&eYear=2024&bMonth=1&eMonth=12`,
      { headers: { 'X-eBirdApiToken': apiKey } }
    );
    if (!res.ok) throw new Error(`eBird barChart ${res.status}`);
    const text = await res.text();

    // CSV format: each data row is tab-separated with the species name in col 0
    // (may include scientific name in parentheses) and 48 frequency values in cols 1-48.
    // Header and metadata rows have fewer than 10 tab-separated columns — skip them.
    const barChart = {};
    for (const line of text.split('\n')) {
      const cols = line.split('\t');
      if (cols.length < 10) continue;
      const rawName = cols[0].trim();
      if (!rawName || rawName.toLowerCase() === 'species') continue;
      // Strip scientific name in parentheses: "Bald Eagle (Haliaeetus leucocephalus)" → "Bald Eagle"
      const comName = rawName.replace(/\s*\([^)]+\)\s*$/, '').trim();
      if (!comName) continue;
      const freqs = [];
      for (let i = 1; i <= 48; i++) {
        const v = parseFloat(cols[i]);
        freqs.push(isNaN(v) ? 0 : v);
      }
      if (freqs.some(v => v > 0)) barChart[comName] = freqs; // skip all-zero rows
    }

    if (Object.keys(barChart).length === 0) return null;
    cacheSet(cacheKey, barChart);
    return barChart;
  } catch (err) {
    console.warn('[eBird barChart]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// eBird  — bird observations via the geo/recent endpoint.
//
// eBird's data/obs/geo/recent returns exactly ONE observation per species
// (the most recent sighting within the back-window). Checklist-frequency
// calculation (obsCount / totalSubIds) is therefore always ≈ 1/N for every
// species and is meaningless.
//
// Instead we use OBSERVATION RECENCY as a proxy for encounter probability:
//   < 5 days  → 0.55  (actively present, high chance to see)
//   5–12 days → 0.38  (recently here, likely still around)
//   12–21 days → 0.16 (a few weeks ago, may have moved on)
//   21–30 days → 0.07 (old sighting, lower confidence)
//
// Correction factors (Bald Eagle ×0.5, GBH ×1.5, etc.) are applied in
// App.jsx's `enriched` useMemo on top of the stored `frequency` field.
//
// Hotspot spplist is still fetched for the historical all-time species count.
//
// Returns { animals, _stats } | null.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchEbird(lat, lng, locId, hotspotCode = null) {
  const cacheKey = `ebird_v8_${locId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const key = import.meta.env.VITE_EBIRD_API_KEY;
    const fetchedAt = new Date().toISOString();
    let historicalSpeciesCount = null;

    // 1. Historical species count from hotspot spplist (non-fatal if absent)
    if (hotspotCode) {
      try {
        const sppRes = await fetch(
          `https://api.ebird.org/v2/product/spplist/${hotspotCode}`,
          { headers: { 'X-eBirdApiToken': key } }
        );
        if (sppRes.ok) {
          const codes = await sppRes.json();
          historicalSpeciesCount = Array.isArray(codes) ? codes.length : null;
        }
      } catch { /* non-fatal */ }
    }

    // 2a. Most recent observation per species within the geo radius.
    // 2b. iNat species counts for birds — gives real observation-frequency signal.
    //     Run both in parallel.
    const d2str = new Date().toISOString().slice(0, 10);
    const d1str = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

    const [geoRes, inatRes] = await Promise.all([
      fetch(
        `https://api.ebird.org/v2/data/obs/geo/recent` +
        `?lat=${lat}&lng=${lng}&dist=25&back=30&maxResults=500&includeProvisional=true`,
        { headers: { 'X-eBirdApiToken': key } }
      ),
      fetch(
        `https://api.inaturalist.org/v1/observations/species_counts` +
        `?lat=${lat}&lng=${lng}&radius=25&iconic_taxa[]=Aves` +
        `&quality_grade=research,needs_id&d1=${d1str}&d2=${d2str}&per_page=200`
      ).catch(() => null),
    ]);

    if (!geoRes.ok) throw new Error(`eBird geo ${geoRes.status}`);
    const obs = await geoRes.json();
    if (!Array.isArray(obs) || obs.length === 0) return null;

    // Build iNat frequency map: scientific/common name (lowercase) → normalised freq (0-1).
    // Normalisation: sqrt(count / maxCount) so large counts compress gracefully.
    const inatFreqMap = new Map();
    if (inatRes?.ok) {
      try {
        const inatData = await inatRes.json();
        const results  = inatData.results ?? [];
        if (results.length > 0) {
          const maxCount = results[0].count;
          results.forEach(r => {
            const freq = Math.sqrt(r.count / maxCount);
            if (r.taxon?.name)
              inatFreqMap.set(r.taxon.name.toLowerCase(), freq);
            if (r.taxon?.preferred_common_name)
              inatFreqMap.set(r.taxon.preferred_common_name.toLowerCase(), freq);
          });
        }
      } catch { /* non-fatal */ }
    }

    const now = Date.now();

    const animals = obs
      .filter(o => {
        if (!o.comName) return false;
        // Reject generic groupings (spuhs, slashes, hybrids): they either have no
        // speciesCode or their code contains digits (e.g. "duck1", "heron1").
        // Valid species codes are exactly 6 lowercase letters (e.g. "baleag").
        const code = o.speciesCode ?? '';
        return /^[a-z]{6}$/i.test(code);
      })
      .map(o => {
        const obsDt   = o.obsDt ?? '';
        const ageMs   = obsDt ? now - new Date(obsDt).getTime() : 30 * 86400000;
        const ageDays = Math.max(0, ageMs / 86400000);
        const ageLabel = ageDays < 1.5 ? 'today'
                       : ageDays < 2.5 ? 'yesterday'
                       : `${Math.round(ageDays)} days ago`;

        // iNat observation count is a strong frequency signal; fall back to
        // recency-based proxy when the species has no iNat data.
        const sciKey  = (o.sciName ?? '').toLowerCase();
        const comKey  = (o.comName ?? '').toLowerCase();
        const inatFreq = inatFreqMap.get(sciKey) ?? inatFreqMap.get(comKey) ?? null;
        const freq    = inatFreq != null
          ? Math.min(0.95, inatFreq)
          : (ageDays < 5  ? 0.55
           : ageDays < 12 ? 0.38
           : ageDays < 21 ? 0.16
           :                0.07);

        return {
          name:           o.comName,
          scientificName: o.sciName ?? null,
          emoji:          '🐦',
          animalType:     'bird',
          seasons:        ['spring', 'summer', 'fall', 'winter'],
          bestSeason:     'spring',
          rarity:         rarityFromChecklist(freq),
          funFact:        `Last reported ${ageLabel} within 15 km (eBird).`,
          source:         'ebird',
          frequency:      freq,
          _ageDays:       ageDays,
          _inatFreq:      inatFreq,
          _debug: { endpoint: 'data/obs/geo/recent', frequency: freq, obsDt, fetchedAt, hotspotCode },
        };
      })
      // Sort by frequency descending (most likely to encounter first)
      .sort((a, b) => b.frequency - a.frequency);

    const result = {
      animals,
      _stats: {
        hotspotCode,
        historicalSpeciesCount,
        recentChecklistCount: null, // geo/recent = 1 obs/species; no checklist-level data
        recentObsCount:       obs.length,
        inatBirdCoverage:     inatFreqMap.size > 0,
      },
    };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[eBird]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// iNaturalist — research-grade observations near a lat/lng, by taxon
//
// Uses preferred_common_name (English, via &locale=en) as the display name.
// Stores taxon.name (scientific) in scientificName for subtitle display.
//
// API docs: https://api.inaturalist.org/v1/docs/
// ─────────────────────────────────────────────────────────────────────────────
// Major groups use iconic_taxa[] — the correct iNat API parameter for filtering
// by kingdom-level iconic taxon. Using taxon_id for these groups yielded poor
// mammal results (taxon_id=40151 is Theria, not Mammalia).
const ICONIC_TAXA_INAT = {
  bird:      'Aves',
  mammal:    'Mammalia',
  reptile:   'Reptilia',
  amphibian: 'Amphibia',
  insect:    'Insecta',
  marine:    'Actinopterygii',
};
// Subgroups still use taxon_id for precise targeting within a parent iconic group.
const INAT_SUBGROUP_IDS = {
  bat:    49447, // Chiroptera — supplements mammal results for parks with notable bat fauna
  snake:  85553, // Serpentes — targeted supplement for reptile-rich parks
  lizard: 86258, // Lacertilia — targeted supplement for arid/desert parks
  frog:   20979, // Anura — frogs & toads supplement for amphibian-rich parks
};

// iNaturalist — research-grade observations near a lat/lng, by taxon.
// Uses order_by=votes so the most community-verified species surface first.
// Returns { animals, _stats } | null.
export async function fetchINat(lat, lng, locId, taxonKey = null, { radius = 20, days = 0 } = {}) {
  const extraKey = radius !== 20 || days ? `_r${radius}${days ? `_d${days}` : ''}` : '';
  const cacheKey = `inat_v6_${locId}_${taxonKey ?? 'all'}${extraKey}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const taxonParam = !taxonKey ? ''
      : ICONIC_TAXA_INAT[taxonKey]  ? `&iconic_taxa[]=${ICONIC_TAXA_INAT[taxonKey]}`
      : INAT_SUBGROUP_IDS[taxonKey] ? `&taxon_id=${INAT_SUBGROUP_IDS[taxonKey]}`
      : '';
    const dateParam = days > 0
      ? `&d1=${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)}` +
        `&d2=${new Date().toISOString().slice(0, 10)}`
      : '';
    // Use species_counts endpoint: returns pre-aggregated per-species totals (up to 200),
    // sorted by observation count. Much more efficient than raw observations — no manual
    // aggregation needed, and naturally surfaces the most-observed species first.
    //
    // Pagination: birds and insects consistently hit the 200-result per_page cap.
    // When a page returns exactly 200 results we fetch subsequent pages (page=2…5)
    // until a page comes back with <200 results (last page) or we reach the 5-page cap
    // (1 000 species max per group). Each page is a non-overlapping slice sorted by
    // observation count, so concatenation produces a clean deduplicated ranked list.
    const baseUrl =
      `https://api.inaturalist.org/v1/observations/species_counts` +
      `?lat=${lat}&lng=${lng}&radius=${radius}&per_page=200` +
      `&quality_grade=research&order_by=observations_count&order=desc&locale=en&preferred_place_id=1${taxonParam}${dateParam}`;

    const firstRes = await fetch(baseUrl);
    if (!firstRes.ok) throw new Error(`iNat ${firstRes.status}`);
    const firstJson = await firstRes.json();
    const total_results = firstJson.total_results;
    let results = firstJson.results ?? [];
    if (!results.length) return null;

    // Paginate when the first page is full (200 = per_page cap hit)
    if (results.length === 200) {
      for (let page = 2; page <= 5; page++) {
        const pageRes = await fetch(`${baseUrl}&page=${page}`);
        if (!pageRes.ok) break;
        const { results: pageResults } = await pageRes.json();
        if (!pageResults?.length) break;
        results = results.concat(pageResults);
        if (pageResults.length < 200) break; // reached the last page
      }
    }

    const url = baseUrl; // keep for _debug reference

    const fetchedAt = new Date().toISOString();
    const animals = results
      .filter(r => {
        const rank = r.taxon?.rank;
        return (rank === 'species' || rank === 'subspecies') && r.taxon?.preferred_common_name;
      })
      .map(r => {
        const name    = r.taxon.preferred_common_name;
        const sciName = r.taxon.name ?? null;
        const iconic  = r.taxon.iconic_taxon_name ?? '';
        // Absolute obs-count thresholds — avoids relative scarcity distortion where
        // even common species appear exceptional at under-surveyed locations.
        const freq = Math.min(r.count / 500, 1);   // proxy for dedup priority only
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          scientificName: sciName,
          emoji: iconicEmoji(iconic),
          animalType: iconicType(iconic),
          seasons: ['spring', 'summer', 'fall', 'winter'],
          bestSeason: 'summer',
          rarity: rarityFromObsCount(r.count, r.preferred_common_name ?? r.name ?? ''),
          funFact: `Verified in ${r.count} iNaturalist research-grade observations near this location.`,
          source: 'inaturalist',
          frequency: freq,
          _debug: { endpoint: url, obsCount: r.count, frequency: freq, fetchedAt },
        };
      });

    const result = { animals, _stats: { taxonKey, totalObsCount: total_results ?? results.length } };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[iNaturalist]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// iNat  — monthly histogram for a single species at a location.
//
// Returns { spring, summer, fall, winter, total } as integers (0-100 for pct,
// total = raw obs count), or null if <5 total observations (too few to be
// statistically meaningful). Results cached 30 days.
//
// Season definitions (1-indexed months):
//   Spring = Mar(3)+Apr(4)+May(5)
//   Summer = Jun(6)+Jul(7)+Aug(8)
//   Fall   = Sep(9)+Oct(10)+Nov(11)
//   Winter = Dec(12)+Jan(1)+Feb(2)
// ─────────────────────────────────────────────────────────────────────────────
const INAT_HIST_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (successful results)
const INAT_HIST_FAIL_TTL  =      60 * 60 * 1000;      // 1 hour  (network-error backoff)

export async function fetchInatMonthlyHist(lat, lng, locId, scientificName) {
  if (!scientificName || !lat || !lng) return null;
  // Normalise scientific name to safe cache key
  const taxonKey = scientificName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const cacheKey     = `inat_hist_v1_${locId}_${taxonKey}`;
  const failCacheKey = `inat_hist_fail_v1_${locId}_${taxonKey}`;

  // Check success cache first (30-day TTL)
  try {
    const raw = localStorage.getItem(`wm_${cacheKey}`);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < INAT_HIST_CACHE_TTL) return data; // null is a valid cached result
      localStorage.removeItem(`wm_${cacheKey}`);
    }
  } catch { /* ignore */ }

  // Check failure backoff cache (1-hour TTL) — prevents hammering API after network errors
  try {
    const raw = localStorage.getItem(`wm_${failCacheKey}`);
    if (raw) {
      const { ts } = JSON.parse(raw);
      if (Date.now() - ts < INAT_HIST_FAIL_TTL) return null; // still in backoff window
      localStorage.removeItem(`wm_${failCacheKey}`);
    }
  } catch { /* ignore */ }

  try {
    const url = `https://api.inaturalist.org/v1/observations/histogram` +
      `?taxon_name=${encodeURIComponent(scientificName)}` +
      `&lat=${lat}&lng=${lng}&radius=20` +
      `&date_field=observed&interval=month_of_year&quality_grade=research`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const monthly = json.results?.month_of_year ?? {};
    const counts = Array.from({ length: 12 }, (_, i) => (monthly[String(i + 1)] ?? 0));
    const total = counts.reduce((a, b) => a + b, 0);

    let result = null;
    if (total >= 5) {
      const pct = (idxs) => Math.round(idxs.reduce((s, i) => s + counts[i], 0) / total * 100);
      result = {
        spring: pct([2, 3, 4]),   // Mar, Apr, May (0-indexed: 2,3,4)
        summer: pct([5, 6, 7]),   // Jun, Jul, Aug
        fall:   pct([8, 9, 10]),  // Sep, Oct, Nov
        winter: pct([11, 0, 1]),  // Dec, Jan, Feb
        total,
      };
    }

    // Cache successful result (including null for <5 obs species)
    try {
      localStorage.setItem(`wm_${cacheKey}`, JSON.stringify({ data: result, ts: Date.now() }));
    } catch { /* quota exceeded — skip caching */ }

    return result;
  } catch {
    // Network error — cache the failure for 1 hour to avoid constant retrying
    try {
      localStorage.setItem(`wm_${failCacheKey}`, JSON.stringify({ ts: Date.now() }));
    } catch { /* quota exceeded */ }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NPS — species inventory from the NPS Data API v1.
//
// Primary:  /species?parkCode={code}  — full species list with common name,
//           scientific name, taxonCode, and abundance field.
// Fallback: /parks?fields=topics  — curated wildlife topic tags (used when
//           the species endpoint returns empty or errors).
//
// Returns { animals, _stats } | null.
// API docs: https://www.nps.gov/subjects/developer/api-documentation.htm
// ─────────────────────────────────────────────────────────────────────────────

// Map NPS taxonCode (lowercase) → { animalType, emoji }
const NPS_TAXON_MAP = {
  'mammal':              { animalType: 'mammal',    emoji: '🦌' },
  'bird':                { animalType: 'bird',      emoji: '🐦' },
  'reptile':             { animalType: 'reptile',   emoji: '🦎' },
  'amphibian':           { animalType: 'amphibian', emoji: '🐸' },
  'insect':              { animalType: 'insect',    emoji: '🦋' },
  'spider/scorpion':     { animalType: 'insect',    emoji: '🕷️' },
  'fish':                { animalType: 'marine',    emoji: '🐟' },
  'marine invertebrate': { animalType: 'marine',    emoji: '🦑' },
};

// NPS wildlife topic tag → species mapping.
// Keys must exactly match the NPS topic name as returned by /parks?fields=topics.
// Audited 2026-03-15: fetched all 170 unique topics across all 63 parks.
// Only 8 topic names are wildlife-specific named species — all others are either
// generic ('Animals', 'Birds', 'Fish') or non-wildlife categories.
//
// Removed (confirmed absent from all 63 parks' topic lists):
//   'Moose', 'Bears - Grizzly', 'Bears - Black', 'Deer', 'Otters',
//   'Manatees', 'Seals and Sea Lions', 'Eagles', 'Salamanders', 'Butterflies and Moths'
const NPS_WILDLIFE_TOPICS = {
  // ── Ungulates ───────────────────────────────────────────────────────────────
  'Bison':                    { name: 'American Bison',     emoji: '🦬', animalType: 'mammal',  rarity: 'guaranteed'  },
  'Elk':                      { name: 'Elk',                emoji: '🦌', animalType: 'mammal',  rarity: 'likely'      },
  'Horses (wild)':            { name: 'Wild Horse',         emoji: '🐴', animalType: 'mammal',  rarity: 'unlikely'    },
  // ── Carnivores ──────────────────────────────────────────────────────────────
  'Wolves':                   { name: 'Gray Wolf',          emoji: '🐺', animalType: 'mammal',  rarity: 'unlikely'    },
  // Mountain Lions are elusive — documented presence but extremely rarely seen.
  'Cats (wild)':              { name: 'Mountain Lion',      emoji: '🐆', animalType: 'mammal',  rarity: 'exceptional' },
  // ── Marine ──────────────────────────────────────────────────────────────────
  'Whales':                   { name: 'Humpback Whale',     emoji: '🐋', animalType: 'marine',  rarity: 'unlikely'    },
  // ── Reptiles ────────────────────────────────────────────────────────────────
  'Alligators or Crocodiles': { name: 'American Alligator', emoji: '🐊', animalType: 'reptile', rarity: 'guaranteed'  },
  // 'Tortoises and Turtles' is resolved per-park in fetchNpsTopics using
  // NPS_TURTLE_BY_PARK — not included here to prevent static fallback clash.
};

// Per-park turtle species for the 'Tortoises and Turtles' NPS topic.
// Species varies by region: SW desert → Desert Tortoise, SE/Atlantic → Box/Gopher,
// Gulf/Caribbean coasts → Sea Turtle.
// Default (unrecognised parks) → Desert Tortoise.
const NPS_TURTLE_BY_PARK = {
  // ── SW desert parks ─────────────────────────────────────────────────────────
  zion: { name: 'Desert Tortoise',     emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  grca: { name: 'Desert Tortoise',     emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  jotr: { name: 'Desert Tortoise',     emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  moja: { name: 'Desert Tortoise',     emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  deva: { name: 'Desert Tortoise',     emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  // ── SE freshwater / forest parks ────────────────────────────────────────────
  cong: { name: 'Eastern Box Turtle',  emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  shen: { name: 'Eastern Box Turtle',  emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  grsm: { name: 'Eastern Box Turtle',  emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  // ── Coastal / Gulf / Caribbean parks ────────────────────────────────────────
  ever: { name: 'Green Sea Turtle',    emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  bith: { name: 'Green Sea Turtle',    emoji: '🐢', animalType: 'reptile', rarity: 'rare'     },
  cuis: { name: 'Loggerhead Sea Turtle',emoji: '🐢', animalType: 'reptile', rarity: 'rare'    },
  capehe:{ name: 'Loggerhead Sea Turtle',emoji: '🐢', animalType: 'reptile', rarity: 'rare'   },
  // ── Northeast parks ─────────────────────────────────────────────────────────
  acad: { name: 'Painted Turtle',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
  sara: { name: 'Painted Turtle',      emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' },
};
const NPS_TURTLE_DEFAULT = { name: 'Desert Tortoise', emoji: '🐢', animalType: 'reptile', rarity: 'unlikely' };

async function fetchNpsTopics(parkCode, key, fetchedAt) {
  await npsThrottle();
  const url = `/nps-api/parks?parkCode=${parkCode}&fields=topics`;
  const res = await fetchWithRetry(url, { headers: { 'X-Api-Key': key } });
  if (!res.ok) throw new Error(`NPS topics ${res.status}`);
  const { data } = await res.json();
  const park = data?.[0];
  if (!park?.topics?.length) return null;
  const topicSet = new Set(park.topics.map(t => t.name));

  const animals = [];

  // Standard topic → species mappings
  for (const [topic, info] of Object.entries(NPS_WILDLIFE_TOPICS)) {
    if (!topicSet.has(topic)) continue;
    animals.push({
      ...info,
      scientificName: null,
      seasons: ['spring', 'summer', 'fall', 'winter'],
      bestSeason: 'summer',
      funFact: `Officially documented in the NPS wildlife registry for ${park.fullName ?? parkCode.toUpperCase()}.`,
      source: 'nps',
      _debug: { endpoint: url, obsCount: null, frequency: null, fetchedAt, npsTopic: topic },
    });
  }

  // 'Tortoises and Turtles' resolved per-park — species varies by region
  if (topicSet.has('Tortoises and Turtles')) {
    const turtleInfo = NPS_TURTLE_BY_PARK[parkCode] ?? NPS_TURTLE_DEFAULT;
    animals.push({
      ...turtleInfo,
      scientificName: null,
      seasons: ['spring', 'summer', 'fall'],
      bestSeason: 'summer',
      funFact: `Officially documented in the NPS wildlife registry for ${park.fullName ?? parkCode.toUpperCase()}.`,
      source: 'nps',
      _debug: { endpoint: url, obsCount: null, frequency: null, fetchedAt, npsTopic: 'Tortoises and Turtles' },
    });
  }

  return animals.length ? { animals, _stats: { totalSpecies: animals.length, source: 'topics' } } : null;
}

export async function fetchNps(parkCode, locId) {
  if (!parkCode) return null;
  const cacheKey = `nps_v5_${locId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const key = import.meta.env.VITE_NPS_API_KEY;
  const fetchedAt = new Date().toISOString();

  // NPS Developer API v1 has no species endpoint (/api/v1/species returns 404).
  // The only available wildlife data is the curated topic tags via /parks?fields=topics.
  try {
    const result = await fetchNpsTopics(parkCode, key, fetchedAt);
    if (result) {
      cacheSet(cacheKey, result);
      return result;
    }
  } catch { /* silent — NPS unavailable, caller uses static bundle data */ }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Name-quality helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the string is a taxonomic classification string rather than
 * a proper English common name. Catches:
 *   "Neogale Gray, 1865"        — genus + author + year
 *   "Canis lupus"               — bare Latin binomial (2nd word lowercase)
 *   "Vulpes vulpes fulva"       — trinomial subspecies
 *   "family", "genus", "order"  — rank label
 *   "Linnaeus"                  — bare author surname
 */
function isTaxonomicJunk(name) {
  if (!name?.trim()) return true;
  const n = name.trim();
  // Year in taxonomic citation: ", 1758" anywhere in the string
  if (/,\s*\d{4}/.test(n)) return true;
  // Known taxonomic author surnames that appear in GBIF / NPS data
  if (/\b(Linnaeus|Gray|Cuvier|Say|Ord|Leach|Rafinesque|Wagler|Temminck|Swainson|Bonaparte|Schreber|Merriam|Kerr|Baird)\b/.test(n)) return true;
  // Latin binomial / trinomial: uppercase first word, all-lowercase remaining words
  if (/^[A-Z][a-z]+ [a-z]+(\s[a-z]+)?$/.test(n)) return true;
  // Standalone taxonomic rank label
  if (/^(genus|family|order|class|phylum|kingdom|suborder|subclass|subfamily|tribe|superfamily)$/i.test(n)) return true;
  return false;
}

// In-memory cache for iNat/GBIF common-name fallback lookups
const _commonNameCache = new Map();

/**
 * Attempt to resolve an English common name for a scientific name.
 * 1. iNaturalist taxa/autocomplete — preferred_common_name
 * 2. GBIF species search          — vernacularName field
 * Returns null if neither source has a common name.
 */
async function lookupCommonName(sciName) {
  if (!sciName?.trim()) return null;
  const norm = sciName.trim().toLowerCase();
  if (_commonNameCache.has(norm)) return _commonNameCache.get(norm);

  // ── 1. iNaturalist taxa/autocomplete ──────────────────────────────────────
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(sciName)}&per_page=5`
    );
    if (res.ok) {
      const { results } = await res.json();
      const match = results?.find(r => r.name?.toLowerCase() === norm);
      if (match?.preferred_common_name) {
        const name = match.preferred_common_name;
        _commonNameCache.set(norm, name);
        return name;
      }
    }
  } catch {}

  // ── 2. GBIF species search ─────────────────────────────────────────────────
  try {
    const res = await fetch(
      `https://api.gbif.org/v1/species?name=${encodeURIComponent(sciName)}&limit=5`
    );
    if (res.ok) {
      const { results } = await res.json();
      const match = results?.find(r =>
        r.canonicalName?.toLowerCase() === norm ||
        r.species?.toLowerCase() === norm
      );
      if (match?.vernacularName) {
        const name = match.vernacularName;
        _commonNameCache.set(norm, name);
        return name;
      }
    }
  } catch {}

  _commonNameCache.set(norm, null);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GBIF — Global Biodiversity Information Facility (backup / frequency source)
//
// Aggregates by speciesKey (numeric backbone ID) to avoid scientific-name
// duplicates (e.g. subspecies all rolling up to the same key).
// Then batch-fetches English common names via the GBIF species API.
// Falls back to the scientific name if no vernacular name is available.
//
// API docs: https://www.gbif.org/developer/occurrence
// ─────────────────────────────────────────────────────────────────────────────
const GBIF_CLASS_EMOJI = {
  aves: '🐦', mammalia: '🦌', reptilia: '🐊', amphibia: '🐸',
  insecta: '🦋', actinopterygii: '🐟', chondrichthyes: '🦈',
};
const GBIF_CLASS_TYPE = {
  aves: 'bird', mammalia: 'mammal', reptilia: 'reptile', amphibia: 'amphibian',
  insecta: 'insect', actinopterygii: 'marine', chondrichthyes: 'marine',
};

export async function fetchGbif(lat, lng, locId, taxonKey = null) {
  const cacheKey = `gbif_v3_${locId}${taxonKey != null ? `_t${taxonKey}` : ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const d = 0.14; // ~15 km bounding box
    const taxonParam = taxonKey != null ? `&taxonKey=${taxonKey}` : '';
    const url =
      `https://api.gbif.org/v1/occurrence/search` +
      `?decimalLatitude=${lat - d},${lat + d}` +
      `&decimalLongitude=${lng - d},${lng + d}` +
      `&limit=100&basisOfRecord=HUMAN_OBSERVATION&hasCoordinate=true${taxonParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GBIF ${res.status}`);
    const { results } = await res.json();
    if (!results?.length) return null;

    // Aggregate by speciesKey (numeric) to avoid duplicate entries for the
    // same species appearing under different scientific name variants.
    // Only keep target animal classes — reject plants, fungi, arachnids, etc.
    const specMap = {};
    results.forEach(o => {
      const kingdom = (o.kingdom ?? '').toLowerCase();
      if (kingdom && kingdom !== 'animalia') return; // skip plants, fungi, chromista, etc.
      const cls = (o.class ?? '').toLowerCase();
      if (!GBIF_CLASS_TYPE[cls]) return; // skip arachnids, mollusca, etc.
      // Require a proper species binomial — o.species is the clean "Genus species"
      // form without author attribution. Falling back to o.scientificName risks
      // getting strings like "Neogale Gray, 1865" for genus-level records.
      const sciName = o.species ?? null;
      if (!sciName) return;
      const key = o.speciesKey ?? sciName; // numeric ID preferred; sci name as fallback
      if (!specMap[key]) specMap[key] = { count: 0, cls, sciName, speciesKey: o.speciesKey ?? null };
      specMap[key].count++;
    });

    const topSpecies = Object.entries(specMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 15);

    const total = results.length;
    const fetchedAt = new Date().toISOString();

    // Batch-fetch English vernacular names for all top species in parallel.
    // fetchGbifVernacularName uses in-memory + localStorage caching,
    // so repeat lookups across locations are nearly free.
    const vernacularNames = await Promise.all(
      topSpecies.map(([, info]) => fetchGbifVernacularName(info.speciesKey))
    );

    // For species where GBIF has no vernacular name (or the name fails validation),
    // try iNat taxa/autocomplete then GBIF species search as fallback. Never fall
    // back to the scientific name itself — a Latin binomial shown as a display name
    // is confusing.
    const resolvedNames = await Promise.all(
      topSpecies.map(([, info], idx) => {
        // 1. Park-specific override (known bad GBIF records for certain species)
        const sciLower = (info.sciName ?? '').toLowerCase().split(/\s+/).slice(0, 2).join(' ');
        if (sciLower && GBIF_VERNACULAR_OVERRIDES[sciLower]) {
          return Promise.resolve(GBIF_VERNACULAR_OVERRIDES[sciLower]);
        }
        // 2. Accept GBIF vernacular only if it passes the ASCII + length validation
        const gbif = vernacularNames[idx];
        if (gbif && isValidVernacular(gbif)) return Promise.resolve(gbif);
        // 3. Fall back to iNat/GBIF species-name search
        return lookupCommonName(info.sciName);
      })
    );

    const animals = topSpecies
      .map(([, info], idx) => {
        const vernacular = resolvedNames[idx];
        if (!vernacular || isTaxonomicJunk(vernacular)) return null; // no common name found — skip
        const commonName = vernacular.charAt(0).toUpperCase() + vernacular.slice(1);
        return {
          name: commonName,
          scientificName: info.sciName,
          emoji: GBIF_CLASS_EMOJI[info.cls] ?? '🐾',
          animalType: GBIF_CLASS_TYPE[info.cls] ?? 'other',
          seasons: ['spring', 'summer', 'fall'],
          bestSeason: 'summer',
          rarity: rarityFromFreq(info.count / total),
          funFact: `Recorded ${info.count} time${info.count !== 1 ? 's' : ''} in GBIF human observation records near this location.`,
          source: 'gbif',
          frequency: info.count / total,
          _debug: { endpoint: url, obsCount: info.count, frequency: info.count / total, fetchedAt },
        };
      })
      .filter(Boolean);

    cacheSet(cacheKey, animals);
    return animals;
  } catch (err) {
    console.warn('[GBIF]', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animal list utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduplicate an animal array by normalised common name AND scientific name.
 *
 * When the same species appears from multiple API sources (e.g. "Eastern Gray
 * Squirrel" from both iNaturalist and GBIF), the entries are merged into one:
 *   • The entry with the most observations becomes the primary (keeps _debug)
 *   • All source identifiers are collected into a `sources: string[]` array
 *   • The best available scientific name is preserved
 *
 * Scientific-name grouping additionally catches synonym pairs like:
 *   "Gray Wolf" + "Northwestern Wolf" (both Canis lupus)
 *   "Grizzly Bear" + "Brown Bear"     (both Ursus arctos)
 *   "American Elk" + "Wapiti"         (both Cervus canadensis)
 *
 * Subspecies are normalised to genus + species (first two words) so that
 * "Ursus arctos horribilis" matches "Ursus arctos".
 *
 * Used to clean the live pool before merging with hardcoded data.
 */

// Normalise a scientific name to "genus species" (drop subspecies / author).
function normSci(name) {
  if (!name?.trim()) return null;
  const parts = name.toLowerCase().trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
}

export function deduplicateAnimals(animals) {
  // Two-pass grouping: by common name AND normalised scientific name.
  const groups       = new Map();  // groupKey → [animals]
  const sciNameToKey = new Map();  // normalised sciName → canonical groupKey

  // Filter invalid entries before deduplication so garbage never reaches the UI
  animals = animals.filter(a => isValidAnimalEntry(a));

  animals.forEach(a => {
    const nameKey = a.name.toLowerCase().trim();
    const sciKey  = normSci(a.scientificName);

    // 1. Try to find an existing group via scientific name
    let groupKey = sciKey && sciNameToKey.has(sciKey) ? sciNameToKey.get(sciKey) : null;
    // 2. Fall back to exact common-name match
    if (!groupKey && groups.has(nameKey)) groupKey = nameKey;
    // 3. No match — start a new group keyed by common name
    if (!groupKey) groupKey = nameKey;

    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(a);

    // Register this scientific name so future synonyms find this group
    if (sciKey && !sciNameToKey.has(sciKey)) sciNameToKey.set(sciKey, groupKey);
  });

  return [...groups.values()].map(group => {
    if (group.length === 1) {
      const a = group[0];
      // Ensure every animal has a sources array, even if it came from one API
      return { ...a, sources: a.sources ?? [a.source ?? 'estimated'] };
    }

    // Multiple sources for the same animal — merge into one entry.
    // Primary = the entry with the most observations (highest confidence).
    const primary = group.reduce((best, a) => {
      const bestObs = best._debug?.obsCount ?? -1;
      const aObs    = a._debug?.obsCount    ?? -1;
      return aObs > bestObs ? a : best;
    });

    // Collect all unique source keys from every group member.
    // Drop 'static'/'estimated' if any real institutional source is present —
    // e.g. Bison confirmed by both NPS and iNat should not also show "Park Records".
    const _REAL = new Set(['ebird', 'inaturalist', 'nps', 'gbif']);
    const rawSources = [
      ...new Set(
        group.flatMap(a => a.sources ?? [a.source ?? 'estimated']).filter(Boolean)
      ),
    ];
    const hasReal   = rawSources.some(s => _REAL.has(s));
    const allSources = hasReal ? rawSources.filter(s => _REAL.has(s)) : rawSources;

    // Prefer any scientific name we can find across the group
    const sciName = group.map(a => a.scientificName).find(Boolean) ?? null;

    // For birds: eBird checklist frequency is a direct measure of encounter
    // probability (% of birding trips that reported this species). iNat obs counts
    // inflate at popular parks (thousands of eagle photos) and are unreliable.
    // If any group member is an eBird entry, use its rarity for birds.
    const ebirdEntry = primary.animalType === 'bird'
      ? group.find(a => a.source === 'ebird' && a.rarity)
      : null;

    return {
      ...primary,
      rarity:         ebirdEntry?.rarity ?? primary.rarity,
      source:         primary.source, // primary source (most observations)
      sources:        allSources,     // all sources that observed this animal
      scientificName: sciName,
    };
  });
}

/**
 * Merge live animals into hardcoded list.
 *
 * • Hardcoded animals always survive (curated funFacts / rarity / seasons).
 * • If live API data confirms a hardcoded species by name, the hardcoded animal
 *   is upgraded: source, sources, _debug, and scientificName are replaced with
 *   live data, so the UI shows a real source tag + scientific name subtitle.
 * • Hardcoded animals with no API match get source='estimated', sources=['estimated'].
 * • Novel live-only animals are appended; balanceAnimals() caps per type downstream.
 */
export function mergeAnimals(hardcoded, liveList) {
  if (!liveList?.length) {
    return hardcoded.map(a =>
      a.source
        ? { ...a, sources: a.sources ?? [a.source] }
        : { ...a, source: 'estimated', sources: ['estimated'] }
    );
  }

  const liveMap = new Map(liveList.map(a => [a.name.toLowerCase(), a]));

  const merged = hardcoded.map(a => {
    const live = liveMap.get(a.name.toLowerCase());
    if (live) {
      // API confirmed this species — upgrade source, sources, debug, scientific name.
      // Keep curated funFact, rarity, seasons from the hardcoded entry.
      // Copy migrationStatus + photoUrl from live if hardcoded doesn't have them.
      return {
        ...a,
        source:          live.source,
        sources:         live.sources ?? [live.source],
        _debug:          live._debug,
        scientificName:  live.scientificName ?? a.scientificName ?? null,
        migrationStatus: a.migrationStatus ?? live.migrationStatus ?? null,
        photoUrl:        a.photoUrl !== undefined ? a.photoUrl : (live.photoUrl ?? null),
      };
    }
    // No API confirmation — preserve existing source or mark as estimated
    return a.source
      ? { ...a, sources: a.sources ?? [a.source] }
      : { ...a, source: 'estimated', sources: ['estimated'] };
  });

  // Append novel live-only species not present in the hardcoded list
  const known = new Set(hardcoded.map(a => a.name.toLowerCase()));
  const novel = liveList
    .filter(a => !known.has(a.name.toLowerCase()))
    .map(a => ({ ...a, sources: a.sources ?? [a.source ?? 'estimated'] }));

  return [...merged, ...novel];
}

/**
 * Enforce per-type display caps to keep popups balanced.
 * Hardcoded animals come first in the list, so they always survive the cap.
 *
 * Caps: bird 15 · mammal 15 · reptile 10 · amphibian 10 · insect 8 · marine 10 · other 5
 * (increased from bird:15·mammal:10·reptile:5·amphibian:5·insect:5·marine:6·other:4
 *  to surface more species in species-rich parks like Everglades, Great Smoky, etc.)
 */
const TYPE_CAPS = {
  bird:      15,
  mammal:    15,
  reptile:   10,
  amphibian: 10,
  insect:     8,
  marine:    10,
  other:      5,
};

export function balanceAnimals(animals) {
  const counts = {};
  return animals.filter(a => {
    const t = a.animalType ?? 'other';
    counts[t] = (counts[t] ?? 0) + 1;
    return counts[t] <= (TYPE_CAPS[t] ?? 4);
  });
}
