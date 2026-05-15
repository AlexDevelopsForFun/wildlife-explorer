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
        peakWindow: { startMonthDay: '09-20', endMonthDay: '10-20', label: 'Peak rut: late Sept – mid Oct' },
        rationale: 'Cataloochee re-introduced herd (~200 animals). Fall rut (Sept-Oct) at dawn/dusk = near-100% sighting. Off-rut still very likely in valley meadows.',
      },
      'newfound-gap': {
        rarity: 'rare',
        frequency: 0.05,
        seasonFrequencies: { spring: 4, summer: 4, fall: 8, winter: 4 },
        rationale: 'Park-wide elk are concentrated at Cataloochee; main road corridor sightings are uncommon. Slight fall rut bump.',
      },
    },
    'Black Bear': {
      'cades-cove': {
        rarity: 'likely',
        frequency: 0.45,
        seasonFrequencies: { spring: 40, summer: 50, fall: 55, winter: 5 },
        rationale: 'Cades Cove Loop drive has the highest concentration of habituated bears; deep winter sightings rare (denning).',
      },
      'newfound-gap': {
        rarity: 'unlikely',
        frequency: 0.20,
        seasonFrequencies: { spring: 22, summer: 28, fall: 30, winter: 3 },
        rationale: 'Black bears regularly cross the road at higher elevations along Newfound Gap Road in summer/fall.',
      },
    },
    'Wild Turkey': {
      'cades-cove': {
        rarity: 'guaranteed',
        frequency: 0.92,
        seasonFrequencies: { spring: 90, summer: 88, fall: 95, winter: 90 },
        rationale: 'Wild Turkey flocks visible in Cades Cove fields year-round; fall flock-aggregation peaks visibility.',
      },
    },
    'Synchronous Firefly': {
      'cataloochee': {
        rarity: 'likely',
        frequency: 0.50,
        seasonFrequencies: { spring: 1, summer: 90, fall: 1, winter: 1 },
        peakWindow: { startMonthDay: '05-25', endMonthDay: '06-15', label: 'Peak: late May – mid June' },
        rationale: 'Synchronous fireflies (Photinus carolinus) display in late May-early June around Elkmont and Cataloochee — lottery permits required during peak.',
      },
    },
    'White-tailed Deer': {
      'cades-cove': {
        rarity: 'guaranteed',
        frequency: 0.97,
        seasonFrequencies: { spring: 95, summer: 93, fall: 99, winter: 92 },
        peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' },
        rationale: 'Cades Cove meadows host the densest deer population in the park; rut peaks Oct-Nov when bucks chase does in the open fields.',
      },
    },
  },

  // ── Yellowstone (expanded coverage 2026-04-25) ──────────────────────
  yellowstone: {
    'Pronghorn': {
      'lamar-valley': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 60, summer: 80, fall: 75, winter: 10 }, peakWindow: { startMonthDay: '05-15', endMonthDay: '06-30', label: 'Peak fawning: mid-May – June' }, rationale: 'Pronghorn herds visible across Lamar Valley grasslands; fawns hidden mid-May through June. Most herd migrates south in winter.' },
      'mammoth':      { rarity: 'likely',      frequency: 0.50, seasonFrequencies: { spring: 45, summer: 60, fall: 55, winter: 5 }, peakWindow: { startMonthDay: '05-15', endMonthDay: '06-30', label: 'Peak fawning: mid-May – June' }, rationale: 'Pronghorn in the Gardiner / Mammoth corridor; minimal in winter (most migrate south).' },
    },
    'Bighorn Sheep': {
      'lamar-valley':  { rarity: 'likely',     frequency: 0.40, seasonFrequencies: { spring: 35, summer: 30, fall: 45, winter: 60 }, peakWindow: { startMonthDay: '11-15', endMonthDay: '12-31', label: 'Peak rut: mid-Nov – Dec' }, rationale: 'Bighorn rams visible on Specimen Ridge near Lamar Valley; rut Nov-Dec brings them to lower elevations and increases ram-clash visibility.' },
      'mammoth':       { rarity: 'unlikely',   frequency: 0.25, seasonFrequencies: { spring: 25, summer: 20, fall: 30, winter: 35 }, rationale: 'Bighorn occasionally on cliffs north of Mammoth; lower elevations in winter make sightings more likely.' },
    },
    'Trumpeter Swan': {
      'hayden-valley': {
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 75, summer: 70, fall: 65, winter: 40 },
        rationale: 'Trumpeter Swans on Yellowstone River through Hayden Valley year-round; winter sightings drop as river ices over.',
      },
    },
    'Sandhill Crane': {
      'hayden-valley': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 85, fall: 60, winter: 5 }, peakWindow: { startMonthDay: '05-15', endMonthDay: '08-15', label: 'Peak nesting: mid-May – mid-Aug' }, rationale: 'Sandhill Cranes nest in Hayden Valley meadows summer.' },
    },
    'American Black Bear': {
      'mammoth':       {
        rarity: 'unlikely',
        frequency: 0.25,
        seasonFrequencies: { spring: 30, summer: 30, fall: 25, winter: 2 },
        rationale: 'Black bears in Mammoth area; near-zero in winter (denning).',
      },
    },
    'Moose': {
      'lamar-valley':  {
        rarity: 'unlikely',
        frequency: 0.15,
        seasonFrequencies: { spring: 18, summer: 18, fall: 15, winter: 8 },
        rationale: 'Moose occasional in willow thickets along Lamar River; less visible in deep winter snow.',
      },
      'yellowstone-lake': { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 25, summer: 30, fall: 20, winter: 5 }, rationale: 'Moose at south arm of Yellowstone Lake riparian areas; minimal in winter (deep snow).' },
    },
    'Red Fox': {
      'mammoth':       { rarity: 'unlikely',   frequency: 0.20, seasonFrequencies: { spring: 25, summer: 20, fall: 20, winter: 25 }, rationale: 'Foxes around Mammoth Hot Springs and Lamar Valley pull-offs; year-round sightings (winter pelage gives slight visibility boost).' },
    },
    // ── Existing Yellowstone overrides (preserved from earlier rounds) ────
    'Gray Wolf': {
      'lamar-valley': {
        rarity: 'likely',
        frequency: 0.32,
        seasonFrequencies: { spring: 30, summer: 25, fall: 35, winter: 50 },
        peakWindow: { startMonthDay: '12-15', endMonthDay: '03-15', label: 'Peak winter dawn-watch: Dec – mid-Mar' },
        rationale: 'Lamar Valley with dawn spotting-scope effort — the only place in the lower 48 with predictable wolf viewing.',
      },
      'hayden-valley': {
        rarity: 'unlikely',
        frequency: 0.18,
        seasonFrequencies: { spring: 18, summer: 15, fall: 22, winter: 30 },
        rationale: 'Wolves visit Hayden Valley but less consistently than Lamar; winter visibility boost (snow contrast + leafless shrubs).',
      },
    },
    'Grizzly Bear': {
      'hayden-valley': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 50, summer: 45, fall: 35, winter: 5 },
        peakWindow: { startMonthDay: '05-15', endMonthDay: '06-30', label: 'Peak carcass season: mid-May – June' },
        rationale: 'Hayden Valley spring/summer carcass season — bears actively visible from road.',
      },
      'lamar-valley': {
        rarity: 'likely',
        frequency: 0.35,
        seasonFrequencies: { spring: 45, summer: 40, fall: 30, winter: 3 },
        rationale: 'Lamar Valley grizzlies visible from road; near-zero in deep winter (denning).',
      },
    },
    'American Bison': {
      'lamar-valley':  { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 99, winter: 92 }, peakWindow: { startMonthDay: '04-15', endMonthDay: '05-31', label: 'Peak calving (red dogs): mid-April – May' }, rationale: 'Lamar Valley is the densest bison habitat in the park; spring calves ("red dogs") are an iconic April-May sight.' },
      'hayden-valley': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 95, summer: 99, fall: 95, winter: 90 }, peakWindow: { startMonthDay: '07-15', endMonthDay: '08-15', label: 'Peak rut: mid-July – mid-Aug' }, rationale: 'Hayden Valley bison herds visible from road year-round.' },
      'old-faithful':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 65, summer: 80, fall: 70, winter: 60 }, rationale: 'Bison wander Geyser Basin boardwalks — frequent but not guaranteed.' },
    },
    'American Elk': {
      'mammoth':       { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 90, summer: 92, fall: 99, winter: 95 }, peakWindow: { startMonthDay: '09-15', endMonthDay: '10-31', label: 'Peak rut + bugling: mid-Sept – Oct' }, rationale: 'Mammoth Hot Springs resident elk herd grazes the lawns and terraces year-round; bull bugling Sept-Oct is iconic.' },
      'lamar-valley':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 70, summer: 75, fall: 90, winter: 60 }, rationale: 'Elk visible in valley meadows alongside bison; rut + winter herd-aggregation peaks.' },
    },
    'Coyote': {
      'lamar-valley':  { rarity: 'likely', frequency: 0.55, seasonFrequencies: { spring: 50, summer: 50, fall: 55, winter: 70 }, peakWindow: { startMonthDay: '12-01', endMonthDay: '02-28', label: 'Peak winter coat + visibility: Dec – Feb' }, rationale: 'Highly visible in open valley terrain — often seen following wolf kills; winter pelage + snow contrast makes them maximally visible.' },
      'hayden-valley': { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 45, summer: 50, fall: 50, winter: 60 }, rationale: 'Open valley sightings common; winter visibility boost like Lamar.' },
    },
  },

  // ── Glacier (expanded) ──────────────────────────────────────────────
  glacier: {
    'Hoary Marmot': {
      'going-to-sun':   {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 30, summer: 90, fall: 65, winter: 2 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Hoary marmots at Logan Pass and Hidden Lake area, peak July-August; hibernate Sept-May.',
      },
      'many-glacier':   {
        rarity: 'likely',
        frequency: 0.45,
        seasonFrequencies: { spring: 15, summer: 60, fall: 40, winter: 2 },
        rationale: 'Marmots in talus around Many Glacier valley; hibernate winter.',
      },
    },
    'American Pika': {
      'going-to-sun':   { rarity: 'likely',      frequency: 0.50, seasonFrequencies: { spring: 25, summer: 65, fall: 55, winter: 5 }, peakWindow: { startMonthDay: '07-01', endMonthDay: '09-15', label: 'Peak hay-cutting: July – mid-Sept' }, rationale: 'Pikas calling from talus along Logan Pass area trails in summer.' },
    },
    'Moose': {
      'many-glacier':   { rarity: 'likely',      frequency: 0.45, seasonFrequencies: { spring: 50, summer: 55, fall: 45, winter: 30 }, peakWindow: { startMonthDay: '09-15', endMonthDay: '10-31', label: 'Peak rut + bugling: mid-Sept – Oct' }, rationale: 'Moose at Fishercap Lake / Swiftcurrent willow thickets; rut Sept-Oct concentrates bulls.' },
      'two-medicine':   { rarity: 'likely',      frequency: 0.40, seasonFrequencies: { spring: 45, summer: 50, fall: 40, winter: 20 }, rationale: 'Moose along the lake shore willows; less seen winter (Two Medicine area mostly closed).' },
    },
    'Mountain Goat': {
      'going-to-sun': {
        rarity: 'very_likely',
        frequency: 0.65,
        seasonFrequencies: { spring: 40, summer: 70, fall: 60, winter: 20 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Logan Pass area + Hidden Lake Trail — goats reliably visible on cliffs above the road in summer.',
      },
      'many-glacier': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 30, summer: 55, fall: 40, winter: 10 },
        rationale: 'Goat-watching from Many Glacier hotel and trails; access limited in winter.',
      },
    },
    'Bighorn Sheep': {
      'many-glacier':   { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 35, summer: 45, fall: 50, winter: 55 }, peakWindow: { startMonthDay: '11-15', endMonthDay: '12-31', label: 'Peak rut: mid-Nov – Dec' }, rationale: 'Many Glacier slopes are reliable summer bighorn habitat; rut concentrates rams at lower elevations in late fall/winter.' },
      'going-to-sun':   { rarity: 'likely', frequency: 0.35, seasonFrequencies: { spring: 25, summer: 50, fall: 35, winter: 5 }, rationale: 'Logan Pass area sightings common in summer; Going-to-Sun Road closed Oct-Jun.' },
    },
    'Grizzly Bear': {
      'many-glacier':   {
        rarity: 'unlikely',
        frequency: 0.25,
        seasonFrequencies: { spring: 30, summer: 30, fall: 25, winter: 1 },
        peakWindow: { startMonthDay: '08-15', endMonthDay: '10-15', label: 'Peak berry season: mid-Aug – mid-Oct' },
        rationale: 'Many Glacier valley grizzly density is the highest in the park; bears at low elevation berry patches in late summer / early fall; near-zero in winter (denning).',
      },
    },
  },

  // ── Olympic (expanded) ──────────────────────────────────────────────
  olympic: {
    'American Crow': {
      'kalaloch':        { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 95, winter: 90 }, rationale: 'Crows at every coastal beach year-round (cache uses American Crow; the Northwestern Crow population was lumped into American Crow taxonomically in 2020).' },
    },
    'Bald Eagle': {
      'kalaloch':        { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 65, fall: 80, winter: 80 }, rationale: 'Bald eagles fishing the surf zone year-round; fall salmon-run + winter aggregations boost.' },
      'lake-crescent':   { rarity: 'likely',      frequency: 0.55, seasonFrequencies: { spring: 55, summer: 50, fall: 65, winter: 50 }, rationale: 'Bald eagles fishing Lake Crescent and Sol Duc; year-round.' },
    },
    'River Otter': {
      'lake-crescent':   { rarity: 'unlikely',    frequency: 0.20, seasonFrequencies: { spring: 22, summer: 25, fall: 20, winter: 12 }, rationale: 'River otters in Lake Crescent and Sol Duc River; mostly crepuscular, year-round residents.' },
    },
    'Black Bear': {
      'hoh-rainforest':  {
        rarity: 'unlikely',
        frequency: 0.15,
        seasonFrequencies: { spring: 18, summer: 22, fall: 18, winter: 3 },
        rationale: 'Black bears occasionally on Hoh trails — most active at dawn/dusk; lower in winter (mild Pacific Northwest hibernation).',
      },
    },
    'Olympic Marmot': {
      'hurricane-ridge': {
        rarity: 'guaranteed',
        frequency: 0.93,
        seasonFrequencies: { spring: 50, summer: 95, fall: 80, winter: 5 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Hurricane Ridge meadows in July-August — marmots sun themselves on rocks visible from the visitor center.',
      },
    },
    'Roosevelt Elk': {
      'hoh-rainforest':  { rarity: 'very_likely', frequency: 0.70, peakWindow: { startMonthDay: '09-15', endMonthDay: '10-31', label: 'Peak rut + bugling: mid-Sept – Oct' }, rationale: 'Hoh herd visible along trails and river corridor year-round; rut peaks Sept-Oct with audible bugling.' },
      'kalaloch':        { rarity: 'likely',      frequency: 0.40, rationale: 'Beach-strip elk crossings reported regularly.' },
    },
    'Mule Deer': {
      'hurricane-ridge': { rarity: 'guaranteed', frequency: 0.95, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' }, rationale: 'Habituated deer at Hurricane Ridge meadows and parking area; rut Oct-Nov increases activity.' },
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
      'bear-lake': { rarity: 'unlikely', frequency: 0.15, seasonFrequencies: { spring: 15, summer: 20, fall: 18, winter: 5 }, rationale: 'East-side moose are rare; mostly seen in Sprague Lake / Glacier Basin meadows; minimal in deep-snow winter.' },
    },
    'American Pika': {
      'trail-ridge': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 30, summer: 90, fall: 75, winter: 5 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '09-15', label: 'Peak hay-cutting: July – mid-Sept' },
        rationale: 'Alpine talus along Trail Ridge Road — pikas reliably calling from rocks within a few meters of pullouts in summer; "hay-cutting" months Jul-Sep when they cure vegetation for winter.',
      },
    },
    'American Elk': {
      'bear-lake':  {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 80, summer: 80, fall: 99, winter: 90 },
        peakWindow: { startMonthDay: '09-15', endMonthDay: '10-15', label: 'Peak rut: mid-Sept – mid-Oct' },
        rationale: 'Estes Park / Moraine Park / Horseshoe Park elk herds are the iconic RMNP wildlife experience, especially in fall rut.',
      },
      'trail-ridge':{
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 30, summer: 80, fall: 60, winter: 5 },
        rationale: 'Tundra elk visible from pullouts along Trail Ridge Road in summer; road closed Oct-May.',
      },
    },
    'Bighorn Sheep': {
      'bear-lake':  {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 65, summer: 30, fall: 25, winter: 20 },
        peakWindow: { startMonthDay: '05-01', endMonthDay: '06-30', label: 'Peak mineral-lick visits: May – June' },
        rationale: 'Sheep Lakes mineral lick (Horseshoe Park) draws bighorns May-June; very reliable in window.',
      },
    },
    'Yellow-bellied Marmot': {
      'trail-ridge': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 40, summer: 90, fall: 60, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Yellow-bellied Marmots sun on rocks along Trail Ridge Road in summer; hibernate Sept-May.',
      },
    },
    'Coyote': {
      'bear-lake':  { rarity: 'likely', frequency: 0.40, seasonFrequencies: { spring: 40, summer: 38, fall: 42, winter: 50 }, rationale: 'Coyotes routinely visible in open meadows around Estes Park / Moraine Park; winter snow-contrast + elk-carcass scavenging boost.' },
    },
  },

  // ── Katmai ──────────────────────────────────────────────────────────
  katmai: {
    'Brown Bear': {
      'brooks-falls': {
        rarity: 'guaranteed',
        frequency: 0.99,
        seasonFrequencies: { spring: 30, summer: 99, fall: 75, winter: 5 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-05', label: 'Peak salmon run: July – early Aug' },
        rationale: 'Brooks Falls bear-viewing platform in July = effectively guaranteed (multiple bears visible at once during salmon run).',
      },
      'brooks-camp': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 30, summer: 95, fall: 70, winter: 1 },
        rationale: 'Bears commonly visible from beach / lake shore around Brooks Camp during salmon season; closed/dormant winter.',
      },
    },
  },

  // ── Kenai Fjords ────────────────────────────────────────────────────
  kenaifjords: {
    'Sea Otter': {
      'boat-tour': {
        rarity: 'guaranteed',
        frequency: 0.97,
        seasonFrequencies: { spring: 92, summer: 97, fall: 92, winter: 60 },
        rationale: 'Sea otters reliably observed on every boat tour from Seward; winter trips less frequent (weather).',
      },
    },
    'Humpback Whale': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.85,
        seasonFrequencies: { spring: 60, summer: 90, fall: 70, winter: 5 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak feeding: July – August' },
        rationale: 'Full-day Kenai Fjords boat tours report humpback sightings on ~80-90% of summer trips; humpbacks migrate to Hawaii in winter.',
      },
    },
    'Orca': {
      'boat-tour': {
        rarity: 'unlikely',
        frequency: 0.25,
        seasonFrequencies: { spring: 25, summer: 30, fall: 20, winter: 10 },
        peakWindow: { startMonthDay: '06-15', endMonthDay: '08-15', label: 'Peak: mid-June – mid-Aug' },
        rationale: 'Orca pods seen on ~25-30% of summer boat tours.',
      },
    },
    'Steller Sea Lion': {
      'boat-tour': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Steller sea lions reliably visible at Chiswell Islands rookery.' },
    },
    'Tufted Puffin': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 50, summer: 90, fall: 60, winter: 5 },
        peakWindow: { startMonthDay: '05-15', endMonthDay: '08-15', label: 'Peak breeding: mid-May – mid-Aug' },
        rationale: 'Puffins at Chiswell Islands rookery — peak breeding May-Aug; depart for open ocean in winter.',
      },
    },
    'Horned Puffin': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 45, summer: 85, fall: 55, winter: 5 },
        peakWindow: { startMonthDay: '05-15', endMonthDay: '08-15', label: 'Peak breeding: mid-May – mid-Aug' },
        rationale: 'Horned puffins at Chiswell Islands rookery alongside tufted; same seasonal pattern.',
      },
    },
  },

  // ── Glacier Bay ─────────────────────────────────────────────────────
  glacierbay: {
    'Humpback Whale': {
      'boat-tour': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 50, summer: 85, fall: 60, winter: 10 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak feeding: July – August' },
        rationale: 'Glacier Bay NPS day-cruise reports humpback sightings on ~80% of summer trips (feeding aggregations).',
      },
    },
    'Harbor Seal': {
      'boat-tour': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 80, summer: 97, fall: 90, winter: 50 },
        rationale: 'Harbor seals on icebergs at Margerie / Johns Hopkins glaciers — peak summer pupping season; some access closed in winter.',
      },
      'bartlett-cove': { rarity: 'very_likely', frequency: 0.70, rationale: 'Frequent in Bartlett Cove waters near visitor center.' },
    },
    'Sea Otter': {
      'boat-tour': { rarity: 'very_likely', frequency: 0.85, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak pupping: April – July' }, rationale: 'Sea otters in lower bay observed on most cruises year-round; pups visible spring-summer.' },
    },
    'Orca': {
      'boat-tour': {
        rarity: 'unlikely',
        frequency: 0.20,
        seasonFrequencies: { spring: 18, summer: 25, fall: 22, winter: 8 },
        rationale: 'Orcas occasionally encountered on Glacier Bay cruises; better summer odds.',
      },
    },
  },

  // ── Denali ──────────────────────────────────────────────────────────
  denali: {
    'Caribou': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 60, summer: 80, fall: 70, winter: 5 },
        peakWindow: { startMonthDay: '06-15', endMonthDay: '08-31', label: 'Peak bus-tour season: mid-June – August' },
        rationale: 'Denali Park Road bus-tour caribou sighting rate is ~70-80% June-Aug (NPS published stats); park road closed Sept-May.',
      },
    },
    'Dall Sheep': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.85,
        seasonFrequencies: { spring: 70, summer: 90, fall: 75, winter: 5 },
        rationale: 'Dall sheep on Polychrome Pass cliffs visible from park-road bus tours on ~85% of summer trips; park road closed in winter.',
      },
    },
    'Brown Bear': {
      'park-road': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 60, summer: 85, fall: 70, winter: 1 },
        rationale: 'Grizzlies sighted on ~75-85% of full Park Road bus tours during summer; near-zero winter (denning + road closed).',
      },
    },
    'Moose': {
      'entrance':  {
        rarity: 'likely',
        frequency: 0.50,
        seasonFrequencies: { spring: 50, summer: 55, fall: 50, winter: 35 },
        rationale: 'Savage River + entrance area moose more reliable than park-road interior; year-round access at entrance.',
      },
      'park-road': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 35, summer: 50, fall: 40, winter: 5 },
        rationale: 'Bus-tour moose sightings on ~30-50% of summer trips; road closed in winter.',
      },
    },
    'Gray Wolf': {
      'park-road': {
        rarity: 'unlikely',
        frequency: 0.20,
        seasonFrequencies: { spring: 18, summer: 22, fall: 18, winter: 1 },
        rationale: 'Wolf-harvest impact reduced bus-tour sightings; still ~15-25% on full Park Road tours; road closed in winter.',
      },
    },
  },

  // ── Everglades ──────────────────────────────────────────────────────
  everglades: {
    'American Alligator': {
      'anhinga-trail': {
        rarity: 'guaranteed',
        frequency: 0.99,
        seasonFrequencies: { spring: 99, summer: 95, fall: 97, winter: 99 },
        rationale: 'Alligators visible from the Anhinga Trail boardwalk on essentially every visit; dry-season (winter) concentrates them at remaining gator holes — peak visibility.',
      },
      'shark-valley': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 95, summer: 88, fall: 92, winter: 99 },
        rationale: 'Shark Valley loop puts visitors face-to-face with alligators; winter dry-season concentration along the canal is the best window.',
      },
    },
    'Anhinga': {
      'anhinga-trail': {
        rarity: 'guaranteed',
        frequency: 0.98,
        seasonFrequencies: { spring: 98, summer: 90, fall: 95, winter: 99 },
        rationale: 'Trail is named for them — reliably perched in the open along the boardwalk; winter dry-season peak concentration.',
      },
    },
    'West Indian Manatee': {
      'flamingo': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 25, summer: 15, fall: 25, winter: 60 },
        peakWindow: { startMonthDay: '12-15', endMonthDay: '03-15', label: 'Peak winter aggregation: Dec – mid-Mar' },
        rationale: 'Winter manatee aggregations at Flamingo / Florida Bay warm-water refugia — sighting rate jumps to ~60% in winter.',
      },
    },
    'Roseate Spoonbill': {
      'flamingo':    { rarity: 'very_likely', frequency: 0.65, seasonFrequencies: { spring: 65, summer: 45, fall: 60, winter: 80 }, rationale: 'Spoonbills feed in Florida Bay shallows; reliably visible from Flamingo area boats; winter dry-season concentration peak (many disperse north to breed in summer).' },
    },
    'American Crocodile': {
      'flamingo':    { rarity: 'likely', frequency: 0.45, peakWindow: { startMonthDay: '12-01', endMonthDay: '04-30', label: 'Peak basking season: Dec – April' }, rationale: 'American crocodiles at the Flamingo marina — the most reliable place to see them; cool months bring more basking on banks.' },
    },
  },

  // ── Acadia ──────────────────────────────────────────────────────────
  acadia: {
    'Harbor Seal': {
      'park-loop':   { rarity: 'likely',     frequency: 0.40, seasonFrequencies: { spring: 35, summer: 55, fall: 40, winter: 25 }, rationale: 'Sand Beach / Schoodic shorelines — seals haul out on rocks visible from Park Loop pull-offs; summer haul-out peaks.' },
      'schoodic':    { rarity: 'very_likely', frequency: 0.65, seasonFrequencies: { spring: 55, summer: 85, fall: 65, winter: 35 }, peakWindow: { startMonthDay: '06-01', endMonthDay: '08-31', label: 'Peak haul-out + pupping: June – August' }, rationale: 'Schoodic Peninsula has the most reliable seal-watching at Acadia; June-August pupping pulls more seals to ledges.' },
    },
    'White-tailed Deer': {
      'jordan-pond': { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 90, summer: 90, fall: 99, winter: 80 }, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' }, rationale: 'Jordan Pond / Bubble Pond meadows have the highest-visibility deer at Acadia; rut peaks fall.' },
    },
    'American Herring Gull': {
      'park-loop':   { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 95, winter: 85 }, peakWindow: { startMonthDay: '05-01', endMonthDay: '08-15', label: 'Peak breeding: May – mid-Aug' }, rationale: 'Gulls at every coastal overlook — Sand Beach, Thunder Hole, Otter Cliffs; breeding plumage + chicks May-Aug.' },
    },
    'Common Loon': {
      'jordan-pond': {
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 65, summer: 85, fall: 50, winter: 5 },
        peakWindow: { startMonthDay: '06-01', endMonthDay: '08-15', label: 'Peak nesting: June – mid-Aug' },
        rationale: 'Loons reliably calling from Jordan Pond and Eagle Lake in summer; migrate to coastal waters fall-winter.',
      },
    },
    'Bald Eagle': {
      'schoodic':    { rarity: 'likely',     frequency: 0.40, seasonFrequencies: { spring: 45, summer: 35, fall: 50, winter: 35 }, rationale: 'Schoodic Peninsula is the most reliable eagle-watching at Acadia; year-round residents with fall migration boost.' },
    },
    'Eastern Chipmunk': {
      'jordan-pond': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 90, summer: 99, fall: 95, winter: 1 }, rationale: 'Habituated chipmunks at Jordan Pond House and trail edges throughout the carriage roads; hibernate winter.' },
    },
    'American Beaver': {
      'jordan-pond': {
        rarity: 'unlikely',
        frequency: 0.20,
        seasonFrequencies: { spring: 25, summer: 25, fall: 25, winter: 5 },
        rationale: 'Beaver activity at Jordan Pond and Eagle Lake — lodges visible; the animal itself mostly nocturnal.',
      },
    },
    'Coyote': {
      'park-loop':   { rarity: 'unlikely', frequency: 0.15, seasonFrequencies: { spring: 18, summer: 12, fall: 18, winter: 18 }, rationale: 'Coyotes occasionally seen along the Park Loop Road at dawn/dusk; winter visibility boost (snow contrast).' },
    },
  },

  // ── Saguaro ─────────────────────────────────────────────────────────
  saguaro: {
    "Gambel's Quail": {
      'west-tucson': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 99, summer: 90, fall: 92, winter: 90 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '05-31', label: 'Peak vocal breeding: March – May' }, rationale: 'Tucson Mountain District wash trails — quail coveys at every visit year-round; males calling from prominent perches in spring.' },
    },
    'Cactus Wren': {
      'west-tucson': { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 92, summer: 80, fall: 82, winter: 80 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '06-30', label: 'Peak breeding: April – June' }, rationale: 'Cactus wrens nesting in cholla and saguaro along West District trails; non-migratory desert resident.' },
    },
    'Javelina': {
      'east-rincon': { rarity: 'likely',     frequency: 0.45, seasonFrequencies: { spring: 55, summer: 35, fall: 45, winter: 50 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '05-31', label: 'Peak: March – May (cooler dawn/dusk)' }, rationale: 'Rincon Mountain District foothills + Cactus Forest Loop — javelina herds at dawn/dusk; summer heat drives them nocturnal (lower daytime visibility).' },
      'west-tucson': { rarity: 'likely',     frequency: 0.40, seasonFrequencies: { spring: 50, summer: 30, fall: 40, winter: 45 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '05-31', label: 'Peak: March – May' }, rationale: 'West District wash trails see regular javelina activity; summer heat reduces daytime sightings.' },
    },
    'Desert Spiny Lizard': {
      'east-rincon': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 80, summer: 90, fall: 70, winter: 10 }, rationale: 'Rincon foothills — lizards basking on exposed rocks; brumate (dormant) in cool winter months.' },
    },
  },

  // ── Channel Islands ─────────────────────────────────────────────────
  channelislands: {
    'Common Dolphin': {
      'boat-tour':   { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 88, fall: 85, winter: 80 }, rationale: 'Channel crossing puts dolphin pods alongside the boat on most trips year-round (resident Southern California Bight population).' },
    },
    'Blue Whale': {
      'boat-tour':   { rarity: 'unlikely',    frequency: 0.20, seasonFrequencies: { spring: 10, summer: 35, fall: 25, winter: 5 }, peakWindow: { startMonthDay: '07-01', endMonthDay: '09-15', label: 'Peak feeding: July – mid-Sept' }, rationale: 'Summer-only — feeding aggregations off Santa Cruz Island.' },
    },
    'Humpback Whale': {
      'boat-tour':   { rarity: 'likely',      frequency: 0.40, seasonFrequencies: { spring: 30, summer: 50, fall: 45, winter: 10 }, peakWindow: { startMonthDay: '06-15', endMonthDay: '10-15', label: 'Peak feeding: mid-June – mid-Oct' }, rationale: 'Summer feeding migration — sightings on ~40% of crossings.' },
    },
    'California Sea Lion': {
      'boat-tour':   { rarity: 'guaranteed',  frequency: 0.97, seasonFrequencies: { spring: 95, summer: 99, fall: 97, winter: 92 }, peakWindow: { startMonthDay: '06-01', endMonthDay: '08-15', label: 'Peak pupping: June – mid-Aug' }, rationale: 'Sea lion rookeries at Anacapa and Santa Barbara — visible from every boat trip year-round; pups at rookeries June-Aug.' },
      'anacapa':     { rarity: 'guaranteed',  frequency: 0.99, seasonFrequencies: { spring: 97, summer: 99, fall: 98, winter: 95 }, peakWindow: { startMonthDay: '06-01', endMonthDay: '08-15', label: 'Peak pupping: June – mid-Aug' }, rationale: 'Anacapa rookery — hundreds visible from the cliffs year-round.' },
    },
    'Brown Pelican': {
      'anacapa':     { rarity: 'guaranteed',  frequency: 0.98, seasonFrequencies: { spring: 99, summer: 99, fall: 90, winter: 70 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak breeding: April – July' }, rationale: 'Anacapa is the only major Brown Pelican breeding colony in the western US — peak breeding-season presence; some post-breeding winter dispersal.' },
    },
    'Island Fox': {
      'santa-cruz':  { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 75, summer: 72, fall: 70, winter: 60 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '06-30', label: 'Peak breeding + pupping: March – June' }, rationale: 'Endemic Santa Cruz Island fox — habituated, often seen at Scorpion campground year-round; pupping period concentrates activity at den sites.' },
    },
  },

  // ── Voyageurs ───────────────────────────────────────────────────────
  voyageurs: {
    'Common Loon': {
      'lake':        { rarity: 'guaranteed',  frequency: 0.98, seasonFrequencies: { spring: 85, summer: 99, fall: 80, winter: 1 }, peakWindow: { startMonthDay: '06-01', endMonthDay: '08-31', label: 'Peak nesting: June – August' }, rationale: 'Loons on every summer visit — Voyageurs has one of the densest loon populations in the lower 48; lakes freeze and loons migrate Nov–Apr (winter ~0).' },
    },
    'Bald Eagle': {
      'lake':        { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 88, fall: 80, winter: 30 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak nesting: April – July' }, rationale: 'Eagles regularly visible from boat trips and visitor center waterfront; nesting peak Apr-Jul; some overwinter near open water below dams.' },
    },
    'Moose': {
      'kabetogama-pen': { rarity: 'likely',   frequency: 0.35, seasonFrequencies: { spring: 35, summer: 30, fall: 40, winter: 25 }, rationale: 'Kabetogama Peninsula trails are the most reliable moose habitat.' },
    },
    'River Otter': {
      'lake':        { rarity: 'unlikely',    frequency: 0.20, seasonFrequencies: { spring: 25, summer: 22, fall: 22, winter: 8 }, rationale: 'Otters along rocky shorelines — reliable for boaters who scan ledges in open-water season; harder to see when lakes ice over.' },
    },
    'White-tailed Deer': {
      'kabetogama-pen': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 70, fall: 78, winter: 55 }, rationale: 'Deer reliably visible in Kabetogama Peninsula meadows year-round; fall rut bump, winter yarding reduces road-visibility.' },
    },
    'American Beaver': {
      'lake':        {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 50, summer: 45, fall: 45, winter: 25 },
        rationale: 'Beavers and lodges visible from boats along Voyageurs lake shores — lodges year-round, animals mostly at dawn/dusk.',
      },
    },
  },

  // ── Bryce Canyon ────────────────────────────────────────────────────
  brycecanyon: {
    'Utah Prairie Dog': {
      'fairyland':   { rarity: 'guaranteed',  frequency: 0.95, seasonFrequencies: { spring: 90, summer: 99, fall: 60, winter: 1 }, peakWindow: { startMonthDay: '04-15', endMonthDay: '08-31', label: 'Peak active season: mid-April – August' }, rationale: 'Fairyland / Sunrise Point meadows host the largest Utah Prairie Dog colony in the park; true hibernator — dormant underground roughly Oct–Mar (winter ~0).' },
    },
    "Common Golden-mantled Ground Squirrel": {
      'rim-trail':   { rarity: 'guaranteed',  frequency: 0.98, seasonFrequencies: { spring: 90, summer: 99, fall: 80, winter: 5 }, rationale: 'Beg at every overlook along the Rim Trail; hibernate in deep-snow winter at 8,000+ ft.' },
    },
    'Mule Deer': {
      'rim-trail':   { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 80, fall: 85, winter: 40 }, rationale: 'Browse meadows along the Rim Trail at dawn/dusk; some descend to lower elevations in deep-snow winter.' },
    },
    "Steller's Jay": {
      'rim-trail':   { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 92, summer: 92, fall: 92, winter: 80 }, rationale: "Steller's Jays at every Rim Trail overlook and parking area; non-migratory year-round resident." },
    },
    'Common Raven': {
      'rim-trail':   { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 95, winter: 88 }, rationale: 'Ravens patrol the rim — visible from every viewpoint year-round.' },
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
      'rio-grande':   { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 95, summer: 88, fall: 90, winter: 88 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '06-30', label: 'Peak breeding + activity: March – June' }, rationale: 'Roadrunners reliably along Rio Grande Village trails and roads year-round (non-migratory desert resident); courtship displays March-June.' },
    },
    'Mexican Jay': {
      'chisos':       { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 92, winter: 88 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak breeding + cooperative-flock activity: April – July' }, rationale: 'Mexican Jay flocks at every Chisos Basin trailhead and campsite year-round; cooperative breeding flocks most vocal Apr-Jul.' },
    },
    'Western Diamond-backed Rattlesnake': {
      'desert':       { rarity: 'unlikely',   frequency: 0.20, seasonFrequencies: { spring: 25, summer: 30, fall: 20, winter: 5 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'Desert flats — snakes most active spring/summer at dawn/dusk; brumation Nov-Feb.' },
    },
    'Javelina': {
      'chisos':       { rarity: 'likely',     frequency: 0.45, seasonFrequencies: { spring: 50, summer: 38, fall: 45, winter: 50 }, rationale: 'Javelina herds at Chisos Basin campground / Window Trail at dawn/dusk; summer heat shifts them more nocturnal.' },
    },
    'Black Bear': {
      'chisos':       { rarity: 'unlikely',   frequency: 0.18, seasonFrequencies: { spring: 20, summer: 25, fall: 20, winter: 5 }, rationale: 'Reintroduced black bear population in the Chisos Mountains — sightings on bear sightings reports.' },
    },
    'Mountain Lion': {
      'desert':       { rarity: 'rare',       frequency: 0.04, seasonFrequencies: { spring: 4, summer: 3, fall: 4, winter: 5 }, rationale: 'Big Bend has one of the highest mountain lion densities in the US, but they remain almost-never-seen by casual visitors year-round.' },
    },
  },

  // ── Dry Tortugas ────────────────────────────────────────────────────
  drytortugas: {
    'Sooty Tern': {
      'fort-jefferson': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 30, winter: 5 }, peakWindow: { startMonthDay: '04-15', endMonthDay: '08-31', label: 'Peak nesting: mid-April – August' }, rationale: 'Bush Key colony — hundreds of thousands of nesting Sooty Terns visible from Fort Jefferson April-Aug.' },
    },
    'Brown Noddy': {
      'fort-jefferson': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 99, summer: 99, fall: 25, winter: 5 }, peakWindow: { startMonthDay: '04-15', endMonthDay: '08-31', label: 'Peak nesting: mid-April – August' }, rationale: 'Brown Noddy nesting alongside Sooty Terns on Bush Key.' },
    },
    'Magnificent Frigatebird': {
      'fort-jefferson': { rarity: 'very_likely', frequency: 0.85, peakWindow: { startMonthDay: '11-01', endMonthDay: '04-30', label: 'Peak breeding (males display): Nov – April' }, rationale: 'Frigatebirds soaring over the fort year-round; males display inflated red throat pouches Nov-April.' },
    },
  },

  // ── Round 8 zone additions (last 7 unzoned parks) ───────────────────
  americansamoa: {
    'Pacific Flying-fox': {
      'tutuila':    { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 75, fall: 75, winter: 75 }, rationale: 'Flying foxes visible at dawn/dusk on Tutuila year-round — equatorial tropics, no seasonality (endemic Samoan flying fox).' },
      'ofu-island': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 70, fall: 70, winter: 70 }, rationale: 'Ofu Island flying foxes visible from Tumu Mountain area year-round — equatorial, aseasonal.' },
    },
    'Green Sea Turtle': {
      'ofu-island': { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 50, summer: 55, fall: 50, winter: 45 }, rationale: 'Green Sea Turtles in seagrass beds at Ofu Island reef — visible to snorkelers year-round; mild nesting-season uptick.' },
    },
    'Brown Booby': {
      'ofu-island': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 75, fall: 75, winter: 75 }, rationale: 'Brown Booby colonies on Ofu coastal cliffs year-round — tropical seabird, aseasonal.' },
    },
  },

  cuyahogavalley: {
    'White-tailed Deer': {
      'towpath':    { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 90, summer: 90, fall: 97, winter: 82 }, rationale: 'Heavy deer population visible along the entire Towpath Trail at any time of day; fall rut bump, year-round resident.' },
    },
    'Eastern Gray Squirrel': {
      'towpath':    { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 97, winter: 88 }, rationale: 'Squirrels everywhere along the canal corridor year-round.' },
    },
    'Bald Eagle': {
      'brandywine': { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 28, summer: 25, fall: 25, winter: 22 }, rationale: 'Bald Eagles fishing the Cuyahoga River near Brandywine Falls; year-round residents (nesting pairs established).' },
    },
    'American Beaver': {
      'towpath':    { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 25, summer: 22, fall: 22, winter: 12 }, rationale: 'Beaver lodges along the canal — animal mostly nocturnal/crepuscular; less active under winter ice.' },
    },
  },

  gatesofthearctic: {
    'Caribou': {
      'arrigetch':  { rarity: 'likely', frequency: 0.40, seasonFrequencies: { spring: 35, summer: 50, fall: 55, winter: 30 }, rationale: 'Western Arctic caribou herd (~200,000 animals) moves through the park; expedition trips during migration windows boost rates.' },
    },
    'Brown Bear': {
      'arrigetch':  { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 35, fall: 30, winter: 1 }, rationale: 'Grizzlies in Brooks Range; denning winter.' },
    },
    'Moose': {
      'noatak':     { rarity: 'unlikely', frequency: 0.20, rationale: 'Moose along the Noatak River willows.' },
    },
  },

  gatewayarch: {
    'Eastern Gray Squirrel': {
      'riverfront': { rarity: 'guaranteed', frequency: 0.99, rationale: 'Habituated squirrels on every Arch grounds lawn — urban park standard.' },
    },
    'American Robin': {
      'riverfront': { rarity: 'very_likely', frequency: 0.85, rationale: 'American Robins on Arch grounds lawns year-round.' },
    },
  },

  guadalupemountains: {
    'Mule Deer': {
      'mckittrick': { rarity: 'very_likely', frequency: 0.70, rationale: 'Mule Deer along McKittrick Canyon riparian corridor.' },
      'pine-springs':{ rarity: 'very_likely', frequency: 0.65, rationale: 'Mule Deer at Pine Springs visitor center area.' },
    },
    'Elk': {
      'mckittrick': { rarity: 'likely', frequency: 0.40, rationale: 'Reintroduced elk herd in McKittrick Canyon.' },
    },
  },

  kobukvalley: {
    'Caribou': {
      'onion-portage': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 5, summer: 10, fall: 95, winter: 25 },
        peakWindow: { startMonthDay: '08-20', endMonthDay: '10-05', label: 'Peak migration: late Aug – early Oct' },
        rationale: 'Tens of thousands of caribou cross the Kobuk River at Onion Portage during fall migration (late August - early October).',
      },
    },
  },

  whitesands: {
    'Western Earless Lizard': {
      'dune-drive':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 90, summer: 95, fall: 80, winter: 25 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'White-color form endemic to White Sands — visible on every warm-season dune walk.' },
      'alkali-flat': { rarity: 'likely', frequency: 0.45, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'Lizards in deeper interior dune areas; lower density than Dunes Drive.' },
    },
    'Coyote': {
      'dune-drive':  { rarity: 'unlikely', frequency: 0.15, rationale: 'Coyotes occasionally cross dunes at dawn/dusk.' },
    },
  },

  // ── Grand Teton (round 7) ───────────────────────────────────────────
  grandteton: {
    'American Bison': {
      'antelope-flats': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 92, summer: 97, fall: 95, winter: 80 },
        rationale: 'Antelope Flats / Mormon Row bison herd visible from Mormon Row Road year-round; Mormon Row access reduced in deep winter.',
      },
    },
    'Pronghorn': {
      'antelope-flats': { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 75, summer: 90, fall: 80, winter: 1 }, rationale: 'Pronghorn herds graze the sagebrush flats alongside bison spring-fall; migrate ~150 mi south to the Green River Basin for winter.' },
    },
    'Moose': {
      'moose-wilson': {
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 65, summer: 75, fall: 70, winter: 50 },
        rationale: 'Moose-Wilson Road willow flats — one of the most reliable moose viewing roads in the lower 48.',
      },
      'oxbow-bend':   { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 55, fall: 50, winter: 30 }, rationale: 'Moose along Snake River willows at Oxbow Bend.' },
    },
    'American Black Bear': {
      'moose-wilson': {
        rarity: 'unlikely',
        frequency: 0.25,
        seasonFrequencies: { spring: 28, summer: 35, fall: 30, winter: 1 },
        rationale: 'Moose-Wilson Road bears regularly visible in summer/fall berry season; denning winter.',
      },
    },
    'Bald Eagle': {
      'oxbow-bend':   { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 70, fall: 80, winter: 65 }, rationale: 'Bald Eagles fish the Snake River — Oxbow Bend nest sites are legendary; year-round residents with fall congregation peak.' },
    },
    'Trumpeter Swan': {
      'oxbow-bend':   { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 75, fall: 65, winter: 35 }, rationale: 'Trumpeter Swans on the Snake River year-round — Oxbow Bend is reliable.' },
    },
  },

  // ── Canyonlands (round 7) ───────────────────────────────────────────
  canyonlands: {
    'Common Raven': {
      'island-sky': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 97, winter: 92 }, rationale: 'Ravens at every Island in the Sky overlook — unavoidable year-round.' },
      'needles':    { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 95, winter: 88 }, rationale: 'Ravens patrol the Needles district year-round.' },
    },
    'Common Side-blotched Lizard': {
      'island-sky': { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 85, summer: 90, fall: 80, winter: 10 }, rationale: 'Side-blotched lizards everywhere on warm rocks at Island in the Sky; brumate (dormant) in cool winter.' },
      'needles':    { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 80, summer: 88, fall: 75, winter: 10 }, rationale: 'Side-blotched lizards at every Needles trail; winter brumation.' },
    },
    'Mule Deer': {
      'needles':    { rarity: 'likely', frequency: 0.40, seasonFrequencies: { spring: 42, summer: 38, fall: 48, winter: 35 }, rationale: 'Mule Deer in canyon bottoms and at Squaw Flat campground; fall rut bump, year-round resident.' },
    },
    'Coyote': {
      'island-sky': { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 20, fall: 25, winter: 30 }, rationale: 'Coyotes at dawn/dusk near Grand View Point and Mesa Arch; winter activity boost.' },
    },
  },

  // ── Redwood (round 7) ───────────────────────────────────────────────
  redwood: {
    'Roosevelt Elk': {
      'prairie-creek': {
        rarity: 'guaranteed',
        frequency: 0.95,
        rationale: 'Prairie Creek elk herd at the meadows + Gold Bluffs Beach visible to nearly every visitor.',
      },
    },
    'Mule Deer': {
      'prairie-creek': { rarity: 'likely', frequency: 0.45, rationale: 'Mule Deer also visible in coastal meadows alongside elk.' },
    },
    'American Black Bear': {
      'tall-trees':    { rarity: 'unlikely', frequency: 0.18, seasonFrequencies: { spring: 20, summer: 25, fall: 22, winter: 5 }, rationale: 'Black bears in old-growth groves and along Redwood Creek.' },
    },
  },

  // ── Kings Canyon (round 7) ──────────────────────────────────────────
  kingscanyon: {
    'Mule Deer': {
      'cedar-grove': { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 60, summer: 90, fall: 85, winter: 1 }, rationale: 'Deer in Zumwalt Meadow and Cedar Grove campgrounds; Cedar Grove road (Hwy 180) closed Nov-Apr.' },
      'grant-grove': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 70, summer: 80, fall: 85, winter: 55 }, rationale: 'Deer browsing Grant Grove area at dawn/dusk; Grant Grove open year-round (lower elevation).' },
    },
    "Steller's Jay": {
      'grant-grove': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 95, winter: 88 }, rationale: "Steller's Jays at every Grant Grove campsite and picnic area year-round." },
    },
    'American Black Bear': {
      'cedar-grove': { rarity: 'unlikely', frequency: 0.18, seasonFrequencies: { spring: 20, summer: 25, fall: 22, winter: 1 }, rationale: 'Black bears in Cedar Grove canyon area.' },
    },
    'Yellow-bellied Marmot': {
      'high-sierra': {
        rarity: 'very_likely',
        frequency: 0.70,
        seasonFrequencies: { spring: 25, summer: 90, fall: 60, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Marmots in alpine basins (Rae Lakes loop) summer; hibernate Sept-May.',
      },
    },
  },

  // ── Isle Royale (round 7) ───────────────────────────────────────────
  isleroyale: {
    'Common Loon': {
      'rock-harbor': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 80, summer: 99, fall: 75, winter: 1 }, rationale: 'Loons calling from every Isle Royale lake in summer; Rock Harbor area particularly reliable. Park CLOSED Nov–mid-Apr (winter ~0).' },
      'windigo':     { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 75, summer: 99, fall: 70, winter: 1 }, rationale: 'Loons on west-side lakes around Windigo in summer; park closed in winter.' },
    },
    'Moose': {
      'greenstone':  { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 50, fall: 50, winter: 1 }, peakWindow: { startMonthDay: '09-15', endMonthDay: '10-31', label: 'Peak rut: mid-Sept – Oct' }, rationale: 'Moose in island interior — backpackers see them on roughly half of multi-day trips; rut concentrates them in willow flats. Park closed Nov–mid-Apr.' },
      'rock-harbor': { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 28, fall: 28, winter: 1 }, rationale: 'Moose occasionally seen near Rock Harbor; less frequent than interior; park closed in winter.' },
    },
    'Bald Eagle': {
      'rock-harbor': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 70, summer: 80, fall: 70, winter: 1 }, rationale: 'Bald Eagles fishing Lake Superior shoreline in the open season; park closed Nov–mid-Apr.' },
    },
  },

  // ── Virgin Islands (round 7) ────────────────────────────────────────
  virginislands: {
    'Green Iguana': {
      'trunk-bay':   { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 97, fall: 92, winter: 88 }, rationale: 'Invasive Green Iguanas at every beach, parking lot, and trail year-round; Caribbean tropics, mild winter dip in basking activity.' },
    },
    'Green Sea Turtle': {
      'trunk-bay':   { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 50, summer: 55, fall: 50, winter: 45 }, rationale: 'Green Sea Turtles in seagrass beds at Trunk Bay and Maho Bay — visible to snorkelers year-round; mild nesting-season uptick.' },
    },
    'Hawksbill Sea Turtle': {
      'buck-island': { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 32, fall: 28, winter: 18 }, rationale: 'Hawksbill Sea Turtles around the Buck Island reef — less common than Green but real; summer nesting-season peak.' },
    },
    'Brown Pelican': {
      'trunk-bay':   { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 75, fall: 75, winter: 72 }, rationale: 'Brown Pelicans diving the bays year-round — resident Caribbean population, aseasonal.' },
    },
  },

  // ── Biscayne (round 7) ──────────────────────────────────────────────
  biscayne: {
    'Brown Pelican': {
      'convoy-point': { rarity: 'guaranteed', frequency: 0.92, rationale: 'Brown Pelicans at the visitor center waterfront.' },
      'boat-tour':    { rarity: 'guaranteed', frequency: 0.97, rationale: 'Brown Pelicans on every boat trip out to the keys.' },
    },
    'Common Bottlenose Dolphin': {
      'boat-tour':    { rarity: 'likely', frequency: 0.50, rationale: 'Bottlenose dolphins visible from boat tours but not guaranteed on shorter trips.' },
    },
  },

  // ── New River Gorge (round 7) ───────────────────────────────────────
  newrivergorge: {
    'American Black Bear': {
      'long-point':    { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 22, summer: 28, fall: 25, winter: 3 }, rationale: 'Black bears reported regularly along Endless Wall trails; denning winter.' },
    },
    'White-tailed Deer': {
      'grandview':     { rarity: 'very_likely', frequency: 0.85, rationale: 'Deer abundant in gorge forests visible from Grandview overlooks.' },
    },
    'Bald Eagle': {
      'sandstone-falls': { rarity: 'unlikely', frequency: 0.25, rationale: 'Bald Eagles along the lower New River.' },
    },
  },

  // ── Carlsbad Caverns (round 6) ──────────────────────────────────────
  carlsbadcaverns: {
    'Mexican Free-tailed Bat': {
      'natural-entrance': {
        rarity: 'guaranteed',
        frequency: 0.99,
        seasonFrequencies: { spring: 60, summer: 99, fall: 75, winter: 1 },
        peakWindow: { startMonthDay: '06-01', endMonthDay: '08-31', label: 'Peak bat flight: June – August' },
        rationale: 'Hundreds of thousands emerge nightly from the natural entrance May-October — the headline visitor experience.',
      },
    },
    'Common Raven': {
      'natural-entrance': { rarity: 'guaranteed', frequency: 0.95, rationale: 'Ravens patrol the natural entrance amphitheater area.' },
    },
    'Greater Roadrunner': {
      'walnut-canyon': { rarity: 'likely', frequency: 0.45, rationale: 'Roadrunners along the Walnut Canyon Desert Drive.' },
    },
    'Mule Deer': {
      'walnut-canyon': { rarity: 'very_likely', frequency: 0.70, rationale: 'Mule Deer in canyons and along the desert drive at dawn/dusk.' },
    },
  },

  // ── Mammoth Cave (round 6) ──────────────────────────────────────────
  mammothcave: {
    'White-tailed Deer': {
      'visitor-area': { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 90, summer: 90, fall: 99, winter: 85 }, rationale: 'Deer abundant in surface forests around the visitor center; fall rut bump, year-round resident.' },
      'green-river':  { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 80, summer: 80, fall: 88, winter: 70 }, rationale: 'Deer along the Green River bottoms year-round.' },
    },
    'Wild Turkey': {
      'visitor-area': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 75, summer: 65, fall: 78, winter: 60 }, rationale: 'Wild Turkey flocks in surface forests at dawn/dusk; fall flock-aggregation peak.' },
    },
    'Eastern Gray Squirrel': {
      'visitor-area': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 97, winter: 88 }, rationale: 'Squirrels everywhere in surface forests around the visitor center year-round.' },
    },
    'Little Brown Bat': {
      'visitor-area': {
        rarity: 'unlikely',
        frequency: 0.18,
        seasonFrequencies: { spring: 20, summer: 25, fall: 18, winter: 8 },
        rationale: 'Resident bat species; sightings during cave tours have dropped post-WNS but still possible; winter hibernation reduces activity.',
      },
    },
  },

  // ── Lake Clark (round 6) ────────────────────────────────────────────
  lakeclark: {
    'Brown Bear': {
      'silver-salmon': {
        rarity: 'very_likely',
        frequency: 0.90,
        seasonFrequencies: { spring: 60, summer: 95, fall: 85, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak salmon run: July – August' },
        rationale: 'Coastal bear-viewing trips at Silver Salmon Creek run ~90% sighting rate during summer salmon runs.',
      },
      'chinitna-bay': {
        rarity: 'very_likely',
        frequency: 0.85,
        seasonFrequencies: { spring: 55, summer: 90, fall: 80, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak salmon run: July – August' },
        rationale: 'Chinitna Bay bear-viewing comparable to Silver Salmon Creek — both are commercial bear-tour destinations.',
      },
      'port-alsworth': { rarity: 'unlikely', frequency: 0.20, rationale: 'Twin Lakes / lodge area bear sightings less frequent than coastal viewing sites.' },
    },
    'Sockeye Salmon': {
      'silver-salmon': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 5, summer: 95, fall: 30, winter: 1 }, peakWindow: { startMonthDay: '07-01', endMonthDay: '08-15', label: 'Peak spawning run: July – mid-Aug' }, rationale: 'Salmon spawning runs in Silver Salmon Creek peak July-Aug.' },
    },
    'Bald Eagle': {
      'silver-salmon': { rarity: 'very_likely', frequency: 0.80, peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak salmon-run feeding: July – August' }, rationale: 'Bald Eagles at coastal bear-viewing areas during salmon runs.' },
    },
    'Moose': {
      'port-alsworth': { rarity: 'likely', frequency: 0.40, rationale: 'Moose around Port Alsworth and Twin Lakes shoreline.' },
    },
  },

  // ── Wrangell-St Elias (round 6) ─────────────────────────────────────
  wrangellstelias: {
    'Thinhorn Sheep': {
      'mccarthy':     { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 45, summer: 55, fall: 50, winter: 30 }, peakWindow: { startMonthDay: '11-15', endMonthDay: '12-31', label: 'Peak rut: mid-Nov – Dec' }, rationale: 'Dall sheep on McCarthy Road cliffs — visible from pull-offs in the accessible season; McCarthy Road largely impassable in deep winter.' },
      'nabesna-road': { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 40, summer: 55, fall: 45, winter: 25 }, peakWindow: { startMonthDay: '11-15', endMonthDay: '12-31', label: 'Peak rut: mid-Nov – Dec' }, rationale: 'Dall sheep visible from Nabesna Road in summer; reduced winter road access.' },
    },
    'Moose': {
      'mccarthy':     { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 50, summer: 55, fall: 55, winter: 20 }, peakWindow: { startMonthDay: '09-15', endMonthDay: '10-31', label: 'Peak rut: mid-Sept – Oct' }, rationale: 'Moose along McCarthy Road riparian areas; rut concentrates bulls Sept-Oct; reduced winter road access.' },
    },
    'Brown Bear': {
      'mccarthy':     { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 30, summer: 35, fall: 25, winter: 1 }, rationale: 'Grizzlies occasional along McCarthy Road; denning winter.' },
    },
    'Caribou': {
      'nabesna-road': { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 20, summer: 25, fall: 25, winter: 10 }, rationale: 'Caribou occasionally visible from Nabesna Road in summer; reduced winter road access.' },
    },
  },

  // ── Black Canyon (round 6) ──────────────────────────────────────────
  blackcanyon: {
    'Mule Deer': {
      'south-rim':  { rarity: 'very_likely', frequency: 0.70, rationale: 'Habituated deer at South Rim overlooks and campground.' },
      'north-rim':  { rarity: 'likely',     frequency: 0.40, rationale: 'Deer on the remote North Rim.' },
    },
    'Peregrine Falcon': {
      'south-rim':  { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 30, summer: 35, fall: 25, winter: 5 }, rationale: 'Peregrine Falcons nest in the canyon walls — visible from South Rim overlooks April-Aug.' },
    },
    'Common Raven': {
      'south-rim':  { rarity: 'guaranteed', frequency: 0.95, rationale: 'Ravens patrol South Rim overlooks and campground.' },
    },
  },

  // ── Great Sand Dunes (round 6) ──────────────────────────────────────
  greatsanddunes: {
    'Mule Deer': {
      'mosca-pass': { rarity: 'very_likely', frequency: 0.65, rationale: 'Deer at the forest edge near Mosca Pass and Medano Creek.' },
    },
    'Pronghorn': {
      'dunes-base': { rarity: 'unlikely', frequency: 0.20, rationale: 'Pronghorn in grasslands east of the dunes.' },
    },
    'Coyote': {
      'mosca-pass': { rarity: 'likely', frequency: 0.40, rationale: 'Coyotes routinely seen at forest-grassland edges at dawn/dusk.' },
    },
  },

  // ── Congaree (round 6) ──────────────────────────────────────────────
  congaree: {
    'American Alligator': {
      'cedar-creek': { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 25, summer: 30, fall: 20, winter: 5 }, rationale: 'Alligators in Cedar Creek floodplain sloughs — kayakers and high-water periods boost sightings.' },
    },
    'White-tailed Deer': {
      'boardwalk':   { rarity: 'likely', frequency: 0.40, rationale: 'Deer browsing in floodplain forests visible from the boardwalk.' },
    },
    'Wild Turkey': {
      'boardwalk':   { rarity: 'likely', frequency: 0.45, rationale: 'Wild Turkey flocks in old-growth bottomlands.' },
    },
    'Barred Owl': {
      'boardwalk':   { rarity: 'likely', frequency: 0.40, rationale: 'Barred Owls reliably calling at dawn/dusk along the boardwalk loop.' },
    },
  },

  // ── North Cascades (round 6) ────────────────────────────────────────
  northcascades: {
    'Hoary Marmot': {
      'cascade-pass': {
        rarity: 'very_likely',
        frequency: 0.80,
        seasonFrequencies: { spring: 25, summer: 90, fall: 65, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Hoary Marmots on Cascade Pass / Sahale Arm in summer; hibernate Sept-May.',
      },
    },
    'Mountain Goat': {
      'cascade-pass': {
        rarity: 'likely',
        frequency: 0.45,
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Mountain Goats on the high meadows above Cascade Pass in summer.',
      },
    },
    'American Black Bear': {
      'hwy-20':       { rarity: 'unlikely', frequency: 0.18, seasonFrequencies: { spring: 20, summer: 25, fall: 22, winter: 1 }, rationale: 'Black bears occasionally cross Highway 20 corridor; denning winter.' },
    },
    'Bald Eagle': {
      'hwy-20':       { rarity: 'very_likely', frequency: 0.75, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak nesting: April – July' }, rationale: 'Bald Eagles at Diablo Lake / Ross Lake along the highway corridor; nesting peak Apr-Jul makes them most predictable.' },
    },
  },

  // ── Indiana Dunes (round 6) ─────────────────────────────────────────
  indianadunes: {
    'White-tailed Deer': {
      'inland':     { rarity: 'very_likely', frequency: 0.75, rationale: 'Deer in dune-edge forests and savanna.' },
    },
    'Sandhill Crane': {
      'lakeshore':  { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 90, summer: 60, fall: 95, winter: 5 }, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-20', label: 'Peak fall migration: mid-Oct – mid-Nov' }, rationale: 'Sandhill Cranes in seasonal wetlands — peak fall migration October-November.' },
    },
    'Bald Eagle': {
      'lakeshore':  { rarity: 'unlikely', frequency: 0.25, rationale: 'Bald Eagles fishing along Lake Michigan shoreline year-round.' },
    },
    'Common Loon': {
      'lakeshore':  { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 30, summer: 5, fall: 30, winter: 25 }, rationale: 'Loons on Lake Michigan during migration and winter; absent in summer.' },
    },
  },

  // ── Hawaii Volcanoes (round 6 — added species for existing zones) ──
  hawaiivolcanoes: {
    'Hawaiian Goose': {
      'kilauea-summit': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 92, summer: 88, fall: 95, winter: 99 },
        peakWindow: { startMonthDay: '10-01', endMonthDay: '03-31', label: 'Peak breeding: Oct – March' },
        rationale: 'Nene walk freely near Kilauea Caldera and Crater Rim Drive parking; breeding season Oct-Mar (austral-style winter) concentrates them at summit — INVERTED vs mainland (no migration, tropical).',
      },
      'kahuku': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 68, summer: 62, fall: 70, winter: 78 }, peakWindow: { startMonthDay: '10-01', endMonthDay: '03-31', label: 'Peak breeding: Oct – March' }, rationale: 'Nene at the Kahuku Unit pasture/forest — managed habitat; winter breeding-season peak.' },
    },
    'Hawaiian Hawk': {
      'kilauea-summit': { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 30, summer: 25, fall: 22, winter: 22 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '06-30', label: 'Peak breeding: March – June' }, rationale: 'Endemic Io occasionally visible soaring over Kilauea; non-migratory, spring breeding-season display peak.' },
      'kahuku':         { rarity: 'unlikely', frequency: 0.30, seasonFrequencies: { spring: 35, summer: 30, fall: 28, winter: 27 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '06-30', label: 'Peak breeding: March – June' }, rationale: 'Io regularly visible at Kahuku; year-round resident.' },
    },
    'Small Indian Mongoose': {
      'kilauea-summit': { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 48, fall: 45, winter: 42 }, rationale: 'Invasive mongoose — visible along roads and trails year-round (tropical, diurnal, aseasonal).' },
    },
  },

  // ── Crater Lake (round 5) ───────────────────────────────────────────
  craterlake: {
    'Common Golden-mantled Ground Squirrel': {
      'rim-village':  { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 60, summer: 99, fall: 80, winter: 1 }, rationale: 'Habituated ground squirrels begging at every Rim Village overlook in summer; hibernate ~Oct–May under deep Cascade snowpack.' },
      'rim-drive':    { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 30, summer: 99, fall: 75, winter: 1 }, rationale: 'Ground squirrels at every Rim Drive overlook in summer; Rim Drive closed by snow Oct–Jun and squirrels hibernate.' },
    },
    "Steller's Jay": {
      'rim-village':  { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 88, summer: 95, fall: 90, winter: 75 }, rationale: "Steller's Jays at every Rim Village picnic area; non-migratory but lower winter access (only Rim Village plowed)." },
    },
    "Clark's Nutcracker": {
      'rim-drive':    { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 50, summer: 85, fall: 95, winter: 30 }, peakWindow: { startMonthDay: '08-01', endMonthDay: '10-15', label: 'Peak seed-caching: Aug – mid-Oct' }, rationale: "Clark's Nutcrackers cache whitebark pine seeds along Rim Drive; activity peaks late summer/fall when cones ripen; year-round resident." },
    },
    'Mule Deer': {
      'pinnacles':    { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 40, summer: 60, fall: 55, winter: 5 }, rationale: 'Deer in lower forests around Pinnacles / Plaikni Falls trail; descend below the rim in deep-snow winter.' },
    },
    'American Black Bear': {
      'pinnacles':    { rarity: 'unlikely', frequency: 0.15, seasonFrequencies: { spring: 18, summer: 22, fall: 18, winter: 1 }, rationale: 'Black bears in lower forests; denning in winter.' },
    },
  },

  // ── Lassen Volcanic (round 5) ───────────────────────────────────────
  lassenvolcanic: {
    "Steller's Jay": {
      'manzanita-lake':  { rarity: 'guaranteed', frequency: 0.95, rationale: "Steller's Jays at Manzanita Lake campground and visitor center." },
    },
    'Common Golden-mantled Ground Squirrel': {
      'bumpass-hell':    { rarity: 'very_likely', frequency: 0.80, rationale: 'Ground squirrels at Bumpass Hell parking and trailhead.' },
    },
    'Mule Deer': {
      'manzanita-lake':  { rarity: 'very_likely', frequency: 0.75, rationale: 'Habituated deer in Manzanita Lake campground meadows.' },
    },
    'American Black Bear': {
      'warner-valley':   { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 22, summer: 28, fall: 22, winter: 2 }, rationale: 'Black bears in Warner Valley backcountry; denning winter.' },
    },
  },

  // ── Pinnacles (round 5) ─────────────────────────────────────────────
  pinnacles: {
    'California Condor': {
      'east-side':       { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 55, summer: 50, fall: 55, winter: 35 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '11-30', label: 'Peak: spring – fall' }, rationale: 'East-side condor release area + High Peaks roost — sightings ~50% of casual visits; thermal-soaring days in warm months best.' },
      'high-peaks':      { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 75, summer: 70, fall: 75, winter: 50 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '11-30', label: 'Peak: spring – fall' }, rationale: 'High Peaks Trail puts visitors closest to active condor roost.' },
    },
    'California Ground Squirrel': {
      'east-side':       { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 99, fall: 90, winter: 55 }, rationale: 'Habituated ground squirrels at every visitor area; less active in winter cold.' },
    },
    'Acorn Woodpecker': {
      'east-side':       { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 95, summer: 92, fall: 90, winter: 85 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '07-31', label: 'Peak breeding: April – July' }, rationale: 'Acorn Woodpecker granary trees throughout east side; non-migratory, present year-round; breeding-season activity peaks Apr-Jul.' },
    },
    'California Scrub-Jay': {
      'east-side':       { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 85, summer: 80, fall: 78, winter: 75 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '06-30', label: 'Peak breeding: April – June' }, rationale: 'Scrub-Jays at every campground and oak savanna; non-migratory; vocal during breeding season.' },
    },
    'Wild Turkey': {
      'east-side':       { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 55, summer: 48, fall: 55, winter: 45 }, rationale: 'Wild Turkey flocks regularly cross east-side roads; fall flock-aggregation peak.' },
    },
  },

  // ── Badlands (round 5) ──────────────────────────────────────────────
  badlands: {
    'American Bison': {
      'sage-creek-rim':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 90, fall: 85, winter: 65 }, peakWindow: { startMonthDay: '07-15', endMonthDay: '08-15', label: 'Peak rut: mid-July – mid-Aug' }, rationale: 'Sage Creek Rim Road bison herd — visible to 85% of casual visitors who drive the loop; year-round residents (SD prairie winters cold).' },
    },
    'Pronghorn': {
      'sage-creek-rim':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 85, fall: 75, winter: 30 }, rationale: 'Pronghorn herds across Sage Creek Wilderness mixed-grass prairie; reduced/dispersed in deep winter.' },
    },
    'Black-tailed Prairie Dog': {
      'roberts-prairie': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 95, summer: 99, fall: 80, winter: 15 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '08-31', label: 'Peak active season: April – August' }, rationale: 'Roberts Prairie Dog Town hosts thousands of animals — guaranteed warm-season sighting; winter torpor sharply cuts surface activity.' },
      'sage-creek-rim':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 90, fall: 70, winter: 12 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '08-31', label: 'Peak active season: April – August' }, rationale: 'Multiple prairie dog towns visible from the rim road; winter torpor.' },
    },
    'Mule Deer': {
      'cedar-pass':      { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 72, summer: 75, fall: 82, winter: 60 }, rationale: 'Mule Deer in canyons around Cedar Pass campground; fall rut bump, year-round resident.' },
    },
    'Coyote': {
      'sage-creek-rim':  { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 40, fall: 45, winter: 55 }, rationale: 'Coyotes hunting prairie dogs along the rim road at dawn/dusk; winter snow-contrast boost.' },
    },
  },

  // ── Theodore Roosevelt (round 5) ────────────────────────────────────
  theodoreroosevelt: {
    'American Bison': {
      'south-unit':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 90, fall: 85, winter: 70 }, peakWindow: { startMonthDay: '07-15', endMonthDay: '08-15', label: 'Peak rut: mid-July – mid-Aug' }, rationale: 'Free-ranging bison herd visible from South Unit scenic loop year-round (ND winters cold but herd stays).' },
      'north-unit':  { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 80, summer: 88, fall: 80, winter: 60 }, peakWindow: { startMonthDay: '07-15', endMonthDay: '08-15', label: 'Peak rut: mid-July – mid-Aug' }, rationale: 'North Unit bison herd visible from scenic drive; reduced winter road access.' },
    },
    'Wild Horse': {
      'south-unit':  { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 75, fall: 70, winter: 55 }, peakWindow: { startMonthDay: '04-15', endMonthDay: '06-30', label: 'Peak foaling: mid-April – June' }, rationale: 'Feral horse bands visible from South Unit loop drive; foals visible spring-early summer; year-round residents.' },
    },
    'Pronghorn': {
      'south-unit':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 85, fall: 75, winter: 25 }, rationale: 'Pronghorn across the badlands grasslands; some seasonal movement to lower ground in deep winter.' },
      'north-unit':  { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 80, fall: 70, winter: 20 }, rationale: 'Pronghorn herds visible from North Unit road; reduced winter.' },
    },
    'Black-tailed Prairie Dog': {
      'south-unit':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 90, fall: 70, winter: 10 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '08-31', label: 'Peak active season: April – August' }, rationale: 'Multiple prairie dog towns along the South Unit scenic loop; winter torpor sharply reduces surface activity.' },
    },
    'Coyote': {
      'south-unit':  { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 40, fall: 45, winter: 55 }, rationale: 'Coyotes routinely visible at dawn/dusk in open grasslands; winter snow-contrast boost.' },
    },
    'Mule Deer': {
      'south-unit':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 72, summer: 75, fall: 82, winter: 60 }, rationale: 'Mule Deer in badlands canyons and along the river; fall rut bump, year-round resident.' },
    },
  },

  // ── Mesa Verde (round 5) ────────────────────────────────────────────
  mesaverde: {
    'Mule Deer': {
      'morefield':   { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 88, summer: 90, fall: 99, winter: 70 }, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' }, rationale: 'Habituated deer in Morefield Campground meadows; rut peaks fall; some descend off the mesa in deep-snow winter.' },
      'cliff-palace':{ rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 75, fall: 85, winter: 1 }, rationale: 'Deer browsing along Chapin Mesa cliff dwelling areas; cliff-dwelling tours closed late Oct–Apr.' },
    },
    'Wild Turkey': {
      'morefield':   { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 72, fall: 82, winter: 60 }, rationale: 'Wild Turkey flocks in Morefield campground at dawn/dusk; fall flock-aggregation peak.' },
    },
    "Gunnison's Prairie Dog": {
      'far-view':    { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 25, summer: 28, fall: 18, winter: 1 }, rationale: "Small Gunnison's prairie dog colony near Far View — easy to miss but findable; true hibernator (Oct–Mar dormant)." },
    },
    'Coyote': {
      'morefield':   { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 20, summer: 18, fall: 22, winter: 25 }, rationale: 'Coyotes occasionally cross park roads at dawn/dusk; winter snow-contrast boost.' },
    },
  },

  // ── Capitol Reef (round 5) ──────────────────────────────────────────
  capitolreef: {
    'Mule Deer': {
      'fruita':      { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 90, summer: 90, fall: 99, winter: 85 }, peakWindow: { startMonthDay: '08-01', endMonthDay: '10-31', label: 'Peak orchard fruit season: Aug – October' }, rationale: 'Fruita orchards attract deer nightly — visible to nearly every camper; ripening fruit Aug-Oct concentrates the herd; year-round resident.' },
    },
    'Common Raven': {
      'fruita':      { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 95, winter: 90 }, rationale: 'Ravens at every Fruita parking area and overlook year-round.' },
      'scenic-drive':{ rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 93, winter: 85 }, rationale: 'Ravens patrol the Scenic Drive cliffs year-round.' },
    },
    'Rock Squirrel': {
      'fruita':      { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 92, summer: 99, fall: 85, winter: 45 }, rationale: 'Habituated rock squirrels at Fruita visitor area; less active in winter cold (semi-torpid).' },
    },
    'Coyote': {
      'scenic-drive':{ rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 22, summer: 18, fall: 22, winter: 25 }, rationale: 'Coyotes occasionally seen on the scenic drive at dawn/dusk; winter snow-contrast boost.' },
    },
  },

  // ── Petrified Forest (round 5) ──────────────────────────────────────
  petrifiedforest: {
    'Common Raven': {
      'painted-desert': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 97, winter: 92 }, rationale: 'Ravens at Painted Desert Inn and overlooks year-round.' },
      'crystal-forest': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 95, winter: 88 }, rationale: 'Ravens patrol Crystal Forest parking and trail year-round.' },
    },
    'Pronghorn': {
      'painted-desert': { rarity: 'likely', frequency: 0.55, seasonFrequencies: { spring: 55, summer: 65, fall: 55, winter: 35 }, peakWindow: { startMonthDay: '05-15', endMonthDay: '06-30', label: 'Peak fawning: mid-May – June' }, rationale: 'Pronghorn herds in grasslands near the north entrance; fawns May-June; year-round but more dispersed in cold high-desert winter.' },
      'crystal-forest': { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 50, summer: 60, fall: 50, winter: 30 }, peakWindow: { startMonthDay: '05-15', endMonthDay: '06-30', label: 'Peak fawning: mid-May – June' }, rationale: 'Pronghorn across the southern grassland zone; reduced winter.' },
    },
    'Black-tailed Jackrabbit': {
      'crystal-forest': { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 50, summer: 50, fall: 45, winter: 35 }, rationale: 'Jackrabbits in shrub-grasslands at dawn/dusk; year-round resident, slightly less visible in cold winter.' },
    },
  },

  // ── Haleakala (round 5) ─────────────────────────────────────────────
  haleakala: {
    'Hawaiian Goose': {
      'summit':      {
        rarity: 'guaranteed',
        frequency: 0.92,
        seasonFrequencies: { spring: 90, summer: 88, fall: 92, winter: 95 },
        rationale: 'Nene walk freely around the summit visitor center and parking lot year-round; breeding season (Oct–Mar) concentrates them at higher elevations.',
      },
      'hosmer-grove':{ rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 70, summer: 65, fall: 72, winter: 75 }, rationale: 'Nene at Hosmer Grove campground year-round; tropical alpine — no migration, mild breeding-season uptick.' },
    },
  },

  // ── Wind Cave (round 5) ─────────────────────────────────────────────
  windcave: {
    'American Bison': {
      'prairie-loop':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 85, summer: 90, fall: 85, winter: 70 }, peakWindow: { startMonthDay: '07-15', endMonthDay: '08-15', label: 'Peak rut: mid-July – mid-Aug' }, rationale: 'Free-ranging bison herd of ~400 visible across the wildlife loop year-round (SD prairie winters cold but herd stays).' },
    },
    'Pronghorn': {
      'prairie-loop':  { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 85, fall: 75, winter: 30 }, rationale: 'Pronghorn herds across the prairie zone; reduced/dispersed in deep winter.' },
    },
    'Black-tailed Prairie Dog': {
      'prairie-loop':  { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 95, summer: 99, fall: 80, winter: 12 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '08-31', label: 'Peak active season: April – August' }, rationale: 'Multiple prairie dog towns visible from the wildlife loop; winter torpor sharply reduces surface activity.' },
    },
    'Mule Deer': {
      'prairie-loop':  { rarity: 'likely', frequency: 0.50, seasonFrequencies: { spring: 48, summer: 50, fall: 58, winter: 42 }, rationale: 'Mule Deer in canyons and ravines at edges of prairie; fall rut bump, year-round resident.' },
    },
    'Coyote': {
      'prairie-loop':  { rarity: 'likely', frequency: 0.45, seasonFrequencies: { spring: 45, summer: 40, fall: 45, winter: 55 }, rationale: 'Coyotes hunting prairie dogs at dawn/dusk; winter snow-contrast boost.' },
    },
  },

  // ── Mt Rainier (round 4) ────────────────────────────────────────────
  mountrainier: {
    'Hoary Marmot': {
      'paradise': {
        rarity: 'guaranteed',
        frequency: 0.92,
        seasonFrequencies: { spring: 30, summer: 95, fall: 70, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Hoary Marmots sun on rocks at Paradise meadows in July-August — visible from any subalpine trail.',
      },
      'sunrise': {
        rarity: 'very_likely',
        frequency: 0.80,
        rationale: 'Marmots in alpine meadows at Sunrise; lower density than Paradise but still routine.',
      },
    },
    'Mule Deer': {
      'paradise': { rarity: 'very_likely', frequency: 0.75, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' }, rationale: 'Habituated deer in Paradise meadows year-round (when accessible); rut increases activity Oct-Nov.' },
      'longmire': { rarity: 'likely',      frequency: 0.50, rationale: 'Deer regularly visible in Longmire meadows.' },
    },
    'American Black Bear': {
      'paradise':    { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 22, summer: 25, fall: 20, winter: 1 }, peakWindow: { startMonthDay: '08-01', endMonthDay: '09-30', label: 'Peak berry season: Aug – Sept' }, rationale: 'Black bears occasionally seen in Paradise/Sunrise meadows; berry season Aug-Sept brings them to subalpine zones; denning in winter.' },
    },
    "Clark's Nutcracker": {
      'sunrise':     { rarity: 'very_likely', frequency: 0.80, rationale: "Clark's Nutcrackers cache whitebark pine seeds at Sunrise — visible at every visit in summer." },
    },
    // Note: Roosevelt Elk override removed — Mt Rainier's Carbon River elk are
    // too sparse in iNat data for the build pipeline to include, so the
    // override silently failed (caught by auditDataQuality.js).
  },

  // ── Death Valley (round 4) ──────────────────────────────────────────
  deathvalley: {
    'Coyote': {
      'furnace-creek': { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 75, summer: 55, fall: 70, winter: 80 }, rationale: 'Habituated coyotes routinely visible at Furnace Creek — campground, golf course, ranch area; summer extreme heat reduces daytime activity, peak winter (mild, peak visitor season).' },
      'stovepipe-wells': { rarity: 'likely',    frequency: 0.45, seasonFrequencies: { spring: 50, summer: 30, fall: 45, winter: 55 }, rationale: 'Coyotes regularly visible at Stovepipe Wells village; summer heat suppresses daytime sightings.' },
    },
    'Common Raven': {
      'furnace-creek': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 95, fall: 99, winter: 99 }, rationale: 'Ravens at every Furnace Creek parking area, campsite, and overlook year-round.' },
      'badwater':      { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 90, fall: 97, winter: 99 }, rationale: 'Ravens patrol the Badwater Basin parking and salt flats; slightly fewer in extreme summer heat.' },
    },
    'Common Side-blotched Lizard': {
      'furnace-creek': { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 85, summer: 75, fall: 75, winter: 30 }, peakWindow: { startMonthDay: '03-01', endMonthDay: '06-30', label: 'Peak active season: March – June (cooler than summer)' }, rationale: 'Side-blotched lizards on every warm-season visit; dormant in cool months. Spring + early summer best — Death Valley summer heat sends them to refugia.' },
    },
    'Desert Bighorn Sheep': {
      'panamint':      { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 25, summer: 15, fall: 22, winter: 22 }, rationale: 'Desert bighorn at Panamint range — visible to dedicated hikers but not casual visitors; year-round desert resident, slightly lower in extreme summer heat.' },
    },
  },

  // ── Joshua Tree (round 4) ───────────────────────────────────────────
  joshuatree: {
    'Common Side-blotched Lizard': {
      'hidden-valley':  { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 85, winter: 15 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'Side-blotched lizards on every rock at Hidden Valley / Barker Dam in warm season; brumate (dormant) in cold high-desert winter.' },
      'jumbo-rocks':    { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 92, summer: 92, fall: 80, winter: 12 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'Lizards basking on Jumbo Rocks formations; winter brumation.' },
    },
    'Common Chuckwalla': {
      'hidden-valley':  { rarity: 'very_likely', frequency: 0.70, seasonFrequencies: { spring: 75, summer: 85, fall: 55, winter: 1 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '09-30', label: 'Peak active season: April – September' }, rationale: 'Chuckwallas in rocky outcrops at Hidden Valley and Barker Dam; brumation Nov-Mar (winter ~0).' },
    },
    "Gambel's Quail": {
      'cottonwood':     { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 85, summer: 70, fall: 72, winter: 70 }, rationale: "Gambel's Quail coveys at Cottonwood Spring oasis year-round; spring breeding-season vocal peak." },
    },
    'Cactus Wren': {
      'cottonwood':     { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 99, summer: 90, fall: 92, winter: 90 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '06-30', label: 'Peak breeding: April – June' }, rationale: 'Cactus Wrens nesting in cholla and yucca at Cottonwood Spring; non-migratory desert resident, vocal in breeding season.' },
      'hidden-valley':  { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 92, summer: 82, fall: 82, winter: 80 }, peakWindow: { startMonthDay: '04-01', endMonthDay: '06-30', label: 'Peak breeding: April – June' }, rationale: 'Cactus Wrens vocal at every Hidden Valley trailhead; year-round resident.' },
    },
    'Common Raven': {
      'keys-view':      { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 95, fall: 97, winter: 92 }, rationale: 'Ravens patrol Keys View overlook constantly year-round.' },
      'jumbo-rocks':    { rarity: 'very_likely', frequency: 0.85, seasonFrequencies: { spring: 88, summer: 82, fall: 85, winter: 80 }, rationale: 'Ravens on Jumbo Rocks formations and campground year-round.' },
    },
  },

  // ── Sequoia (round 4) ───────────────────────────────────────────────
  sequoia: {
    'Mule Deer': {
      'giant-forest': {
        rarity: 'guaranteed',
        frequency: 0.92,
        seasonFrequencies: { spring: 88, summer: 92, fall: 99, winter: 75 },
        peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' },
        rationale: 'Deer routinely browse Round Meadow and Crescent Meadow visible from any visitor trail; rut peaks fall; some descend to lower elevations in deep-snow winter.',
      },
    },
    "Steller's Jay": {
      'giant-forest': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 95, winter: 88 }, rationale: "Steller's Jays at every Giant Forest campground and picnic area year-round." },
    },
    'American Black Bear': {
      'giant-forest': {
        rarity: 'unlikely',
        frequency: 0.18,
        seasonFrequencies: { spring: 20, summer: 25, fall: 22, winter: 2 },
        rationale: 'Black bears in Giant Forest area — most active dawn/dusk; denning in winter.',
      },
    },
    'Yellow-bellied Marmot': {
      'mineral-king': {
        rarity: 'very_likely',
        frequency: 0.75,
        seasonFrequencies: { spring: 30, summer: 90, fall: 60, winter: 1 },
        peakWindow: { startMonthDay: '07-01', endMonthDay: '08-31', label: 'Peak: July – August' },
        rationale: 'Mineral King marmots are notorious for chewing car wires — sun on rocks throughout sub-alpine zones July-Aug.',
      },
    },
  },

  // ── Shenandoah (round 4) ────────────────────────────────────────────
  shenandoah: {
    'White-tailed Deer': {
      'skyline-central': {
        rarity: 'guaranteed',
        frequency: 0.98,
        seasonFrequencies: { spring: 95, summer: 97, fall: 99, winter: 75 },
        rationale: 'Big Meadows area has the densest deer population — herd visible to virtually every casual visitor; Skyline Drive may close in winter snow/ice.',
      },
      'skyline-north':   { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 92, summer: 95, fall: 97, winter: 70 }, rationale: 'Deer along Skyline Drive in the north district at meadow pull-offs; winter road-closure risk.' },
      'skyline-south':   { rarity: 'guaranteed', frequency: 0.93, seasonFrequencies: { spring: 90, summer: 93, fall: 95, winter: 65 }, rationale: 'Deer at south district meadows and overlooks; winter road-closure risk.' },
    },
    'Black Bear': {
      'skyline-central': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 40, summer: 50, fall: 45, winter: 5 },
        rationale: 'Big Meadows area has the highest bear sighting rate — dawn/dusk pull-offs common reports.',
      },
      'skyline-north':   { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 32, fall: 28, winter: 2 }, rationale: 'Bears in north district, less concentrated than central; denning in winter.' },
    },
    'American Black Bear': {
      'skyline-central': {
        rarity: 'likely',
        frequency: 0.40,
        seasonFrequencies: { spring: 40, summer: 50, fall: 45, winter: 5 },
        rationale: 'Same as Black Bear at Big Meadows; cache uses American Black Bear canonical name.',
      },
    },
    'Wild Turkey': {
      'skyline-central': { rarity: 'very_likely', frequency: 0.75, rationale: 'Wild Turkey flocks in Big Meadows fields.' },
    },
  },

  // ── Zion ────────────────────────────────────────────────────────────
  zion: {
    'Desert Bighorn Sheep': {
      'east-zion': {
        rarity: 'likely',
        frequency: 0.50,
        seasonFrequencies: { spring: 55, summer: 45, fall: 55, winter: 45 },
        rationale: 'Desert bighorn reliably visible on cliffs along the Mt Carmel Highway / East Zion area year-round (desert species, no hibernation/migration).',
      },
      'main-canyon': {
        rarity: 'unlikely',
        frequency: 0.20,
        seasonFrequencies: { spring: 22, summer: 18, fall: 22, winter: 18 },
        rationale: 'Bighorn occasionally visible from canyon trails but less concentrated than East Zion.',
      },
    },
    'Mule Deer': {
      'main-canyon': {
        rarity: 'guaranteed',
        frequency: 0.92,
        seasonFrequencies: { spring: 92, summer: 90, fall: 95, winter: 85 },
        rationale: 'Mule deer browse the canyon meadows along Riverside Walk and visitor center on essentially every visit year-round (mild low-desert canyon climate).',
      },
    },
    'Rock Squirrel': {
      'main-canyon': {
        rarity: 'guaranteed',
        frequency: 0.95,
        seasonFrequencies: { spring: 95, summer: 99, fall: 90, winter: 55 },
        rationale: 'Habituated rock squirrels at every canyon overlook and trail; less active in winter cold.',
      },
    },
  },

  // ── Yosemite (expanded) ─────────────────────────────────────────────
  yosemite: {
    'Mule Deer': {
      'valley': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 92, summer: 95, fall: 99, winter: 85 }, peakWindow: { startMonthDay: '10-15', endMonthDay: '11-30', label: 'Peak rut: mid-Oct – Nov' }, rationale: 'Habituated deer in Cook\'s Meadow and Stoneman Meadow — essentially every Valley visitor sees them; rut peaks fall; year-round resident.' },
      'tuolumne': { rarity: 'very_likely', frequency: 0.80, seasonFrequencies: { spring: 30, summer: 90, fall: 80, winter: 1 }, rationale: 'Deer in Tuolumne Meadows visible from any pullout in summer; Tioga Road closed Oct-May/June.' },
    },
    'American Black Bear': {
      'valley':       { rarity: 'unlikely', frequency: 0.15, seasonFrequencies: { spring: 15, summer: 20, fall: 18, winter: 1 }, rationale: 'Despite bear-aware messaging, casual Valley visitors see bears on ~15% of summer trips; minimal winter (denning).' },
      'tuolumne':     { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 1, summer: 25, fall: 30, winter: 1 }, peakWindow: { startMonthDay: '08-01', endMonthDay: '09-30', label: 'Peak berry season: Aug – Sept' }, rationale: 'Tuolumne Meadows campers report regular bear activity at dusk; berry season Aug-Sept; Tioga Road closed cold months.' },
      'high-country': { rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 1, summer: 25, fall: 28, winter: 1 }, peakWindow: { startMonthDay: '08-01', endMonthDay: '09-30', label: 'Peak berry season: Aug – Sept' }, rationale: 'Backcountry bear sightings are common but not guaranteed; high country inaccessible most of year.' },
    },
    "Steller's Jay": {
      'valley':       { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 95, fall: 95, winter: 90 }, rationale: 'Steller\'s Jays at every Valley campground and picnic area year-round.' },
      'tuolumne':     { rarity: 'guaranteed', frequency: 0.92, seasonFrequencies: { spring: 30, summer: 95, fall: 88, winter: 1 }, rationale: 'Steller\'s Jays at Tuolumne Meadows campground; Tioga Road closed cold months.' },
    },
    'California Ground Squirrel': {
      'valley':       { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 99, fall: 90, winter: 50 }, rationale: 'Habituated ground squirrels at every Valley overlook; less active in winter cold.' },
    },
    'Coyote': {
      'valley':       { rarity: 'unlikely', frequency: 0.25, seasonFrequencies: { spring: 25, summer: 22, fall: 25, winter: 30 }, rationale: 'Coyotes in Valley meadows at dawn/dusk; winter visibility boost (snow contrast).' },
    },
  },

  // ── Grand Canyon (expanded) ─────────────────────────────────────────
  grandcanyon: {
    'California Condor': {
      'south-rim':  { rarity: 'unlikely', frequency: 0.15, seasonFrequencies: { spring: 18, summer: 18, fall: 15, winter: 8 }, rationale: 'Condor releases at Vermilion Cliffs put them visible from South Rim more often than other locations; lower in winter cold.' },
      'desert-view':{ rarity: 'unlikely', frequency: 0.20, seasonFrequencies: { spring: 22, summer: 25, fall: 18, winter: 10 }, rationale: 'Navajo Bridge / Desert View area is a documented condor flyway; thermal-soaring days in warm months are best.' },
    },
    'Common Raven': {
      'south-rim': { rarity: 'guaranteed', frequency: 0.99, seasonFrequencies: { spring: 99, summer: 99, fall: 99, winter: 95 }, rationale: 'Ravens at every overlook — South Rim visitors see them on essentially every visit, year-round resident.' },
      'desert-view': { rarity: 'guaranteed', frequency: 0.97, seasonFrequencies: { spring: 97, summer: 97, fall: 97, winter: 90 }, rationale: 'Ravens at Desert View Watchtower constantly.' },
      'north-rim': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 90, summer: 97, fall: 95, winter: 5 }, rationale: 'Ravens common at all North Rim overlooks; North Rim closed winter (Oct-May).' },
    },
    'Rock Squirrel': {
      'south-rim': { rarity: 'guaranteed', frequency: 0.95, seasonFrequencies: { spring: 95, summer: 99, fall: 90, winter: 60 }, rationale: 'Habituated rock squirrels begging at every South Rim overlook; less active in winter cold.' },
    },
    'Mule Deer': {
      'south-rim': { rarity: 'very_likely', frequency: 0.75, seasonFrequencies: { spring: 75, summer: 70, fall: 80, winter: 65 }, rationale: 'Habituated deer in Grand Canyon Village and along South Rim corridor; year-round resident.' },
      'north-rim': { rarity: 'likely',      frequency: 0.55, seasonFrequencies: { spring: 50, summer: 75, fall: 60, winter: 1 }, rationale: 'Deer in meadow areas of North Rim; North Rim closed winter (Oct-May).' },
    },
    'Elk': {
      'south-rim': { rarity: 'likely',      frequency: 0.40, seasonFrequencies: { spring: 40, summer: 35, fall: 50, winter: 35 }, rationale: 'Elk regularly visible in South Rim Village area at dawn/dusk; fall rut bump.' },
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
