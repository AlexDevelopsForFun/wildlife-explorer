// ── Species-level metadata for rarity v2 ─────────────────────────────────────
// Static lookups consumed by scripts/applyRarityV2.js (build-time) and the UI
// (runtime badges). Keeping this in src/data so both Node scripts and the
// browser bundle can share the same source of truth.

// ── Activity period ──────────────────────────────────────────────────────────
// 'diurnal'     — active in daylight, seen by any visitor
// 'crepuscular' — active dawn/dusk, missed by midday visitors
// 'nocturnal'   — active at night, not visible to day visitors
// 'cathemeral'  — active any time, not strongly biased
//
// Detection order: exact name match → keyword match → animalType default.

export const ACTIVITY_PERIOD_EXACT = {
  // Nocturnal specialists
  'Northern Saw-whet Owl':  'nocturnal',
  'Great Horned Owl':       'nocturnal',
  'Barred Owl':             'nocturnal',
  'Eastern Screech-Owl':    'nocturnal',
  'Western Screech-Owl':    'nocturnal',
  'Long-eared Owl':         'nocturnal',
  'Short-eared Owl':        'crepuscular',
  'Snowy Owl':              'cathemeral',
  'Burrowing Owl':          'crepuscular',
  'Northern Hawk Owl':      'diurnal',
  'Northern Pygmy-Owl':     'diurnal',
  'Common Poorwill':        'nocturnal',
  'Eastern Whip-poor-will': 'nocturnal',
  'Chuck-will\'s-widow':    'nocturnal',
  'Common Nighthawk':       'crepuscular',
  'Mexican Whip-poor-will': 'nocturnal',

  // Crepuscular mammals
  'White-tailed Deer':      'crepuscular',
  'Mule Deer':              'crepuscular',
  'Black-tailed Deer':      'crepuscular',
  'Elk':                    'crepuscular',
  'American Elk':           'crepuscular',
  'Roosevelt Elk':          'crepuscular',
  'Moose':                  'crepuscular',
  'Black Bear':             'crepuscular',
  'Grizzly Bear':           'crepuscular',
  'American Black Bear':    'crepuscular',
  'Brown Bear':             'crepuscular',
  'Mountain Lion':          'nocturnal',
  'Cougar':                 'nocturnal',
  'Puma':                   'nocturnal',
  'Bobcat':                 'crepuscular',
  'Canada Lynx':            'crepuscular',
  'Coyote':                 'crepuscular',
  'Gray Wolf':              'crepuscular',
  'Red Fox':                'crepuscular',
  'Gray Fox':               'nocturnal',
  'Raccoon':                'nocturnal',
  'Striped Skunk':          'nocturnal',
  'Spotted Skunk':          'nocturnal',
  'Virginia Opossum':       'nocturnal',
  'Nine-banded Armadillo':  'nocturnal',
  'Porcupine':              'nocturnal',
  'American Beaver':        'crepuscular',
  'North American River Otter': 'cathemeral',
  'Fisher':                 'crepuscular',
  'American Marten':        'crepuscular',
  'Long-tailed Weasel':     'crepuscular',
  'Ermine':                 'crepuscular',
  'Mink':                   'crepuscular',
  'Badger':                 'nocturnal',
  'American Badger':        'nocturnal',
  'Ringtail':               'nocturnal',
  'Kit Fox':                'nocturnal',
  'Swift Fox':              'crepuscular',

  // Diurnal mammals
  'American Bison':         'diurnal',
  'Pronghorn':              'diurnal',
  'Mountain Goat':          'diurnal',
  'Bighorn Sheep':          'diurnal',
  'Desert Bighorn Sheep':   'diurnal',
  'Javelina':               'crepuscular',
  'Collared Peccary':       'crepuscular',
  'American Pika':          'diurnal',
  'Yellow-bellied Marmot':  'diurnal',
  'Hoary Marmot':           'diurnal',
  'Olympic Marmot':         'diurnal',
  'Golden-mantled Ground Squirrel': 'diurnal',
  'Rock Squirrel':          'diurnal',
  'Black-tailed Prairie Dog': 'diurnal',
  'Utah Prairie Dog':       'diurnal',
  'Harbor Seal':            'cathemeral',
  'West Indian Manatee':    'cathemeral',
  'Florida Manatee':        'cathemeral',
  'Bottlenose Dolphin':     'diurnal',
  'Humpback Whale':         'cathemeral',
};

// Keyword rules applied AFTER exact-match, BEFORE type-default.
// First match wins. Lowercased before check.
export const ACTIVITY_PERIOD_KEYWORDS = [
  // Nocturnal
  { match: /\b(owl|nightjar|nighthawk|whip-poor-will|poorwill|bat)\b/,     period: 'nocturnal' },
  { match: /\b(flying squirrel|ringtail|opossum|raccoon|skunk|armadillo)\b/, period: 'nocturnal' },
  // Crepuscular
  { match: /\b(deer|elk|moose|bear|lynx|bobcat|coyote|wolf|fox|cougar|mountain lion|puma)\b/, period: 'crepuscular' },
  { match: /\b(peccary|javelina|marten|fisher|weasel|mink|porcupine|beaver)\b/, period: 'crepuscular' },
  // Cathemeral
  { match: /\b(otter|manatee|seal|whale|dolphin|porpoise)\b/, period: 'cathemeral' },
];

// Default activity period by animalType when no exact/keyword match.
export const ACTIVITY_PERIOD_DEFAULTS = {
  bird:      'diurnal',
  mammal:    'crepuscular',  // pessimistic: most non-listed mammals skew crepuscular
  reptile:   'diurnal',
  amphibian: 'nocturnal',    // frogs/salamanders peak at night
  insect:    'diurnal',
  marine:    'cathemeral',
  fish:      'cathemeral',
};

// Emoji for UI badge
export const ACTIVITY_PERIOD_UI = {
  diurnal:     { emoji: '☀️', label: 'Day-active',   tooltip: 'Active during daylight — visible to any visitor' },
  crepuscular: { emoji: '🌅', label: 'Dawn/dusk',     tooltip: 'Most active at dawn and dusk — plan early or late visits' },
  nocturnal:   { emoji: '🌙', label: 'Night',         tooltip: 'Active at night — rarely visible during daytime visits' },
  cathemeral:  { emoji: '🌓', label: 'Any time',      tooltip: 'Active around the clock' },
};

// ── Time-of-day detection multiplier ─────────────────────────────────────────
// When the user specifies when they plan to visit, rescale frequency per
// species based on activity period. A dawn visitor has ~2× the chance of
// spotting a crepuscular mammal vs a midday visitor. Nocturnal species are
// essentially invisible mid-day (×0.1) but common right before sunrise.
//
// Rows are [activityPeriod][timeOfDay]. Multipliers.
export const TIME_OF_DAY_MULTIPLIER = {
  diurnal: {
    any:      1.00,
    dawn:     1.10,
    morning:  1.20,
    midday:   1.00,
    evening:  0.90,
    dusk:     0.70,
    night:    0.05,
  },
  crepuscular: {
    any:      1.00,
    dawn:     2.00,
    morning:  1.20,
    midday:   0.40,
    evening:  1.30,
    dusk:     2.00,
    night:    0.70,
  },
  nocturnal: {
    any:      1.00,
    dawn:     0.60,
    morning:  0.15,
    midday:   0.05,
    evening:  0.30,
    dusk:     0.90,
    night:    2.50,
  },
  cathemeral: {
    any:      1.00,
    dawn:     1.10,
    morning:  1.00,
    midday:   0.90,
    evening:  1.00,
    dusk:     1.10,
    night:    1.00,
  },
};

export const TIME_OF_DAY_UI = {
  any:     { emoji: '⏱️', label: 'Any time' },
  dawn:    { emoji: '🌄', label: 'Dawn (before sunrise)' },
  morning: { emoji: '🌅', label: 'Morning' },
  midday:  { emoji: '☀️', label: 'Midday' },
  evening: { emoji: '🌇', label: 'Evening' },
  dusk:    { emoji: '🌆', label: 'Dusk (sunset)' },
  night:   { emoji: '🌙', label: 'Night' },
};

// ── Per-species charisma correction overrides ────────────────────────────────
// Replaces the blanket ÷3 raptor correction for species where reality differs.
// Values are multipliers applied to frequency/obs-count BEFORE tier mapping.
// Values <1 deflate (over-reported charismatic species); values >1 inflate
// (under-reported cryptic species).
//
// If a species is in this map, its value wins over the keyword-based category
// correction in apiService.js::getCorrectionFactor and the Node mirror in
// buildWildlifeCache.js::ebirdCharismaCorrectionFactor.
export const CHARISMA_OVERRIDES_V2 = {
  // Mega-charismatic — heavily over-photographed, over-reported
  'Bald Eagle':            0.20,  // was 0.2, keep
  'Golden Eagle':          0.25,
  'California Condor':     0.15,
  'Grizzly Bear':          0.35,
  'Black Bear':            0.40,
  'Gray Wolf':             0.30,
  'Mountain Lion':         0.20,
  'Cougar':                0.20,
  'Wolverine':             0.25,
  'Canada Lynx':           0.30,
  'Moose':                 0.45,
  'American Bison':        0.55,
  'Florida Panther':       0.15,

  // Moderate charisma
  'Osprey':                0.45,
  'Red-tailed Hawk':       0.55,
  'Peregrine Falcon':      0.45,
  'Great Blue Heron':      0.65,
  'Great Egret':           0.65,
  'Snowy Egret':           0.65,
  'Roseate Spoonbill':     0.50,
  'Sandhill Crane':        0.55,
  'Whooping Crane':        0.25,
  'Trumpeter Swan':        0.45,

  // Cryptic/under-reported — boost (iNat users skip these; eBirders log them)
  'Northern Saw-whet Owl': 1.8,
  'Flammulated Owl':       2.0,
  'Boreal Owl':            2.0,
  'Mexican Spotted Owl':   1.8,
  'Black Rail':            2.5,
  'Yellow Rail':           2.5,
  'Ovenbird':              1.3,
  'Hermit Thrush':         1.2,

  // ── iNat-bias correction (gap J) ───────────────────────────────────────────
  // iNat users photograph "interesting" species; they routinely skip common
  // LBBs (little brown birds). eBird checklist-frequency data confirms these
  // species are far more common than their iNat counts suggest. Values derived
  // by comparing eBird historical-frequency vs iNat observation-count ratios
  // for parks where both sources exist.

  // Common sparrows — heavily under-logged on iNat
  'Song Sparrow':             1.8,
  'White-crowned Sparrow':    1.6,
  'Dark-eyed Junco':          1.7,
  'Chipping Sparrow':         1.5,
  'White-throated Sparrow':   1.5,
  'Fox Sparrow':              1.4,
  'Savannah Sparrow':         1.6,
  'House Sparrow':            1.8,
  'American Tree Sparrow':    1.5,
  'Lincoln\'s Sparrow':       1.5,
  'Vesper Sparrow':           1.4,

  // Common wrens/warblers/finches — similar under-logging
  'House Wren':               1.6,
  'Bewick\'s Wren':           1.5,
  'Carolina Wren':            1.4,
  'Winter Wren':              1.5,
  'Ruby-crowned Kinglet':     1.7,
  'Golden-crowned Kinglet':   1.6,
  'Yellow Warbler':           1.3,
  'Yellow-rumped Warbler':    1.5,
  'Orange-crowned Warbler':   1.5,
  'Common Yellowthroat':      1.4,
  'American Goldfinch':       1.4,
  'House Finch':              1.5,
  'Cassin\'s Finch':          1.4,
  'Pine Siskin':              1.5,
  'American Robin':           1.2,   // charismatic but also under-logged on iNat
  'European Starling':        1.5,

  // Corvids other than ravens — modestly under-logged
  'Blue Jay':                 1.2,
  'Steller\'s Jay':           1.2,
  'Pinyon Jay':               1.3,
  'Gray Jay':                 1.3,    // aka Canada Jay
  'Canada Jay':               1.3,
  'American Crow':            1.3,
  'Clark\'s Nutcracker':      1.2,

  // Small mammals — usually only logged by tracking enthusiasts
  'Deer Mouse':               2.2,
  'White-footed Mouse':       2.2,
  'Meadow Vole':              2.5,
  'Western Harvest Mouse':    2.5,
  'Least Chipmunk':           1.5,
  'Yellow-pine Chipmunk':     1.5,
  'Red Squirrel':             1.3,
  'Eastern Gray Squirrel':    1.3,
  'Fox Squirrel':             1.4,
  'Douglas Squirrel':         1.4,

  // Ubiquitous cathedral species — pigeons, doves, gulls
  'Mourning Dove':            1.4,
  'Rock Pigeon':              1.5,
  'Eurasian Collared-Dove':   1.4,
  'Ring-billed Gull':         1.3,
  'Herring Gull':             1.3,
  'European Herring Gull':    1.3,

  // Species that suffer opposite bias (over-logged due to photographic appeal)
  'Great Gray Owl':           0.40,
  'Long-eared Owl':           0.60,
  'Northern Hawk Owl':        0.50,
  'Red-headed Woodpecker':    0.70,
  'Painted Bunting':          0.55,
  'Indigo Bunting':           0.70,
  'Rose-breasted Grosbeak':   0.75,
  'Scarlet Tanager':          0.65,
  'Baltimore Oriole':         0.75,
  'Black-necked Stilt':       0.80,
  'Reddish Egret':            0.60,
  'Wood Stork':               0.70,
};

// ── Visitor-effort scalar ────────────────────────────────────────────────────
// Multiplier applied to computed frequency BEFORE mapping to rarity tier.
// 1.0  = power birder (eBird checklist, 45-min dedicated survey, binoculars)
// 0.65 = casual visitor (default) — ~65% of an expert's detection rate
// 0.35 = windshield tourist — drives through, no stops, no optics
export const VISITOR_EFFORT = {
  expert:  1.00,
  casual:  0.65,
  drive:   0.35,
};

export const DEFAULT_VISITOR_EFFORT = 'casual';

// ── Per-park visitor-effort baseline ─────────────────────────────────────────
// Parks attract different visitor mixes. Backcountry-only parks self-select
// for serious observers (de-facto effort ~= expert). Drive-through tourist
// parks (cuyahogavalley, gateway-arch) skew casual-to-drive. When the UI's
// visitor-effort picker is on 'auto', we use this table; users can still
// override per-park.
export const PARK_EFFORT_BASELINES = {
  // Remote / backcountry — attracts dedicated observers
  gatesofthearctic: 'expert',
  kobukvalley:      'expert',
  wrangellstelias:  'expert',
  katmai:           'expert',
  lakeclark:        'expert',
  glacierbay:       'expert',
  isleroyale:       'expert',
  northcascades:    'expert',
  americansamoa:    'expert',

  // Birding meccas — serious birders dominate the observer pool
  everglades:       'expert',
  bigbend:          'expert',
  drytortugas:      'expert',
  virginislands:    'expert',
  congaree:         'expert',
  channelislands:   'expert',

  // Drive-through / tourist-dominated — casual to windshield
  gatewayarch:      'drive',
  hotsprings:       'drive',
  cuyahogavalley:   'drive',
  indianadunes:     'drive',
  mammothcave:      'drive',  // underground tours; wildlife secondary
  carlsbadcaverns:  'drive',  // same
  hawaiivolcanoes:  'drive',
  haleakala:        'drive',

  // All others default to 'casual' (DEFAULT_VISITOR_EFFORT).
};

// ── Confidence thresholds ────────────────────────────────────────────────────
// Confidence derives from the amount of data behind the rarity rating.
// Shown to the user as a small dot on the rarity badge.
//
//  high   — strong signal (≥ 500 obs or gold-standard eBird S&T periods)
//  medium — moderate signal (≥ 50 obs or county-level eBird frequency)
//  low    — thin signal (< 50 obs or binary fallback — one-off records)
export function computeConfidence({ raritySource, obsCount }) {
  if (raritySource === 'ebird_st')                       return 'high';
  if (raritySource === 'override')                       return 'high';
  if (raritySource === 'ebird_county_freq')              return 'medium';
  if (raritySource?.startsWith('ebird_binary'))          return 'low';
  // iNat paths — size-based
  if (obsCount != null) {
    if (obsCount >= 500) return 'high';
    if (obsCount >= 50)  return 'medium';
    return 'low';
  }
  return 'low';
}

export const CONFIDENCE_UI = {
  high:   { emoji: '●',  color: '#10b981', tooltip: 'High confidence — 500+ observations or eBird Status & Trends data' },
  medium: { emoji: '◐',  color: '#f59e0b', tooltip: 'Medium confidence — 50-500 observations or county-level frequency' },
  low:    { emoji: '○',  color: '#9ca3af', tooltip: 'Low confidence — thin data, treat rating as approximate' },
};

// ── Rarity tier thresholds (shared by build + runtime re-mapping) ────────────
// Calibrated against a 90-day iNat-research-grade backtest (Apr 2026). The
// middle tiers (`likely`, `rare`) came in within 1% of target; the top tiers
// over-promised by 12-14% (species at freq 0.90 were observed 83% of the time
// in 90 days, not 95%). Adjustments:
//   - guaranteed:  raised 0.90 → 0.92  (require stronger evidence)
//   - very_likely: raised 0.60 → 0.62
//   - exceptional: raised 0.02 → 0.03  (bump borderline species up to rare)
// likely/unlikely/rare unchanged — they were within backtest noise.
export const RARITY_THRESHOLDS = [
  { tier: 'guaranteed',  min: 0.92 },
  { tier: 'very_likely', min: 0.62 },
  { tier: 'likely',      min: 0.30 },
  { tier: 'unlikely',    min: 0.10 },
  { tier: 'rare',        min: 0.03 },
  { tier: 'exceptional', min: 0.00 },
];

export function rarityFromFrequency(freq) {
  for (const { tier, min } of RARITY_THRESHOLDS) {
    if (freq >= min) return tier;
  }
  return 'exceptional';
}

// ── Habitat specificity (gap I) ──────────────────────────────────────────────
// Species that are specialists for a narrow habitat get a specificity penalty
// when the park's dominant habitat doesn't match. This prevents, e.g., the
// Marsh Wren from being rated the same in a desert park as in a wetland.
//
// HABITAT_KEYWORDS: classify a species by name/common name to one of:
//   marsh | desert | alpine | marine | freshwater | forest | grassland | generalist
export const HABITAT_KEYWORDS = [
  // Marsh / wetland specialists
  { match: /\b(marsh|rail|bittern|gallinule|snipe|teal|grebe|coot|moorhen)\b/, habitat: 'marsh' },
  // Desert / xeric specialists
  { match: /\b(desert|cactus|roadrunner|thrasher|gambel|phainopepla|verdin|pyrrhuloxia|javelina|peccary)\b/, habitat: 'desert' },
  // Alpine / high-elevation specialists
  { match: /\b(alpine|ptarmigan|rosy-finch|pika|mountain goat|bighorn|marmot)\b/, habitat: 'alpine' },
  // Marine / coastal
  { match: /\b(shearwater|albatross|puffin|murre|auklet|tropicbird|tern|shag|cormorant|pelican|seal|whale|dolphin|porpoise|manatee|otter)\b/, habitat: 'marine' },
  // Freshwater
  { match: /\b(kingfisher|dipper|merganser|loon|trout|salmon|bass|pike|bluegill|bullhead|perch|cichlid|sunfish|catfish)\b/, habitat: 'freshwater' },
  // Forest interior
  { match: /\b(ovenbird|thrush|veery|warbler|vireo|wood-pewee|tanager|flycatcher|hawk|owl)\b/, habitat: 'forest' },
  // Grassland / prairie
  { match: /\b(meadowlark|dickcissel|bobolink|prairie|grasshopper sparrow|henslow|longspur|horned lark)\b/, habitat: 'grassland' },
];

// PARK_HABITAT_FRACTIONS — approximate share of each habitat in a park.
// Values sum to ~1.0. Unlisted habitats implicit 0. When a species' habitat
// is absent or rare in a park, we apply a specificity penalty to rarity.
export const PARK_HABITAT_FRACTIONS = {
  yellowstone:       { forest: 0.55, grassland: 0.20, alpine: 0.15, freshwater: 0.10 },
  everglades:        { marsh: 0.70, freshwater: 0.20, marine: 0.10 },
  denali:            { alpine: 0.45, forest: 0.35, grassland: 0.15, freshwater: 0.05 },
  acadia:            { forest: 0.60, marine: 0.25, freshwater: 0.15 },
  shenandoah:        { forest: 0.90, grassland: 0.05, freshwater: 0.05 },
  greatsmokymountains: { forest: 0.95, freshwater: 0.05 },
  grandcanyon:       { desert: 0.60, forest: 0.25, freshwater: 0.15 },
  zion:              { desert: 0.70, forest: 0.20, freshwater: 0.10 },
  arches:            { desert: 0.95, freshwater: 0.05 },
  canyonlands:       { desert: 0.90, freshwater: 0.10 },
  deathvalley:       { desert: 0.98, freshwater: 0.02 },
  saguaro:           { desert: 0.95, grassland: 0.05 },
  joshuatree:        { desert: 0.95, grassland: 0.05 },
  bigbend:           { desert: 0.75, forest: 0.15, freshwater: 0.10 },
  whitesands:        { desert: 1.00 },
  carlsbadcaverns:   { desert: 0.90, grassland: 0.10 },
  guadalupemountains:{ desert: 0.70, forest: 0.20, alpine: 0.10 },
  petrifiedforest:   { desert: 0.90, grassland: 0.10 },
  grandteton:        { forest: 0.50, alpine: 0.25, grassland: 0.15, freshwater: 0.10 },
  rockymountain:     { forest: 0.45, alpine: 0.35, grassland: 0.15, freshwater: 0.05 },
  glacier:           { forest: 0.55, alpine: 0.30, freshwater: 0.15 },
  greatsanddunes:    { desert: 0.70, grassland: 0.20, alpine: 0.10 },
  blackcanyon:       { forest: 0.70, alpine: 0.20, freshwater: 0.10 },
  olympic:           { forest: 0.60, marine: 0.15, alpine: 0.15, freshwater: 0.10 },
  northcascades:     { forest: 0.60, alpine: 0.30, freshwater: 0.10 },
  mountrainier:      { forest: 0.55, alpine: 0.35, freshwater: 0.10 },
  craterlake:        { forest: 0.50, alpine: 0.35, freshwater: 0.15 },
  redwood:           { forest: 0.75, marine: 0.15, freshwater: 0.10 },
  lassenvolcanic:    { forest: 0.70, alpine: 0.25, freshwater: 0.05 },
  yosemite:          { forest: 0.50, alpine: 0.35, freshwater: 0.10, grassland: 0.05 },
  kingscanyon:       { forest: 0.55, alpine: 0.40, freshwater: 0.05 },
  sequoia:           { forest: 0.60, alpine: 0.30, freshwater: 0.10 },
  pinnacles:         { forest: 0.60, grassland: 0.30, desert: 0.10 },
  channelislands:    { marine: 0.60, grassland: 0.30, forest: 0.10 },
  kenaifjords:       { marine: 0.50, alpine: 0.30, forest: 0.20 },
  glacierbay:        { marine: 0.50, forest: 0.30, alpine: 0.20 },
  katmai:            { forest: 0.45, freshwater: 0.25, alpine: 0.20, marine: 0.10 },
  wrangellstelias:   { alpine: 0.50, forest: 0.35, freshwater: 0.15 },
  lakeclark:         { forest: 0.45, freshwater: 0.25, alpine: 0.20, marine: 0.10 },
  gatesofthearctic:  { alpine: 0.45, forest: 0.40, freshwater: 0.15 },
  kobukvalley:       { forest: 0.50, grassland: 0.30, freshwater: 0.20 },
  hawaiivolcanoes:   { forest: 0.70, grassland: 0.15, marine: 0.10, alpine: 0.05 },
  haleakala:         { alpine: 0.60, forest: 0.30, grassland: 0.10 },
  americansamoa:     { forest: 0.75, marine: 0.25 },
  virginislands:     { forest: 0.55, marine: 0.45 },
  hotsprings:        { forest: 0.95, freshwater: 0.05 },
  biscayne:          { marine: 0.85, marsh: 0.15 },
  drytortugas:       { marine: 0.98, forest: 0.02 },
  congaree:          { forest: 0.80, marsh: 0.15, freshwater: 0.05 },
  mammothcave:       { forest: 0.95, freshwater: 0.05 },
  voyageurs:         { forest: 0.55, freshwater: 0.45 },
  indianadunes:      { forest: 0.45, marine: 0.30, marsh: 0.15, grassland: 0.10 },
  badlands:          { grassland: 0.80, desert: 0.20 },
  windcave:          { grassland: 0.75, forest: 0.25 },
  theodoreroosevelt: { grassland: 0.80, forest: 0.15, freshwater: 0.05 },
  gatewayarch:       { freshwater: 0.60, grassland: 0.30, forest: 0.10 },
  mesaverde:         { desert: 0.60, forest: 0.35, grassland: 0.05 },
  capitolreef:       { desert: 0.80, forest: 0.15, freshwater: 0.05 },
  brycecanyon:       { forest: 0.50, desert: 0.40, alpine: 0.10 },
  greatbasin:        { desert: 0.50, forest: 0.30, alpine: 0.20 },
  newrivergorge:     { forest: 0.90, freshwater: 0.10 },
  cuyahogavalley:    { forest: 0.70, marsh: 0.15, freshwater: 0.15 },
  isleroyale:        { forest: 0.70, freshwater: 0.25, marine: 0.05 },
};

// Classify a species into a habitat category.
export function classifyHabitat(animal) {
  if (!animal?.name) return 'generalist';
  const lower = animal.name.toLowerCase();
  for (const { match, habitat } of HABITAT_KEYWORDS) {
    if (match.test(lower)) return habitat;
  }
  return 'generalist';
}

// Compute habitat-specificity multiplier for a species at a park.
// Generalists pass through (1.0). Specialists get a multiplier equal to the
// park's fraction of that habitat, with a floor of 0.15 (species can still
// be present in small marginal habitat patches).
export function habitatMultiplier(animal, parkId) {
  const habitat = animal.habitat ?? classifyHabitat(animal);
  if (habitat === 'generalist') return 1;
  const fractions = PARK_HABITAT_FRACTIONS[parkId];
  if (!fractions) return 1;                            // unknown park → pass through
  const frac = fractions[habitat] ?? 0;
  return Math.max(0.15, Math.min(1.5, frac * 1.5));    // 0.15 floor, 1.5 ceiling
}

// ── Classify activity period from animal object ─────────────────────────────
export function classifyActivityPeriod(animal) {
  if (!animal) return 'diurnal';
  if (ACTIVITY_PERIOD_EXACT[animal.name]) return ACTIVITY_PERIOD_EXACT[animal.name];

  const lower = (animal.name ?? '').toLowerCase();
  for (const { match, period } of ACTIVITY_PERIOD_KEYWORDS) {
    if (match.test(lower)) return period;
  }

  return ACTIVITY_PERIOD_DEFAULTS[animal.animalType] ?? 'diurnal';
}
