#!/usr/bin/env node
import { readFileSync } from 'fs';
const src = readFileSync('src/data/wildlifeCache.js','utf8');

// Check specifically for Arctic Wolf anywhere
const arcticWolf = src.match(/"name":\s*"Arctic Wolf"/g);
console.log('Arctic Wolf total occurrences:', arcticWolf ? arcticWolf.length : 0);

// Check for the user's reported species
const checks = [
  'Arctic Wolf', 'Arctic Fox', 'Arctic Hare', 'Polar Bear', 'Walrus',
  'Marine Iguana', 'Hawaiian Goose', 'Nene'
];
for (const name of checks) {
  const re = new RegExp('"name":\\s*"' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"', 'g');
  const m = src.match(re);
  console.log(`${name}: ${m ? m.length : 0} occurrences`);
}

// Check which flagged species still remain
const toCheck = [
  ['lassenvolcanic','Hawaiian Goose'],
  ['lassenvolcanic','Greater Roadrunner'],
  ['lassenvolcanic','California Condor'],
  ['pinnacles','Greater Roadrunner'],
  ['pinnacles','Gray Wolf'],
  ['glacier','Caribou'],
  ['glacier','American Bison'],
  ['craterlake','Gray Wolf'],
  ['craterlake','Greater Roadrunner'],
  ['sequoia','Greater Roadrunner'],
  ['sequoia','Hawaiian Goose'],
  ['yellowstone','California Condor'],
  ['brycecanyon','California Condor'],
  ['canyonlands','California Condor'],
  ['capitolreef','American Bison'],
  ['whitesands','California Condor'],
  ['greatsanddunes','American Bison'],
  ['northcascades','California Condor'],
  ['mountrainier','California Condor'],
  ['redwood','California Condor'],
  ['kingscanyon','Greater Roadrunner'],
  ['hawaiivolcanoes','Snowy Owl'],
  ['haleakala','Snowy Owl'],
  ['virginislands','Desert Tortoise'],
  ['hotsprings','Desert Tortoise'],
];

console.log('\n=== Checking remaining flagged species ===');
// Build park sections
const parkRe = /"(\w+)":\s*\{\s*builtAt/g;
let pm;
const parks = [];
while ((pm = parkRe.exec(src)) !== null) parks.push({ name: pm[1], pos: pm.index });

function getParkSection(parkName) {
  const idx = parks.findIndex(p => p.name === parkName);
  if (idx < 0) return null;
  const start = parks[idx].pos;
  const end = idx + 1 < parks.length ? parks[idx + 1].pos : src.length;
  return src.substring(start, end);
}

let stillPresent = 0;
for (const [park, name] of toCheck) {
  const section = getParkSection(park);
  if (!section) { console.log(`${park}: PARK NOT FOUND`); continue; }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('"name":\\s*"' + escaped + '"');
  if (re.test(section)) {
    console.log(`STILL IN CACHE: ${park} -> ${name}`);
    stillPresent++;
  }
}
console.log(`\n${stillPresent} flagged species still in cache`);

// Check Biscayne mammals
console.log('\n=== Biscayne mammals ===');
const biscSection = getParkSection('biscayne');
if (biscSection) {
  const mamRe = /"name":\s*"([^"]+)"[\s\S]*?"animalType":\s*"mammal"/g;
  let m2;
  while ((m2 = mamRe.exec(biscSection)) !== null) {
    console.log('  ' + m2[1]);
  }
}
