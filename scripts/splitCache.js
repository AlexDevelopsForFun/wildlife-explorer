#!/usr/bin/env node
/**
 * scripts/splitCache.js
 *
 * Splits wildlifeCache.js into three tiers:
 *   wildlifeCachePrimary.js   (15 most-visited parks — sync load, on critical path)
 *   wildlifeCacheTier2.js     (next 15 parks        — async load on first idle)
 *   wildlifeCacheTier3.js     (remaining ~33 parks  — async load on second idle or search)
 *
 * Why three tiers?
 *   The secondary chunk used to be a single 12.4 MB / 1.18 MB gzip file. Tier-2
 *   covers the 30 parks that get 90%+ of traffic so users hit a popular "long
 *   tail" park without ever loading the full tier-3 bundle.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// Top 15 most-visited national parks (primary — sync)
const PRIMARY_PARKS = new Set([
  'greatsmokymountains', 'grandcanyon', 'zion', 'yellowstone', 'rockymountain',
  'acadia', 'grandteton', 'yosemite', 'glacier', 'joshuatree',
  'indianadunes', 'cuyahogavalley', 'hotsprings', 'olympic', 'shenandoah',
]);

// Next 15 most-visited (tier-2 — first idle callback)
const TIER2_PARKS = new Set([
  'bryce', 'brycecanyon', 'arches', 'mountrainier', 'haleakala',
  'everglades', 'kenaifjords', 'glaciers', 'glacierbay', 'badlands',
  'sequoia', 'kingscanyon', 'saguaro', 'capitolreef', 'denali',
  'deathvalley', 'canyonlands', 'biscayne',
]);

async function main() {
  const mod = await import('../src/data/wildlifeCache.js');
  const cache = mod.WILDLIFE_CACHE;
  const allIds = Object.keys(cache);

  const primary = {};
  const tier2   = {};
  const tier3   = {};

  for (const [id, val] of Object.entries(cache)) {
    if (PRIMARY_PARKS.has(id))      primary[id] = val;
    else if (TIER2_PARKS.has(id))   tier2[id]   = val;
    else                            tier3[id]   = val;
  }

  const primaryCount   = Object.keys(primary).length;
  const tier2Count     = Object.keys(tier2).length;
  const tier3Count     = Object.keys(tier3).length;

  const countSpecies = d => Object.values(d).reduce((s, v) => s + (v.animals?.length ?? 0), 0);
  const primarySpecies   = countSpecies(primary);
  const tier2Species     = countSpecies(tier2);
  const tier3Species     = countSpecies(tier3);

  function writeCache(filename, varName, data, parkCount, speciesCount) {
    const lines = [
      `// Auto-generated — do not edit manually.`,
      `// Parks: ${parkCount} | Species: ${speciesCount}`,
      ``,
      `export const ${varName} = {`,
    ];
    for (const [id, val] of Object.entries(data)) {
      lines.push(`  ${JSON.stringify(id)}: {`);
      lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
      lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
      lines.push(`  },`);
    }
    lines.push(`};`);
    lines.push(``);
    const outPath = path.join(DATA_DIR, filename);
    writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`  ✅ ${filename}: ${parkCount} parks, ${speciesCount} species`);
  }

  writeCache('wildlifeCachePrimary.js', 'WILDLIFE_CACHE_PRIMARY', primary, primaryCount, primarySpecies);
  writeCache('wildlifeCacheTier2.js',   'WILDLIFE_CACHE_TIER2',   tier2,   tier2Count,   tier2Species);
  writeCache('wildlifeCacheTier3.js',   'WILDLIFE_CACHE_TIER3',   tier3,   tier3Count,   tier3Species);

  console.log(`\n  Total: ${allIds.length} parks split into ${primaryCount} primary + ${tier2Count} tier-2 + ${tier3Count} tier-3`);
}

main().catch(err => { console.error(err); process.exit(1); });
