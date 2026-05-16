#!/usr/bin/env node
/**
 * scripts/testSpeciesMetadata.js
 *
 * Regression suite for the pure lookups in src/data/speciesMetadata.js that
 * the runtime depends on but that had ZERO coverage:
 *
 *   - computeConfidence(): drives the confidence dot. It was silently 100%
 *     dead before commit 8e9ad16 (exported but never called, logic stale for
 *     the current taxonomy). These tests pin every raritySource → tier
 *     mapping so it can't rot again unnoticed.
 *   - rarityFromFrequency() / RARITY_THRESHOLDS: the calibration-tuned tier
 *     boundaries (0.92 / 0.62 / 0.30 / 0.10 / 0.03). An accidental edit here
 *     shifts every park's odds; these pin the exact cut points.
 *   - classifyActivityPeriod(): exact > keyword > animalType-default chain.
 *
 * Same harness/exit-code contract as testRarityPipeline.js (plain Node, no
 * framework). Runs in <1s; wired into the PR-checks safety net.
 */

import {
  computeConfidence,
  rarityFromFrequency,
  RARITY_THRESHOLDS,
  classifyActivityPeriod,
} from '../src/data/speciesMetadata.js';

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` });
  }
}

console.log(`\n🧪 Species-metadata regression suite\n`);

// ── 1. computeConfidence — HIGH sources ──────────────────────────────────
for (const rs of ['override', 'curated', 'curated_patch', 'runtime_patch', 'ebird_st']) {
  assertEqual(computeConfidence({ raritySource: rs }), 'high', `confidence: ${rs} → high`);
}
assertEqual(computeConfidence({ raritySource: 'weighted:ebird+inat' }), 'high',
  'confidence: weighted:* (multi-source agreement) → high');

// ── 2. computeConfidence — MEDIUM sources ────────────────────────────────
assertEqual(computeConfidence({ raritySource: 'ebird_county_freq' }), 'medium',
  'confidence: ebird_county_freq → medium');
assertEqual(computeConfidence({ raritySource: 'ebird_county_freq:0.41' }), 'medium',
  'confidence: ebird_county_freq:* prefix → medium');
assertEqual(computeConfidence({ raritySource: 'inat_corrected' }), 'medium',
  'confidence: inat_corrected → medium');
for (const rs of ['nps', 'nps_floor:likely', 'nps_ceiling:rare']) {
  assertEqual(computeConfidence({ raritySource: rs }), 'medium', `confidence: ${rs} → medium`);
}

// ── 3. computeConfidence — LOW sources + unknowns ────────────────────────
for (const rs of ['ebird_binary', 'ebird_binary:1', 'inat_floor', 'nps_overridden', 'nps_overridden:rare']) {
  assertEqual(computeConfidence({ raritySource: rs }), 'low', `confidence: ${rs} → low`);
}
assertEqual(computeConfidence({ raritySource: 'totally_unknown_source' }), 'low',
  'confidence: unrecognised source → low (safe default)');
assertEqual(computeConfidence({}), 'low', 'confidence: missing raritySource → low');
assertEqual(computeConfidence({ raritySource: null }), 'low', 'confidence: null raritySource → low');

// ── 4. computeConfidence — precedence + legacy obsCount path ─────────────
assertEqual(computeConfidence({ raritySource: 'override', obsCount: 0 }), 'high',
  'confidence: known source wins over a low obsCount (source checked first)');
assertEqual(computeConfidence({ raritySource: '', obsCount: 500 }), 'high',
  'confidence: legacy obsCount ≥500 → high');
assertEqual(computeConfidence({ raritySource: '', obsCount: 50 }), 'medium',
  'confidence: legacy obsCount ≥50 → medium');
assertEqual(computeConfidence({ raritySource: '', obsCount: 49 }), 'low',
  'confidence: legacy obsCount <50 → low');

// ── 5. RARITY_THRESHOLDS — pin the calibrated cut points ─────────────────
// These exact mins came from the Apr-2026 90-day iNat backtest. If someone
// edits them, every park's odds move — this makes that a conscious, visible
// change rather than a silent one.
const expectedThresholds = [
  ['guaranteed', 0.92], ['very_likely', 0.62], ['likely', 0.30],
  ['unlikely', 0.10], ['rare', 0.03], ['exceptional', 0.00],
];
assertEqual(RARITY_THRESHOLDS.length, 6, 'thresholds: exactly 6 tiers');
expectedThresholds.forEach(([tier, min], i) => {
  assertEqual(RARITY_THRESHOLDS[i]?.tier, tier, `thresholds[${i}].tier === ${tier}`);
  assertEqual(RARITY_THRESHOLDS[i]?.min, min, `thresholds[${i}].min === ${min}`);
});

// ── 6. rarityFromFrequency — boundary behaviour (>= min) ─────────────────
assertEqual(rarityFromFrequency(1.00), 'guaranteed', 'freq 1.00 → guaranteed');
assertEqual(rarityFromFrequency(0.92), 'guaranteed', 'freq 0.92 (== min) → guaranteed');
assertEqual(rarityFromFrequency(0.9199), 'very_likely', 'freq just below 0.92 → very_likely');
assertEqual(rarityFromFrequency(0.62), 'very_likely', 'freq 0.62 (== min) → very_likely');
assertEqual(rarityFromFrequency(0.6199), 'likely', 'freq just below 0.62 → likely');
assertEqual(rarityFromFrequency(0.30), 'likely', 'freq 0.30 (== min) → likely');
assertEqual(rarityFromFrequency(0.2999), 'unlikely', 'freq just below 0.30 → unlikely');
assertEqual(rarityFromFrequency(0.10), 'unlikely', 'freq 0.10 (== min) → unlikely');
assertEqual(rarityFromFrequency(0.0999), 'rare', 'freq just below 0.10 → rare');
assertEqual(rarityFromFrequency(0.03), 'rare', 'freq 0.03 (== min) → rare');
assertEqual(rarityFromFrequency(0.0299), 'exceptional', 'freq just below 0.03 → exceptional');
assertEqual(rarityFromFrequency(0.00), 'exceptional', 'freq 0.00 → exceptional');

// ── 7. classifyActivityPeriod — exact > default chain ────────────────────
assertEqual(classifyActivityPeriod({ name: 'Barred Owl' }), 'nocturnal',
  'activity: exact-name match wins (Barred Owl → nocturnal)');
assertEqual(classifyActivityPeriod({ name: 'Some Unlisted Bird', animalType: 'bird' }), 'diurnal',
  'activity: bird default → diurnal');
assertEqual(classifyActivityPeriod({ name: 'Unlisted Critter', animalType: 'mammal' }), 'crepuscular',
  'activity: mammal default → crepuscular (pessimistic)');
assertEqual(classifyActivityPeriod({ name: 'Unlisted Frog-thing', animalType: 'amphibian' }), 'nocturnal',
  'activity: amphibian default → nocturnal');
assertEqual(classifyActivityPeriod({ name: 'X', animalType: 'unknown_type' }), 'diurnal',
  'activity: unknown animalType → diurnal fallback');
assertEqual(classifyActivityPeriod(null), 'diurnal', 'activity: null animal → diurnal (no crash)');

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`📊 Results`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
if (failed > 0) {
  console.log(`\n❌ Failures:`);
  for (const f of failures.slice(0, 8)) {
    console.log(`   • ${f.label}`);
    if (f.detail) console.log(`     ${f.detail}`);
  }
  if (failures.length > 8) console.log(`   … and ${failures.length - 8} more`);
  process.exit(1);
}
console.log(`\n✅ All ${passed} assertions passed.\n`);
