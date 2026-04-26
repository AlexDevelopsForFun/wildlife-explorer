/**
 * sourceWeighting.js — logit-space inverse-variance weighted source merging.
 *
 * Replaces the current "primary source wins, with one fallback" dedup logic
 * with a principled probability-merging approach when sources disagree.
 * Both deep-research reviews recommended this pattern (Claude F1, ChatGPT
 * F.1) — references Pacifici et al. 2017 (Shared / Correlation / Covariates
 * data-fusion approaches) and Normand 1999 (fixed-effect meta-analysis).
 *
 * Core idea: every source produces (probability, precision) where precision
 * = inverse variance (loosely "confidence in this estimate"). Combine via:
 *
 *   combined_logit = Σ(w_k × logit(p_k)) / Σw_k
 *   combined_p     = expit(combined_logit)
 *   combined_precision = Σw_k
 *
 * Logit space is the right algebra because it makes the combination
 * symmetric around 50% — averaging 90% and 10% in raw space gives 50%
 * (correct), but averaging 99% and 50% gives 74.5% (wrong, should be
 * weighted toward the more confident estimate). Logit handles this.
 *
 * Source-precision priors (calibrated against the build's actual reliability):
 *
 *   eBird Status & Trends  ≈ 8  — gold standard for birds; modeled per-
 *                                  checklist probability, ~3km resolution
 *   eBird county-freq      ≈ 4  — county-level historical frequency from
 *                                  48-date sampling
 *   eBird binary           ≈ 1  — presence-only fallback
 *   iNaturalist counts     ≈ 2  — observation density; biased by visitor
 *                                  effort + species charisma
 *   NPS topic tags         ≈ 1  — categorical only (no numeric frequency)
 *   NPS Abundance          ≈ 2  — categorical (Abundant/Common/Rare/...)
 *                                  but populated by park ecologists
 *   Curated override       ≈ 10 — hand-set by ecologist; highest authority
 *                                  unless explicitly weakened
 *
 * Scope: this is a build-time helper. The current build script dedup logic
 * still runs as the default; this module is opt-in via mergeSourcesWeighted()
 * for cases where the deterministic primary-wins logic produces a clearly
 * wrong tier (sources disagree by ≥2 tiers).
 */

// Map source-id strings (as used in animal.raritySource) to baseline precisions.
export const SOURCE_PRECISION = {
  ebird_st:           8,
  ebird_county_freq:  4,
  ebird_recent:       2,
  ebird_binary:       1,
  ebird_binary_state: 1,
  inat_corrected:     2,
  inat_floor:         1,
  nps:                1,
  nps_floor:          2,
  nps_ceiling:        2,
  override:          10,
  override_curated:  10,
  curated:           10,
  static:             3,
  estimated:          1,
  // Fallback for unknown sources
  _default:           1,
};

// Map rarity tiers to representative probability midpoints (matches the
// pipeline's RARITY_FREQ_FALLBACK fallbacks; here as a self-contained copy
// so this module has no external dependency).
const TIER_MIDPOINT = {
  guaranteed:  0.96,
  very_likely: 0.77,
  likely:      0.46,
  unlikely:    0.20,
  rare:        0.065,
  exceptional: 0.015,
};

const TIER_THRESHOLDS = [
  { tier: 'guaranteed',  min: 0.92 },
  { tier: 'very_likely', min: 0.62 },
  { tier: 'likely',      min: 0.30 },
  { tier: 'unlikely',    min: 0.10 },
  { tier: 'rare',        min: 0.03 },
  { tier: 'exceptional', min: 0.00 },
];

const TIER_RANK = {
  guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5,
};

// ── Numeric helpers ──────────────────────────────────────────────────────
const EPS = 1e-6;
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function logit(p) {
  const q = clamp(p, EPS, 1 - EPS);
  return Math.log(q / (1 - q));
}
function expit(L) { return 1 / (1 + Math.exp(-L)); }

function rarityFromFrequency(freq) {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (freq >= min) return tier;
  }
  return 'exceptional';
}

/**
 * Convert a single source entry (animal.raritySource + animal.frequency +
 * animal.rarity) into the (p, precision) form needed for weighted merging.
 *
 * Falls back to tier midpoint when frequency isn't directly available.
 * Caller should have already established that this source has rarity data.
 */
export function entryToProbability(entry) {
  if (!entry) return null;
  const tier = entry.rarity;
  if (!tier || !TIER_MIDPOINT[tier]) return null;
  const p = entry.frequency != null && entry.frequency >= 0 && entry.frequency <= 1
    ? entry.frequency
    : TIER_MIDPOINT[tier];
  const sourceKey = entry.raritySource ?? entry.source ?? '_default';
  const basePrecision = SOURCE_PRECISION[sourceKey] ?? SOURCE_PRECISION._default;
  // Boost precision by available sample size (when known): eBird checklists,
  // iNat observations. Scaled down by sqrt because precision grows like √n
  // for well-known reasons (variance shrinks like 1/n; precision ~ 1/var).
  const sampleSize = entry._count ?? entry._numChecklists ?? 0;
  const sampleBoost = sampleSize > 0 ? Math.min(4, Math.sqrt(sampleSize / 25)) : 1;
  return {
    p,
    precision: basePrecision * sampleBoost,
    sourceKey,
  };
}

/**
 * Combine multiple source-probability estimates into one merged probability.
 * Returns { probability, precision, tier, contributingSources }.
 *
 * If only one valid source is provided, returns its (p, precision) directly
 * — no point doing weighted averaging with one input.
 */
export function combineSources(entries) {
  const probs = entries.map(entryToProbability).filter(Boolean);
  if (!probs.length) return null;
  if (probs.length === 1) {
    const { p, precision, sourceKey } = probs[0];
    return {
      probability: p,
      precision,
      tier: rarityFromFrequency(p),
      contributingSources: [sourceKey],
    };
  }
  let weightedLogitSum = 0;
  let totalPrecision = 0;
  for (const { p, precision } of probs) {
    weightedLogitSum += precision * logit(p);
    totalPrecision += precision;
  }
  const combinedLogit = weightedLogitSum / totalPrecision;
  const combined = expit(combinedLogit);
  return {
    probability: combined,
    precision: totalPrecision,
    tier: rarityFromFrequency(combined),
    contributingSources: probs.map(p => p.sourceKey),
  };
}

/**
 * Decide whether to use weighted merging for a group of duplicate animal
 * entries (same species, multiple sources). Returns the merged tier when
 * the sources disagree by ≥ disagreementThreshold tiers, otherwise null
 * (caller should fall back to existing deterministic primary-wins logic).
 *
 * This bounded-scope policy is the safety valve: weighted merging only
 * activates when the existing logic would clearly produce a worse answer.
 */
export function mergeSourcesWeighted(group, { disagreementThreshold = 2 } = {}) {
  const tieredEntries = group.filter(e => e?.rarity && TIER_RANK[e.rarity] != null);
  if (tieredEntries.length < 2) return null;

  const ranks = tieredEntries.map(e => TIER_RANK[e.rarity]);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  if (maxRank - minRank < disagreementThreshold) return null;  // Sources mostly agree

  return combineSources(tieredEntries);
}
