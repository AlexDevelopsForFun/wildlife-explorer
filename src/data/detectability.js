/**
 * detectability.js — per-species "how cryptic is this species" axis.
 *
 * Separate from the rarity tier (which is about population density × encounter
 * probability). Detectability captures the population-to-sighting translation:
 *   - A "cryptic" species can be genuinely abundant in a park and still produce
 *     near-zero casual visitor sightings (mountain lion, wolverine, secretive
 *     small mammals).
 *   - A "trivial" species can have a small population and still produce
 *     near-100% sightings if it concentrates at visible sites (alligator on a
 *     boardwalk, bison in an open valley).
 *
 * Why this exists separately from rarity:
 *   The build pipeline derives most rarity tiers from iNaturalist observation
 *   counts. iNat counts already bake in some detection bias (cryptic species
 *   are under-photographed) but the bias is uneven: charismatic-but-cryptic
 *   species (cougars) are over-reported when seen, while small cryptic species
 *   (shrews) are massively under-reported. NPSpecies abundance is a separate
 *   guardrail (population density), and detectability completes the trio
 *   (population → detectability → sighting probability).
 *
 * How it's applied (src/App.jsx::computeEffectiveRarity):
 *   - When NO zone is active (zones are context-aware and already encode the
 *     species' visible-context behavior), the detectability ceiling caps the
 *     park-level pill. A cryptic species can't display higher than 'unlikely'
 *     even if iNat says 'guaranteed' — sightings just don't happen at that
 *     rate for casual visitors at a generic location.
 *   - We DON'T apply a detectability floor — the data already knows when
 *     a species is rarely observed; we don't want to inflate exceptional
 *     species artificially.
 *
 * Default: every species not listed below is treated as 'moderate' (no cap).
 *
 * Calibration: see scripts/rarityAnchors.json — anchors that test cryptic
 * species (cougar, etc.) verify that the ceiling produces sensible pills.
 */

export const DETECTABILITY_LEVELS = {
  // 'trivial' — actively reserved; not currently used as a constraint, only
  //             as documentation. Trivial species naturally float to the top
  //             via their iNat counts; no engineering needed.
  trivial:  { label: 'Hard to miss',  ceiling: null,            tooltip: 'Highly visible — nearly all visitors see this when present.' },
  easy:     { label: 'Conspicuous',   ceiling: null,            tooltip: 'Routinely visible to attentive visitors.' },
  moderate: { label: 'Findable',      ceiling: null,            tooltip: 'Default — neither hidden nor unmistakable.' },
  hard:     { label: 'Elusive',       ceiling: 0.40,            tooltip: 'Findable with patience but not routine — capped at "likely" tier even if population is high.' },
  cryptic:  { label: 'Cryptic',       ceiling: 0.20,            tooltip: 'Rarely seen by casual visitors regardless of population density — capped at "unlikely" tier.' },
  // Helpful caveat: when a popup zone is active, the zone's own rarity wins —
  // detectability ceilings DO NOT apply, because zones encode visible-context
  // behavior (Lamar wolves, Brooks Falls bears, etc.).
};

// ── Per-species detectability (highest-confidence cases) ─────────────────
// Add a species here only when you have strong empirical evidence that the
// pipeline-derived rarity tier overstates the casual visitor sighting rate.
// When in doubt, leave the species off this table (defaults to 'moderate').
//
// Curation discipline: bump DETECTABILITY_REVIEWED_AT below when adding or
// changing entries.
export const DETECTABILITY_REVIEWED_AT = '2026-05-14';

export const SPECIES_DETECTABILITY = {
  // ── Hard (capped at "likely" max) ──────────────────────────────────────
  // Findable but not routine — cap protects against iNat data over-stating
  // casual visitor sighting rate when the true encounter is more like a
  // 1-in-3 chance for a dedicated effort.
  'Coyote':                    'hard',  // Highly visible in some parks (Yellowstone valleys) but elusive at most
  'Red Fox':                   'hard',
  'Gray Fox':                  'hard',
  'Bobcat':                    'hard',
  'Canada Lynx':               'hard',
  'American Marten':           'hard',
  'Fisher':                    'hard',
  'Long-tailed Weasel':        'hard',
  'Ermine':                    'hard',
  'River Otter':               'hard',
  'North American River Otter':'hard',
  'American Beaver':           'hard',  // Conspicuous lodges, but the animal itself is mostly nocturnal/elusive
  'Spotted Owl':               'hard',
  'Northern Goshawk':          'hard',
  'Boreal Owl':                'hard',
  'Black-backed Woodpecker':   'hard',

  // ── Cryptic (capped at "unlikely" max) ─────────────────────────────────
  // Sightings are genuinely exceptional regardless of population.
  'Mountain Lion':             'cryptic',
  'Cougar':                    'cryptic',
  'Puma':                      'cryptic',
  'Florida Panther':           'cryptic',
  'Wolverine':                 'cryptic',
  'Mountain Beaver':           'cryptic',
  'Pacific Marten':            'cryptic',
  'American Pine Marten':      'cryptic',
  'Pygmy Owl':                 'cryptic',
  'Northern Pygmy-Owl':        'cryptic',
  'Flammulated Owl':           'cryptic',
  'Spotted Skunk':             'cryptic',
  'Western Spotted Skunk':     'cryptic',
  'Ringtail':                  'cryptic',
  'Kit Fox':                   'cryptic',
  // Salamanders & secretive herps — almost never seen on a casual hike
  'Hellbender':                'cryptic',
  'Mudpuppy':                  'cryptic',
  // Very small mammals where iNat undercounts hugely but sightings are also
  // genuinely exceptional for casual visitors
  'Shrew':                     'cryptic',
  'Vole':                      'cryptic',

  // ── Round 2 expansion (2026-04-25): ~50 more entries ──────────────
  // Drawn from species that show up in multiple parks at "very_likely" or
  // "guaranteed" tiers per iNat obs counts but where casual visitor sighting
  // rate is genuinely much lower (cryptic / nocturnal / fossorial / habitat
  // specialist). Each entry caps the displayed pill at the tier ceiling
  // even if the iNat-derived rarity would otherwise place it higher.

  // ── Cryptic small mammals (cap: unlikely) ──────────────────────────
  'Northern Flying Squirrel':  'cryptic',  // strictly nocturnal, rarely seen
  'Southern Flying Squirrel':  'cryptic',
  'Humboldt\'s Flying Squirrel':'cryptic',
  'Pacific Jumping Mouse':     'cryptic',
  'Western Jumping Mouse':     'cryptic',
  'Meadow Jumping Mouse':      'cryptic',
  'Deer Mouse':                'cryptic',
  'White-footed Mouse':        'cryptic',
  'Northwestern Deer Mouse':   'cryptic',
  'Brush Deermouse':           'cryptic',
  'Pinyon Mouse':              'cryptic',
  'Pocket Gopher':             'cryptic',  // fossorial, mounds visible but animal not
  'Western Pocket Gopher':     'cryptic',
  'Botta\'s Pocket Gopher':    'cryptic',
  'Mountain Pocket Gopher':    'cryptic',
  'Pacific Mole':              'cryptic',  // fossorial
  'Coast Mole':                'cryptic',
  'American Shrewmole':        'cryptic',
  'Vagrant Shrew':             'cryptic',
  'Trowbridge\'s Shrew':       'cryptic',
  'Masked Shrew':              'cryptic',
  'Northern Short-tailed Shrew':'cryptic',
  'Pygmy Shrew':               'cryptic',
  'Water Shrew':               'cryptic',
  'Long-tailed Vole':          'cryptic',
  'Meadow Vole':               'cryptic',
  'Red-backed Vole':           'cryptic',
  'California Vole':           'cryptic',
  'Western Heather Vole':      'cryptic',
  'Sagebrush Vole':            'cryptic',
  'Bushy-tailed Woodrat':      'cryptic',  // mostly nocturnal in middens
  'White-throated Woodrat':    'cryptic',
  'Desert Woodrat':            'cryptic',

  // ── Cryptic small carnivores (cap: unlikely) ───────────────────────
  'Least Weasel':              'cryptic',
  'Short-tailed Weasel':       'cryptic',
  'American Mink':             'cryptic',  // semi-aquatic, mostly crepuscular
  'Mink':                      'cryptic',

  // ── Cryptic herps (cap: unlikely) ──────────────────────────────────
  'Northern Two-lined Salamander':'cryptic',
  'Red-backed Salamander':     'cryptic',
  'Eastern Newt':              'cryptic',  // adults under cover, larvae aquatic
  'Rough-skinned Newt':        'cryptic',
  'California Newt':           'cryptic',
  'Pacific Giant Salamander':  'cryptic',
  'Spotted Salamander':        'cryptic',
  'Tiger Salamander':          'cryptic',
  'Mole Salamander':           'cryptic',
  'Eastern Hognose Snake':     'cryptic',  // fossorial, often plays dead
  'Western Hognose Snake':     'cryptic',
  'Ring-necked Snake':         'cryptic',  // small, secretive
  'Sharp-tailed Snake':        'cryptic',
  'Rubber Boa':                'cryptic',  // nocturnal, fossorial
  'Smooth Greensnake':         'cryptic',
  'Brown Snake':               'cryptic',
  'Northern Brown Snake':      'cryptic',

  // ── Hard (cap: likely) — findable but not routine for casual visitor ──
  'Lynx':                      'hard',
  'Striped Skunk':             'hard',  // strictly nocturnal but visible at night
  'Common Raccoon':            'hard',  // nocturnal but suburban-park edge sightings
  'Western Screech-Owl':       'hard',
  'Eastern Screech-Owl':       'hard',
  'Short-eared Owl':           'hard',
  'Pileated Woodpecker':       'hard',  // large but forest-canopy
  'White-headed Woodpecker':   'hard',
  'Lewis\'s Woodpecker':       'hard',
  'American Three-toed Woodpecker':'hard',

  // ── More cryptic owls (cap: unlikely) ──────────────────────────────
  'Northern Saw-whet Owl':     'cryptic',
  'Long-eared Owl':            'cryptic',
  'Great Gray Owl':            'cryptic',
  'Northern Hawk Owl':         'cryptic',
  'Mexican Spotted Owl':       'cryptic',
  // Note: 'Spotted Owl' already in 'hard' (line 78) — leaving as-is to avoid
  // changing existing classification. Mexican Spotted Owl handled separately.

  // ── Round 3 expansion (2026-05-14): bats, nightbirds, more herps ──
  // Bats: nearly all bat species are cryptic for casual visitors. They're
  // photographed by researchers at roosts/maternity sites, inflating iNat
  // counts, but day visitors see them only as fast silhouettes at dusk.
  'Little Brown Bat':          'cryptic',
  'Big Brown Bat':             'cryptic',
  'Silver-haired Bat':         'cryptic',
  'Hoary Bat':                 'cryptic',
  'Eastern Red Bat':           'cryptic',
  'Western Red Bat':           'cryptic',
  'Townsend\'s Big-eared Bat': 'cryptic',
  'Pallid Bat':                'cryptic',
  'California Myotis':         'cryptic',
  'Yuma Myotis':               'cryptic',
  'Long-eared Myotis':         'cryptic',
  'Long-legged Myotis':        'cryptic',
  'Western Small-footed Myotis':'cryptic',
  'Tricolored Bat':            'cryptic',
  'Northern Long-eared Bat':   'cryptic',
  // NB: Brazilian / Mexican Free-tailed Bat intentionally NOT classified.
  // These species concentrate at the Carlsbad Caverns natural entrance for
  // the NPS evening bat-flight program — a formal, reliable visitor
  // experience. A park-level 'cryptic' cap would underrate the Carlsbad
  // anchor by 3 tiers (calibration regressed 0.27 → 0.37 when added).
  // At parks WITHOUT a bat-flight program the iNat/eBird tier already
  // converges to 'unlikely'/'rare' on its own — no detectability cap
  // needed.

  // ── Cryptic nightjars / nighthawks (cap: unlikely) ─────────────────
  // Calling at dusk/night, roost camouflaged on the ground or branches by day.
  'Common Nighthawk':          'hard',  // visible aerial-feeding at dusk = hard, not cryptic
  'Lesser Nighthawk':          'hard',
  'Common Poorwill':           'cryptic',
  'Eastern Whip-poor-will':    'cryptic',
  'Mexican Whip-poor-will':    'cryptic',
  'Chuck-will\'s-widow':       'cryptic',

  // ── Cryptic forest birds (cap: unlikely) ───────────────────────────
  // Skulkers and canopy specialists where visual sightings are rare even
  // when birds are vocal and abundant.
  'Yellow-billed Cuckoo':      'cryptic',  // sneaky canopy
  'Black-billed Cuckoo':       'cryptic',
  'Black Rail':                'cryptic',
  'Yellow Rail':               'cryptic',
  'Virginia Rail':             'cryptic',
  'Sora':                      'hard',  // calls heard, sometimes seen at marsh edges
  'American Bittern':          'cryptic',  // master of camouflage
  'Least Bittern':             'cryptic',
  'Northern Saw-whet Owl':     'cryptic',  // (duplicate; harmless — JS object keys are last-wins)

  // ── Cryptic snakes (cap: unlikely) ─────────────────────────────────
  'Worm Snake':                'cryptic',
  'Eastern Worm Snake':        'cryptic',
  'Mud Snake':                 'cryptic',  // burrowing, secretive
  'Rainbow Snake':             'cryptic',
  'Pine Snake':                'cryptic',  // fossorial
  'Gopher Snake':              'hard',     // big and conspicuous when crossing roads
  'Glossy Snake':              'cryptic',
  'Long-nosed Snake':          'cryptic',
  'Western Shovel-nosed Snake':'cryptic',
  'Lyre Snake':                'cryptic',
  'Night Snake':               'cryptic',  // nocturnal

  // ── Cryptic salamanders / amphibians (cap: unlikely) ───────────────
  'Slimy Salamander':          'cryptic',
  'Northern Slimy Salamander': 'cryptic',
  'Long-toed Salamander':      'cryptic',
  'Pacific Newt':              'cryptic',
  'Spring Salamander':         'cryptic',
  'Dusky Salamander':          'cryptic',
  'Northern Dusky Salamander': 'cryptic',
  'Two-toed Amphiuma':         'cryptic',  // aquatic + nocturnal
  'Greater Siren':             'cryptic',
  'Lesser Siren':              'cryptic',

  // ── Cryptic small carnivores not yet covered (cap: unlikely) ───────
  'Swift Fox':                 'cryptic',  // grassland, shy
  'Long-tailed Vole':          'cryptic',  // (duplicate; harmless)
  'Black-footed Ferret':       'cryptic',  // endangered, nocturnal, prairie-dog burrows

  // ── Hard nocturnal generalists (cap: likely) ───────────────────────
  // Visible at night/dusk along park roads but easily missed by daytime visitors.
  'Hooded Skunk':              'hard',
  'Common Opossum':            'hard',
  'Virginia Opossum':          'hard',
  'White-nosed Coati':         'hard',  // diurnal but specific habitat
  'Coati':                     'hard',

  // ── Round 4 expansion (2026-05-14): over-tier'd herps ──────────────
  // Snakes, salamanders, frogs & lizards are photographed disproportionately
  // by herpers (inflating iNat counts to guaranteed/very_likely) but a
  // casual visitor on a typical walk almost never encounters them. Audit
  // (over-tier'd-cryptic scan) surfaced these as the worst offenders.

  // Salamanders → cryptic (under cover / nocturnal / aquatic; casual
  // visitors essentially never see them even where abundant)
  'Eastern Red-backed Salamander': 'cryptic',
  'Red-backed Salamander':       'cryptic',
  'Seal Salamander':             'cryptic',
  'Shenandoah Salamander':       'cryptic',
  'Cherokee Blackbelly Salamander':'cryptic',
  'Blue Ridge Two-lined Salamander':'cryptic',
  'Red-cheeked Salamander':      'cryptic',
  'Imitator Salamander':         'cryptic',
  'Northwestern Salamander':     'cryptic',
  'California Slender Salamander':'cryptic',

  // Garter / water / colubrid snakes → hard (baskers, sometimes seen at
  // water edges, but not a routine casual sighting)
  'Common Garter Snake':         'hard',
  'Western Terrestrial Garter Snake':'hard',
  'Northwestern Garter Snake':   'hard',
  'Common Watersnake':           'hard',
  'Brown Watersnake':            'hard',
  'Banded Watersnake':           'hard',
  'Florida Green Watersnake':    'hard',
  'Plain-bellied Watersnake':    'hard',
  'Eastern Ratsnake':            'hard',
  'North American Racer':        'hard',

  // Frogs & toads → hard (heard far more than seen; chorus/treefrogs
  // especially are near-invisible to casual daytime visitors)
  'Pacific Chorus Frog':         'hard',
  'Pacific Treefrog':            'hard',
  'Green Frog':                  'hard',
  'Wood Frog':                   'hard',
  'Cascades Frog':               'hard',
  'Northern Red-legged Frog':    'hard',
  'American Toad':               'hard',
  'Red-spotted Toad':            'hard',
  'Southern Toad':               'hard',
  'Western Toad':                'hard',
  'Cuban Treefrog':              'hard',

  // Skinks & whiptails → hard (fast, brief glimpses; iNat-inflated by
  // dedicated reptile photographers)
  'Western Whiptail':            'hard',
  'Marbled Whiptail':            'hard',
  'Rusty-rumped Whiptail':       'hard',
  'Common Five-lined Skink':     'hard',
  'Southeastern Five-lined Skink':'hard',
  'Broad-headed Skink':          'hard',
};

/**
 * Resolve detectability for an animal, falling back to 'moderate'.
 * Currently a simple name lookup; could later add keyword + animalType
 * heuristics if maintenance becomes burdensome.
 */
export function classifyDetectability(animal) {
  if (!animal?.name) return 'moderate';
  return SPECIES_DETECTABILITY[animal.name] ?? 'moderate';
}

/**
 * Returns the detectability frequency ceiling (0-1) for an animal, or null
 * if no constraint applies. Returning null lets the caller skip the cap
 * computation entirely.
 */
export function detectabilityCeiling(animal) {
  const level = classifyDetectability(animal);
  return DETECTABILITY_LEVELS[level]?.ceiling ?? null;
}
