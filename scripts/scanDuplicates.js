#!/usr/bin/env node
import { readFileSync } from 'fs';
const src = readFileSync('src/data/wildlifeCache.js','utf8');

const TARGETS = ['Black Bear','American Black Bear','Gray Wolf','Grey Wolf','Timber Wolf',
  'Mountain Lion','Cougar','Puma','Elk','Wapiti','American Elk',
  'Moose','American Moose','Bison','American Bison','Buffalo',
  'Harbor Seal','Harbour Seal','Gray Fox','Grey Fox',
  'Gray Jay','Grey Jay','Canada Jay','Grizzly Bear','Brown Bear',
  'Mule Deer','Black-tailed Deer','Red-tailed Hawk','Red Tailed Hawk',
  'White-tailed Deer','White-tail Deer','Whitetail Deer'];

const parkRe = /"(\w+)":\s*\{\s*builtAt/g;
let pm;
const parkPositions = [];
while ((pm = parkRe.exec(src)) !== null) {
  parkPositions.push({ name: pm[1], pos: pm.index });
}

for (const target of TARGETS) {
  const parks = [];
  for (let i = 0; i < parkPositions.length; i++) {
    const park = parkPositions[i].name;
    const start = parkPositions[i].pos;
    const end = i+1 < parkPositions.length ? parkPositions[i+1].pos : src.length;
    const section = src.substring(start, end);
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('"name":\\s*"' + escaped + '"');
    if (re.test(section)) parks.push(park);
  }
  if (parks.length > 0) console.log(target + ': ' + parks.length + ' parks (' + parks.slice(0,8).join(', ') + (parks.length>8?'...':'') + ')');
}

// Also find any park that has BOTH variants of an alias group
const ALIAS_GROUPS = [
  ['Black Bear','American Black Bear'],
  ['Gray Wolf','Grey Wolf','Timber Wolf'],
  ['Mountain Lion','Cougar','Puma'],
  ['Elk','American Elk','Wapiti'],
  ['Moose','American Moose'],
  ['Bison','American Bison','Buffalo'],
  ['Harbor Seal','Harbour Seal'],
  ['Gray Fox','Grey Fox'],
  ['Gray Jay','Grey Jay','Canada Jay'],
  ['Grizzly Bear','Brown Bear'],
  ['Mule Deer','Black-tailed Deer'],
  ['Red-tailed Hawk','Red Tailed Hawk'],
  ['White-tailed Deer','White-tail Deer','Whitetail Deer'],
];

console.log('\n=== Parks with BOTH variants of same species ===');
let totalConflicts = 0;
for (let i = 0; i < parkPositions.length; i++) {
  const park = parkPositions[i].name;
  const start = parkPositions[i].pos;
  const end = i+1 < parkPositions.length ? parkPositions[i+1].pos : src.length;
  const section = src.substring(start, end);

  for (const group of ALIAS_GROUPS) {
    const found = [];
    for (const name of group) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('"name":\\s*"' + escaped + '"');
      if (re.test(section)) found.push(name);
    }
    if (found.length > 1) {
      console.log('  ' + park + ': ' + found.join(' + '));
      totalConflicts++;
    }
  }
}
console.log('Total parks with alias conflicts: ' + totalConflicts);

// Also scan for same scientificName appearing more than once in a park
console.log('\n=== Same scientificName appearing multiple times in a park ===');
let sciDups = 0;
for (let i = 0; i < parkPositions.length; i++) {
  const park = parkPositions[i].name;
  const start = parkPositions[i].pos;
  const end = i+1 < parkPositions.length ? parkPositions[i+1].pos : src.length;
  const section = src.substring(start, end);

  const nameRe = /"name":\s*"([^"]+)"/g;
  const sciRe = /"scientificName":\s*"([^"]+)"/g;
  const names = [];
  const scis = [];
  let m;
  while ((m = nameRe.exec(section)) !== null) names.push(m[1]);
  while ((m = sciRe.exec(section)) !== null) scis.push(m[1].toLowerCase().split(/\s+/).slice(0,2).join(' '));

  const sciCounts = {};
  const sciNames = {};
  for (let j = 0; j < scis.length; j++) {
    const sci = scis[j];
    if (!sci) continue;
    sciCounts[sci] = (sciCounts[sci] || 0) + 1;
    if (!sciNames[sci]) sciNames[sci] = [];
    if (j < names.length) sciNames[sci].push(names[j]);
  }
  for (const [sci, count] of Object.entries(sciCounts)) {
    if (count > 1) {
      const uniqueNames = [...new Set(sciNames[sci])];
      if (uniqueNames.length > 1) {
        console.log('  ' + park + ': ' + uniqueNames.join(' / ') + ' [' + sci + '] x' + count);
        sciDups++;
      }
    }
  }
}
console.log('Total sci-name duplicate parks: ' + sciDups);
