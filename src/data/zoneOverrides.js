/**
 * zoneOverrides.js — sub-park rarity for hotspot zones.
 *
 * Per-zone (parkId, zoneId, species) tier + frequency overrides for known
 * sub-park hotspots. Layered onto cached animal entries at load time by
 * wildlifeCacheLoader.js so the popup zone selector produces a meaningfully
 * different pill for "Cataloochee Valley" vs "Newfound Gap" at Smokies.
 *
 * Why: the rebuilt cache stores ONE rarity per (park, species) pair —
 * averaged over the whole park polygon. But the most reliable visitor
 * encounter sites are highly concentrated:
 *   - Cataloochee Valley, Smokies: ~200-elk herd, near-100% sighting in
 *     Sept-Oct rut at dawn/dusk. Park-wide elk encounter rate is ~15%.
 *   - Lamar Valley, Yellowstone: dawn-watching wolves with optics is ~30%.
 *     Park-wide casual wolf encounter is <5%.
 *   - Brooks Falls, Katmai: bear viewing platform in July is effectively
 *     1.0. Off-platform/off-season is much lower.
 *
 * The deep-research reviews and the anchor-based calibration both flagged
 * this as the biggest specific source of model error — the worst Δtier ≥ 2
 * misses are all sub-park hotspot effects.
 *
 * Schema:
 *   ZONE_OVERRIDES = {
 *     parkId: {
 *       'Species Common Name': {
 *         zoneId: {
 *           rarity:    'guaranteed' | 'very_likely' | ...,
 *           frequency: 0.0–1.0,         // optional; rarity tier floor used otherwise
 *           seasonFrequencies: { spring: 5–99, summer: 5–99, fall: 5–99, winter: 5–99 }, // optional
 *           rationale: string,           // why this zone is special
 *         },
 *       },
 *     },
 *   }
 *
 * Curation:
 *   - Bump ZONES_REVIEWED_AT below whenever you add or change entries.
 *   - Like RARITY_OVERRIDES, treat as ecologist judgment that supersedes
 *     data-driven pipeline output WITHIN that zone only. Park-level rarity
 *     for the same species is unaffected.
 */

export const ZONES_REVIEWED_AT = '2026-04-25';

export const ZONE_OVERRIDES = {
  // ── Great Smoky Mountains ──────────────────────────────────────────
  greatsmokymountains: {
    'Elk': {
      'cataloochee': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 70, summer: 75, fall: 95, winter: 70 },
        rationale: 'Cataloochee re-introduced herd (~200 animals). Fall rut (Sept-Oct) at dawn/dusk = near-100% sighting. Off-rut still very likely in valley meadows.',
      },
      'newfound-gap': {
        rarity: 'rare',
        frequency: 0.05,
        rationale: 'Park-wide elk are concentrated at Cataloochee; main road corridor sightings are uncommon.',
      },
    },
    'Black Bear': {
      'cades-cove': {
        rarity: 'likely',
        frequency: 0.45,
        seasonFrequencies: { spring: 40, summer: 50, fall: 55, winter: 15 },
        rationale: 'Cades Cove Loop drive has the highest concentration of habituated bears in the park. ~40-55% sighting in active season.',
      },
    },
    'White-tailed Deer': {
      'cades-cove': {
        rarity: 'guaranteed',
        frequency: 0.97,
        rationale: 'Cades Cove meadows host the densest deer population in the park.',
      },
    },
  },

  // ── Yellowstone ─────────────────────────────────────────────────────
  yellowstone: {
    'Gray Wolf': {
      'lamar-valley': {
        rarity: 'likely',
        frequency: 0.32,
        seasonFrequencies: { spring: 30, summer: 25, fall: 35, winter: 50 },
        rationale: 'Lamar Valley with dawn spotting-scope effort — the only place in the lower 48 with predictable wolf viewing.',
      },
      'hayden-valley': {
        rarity: 'unlikely',
        frequency: 0.18,
        rationale: 'Wolves visit Hayden Valley but less consistently than Lamar.',
      },
    },
    'Grizzly Bear': {
      'hayden-valley': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 50, summer: 45, fall: 35, winter: 5 },
        rationale: 'Hayden Valley spring/summer carcass season — bears actively visible from road.',
      },
      'lamar-valley': {
        rarity: 'likely',
        frequency: 0.35,
        rationale: 'Lamar Valley grizzlies visible from road at wider scope-watching distances.',
      },
    },
    'American Bison': {
      'lamar-valley':  { rarity: 'guaranteed', frequency: 0.99, rationale: 'Lamar Valley is the densest bison habitat in the park.' },
      'hayden-valley': { rarity: 'guaranteed', frequency: 0.99, rationale: 'Hayden Valley bison herds visible from road year-round.' },
      'old-faithful':  { rarity: 'very_likely', frequency: 0.75, rationale: 'Bison wander Geyser Basin boardwalks — frequent but not guaranteed.' },
    },
    'American Elk': {
      'mammoth':       { rarity: 'guaranteed', frequency: 0.95, rationale: 'Mammoth Hot Springs resident elk herd grazes the lawns and terraces year-round.' },
      'lamar-valley':  { rarity: 'very_likely', frequency: 0.75, rationale: 'Elk visible in valley meadows alongside bison.' },
    },
    'Coyote': {
      'lamar-valley':  { rarity: 'likely', frequency: 0.55, rationale: 'Highly visible in open valley terrain — often seen following wolf kills.' },
      'hayden-valley': { rarity: 'likely', frequency: 0.50, rationale: 'Open valley sightings common.' },
    },
  },

  // ── Glacier ─────────────────────────────────────────────────────────
  glacier: {
    'Mountain Goat': {
      'going-to-sun': {
        rarity: 'very_likely',
        frequency: 0.65,
        seasonFrequencies: { spring: 40, summer: 70, fall: 60, winter: 20 },
        rationale: 'Logan Pass area + Hidden Lake Trail — goats reliably visible on cliffs above the road in summer.',
      },
      'many-glacier': {
        rarity: 'likely',
        frequency: 0.40,
        rationale: 'Goat-watching from Many Glacier hotel and trails.',
      },
    },
    'Bighorn Sheep': {
      'many-glacier':   { rarity: 'likely', frequency: 0.45, rationale: 'Many Glacier slopes are reliable summer bighorn habitat.' },
      'going-to-sun':   { rarity: 'likely', frequency: 0.35, rationale: 'Logan Pass area sightings common in summer.' },
    },
    'Grizzly Bear': {
      'many-glacier':   { rarity: 'unlikely', frequency: 0.25, rationale: 'Many Glacier valley grizzly density is the highest in the park.' },
    },
  },

  // ── Olympic ─────────────────────────────────────────────────────────
  olympic: {
    'Olympic Marmot': {
      'hurricane-ridge': {
        rarity: 'guaranteed',
        frequency: 0.90,
        seasonFrequencies: { spring: 50, summer: 95, fall: 80, winter: 5 },
        rationale: 'Hurricane Ridge meadows in July-August — marmots sun themselves on rocks visible from the visitor center.',
      },
    },
    'Roosevelt Elk': {
      'hoh-rainforest':  { rarity: 'very_likely', frequency: 0.70, rationale: 'Hoh herd visible along trails and river corridor year-round.' },
      'kalaloch':        { rarity: 'likely',      frequency: 0.40, rationale: 'Beach-strip elk crossings reported regularly.' },
    },
    'Mule Deer': {
      'hurricane-ridge': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Habituated deer at Hurricane Ridge meadows and parking area.' },
    },
  },

  // ── Rocky Mountain ──────────────────────────────────────────────────
  rockymountain: {
    'Moose': {
      'kawuneeche': {
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 65, summer: 80, fall: 75, winter: 50 },
        rationale: 'West-side Kawuneeche Valley moose herd — willows along the Colorado River source. Most reliable moose viewing in the park.',
      },
      'bear-lake': { rarity: 'unlikely', frequency: 0.15, rationale: 'East-side moose are rare; mostly seen in Sprague Lake / Glacier Basin meadows.' },
    },
    'American Pika': {
      'trail-ridge': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 30, summer: 90, fall: 75, winter: 5 },
        rationale: 'Alpine talus along Trail Ridge Road — pikas reliably calling from rocks within a few meters of pullouts in summer.',
      },
    },
    'American Elk': {
      'bear-lake':  { rarity: 'guaranteed', frequency: 0.95, rationale: 'Estes Park / Moraine Park / Horseshoe Park elk herds are the iconic RMNP wildlife experience, especially in fall rut.' },
      'trail-ridge':{ rarity: 'very_likely', frequency: 0.70, rationale: 'Tundra elk visible from pullouts along Trail Ridge Road in summer.' },
    },
    'Bighorn Sheep': {
      'bear-lake':  { rarity: 'likely', frequency: 0.40, rationale: 'Sheep Lakes mineral lick (Horseshoe Park) draws bighorns May-June; very reliable in window.' },
    },
  },

  // ── Katmai ──────────────────────────────────────────────────────────
  katmai: {
    'Brown Bear': {
      // No zones defined in PARK_ZONES yet — but Brooks Falls is THE flagship.
      // Keeping this entry as documentation; will activate when zone metadata
      // for Katmai is added to parkZones.js.
      // 'brooks-falls': { rarity: 'guaranteed', frequency: 0.99, rationale: 'Bear viewing platform in July = effectively guaranteed.' },
    },
  },

  // ── Yosemite ────────────────────────────────────────────────────────
  yosemite: {
    'Mule Deer': {
      'valley': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Habituated deer in Cook\'s Meadow and Stoneman Meadow — essentially every Valley visitor sees them.' },
    },
    'Black Bear': {
      'valley':       { rarity: 'unlikely', frequency: 0.15, rationale: 'Despite bear-aware messaging, casual Valley visitors see bears on ~15% of summer trips. Higher in backcountry.' },
      'tuolumne':     { rarity: 'unlikely', frequency: 0.20, rationale: 'Tuolumne Meadows campers report regular bear activity at dusk.' },
    },
  },

  // ── Grand Canyon ────────────────────────────────────────────────────
  grandcanyon: {
    'California Condor': {
      'south-rim':  { rarity: 'unlikely', frequency: 0.15, rationale: 'Condor releases at Vermilion Cliffs put them visible from South Rim more often than other locations.' },
      'desert-view':{ rarity: 'unlikely', frequency: 0.20, rationale: 'Navajo Bridge / Desert View area is a documented condor flyway.' },
    },
    'Common Raven': {
      'south-rim': { rarity: 'guaranteed', frequency: 0.99, rationale: 'Ravens at every overlook — South Rim visitors see them on essentially every visit.' },
    },
  },
};

/**
 * Resolve any zone overrides for an animal at a park.
 * Returns an object suitable to merge into animal.zones, or null.
 */
export function getZoneOverridesForAnimal(parkId, speciesName) {
  const parkOverrides = ZONE_OVERRIDES[parkId];
  if (!parkOverrides) return null;
  const speciesOverrides = parkOverrides[speciesName];
  if (!speciesOverrides) return null;
  // Strip out empty zone definitions (intentionally-blank Brooks Falls placeholder etc.)
  const populated = Object.entries(speciesOverrides).filter(([, v]) => v && Object.keys(v).length > 0);
  if (!populated.length) return null;
  return Object.fromEntries(populated);
}
