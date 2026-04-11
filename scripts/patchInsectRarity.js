#!/usr/bin/env node
/**
 * scripts/patchInsectRarity.js
 *
 * Recalibrates insect rarity in the existing wildlifeCache.js using
 * insect-specific observation thresholds and charisma corrections.
 *
 * Does NOT call any APIs — reads obs counts from funFact strings
 * and recalculates rarity in-place. Non-insect animals are untouched.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Park visitation tiers (same as buildWildlifeCache.js) ───────────────────
const TIER1_PARKS = new Set([
  'yellowstone', 'greatsmokymountains', 'grandcanyon', 'zion', 'rockymountain',
]);
const TIER2_PARKS = new Set([
  'acadia', 'glacier', 'yosemite', 'grandteton', 'joshuatree', 'olympic',
]);

// ── Insect-specific charisma corrections ────────────────────────────────────
function insectCharismaCorrection(obsCount, name) {
  if (!name || !obsCount) return obsCount ?? 0;
  const lower = name.toLowerCase();

  // Butterflies: ÷1.5 (moderately over-reported — people love photographing them)
  if (/\b(butterfly|swallowtail|monarch|admiral|fritillary|skipper|hairstreak|blue|copper|sulphur|white|lady|painted lady|buckeye|viceroy|checkerspot|crescent|comma|cloak|tortoiseshell|metalmark|elfin|azure)\b/.test(lower)) return obsCount / 1.5;

  // Dragonflies/damselflies: ×1 (no correction)
  if (/\b(dragonfly|damselfly|darner|skimmer|meadowhawk|pennant|dasher|pondhawk|clubtail|whiteface|saddlebags|glider|bluet|dancer|spreadwing|jewelwing)\b/.test(lower)) return obsCount;

  // Beetles, ants, wasps: ×3 (heavily under-reported)
  if (/\b(beetle|weevil|ladybug|lady beetle|firefly|lightning bug|ant|wasp|hornet|yellowjacket|sawfly|longhorn|scarab|stag beetle|ground beetle|carrion)\b/.test(lower)) return obsCount * 3;

  // Moths: ×2 (under-reported, nocturnal)
  if (/\b(moth|sphinx|hawk moth|silkmoth|luna|polyphemus|cecropia|io moth|underwing|tussock|tiger moth|woolly bear|inchworm|geometer|noctuid)\b/.test(lower)) return obsCount * 2;

  // Grasshoppers, crickets: ×2 (under-reported)
  if (/\b(grasshopper|cricket|katydid|locust|mormon cricket|camel cricket|band-winged)\b/.test(lower)) return obsCount * 2;

  // Fireflies: ×2 (under-reported outside synchronous events)
  if (/\bfirefl/i.test(lower)) return obsCount * 2;

  // Default: ×1 (no correction for other insects like bees, flies, bugs)
  return obsCount;
}

// ── Insect-specific rarity from observation count ───────────────────────────
function insectRarityFromObs(obsCount, name, locId) {
  const corrected = insectCharismaCorrection(obsCount, name);
  // Cap multiplier at 0.5 minimum for insects — prevents tiny parks from
  // having absurdly low guaranteed thresholds (e.g. 500 * 0.3 = 150 is too low).
  const rawMul = TIER1_PARKS.has(locId) ? 1.0 : TIER2_PARKS.has(locId) ? 0.6 : 0.3;
  const mul = Math.max(0.5, rawMul);

  if (corrected >= 500 * mul) return 'guaranteed';
  if (corrected >= 150 * mul) return 'very_likely';
  if (corrected >= 30  * mul) return 'likely';
  if (corrected >= 10  * mul) return 'unlikely';
  if (corrected >= 3   * mul) return 'rare';
  return 'exceptional';
}

// ── Extract observation count from funFact string ───────────────────────────
function extractObsCount(funFact) {
  if (!funFact) return null;
  const m = funFact.match(/(\d+)\s+research-grade/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🦋 Insect Rarity Patch Script');
  console.log('   Recalibrates insect rarity with insect-specific thresholds\n');

  const existing = await import('../src/data/wildlifeCache.js');
  const cache = {};
  for (const [k, v] of Object.entries(existing.WILDLIFE_CACHE)) {
    cache[k] = { ...v, animals: [...(v.animals || [])] };
  }

  let totalPatched = 0;
  let totalNoObs = 0;
  const beforeTiers = {};
  const afterTiers = {};

  for (const [parkId, parkData] of Object.entries(cache)) {
    if (!parkData?.animals) continue;

    parkData.animals = parkData.animals.map(animal => {
      if (animal.animalType !== 'insect') return animal;

      // Count before
      beforeTiers[animal.rarity] = (beforeTiers[animal.rarity] || 0) + 1;

      const obsCount = extractObsCount(animal.funFact);
      if (obsCount === null) {
        totalNoObs++;
        afterTiers[animal.rarity] = (afterTiers[animal.rarity] || 0) + 1;
        return animal;
      }

      const newRarity = insectRarityFromObs(obsCount, animal.name, parkId);
      totalPatched++;
      afterTiers[newRarity] = (afterTiers[newRarity] || 0) + 1;

      return {
        ...animal,
        rarity: newRarity,
        raritySource: 'inat_insect_calibrated',
      };
    });
  }

  // Write patched cache
  const builtAt = new Date().toISOString();
  const allParkIds = Object.keys(cache);
  const totalSpecies = Object.values(cache).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${builtAt}`,
    `// Parks: ${allParkIds.length} | Species bundled: ${totalSpecies}`,
    `// To regenerate: node scripts/buildWildlifeCache.js`,
    `// Bird rarity patched: 2026-03-31 via patchBirdRarity.js`,
    `// Insect rarity patched: ${new Date().toISOString().slice(0, 10)} via patchInsectRarity.js`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];

  for (const [id, val] of Object.entries(cache)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  const outPath = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(`📊 Patch Summary:`);
  console.log(`   Insects patched: ${totalPatched}`);
  console.log(`   Insects without obs count: ${totalNoObs}\n`);

  console.log(`📊 BEFORE — Insect Rarity Distribution:`);
  for (const t of ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional']) {
    console.log(`   ${t.padEnd(14)}: ${beforeTiers[t] || 0}`);
  }

  console.log(`\n📊 AFTER — Insect Rarity Distribution:`);
  for (const t of ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional']) {
    console.log(`   ${t.padEnd(14)}: ${afterTiers[t] || 0}`);
  }

  // Spot checks
  console.log(`\n🔍 Spot Checks:`);
  const checks = [
    { park: 'greatsmokymountains', insect: 'Monarch', label: 'Monarch @ Smoky Mountains' },
    { park: 'acadia', insect: 'Monarch', label: 'Monarch @ Acadia' },
    { park: 'grandcanyon', insect: 'Monarch', label: 'Monarch @ Grand Canyon' },
    { park: 'greatsmokymountains', insect: 'Synchronous Firefly', label: 'Synchronous Firefly @ Smoky Mountains' },
  ];
  for (const { park, insect, label } of checks) {
    const a = cache[park]?.animals?.find(x => x.name === insect);
    if (a) {
      const obs = extractObsCount(a.funFact);
      console.log(`   ${label.padEnd(45)} rarity: ${(a.rarity || '').padEnd(13)} obs: ${obs ?? 'n/a'} source: ${a.raritySource || 'n/a'}`);
    } else {
      console.log(`   ${label.padEnd(45)} NOT FOUND`);
    }
  }

  console.log(`\n✅ Written to ${outPath}`);
  console.log(`   Parks: ${allParkIds.length} | Species: ${totalSpecies}`);
}

main().catch(err => {
  console.error('Patch failed:', err);
  process.exit(1);
});
