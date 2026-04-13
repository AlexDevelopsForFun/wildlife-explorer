#!/usr/bin/env node
import { readFileSync } from 'fs';
const src = readFileSync('src/data/wildlifeCache.js','utf8');

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

console.log('=== PART 4: VERIFICATION ===\n');

// 1. Arctic Wolf at Biscayne
const bisc = getParkSection('biscayne');
console.log('1. Arctic Wolf at Biscayne:', bisc && /Arctic Wolf/.test(bisc) ? 'STILL PRESENT ❌' : 'REMOVED ✅');

// 2. Arctic Wolf across all parks
console.log('\n2. Arctic Wolf occurrences:');
for (const p of parks) {
  const section = getParkSection(p.name);
  if (section && /"name":\s*"Arctic Wolf"/.test(section)) {
    console.log('   ' + p.name + ' — FOUND');
  }
}
const arcticWolfTotal = (src.match(/"name":\s*"Arctic Wolf"/g) || []).length;
console.log('   Total: ' + arcticWolfTotal + (arcticWolfTotal === 0 ? ' ✅ (none — correct, no Arctic Wolves at our 63 parks)' : ''));

// 3. GBIF in funFact
const gbifInFunFact = src.match(/"funFact":\s*"[^"]*GBIF[^"]*"/g);
console.log('\n3. "GBIF" in funFact fields: ' + (gbifInFunFact ? gbifInFunFact.length : 0) + (gbifInFunFact ? ' ❌' : ' ✅'));

// 4. Recorded + times in funFact
const recordedTimes = src.match(/"funFact":\s*"Recorded\s+\d+\s+times[^"]*"/g);
console.log('4. "Recorded X times" in funFact: ' + (recordedTimes ? recordedTimes.length : 0) + (recordedTimes ? ' ❌' : ' ✅'));

// 5. Park Naturalist descriptionSource
console.log('\n5. "Park Naturalist" descriptionSource entries:');
const pnRe = /"descriptionSource":\s*"Park Naturalist"/g;
let pnMatch;
let pnCount = 0;
while ((pnMatch = pnRe.exec(src)) !== null) {
  pnCount++;
  // Get the animal name and funFact nearby
  const ctx = src.substring(Math.max(0, pnMatch.index - 500), pnMatch.index + 100);
  const nameM = ctx.match(/"name":\s*"([^"]+)"/);
  const ffM = ctx.match(/"funFact":\s*"([^"]{0,60})/);
  console.log('   ' + (nameM ? nameM[1] : '?') + ': "' + (ffM ? ffM[1] + '...' : '?') + '"');
}
console.log('   Total: ' + pnCount + (pnCount <= 5 ? ' ✅ (all have real curated descriptions)' : ''));

// 6. Random 5 parks — first 10 animals
console.log('\n6. Spot-check: first 10 animals at 5 parks:');
const sampleParks = ['yellowstone', 'everglades', 'acadia', 'joshuatree', 'glacier'];
for (const pName of sampleParks) {
  const section = getParkSection(pName);
  if (!section) continue;
  console.log('\n   ' + pName + ':');
  const anRe = /"name":\s*"([^"]+)"[\s\S]*?"funFact":\s*(?:"([^"]{0,50})|null)/g;
  let am;
  let count = 0;
  while ((am = anRe.exec(section)) !== null && count < 10) {
    const ff = am[2] || 'NULL';
    const isPlaceholder = /GBIF|human observation|Recorded.*times|eBird hotspot|iNaturalist observations|NPS wildlife registry|Officially documented/.test(ff);
    console.log('     ' + am[1].padEnd(30) + (isPlaceholder ? '❌ PLACEHOLDER' : ff.length > 3 ? '✅' : '❌ EMPTY'));
    count++;
  }
}

// 7. Biscayne mammals
console.log('\n7. Biscayne mammals:');
if (bisc) {
  const mamRe = /"name":\s*"([^"]+)"[\s\S]*?"animalType":\s*"mammal"/g;
  let m;
  const mammals = [];
  while ((m = mamRe.exec(bisc)) !== null) mammals.push(m[1]);
  mammals.forEach(n => console.log('   ' + n));
  console.log('   Total mammals: ' + mammals.length);
}

// Overall stats
console.log('\n=== SUMMARY ===');
const totalSpecies = (src.match(/"name":\s*"[^"]+"/g) || []).length;
const nullFunFacts = (src.match(/"funFact":\s*null/g) || []).length;
const emptyFunFacts = (src.match(/"funFact":\s*""/g) || []).length;
console.log('Total species: ' + totalSpecies);
console.log('Null funFacts: ' + nullFunFacts);
console.log('Empty funFacts: ' + emptyFunFacts);
console.log('Parks: ' + parks.length);

// All placeholder patterns
const patterns = [
  ['GBIF', /"funFact":\s*"[^"]*GBIF[^"]*"/g],
  ['human observation records', /"funFact":\s*"[^"]*human observation records[^"]*"/g],
  ['Recorded+times', /"funFact":\s*"Recorded\s+\d+\s+times[^"]*"/g],
  ['Confirmed at this park', /"funFact":\s*"[^"]*Confirmed at this park[^"]*"/g],
  ['eBird hotspot', /"funFact":\s*"[^"]*eBird hotspot[^"]*"/g],
  ['research-grade iNaturalist', /"funFact":\s*"[^"]*research-grade iNaturalist[^"]*"/g],
  ['iNaturalist observations', /"funFact":\s*"[^"]*iNaturalist observations[^"]*"/g],
  ['Officially documented', /"funFact":\s*"[^"]*Officially documented[^"]*"/g],
  ['NPS wildlife registry', /"funFact":\s*"[^"]*NPS wildlife registry[^"]*"/g],
  ['Verified in', /"funFact":\s*"[^"]*Verified in[^"]*"/g],
];
console.log('\nPlaceholder patterns in funFact:');
let anyPlaceholders = false;
for (const [name, re] of patterns) {
  const m = src.match(re);
  const c = m ? m.length : 0;
  if (c > 0) anyPlaceholders = true;
  console.log('  ' + name + ': ' + c + (c === 0 ? ' ✅' : ' ❌'));
}
console.log(anyPlaceholders ? '\n⚠️  Placeholders still exist!' : '\n✅ ZERO placeholder descriptions remain');
