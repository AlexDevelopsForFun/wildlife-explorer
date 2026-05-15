#!/usr/bin/env node
/**
 * scripts/calibrateAgainstAnchors.js
 *
 * Replaces the iNat-self-correlation backtest with externally-anchored
 * calibration. Loads scripts/rarityAnchors.json (hand-curated ground-truth
 * encounter probabilities from NPS bus-tour stats, peer-reviewed studies,
 * operational sighting logs) and scores the static cache against them.
 *
 * Why: the previous backtestRarity.js used iNat research-grade obs counts
 * as both training and test, which makes the metric correlated with itself.
 * Both deep-research reviews flagged this as a circular calibration that
 * over-states accuracy. Anchor-based calibration is the standard fix:
 * pre-commit a small set of high-confidence external probabilities and
 * report Ranked Probability Score (Epstein 1969) plus a reliability diagram
 * against THAT.
 *
 * Output: text report to stdout.
 *   - Per-anchor table: anchor probability vs model prediction + tier distance
 *   - Aggregate metrics: mean tier distance, RPS, % within ±1 tier, coverage
 *   - Reliability diagram: predicted-tier bin → mean anchor probability
 *   - Per-park breakdown for spotting park-specific systematic bias
 *
 * Exit codes:
 *   0   — calibration passed (mean tier distance ≤ MAX_TIER_DISTANCE)
 *   1   — calibration failed (model error exceeds threshold)
 *
 * Usage:
 *   node scripts/calibrateAgainstAnchors.js
 *   MAX_TIER_DISTANCE=2 node scripts/calibrateAgainstAnchors.js   # looser gate
 *   VERBOSE=1 node scripts/calibrateAgainstAnchors.js             # full table
 *
 * NOT wired into the weekly rebuild workflow yet — calibration is currently
 * informational. Add as a `merge`-job step once the metrics stabilize.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Tier ↔ probability mapping (mirrors src/data/speciesMetadata.js) ─────
const RARITY_THRESHOLDS = [
  { tier: 'guaranteed',  min: 0.92 },
  { tier: 'very_likely', min: 0.62 },
  { tier: 'likely',      min: 0.30 },
  { tier: 'unlikely',    min: 0.10 },
  { tier: 'rare',        min: 0.03 },
  { tier: 'exceptional', min: 0.00 },
];

const RARITY_FREQ_FALLBACK = {
  guaranteed: 0.92, very_likely: 0.70, likely: 0.40,
  unlikely:   0.15, rare:        0.04, exceptional: 0.01,
};

const _RARITY_ORDER = {
  guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5,
};

// Visitor effort multipliers (mirror src/data/speciesMetadata.js).
// Cache is built at the casual baseline; expert/drive rescale relative to that.
const VISITOR_EFFORT = { expert: 1.00, casual: 0.65, drive: 0.35 };

function rarityFromFrequency(freq) {
  for (const { tier, min } of RARITY_THRESHOLDS) {
    if (freq >= min) return tier;
  }
  return 'exceptional';
}

function resolveBaselineFrequency(rawFrequency, rarity) {
  const tierFallback = RARITY_FREQ_FALLBACK[rarity] ?? 0.15;
  return Math.max(rawFrequency ?? 0, tierFallback);
}

// Approximate the probability midpoint for a tier (used for prediction error).
const TIER_PROB_MIDPOINT = {
  guaranteed:  0.96, // (92-100)
  very_likely: 0.77, // (62-92)
  likely:      0.46, // (30-62)
  unlikely:    0.20, // (10-30)
  rare:        0.065,// (3-10)
  exceptional: 0.015,// (0-3)
};

// ── Species name aliases — mirror runtime SPECIES_NAME_ALIASES ────────────
// Anchors use canonical common names; some cache entries differ. Map known
// equivalences so the lookup doesn't miss.
const NAME_ALIASES = {
  'american elk': ['Elk', 'Wapiti', 'American Elk'],
  'gray wolf':    ['Gray Wolf', 'Wolf'],
  'caribou':      ['Caribou', 'Reindeer'],
  'mountain lion':['Mountain Lion', 'Cougar', 'Puma'],
  'puma':         ['Mountain Lion', 'Cougar', 'Puma'],
  'cougar':       ['Mountain Lion', 'Cougar', 'Puma'],
  'florida panther': ['Florida Panther', 'Mountain Lion', 'Cougar', 'Puma'],
  'west indian manatee': ['West Indian Manatee', 'Manatee', 'Florida Manatee'],
  'common raven': ['Common Raven', 'Raven'],
  'roosevelt elk': ['Roosevelt Elk', 'Elk', 'Wapiti'],
  'nene': ['Hawaiian Goose', 'Nene'],
};

function findAnimal(animals, anchorSpecies) {
  if (!Array.isArray(animals)) return null;
  const target = anchorSpecies.toLowerCase().trim();
  // 1. Exact case-insensitive match
  let hit = animals.find(a => a.name?.toLowerCase().trim() === target);
  if (hit) return hit;
  // 2. Alias match
  const aliases = NAME_ALIASES[target] ?? [];
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    hit = animals.find(a => a.name?.toLowerCase().trim() === aliasLower);
    if (hit) return hit;
  }
  // 3. Substring contains (last resort — log if used so we can add an alias)
  hit = animals.find(a => {
    const n = a.name?.toLowerCase().trim() ?? '';
    return n.includes(target) || target.includes(n);
  });
  return hit ?? null;
}

// ── Compute the model's predicted probability for an anchor's context ─────
// Mirrors the runtime computeEffectiveRarity logic enough to give a fair
// (zone, season, effort) prediction. NOT a full mirror — does not apply
// parkEffort correction (runtime fetch) or activity-period multipliers
// (those don't apply when anchor doesn't specify visit-time).
//
// Resolution order matches App.jsx::computeEffectiveRarity:
//   1. Zone override (most specific) — detectability ceiling NOT applied
//      because zones already encode visible-context behavior.
//      a. Zone seasonal frequency
//      b. Zone baseline frequency
//   2. Park-level seasonal frequency (eBird S&T weekly)
//   3. Park-level baseline (rarity tier floor)
//   4. Detectability ceiling — capped at the species detectability cap
//      (no zone path; zones override the cap by design).
// Tier-rank constants used by destination boost.
const TIER_KEYS = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];

// Mirror of App.jsx::applyDestinationBoost — when an animal has a high-frequency
// front-country zone (access >= 4 in parkZones.js) AND no zone is currently
// being scored AND the gap is >= 2 tiers, elevate the park-level rarity by
// AT MOST 1 tier toward the best zone. See App.jsx for full rationale.
function applyDestinationBoostNode(animal, parkZones) {
  if (!animal?.zones) return null;
  const zoneEntries = Object.entries(animal.zones);
  if (!zoneEntries.length) return null;
  const animalRank = _RARITY_ORDER[animal.rarity] ?? 5;
  const FRONT_COUNTRY_ACCESS_MIN = 4;
  let bestRank = Infinity;
  let bestRarity = null;
  for (const [zoneId, z] of zoneEntries) {
    const meta = parkZones?.find?.(pz => pz.id === zoneId);
    const access = meta?.access ?? 5;
    if (access < FRONT_COUNTRY_ACCESS_MIN) continue;
    const rank = _RARITY_ORDER[z.rarity] ?? 5;
    if (rank < bestRank) { bestRank = rank; bestRarity = z.rarity; }
  }
  if (bestRarity == null) return null;
  if (animalRank - bestRank < 2) return null;
  const boostedRank = animalRank - 1;
  return TIER_KEYS[boostedRank] ?? animal.rarity;
}

function predict(animal, anchor, speciesDetectability, parkZones) {
  if (!animal) return null;

  // Zone override (most specific) — applied via wildlifeCacheLoader from
  // src/data/zoneOverrides.js. Anchors that specify `zone` are testing the
  // zone path directly.
  if (anchor.zone && animal.zones?.[anchor.zone]) {
    const z = animal.zones[anchor.zone];
    let freq;
    if (anchor.season && anchor.season !== 'year-round' && z.seasonFrequencies?.[anchor.season] != null) {
      freq = z.seasonFrequencies[anchor.season] / 100;
    } else {
      freq = resolveBaselineFrequency(z.frequency, z.rarity);
    }
    const effort = anchor.visitorEffort ?? 'casual';
    const effortMul = (VISITOR_EFFORT[effort] ?? VISITOR_EFFORT.casual) / VISITOR_EFFORT.casual;
    freq = Math.min(0.99, Math.max(0, freq * effortMul));
    // No detectability cap inside zones — zones already encode visible context.
    return { probability: freq, tier: rarityFromFrequency(freq), source: 'zone' };
  }

  // Park-level prediction. Apply destination boost first if the animal has
  // a high-frequency front-country zone (mirrors runtime behavior).
  let effectiveRarity = animal.rarity;
  let effectiveFrequency = animal.frequency;
  let predictionSource = 'park';
  if (parkZones) {
    const boostedTier = applyDestinationBoostNode(animal, parkZones);
    if (boostedTier && boostedTier !== animal.rarity) {
      effectiveRarity = boostedTier;
      // Park-level frequency takes the tier floor — no specific data point
      // for the boosted tier, but the floor reflects the visit-planning truth.
      effectiveFrequency = null;
      predictionSource = 'park_boosted';
    }
  }

  const baseline = resolveBaselineFrequency(effectiveFrequency, effectiveRarity);
  let freq = baseline;

  // Season-specific eBird Status & Trends data is the gold standard when
  // available — apply the seasonal multiplier directly.
  if (anchor.season && anchor.season !== 'year-round'
      && animal.seasonFrequencies?.[anchor.season] != null) {
    // seasonFrequencies are stored as 1-99 percentages
    freq = animal.seasonFrequencies[anchor.season] / 100;
  }

  // Effort multiplier: cache is built at casual baseline.
  const effort = anchor.visitorEffort ?? 'casual';
  const effortMul = (VISITOR_EFFORT[effort] ?? VISITOR_EFFORT.casual) / VISITOR_EFFORT.casual;
  freq = Math.min(0.99, Math.max(0, freq * effortMul));

  // Detectability ceiling — caps casual visitor sighting probability at the
  // species' empirically-justified maximum. Skipped for zone path above.
  const ceiling = speciesDetectability?.[animal.name];
  if (ceiling != null) {
    freq = Math.min(freq, ceiling);
  }

  return { probability: freq, tier: rarityFromFrequency(freq), source: predictionSource };
}

// ── Scoring ──────────────────────────────────────────────────────────────
// Tier distance = |predicted_idx - anchor_idx| in 0..5 space.
// Squared probability error = (predicted_prob - anchor.probability)^2.
function score(prediction, anchor) {
  if (!prediction) {
    return { covered: false, tierDistance: null, sqProbError: null };
  }
  const predIdx = _RARITY_ORDER[prediction.tier] ?? 5;
  const anchorIdx = _RARITY_ORDER[anchor.tierExpected] ?? 5;
  return {
    covered: true,
    tierDistance: Math.abs(predIdx - anchorIdx),
    sqProbError: (prediction.probability - anchor.probability) ** 2,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
// Default threshold tightened 1.5 → 0.5 (2026-04-25) after the model
// stabilized at mean tier distance 0.27 across 117 anchors. Setting it at
// 0.5 leaves ~85% headroom over current accuracy while still catching any
// material regression. Override via MAX_TIER_DISTANCE env if needed.
async function main() {
  const MAX_TIER_DISTANCE = process.env.MAX_TIER_DISTANCE
    ? Number(process.env.MAX_TIER_DISTANCE)
    : 0.5;
  const VERBOSE = process.env.VERBOSE === '1';

  const anchorsPath = path.join(__dirname, 'rarityAnchors.json');
  const { _meta, anchors } = JSON.parse(readFileSync(anchorsPath, 'utf8'));
  const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');
  // The runtime loader (src/data/wildlifeCacheLoader.js) merges zone overrides
  // from src/data/zoneOverrides.js into animal.zones at load time. The Node
  // calibration script imports the raw static cache, so we apply the same
  // merge here to mirror runtime behaviour.
  const { ZONE_OVERRIDES } = await import('../src/data/zoneOverrides.js');

  // Mirror the runtime cache loader's flagship-species patches so the
  // calibration scores against the actual runtime state, not the static cache.
  const { MISSING_SPECIES_PATCHES } = await import('../src/data/missingSpeciesPatches.js');
  for (const patch of MISSING_SPECIES_PATCHES) {
    const parkData = WILDLIFE_CACHE[patch.parkId];
    if (!parkData?.animals) continue;
    const nameLower = patch.name.toLowerCase().trim();
    const sciLower = patch.scientificName?.toLowerCase().trim();
    const exists = parkData.animals.some(a => {
      const an = a.name?.toLowerCase().trim();
      const asci = a.scientificName?.toLowerCase().trim();
      return an === nameLower || (sciLower && asci === sciLower);
    });
    if (exists) continue;
    parkData.animals.push({
      name: patch.name,
      scientificName: patch.scientificName,
      animalType: patch.animalType,
      rarity: patch.rarity,
      frequency: patch.frequency,
      raritySource: 'curated_patch',
    });
  }

  // Mirror the runtime _applyRuntimeRarityPatches in wildlifeCacheLoader.js.
  // Hand-curated tier corrections for species whose build-time override
  // silently failed due to naming mismatches (e.g. 'Black Bear' override
  // doesn't match 'American Black Bear' cache name).
  const RUNTIME_RARITY_PATCHES = {
    shenandoah: { 'Black Bear': 'unlikely', 'American Black Bear': 'unlikely' },
    yosemite:   { 'American Black Bear': 'unlikely' },
    americansamoa: { 'Pacific Flying-fox': 'very_likely' },
    biscayne:   {
      'Common Bottlenose Dolphin': 'unlikely',
      "Tamanend's Bottlenose Dolphin": 'unlikely',
    },
    newrivergorge: { 'American Black Bear': 'unlikely' },
  };
  for (const [parkId, patches] of Object.entries(RUNTIME_RARITY_PATCHES)) {
    const parkData = WILDLIFE_CACHE[parkId];
    if (!parkData?.animals) continue;
    for (const animal of parkData.animals) {
      const newTier = patches[animal.name];
      if (newTier && animal.rarity !== newTier) {
        animal.rarity = newTier;
        animal.raritySource = 'runtime_patch';
      }
    }
  }

  // Mirror the runtime applyRarityOverride() in src/services/apiService.js.
  // Without this the calibration scored against raw cache rarity, ignoring
  // the canonical hand-curated park-level override table — producing false
  // mismatches at every park whose cache tier was overridden in production
  // (e.g. Carlsbad Mexican Free-tailed Bat, Hot Springs deer, etc.).
  // Regex extracts RARITY_OVERRIDES literal from apiService.js to avoid
  // pulling the whole React-dependent module into the Node calibration.
  const apiSrc = readFileSync(path.join(__dirname, '..', 'src', 'services', 'apiService.js'), 'utf8');
  const overrideMatch = apiSrc.match(/const RARITY_OVERRIDES\s*=\s*(\{[\s\S]*?\n\});/);
  if (overrideMatch) {
    // eslint-disable-next-line no-eval
    const RARITY_OVERRIDES = (0, eval)('(' + overrideMatch[1] + ')');
    for (const [parkId, overrides] of Object.entries(RARITY_OVERRIDES)) {
      const parkData = WILDLIFE_CACHE[parkId];
      if (!parkData?.animals) continue;
      for (const animal of parkData.animals) {
        const newTier = overrides[animal.name];
        if (newTier && animal.rarity !== newTier) {
          animal.rarity = newTier;
          animal.raritySource = 'override';
        }
      }
    }
  } else {
    console.warn('  ⚠  Could not extract RARITY_OVERRIDES — calibration may report false mismatches.');
  }

  for (const [parkId, parkData] of Object.entries(WILDLIFE_CACHE)) {
    const overrides = ZONE_OVERRIDES[parkId];
    if (!overrides || !Array.isArray(parkData?.animals)) continue;
    for (const animal of parkData.animals) {
      const zonesForSpecies = overrides[animal.name];
      if (!zonesForSpecies) continue;
      animal.zones = { ...(animal.zones ?? {}), ...zonesForSpecies };
    }
  }

  // Build a name→ceiling map from src/data/detectability.js so the calibration
  // applies the same hard/cryptic caps as the runtime.
  const { SPECIES_DETECTABILITY, DETECTABILITY_LEVELS } = await import('../src/data/detectability.js');
  const speciesDetectability = {};
  for (const [name, level] of Object.entries(SPECIES_DETECTABILITY)) {
    const ceiling = DETECTABILITY_LEVELS[level]?.ceiling;
    if (ceiling != null) speciesDetectability[name] = ceiling;
  }

  // Park-zones metadata for destination boost — mirrors runtime parkZones import.
  const { PARK_ZONES } = await import('../src/data/parkZones.js');

  console.log(`\n🎯 Anchor-based rarity calibration`);
  console.log(`   Anchors:              ${anchors.length}`);
  console.log(`   Parks in cache:       ${Object.keys(WILDLIFE_CACHE).length}`);
  console.log(`   Anchor parks covered: ${new Set(anchors.map(a => a.parkId)).size}`);
  console.log(`   Last review:          ${_meta.lastReviewed ?? '(unknown)'}`);
  console.log(`   Failure threshold:    mean tier distance > ${MAX_TIER_DISTANCE}\n`);

  const results = anchors.map(anchor => {
    const parkData = WILDLIFE_CACHE[anchor.parkId];
    const animal = findAnimal(parkData?.animals, anchor.species);
    const prediction = predict(animal, anchor, speciesDetectability, PARK_ZONES[anchor.parkId]);
    const sc = score(prediction, anchor);
    return { anchor, animal, prediction, ...sc };
  });

  const covered = results.filter(r => r.covered);
  const missing = results.filter(r => !r.covered);

  // Per-anchor table
  if (VERBOSE || missing.length > 0) {
    console.log(`📋 Per-anchor results`);
    console.log(`   ${'Park'.padEnd(22)} ${'Species'.padEnd(28)} ${'Sea'.padEnd(7)} ${'Anchor'.padEnd(13)} ${'Predicted'.padEnd(13)} ${'Δtier'.padEnd(6)}`);
    console.log(`   ${'─'.repeat(90)}`);
    for (const r of results) {
      const park    = r.anchor.parkId.padEnd(22);
      const species = r.anchor.species.padEnd(28);
      const season  = (r.anchor.season ?? '').padEnd(7);
      const anc     = `${(r.anchor.probability * 100).toFixed(0).padStart(3)}%/${r.anchor.tierExpected}`.padEnd(13);
      const pred    = r.prediction
        ? `${(r.prediction.probability * 100).toFixed(0).padStart(3)}%/${r.prediction.tier}`.padEnd(13)
        : 'NOT IN CACHE'.padEnd(13);
      const dist    = r.tierDistance != null ? String(r.tierDistance).padEnd(6) : '—'.padEnd(6);
      const flag    = r.tierDistance != null && r.tierDistance >= 2 ? ' ⚠' : '';
      console.log(`   ${park} ${species} ${season} ${anc} ${pred} ${dist}${flag}`);
    }
    console.log('');
  }

  // ── Aggregate metrics ────────────────────────────────────────────────
  const meanTierDistance = covered.length
    ? covered.reduce((s, r) => s + r.tierDistance, 0) / covered.length
    : 0;
  const rmsProbError = covered.length
    ? Math.sqrt(covered.reduce((s, r) => s + r.sqProbError, 0) / covered.length)
    : 0;
  const within1Tier = covered.length
    ? covered.filter(r => r.tierDistance <= 1).length / covered.length
    : 0;
  const exact = covered.length
    ? covered.filter(r => r.tierDistance === 0).length / covered.length
    : 0;
  const coverage = anchors.length ? covered.length / anchors.length : 0;

  console.log(`📊 Aggregate metrics`);
  console.log(`   Coverage:               ${(coverage * 100).toFixed(0)}%  (${covered.length}/${anchors.length} anchors found in cache)`);
  console.log(`   Exact tier match:       ${(exact * 100).toFixed(0)}%`);
  console.log(`   Within ±1 tier:         ${(within1Tier * 100).toFixed(0)}%`);
  console.log(`   Mean tier distance:     ${meanTierDistance.toFixed(2)}  (lower = better; threshold ${MAX_TIER_DISTANCE})`);
  console.log(`   RMS probability error:  ${(rmsProbError * 100).toFixed(1)} percentage points\n`);

  // ── Reliability diagram ──────────────────────────────────────────────
  // For each predicted tier bucket, show the mean anchor probability and
  // count. A well-calibrated model has mean anchor probability inside the
  // tier's nominal probability range (e.g. anchors predicted "likely"
  // average 30-62%).
  const TIERS = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
  const TIER_RANGES = {
    guaranteed:  '92-100%', very_likely: '62-92%',  likely: '30-62%',
    unlikely:    '10-30%',  rare:        '3-10%',   exceptional: '0-3%',
  };

  console.log(`🎯 Reliability diagram`);
  console.log(`   ${'Predicted'.padEnd(13)} ${'Range'.padEnd(10)} ${'N'.padStart(4)}  ${'Mean anchor%'.padEnd(13)} Calibration`);
  console.log(`   ${'─'.repeat(70)}`);
  for (const tier of TIERS) {
    const bin = covered.filter(r => r.prediction.tier === tier);
    if (!bin.length) continue;
    const meanProb = bin.reduce((s, r) => s + r.anchor.probability, 0) / bin.length;
    const range = TIER_RANGES[tier];
    const [lo, hi] = range.replace('%', '').split('-').map(Number);
    const meanPct = meanProb * 100;
    const inBand = meanPct >= lo && meanPct <= hi;
    const flag = inBand ? '✓ inside band' : (meanPct > hi ? '↑ over-rare (anchors more common)' : '↓ over-common (anchors rarer)');
    console.log(`   ${tier.padEnd(13)} ${range.padEnd(10)} ${String(bin.length).padStart(4)}  ${(meanPct).toFixed(1).padStart(4)}%        ${flag}`);
  }
  console.log('');

  // ── Per-park breakdown ───────────────────────────────────────────────
  const byPark = new Map();
  for (const r of covered) {
    const arr = byPark.get(r.anchor.parkId) ?? [];
    arr.push(r);
    byPark.set(r.anchor.parkId, arr);
  }
  const parkRows = [...byPark.entries()].map(([parkId, rs]) => ({
    parkId,
    n: rs.length,
    meanDist: rs.reduce((s, r) => s + r.tierDistance, 0) / rs.length,
  })).sort((a, b) => b.meanDist - a.meanDist);

  console.log(`🏔  Per-park error (sorted worst to best)`);
  console.log(`   ${'Park'.padEnd(24)} ${'N'.padStart(4)}  ${'Mean Δtier'.padStart(11)}`);
  console.log(`   ${'─'.repeat(45)}`);
  for (const row of parkRows) {
    const flag = row.meanDist > MAX_TIER_DISTANCE ? ' ⚠' : '';
    console.log(`   ${row.parkId.padEnd(24)} ${String(row.n).padStart(4)}  ${row.meanDist.toFixed(2).padStart(11)}${flag}`);
  }
  console.log('');

  // ── Missing species (re-list for actionability) ──────────────────────
  if (missing.length > 0) {
    console.log(`⚠  ${missing.length} anchor(s) not found in cache:`);
    for (const r of missing) {
      console.log(`   - [${r.anchor.parkId}] ${r.anchor.species}`);
    }
    console.log(`   Add an entry to NAME_ALIASES in this script if the species exists under a different name in the cache.\n`);
  }

  // ── Pass/fail gate ───────────────────────────────────────────────────
  if (meanTierDistance > MAX_TIER_DISTANCE) {
    console.error(`❌ Calibration FAILED: mean tier distance ${meanTierDistance.toFixed(2)} > threshold ${MAX_TIER_DISTANCE}`);
    process.exit(1);
  }
  console.log(`✅ Calibration PASSED: mean tier distance ${meanTierDistance.toFixed(2)} ≤ threshold ${MAX_TIER_DISTANCE}\n`);
}

main().catch(err => {
  console.error('Calibration failed:', err);
  process.exit(1);
});
