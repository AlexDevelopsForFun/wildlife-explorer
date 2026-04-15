// Photo completeness audit
import { WILDLIFE_CACHE } from '../src/data/wildlifeCache.js';
import { BUNDLED_PHOTOS } from '../src/data/photoCache.js';

const bundledNames = new Set(Object.keys(BUNDLED_PHOTOS));

const perPark = {};
const animalFreq = new Map(); // name → { parks: Set, hasBundled: bool }
let totalAnimals = 0;
let totalWithCachePhotoUrl = 0;
let totalWithBundled = 0;

for (const [park, data] of Object.entries(WILDLIFE_CACHE)) {
  let total = 0, withBundled = 0, withPhotoUrl = 0;
  for (const a of data.animals || []) {
    total++;
    totalAnimals++;
    if (a.photoUrl) { withPhotoUrl++; totalWithCachePhotoUrl++; }
    const inBundled = bundledNames.has(a.name);
    if (inBundled) { withBundled++; totalWithBundled++; }

    if (!animalFreq.has(a.name)) {
      animalFreq.set(a.name, { parks: new Set(), hasBundled: inBundled, type: a.animalType });
    }
    animalFreq.get(a.name).parks.add(park);
  }
  perPark[park] = {
    total,
    withBundled,
    withoutBundled: total - withBundled,
    withPhotoUrlCache: withPhotoUrl,
    pct: total ? (withBundled / total * 100).toFixed(1) : '0'
  };
}

console.log(`=== PHOTO COMPLETENESS AUDIT ===\n`);
console.log(`Total species entries across all parks: ${totalAnimals}`);
console.log(`Entries with photoUrl set in cache:    ${totalWithCachePhotoUrl}`);
console.log(`Entries in BUNDLED_PHOTOS:              ${totalWithBundled}`);
console.log(`Total bundled photos file:              ${bundledNames.size} unique species`);
console.log(`Total unique species in cache:          ${animalFreq.size}`);
console.log(`Unique species with bundled photo:      ${[...animalFreq.values()].filter(x => x.hasBundled).length}`);
console.log(`Unique species WITHOUT bundled photo:   ${[...animalFreq.values()].filter(x => !x.hasBundled).length}`);

console.log(`\n=== TOP 50 SPECIES WITHOUT BUNDLED PHOTO (by park count) ===`);
const missing = [...animalFreq.entries()]
  .filter(([, v]) => !v.hasBundled)
  .map(([name, v]) => ({ name, type: v.type, parkCount: v.parks.size }))
  .sort((a, b) => b.parkCount - a.parkCount);
for (const x of missing.slice(0, 50)) {
  console.log(`${x.name.padEnd(40)} | ${x.type.padEnd(10)} | ${x.parkCount} parks`);
}

console.log(`\n=== PER-PARK PHOTO COVERAGE ===`);
const parkEntries = Object.entries(perPark).sort((a, b) => b[1].total - a[1].total);
console.log('park'.padEnd(25) + '| total | bundled | missing | %');
for (const [p, v] of parkEntries) {
  console.log(`${p.padEnd(25)}| ${String(v.total).padStart(5)} | ${String(v.withBundled).padStart(7)} | ${String(v.withoutBundled).padStart(7)} | ${v.pct}%`);
}
