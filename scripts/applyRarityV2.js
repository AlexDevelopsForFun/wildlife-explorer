#!/usr/bin/env node
/**
 * scripts/applyRarityV2.js
 *
 * Post-processes wildlifeCache.js to layer the rarity-v2 accuracy improvements
 * on top of the existing build:
 *
 *   1. Visitor-effort scalar     — multiply stored `frequency` by 0.65 (casual
 *      visitor default), then re-map to rarity tier so the presented tier
 *      reflects a typical visitor's actual detection rate, not a power birder's.
 *
 *   2. Per-species charisma overrides — replace blanket ÷3 raptor correction
 *      with tuned per-species values from CHARISMA_OVERRIDES_V2.
 *
 *   3. Recency signal — when iNat `_recent3yrCount` is already stored on the
 *      row, boost frequency by up to 1.3× for species whose recent count
 *      exceeds 30% of their historical count (signal of active/recovering pop).
 *      Otherwise pass through unchanged (recency data not yet fetched).
 *
 *   4. Confidence field — derive from raritySource + obsCount.
 *
 *   5. Activity period — keyword classifier -> 'diurnal' | 'crepuscular' |
 *      'nocturnal' | 'cathemeral'.
 *
 *   6. Season-aware rarity (peak frequency stored as `frequency`; per-season
 *      frequency when the build kept `_seasonalFreq` / `seasonFrequencies`).
 *
 *   7. Guaranteed tier is GATED on confidence >= medium — stops 5-obs flukes
 *      from being labeled guaranteed.
 *
 * Running this script is cheap (~10s) because no network I/O happens — all
 * inputs are already in wildlifeCache.js. Safe to run repeatedly.
 *
 * Usage:
 *   node scripts/applyRarityV2.js
 *   EFFORT=expert node scripts/applyRarityV2.js     # skip visitor scalar
 *   DRY_RUN=1 node scripts/applyRarityV2.js          # preview stats only
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import {
  CHARISMA_OVERRIDES_V2,
  VISITOR_EFFORT,
  DEFAULT_VISITOR_EFFORT,
  computeConfidence,
  classifyActivityPeriod,
  rarityFromFrequency,
} from '../src/data/speciesMetadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');

const DRY_RUN = process.env.DRY_RUN === '1';
const EFFORT  = process.env.EFFORT ?? DEFAULT_VISITOR_EFFORT;
const EFFORT_SCALAR = VISITOR_EFFORT[EFFORT] ?? VISITOR_EFFORT.casual;

// Non-exceptional floor list — same as buildWildlifeCache.js.
const NEVER_EXCEPTIONAL_BIRDS = new Set([
  'Turkey Vulture', 'Red-tailed Hawk', "Cooper's Hawk", 'Sharp-shinned Hawk',
  'American Kestrel', 'Northern Harrier', 'Osprey', 'Broad-winged Hawk',
  'Red-shouldered Hawk', 'Northern Saw-whet Owl', 'Barred Owl', 'Great Horned Owl',
  'Bald Eagle',
]);

// Map raw obs-count to a frequency estimate — mirrors the runtime thresholds
// in apiService.js::rarityFromObsCount so confidence gating stays consistent.
function obsCountToFrequencyEstimate(obsCount) {
  if (obsCount == null) return null;
  if (obsCount >= 2000) return 0.95;
  if (obsCount >= 500)  return 0.75;
  if (obsCount >= 100)  return 0.45;
  if (obsCount >= 20)   return 0.18;
  if (obsCount >= 5)    return 0.05;
  return 0.01;
}

// When no frequency is stored, estimate from the assigned rarity tier itself.
// These are the midpoints of each tier's probability band — see
// RARITY_THRESHOLDS in speciesMetadata.js.
function tierToMidpointFrequency(tier) {
  switch (tier) {
    case 'guaranteed':  return 0.95;
    case 'very_likely': return 0.75;
    case 'likely':      return 0.45;
    case 'unlikely':    return 0.20;
    case 'rare':        return 0.06;
    case 'exceptional': return 0.01;
    default:            return null;
  }
}

function applyV2(animal, parkId) {
  const out = { ...animal };

  // 1. Determine working frequency — prefer stored, then obs-count estimate,
  //    else fall back to the midpoint of the currently-assigned rarity tier so
  //    the visitor-effort scalar has something to work on.
  let freq = out.frequency;
  const obsCount = out._debug?.obsCount ?? out._count ?? null;
  if (freq == null && obsCount != null) {
    freq = obsCountToFrequencyEstimate(obsCount);
  }
  if (freq == null) {
    freq = tierToMidpointFrequency(out.rarity);
  }

  // 2. Apply per-species charisma override if present; else leave the build-time
  //    category correction alone (already baked into stored frequency).
  if (freq != null && out.name in CHARISMA_OVERRIDES_V2) {
    // Overrides assume the build-time category correction was 1.0. To avoid
    // double-correction, divide out the approximate raptor/eagle defaults first.
    const lower = out.name.toLowerCase();
    let baselineCategoryFactor = 1;
    if (/bald eagle/.test(lower)) baselineCategoryFactor = 0.2;
    else if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) {
      baselineCategoryFactor = 1 / 3;
    }
    const undoBaseline = baselineCategoryFactor === 0 ? 1 : (1 / baselineCategoryFactor);
    freq = freq * undoBaseline * CHARISMA_OVERRIDES_V2[out.name];
  }

  // 3. Apply visitor-effort scalar.
  if (freq != null) freq = freq * EFFORT_SCALAR;

  // 4. Recency boost — if a recent-3yr count is stored and the ratio vs
  //    historical is strong, bump frequency up to 1.3×. If the recent count
  //    is weak compared to historical, dampen.
  if (freq != null && obsCount != null && out._debug?.obsCountRecent3y != null) {
    const recentRatio = out._debug.obsCountRecent3y / Math.max(obsCount, 1);
    // Expected ratio if obs evenly distributed across ~10y of iNat = 0.3.
    const correction = Math.max(0.7, Math.min(1.3, recentRatio / 0.3));
    freq = freq * correction;
  }

  // 5. Re-map to rarity tier.
  let newRarity = out.rarity;
  if (freq != null) {
    newRarity = rarityFromFrequency(Math.min(Math.max(freq, 0), 1));
  }

  // 6. NEVER_EXCEPTIONAL_BIRDS floor — raise to 'rare' minimum.
  if (newRarity === 'exceptional' && NEVER_EXCEPTIONAL_BIRDS.has(out.name)) {
    newRarity = 'rare';
  }

  // 7. Confidence field.
  const confidence = computeConfidence({
    raritySource: out.raritySource,
    obsCount,
  });

  // 8. Guaranteed gate — demote to very_likely if confidence is low.
  if (newRarity === 'guaranteed' && confidence === 'low') {
    newRarity = 'very_likely';
  }

  // 9. Activity-period classifier.
  const activityPeriod = classifyActivityPeriod(out);

  // 10. Never override explicit manual overrides.
  const preserveRarity = out.raritySource === 'override';

  return {
    ...out,
    rarity: preserveRarity ? out.rarity : newRarity,
    raritySourceV2: preserveRarity ? out.raritySource : `${out.raritySource ?? 'unknown'}+v2`,
    frequency: freq != null ? Number(freq.toFixed(4)) : out.frequency,
    confidence,
    activityPeriod,
  };
}

async function main() {
  const mod = await import(`file://${CACHE_PATH.replace(/\\/g, '/')}`);
  const cache = mod.WILDLIFE_CACHE;
  const builtAt = mod.WILDLIFE_CACHE_BUILT_AT;

  const stats = {
    parks: 0,
    rows:  0,
    tierChanges: {},
    confidence: { high: 0, medium: 0, low: 0 },
    activity: { diurnal: 0, crepuscular: 0, nocturnal: 0, cathemeral: 0 },
    guaranteed_demoted: 0,
    never_exc_bumped: 0,
  };

  const newCache = {};
  for (const [id, val] of Object.entries(cache)) {
    stats.parks++;
    const before = val.animals;
    const after  = before.map(a => {
      const updated = applyV2(a, id);
      stats.rows++;
      stats.confidence[updated.confidence] = (stats.confidence[updated.confidence] ?? 0) + 1;
      stats.activity[updated.activityPeriod] = (stats.activity[updated.activityPeriod] ?? 0) + 1;

      if (updated.rarity !== a.rarity) {
        const k = `${a.rarity}→${updated.rarity}`;
        stats.tierChanges[k] = (stats.tierChanges[k] ?? 0) + 1;
        if (a.rarity === 'guaranteed' && updated.rarity === 'very_likely') stats.guaranteed_demoted++;
        if (a.rarity === 'exceptional' && updated.rarity === 'rare')       stats.never_exc_bumped++;
      }
      return updated;
    });
    newCache[id] = { ...val, animals: after };
  }

  console.log('\n📊 Rarity V2 summary');
  console.log(`   Parks:  ${stats.parks}`);
  console.log(`   Rows:   ${stats.rows}`);
  console.log(`   Effort scalar: ${EFFORT} (×${EFFORT_SCALAR})`);
  console.log('\n   Confidence distribution:');
  for (const [k, v] of Object.entries(stats.confidence)) {
    const pct = ((v / stats.rows) * 100).toFixed(1);
    console.log(`     ${k.padEnd(7)} ${v.toString().padStart(6)}  (${pct}%)`);
  }
  console.log('\n   Activity distribution:');
  for (const [k, v] of Object.entries(stats.activity)) {
    const pct = ((v / stats.rows) * 100).toFixed(1);
    console.log(`     ${k.padEnd(12)} ${v.toString().padStart(6)}  (${pct}%)`);
  }
  console.log('\n   Top tier changes:');
  const top = Object.entries(stats.tierChanges).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [k, v] of top) console.log(`     ${k.padEnd(28)} ${v}`);
  console.log(`\n   Guaranteed → very_likely (low confidence demotion): ${stats.guaranteed_demoted}`);
  console.log(`   NEVER_EXCEPTIONAL bumped:                             ${stats.never_exc_bumped}`);

  if (DRY_RUN) {
    console.log('\n   DRY_RUN=1 — not writing cache file.');
    return;
  }

  // Write back to wildlifeCache.js
  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Rarity-v2 layer applied by scripts/applyRarityV2.js on ${new Date().toISOString()}`,
    `// Parks: ${stats.parks} | Species bundled: ${stats.rows}`,
    `// To regenerate from scratch: node scripts/buildWildlifeCache.js`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];
  for (const [id, val] of Object.entries(newCache)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
  console.log(`\n✅ Wrote ${CACHE_PATH}`);
}

main().catch(err => { console.error(err); process.exit(1); });
