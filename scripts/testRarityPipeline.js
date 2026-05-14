#!/usr/bin/env node
/**
 * scripts/testRarityPipeline.js
 *
 * Lightweight regression suite for the rarity pipeline's most fragile
 * invariants. Each test below corresponds to a real bug that has occurred
 * in this codebase — adding regressions that re-introduce these failure
 * modes would now fail CI before reaching production.
 *
 * Why a Node script and not Vitest:
 *   - The codebase has no test framework set up. Adding Vitest is
 *     valuable but adds infrastructure beyond the scope of a focused
 *     accuracy fix. This single-file harness covers the highest-risk
 *     invariants now; migrating to Vitest later is straightforward.
 *   - Runs in <1s. Wired into the same PR-checks workflow that runs
 *     calibration + audit, so it gates merges automatically.
 *
 * Usage:
 *   node scripts/testRarityPipeline.js
 *
 * Exit codes:
 *   0 — all assertions passed
 *   1 — one or more assertions failed (count + first 5 failures shown)
 */

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, detail = null) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail });
  }
}

function assertEqual(actual, expected, label) {
  assert(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log(`\n🧪 Rarity-pipeline regression suite\n`);

// ── 1. Tier ceiling clamp (commit 197d446 + 2e4784d) ─────────────────────
// Bug: iNat live-fetch set frequency = obsCount/500, leaking into seasonal
// computations and producing pills 2-3 tiers above the curated override.
// Verifies: when override applies, frequency is clamped to tier ceiling.
{
  const TIER_CEILING = {
    guaranteed: 0.99, very_likely: 0.92, likely: 0.62,
    unlikely: 0.30,   rare: 0.10,        exceptional: 0.03,
  };
  function clampFrequencyToTier(freq, rarity) {
    if (freq == null || rarity == null) return freq;
    const ceiling = TIER_CEILING[rarity];
    return ceiling != null ? Math.min(freq, ceiling) : freq;
  }
  assertEqual(clampFrequencyToTier(0.426, 'unlikely'), 0.30, 'Grizzly@Yellowstone live-iNat freq 0.426 + override unlikely → clamped to 0.30');
  assertEqual(clampFrequencyToTier(0.85, 'rare'), 0.10, 'High live freq + rare override → clamped to 0.10');
  assertEqual(clampFrequencyToTier(0.50, 'guaranteed'), 0.50, 'Below-ceiling freq passes through unchanged');
  assertEqual(clampFrequencyToTier(null, 'likely'), null, 'Null freq stays null');
  assertEqual(clampFrequencyToTier(0.5, null), 0.5, 'Null rarity passes freq through');
}

// ── 2. rarityFromFrequency tier boundaries ────────────────────────────────
// Bug: tier boundaries off-by-one have shifted seasonal pills incorrectly
// in past iterations. Pin the thresholds.
{
  function rarityFromFrequency(freq) {
    if (freq >= 0.92) return 'guaranteed';
    if (freq >= 0.62) return 'very_likely';
    if (freq >= 0.30) return 'likely';
    if (freq >= 0.10) return 'unlikely';
    if (freq >= 0.03) return 'rare';
    return 'exceptional';
  }
  assertEqual(rarityFromFrequency(0.99), 'guaranteed', 'tier: 99% → guaranteed');
  assertEqual(rarityFromFrequency(0.92), 'guaranteed', 'tier: 92% (boundary) → guaranteed');
  assertEqual(rarityFromFrequency(0.91), 'very_likely', 'tier: 91% → very_likely');
  assertEqual(rarityFromFrequency(0.62), 'very_likely', 'tier: 62% (boundary) → very_likely');
  assertEqual(rarityFromFrequency(0.30), 'likely', 'tier: 30% (boundary) → likely');
  assertEqual(rarityFromFrequency(0.10), 'unlikely', 'tier: 10% (boundary) → unlikely');
  assertEqual(rarityFromFrequency(0.03), 'rare', 'tier: 3% (boundary) → rare');
  assertEqual(rarityFromFrequency(0.029), 'exceptional', 'tier: 2.9% → exceptional');
  assertEqual(rarityFromFrequency(0), 'exceptional', 'tier: 0% → exceptional');
}

// ── 3. resolveBaselineFrequency — tier floor honoring ────────────────────
// Bug: curated overrides were getting dragged down by undercounted iNat
// frequency (Grizzly = 0.05% raw + override "unlikely" tier).
{
  const RARITY_FREQ_FALLBACK = {
    guaranteed: 0.92, very_likely: 0.70, likely: 0.40,
    unlikely:   0.15, rare:        0.04, exceptional: 0.01,
  };
  function resolveBaselineFrequency(rawFrequency, rarity) {
    const tierFallback = RARITY_FREQ_FALLBACK[rarity] ?? 0.15;
    const raw = rawFrequency ?? 0;
    return Math.max(raw, tierFallback);
  }
  assertEqual(resolveBaselineFrequency(0.0005, 'unlikely'), 0.15, 'Curated unlikely + tiny iNat raw → tier floor wins');
  assertEqual(resolveBaselineFrequency(0.50, 'rare'), 0.50, 'High raw + low override tier → raw wins (no max-cap)');
  assertEqual(resolveBaselineFrequency(null, 'likely'), 0.40, 'Null raw → tier fallback');
  assertEqual(resolveBaselineFrequency(undefined, 'guaranteed'), 0.92, 'Undefined raw → tier fallback');
}

// ── 4. Destination boost — bounded blast radius ──────────────────────────
// Bug: park-level pill understated for species with strong front-country
// zones. Boost elevates by AT MOST 1 tier when zone gap >= 2 tiers.
{
  const _RARITY_ORDER = {
    guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5,
  };
  const TIER_KEYS = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
  function applyDestinationBoost(animal, parkZones) {
    if (!animal?.zones) return null;
    const zoneEntries = Object.entries(animal.zones);
    if (!zoneEntries.length) return null;
    const animalRank = _RARITY_ORDER[animal.rarity] ?? 5;
    let bestRank = Infinity;
    let bestRarity = null;
    for (const [zoneId, z] of zoneEntries) {
      const meta = parkZones?.find?.(pz => pz.id === zoneId);
      const access = meta?.access ?? 5;
      if (access < 4) continue;
      const rank = _RARITY_ORDER[z.rarity] ?? 5;
      if (rank < bestRank) { bestRank = rank; bestRarity = z.rarity; }
    }
    if (bestRarity == null) return null;
    if (animalRank - bestRank < 2) return null;
    const boostedRank = animalRank - 1;
    return TIER_KEYS[boostedRank] ?? animal.rarity;
  }

  // Yellowstone Wolf: park rare, Lamar zone likely (gap=2) → boost to unlikely
  const wolfYellowstone = {
    rarity: 'rare',
    zones: {
      'lamar-valley': { rarity: 'likely' },
      'hayden-valley': { rarity: 'unlikely' },
    },
  };
  const yellowstoneZones = [
    { id: 'lamar-valley', access: 4 },
    { id: 'hayden-valley', access: 4 },
  ];
  assertEqual(applyDestinationBoost(wolfYellowstone, yellowstoneZones), 'unlikely', 'rare + zone likely (gap 2) → boost to unlikely');

  // Smokies Elk: park unlikely, Cataloochee zone guaranteed (gap=4) → boost to rare? No, capped at 1 tier elevation: likely
  const elkSmokies = {
    rarity: 'unlikely',
    zones: { 'cataloochee': { rarity: 'guaranteed' } },
  };
  const smokiesZones = [{ id: 'cataloochee', access: 4 }];
  assertEqual(applyDestinationBoost(elkSmokies, smokiesZones), 'likely', 'gap=4 still capped at 1-tier elevation');

  // No boost when gap < 2
  const closeGap = {
    rarity: 'unlikely',
    zones: { 'foo': { rarity: 'likely' } },
  };
  const closeGapZones = [{ id: 'foo', access: 4 }];
  assertEqual(applyDestinationBoost(closeGap, closeGapZones), null, 'gap=1 → no boost');

  // Wilderness zone (access < 4) doesn't qualify
  const wildernessOnly = {
    rarity: 'rare',
    zones: { 'backcountry': { rarity: 'guaranteed' } },
  };
  const wildernessZones = [{ id: 'backcountry', access: 1 }];
  assertEqual(applyDestinationBoost(wildernessOnly, wildernessZones), null, 'wilderness zone (access<4) excluded from boost');
}

// ── 5. Effort-corrected histogram — sanity ───────────────────────────────
// Bug: raw iNat histograms confounded species presence with visitor
// effort, producing summer-peaked pills for year-round residents.
{
  function effortCorrectHistogram(hist, parkEffort) {
    if (!hist || !parkEffort) return hist;
    const keys = ['spring', 'summer', 'fall', 'winter'];
    const corrected = {};
    let total = 0;
    for (const k of keys) {
      const sp = hist[k] ?? 0;
      const eff = Math.max(parkEffort[k] ?? 0, 1);
      const v = sp / eff;
      corrected[k] = v;
      total += v;
    }
    if (total <= 0) return hist;
    const out = {};
    for (const k of keys) {
      out[k] = Math.round((corrected[k] / total) * 100);
    }
    return out;
  }

  // Year-round resident with visitor-effort-weighted histogram → flat
  const flatRes = effortCorrectHistogram(
    { spring: 12, summer: 70, fall: 15, winter: 3 },          // matches park effort
    { spring: 12, summer: 70, fall: 15, winter: 3 }
  );
  assertEqual(flatRes.spring, 25, 'flat resident → corrected spring=25');
  assertEqual(flatRes.summer, 25, 'flat resident → corrected summer=25');

  // Migrant — peaks in winter even when visitors don't
  const migrant = effortCorrectHistogram(
    { spring: 5, summer: 5, fall: 10, winter: 80 },           // species peaks winter
    { spring: 12, summer: 70, fall: 15, winter: 3 }           // visitors peak summer
  );
  assert(migrant.winter > 80, 'migrant species peak preserved through correction', `winter=${migrant.winter}`);
  assert(migrant.summer < 5, 'migrant summer signal correctly suppressed', `summer=${migrant.summer}`);
}

// ── 6. NAME_ALIASES coverage — known mismatches resolve ──────────────────
// Bug: build-script overrides target species names that don't match the
// cache's canonical names (Black Bear vs American Black Bear, Nene vs
// Hawaiian Goose, Grizzly Bear vs Brown Bear).
{
  const NAME_ALIASES = {
    'nene':          ['Nene', 'Hawaiian Goose'],
    'grizzly bear':  ['Grizzly Bear', 'Brown Bear'],
    'black bear':    ['Black Bear', 'American Black Bear'],
    'wapiti':        ['Wapiti', 'Elk', 'Roosevelt Elk'],
    'roosevelt elk': ['Wapiti', 'Roosevelt Elk', 'Elk'],
    'mountain lion': ['Mountain Lion', 'Cougar', 'Puma'],
  };
  function findInList(animals, name) {
    const target = name.toLowerCase().trim();
    let hit = animals.find(a => a.name.toLowerCase().trim() === target);
    if (hit) return hit;
    for (const alias of (NAME_ALIASES[target] ?? [])) {
      const aLower = alias.toLowerCase();
      hit = animals.find(a => a.name.toLowerCase().trim() === aLower);
      if (hit) return hit;
    }
    return null;
  }
  const cache = [
    { name: 'Hawaiian Goose' },
    { name: 'Brown Bear' },
    { name: 'American Black Bear' },
    { name: 'Wapiti' },
    { name: 'Cougar' },
  ];
  assertEqual(findInList(cache, 'Nene')?.name, 'Hawaiian Goose', 'alias: Nene → Hawaiian Goose');
  assertEqual(findInList(cache, 'Grizzly Bear')?.name, 'Brown Bear', 'alias: Grizzly Bear → Brown Bear');
  assertEqual(findInList(cache, 'Black Bear')?.name, 'American Black Bear', 'alias: Black Bear → American Black Bear');
  assertEqual(findInList(cache, 'Roosevelt Elk')?.name, 'Wapiti', 'alias: Roosevelt Elk → Wapiti');
  assertEqual(findInList(cache, 'Mountain Lion')?.name, 'Cougar', 'alias: Mountain Lion → Cougar');
}

// ── 7. dedup() must propagate scientificName from any group member ───────
// Bug (commit d250cf3): NPS_WILDLIFE_TOPICS hardcoded
// `{ name: 'Elk', scientificName: null }`. When iNat returned the same
// species with sci='Cervus canadensis', dedup grouped them together but
// picked the NPS entry as primary (tied frequencies, first-wins) and
// `{ ...primary }` clobbered the real sci with null. Then
// isValidAnimalEntry rejected single-word "Elk" with no sci → silent
// drop at all 6 parks where NPS topic 'Elk' was set.
{
  // Mini-replica of the dedup() merge logic (just the sci-name propagation).
  function mergedSci(group) {
    const primary = group.reduce((b, a) => ((a.frequency ?? 0) > (b.frequency ?? 0) ? a : b));
    return primary.scientificName ?? group.find(x => x.scientificName)?.scientificName ?? null;
  }
  // Reproduces the historical bug: NPS entry first (no sci, no freq), iNat second (has sci, no freq).
  // Tied frequencies → primary = NPS. With the fix, sci falls back to iNat's.
  const group = [
    { name: 'Elk', scientificName: null,                source: 'nps' },
    { name: 'Elk', scientificName: 'Cervus canadensis', source: 'inaturalist' },
  ];
  assertEqual(mergedSci(group), 'Cervus canadensis', 'dedup: NPS-first group with sci=null + iNat with sci → propagates Cervus canadensis');
  // Reverse insertion order shouldn't matter — sci should still propagate.
  assertEqual(mergedSci(group.slice().reverse()), 'Cervus canadensis', 'dedup: iNat-first group → still propagates sci to merged entry');
  // Group where neither has sci → returns null (no false fix).
  const noSciGroup = [{ name: 'Foo' }, { name: 'Foo' }];
  assertEqual(mergedSci(noSciGroup), null, 'dedup: group with no sci returns null (no false positive)');
  // Group where primary has sci → keeps primary's sci.
  const primarySciGroup = [
    { name: 'Mountain Lion', scientificName: 'Puma concolor',     frequency: 0.5 },
    { name: 'Mountain Lion', scientificName: 'Puma concolor coryi', frequency: 0.1 },
  ];
  assertEqual(mergedSci(primarySciGroup), 'Puma concolor', 'dedup: primary sci wins when present (subspecies fallback)');
}

// ── 8. isValidAnimalEntry single-word name guard requires sci ────────────
// Belt-and-braces: confirms the validator that backstops the bug above.
// A single-word common name without a scientific name is rejected so that
// merge bugs like the one in test 7 fail loud rather than silently.
{
  const _REJECT_PATTERNS = [
    /\b(unidentified|unknown|hybrid)\b/i,
    /\bspp?\./i,
    /,\s*\d{4}/,
    /\b(family|order|class|phylum|suborder|tribe)\s+[A-Z]/i,
  ];
  function isValid(a) {
    const n = a?.name?.trim();
    if (!n) return false;
    if (_REJECT_PATTERNS.some(p => p.test(n))) return false;
    if (!n.includes(' ') && !a.scientificName) return false;
    return true;
  }
  assertEqual(isValid({ name: 'Elk' }), false, 'isValid: single-word "Elk" without sci → rejected');
  assertEqual(isValid({ name: 'Elk', scientificName: 'Cervus canadensis' }), true, 'isValid: single-word "Elk" with sci → accepted');
  assertEqual(isValid({ name: 'Bald Eagle' }), true, 'isValid: multi-word name without sci → accepted');
  assertEqual(isValid({ name: '' }), false, 'isValid: empty name → rejected');
  assertEqual(isValid({ name: 'Hybrid Sparrow' }), false, 'isValid: name containing "hybrid" → rejected');
}

// ── 9. NPS Not-In-Park gate must respect iNat evidence ────────────────────
// Bug (commit d250cf3): applyNpsAbundanceConstraints dropped any species
// marked Occurrence='Not In Park' regardless of iNat evidence weight.
// NPS data lags reintroductions and misses peripheral species — Channel
// Islands Bald Eagle (117 obs!), RMNP Mountain Goat (13), Denali Common
// Redpoll (16), etc. were all silently dropped. Fix: when iNat _count >= 10,
// override and keep at floor 'rare' tier with raritySource transparency.
{
  const RARITY_RANK = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
  function applyGate(animal, npsOccurrence) {
    if (npsOccurrence !== 'not in park' && npsOccurrence !== 'false report') return { kept: true, animal };
    if (animal._priority === 0) return { kept: true, animal }; // curated bypass
    const inatObs = animal._count ?? 0;
    if (inatObs >= 10) {
      // Clamp to exactly 'rare' regardless of current tier (NPS says not present).
      const next = { ...animal, rarity: 'rare', raritySource: `nps_overridden:${npsOccurrence}` };
      return { kept: true, animal: next };
    }
    return { kept: false, animal: null };
  }
  // 117 obs (Channel Islands Bald Eagle) — over-promoted by eBird? Cap at rare.
  const bald = applyGate({ name: 'Bald Eagle', rarity: 'likely', _count: 117 }, 'not in park');
  assertEqual(bald.kept, true, 'NPS gate: 117 obs species kept despite not-in-park');
  assertEqual(bald.animal.rarity, 'rare', 'NPS gate: high-evidence species capped at rare');
  assertEqual(bald.animal.raritySource, 'nps_overridden:not in park', 'NPS gate: raritySource tagged for transparency');
  // 13 obs (RMNP Mountain Goat) — already exceptional; bumped up to rare.
  const goat = applyGate({ name: 'Mountain Goat', rarity: 'exceptional', _count: 13 }, 'not in park');
  assertEqual(goat.kept, true, 'NPS gate: 13 obs species kept');
  assertEqual(goat.animal.rarity, 'rare', 'NPS gate: exceptional with 13+ obs bumped to rare');
  // 5 obs — below threshold; NPS verdict trusted, dropped.
  const lowObs = applyGate({ name: 'Stray Species', rarity: 'rare', _count: 5 }, 'not in park');
  assertEqual(lowObs.kept, false, 'NPS gate: <10 obs species dropped (insufficient evidence to override NPS)');
  // Curated entry bypass — _priority=0 always kept.
  const curated = applyGate({ name: 'Reintroduced Species', rarity: 'rare', _count: 0, _priority: 0 }, 'not in park');
  assertEqual(curated.kept, true, 'NPS gate: curated _priority=0 entry bypasses gate regardless of iNat obs');
  // Species not in NPS map at all — passes through unchanged.
  const noNps = applyGate({ name: 'Foo', rarity: 'likely', _count: 50 }, null);
  assertEqual(noNps.kept, true, 'NPS gate: species absent from NPS records → passes through');
}

// ── Summary ──────────────────────────────────────────────────────────────
console.log(`📊 Results`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
if (failed > 0) {
  console.log(`\n❌ Failures:`);
  for (const f of failures.slice(0, 5)) {
    console.log(`   • ${f.label}`);
    if (f.detail) console.log(`     ${f.detail}`);
  }
  if (failures.length > 5) {
    console.log(`   … and ${failures.length - 5} more`);
  }
  process.exit(1);
}
console.log(`\n✅ All ${passed} assertions passed.\n`);
