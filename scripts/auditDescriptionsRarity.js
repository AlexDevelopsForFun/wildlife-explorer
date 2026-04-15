// Audit descriptions (Part C) and rarity (Part D)
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';

// Template detection — these phrases likely indicate generic/templated descriptions
const TEMPLATE_PATTERNS = [
  /^A (?:beautiful|small|large|medium|common) (?:bird|mammal|reptile|amphibian|insect|fish)/i,
  /^This (?:species|animal|creature|bird|mammal|reptile) (?:is |inhabits|lives|can be)/i,
  /^Found (?:in|throughout|across) (?:the park|this park|many)/i,
  /^(?:One|A) of the (?:most|many|common)/i,
  /is a (?:bird|mammal|reptile|amphibian|insect) species/i,
  /^\w+ is a species of/i,
];

function isLikelyTemplate(funFact) {
  if (!funFact) return true;
  if (funFact.length < 40) return true;
  return TEMPLATE_PATTERNS.some(p => p.test(funFact));
}

// PART C — Description spot check
const partCParks = {
  yellowstone: 'Yellowstone',
  everglades: 'Everglades',
  yosemite: 'Yosemite',
  grandcanyon: 'Grand Canyon',
  denali: 'Denali',
  acadia: 'Acadia',
  glacier: 'Glacier',
  zion: 'Zion',
  greatsmokymountains: 'Great Smoky Mountains',
  rockymountain: 'Rocky Mountain',
};

console.log(`=== PART C — DESCRIPTION SPOT CHECK (5 random per park × 10 parks) ===\n`);

// Seedable rng so results are reproducible
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

for (const [id, label] of Object.entries(partCParks)) {
  console.log(`\n── ${label} (${id}) ──`);
  const animals = WILDLIFE_CACHE[id]?.animals ?? [];
  if (!animals.length) { console.log('  (no data)'); continue; }
  const rng = mulberry32(id.length * 7919);
  const picks = new Set();
  while (picks.size < 5 && picks.size < animals.length) {
    picks.add(Math.floor(rng() * animals.length));
  }
  for (const idx of picks) {
    const a = animals[idx];
    const preview = (a.funFact ?? '').slice(0, 80);
    const templated = isLikelyTemplate(a.funFact);
    console.log(`  • ${a.name} [${a.animalType}] — ${templated ? 'TEMPLATE?' : 'real'}`);
    console.log(`    "${preview}${a.funFact && a.funFact.length > 80 ? '…' : ''}"`);
  }
}

// PART D — Rarity sanity check on edge-case species
console.log(`\n\n=== PART D — RARITY SANITY CHECK ===\n`);
const rarityOrder = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];

const edgeCases = [
  { match: /^Raccoon$|^Northern Raccoon$|^Common Raccoon$/, label: 'Raccoon' },
  { match: /^White-tailed Deer$/, label: 'White-tailed Deer' },
  { match: /^Eastern Gray Squirrel$/, label: 'Eastern Gray Squirrel' },
  { match: /^American Robin$/, label: 'American Robin' },
  { match: /^Turkey Vulture$/, label: 'Turkey Vulture' },
  { match: /Chipmunk$/, label: 'Chipmunk (any)' },
  { match: /^Common Raven$/, label: 'Common Raven' },
  { match: /^Coyote$/, label: 'Coyote' },
  { match: /^Great Blue Heron$/, label: 'Great Blue Heron' },
  { match: /^Red-tailed Hawk$/, label: 'Red-tailed Hawk' },
];

for (const ec of edgeCases) {
  console.log(`\n── ${ec.label} ──`);
  const hits = [];
  for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
    for (const a of data.animals || []) {
      if (ec.match.test(a.name)) {
        hits.push({ park, name: a.name, rarity: a.rarity, source: a.raritySource });
      }
    }
  }
  if (!hits.length) { console.log('  (not found in any park)'); continue; }
  // Sort by rarity (most common first)
  hits.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
  console.log(`  Found in ${hits.length} parks`);
  // Show all if ≤15 else first 15
  for (const h of hits.slice(0, 20)) {
    console.log(`    ${h.park.padEnd(22)} | ${h.rarity.padEnd(12)} | ${h.name} [${h.source || 'n/a'}]`);
  }
  if (hits.length > 20) console.log(`    ... +${hits.length - 20} more`);
}
