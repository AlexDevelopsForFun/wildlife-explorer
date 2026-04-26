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
      'brooks-falls': {
        rarity: 'guaranteed',
        frequency: 0.99,
        seasonFrequencies: { spring: 30, summer: 99, fall: 75, winter: 5 },
        rationale: 'Brooks Falls bear-viewing platform in July = effectively guaranteed (multiple bears visible at once during salmon run).',
      },
      'brooks-camp': {
        rarity: 'guaranteed',
        frequency: 0.95,
        rationale: 'Bears commonly visible from beach / lake shore around Brooks Camp during salmon season.',
      },
    },
  },

  // ── Kenai Fjords ────────────────────────────────────────────────────
  kenaifjords: {
    'Sea Otter': {
      'boat-tour': { rarity: 'guaranteed', frequency: 0.97, rationale: 'Sea otters reliably observed on every boat tour from Seward.' },
    },
    'Humpback Whale': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.85,
        seasonFrequencies: { spring: 60, summer: 90, fall: 70, winter: 10 },
        rationale: 'Full-day Kenai Fjords boat tours report humpback sightings on ~80-90% of summer trips.',
      },
    },
    'Orca': {
      'boat-tour': { rarity: 'unlikely', frequency: 0.25, rationale: 'Orca pods seen on ~25% of summer boat tours.' },
    },
    'Steller Sea Lion': {
      'boat-tour': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Steller sea lions reliably visible at Chiswell Islands rookery.' },
    },
    'Tufted Puffin': {
      'boat-tour': { rarity: 'very_likely', frequency: 0.80, rationale: 'Puffins at Chiswell Islands rookery — visible from boats summer.' },
    },
    'Horned Puffin': {
      'boat-tour': { rarity: 'very_likely', frequency: 0.75, rationale: 'Horned puffins at Chiswell Islands rookery alongside tufted.' },
    },
  },

  // ── Glacier Bay ─────────────────────────────────────────────────────
  glacierbay: {
    'Humpback Whale': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 50, summer: 85, fall: 60, winter: 10 },
        rationale: 'Glacier Bay NPS day-cruise reports humpback sightings on ~80% of summer trips (feeding aggregations).',
      },
    },
    'Harbor Seal': {
      'boat-tour':     { rarity: 'guaranteed', frequency: 0.95, rationale: 'Harbor seals on icebergs at Margerie / Johns Hopkins glaciers — reliable boat sightings.' },
      'bartlett-cove': { rarity: 'very_likely', frequency: 0.70, rationale: 'Frequent in Bartlett Cove waters near visitor center.' },
    },
    'Sea Otter': {
      'boat-tour': { rarity: 'very_likely', frequency: 0.85, rationale: 'Sea otters in lower bay observed on most cruises.' },
    },
    'Orca': {
      'boat-tour': { rarity: 'unlikely', frequency: 0.20, rationale: 'Orcas occasionally encountered on Glacier Bay cruises.' },
    },
  },

  // ── Denali ──────────────────────────────────────────────────────────
  denali: {
    'Caribou': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 60, summer: 80, fall: 70, winter: 30 },
        rationale: 'Denali Park Road bus-tour caribou sighting rate is ~70-80% June-Aug (NPS published stats).',
      },
    },
    'Dall Sheep': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.85,
        rationale: 'Dall sheep on Polychrome Pass cliffs visible from park-road bus tours on ~85% of summer trips.',
      },
    },
    'Brown Bear': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 60, summer: 85, fall: 70, winter: 5 },
        rationale: 'Grizzlies sighted on ~75-85% of full Park Road bus tours during summer.',
      },
    },
    'Moose': {
      'entrance':  { rarity: 'likely',   frequency: 0.50, rationale: 'Savage River + entrance area moose more reliable than park-road interior.' },
      'park-road': { rarity: 'likely',   frequency: 0.40, rationale: 'Bus-tour moose sightings on ~30-40% of summer trips.' },
    },
    'Gray Wolf': {
      'park-road': { rarity: 'unlikely', frequency: 0.20, rationale: 'Wolf-harvest impact reduced bus-tour sightings; still ~15-25% on full Park Road tours.' },
    },
  },

  // ── Everglades ──────────────────────────────────────────────────────
  everglades: {
    'American Alligator': {
      'anhinga-trail': {
        rarity: 'guaranteed',
        frequency: 0.99,
        rationale: 'Alligators visible from the Anhinga Trail boardwalk on essentially every visit, all seasons.',
      },
      'shark-valley': {
        rarity: 'guaranteed',
        frequency: 0.95,
        rationale: 'Shark Valley loop puts visitors face-to-face with alligators along the entire trail.',
      },
    },
    'Anhinga': {
      'anhinga-trail': {
        rarity: 'guaranteed',
        frequency: 0.98,
        rationale: 'Trail is named for them — reliably perched in the open along the boardwalk.',
      },
    },
    'West Indian Manatee': {
      'flamingo': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 25, summer: 15, fall: 25, winter: 60 },
        rationale: 'Winter manatee aggregations at Flamingo / Florida Bay warm-water refugia — sighting rate jumps to ~60% in winter.',
      },
    },
    'Roseate Spoonbill': {
      'flamingo':    { rarity: 'very_likely', frequency: 0.65, rationale: 'Spoonbills feed in Florida Bay shallows; reliably visible from Flamingo area boats.' },
    },
    'American Crocodile': {
      'flamingo':    { rarity: 'likely', frequency: 0.45, rationale: 'American crocodiles at the Flamingo marina — the most reliable place to see them.' },
    },
  },

  // ── Acadia ──────────────────────────────────────────────────────────
  acadia: {
    'Harbor Seal': {
      'park-loop':   { rarity: 'likely',     frequency: 0.40, rationale: 'Sand Beach / Schoodic shorelines — seals haul out on rocks visible from Park Loop pull-offs.' },
      'schoodic':    { rarity: 'very_likely', frequency: 0.65, rationale: 'Schoodic Peninsula has the most reliable seal-watching at Acadia.' },
    },
    'White-tailed Deer': {
      'jordan-pond': { rarity: 'guaranteed', frequency: 0.92, rationale: 'Jordan Pond / Bubble Pond meadows have the highest-visibility deer at Acadia.' },
    },
    'American Herring Gull': {
      'park-loop':   { rarity: 'guaranteed', frequency: 0.99, rationale: 'Gulls at every coastal overlook — Sand Beach, Thunder Hole, Otter Cliffs.' },
    },
    'Common Loon': {
      'jordan-pond': { rarity: 'very_likely', frequency: 0.70, rationale: 'Loons reliably calling from Jordan Pond and Eagle Lake in summer.' },
    },
    'Bald Eagle': {
      'schoodic':    { rarity: 'likely',     frequency: 0.40, rationale: 'Schoodic Peninsula is the most reliable eagle-watching at Acadia.' },
    },
  },

  // ── Saguaro ─────────────────────────────────────────────────────────
  saguaro: {
    "Gambel's Quail": {
      'west-tucson': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Tucson Mountain District wash trails — quail coveys at every visit.' },
    },
    'Cactus Wren': {
      'west-tucson': { rarity: 'very_likely', frequency: 0.85, rationale: 'Cactus wrens nesting in cholla and saguaro along West District trails.' },
    },
    'Javelina': {
      'east-rincon': { rarity: 'likely',     frequency: 0.45, rationale: 'Rincon Mountain District foothills + Cactus Forest Loop — javelina herds visible at dawn/dusk.' },
      'west-tucson': { rarity: 'likely',     frequency: 0.40, rationale: 'West District wash trails see regular javelina activity.' },
    },
    'Desert Spiny Lizard': {
      'east-rincon': { rarity: 'very_likely', frequency: 0.70, rationale: 'Rincon foothills — lizards basking on exposed rocks throughout the day.' },
    },
  },

  // ── Channel Islands ─────────────────────────────────────────────────
  channelislands: {
    'Common Dolphin': {
      'boat-tour':   { rarity: 'very_likely', frequency: 0.85, rationale: 'Channel crossing puts dolphin pods alongside the boat on most trips.' },
    },
    'Blue Whale': {
      'boat-tour':   { rarity: 'unlikely',    frequency: 0.20, seasonFrequencies: { spring: 10, summer: 35, fall: 25, winter: 5 }, rationale: 'Summer-only — feeding aggregations off Santa Cruz Island.' },
    },
    'Humpback Whale': {
      'boat-tour':   { rarity: 'likely',      frequency: 0.40, seasonFrequencies: { spring: 30, summer: 50, fall: 45, winter: 10 }, rationale: 'Summer feeding migration — sightings on ~40% of crossings.' },
    },
    'California Sea Lion': {
      'boat-tour':   { rarity: 'guaranteed',  frequency: 0.97, rationale: 'Sea lion rookeries at Anacapa and Santa Barbara — visible from every boat trip.' },
      'anacapa':     { rarity: 'guaranteed',  frequency: 0.99, rationale: 'Anacapa rookery — hundreds visible from the cliffs.' },
    },
    'Brown Pelican': {
      'anacapa':     { rarity: 'guaranteed',  frequency: 0.98, rationale: 'Anacapa is the only major Brown Pelican breeding colony in the western US — guaranteed nesting season.' },
    },
    'Island Fox': {
      'santa-cruz':  { rarity: 'very_likely', frequency: 0.70, rationale: 'Endemic Santa Cruz Island fox — habituated, often seen at Scorpion campground.' },
    },
  },

  // ── Voyageurs ───────────────────────────────────────────────────────
  voyageurs: {
    'Common Loon': {
      'lake':        { rarity: 'guaranteed',  frequency: 0.98, rationale: 'Loons on every visit — Voyageurs has one of the densest loon populations in the lower 48.' },
    },
    'Bald Eagle': {
      'lake':        { rarity: 'very_likely', frequency: 0.85, rationale: 'Eagles regularly visible from boat trips and visitor center waterfront.' },
    },
    'Moose': {
      'kabetogama-pen': { rarity: 'likely',   frequency: 0.35, seasonFrequencies: { spring: 35, summer: 30, fall: 40, winter: 25 }, rationale: 'Kabetogama Peninsula trails are the most reliable moose habitat.' },
    },
    'River Otter': {
      'lake':        { rarity: 'unlikely',    frequency: 0.20, rationale: 'Otters along rocky shorelines — reliable for boaters who scan ledges.' },
    },
  },

  // ── Bryce Canyon ────────────────────────────────────────────────────
  brycecanyon: {
    'Utah Prairie Dog': {
      'fairyland':   { rarity: 'guaranteed',  frequency: 0.95, rationale: 'Fairyland / Sunrise Point meadows host the largest Utah Prairie Dog colony in the park.' },
    },
    "Common Golden-mantled Ground Squirrel": {
      'rim-trail':   { rarity: 'guaranteed',  frequency: 0.98, rationale: 'Beg at every overlook along the Rim Trail.' },
    },
    'Mule Deer': {
      'rim-trail':   { rarity: 'very_likely', frequency: 0.75, rationale: 'Browse meadows along the Rim Trail at dawn/dusk.' },
    },
  },

  // ── Arches ──────────────────────────────────────────────────────────
  arches: {
    'Common Raven': {
      'devils-garden': { rarity: 'guaranteed', frequency: 0.99, rationale: 'Ravens at every arch overlook — guaranteed at Devils Garden trailhead.' },
      'windows':       { rarity: 'guaranteed', frequency: 0.99, rationale: 'Constant raven activity around Windows / Balanced Rock.' },
    },
    'Desert Cottontail': {
      'devils-garden': { rarity: 'likely',    frequency: 0.45, rationale: 'Cottontails at trailheads at dawn/dusk.' },
    },
  },

  // ── Great Basin ─────────────────────────────────────────────────────
  greatbasin: {
    "Steller's Jay": {
      'lehman-caves':  { rarity: 'guaranteed', frequency: 0.95, rationale: "Steller's Jays at every campsite and picnic table around Lehman Caves." },
    },
    'Mule Deer': {
      'wheeler-peak':  { rarity: 'very_likely', frequency: 0.75, rationale: 'Sub-alpine deer at Wheeler Peak campground and Bristlecone Pine trail.' },
    },
  },

  // ── Big Bend (additional zones) ─────────────────────────────────────
  bigbend: {
    'Greater Roadrunner': {
      'rio-grande':   { rarity: 'guaranteed', frequency: 0.92, rationale: 'Roadrunners reliably along Rio Grande Village trails and roads.' },
    },
    'Mexican Jay': {
      'chisos':       { rarity: 'guaranteed', frequency: 0.95, rationale: 'Mexican Jay flocks at every Chisos Basin trailhead and campsite.' },
    },
    'Western Diamond-backed Rattlesnake': {
      'desert':       { rarity: 'unlikely',   frequency: 0.20, seasonFrequencies: { spring: 25, summer: 30, fall: 20, winter: 5 }, rationale: 'Desert flats — snakes most active spring/summer at dawn/dusk.' },
    },
  },

  // ── Dry Tortugas ────────────────────────────────────────────────────
  drytortugas: {
    'Sooty Tern': {
      'fort-jefferson': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 30, winter: 5 }, rationale: 'Bush Key colony — hundreds of thousands of nesting Sooty Terns visible from Fort Jefferson April-Aug.' },
    },
    'Brown Noddy': {
      'fort-jefferson': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 99, summer: 99, fall: 25, winter: 5 }, rationale: 'Brown Noddy nesting alongside Sooty Terns on Bush Key.' },
    },
    'Magnificent Frigatebird': {
      'fort-jefferson': { rarity: 'very_likely', frequency: 0.85, rationale: 'Frigatebirds soaring over the fort year-round.' },
    },
  },

  // ── Zion ────────────────────────────────────────────────────────────
  zion: {
    'Desert Bighorn Sheep': {
      'east-zion': {
        rarity: 'likely',
        frequency: 0.50,
        rationale: 'Desert bighorn reliably visible on cliffs along the Mt Carmel Highway / East Zion area.',
      },
      'main-canyon': {
        rarity: 'unlikely',
        frequency: 0.20,
        rationale: 'Bighorn occasionally visible from canyon trails but less concentrated than East Zion.',
      },
    },
    'Mule Deer': {
      'main-canyon': {
        rarity: 'guaranteed',
        frequency: 0.92,
        rationale: 'Mule deer browse the canyon meadows along Riverside Walk and visitor center on essentially every visit.',
      },
    },
    'Rock Squirrel': {
      'main-canyon': {
        rarity: 'guaranteed',
        frequency: 0.95,
        rationale: 'Habituated rock squirrels at every canyon overlook and trail.',
      },
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
