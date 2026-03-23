/**
 * patchGlobalSeasons.mjs
 * Global seasonal data fixes across all 63 parks:
 *
 *  1. Remove Winter from insects at all non-tropical parks
 *  2. Remove Winter from hibernating / migrating animals (bats, amphibians, etc.)
 *  3. Acadia-specific bird season fixes
 *  4. Acadia rarity corrections
 *  5. Add Minke Whale to Acadia
 *  6. Fix scientific names used as display names (insects at Acadia)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../src/data/wildlifeCache.js');

// Parks where insects can be active year-round (tropical / subtropical)
const TROPICAL_PARKS = new Set([
  'everglades','drytortugas','biscayne','virginislands',
  'americansamoa','haleakala','hawaiivolcanoes',
]);

// Bat species — all hibernate or migrate (no winter presence)
const BAT_PATTERN = /\bbat\b/i;

// Hibernate/dormant in winter
const HIBERNATE_PATTERNS = [
  /groundhog|woodchuck/i,
  /\btoad\b/i,
  /salamander/i,
  /\bfrog\b/i,
  /treefrog|tree frog/i,
  /spring peeper/i,
  /chorus frog/i,
  /wood frog/i,
];

// Remove a specific season from a seasons array, falling back to empty → all
function removeSeason(seasons, seasonToRemove) {
  if (!Array.isArray(seasons)) return seasons;
  if (seasons.includes('year_round')) {
    // Expand year_round to the 4 explicit seasons first, then remove
    seasons = ['spring','summer','fall','winter'];
  }
  const result = seasons.filter(s => s !== seasonToRemove);
  return result.length > 0 ? result : ['spring','summer','fall']; // safe fallback
}

// Add a season if not already present
function addSeason(seasons, seasonToAdd) {
  if (!Array.isArray(seasons)) return [seasonToAdd];
  if (seasons.includes('year_round')) return seasons; // already all seasons
  if (seasons.includes(seasonToAdd)) return seasons;
  return [...seasons, seasonToAdd].sort((a,b) =>
    ['spring','summer','fall','winter'].indexOf(a) - ['spring','summer','fall','winter'].indexOf(b)
  );
}

// ─── Insect scientific name → common name map ─────────────────────────────────
// These are the 7 insects at Acadia using scientific names as display names
const SCI_TO_COMMON = {
  'Evodinus monticola':        'Banded Longhorn Beetle',
  'Macremphytus tarsatus':     'Dogwood Sawfly',
  'Synuchus impunctatus':      'Ground Beetle',
  'Nipponoserica peregrina':   'Invasive Oriental Beetle',
  'Chalepus walshii':          "Walsh's Leaf Beetle",
  'Bembidion':                 'Ground Beetle (Bembidion)',
  'Strangalia':                'Flower Longhorn Beetle',
};

async function main() {
  const cacheUrl = new URL('../src/data/wildlifeCache.js', import.meta.url).href;
  const { WILDLIFE_CACHE } = await import(cacheUrl);
  const cache = JSON.parse(JSON.stringify(WILDLIFE_CACHE));

  let stats = {
    insectWinterRemoved: 0,
    batWinterRemoved: 0,
    hibernatorWinterRemoved: 0,
    acadiaBirdFixed: 0,
    acadiaRarityFixed: 0,
    sciNameFixed: 0,
    minkeWhaleAdded: false,
  };

  for (const [parkId, parkData] of Object.entries(cache)) {
    const animals = parkData.animals ?? [];
    const isTropical = TROPICAL_PARKS.has(parkId);

    for (const animal of animals) {
      const name = animal.name ?? '';
      const type = animal.animalType ?? '';
      const seasons = animal.seasons ?? [];
      const hasWinter = seasons.includes('winter') || seasons.includes('year_round');

      // ── 1. Insects: remove winter in non-tropical parks ──────────────────
      if (type === 'insect' && !isTropical && hasWinter) {
        animal.seasons = removeSeason(animal.seasons, 'winter');
        stats.insectWinterRemoved++;
        continue;
      }

      // ── 2a. Bats: remove winter everywhere (hibernate or migrate) ─────────
      if (BAT_PATTERN.test(name) && hasWinter) {
        animal.seasons = removeSeason(animal.seasons, 'winter');
        stats.batWinterRemoved++;
        continue;
      }

      // ── 2b. Hibernating / dormant animals: remove winter ──────────────────
      if (hasWinter && HIBERNATE_PATTERNS.some(p => p.test(name))) {
        // Keep winter for very southern parks for frogs/toads only
        const isAmphibian = /frog|toad|treefrog|peeper|chorus/i.test(name);
        if (isAmphibian && isTropical) continue; // tropical frogs can be year-round
        animal.seasons = removeSeason(animal.seasons, 'winter');
        stats.hibernatorWinterRemoved++;
        continue;
      }
    }

    // ── 3. Acadia-specific fixes ───────────────────────────────────────────
    if (parkId === 'acadia') {
      for (const animal of animals) {
        const name = animal.name;

        // Bird season corrections
        if (name === 'Common Loon') {
          animal.seasons = ['year_round']; // winters offshore at coastal Maine
          stats.acadiaBirdFixed++;
        }
        if (name === 'Common Merganser') {
          animal.seasons = addSeason(addSeason(animal.seasons, 'fall'), 'winter');
          stats.acadiaBirdFixed++;
        }
        if (name === 'Dovekie') {
          animal.seasons = ['fall','winter']; // Arctic breeder, winters off Maine coast
          stats.acadiaBirdFixed++;
        }
        if (name === 'Harbor Seal') {
          // Harbor seals are year-round at Acadia
          animal.seasons = ['year_round'];
          stats.acadiaBirdFixed++;
        }
        if (name === 'White-tailed Deer') {
          animal.seasons = ['year_round']; // year-round resident
          stats.acadiaBirdFixed++;
        }
        if (name === 'Moose') {
          animal.seasons = addSeason(animal.seasons, 'fall');
          stats.acadiaBirdFixed++;
        }

        // Rarity corrections
        if (name === 'Bald Eagle') {
          animal.rarity = 'rare';
          stats.acadiaRarityFixed++;
        }
        if (name === 'Black Bear') {
          animal.rarity = 'unlikely';
          stats.acadiaRarityFixed++;
        }
        if (name === 'North American Porcupine') {
          animal.rarity = 'unlikely';
          stats.acadiaRarityFixed++;
        }

        // Fix scientific names used as display names (insects)
        if (SCI_TO_COMMON[name]) {
          animal.name = SCI_TO_COMMON[name];
          stats.sciNameFixed++;
        }
      }

      // ── 4. Add Minke Whale ───────────────────────────────────────────────
      const hasMinke = animals.some(a => /minke/i.test(a.name));
      if (!hasMinke) {
        animals.push({
          name:           'Minke Whale',
          emoji:          '🐋',
          animalType:     'marine',
          rarity:         'unlikely',
          seasons:        ['spring','summer','fall'],
          scientificName: 'Balaenoptera acutorostrata',
          funFact:        'The smallest baleen whale, commonly seen on whale-watching tours from Bar Harbor. Feeds on small fish and krill in the Gulf of Maine.',
          photoUrl:       null,
          source:         'inaturalist',
          sources:        ['inaturalist'],
        });
        stats.minkeWhaleAdded = true;
        console.log('  ✅ Added Minke Whale to Acadia');
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n=== PATCH STATS ===');
  console.log(`  Insects: removed winter from ${stats.insectWinterRemoved} insects across non-tropical parks`);
  console.log(`  Bats: removed winter from ${stats.batWinterRemoved} bats`);
  console.log(`  Hibernators: removed winter from ${stats.hibernatorWinterRemoved} animals (frogs, toads, salamanders, groundhogs)`);
  console.log(`  Acadia bird season fixes: ${stats.acadiaBirdFixed}`);
  console.log(`  Acadia rarity fixes: ${stats.acadiaRarityFixed}`);
  console.log(`  Scientific name fixes: ${stats.sciNameFixed}`);
  console.log(`  Minke Whale added: ${stats.minkeWhaleAdded}`);

  // Verify key Acadia fixes
  const acadia = cache['acadia']?.animals ?? [];
  const birds = acadia.filter(a => a.animalType === 'bird');
  const c = s => birds.filter(b => b.seasons?.includes(s) || b.seasons?.includes('year_round')).length;
  console.log('\n=== ACADIA BIRDS AFTER FIX ===');
  console.log(`  Spring: ${c('spring')}, Summer: ${c('summer')}, Fall: ${c('fall')}, Winter: ${c('winter')}`);

  const checks = ['Common Loon','Dovekie','Common Merganser','Harbor Seal','Bald Eagle','Black Bear','North American Porcupine','White-tailed Deer','Minke Whale'];
  console.log('\n=== ACADIA KEY SPECIES VERIFY ===');
  for (const name of checks) {
    const a = acadia.find(x => x.name === name);
    if (a) console.log(`  ✅ ${name} [${a.rarity}] seasons=${JSON.stringify(a.seasons)}`);
    else console.log(`  ❌ ${name} NOT FOUND`);
  }

  // Insect verify — Acadia
  const acadiaInsects = acadia.filter(a => a.animalType === 'insect');
  const acadiaInsectWinter = acadiaInsects.filter(i => i.seasons?.includes('winter')||i.seasons?.includes('year_round'));
  console.log(`\nAcadia insects with winter remaining: ${acadiaInsectWinter.length} (should be 0)`);

  // Write cache
  const now = new Date().toISOString();
  const totalSpecies = Object.values(cache).reduce((n,p) => n + (p.animals?.length ?? 0), 0);
  const out = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${now}`,
    `// Parks: ${Object.keys(cache).length} | Species bundled: ${totalSpecies}`,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(now)};`,
    ``,
    `export const WILDLIFE_CACHE = ${JSON.stringify(cache, null, 2)};`,
  ].join('\n');
  fs.writeFileSync(CACHE_PATH, out, 'utf8');
  console.log(`\nCache written. Total species: ${totalSpecies}`);
}

main().catch(err => { console.error(err); process.exit(1); });
