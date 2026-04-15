// Verify subcategory classification by IMPORTING the real classifier
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';
import { classifyMammalSubtype } from '../src/utils/subcategories.js';

// "Correct" reference classifier - expert-curated ground truth
function correctMammalSubtype(name) {
  const lc = name.toLowerCase();
  // Bats
  if (/\bbat\b/.test(lc) || lc.includes('myotis') || lc.includes('pipistrelle')) return 'bat';
  // Marine
  if (/\bseal\b/.test(lc) || lc.includes('sea lion') || lc.includes('walrus') ||
      /\bwhale\b/.test(lc) || lc.includes('dolphin') || lc.includes('porpoise') ||
      lc.includes('manatee') || lc.includes('dugong') || lc.includes('sea otter')) return 'marine';
  // Rodents (FIRST, before large)
  if (/\bmouse\b/.test(lc) || /\bmice\b/.test(lc) ||
      lc.includes('deermouse') || lc.includes('deer mouse') ||
      /\brat\b/.test(lc) || lc.includes('muskrat') || lc.includes('woodrat') || lc.includes('packrat') ||
      lc.includes('squirrel') || lc.includes('chipmunk') ||
      /\bvole\b/.test(lc) || lc.includes('lemming') ||
      lc.includes('marmot') || lc.includes('woodchuck') || lc.includes('groundhog') ||
      lc.includes('prairie dog') || lc.includes('gopher') ||
      lc.includes('beaver') || lc.includes('porcupine') || lc.includes('nutria')) return 'rodent';
  // Lagomorphs
  if (lc.includes('rabbit') || /\bhare\b/.test(lc) || /\bpika\b/.test(lc) ||
      lc.includes('cottontail') || lc.includes('jackrabbit')) return 'small';
  // Large
  if (/\bbear\b/.test(lc) || lc.includes('bison') || /\belk\b/.test(lc) || lc.includes('moose') ||
      /\bdeer\b/.test(lc) || /\bwolf\b/.test(lc) || lc.includes('wolverine') ||
      lc.includes('mountain lion') || lc.includes('cougar') || lc.includes('puma') ||
      lc.includes('panther') || lc.includes('jaguar') ||
      lc.includes('bighorn') || lc.includes('pronghorn') ||
      lc.includes('wild boar') || lc.includes('wild pig') || lc.includes('feral pig') ||
      lc.includes('peccary') || lc.includes('javelina') ||
      lc.includes('caribou') || lc.includes('reindeer') || lc.includes('musk ox') ||
      lc.includes('mountain goat') || lc.includes('dall sheep') ||
      lc.includes('goat') || lc.includes('cattle') || lc.includes('aoudad') ||
      lc.includes('gemsbok') || lc.includes('sheep') ||
      lc.includes('wild horse') || lc.includes('feral horse') ||
      lc.includes('donkey') || lc.includes('burro') || lc.includes('horse')) return 'large';
  // Small (carnivores, mustelids, etc)
  if (/\bfox\b/.test(lc) || lc.includes('coyote') || lc.includes('bobcat') || /\blynx\b/.test(lc) ||
      /\bmink\b/.test(lc) || /\botter\b/.test(lc) || lc.includes('weasel') || lc.includes('badger') ||
      lc.includes('skunk') || lc.includes('raccoon') || lc.includes('opossum') ||
      lc.includes('ringtail') || lc.includes('coati') || lc.includes('marten') ||
      lc.includes('fisher') || lc.includes('ermine') || lc.includes('stoat') ||
      lc.includes('shrew') || lc.includes('mole') || lc.includes('armadillo') ||
      lc.includes('mongoose')) return 'small';
  return null; // unknown
}

const changes = [];
const stillWrong = [];
const byName = new Map();
let total = 0;
const countsByType = {};

for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.animalType !== 'mammal') continue;
    total++;
    const current = classifyMammalSubtype(a.name);
    countsByType[current] = (countsByType[current] || 0) + 1;
    const expected = correctMammalSubtype(a.name);
    if (expected !== null && current !== expected) {
      stillWrong.push({ park, name: a.name, current, expected });
      const key = `${a.name}|${current}→${expected}`;
      if (!byName.has(key)) byName.set(key, { name: a.name, current, expected, parks: [] });
      byName.get(key).parks.push(park);
    }
  }
}

console.log(`=== VERIFY SUBCATEGORY CLASSIFICATION (using rewritten logic) ===\n`);
console.log(`Total mammal entries: ${total}`);
console.log(`By current classification:`, countsByType);
console.log(`\nRemaining misclassifications: ${stillWrong.length} entries across ${byName.size} unique species`);

const sorted = [...byName.values()].sort((a, b) => b.parks.length - a.parks.length);
if (sorted.length === 0) {
  console.log(`\n✅ ALL PREVIOUSLY MISCLASSIFIED SPECIES ARE NOW CORRECT`);
} else {
  for (const x of sorted) {
    console.log(`  ${x.name.padEnd(45)} | ${x.current.padEnd(6)} → ${x.expected.padEnd(6)} | ${x.parks.length} parks`);
  }
}

// Now also show what the rewrite FIXED (species that are now classified differently than before)
console.log(`\n=== SPOT-CHECK KEY SPECIES (before → after) ===`);
const testCases = [
  'American Beaver', 'North American Porcupine', 'Western Deer Mouse', 'Groundhog',
  'White-tailed Antelope Squirrel', 'Long-eared Myotis', 'Pinyon Deermouse',
  'Eastern Deermouse', 'White-tailed Jackrabbit', 'Fringed Myotis', 'Yuma Myotis',
  'Mountain Beaver', 'White-tailed Prairie Dog', 'Nutria', 'Cave Myotis',
  'Mountain Goat', 'Collared Peccary', 'Eurasian Wild Pig', 'Aoudad',
  'Florida Panther', 'Dall Sheep', 'Gemsbok', 'Javelina', 'Domestic Horse',
  'Donkey', 'Domestic Cattle', 'Desert Cottontail', 'Eastern Cottontail',
];
for (const name of testCases) {
  console.log(`  ${name.padEnd(40)} → ${classifyMammalSubtype(name)}`);
}
