// Audit mammal subcategory classifications by importing the cache
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';
import { writeFileSync } from 'fs';

const BAT_KW = ['bat'];
const MARINE_MAMMAL_KW = ['seal', 'sea lion', 'walrus', 'whale', 'dolphin', 'porpoise', 'manatee', 'dugong', 'sea otter'];
const LARGE_MAMMAL_KW = ['bear', 'bison', 'elk', 'moose', 'deer', 'wolf', 'mountain lion', 'cougar', 'puma', 'jaguar', 'bighorn', 'pronghorn', 'wild boar', 'mule deer', 'white-tailed', 'whitetail', 'caribou', 'reindeer', 'musk ox', 'wolverine'];
const RODENT_KW = ['mouse', 'rat', 'squirrel', 'chipmunk', 'vole', 'lemming', 'marmot', 'prairie dog', 'pocket gopher', 'kangaroo rat', 'kangaroo mouse', 'wood rat', 'woodrat', 'packrat', 'jumping mouse', 'harvest mouse'];
const SMALL_MAMMAL_KW = ['fox', 'coyote', 'bobcat', 'lynx', 'mink', 'river otter', 'weasel', 'badger', 'skunk', 'raccoon', 'opossum', 'porcupine', 'muskrat', 'beaver', 'groundhog', 'woodchuck', 'nutria', 'ringtail', 'coati'];

function hasKw(name, keywords) {
  const lc = name.toLowerCase();
  return keywords.some(kw => lc.includes(kw));
}
function classifyMammalSubtype(name) {
  if (hasKw(name, BAT_KW))           return 'bat';
  if (hasKw(name, MARINE_MAMMAL_KW)) return 'marine';
  if (hasKw(name, LARGE_MAMMAL_KW))  return 'large';
  if (hasKw(name, RODENT_KW))        return 'rodent';
  if (hasKw(name, SMALL_MAMMAL_KW))  return 'small';
  return 'small';
}

function correctMammalSubtype(name) {
  const lc = name.toLowerCase();
  if (/\bbat\b/.test(lc) || lc.includes('myotis') || lc.includes('pipistrelle')) return 'bat';
  if (/\bseal\b/.test(lc) || lc.includes('sea lion') || lc.includes('walrus') ||
      /\bwhale\b/.test(lc) || lc.includes('dolphin') || lc.includes('porpoise') ||
      lc.includes('manatee') || lc.includes('dugong') || lc.includes('sea otter')) return 'marine';
  if (/\bmouse\b/.test(lc) || /\bmice\b/.test(lc) ||
      /\brat\b/.test(lc) || lc.includes('muskrat') || lc.includes('woodrat') || lc.includes('packrat') ||
      lc.includes('squirrel') || lc.includes('chipmunk') ||
      /\bvole\b/.test(lc) || lc.includes('lemming') ||
      lc.includes('marmot') || lc.includes('woodchuck') || lc.includes('groundhog') ||
      lc.includes('prairie dog') || lc.includes('gopher') ||
      lc.includes('beaver') || lc.includes('porcupine') || lc.includes('nutria') ||
      lc.includes('deermouse') || lc.includes('deer mouse')) return 'rodent';
  if (/\bbear\b/.test(lc) || lc.includes('bison') || /\belk\b/.test(lc) || lc.includes('moose') ||
      /\bdeer\b/.test(lc) || /\bwolf\b/.test(lc) || lc.includes('wolverine') ||
      lc.includes('mountain lion') || lc.includes('cougar') || lc.includes('puma') || lc.includes('jaguar') ||
      lc.includes('bighorn') || lc.includes('pronghorn') || lc.includes('wild boar') || lc.includes('caribou') ||
      lc.includes('reindeer') || lc.includes('musk ox')) return 'large';
  if (lc.includes('rabbit') || /\bhare\b/.test(lc) || /\bpika\b/.test(lc)) return 'small';
  if (/\bfox\b/.test(lc) || lc.includes('coyote') || lc.includes('bobcat') || /\blynx\b/.test(lc) ||
      /\bmink\b/.test(lc) || /\botter\b/.test(lc) || lc.includes('weasel') || lc.includes('badger') ||
      lc.includes('skunk') || lc.includes('raccoon') || lc.includes('opossum') ||
      lc.includes('ringtail') || lc.includes('coati') || lc.includes('marten') ||
      lc.includes('fisher') || lc.includes('ermine') || lc.includes('stoat') ||
      lc.includes('shrew') || lc.includes('mole') || lc.includes('armadillo')) return 'small';
  return null;
}

const results = { misclassified: [], mammalsByCurrent: {}, totalMammals: 0, unknownBiology: [] };

for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals || []) {
    if (a.animalType !== 'mammal') continue;
    results.totalMammals++;
    const current = classifyMammalSubtype(a.name);
    const correct = correctMammalSubtype(a.name);
    results.mammalsByCurrent[current] = (results.mammalsByCurrent[current] || 0) + 1;
    if (correct === null) {
      results.unknownBiology.push({ park, name: a.name, current });
    } else if (current !== correct) {
      results.misclassified.push({ park, name: a.name, current, correct });
    }
  }
}

const byName = new Map();
for (const x of results.misclassified) {
  const key = `${x.name}|${x.current}→${x.correct}`;
  if (!byName.has(key)) byName.set(key, { name: x.name, current: x.current, correct: x.correct, parks: [] });
  byName.get(key).parks.push(x.park);
}
const sorted = [...byName.values()].sort((a, b) => b.parks.length - a.parks.length);

console.log(`=== MAMMAL SUBCATEGORY AUDIT ===\n`);
console.log(`Total mammal entries in cache: ${results.totalMammals}`);
console.log(`By current classification:`, results.mammalsByCurrent);
console.log(`\nTotal misclassified entries: ${results.misclassified.length}`);
console.log(`Unique misclassified species: ${sorted.length}`);
console.log(`\n=== MISCLASSIFIED SPECIES (by # parks) ===`);
for (const x of sorted) {
  console.log(`${x.name.padEnd(45)} | ${x.current.padEnd(6)} → ${x.correct.padEnd(6)} | ${x.parks.length} parks: ${x.parks.slice(0, 5).join(', ')}${x.parks.length > 5 ? '...' : ''}`);
}

const unknownByName = new Map();
for (const x of results.unknownBiology) {
  if (!unknownByName.has(x.name)) unknownByName.set(x.name, { name: x.name, current: x.current, parks: [] });
  unknownByName.get(x.name).parks.push(x.park);
}
const unknownSorted = [...unknownByName.values()].sort((a, b) => b.parks.length - a.parks.length);
console.log(`\n=== UNKNOWN-BIOLOGY MAMMALS (${unknownSorted.length} unique) ===`);
for (const x of unknownSorted.slice(0, 40)) {
  console.log(`${x.name.padEnd(45)} | current: ${x.current.padEnd(6)} | ${x.parks.length} parks`);
}

writeFileSync('scripts/subcategoryAudit.json', JSON.stringify({ summary: results.mammalsByCurrent, total: results.totalMammals, misclassified: sorted, unknown: unknownSorted }, null, 2));
