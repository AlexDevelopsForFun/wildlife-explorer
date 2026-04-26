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
export const DETECTABILITY_REVIEWED_AT = '2026-04-25';

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
