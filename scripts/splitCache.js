#!/usr/bin/env node
/**
 * scripts/splitCache.js
 *
 * Splits wildlifeCache.js into:
 *   wildlifeCachePrimary.js   (15 most-visited parks, sync load)
 *   wildlifeCacheSecondary.js (48 remaining parks, async load)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// Top 15 most-visited national parks
const PRIMARY_PARKS = new Set([
  'greatsmokymountains', 'grandcanyon', 'zion', 'yellowstone', 'rockymountain',
  'acadia', 'grandteton', 'yosemite', 'glacier', 'joshuatree',
  'indianadunes', 'cuyahogavalley', 'hotsprings', 'olympic', 'shenandoah',
]);

async function main() {
  const mod = await import('../src/data/wildlifeCache.js');
  const cache = mod.WILDLIFE_CACHE;
  const allIds = Object.keys(cache);

  const primary = {};
  const secondary = {};

  for (const [id, val] of Object.entries(cache)) {
    if (PRIMARY_PARKS.has(id)) {
      primary[id] = val;
    } else {
      secondary[id] = val;
    }
  }

  const primaryCount = Object.keys(primary).length;
  const secondaryCount = Object.keys(secondary).length;
  const primarySpecies = Object.values(primary).reduce((s, v) => s + (v.animals?.length ?? 0), 0);
  const secondarySpecies = Object.values(secondary).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

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
  writeCache('wildlifeCacheSecondary.js', 'WILDLIFE_CACHE_SECONDARY', secondary, secondaryCount, secondarySpecies);

  console.log(`\n  Total: ${allIds.length} parks split into ${primaryCount} primary + ${secondaryCount} secondary`);
}

main().catch(err => { console.error(err); process.exit(1); });
