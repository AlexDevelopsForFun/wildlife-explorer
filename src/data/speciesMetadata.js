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

  // Cryptic/under-reported — boost
  'Northern Saw-whet Owl': 1.8,
  'Flammulated Owl':       2.0,
  'Boreal Owl':            2.0,
  'Mexican Spotted Owl':   1.8,
  'Black Rail':            2.5,
  'Yellow Rail':           2.5,
  'Ovenbird':              1.3,
  'Hermit Thrush':         1.2,
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
export const RARITY_THRESHOLDS = [
  { tier: 'guaranteed',  min: 0.90 },
  { tier: 'very_likely', min: 0.60 },
  { tier: 'likely',      min: 0.30 },
  { tier: 'unlikely',    min: 0.10 },
  { tier: 'rare',        min: 0.02 },
  { tier: 'exceptional', min: 0.00 },
];

export function rarityFromFrequency(freq) {
  for (const { tier, min } of RARITY_THRESHOLDS) {
    if (freq >= min) return tier;
  }
  return 'exceptional';
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
