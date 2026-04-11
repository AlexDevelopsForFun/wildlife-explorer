#!/usr/bin/env node
/**
 * Lists all animals that need park tips — outputs JSON manifest.
 */
import { fileURLToPath } from 'url';
import path from 'path';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLACEHOLDER_PATTERNS = [
  /^Confirmed at this park's eBird hotspot\.?$/i,
  /^Recorded in this region \(eBird historical checklist\)\.?$/i,
  /^\d+ research-grade iNaturalist observations at this park\.?$/i,
  /^Recorded \d+ times on iNaturalist at this park\.?$/i,
  /^Appears on \d+% of .+ eBird checklists/i,
  /^Verified in \d+ iNaturalist research-grade observations/i,
  /^Officially documented in the NPS wildlife registry/i,
  /^Recently reported within/i,
  /^Listed in the NPS species inventory/i,
];
function isCurated(ff) { return ff && !PLACEHOLDER_PATTERNS.some(p => p.test(ff.trim())); }

function getCharismaScore(name, animalType) {
  const n = (name ?? '').toLowerCase();
  if (/\b(california condor|florida panther|gray wolf|grizzly bear|brown bear|wolverine)\b/.test(n)) return 11;
  if (/\b(bison|buffalo|grizzly|bear|wolf|wolves|alligator|crocodile|moose|elk|wapiti|mountain lion|puma|cougar|jaguar|panther|wolverine|manatee|california condor|javelina|peccary)\b/.test(n)) return 10;
  if (/\b(manatee|whale|dolphin|orca|shark|sea lion|walrus|sea otter|steller)\b/.test(n)) return 9;
  if (/\b(bald eagle|golden eagle|eagle|condor|peregrine|falcon|osprey|roadrunner)\b/.test(n)) return 9;
  if (/\b(hawk|owl|vulture|kite|harrier|merlin|kestrel|quail|gambel|gila woodpecker|cactus wren)\b/.test(n)) return 8;
  if (/\b(puffin|flamingo|spoonbill|whooping crane|sandhill crane|roseate|pelican|frigate|booby)\b/.test(n)) return 8;
  if (/\b(seal|harbor seal|grey seal|fur seal|sea turtle|leatherback|loggerhead)\b/.test(n)) return 8;
  if (/\b(fox|coyote|bobcat|lynx|otter|beaver|pronghorn|bighorn|mountain goat|caribou|muskox|bison|deer|elk|moose)\b/.test(n)) return 7;
  if (/\b(rattlesnake|boa|python|king snake|milk snake|gopher snake|coral snake)\b/.test(n)) return 7;
  if (/\b(heron|egret|ibis|stork|loon|puffin|cormorant|gannet|anhinga)\b/.test(n)) return 7;
  if (animalType === 'marine') return 7;
  if (animalType === 'mammal') return 6;
  if (animalType === 'reptile' || animalType === 'amphibian') return 6;
  if (animalType === 'bird') return 5;
  if (animalType === 'insect') return 3;
  return 4;
}

const RARITY_ORDER = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
const RARITY_PCT = { guaranteed: 92, very_likely: 70, likely: 40, unlikely: 15, rare: 4, exceptional: 1 };

async function main() {
  const cacheMod = await import('../src/data/wildlifeCache.js');
  const cache = cacheMod.WILDLIFE_CACHE;
  const locMod = await import('../src/wildlifeData.js');
  const locations = locMod.wildlifeLocations ?? [];
  const locMap = {};
  for (const l of locations) locMap[l.id] = { name: l.name, state: l.state };

  const manifest = [];
  let totalCurated = 0;

  for (const [parkId, parkData] of Object.entries(cache)) {
    const animals = parkData.animals ?? [];
    const loc = locMap[parkId] ?? { name: parkId, state: 'US' };
    const sorted = [...animals].sort((a, b) => {
      const rd = (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
      if (rd !== 0) return rd;
      return getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
    });
    for (const a of sorted) {
      if (a.parkTip) continue;  // already has a tip
      if (isCurated(a.funFact)) { totalCurated++; continue; }
      manifest.push({
        key: `${parkId}::${a.name}`,
        parkId,
        parkName: loc.name,
        state: loc.state,
        animal: a.name,
        scientificName: a.scientificName ?? 'unknown',
        animalType: a.animalType,
        rarity: a.rarity,
        pct: RARITY_PCT[a.rarity] ?? 5,
        seasons: (a.seasons ?? []).join(', '),
        migration: a.migrationStatus ?? 'unknown',
      });
    }
  }

  const outPath = path.join(__dirname, 'tipTargets.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Total targets: ${manifest.length}`);
  console.log(`Skipped curated: ${totalCurated}`);
  console.log(`Written to: ${outPath}`);

  // Summary by park
  const byPark = {};
  for (const m of manifest) {
    byPark[m.parkId] = (byPark[m.parkId] ?? 0) + 1;
  }
  console.log(`\nPer-park breakdown:`);
  for (const [pid, count] of Object.entries(byPark)) {
    console.log(`  ${pid}: ${count}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
