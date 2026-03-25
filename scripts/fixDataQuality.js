#!/usr/bin/env node
/**
 * scripts/fixDataQuality.js
 * Applies data-quality fixes directly to wildlifeCache.js:
 *  1. Add scientificName to 16 single-word animals
 *  2. Replace sci-name display names with English common names (via iNaturalist)
 *     or remove animals with no common name found
 *  3. Remove duplicate "Banded Longhorn Beetle" from Acadia
 *  4. Fix any foreign-language display names (e.g. Chacalillo Gris → Gray Fox)
 *
 * Idempotent — safe to re-run after enrichDescriptions.js overwrites the file.
 * Run: node scripts/fixDataQuality.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from '../src/data/wildlifeCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH  = path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js');
const INAT_CACHE  = path.join(__dirname, 'inat-common-names.json');
const DELAY_MS    = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 1. Scientific names for single-word animals ───────────────────────────────
const SCI_NAMES = {
  'Coyote':    'Canis latrans',
  'Bobcat':    'Lynx rufus',
  'Elk':       'Cervus canadensis',
  'Ringtail':  'Bassariscus astutus',
  'Pronghorn': 'Antilocapra americana',
  'Moose':     'Alces alces',
  'Muskrat':   'Ondatra zibethicus',
  'Caribou':   'Rangifer tarandus',
  'Donkey':    'Equus asinus',
  'Wolverine': 'Gulo gulo',
  'Aoudad':    'Ammotragus lervia',
  'Gemsbok':   'Oryx gazella',
  'Nutria':    'Myocastor coypus',
  'Fisher':    'Pekania pennanti',
  'Orca':      'Orcinus orca',
  'Muskox':    'Ovibos moschatus',
};

// ── 2. Foreign-language name corrections ─────────────────────────────────────
const FOREIGN_FIXES = {
  'Chacalillo Gris': { name: 'Gray Fox', scientificName: 'Urocyon cinereoargenteus' },
};

// ── 3. Sci-as-display detector ────────────────────────────────────────────────
const SCI_DISPLAY_RE = /^[A-Z][a-z]+ [a-z]+([a-z ]*)?$/;
function isSciAsDisplay(name) {
  if (!name) return false;
  // Must match Latin binomial pattern AND have no spaces that suggest an English phrase
  // Additional guard: English phrases usually have conjunctions/prepositions
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return SCI_DISPLAY_RE.test(name);
}

// ── iNaturalist common-name lookup ────────────────────────────────────────────
async function fetchCommonName(sciName) {
  const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(sciName)}&locale=en&per_page=5`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    const results = json.results ?? [];
    // Prefer exact scientific name match
    const exact = results.find(r =>
      r.name?.toLowerCase() === sciName.toLowerCase()
    );
    const best = exact ?? results[0];
    return best?.preferred_common_name ?? null;
  } catch {
    return null;
  }
}

// ── Capitalise first letter ───────────────────────────────────────────────────
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Deep-clone cache so we can mutate freely
  const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

  // ── Load iNat common-name cache ───────────────────────────────────────────
  let inatCache = existsSync(INAT_CACHE)
    ? JSON.parse(readFileSync(INAT_CACHE, 'utf8'))
    : {};

  // ── Collect unique sci-as-display names not yet looked up ─────────────────
  const uniqueSciDisplay = new Set();
  Object.values(cache).forEach(pd =>
    (pd.animals ?? []).forEach(a => {
      if (isSciAsDisplay(a.name)) uniqueSciDisplay.add(a.name);
    })
  );

  const toLookup = [...uniqueSciDisplay].filter(n => !(n in inatCache));
  const cached   = uniqueSciDisplay.size - toLookup.length;
  console.log(`\niNaturalist lookups: ${toLookup.length} new, ${cached} already cached`);

  // ── Fetch missing common names ────────────────────────────────────────────
  let fetched = 0, foundCount = 0;
  for (const sciName of toLookup) {
    const common = await fetchCommonName(sciName);
    inatCache[sciName] = common ?? '__REMOVE__';
    fetched++;
    if (common) foundCount++;
    process.stdout.write(`\r  ${fetched}/${toLookup.length} fetched — ${foundCount} resolved, ${fetched - foundCount} will be removed`);
    await sleep(DELAY_MS);
  }
  if (toLookup.length) {
    console.log('\n');
  }

  // Save updated iNat name cache
  writeFileSync(INAT_CACHE, JSON.stringify(inatCache, null, 2));

  // ── Apply all fixes ───────────────────────────────────────────────────────
  const stats = {
    sciNamesAdded:      0,
    foreignFixed:       0,
    sciDisplayResolved: 0,
    sciDisplayRemoved:  0,
    duplicatesRemoved:  0,
  };

  const resolvedList  = [];
  const removedList   = [];

  for (const parkId of Object.keys(cache)) {
    const pd      = cache[parkId];
    const animals = pd.animals ?? [];
    const seen    = new Set();
    const fixed   = [];

    for (const animal of animals) {
      const originalName = animal.name ?? '';

      // ── Remove exact duplicates (keep first occurrence) ───────────────────
      const key = originalName.toLowerCase().trim();
      if (seen.has(key)) {
        stats.duplicatesRemoved++;
        continue;
      }
      seen.add(key);

      // ── Fix foreign-language names ────────────────────────────────────────
      if (FOREIGN_FIXES[originalName]) {
        const fix = FOREIGN_FIXES[originalName];
        animal.name = fix.name;
        animal.scientificName = animal.scientificName ?? fix.scientificName;
        stats.foreignFixed++;
      }

      // ── Add scientific names to single-word animals ───────────────────────
      const currentName = animal.name ?? '';
      if (!currentName.includes(' ') && !animal.scientificName && SCI_NAMES[currentName]) {
        animal.scientificName = SCI_NAMES[currentName];
        stats.sciNamesAdded++;
      }

      // ── Resolve or remove sci-as-display names ────────────────────────────
      if (isSciAsDisplay(animal.name)) {
        const common = inatCache[animal.name];
        if (common && common !== '__REMOVE__') {
          const displayName = cap(common);
          resolvedList.push({ park: parkId, sci: animal.name, common: displayName });
          if (!animal.scientificName) animal.scientificName = animal.name;
          animal.name = displayName;
          stats.sciDisplayResolved++;
        } else {
          removedList.push({ park: parkId, name: animal.name });
          stats.sciDisplayRemoved++;
          continue; // do not push to fixed array
        }
      }

      fixed.push(animal);
    }

    pd.animals = fixed;
  }

  // ── Write patched wildlifeCache.js ────────────────────────────────────────
  const totalAnimals = Object.values(cache).reduce((s, pd) => s + (pd.animals?.length ?? 0), 0);
  const builtAt = WILDLIFE_CACHE_BUILT_AT;

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${builtAt}`,
    `// Data quality fixes applied: ${new Date().toISOString()}`,
    `// Parks: ${Object.keys(cache).length} | Species bundled: ${totalAnimals}`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];
  for (const [id, val] of Object.entries(cache)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    "builtAt": ${JSON.stringify(val.builtAt)},`);
    lines.push(`    "animals": ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');

  // ── Final report ──────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DATA QUALITY FIX REPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Scientific names added (single-word animals): ${stats.sciNamesAdded}`);
  console.log(`  ✅ Foreign names fixed:                          ${stats.foreignFixed}`);
  console.log(`  ✅ Sci-as-display resolved via iNaturalist:      ${stats.sciDisplayResolved}`);
  console.log(`  🗑  Sci-as-display removed (no common name):     ${stats.sciDisplayRemoved}`);
  console.log(`  🗑  Duplicates removed:                          ${stats.duplicatesRemoved}`);
  console.log(`  📦 Animals in cache after fixes:                 ${totalAnimals}`);
  console.log('───────────────────────────────────────────────────────────');

  if (resolvedList.length) {
    console.log('\n  Resolved sci→common names:');
    resolvedList.forEach(r => console.log(`    [${r.park}] ${r.sci} → ${r.common}`));
  }
  if (removedList.length > 0 && removedList.length <= 30) {
    console.log('\n  Removed (no common name found):');
    removedList.forEach(r => console.log(`    [${r.park}] ${r.name}`));
  } else if (removedList.length > 30) {
    console.log(`\n  Removed ${removedList.length} animals with no common name.`);
    console.log('  First 20:');
    removedList.slice(0, 20).forEach(r => console.log(`    [${r.park}] ${r.name}`));
  }

  console.log('\n  ✅ Written to wildlifeCache.js\n');
}

main().catch(e => { console.error(e); process.exit(1); });
