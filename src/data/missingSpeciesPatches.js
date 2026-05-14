/**
 * missingSpeciesPatches.js — runtime injection of flagship species the
 * build pipeline keeps dropping.
 *
 * Why this file exists: scripts/auditDataQuality.js surfaced ~17 silent
 * override failures where hand-curated park-specific rarity overrides
 * targeted species that simply aren't in the cache for that park. In every
 * case the species IS genuinely present at the park (the override was
 * curated by someone who knew the park's wildlife) — but the iNat / eBird /
 * NPS pipeline either filters them out (taxonomic split, naming difference,
 * insufficient observation count) or they fall below the per-park species
 * cap during dedup.
 *
 * Examples (all flagship species at their respective parks):
 *   • Roosevelt Elk at Redwood (Prairie Creek herd is THE iconic species)
 *   • Utah Prairie Dog at Bryce Canyon (named for the area; it's everywhere)
 *   • Moose at Voyageurs (well-documented resident population)
 *   • Mexican Free-tailed Bat at Carlsbad / Mammoth (the bat-flight program
 *     is the headline visitor experience)
 *   • Mule Deer at Olympic (subspecies Black-tailed merged taxonomically)
 *
 * Rather than block on a multi-day cache-pipeline debug, inject these
 * species at cache-load time as synthetic entries. They get the override's
 * curated rarity directly + a reasonable scientificName + a curator note
 * explaining why they're patched-in rather than data-derived.
 *
 * Each entry includes:
 *   parkId            — matches src/wildlifeData.js park IDs
 *   name              — common name as it should display
 *   scientificName    — Latin binomial (so iNat histogram / dedupe works)
 *   animalType        — bird/mammal/reptile/amphibian/marine/insect
 *   rarity            — initial tier (overrides will further refine)
 *   frequency         — explicit probability if known
 *   funFact / rationale — curator note explaining the patch
 *
 * The cache loader's _patchMissingFlagshipSpecies pass adds these entries
 * to each park's animals[] only when no existing entry has the same name
 * or scientificName. Idempotent and safe across rebuilds — once the build
 * script starts including these naturally, the patch becomes a no-op.
 *
 * Curation: bump MISSING_SPECIES_REVIEWED_AT when adding/changing entries.
 */

export const MISSING_SPECIES_REVIEWED_AT = '2026-05-14';

export const MISSING_SPECIES_PATCHES = [
  // ── Redwood: Roosevelt Elk (Prairie Creek herd is the flagship) ────
  {
    parkId: 'redwood',
    name: 'Roosevelt Elk',
    scientificName: 'Cervus canadensis roosevelti',
    animalType: 'mammal',
    rarity: 'guaranteed',
    frequency: 0.92,
    funFact: 'Prairie Creek and Gold Bluffs Beach host one of the largest Roosevelt Elk herds in California. Visible to nearly every visitor.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },

  // ── Bryce Canyon: Utah Prairie Dog (endangered, the iconic species) ─
  {
    parkId: 'brycecanyon',
    name: 'Utah Prairie Dog',
    scientificName: 'Cynomys parvidens',
    animalType: 'mammal',
    rarity: 'very_likely',
    frequency: 0.70,
    funFact: 'Endangered Utah Prairie Dogs reintroduced to Bryce in 1974. The Fairyland / Sunrise Point area hosts one of the largest colonies in their range.',
    seasons: ['spring', 'summer', 'fall'],
    seasonFrequencies: { spring: 70, summer: 80, fall: 60, winter: 1 },
    activityPeriod: 'diurnal',
  },

  // ── Carlsbad Caverns: Mexican Free-tailed Bat (the bat-flight program) ─
  {
    parkId: 'carlsbadcaverns',
    name: 'Mexican Free-tailed Bat',
    scientificName: 'Tadarida brasiliensis',
    animalType: 'mammal',
    rarity: 'guaranteed',
    frequency: 0.97,
    funFact: 'Hundreds of thousands of Mexican Free-tailed Bats emerge from the natural entrance nightly May-October. The evening Bat Flight Program is the headline visitor experience.',
    seasons: ['spring', 'summer', 'fall'],
    seasonFrequencies: { spring: 60, summer: 99, fall: 75, winter: 1 },
    activityPeriod: 'nocturnal',
  },

  // ── Mammoth Cave: Little Brown Bat ─────────────────────────────────
  {
    parkId: 'mammothcave',
    name: 'Little Brown Bat',
    scientificName: 'Myotis lucifugus',
    animalType: 'mammal',
    rarity: 'unlikely',
    frequency: 0.20,
    funFact: 'Resident bat species in Mammoth Cave system. Population reduced by white-nose syndrome since 2010s — sightings during cave tours uncommon but real.',
    seasons: ['spring', 'summer', 'fall'],
    activityPeriod: 'nocturnal',
  },

  // ── Voyageurs: Moose ────────────────────────────────────────────────
  {
    parkId: 'voyageurs',
    name: 'Moose',
    scientificName: 'Alces alces',
    animalType: 'mammal',
    rarity: 'unlikely',
    frequency: 0.20,
    funFact: 'Voyageurs has a documented resident moose population concentrated on the Kabetogama Peninsula. Best chance is along the Locator Lake trail.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },

  // ── Voyageurs: River Otter ──────────────────────────────────────────
  {
    parkId: 'voyageurs',
    name: 'North American River Otter',
    scientificName: 'Lontra canadensis',
    animalType: 'mammal',
    rarity: 'unlikely',
    frequency: 0.20,
    funFact: 'River otters along Voyageurs lake shores — most reliable for boaters who scan rocky ledges.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },

  // ── Olympic: Black-tailed Deer (the Mule Deer subspecies on Olympic Pen.) ─
  {
    parkId: 'olympic',
    name: 'Columbian Black-tailed Deer',
    scientificName: 'Odocoileus hemionus columbianus',
    animalType: 'mammal',
    rarity: 'guaranteed',
    frequency: 0.95,
    funFact: 'The Mule Deer subspecies of the Olympic Peninsula. Habituated deer at Hurricane Ridge meadows and parking area — visible to nearly every visitor.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },

  // ── Great Basin: Pronghorn ──────────────────────────────────────────
  {
    parkId: 'greatbasin',
    name: 'Pronghorn',
    scientificName: 'Antilocapra americana',
    animalType: 'mammal',
    rarity: 'likely',
    frequency: 0.40,
    funFact: 'Pronghorn herds in the Snake Valley sage flats below the park — visible from the entrance road and lower elevations.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'diurnal',
  },

  // ── Guadalupe Mountains: Elk ────────────────────────────────────────
  {
    parkId: 'guadalupemountains',
    name: 'Elk',
    scientificName: 'Cervus canadensis',
    animalType: 'mammal',
    rarity: 'likely',
    frequency: 0.40,
    funFact: 'Elk reintroduced to the Guadalupe Mountains. McKittrick Canyon and the Bowl host the most reliable populations.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },

  // ── Big Bend: Western Diamond-backed Rattlesnake ───────────────────
  {
    parkId: 'bigbend',
    name: 'Western Diamond-backed Rattlesnake',
    scientificName: 'Crotalus atrox',
    animalType: 'reptile',
    rarity: 'unlikely',
    frequency: 0.20,
    funFact: 'The most commonly encountered rattlesnake at Big Bend, particularly along desert flats at dawn/dusk in spring/summer.',
    seasons: ['spring', 'summer', 'fall'],
    activityPeriod: 'crepuscular',
  },

  // ── Virgin Islands: Sea turtles ─────────────────────────────────────
  {
    parkId: 'virginislands',
    name: 'Green Sea Turtle',
    scientificName: 'Chelonia mydas',
    animalType: 'marine',
    rarity: 'unlikely',
    frequency: 0.25,
    funFact: 'Green Sea Turtles in the seagrass beds of Trunk Bay and Maho Bay — visible to snorkelers.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'diurnal',
  },
  {
    parkId: 'virginislands',
    name: 'Hawksbill Sea Turtle',
    scientificName: 'Eretmochelys imbricata',
    animalType: 'marine',
    rarity: 'rare',
    frequency: 0.08,
    funFact: 'Hawksbill Sea Turtles around the coral reefs of Buck Island — less common than Green Sea Turtles but real.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'diurnal',
  },

  // ── American Samoa: Green Sea Turtle ────────────────────────────────
  {
    parkId: 'americansamoa',
    name: 'Green Sea Turtle',
    scientificName: 'Chelonia mydas',
    animalType: 'marine',
    rarity: 'likely',
    frequency: 0.45,
    funFact: 'Green Sea Turtles at Ofu Island reefs and Tutuila beaches — reliable for snorkelers.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'diurnal',
  },

  // ── REMOVED 2026-05-14: 15 patches no longer needed ─────────────────
  // The following used to be patched in at runtime but are now produced
  // naturally by the build pipeline thanks to the dedup sci-name and
  // NPS not-in-park bug fixes (commit d250cf3 + targeted rebuild):
  //   • Elk at glacier, mountrainier, windcave, petrifiedforest,
  //     theodoreroosevelt, greatsanddunes (dedup sci-name fix)
  //   • Mountain Goat @ rockymountain
  //   • Redpoll @ denali
  //   • Spruce Grouse @ denali
  //   • Boreal Chickadee @ denali
  //   • Bald Eagle @ channelislands
  //   • Red-headed Woodpecker @ deathvalley
  //   • Eastern Meadow Vole @ acadia
  //   • Red Junglefowl @ hawaiivolcanoes
  //   (above 8 fixed via NPS not-in-park override now respecting iNat
  //    evidence ≥10 obs)
  //
  // Regression coverage: scripts/testRarityPipeline.js tests 7-9 guard
  // against re-introduction of either bug.

  // ── Gateway Arch: White-tailed Deer + Red Fox (urban park) ─────────
  {
    parkId: 'gatewayarch',
    name: 'White-tailed Deer',
    scientificName: 'Odocoileus virginianus',
    animalType: 'mammal',
    rarity: 'unlikely',
    frequency: 0.20,
    funFact: 'White-tailed deer occasionally visible at dawn/dusk along the Mississippi riverfront.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },
  {
    parkId: 'gatewayarch',
    name: 'Red Fox',
    scientificName: 'Vulpes vulpes',
    animalType: 'mammal',
    rarity: 'rare',
    frequency: 0.05,
    funFact: 'Red foxes occasionally seen at dawn around the Arch grounds and adjacent green spaces.',
    seasons: ['spring', 'summer', 'fall', 'winter'],
    activityPeriod: 'crepuscular',
  },
];

// Group by parkId for fast lookup
const _byPark = new Map();
for (const entry of MISSING_SPECIES_PATCHES) {
  if (!_byPark.has(entry.parkId)) _byPark.set(entry.parkId, []);
  _byPark.get(entry.parkId).push(entry);
}

export function getMissingSpeciesForPark(parkId) {
  return _byPark.get(parkId) ?? [];
}
