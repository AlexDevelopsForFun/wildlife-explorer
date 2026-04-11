#!/usr/bin/env node
/**
 * scripts/calibrateCharisma.js — v2
 *
 * Empirical calibration of charisma correction factors.
 *
 * Strategy:
 * 1. For ALL 63 parks, find birds that have both eBird county freq (ground truth)
 *    AND iNat observation counts (from funFact or raw data).
 * 2. Compare: does the iNat-derived rarity match the eBird-derived rarity?
 * 3. Calculate observation intensity ratios per category to find empirical charisma bias.
 * 4. For mammals (no eBird ground truth), compare iNat rarity vs manual overrides.
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const mod = await import('../src/data/wildlifeCache.js');
const WILDLIFE_CACHE = mod.WILDLIFE_CACHE;

// ── Rarity utilities ───────────────────────────────────────────────────────
const RARITY_TIERS = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
const TIER_INDEX = Object.fromEntries(RARITY_TIERS.map((t, i) => [t, i]));

function rarityFromFreq(freq) {
  if (freq >= 0.90) return 'guaranteed';
  if (freq >= 0.60) return 'very_likely';
  if (freq >= 0.30) return 'likely';
  if (freq >= 0.10) return 'unlikely';
  if (freq >= 0.02) return 'rare';
  return 'exceptional';
}

// ── Park visitation tiers ──────────────────────────────────────────────────
const TIER1_PARKS = new Set(['yellowstone','greatsmokymountains','grandcanyon','zion','rockymountain']);
const TIER2_PARKS = new Set(['acadia','glacier','yosemite','grandteton','joshuatree','olympic']);

function parkVisMul(parkId) {
  return TIER1_PARKS.has(parkId) ? 1.0 : TIER2_PARKS.has(parkId) ? 0.6 : 0.3;
}

// ── Charisma category classifier ───────────────────────────────────────────
function classifyCharisma(name) {
  if (!name) return 'uncorrected';
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower)) return 'bald_eagle';
  if (/\b(wolf|wolves|gray wolf)\b/.test(lower)) return 'wolf';
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower)) return 'whale_dolphin';
  if (/\b(bear)\b/.test(lower)) return 'bear';
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return 'raptor_owl';
  if (/\b(bison|buffalo)\b/.test(lower)) return 'bison';
  if (/\belk\b/.test(lower)) return 'elk';
  if (/\b(moose)\b/.test(lower)) return 'moose';
  if (/\b(alligator|crocodile)\b/.test(lower)) return 'alligator_croc';
  if (/\bmountain goat\b/.test(lower)) return 'mountain_goat';
  if (/\bcoyote\b/.test(lower)) return 'coyote';
  if (/\bdeer\b/.test(lower)) return 'deer';
  if (/\b(heron|egret)\b/.test(lower)) return 'heron_egret';
  if (/\b(squirrel|chipmunk)\b/.test(lower)) return 'squirrel';
  if (/\b(rabbit|cottontail|hare)\b/.test(lower)) return 'rabbit';
  if (/\b(raccoon)\b/.test(lower)) return 'raccoon';
  if (/\b(fox)\b/.test(lower)) return 'fox';
  if (/\b(turkey)\b/.test(lower)) return 'turkey';
  if (/\b(goose|geese)\b/.test(lower)) return 'goose';
  if (/\b(duck|teal|merganser|mallard|wigeon|scaup|bufflehead|goldeneye|canvasback|shoveler|pintail|gadwall|redhead)\b/.test(lower)) return 'waterfowl';
  if (/\b(warbler)\b/.test(lower)) return 'warbler';
  if (/\b(sparrow|junco|towhee)\b/.test(lower)) return 'sparrow';
  if (/\b(swallow|swift)\b/.test(lower)) return 'swallow';
  if (/\b(woodpecker|flicker|sapsucker)\b/.test(lower)) return 'woodpecker';
  if (/\b(gull|tern)\b/.test(lower)) return 'gull_tern';
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower)) return 'small_rodent';
  if (/\bbat\b/.test(lower)) return 'bat';
  if (/\bsnake\b/.test(lower)) return 'snake';
  return 'other_bird';
}

// ── Current iNat charisma divisors ─────────────────────────────────────────
function getCurrentDivisor(name, locId) {
  if (!name) return 1;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower)) return 5;
  if (/\b(wolf|wolves|gray wolf)\b/.test(lower)) return 4;
  if (/\b(whale|dolphin|porpoise|orca)\b/.test(lower)) return 4;
  if (/\b(bear)\b/.test(lower)) {
    const BH = new Set(['katmai','lakeclark','glacierbay','denali','glacier','yellowstone','wrangellstelias','gatesofthearctic','kobukvalley']);
    const BM = new Set(['greatsmokymountains','shenandoah','newrivergorge','cuyahogavalley','olympic','mountrainier','sequoia','kingscanyon','yosemite','lassenvolcanic','redwood','northcascades','craterlake']);
    if (BH.has(locId)) return 2;
    if (BM.has(locId)) return 3;
    return 5;
  }
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return 3;
  if (/\b(bison|buffalo)\b/.test(lower)) {
    const BP = new Set(['yellowstone','badlands','grandteton','theodoreroosevelt','windcave']);
    return BP.has(locId) ? 1 : 2;
  }
  if (/\belk\b/.test(lower)) {
    const EP = new Set(['yellowstone','rockymountain','grandteton','greatsmokymountains','redwood']);
    return EP.has(locId) ? 1.5 : 2;
  }
  if (/\b(moose|alligator|crocodile)\b/.test(lower)) return 2;
  if (/\bmountain goat\b/.test(lower)) return 2;
  if (/\bcoyote\b/.test(lower)) return 1.5;
  if (/\bdeer\b/.test(lower)) {
    const EA = new Set(['acadia','shenandoah','greatsmokymountains','cuyahogavalley','newrivergorge','mammothcave','congaree','indianadunes','isleroyale','voyageurs','hotsprings','gatewayarch','everglades','biscayne','drytortugas']);
    return EA.has(locId) ? 1 : 1.5;
  }
  if (/\b(mouse|mice|vole|shrew|mole)\b/.test(lower)) return 1/5;
  if (/\bbat\b/.test(lower)) return 1/4;
  if (/\bsnake\b/.test(lower)) return 1/2;
  return 1;
}

// ── Current eBird charisma factor ──────────────────────────────────────────
function ebirdFactor(name) {
  if (!name) return 1;
  const lower = name.toLowerCase();
  if (/\bbald eagle\b/.test(lower)) return 1/5;
  if (/\b(hawk|owl|falcon|kite|harrier|kestrel|merlin|osprey|eagle|vulture|condor)\b/.test(lower)) return 1/3;
  return 1;
}

// ── Extract iNat obs from funFact ──────────────────────────────────────────
function extractInatObs(funFact) {
  if (!funFact) return null;
  const m1 = funFact.match(/(\d[\d,]*)\s+research-grade/i);
  if (m1) return parseInt(m1[1].replace(/,/g, ''), 10);
  const m2 = funFact.match(/(\d[\d,]*)\s+iNaturalist/i);
  if (m2) return parseInt(m2[1].replace(/,/g, ''), 10);
  // Try "documented X times"
  const m3 = funFact.match(/documented\s+(\d[\d,]*)\s+times/i);
  if (m3) return parseInt(m3[1].replace(/,/g, ''), 10);
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// APPROACH 1: Birds with both eBird county freq + iNat obs
//   Uses eBird as ground truth for encounter probability
// ════════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CHARISMA CORRECTION CALIBRATION — ALL 63 PARKS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Step 1: Build dataset — find species with BOTH data sources
const birdCalibration = [];  // birds with eBird county freq + iNat obs
const mammalCheck = [];       // mammals with rarity override + iNat obs

for (const [parkId, parkData] of Object.entries(WILDLIFE_CACHE)) {
  if (!parkData?.animals) continue;

  // Index by name for deduped lookup
  const byName = new Map();
  for (const a of parkData.animals) {
    byName.set(a.name, a);
  }

  for (const a of parkData.animals) {
    const inatObs = extractInatObs(a.funFact);

    if (a.animalType === 'bird' && a.raritySource === 'ebird_county_freq' && inatObs && inatObs > 0) {
      const cat = classifyCharisma(a.name);
      const curDiv = getCurrentDivisor(a.name, parkId);
      const mul = parkVisMul(parkId);

      // Compute what iNat would say
      const correctedObs = inatObs / curDiv;
      let inatTier;
      if (correctedObs >= 2000 * mul) inatTier = 'guaranteed';
      else if (correctedObs >= 500 * mul) inatTier = 'very_likely';
      else if (correctedObs >= 100 * mul) inatTier = 'likely';
      else if (correctedObs >= 20 * mul) inatTier = 'unlikely';
      else if (correctedObs >= 5 * mul) inatTier = 'rare';
      else inatTier = 'exceptional';

      const ebirdTier = a.rarity;

      // Observation intensity = inatObs / (encounter_freq proxy)
      // Use the TIER_INDEX as numeric proxy for encounter freq
      // Higher index = rarer = lower encounter freq
      const tierNum = TIER_INDEX[ebirdTier];

      birdCalibration.push({
        parkId, name: a.name, cat, curDiv,
        inatObs, inatTier, ebirdTier,
        match: inatTier === ebirdTier,
        tierDiff: TIER_INDEX[inatTier] - TIER_INDEX[ebirdTier],
        // +tierDiff = iNat says rarer, -tierDiff = iNat says more common
      });
    }

    // Mammals with overrides = ground truth comparison
    if (a.animalType === 'mammal' && a.raritySource === 'override' && inatObs && inatObs > 0) {
      const cat = classifyCharisma(a.name);
      const curDiv = getCurrentDivisor(a.name, parkId);
      const mul = parkVisMul(parkId);
      const correctedObs = curDiv >= 1 ? inatObs / curDiv : inatObs * (1/curDiv);
      let inatTier;
      if (correctedObs >= 2000 * mul) inatTier = 'guaranteed';
      else if (correctedObs >= 500 * mul) inatTier = 'very_likely';
      else if (correctedObs >= 100 * mul) inatTier = 'likely';
      else if (correctedObs >= 20 * mul) inatTier = 'unlikely';
      else if (correctedObs >= 5 * mul) inatTier = 'rare';
      else inatTier = 'exceptional';

      mammalCheck.push({
        parkId, name: a.name, cat, curDiv,
        inatObs, inatTier, overrideTier: a.rarity,
        match: inatTier === a.rarity,
        tierDiff: TIER_INDEX[inatTier] - TIER_INDEX[a.rarity],
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT PART 1: Birds (eBird ground truth)
// ════════════════════════════════════════════════════════════════════════════
console.log('── PART 1: BIRD CHARISMA CALIBRATION (eBird = ground truth) ──\n');
console.log(`   Total bird species with both eBird freq + iNat obs: ${birdCalibration.length}`);
const bMatches = birdCalibration.filter(d => d.match).length;
console.log(`   Tier matches: ${bMatches} (${(100*bMatches/birdCalibration.length).toFixed(1)}%)`);
console.log(`   Mismatches: ${birdCalibration.length - bMatches}`);
const bTooCommon = birdCalibration.filter(d => d.tierDiff > 0).length;
const bTooRare = birdCalibration.filter(d => d.tierDiff < 0).length;
console.log(`     iNat says too rare:   ${bTooRare}`);
console.log(`     iNat says too common: ${bTooCommon}\n`);

// Aggregate by category
const birdCatMap = new Map();
for (const d of birdCalibration) {
  if (!birdCatMap.has(d.cat)) birdCatMap.set(d.cat, []);
  birdCatMap.get(d.cat).push(d);
}

console.log('  CATEGORY            N    MATCH%  CUR÷  AVG.TIER.DIFF  iNat BIAS');
console.log('  ────────────────────────────────────────────────────────────────');
const catSummaries = [];
for (const [cat, items] of [...birdCatMap.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const n = items.length;
  const matchPct = (100 * items.filter(d => d.match).length / n).toFixed(0);
  const curDiv = items[0].curDiv;
  const avgDiff = (items.reduce((s, d) => s + d.tierDiff, 0) / n).toFixed(2);
  // Positive avgDiff = iNat says rarer on average; Negative = iNat says more common
  const bias = parseFloat(avgDiff) > 0.3 ? 'UNDER-REPORTS ↑' :
               parseFloat(avgDiff) < -0.3 ? 'OVER-REPORTS ↓' : 'balanced';
  catSummaries.push({ cat, n, matchPct, curDiv, avgDiff, bias, items });
  console.log(`  ${cat.padEnd(18)} ${String(n).padStart(4)}    ${matchPct.padStart(4)}%  ${String(curDiv).padStart(5)}   ${avgDiff.padStart(12)}  ${bias}`);
}
console.log();

// Show raptor_owl detail
const raptorItems = birdCatMap.get('raptor_owl') ?? [];
if (raptorItems.length > 0) {
  console.log('  🔍 Raptor/Owl detail (current eBird ÷3, iNat ÷3):');
  for (const d of raptorItems.slice(0, 15)) {
    console.log(`     ${d.parkId.padEnd(22)} ${d.name.padEnd(28)} obs=${String(d.inatObs).padStart(5)}  iNat=${d.inatTier.padEnd(13)} eBird=${d.ebirdTier.padEnd(13)} diff=${d.tierDiff}`);
  }
  console.log();
}

// Show bald_eagle detail
const eagleItems = birdCatMap.get('bald_eagle') ?? [];
if (eagleItems.length > 0) {
  console.log('  🦅 Bald Eagle detail (current eBird ÷5, iNat ÷5):');
  for (const d of eagleItems) {
    console.log(`     ${d.parkId.padEnd(22)} obs=${String(d.inatObs).padStart(5)}  iNat=${d.inatTier.padEnd(13)} eBird=${d.ebirdTier.padEnd(13)} diff=${d.tierDiff}`);
  }
  console.log();
}

// Show heron_egret detail
const heronItems = birdCatMap.get('heron_egret') ?? [];
if (heronItems.length > 0) {
  console.log('  🐦 Heron/Egret detail (current iNat ÷1, eBird ×1):');
  for (const d of heronItems.slice(0, 10)) {
    console.log(`     ${d.parkId.padEnd(22)} ${d.name.padEnd(28)} obs=${String(d.inatObs).padStart(5)}  iNat=${d.inatTier.padEnd(13)} eBird=${d.ebirdTier.padEnd(13)} diff=${d.tierDiff}`);
  }
  console.log();
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT PART 2: Mammals (override = ground truth)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── PART 2: MAMMAL CHARISMA CHECK (manual overrides = ground truth) ──\n');
console.log(`   Total mammals with override + iNat obs: ${mammalCheck.length}`);
const mMatches = mammalCheck.filter(d => d.match).length;
console.log(`   Tier matches: ${mMatches} (${(100*mMatches/mammalCheck.length).toFixed(1)}%)`);
console.log(`   Mismatches: ${mammalCheck.length - mMatches}\n`);

const mamCatMap = new Map();
for (const d of mammalCheck) {
  if (!mamCatMap.has(d.cat)) mamCatMap.set(d.cat, []);
  mamCatMap.get(d.cat).push(d);
}

console.log('  CATEGORY            N    MATCH%  CUR÷  AVG.DIFF  DIRECTION');
console.log('  ────────────────────────────────────────────────────────────');
for (const [cat, items] of [...mamCatMap.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const n = items.length;
  const matchPct = (100 * items.filter(d => d.match).length / n).toFixed(0);
  const curDiv = items[0].curDiv;
  const avgDiff = (items.reduce((s, d) => s + d.tierDiff, 0) / n).toFixed(2);
  const dir = parseFloat(avgDiff) > 0.3 ? 'NEEDS ↓ divisor' :
              parseFloat(avgDiff) < -0.3 ? 'NEEDS ↑ divisor' : 'OK';
  console.log(`  ${cat.padEnd(18)} ${String(n).padStart(4)}    ${matchPct.padStart(4)}%  ${String(curDiv).padStart(5)}   ${avgDiff.padStart(8)}  ${dir}`);
}

console.log('\n  Mammal detail:');
for (const d of mammalCheck) {
  const arrow = d.match ? '✓' : d.tierDiff > 0 ? '↑ too rare' : '↓ too common';
  console.log(`     ${d.parkId.padEnd(22)} ${d.name.padEnd(28)} obs=${String(d.inatObs).padStart(6)}  ÷${d.curDiv}  iNat=${d.inatTier.padEnd(13)} truth=${d.overrideTier.padEnd(13)} ${arrow}`);
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT PART 3: Observation Intensity Analysis
// For uncorrected birds, compute inatObs per tier to establish baseline
// Then check if charismatic categories deviate from baseline
// ════════════════════════════════════════════════════════════════════════════
console.log('\n\n── PART 3: OBSERVATION INTENSITY ANALYSIS ──\n');
console.log('   For each eBird rarity tier, what is the median iNat obs count?');
console.log('   This shows whether charismatic birds get disproportionately more iNat observations.\n');

// Build baseline from "other_bird" (uncorrected, non-charismatic)
const baselineBirds = birdCalibration.filter(d => d.cat === 'other_bird');
const charismaBirds = birdCalibration.filter(d => d.cat !== 'other_bird');

function medianOf(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s.length % 2 === 0 ? (s[s.length/2-1] + s[s.length/2]) / 2 : s[Math.floor(s.length/2)];
}

console.log('   Baseline (uncorrected "other_bird"):');
for (const tier of RARITY_TIERS) {
  const inTier = baselineBirds.filter(d => d.ebirdTier === tier);
  if (inTier.length === 0) continue;
  const medObs = medianOf(inTier.map(d => d.inatObs));
  console.log(`     ${tier.padEnd(14)} N=${String(inTier.length).padStart(3)}  median iNat obs = ${medObs}`);
}

if (charismaBirds.length > 0) {
  console.log('\n   Charismatic birds (before correction):');
  for (const tier of RARITY_TIERS) {
    const inTier = charismaBirds.filter(d => d.ebirdTier === tier);
    if (inTier.length === 0) continue;
    const medObs = medianOf(inTier.map(d => d.inatObs));
    console.log(`     ${tier.padEnd(14)} N=${String(inTier.length).padStart(3)}  median iNat obs = ${medObs}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT PART 4: Recommendations
// ════════════════════════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════════════');
console.log('  RECOMMENDATIONS — Before/After Table');
console.log('══════════════════════════════════════════════════════════════\n');

console.log('  CATEGORY            N     CUR÷   AVG.DIFF  MATCH%  RECOMMENDATION');
console.log('  ─────────────────────────────────────────────────────────────────');

// Combine bird and mammal data
const allCats = new Map();
for (const d of [...birdCalibration, ...mammalCheck]) {
  const cat = d.cat;
  if (!allCats.has(cat)) allCats.set(cat, []);
  allCats.get(cat).push(d);
}

for (const [cat, items] of [...allCats.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const n = items.length;
  const curDiv = items[0].curDiv;
  const matchPct = (100 * items.filter(d => d.match).length / n).toFixed(0);
  const avgDiff = items.reduce((s, d) => s + d.tierDiff, 0) / n;
  const avgDiffStr = avgDiff.toFixed(2);

  let rec;
  if (n < 10) {
    rec = `SKIP (N=${n} < 10)`;
  } else if (Math.abs(avgDiff) <= 0.3) {
    rec = `KEEP ÷${curDiv} (balanced)`;
  } else if (avgDiff > 0.3) {
    // iNat too rare → divisor too high → lower it
    const suggestedDiv = Math.max(1, Math.round(curDiv / (1 + avgDiff * 0.3) * 10) / 10);
    rec = `CONSIDER ÷${curDiv} → ÷${suggestedDiv} (iNat under-reports)`;
  } else {
    // iNat too common → divisor too low → raise it
    const suggestedDiv = Math.round(curDiv * (1 + Math.abs(avgDiff) * 0.3) * 10) / 10;
    rec = `CONSIDER ÷${curDiv} → ÷${suggestedDiv} (iNat over-reports)`;
  }

  console.log(`  ${cat.padEnd(18)} ${String(n).padStart(4)}   ${String(curDiv).padStart(5)}   ${avgDiffStr.padStart(8)}  ${matchPct.padStart(5)}%  ${rec}`);
}

console.log('\n  Legend: AVG.DIFF = mean(iNat_tier_index - truth_tier_index)');
console.log('         Positive = iNat says rarer than truth → divisor too high');
console.log('         Negative = iNat says more common than truth → divisor too low');

// ════════════════════════════════════════════════════════════════════════════
// SPECIFIC USER-REQUESTED CHECKS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════════════');
console.log('  SPECIFIC FACTOR ANALYSIS');
console.log('══════════════════════════════════════════════════════════════');

const checks = [
  { label: 'Bald Eagle (÷5)', cat: 'bald_eagle' },
  { label: 'Raptors/Owls (÷3)', cat: 'raptor_owl' },
  { label: 'Bears', cat: 'bear' },
  { label: 'Deer', cat: 'deer' },
  { label: 'Squirrel/Chipmunk', cat: 'squirrel' },
  { label: 'Heron/Egret', cat: 'heron_egret' },
  { label: 'Waterfowl (÷1)', cat: 'waterfowl' },
  { label: 'Warbler (÷1)', cat: 'warbler' },
  { label: 'Sparrow/Junco (÷1)', cat: 'sparrow' },
  { label: 'Gull/Tern (÷1)', cat: 'gull_tern' },
  { label: 'Other Bird (÷1)', cat: 'other_bird' },
];

for (const { label, cat } of checks) {
  const items = allCats.get(cat);
  if (!items || items.length === 0) {
    console.log(`\n  ${label}: No calibration data points`);
    continue;
  }
  const n = items.length;
  const matchPct = (100 * items.filter(d => d.match).length / n).toFixed(0);
  const avgDiff = (items.reduce((s, d) => s + d.tierDiff, 0) / n).toFixed(2);
  console.log(`\n  ${label}: N=${n}, match=${matchPct}%, avgDiff=${avgDiff}`);
  for (const d of items.slice(0, 8)) {
    const truth = d.ebirdTier || d.overrideTier;
    const arrow = d.match ? '✓' : d.tierDiff > 0 ? '↑rare' : '↓common';
    console.log(`    ${d.parkId.padEnd(22)} ${d.name.padEnd(28)} obs=${String(d.inatObs).padStart(5)} iNat=${d.inatTier.padEnd(13)} truth=${truth.padEnd(13)} ${arrow}`);
  }
}

console.log('\n\nDone.');
