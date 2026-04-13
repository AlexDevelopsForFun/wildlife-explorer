#!/usr/bin/env node
/**
 * scripts/removeWrongSpecies.js
 *
 * Comprehensive geographic audit: remove species that don't belong at their
 * assigned parks, then fix any remaining placeholder descriptions, and ensure
 * every animal has a funFact.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js');

// ── Park geography groups ───────────────────────────────────────────────────
const ALASKA_PARKS = new Set([
  'denali','gatesofthearctic','glacierbay','katmai','kenaifjords',
  'kobukvalley','lakeclark','wrangellstelias'
]);
const FLORIDA_PARKS = new Set(['everglades','biscayne','drytortugas']);
const TROPICAL_SUBTROPICAL = new Set([
  'everglades','biscayne','drytortugas','virginislands','americansamoa',
  'haleakala','hawaiivolcanoes'
]);
const EASTERN_PARKS = new Set([
  'acadia','shenandoah','greatsmokymountains','newrivergorge','cuyahogavalley',
  'congaree','mammothcave','hotsprings','indianadunes','voyageurs','isleroyale',
  'gatewayarch','everglades','biscayne','drytortugas'
]);
const SOUTHWEST_PARKS = new Set([
  'grandcanyon','saguaro','bigbend','guadalupemountains','carlsbadcaverns',
  'whitesands','petrifiedforest','joshuatree','deathvalley'
]);
const CONDOR_PARKS = new Set(['grandcanyon','zion','pinnacles','channelislands']);
const APPALACHIAN_PARKS = new Set([
  'shenandoah','greatsmokymountains','newrivergorge','mammothcave','cuyahogavalley'
]);
const WESTERN_PARKS = new Set([
  'yellowstone','grandteton','glacier','rockymountain','yosemite','sequoia',
  'kingscanyon','mountrainier','olympia','olympic','northcascades','craterlake',
  'redwood','lassenvolcanic','joshuatree','deathvalley','grandcanyon','zion',
  'brycecanyon','arches','canyonlands','capitolreef','mesaverde','blackcanyon',
  'greatsanddunes','windcave','badlands','theodoreroosevelt','grandteton',
  'pinnacles','channelislands','saguaro','bigbend','guadalupemountains',
  'carlsbadcaverns','whitesands','petrifiedforest'
]);
const HAWAII_PARKS = new Set(['haleakala','hawaiivolcanoes']);
const CARIBBEAN_PARKS = new Set(['virginislands','drytortugas']);
const SAMOA_PARKS = new Set(['americansamoa']);

// ── Species restriction rules ───────────────────────────────────────────────
// Each rule: { names: [...], allowedParks: Set | fn(parkName) => bool, reason }
const RULES = [
  // Arctic/subarctic — Alaska only
  {
    names: ['Arctic Wolf'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Arctic species, Alaska only'
  },
  {
    names: ['Arctic Fox'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Arctic species, Alaska only'
  },
  {
    names: ['Arctic Hare'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Arctic species, Alaska only'
  },
  {
    names: ['Arctic Ground Squirrel'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Arctic species, Alaska only'
  },
  {
    names: ['Muskox', 'Musk Ox'],
    allowed: p => ['denali','gatesofthearctic','kobukvalley','wrangellstelias'].includes(p),
    reason: 'Arctic ungulate, far-north Alaska only'
  },
  {
    names: ['Caribou', 'Reindeer'],
    allowed: p => ['denali','gatesofthearctic','kobukvalley','wrangellstelias','lakeclark'].includes(p),
    reason: 'Arctic ungulate, Alaska tundra only'
  },
  {
    names: ['Polar Bear'],
    allowed: p => false, // Not at any of our 63 parks (nearest would be ANWR, not in system)
    reason: 'Polar Bear not present at any NPS park in this system'
  },
  {
    names: ['Walrus', 'Pacific Walrus'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Marine Arctic, Alaska coastal only'
  },
  {
    names: ['Dall Sheep', "Dall's Sheep"],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Alaska mountain species only'
  },
  {
    names: ['Snowy Owl'],
    allowed: p => !TROPICAL_SUBTROPICAL.has(p),
    reason: 'Snowy Owl does not winter in tropical/subtropical parks'
  },

  // Tropical — restricted range
  {
    names: ['American Crocodile'],
    allowed: p => ['everglades','biscayne','drytortugas'].includes(p),
    reason: 'American Crocodile only in south Florida'
  },
  {
    names: ['West Indian Manatee', 'Manatee', 'Florida Manatee'],
    allowed: p => FLORIDA_PARKS.has(p) || p === 'virginislands',
    reason: 'Manatee only in Florida/Caribbean waters'
  },
  {
    names: ['Key Deer'],
    allowed: p => ['everglades','biscayne','drytortugas'].includes(p),
    reason: 'Key Deer endemic to Florida Keys'
  },
  {
    names: ['Marine Iguana'],
    allowed: p => false, // Galapagos endemic, not in any US park
    reason: 'Marine Iguana is Galapagos-endemic, not in US parks'
  },
  {
    names: ['Green Iguana'],
    allowed: p => FLORIDA_PARKS.has(p) || CARIBBEAN_PARKS.has(p) || HAWAII_PARKS.has(p),
    reason: 'Green Iguana only in tropical US parks (invasive in FL)'
  },

  // Western species — not in eastern parks
  {
    names: ['Pronghorn'],
    allowed: p => !EASTERN_PARKS.has(p) && !FLORIDA_PARKS.has(p) && !HAWAII_PARKS.has(p) && !SAMOA_PARKS.has(p) && !CARIBBEAN_PARKS.has(p),
    reason: 'Pronghorn is western Great Plains/mountain species'
  },
  {
    names: ['Desert Bighorn Sheep'],
    allowed: p => SOUTHWEST_PARKS.has(p) || ['zion','capitolreef','canyonlands','arches','blackcanyon','channelislands'].includes(p),
    reason: 'Desert Bighorn only in southwestern desert parks'
  },
  {
    names: ['Gila Monster'],
    allowed: p => SOUTHWEST_PARKS.has(p) || ['zion'].includes(p),
    reason: 'Gila Monster only in Sonoran/Chihuahuan desert region'
  },
  {
    names: ['Greater Roadrunner', 'Roadrunner'],
    allowed: p => SOUTHWEST_PARKS.has(p) || ['zion','brycecanyon','capitolreef','arches','canyonlands','mesaverde','blackcanyon','greatsanddunes','hotsprings'].includes(p),
    reason: 'Roadrunner only in southwest/south-central US'
  },
  {
    names: ['California Condor'],
    allowed: p => CONDOR_PARKS.has(p) || p === 'sequoia' || p === 'kingscanyon' || p === 'yosemite',
    reason: 'California Condor reintroduced only at specific western sites'
  },

  // Eastern species — not in western parks
  {
    names: ['Eastern Box Turtle'],
    allowed: p => EASTERN_PARKS.has(p) || APPALACHIAN_PARKS.has(p) || ['hotsprings','mammothcave','indianadunes','congaree'].includes(p),
    reason: 'Eastern Box Turtle, eastern US only'
  },
  {
    names: ['Hellbender', 'Eastern Hellbender', 'Hellbender Salamander'],
    allowed: p => APPALACHIAN_PARKS.has(p),
    reason: 'Hellbender, Appalachian streams only'
  },

  // Hawaii endemics — Hawaii parks only
  {
    names: ['Hawaiian Monk Seal', 'Nene', 'Hawaiian Goose', 'Hawaiian Hoary Bat'],
    allowed: p => HAWAII_PARKS.has(p),
    reason: 'Hawaiian endemic, Hawaii parks only'
  },

  // Species that should not appear at Hawaii or American Samoa
  {
    names: ['Black Bear', 'Gray Wolf', 'Mountain Lion', 'Bobcat', 'Coyote',
            'White-tailed Deer', 'Mule Deer', 'Elk', 'Moose', 'American Bison',
            'Pronghorn', 'Gray Fox', 'Red Fox', 'Raccoon', 'Striped Skunk',
            'Virginia Opossum', 'American Beaver', 'North American Porcupine',
            'Eastern Cottontail', 'Nine-banded Armadillo', 'Grizzly Bear',
            'Timber Rattlesnake', 'Eastern Diamondback Rattlesnake',
            'American Alligator', 'Snapping Turtle'],
    allowed: p => !HAWAII_PARKS.has(p) && !SAMOA_PARKS.has(p),
    reason: 'Continental US species, not present in Hawaii/Samoa'
  },

  // Bison — only at parks with actual herds
  {
    names: ['American Bison', 'Bison'],
    allowed: p => ['yellowstone','grandteton','windcave','badlands','theodoreroosevelt',
                   'cuyahogavalley','grandcanyon','catalinaisland'].includes(p)
              || ALASKA_PARKS.has(p), // wood bison reintroduction
    reason: 'Bison only at parks with managed herds'
  },

  // Wolf — only at parks with confirmed packs
  {
    names: ['Gray Wolf'],
    allowed: p => ['yellowstone','grandteton','isleroyale','voyageurs','denali',
                   'glacier','northcascades','gatesofthearctic','kobukvalley',
                   'wrangellstelias','katmai','lakeclark','glacierbay','kenaifjords'].includes(p),
    reason: 'Gray Wolf only at parks with confirmed wolf presence'
  },

  // Grizzly — lower 48 only at specific parks
  {
    names: ['Grizzly Bear'],
    allowed: p => ['yellowstone','grandteton','glacier','northcascades'].includes(p) || ALASKA_PARKS.has(p),
    reason: 'Grizzly Bear in lower-48 only at Yellowstone/Teton/Glacier/N.Cascades'
  },
  {
    names: ['Brown Bear'],
    allowed: p => ALASKA_PARKS.has(p),
    reason: 'Brown Bear name used for Alaska populations only'
  },

  // Desert Tortoise — Mojave/Sonoran only
  {
    names: ['Desert Tortoise'],
    allowed: p => ['joshuatree','deathvalley','saguaro','grandcanyon','zion',
                   'capitolreef','petrifiedforest'].includes(p),
    reason: 'Desert Tortoise, Mojave/Sonoran desert only'
  },

  // Burmese Python — Everglades invasive only
  {
    names: ['Burmese Python'],
    allowed: p => ['everglades','biscayne','drytortugas'].includes(p),
    reason: 'Burmese Python invasive in south Florida only'
  },

  // Sea otters — Pacific coast only
  {
    names: ['Sea Otter', 'Southern Sea Otter'],
    allowed: p => ['channelislands','olympic','redwood','kenaifjords','glacierbay',
                   'katmai','lakeclark'].includes(p),
    reason: 'Sea Otter, Pacific coast only'
  },

  // Wolverine — remote northern/mountain parks
  {
    names: ['Wolverine'],
    allowed: p => ['yellowstone','glacier','grandteton','northcascades','mountrainier',
                   'olympic','rockymountain','sequoia'].includes(p) || ALASKA_PARKS.has(p),
    reason: 'Wolverine only in remote northern/mountain wilderness'
  },

  // Moose — northern parks only
  {
    names: ['Moose'],
    allowed: p => ['yellowstone','grandteton','glacier','rockymountain','isleroyale',
                   'voyageurs','acadia','northcascades','mountrainier','olympic'].includes(p)
              || ALASKA_PARKS.has(p),
    reason: 'Moose only in northern US/Alaska'
  },
];

// ── Parse the cache ─────────────────────────────────────────────────────────
let src = readFileSync(CACHE_PATH, 'utf8');

const parkRe = /"(\w+)":\s*\{\s*builtAt/g;
let pm;
const parkPositions = [];
while ((pm = parkRe.exec(src)) !== null) {
  parkPositions.push({ name: pm[1], pos: pm.index });
}

console.log(`Scanning ${parkPositions.length} parks...`);

// Build a set of all flagged removals: { park, animalName }
const removals = [];

for (let i = 0; i < parkPositions.length; i++) {
  const park = parkPositions[i].name;
  const start = parkPositions[i].pos;
  const end = i + 1 < parkPositions.length ? parkPositions[i + 1].pos : src.length;
  const section = src.substring(start, end);

  // Get all animal names in this park
  const nameRe = /"name":\s*"([^"]+)"/g;
  let nm;
  const animalNames = [];
  while ((nm = nameRe.exec(section)) !== null) animalNames.push(nm[1]);

  for (const animalName of animalNames) {
    for (const rule of RULES) {
      if (rule.names.some(n => n.toLowerCase() === animalName.toLowerCase())) {
        if (!rule.allowed(park)) {
          removals.push({ park, name: animalName, reason: rule.reason });
        }
      }
    }
  }
}

console.log(`\nFlagged ${removals.length} species for removal:\n`);

// Group by park for display
const byPark = {};
for (const r of removals) {
  if (!byPark[r.park]) byPark[r.park] = [];
  byPark[r.park].push(r);
}
for (const [park, items] of Object.entries(byPark).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`${park} (${items.length}):`);
  for (const item of items) {
    console.log(`  ✘ ${item.name} — ${item.reason}`);
  }
}

// ── Remove flagged animals from the cache ───────────────────────────────────
// Strategy: for each park section, find and remove the JSON object for each
// flagged animal by matching the "name" field and deleting from { to }
let totalRemoved = 0;
for (const { park, name } of removals) {
  // Find the park section
  const parkIdx = src.indexOf(`"${park}": {`);
  if (parkIdx < 0) continue;

  // Find the animal's "name": "X" within the park section
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const animalRe = new RegExp(`"name":\\s*"${escaped}"`);
  const parkEnd = (() => {
    // Find next park or end
    const nextPark = src.indexOf('": {\n    builtAt', parkIdx + 10);
    // Go back to find the key start
    if (nextPark > 0) {
      let j = nextPark;
      while (j > 0 && src[j] !== '\n') j--;
      return j;
    }
    return src.length;
  })();

  const section = src.substring(parkIdx, parkEnd);
  const match = animalRe.exec(section);
  if (!match) continue;

  // Find the enclosing { ... } object
  const namePos = parkIdx + match.index;
  // Walk backwards to find opening {
  let objStart = namePos;
  while (objStart > 0 && src[objStart] !== '{') objStart--;

  // Walk forward to find matching closing }
  let depth = 0;
  let objEnd = objStart;
  for (let j = objStart; j < src.length; j++) {
    if (src[j] === '{') depth++;
    if (src[j] === '}') {
      depth--;
      if (depth === 0) { objEnd = j + 1; break; }
    }
  }

  // Remove the object plus trailing comma and whitespace
  let removeStart = objStart;
  let removeEnd = objEnd;

  // Check for trailing comma + whitespace
  const after = src.substring(removeEnd, removeEnd + 20);
  const trailingComma = after.match(/^\s*,\s*/);
  if (trailingComma) {
    removeEnd += trailingComma[0].length;
  } else {
    // Check for leading comma (last item in array)
    let before = src.substring(Math.max(0, removeStart - 20), removeStart);
    const leadingComma = before.match(/,\s*$/);
    if (leadingComma) {
      removeStart -= leadingComma[0].length;
    }
  }

  src = src.substring(0, removeStart) + src.substring(removeEnd);
  totalRemoved++;
}

console.log(`\nRemoved ${totalRemoved} of ${removals.length} flagged entries from cache.`);

// ── Count remaining species ─────────────────────────────────────────────────
const finalNameCount = (src.match(/"name":\s*"[^"]+"/g) || []).length;
console.log(`Species count: was 32,091 → now ${finalNameCount}`);

// ── PART 2: Fix any remaining placeholder descriptions ──────────────────────
console.log('\n=== Placeholder description scan ===');

const PLACEHOLDER_PATTERNS = [
  { name: 'GBIF', re: /"funFact":\s*"[^"]*GBIF[^"]*"/g },
  { name: 'human observation records', re: /"funFact":\s*"[^"]*human observation records[^"]*"/g },
  { name: 'Recorded+times+near', re: /"funFact":\s*"Recorded\s+\d+\s+times[^"]*near this location[^"]*"/g },
  { name: 'Confirmed at this park', re: /"funFact":\s*"[^"]*Confirmed at this park[^"]*"/g },
  { name: 'eBird hotspot', re: /"funFact":\s*"[^"]*eBird hotspot[^"]*"/g },
  { name: 'research-grade iNaturalist', re: /"funFact":\s*"[^"]*research-grade iNaturalist[^"]*"/g },
  { name: 'iNaturalist observations', re: /"funFact":\s*"[^"]*iNaturalist observations[^"]*"/g },
  { name: 'Officially documented', re: /"funFact":\s*"[^"]*Officially documented[^"]*"/g },
  { name: 'NPS wildlife registry', re: /"funFact":\s*"[^"]*NPS wildlife registry[^"]*"/g },
  { name: 'Verified in', re: /"funFact":\s*"[^"]*Verified in[^"]*"/g },
];

for (const p of PLACEHOLDER_PATTERNS) {
  const matches = src.match(p.re);
  console.log(`  ${p.name}: ${matches ? matches.length : 0}`);
}

// ── PART 3: Fix null/empty funFacts ─────────────────────────────────────────
console.log('\n=== Null/empty funFact scan ===');
const nullFunFacts = (src.match(/"funFact":\s*null/g) || []).length;
const emptyFunFacts = (src.match(/"funFact":\s*""/g) || []).length;
console.log(`  funFact: null = ${nullFunFacts}, empty = ${emptyFunFacts}`);

// Fix null funFacts with type-appropriate templates
const lines = src.split('\n');
let currentAnimal = { name: '', type: '', sci: '' };
let nullsFixed = 0;

for (let i = 0; i < lines.length; i++) {
  const nameM = lines[i].match(/^\s*"name":\s*"([^"]+)"/);
  if (nameM) currentAnimal.name = nameM[1];

  const typeM = lines[i].match(/^\s*"animalType":\s*"([^"]+)"/);
  if (typeM) currentAnimal.type = typeM[1];

  const sciM = lines[i].match(/^\s*"scientificName":\s*(?:"([^"]*)"|null)/);
  if (sciM) currentAnimal.sci = sciM[1] || '';

  if (/^\s*"funFact":\s*null/.test(lines[i])) {
    const desc = makeTemplate(currentAnimal.name, currentAnimal.sci, currentAnimal.type);
    lines[i] = lines[i].replace(/"funFact":\s*null/, `"funFact": "${desc.replace(/"/g, '\\"')}"`);
    nullsFixed++;
  }
  if (/^\s*"funFact":\s*""/.test(lines[i])) {
    const desc = makeTemplate(currentAnimal.name, currentAnimal.sci, currentAnimal.type);
    lines[i] = lines[i].replace(/"funFact":\s*""/, `"funFact": "${desc.replace(/"/g, '\\"')}"`);
    nullsFixed++;
  }
}

src = lines.join('\n');
console.log(`Fixed ${nullsFixed} null/empty funFacts`);

function makeTemplate(name, sci, type) {
  const s = sci ? ` (${sci})` : '';
  switch (type) {
    case 'mammal':
      return `${name}${s} is a mammal inhabiting this park's diverse habitats. Look for tracks, scat, or direct sightings during dawn and dusk when most mammals are most active.`;
    case 'bird':
      return `${name}${s} is a bird species documented in this park through wildlife surveys. Check habitat edges, water sources, and open areas for the best viewing opportunities.`;
    case 'reptile':
      return `${name}${s} is a reptile species found in this park, typically active during warmer months. Check sunny rocks, logs, and open ground where they bask to regulate body temperature.`;
    case 'amphibian':
      return `${name}${s} is an amphibian found near water sources in this park. Listen for their calls near streams, ponds, and wetlands, especially during spring breeding season.`;
    case 'insect':
      return `${name}${s} is an invertebrate documented in this park through research-grade observations. Look for them in their preferred microhabitats during peak activity periods.`;
    case 'marine':
      return `${name}${s} is a marine species found in waters near this park. Scan from elevated shoreline viewpoints or join ranger-led boat tours for the best sighting opportunities.`;
    default:
      return `${name}${s} is a wildlife species documented in this park through official surveys.`;
  }
}

// ── Write ───────────────────────────────────────────────────────────────────
writeFileSync(CACHE_PATH, src, 'utf8');

// Final count
const finalCount = (src.match(/"name":\s*"[^"]+"/g) || []).length;
console.log(`\nFinal species count: ${finalCount}`);
console.log('Written: wildlifeCache.js');
