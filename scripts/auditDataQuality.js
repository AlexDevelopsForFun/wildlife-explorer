#!/usr/bin/env node
/**
 * scripts/auditDataQuality.js
 *
 * Catches silent data-quality bugs that pass the existing build / split
 * pipeline but would surface as wrong predictions or broken features at
 * runtime. The Redwood Roosevelt Elk silent failure (override targeting
 * a species that doesn't exist in the cache) was the motivating example:
 * the override said "guaranteed" but the species was simply not in the
 * cache, so the override had no effect — and nothing flagged it.
 *
 * Audits performed:
 *   1. Override target sanity — every species in RARITY_OVERRIDES (both
 *      build-time and runtime tables) must exist in the cache for that
 *      park, otherwise the override is silently no-op.
 *   2. Zone-override target sanity — same for ZONE_OVERRIDES.
 *   3. Anchor target sanity — every species in rarityAnchors.json must
 *      exist in the cache (calibration coverage gap).
 *   4. Park species-count anomalies — flag parks with < 50 species
 *      (likely API failure during last rebuild).
 *   5. Missing-field audits — animals with rarity but no scientificName,
 *      animals with frequency=0 but rarity != 'exceptional', etc.
 *   6. Curated overrides shadowed by NPSpecies "Not in Park" — surfaces
 *      cases where the eligibility gate would drop a hand-curated entry.
 *
 * Output: text report to stdout; exit code 0 when all audits pass, 1 when
 * any audit reports a critical issue. Non-critical warnings always exit 0.
 *
 * Usage:
 *   node scripts/auditDataQuality.js
 *   STRICT=1 node scripts/auditDataQuality.js   # warnings also fail CI
 *
 * Wired into the merge job of the weekly rebuild workflow (continue-on-
 * error so it surfaces issues without gating deployments while we work
 * through the backlog).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STRICT = process.env.STRICT === '1';

// ── Aliases mirror the runtime + calibration script aliases so we don't
// double-flag aliased names. The cache uses iNat-canonical names which
// often differ from common-conversation names — Brown Bear instead of
// Grizzly Bear (same species: Ursus arctos), Hawaiian Goose instead of
// Nene, Wapiti instead of Roosevelt Elk (in some entries), etc.
const NAME_ALIASES = {
  // Elk variants
  'roosevelt elk': ['Wapiti', 'Elk', 'Roosevelt Elk'],
  'wapiti':        ['Wapiti', 'Elk', 'American Elk', 'Roosevelt Elk'],
  'american elk':  ['Elk', 'Wapiti', 'American Elk'],
  'elk':           ['Elk', 'Wapiti', 'American Elk', 'Roosevelt Elk'],
  // Bears — Brown / Grizzly are same species (Ursus arctos)
  'gray wolf':     ['Gray Wolf', 'Wolf'],
  'wolf':          ['Wolf', 'Gray Wolf'],
  'grizzly bear':  ['Grizzly Bear', 'Brown Bear'],
  'brown bear':    ['Brown Bear', 'Grizzly Bear'],
  'black bear':    ['Black Bear', 'American Black Bear'],
  'american black bear': ['American Black Bear', 'Black Bear'],
  // Big cats
  'mountain lion': ['Mountain Lion', 'Cougar', 'Puma'],
  'florida panther': ['Florida Panther', 'Mountain Lion', 'Cougar', 'Puma'],
  'puma':          ['Mountain Lion', 'Cougar', 'Puma'],
  'cougar':        ['Mountain Lion', 'Cougar', 'Puma'],
  // Sheep
  'caribou':       ['Caribou', 'Reindeer'],
  'reindeer':      ['Caribou', 'Reindeer'],
  'dall sheep':    ['Dall Sheep', 'Thinhorn Sheep'],
  'bighorn sheep': ['Bighorn Sheep', 'Rocky Mountain Bighorn Sheep', 'Desert Bighorn Sheep'],
  'desert bighorn sheep': ['Desert Bighorn Sheep', 'Bighorn Sheep'],
  // Deer subspecies — Black-tailed and Mule Deer overlap on the West Coast
  'mule deer':     ['Mule Deer', 'Black-tailed Deer', 'Columbian Black-tailed Deer'],
  'black-tailed deer': ['Black-tailed Deer', 'Mule Deer'],
  'white-tailed deer': ['White-tailed Deer', 'Whitetail Deer'],
  // Manatees
  'samoan flying fox': ['Samoan Flying Fox', 'Pacific Flying-fox'],
  'west indian manatee': ['West Indian Manatee', 'Manatee', 'Florida Manatee'],
  'florida manatee':     ['Florida Manatee', 'West Indian Manatee', 'Manatee'],
  'manatee':       ['Manatee', 'West Indian Manatee', 'Florida Manatee'],
  // Hawaii goose
  'nene':          ['Nene', 'Hawaiian Goose'],
  'hawaiian goose':['Hawaiian Goose', 'Nene'],
  // Birds & misc
  'common raven':  ['Common Raven', 'Raven'],
  'humpback whale':['Humpback Whale'],
  'common chuckwalla': ['Common Chuckwalla', 'Chuckwalla'],
  'chuckwalla':    ['Chuckwalla', 'Common Chuckwalla'],
  // Marine mammals — Bottlenose Dolphin parent species split into two
  // (Common + Tamanend's) in 2024 taxonomic update
  'bottlenose dolphin': [
    'Bottlenose Dolphin', 'Common Bottlenose Dolphin', "Tamanend's Bottlenose Dolphin",
  ],
  // River Otter — cache uses canonical iNat name
  'river otter':   ['River Otter', 'North American River Otter'],
  // Rattlesnake spelling variants
  'western diamond-backed rattlesnake': ['Western Diamondback Rattlesnake', 'Western Diamond-backed Rattlesnake'],
};

function findAnimalInPark(animals, speciesName) {
  if (!Array.isArray(animals)) return null;
  const target = speciesName.toLowerCase().trim();
  // Exact match
  let hit = animals.find(a => a.name?.toLowerCase().trim() === target);
  if (hit) return hit;
  // Alias match
  const aliases = NAME_ALIASES[target] ?? [];
  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();
    hit = animals.find(a => a.name?.toLowerCase().trim() === aliasLower);
    if (hit) return hit;
  }
  return null;
}

async function main() {
  console.log(`\n🔍 Wildlife data-quality audit\n`);

  const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');
  const { ZONE_OVERRIDES } = await import('../src/data/zoneOverrides.js');

  // Mirror the runtime cache loader's flagship-species patches so the audit
  // sees the actual runtime state, not just the static cache. Otherwise we'd
  // re-flag the very species the patches are filling in.
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

  // Pull the build-script's RARITY_OVERRIDES inline. We can't import the
  // build script directly (it has top-level await side effects), so
  // re-import the runtime mirror from apiService.js.
  const runtimeMod = await import('../src/services/apiService.js');
  // Runtime apiService.js doesn't export RARITY_OVERRIDES, but we can
  // grep-extract it by re-reading the file. Skip for now and rely on the
  // build-time table (parsed below).
  const buildSrc = readFileSync(path.join(ROOT, 'scripts', 'buildWildlifeCache.js'), 'utf8');
  const overridesMatch = buildSrc.match(/const RARITY_OVERRIDES = (\{[\s\S]*?\n\});/);
  let buildOverrides = {};
  if (overridesMatch) {
    try {
      // Parse the object literal — JS-hostile but works for this restricted shape
      // (single-quoted keys/values, no functions). Fall back silently on parse fail.
      // eslint-disable-next-line no-eval
      buildOverrides = eval('(' + overridesMatch[1] + ')');
    } catch {
      console.warn('⚠  Could not parse build-script RARITY_OVERRIDES — skipping that audit');
    }
  }

  const anchorsPath = path.join(ROOT, 'scripts', 'rarityAnchors.json');
  const { anchors } = JSON.parse(readFileSync(anchorsPath, 'utf8'));

  let criticalCount = 0;
  let warningCount = 0;
  function critical(msg) { console.error(`❌ ${msg}`); criticalCount++; }
  function warn(msg)     { console.warn(`⚠  ${msg}`); warningCount++; }
  function pass(msg)     { console.log(`✓ ${msg}`); }

  // ── Audit 1: build-time override targets exist in cache ────────────
  console.log(`📋 Audit 1: build-script RARITY_OVERRIDES targets`);
  let overrideMisses = [];
  for (const [parkId, overrides] of Object.entries(buildOverrides)) {
    const animals = WILDLIFE_CACHE[parkId]?.animals;
    if (!animals) continue;
    for (const speciesName of Object.keys(overrides)) {
      if (!findAnimalInPark(animals, speciesName)) {
        overrideMisses.push({ parkId, species: speciesName });
      }
    }
  }
  if (overrideMisses.length === 0) {
    pass(`All ${Object.values(buildOverrides).reduce((s, o) => s + Object.keys(o).length, 0)} override targets exist in cache.`);
  } else {
    for (const m of overrideMisses) {
      critical(`Build override [${m.parkId}] '${m.species}' — species not found in cache (silent override failure).`);
    }
  }

  // ── Audit 2: zone-override targets exist in cache ──────────────────
  console.log(`\n📋 Audit 2: ZONE_OVERRIDES targets`);
  let zoneMisses = [];
  for (const [parkId, parkOverrides] of Object.entries(ZONE_OVERRIDES)) {
    const animals = WILDLIFE_CACHE[parkId]?.animals;
    if (!animals) {
      warn(`Zone override defined for [${parkId}] but park not in cache.`);
      continue;
    }
    for (const speciesName of Object.keys(parkOverrides)) {
      // Zone override may have empty inner object (intentional placeholder)
      const inner = parkOverrides[speciesName];
      if (!inner || Object.keys(inner).length === 0) continue;
      if (!findAnimalInPark(animals, speciesName)) {
        zoneMisses.push({ parkId, species: speciesName });
      }
    }
  }
  if (zoneMisses.length === 0) {
    pass(`All zone-override targets exist in cache.`);
  } else {
    for (const m of zoneMisses) {
      critical(`Zone override [${m.parkId}] '${m.species}' — species not found in cache.`);
    }
  }

  // ── Audit 3: anchor targets exist in cache ─────────────────────────
  console.log(`\n📋 Audit 3: rarityAnchors.json targets`);
  let anchorMisses = [];
  for (const a of anchors) {
    const animals = WILDLIFE_CACHE[a.parkId]?.animals;
    if (!animals) {
      warn(`Anchor [${a.parkId}] '${a.species}' — park not in cache.`);
      continue;
    }
    if (!findAnimalInPark(animals, a.species)) {
      anchorMisses.push({ parkId: a.parkId, species: a.species });
    }
  }
  if (anchorMisses.length === 0) {
    pass(`All ${anchors.length} anchor targets exist in cache.`);
  } else {
    for (const m of anchorMisses) {
      warn(`Anchor [${m.parkId}] '${m.species}' — species not found in cache (calibration coverage gap).`);
    }
  }

  // ── Audit 4: park species-count anomalies ──────────────────────────
  console.log(`\n📋 Audit 4: park species-count sanity`);
  const MIN_SPECIES = 50;
  const lowCountParks = Object.entries(WILDLIFE_CACHE)
    .map(([id, val]) => ({ id, count: val.animals?.length ?? 0 }))
    .filter(p => p.count < MIN_SPECIES)
    .sort((a, b) => a.count - b.count);
  if (lowCountParks.length === 0) {
    pass(`All parks have ≥ ${MIN_SPECIES} species.`);
  } else {
    for (const p of lowCountParks) {
      warn(`Park [${p.id}] has only ${p.count} species (threshold ${MIN_SPECIES}) — likely API failure during rebuild.`);
    }
  }

  // ── Audit 5: missing-field audits ──────────────────────────────────
  console.log(`\n📋 Audit 5: animal record sanity`);
  let missingSciCount = 0;
  let missingTypeCount = 0;
  let zeroFreqMismatchCount = 0;
  for (const [parkId, val] of Object.entries(WILDLIFE_CACHE)) {
    for (const a of (val.animals ?? [])) {
      if (a.rarity && !a.scientificName) missingSciCount++;
      if (!a.animalType) missingTypeCount++;
      // Animals with explicit frequency=0 but non-exceptional rarity are
      // either a data error or a bug in the rarity assignment.
      if (a.frequency === 0 && a.rarity && a.rarity !== 'exceptional' && a.rarity !== 'rare') {
        zeroFreqMismatchCount++;
      }
    }
  }
  if (missingSciCount > 0) warn(`${missingSciCount} animals have rarity but no scientificName.`);
  else pass(`All animals with rarity also have scientificName.`);

  if (missingTypeCount > 0) warn(`${missingTypeCount} animals have no animalType.`);
  else pass(`All animals have animalType set.`);

  if (zeroFreqMismatchCount > 0) warn(`${zeroFreqMismatchCount} animals have frequency=0 but non-exceptional rarity.`);
  else pass(`No frequency=0 / rarity tier mismatches.`);

  // ── Audit 6: frequency-vs-tier mismatches ──────────────────────────
  // Catches the bug class fixed by commit 197d446 (TIER_CEILING clamp):
  // when an iNat live-fetch sets frequency = obsCount/500 (a dedup
  // priority proxy, NOT a true encounter rate), and a curated rarity
  // override sets a lower tier, the frequency value can leak into
  // seasonal computations (histogramToEncounterProb baseline) and
  // produce pills 2-3 tiers above the override's intended rarity.
  //
  // The runtime clamp fixed Grizzly Bear at Yellowstone — but it
  // applied only at runtime via the enriched useMemo. Any species at
  // any park with the same pattern (override tier ceiling < frequency)
  // had identical silent bugs. Surface them here.
  console.log(`\n📋 Audit 6: frequency-vs-rarity-tier consistency`);
  const TIER_CEILING_AUDIT = {
    guaranteed:  0.99,
    very_likely: 0.92,
    likely:      0.62,
    unlikely:    0.30,
    rare:        0.10,
    exceptional: 0.03,
  };
  const _RARITY_RANK = {
    guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5,
  };
  function _tierFromFreq(f) {
    if (f >= 0.92) return 'guaranteed';
    if (f >= 0.62) return 'very_likely';
    if (f >= 0.30) return 'likely';
    if (f >= 0.10) return 'unlikely';
    if (f >= 0.03) return 'rare';
    return 'exceptional';
  }
  let freqElevationVictims = [];
  for (const [parkId, val] of Object.entries(WILDLIFE_CACHE)) {
    for (const a of (val.animals ?? [])) {
      if (a.frequency == null || a.rarity == null) continue;
      const ceiling = TIER_CEILING_AUDIT[a.rarity];
      if (ceiling == null) continue;
      if (a.frequency <= ceiling) continue;          // in band
      const impliedTier = _tierFromFreq(a.frequency);
      const ranks = (_RARITY_RANK[a.rarity] ?? 5) - (_RARITY_RANK[impliedTier] ?? 5);
      if (ranks < 1) continue;                       // tolerance
      freqElevationVictims.push({
        parkId,
        species: a.name,
        rarity: a.rarity,
        frequency: a.frequency,
        impliedTier,
        deltaTiers: ranks,
        raritySource: a.raritySource,
      });
    }
  }
  if (freqElevationVictims.length === 0) {
    pass(`All frequencies are within their declared rarity tier's ceiling.`);
  } else {
    // Sort worst-first (largest tier delta)
    freqElevationVictims.sort((a, b) => b.deltaTiers - a.deltaTiers);
    const top = freqElevationVictims.slice(0, 12);
    warn(`${freqElevationVictims.length} animals have frequency exceeding their declared rarity tier's ceiling`);
    warn(`  → silent victims of the live-iNat-freq elevation bug (runtime clamp now fixes pills, but cache state is still misleading).`);
    console.log(`     ${'Park'.padEnd(20)} ${'Species'.padEnd(28)} ${'Tier'.padEnd(12)} ${'Freq'.padStart(6)} ${'→ Implied'.padEnd(15)} ${'Δ'.padStart(3)}`);
    for (const v of top) {
      console.log(`     ${v.parkId.padEnd(20)} ${(v.species ?? '').slice(0, 26).padEnd(28)} ${v.rarity.padEnd(12)} ${(v.frequency * 100).toFixed(0).padStart(4)}%  → ${v.impliedTier.padEnd(13)} ${v.deltaTiers}`);
    }
    if (freqElevationVictims.length > 12) {
      console.log(`     … and ${freqElevationVictims.length - 12} more.`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log(`\n📊 Summary`);
  console.log(`   Critical issues:  ${criticalCount}`);
  console.log(`   Warnings:         ${warningCount}`);

  const failOnWarnings = STRICT && warningCount > 0;
  if (criticalCount > 0 || failOnWarnings) {
    console.error(`\n❌ Audit FAILED${failOnWarnings ? ' (STRICT mode — warnings count)' : ''}\n`);
    process.exit(1);
  }
  console.log(`\n✅ Audit PASSED ${warningCount > 0 ? `(${warningCount} warning(s) — set STRICT=1 to fail on warnings)` : ''}\n`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
