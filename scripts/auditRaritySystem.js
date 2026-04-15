// Audit current rarity state to inform the fix script
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';

// Count guaranteed per type & identify guaranteed insects
const guaranteedByType = {};
const guaranteedEntries = [];

for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.rarity === 'guaranteed') {
      guaranteedByType[a.animalType] = (guaranteedByType[a.animalType] || 0) + 1;
      guaranteedEntries.push({ park, name: a.name, type: a.animalType, source: a.raritySource });
    }
  }
}

console.log(`=== CURRENT RARITY AUDIT ===\n`);
console.log(`Total guaranteed: ${guaranteedEntries.length}`);
console.log(`By animalType:`, guaranteedByType);

console.log(`\n=== GUARANTEED INSECTS ===`);
const guaranteedInsects = guaranteedEntries.filter(e => e.type === 'insect' || e.type === 'invertebrate' || e.type === 'arthropod');
for (const e of guaranteedInsects) {
  console.log(`  ${e.park.padEnd(22)} | ${e.name.padEnd(40)} | ${e.type.padEnd(12)} | ${e.source || 'n/a'}`);
}
console.log(`  TOTAL guaranteed insects/arthropods: ${guaranteedInsects.length}`);

console.log(`\n=== ALL ANIMAL TYPES IN CACHE ===`);
const allTypes = new Set();
for (const data of Object.values(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.animalType) allTypes.add(a.animalType);
  }
}
console.log('Types:', [...allTypes]);

console.log(`\n=== SPOT-CHECK SPECIFIC SPECIES ===`);
const targets = [
  'Turkey Vulture', 'Red-tailed Hawk', 'American Robin',
  'Raccoon', 'Common Raccoon', 'Northern Raccoon',
  'Eastern Gray Squirrel',
];
for (const name of targets) {
  const parks = [];
  for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
    for (const a of data.animals || []) {
      if (a.name === name) parks.push({ park, rarity: a.rarity, source: a.raritySource });
    }
  }
  console.log(`\n${name}: ${parks.length} parks`);
  const byRarity = {};
  for (const p of parks) byRarity[p.rarity] = (byRarity[p.rarity] || 0) + 1;
  console.log(`  Rarity distribution:`, byRarity);
}

// Also: Yellowstone American Goldfinch, Sandhill Crane; Biscayne Alligator
console.log(`\n=== SPECIFIC GUARANTEED CHECKS ===`);
const checks = [
  ['yellowstone', 'American Goldfinch'],
  ['yellowstone', 'Sandhill Crane'],
  ['wrangellstelias', 'American Bison'],
  ['biscayne', 'American Alligator'],
];
for (const [park, name] of checks) {
  const a = (WILDLIFE_CACHE[park]?.animals || []).find(x => x.name === name);
  console.log(`  ${park}/${name}: ${a ? `rarity=${a.rarity} source=${a.raritySource}` : '(not in cache)'}`);
}
