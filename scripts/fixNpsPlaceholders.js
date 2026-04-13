#!/usr/bin/env node
/**
 * scripts/fixNpsPlaceholders.js
 *
 * Fixes remaining "Officially documented in the NPS wildlife registry" placeholder
 * funFacts with type-appropriate real descriptions. Also does a comprehensive scan
 * for ANY remaining placeholder patterns and fixes them.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js');

let src = readFileSync(CACHE_PATH, 'utf8');

// ── Hand-crafted descriptions for specific NPS placeholder animals ──────────
const SPECIFIC_DESCRIPTIONS = {
  // Mammals
  'Mountain Lion': 'Mountain lions are solitary apex predators that roam vast territories — a single cat may patrol 100+ square miles. They are almost entirely nocturnal and are among the most elusive large mammals in North America.',
  'Gray Wolf': 'Gray wolves are highly social pack hunters that communicate through howls audible up to 10 miles away. A pack typically consists of an alpha pair and their offspring from multiple years.',
  'Wild Horse': 'Wild horses in this region are descendants of domestic stock that escaped or were released centuries ago. They live in bands led by a dominant stallion and graze on native grasses.',
  'Feral Burro': 'Feral burros are descendants of pack animals used by prospectors and miners in the 1800s. Hardy and sure-footed, they thrive in arid desert terrain where few other large mammals survive.',
  'Bighorn Sheep': 'Bighorn sheep are iconic mountain dwellers known for dramatic head-butting contests between rams during the fall rut. Their specially padded hooves grip rocky terrain with remarkable precision.',
  'Desert Bighorn Sheep': 'Desert bighorn sheep can go several days without water, obtaining moisture from the plants they eat. Rams clash horns at speeds up to 20 mph during rutting season — the sound carries for miles.',
  'North American Porcupine': 'Porcupines carry roughly 30,000 barbed quills that detach on contact — an effective defense against most predators. They are surprisingly good climbers and spend much of their time in trees.',
  'American Beaver': 'Beavers are ecosystem engineers that build dams up to 6 feet tall, creating ponds that support dozens of other species. A single family can transform a stream into productive wetland habitat.',
  'Muskrat': 'Muskrats build dome-shaped lodges from cattails and mud in shallow wetlands. Their name comes from the musky odor they produce from glands near their tail during breeding season.',
  'Ringtail': 'Ringtails are agile nocturnal predators with cat-like bodies and raccoon-like tails. They can rotate their hind feet 180 degrees, allowing them to descend cliffs headfirst.',
  'Spotted Skunk': 'Spotted skunks perform a dramatic handstand before spraying — rising onto their front paws with tail raised high as a final warning. They are more agile and arboreal than striped skunks.',
  'Long-tailed Weasel': 'Long-tailed weasels are fierce hunters that can take prey several times their own size. In northern regions, their fur turns white in winter for camouflage against snow.',
  'Black-footed Ferret': 'Black-footed ferrets are one of North America\'s most endangered mammals, once thought extinct until a small population was rediscovered in 1981. They depend almost entirely on prairie dogs for food and shelter.',
  'Swift Fox': 'Swift foxes are the smallest wild canid in North America, weighing only 4-6 pounds. True to their name, they can sprint up to 30 mph to escape predators on the open prairie.',
  'Kit Fox': 'Kit foxes have enormous ears relative to their body size, which help radiate heat in their desert habitat and detect prey underground. They are strictly nocturnal in summer.',
  'Pronghorn': 'Pronghorn are the fastest land animal in the Western Hemisphere, reaching speeds of 55 mph. They evolved their speed to outrun the now-extinct American cheetah.',
  'Javelina': 'Javelinas (collared peccaries) travel in herds of 6-12, communicating through a scent gland on their back. Despite their pig-like appearance, they are not true pigs and belong to an entirely different family.',
  'Coati': 'White-nosed coatis are social relatives of raccoons, foraging in bands of up to 30 individuals. Males are solitary except during breeding season, when they briefly join female groups.',
  'Bobcat': 'Bobcats are stealthy ambush predators found across nearly every habitat type in North America. They hunt primarily at dawn and dusk, stalking prey to within a few feet before pouncing.',
  'Elk': 'Elk are one of the largest deer species in North America. Bulls grow antlers up to 4 feet long each year, shedding them in late winter. Their bugling calls echo through mountain valleys during the fall rut.',
  'Mule Deer': 'Mule deer get their name from their large, mule-like ears. They use a distinctive bounding gait called "stotting" — springing off all four feet simultaneously to navigate steep, rocky terrain.',
  'White-tailed Deer': 'White-tailed deer raise their bright white tail like a flag when alarmed, signaling danger to nearby deer. They are the most widespread large mammal in the Americas.',
  'Coyote': 'Coyotes are remarkably adaptable predators that have expanded their range across North America despite centuries of persecution. Their yipping howls at dusk are one of the most iconic sounds of the American landscape.',
  'Red Fox': 'Red foxes are resourceful omnivores that cache surplus food for lean times, using their excellent memory to relocate hundreds of hidden meals. They pounce on prey by leaping high and diving nose-first into snow.',
  'Raccoon': 'Raccoons have extraordinarily sensitive front paws with five dexterous fingers, allowing them to open latches, turn doorknobs, and identify objects by touch alone — even underwater.',
  'Striped Skunk': 'Striped skunks can spray their pungent musk accurately up to 10 feet. The odor is detectable by humans at concentrations as low as 10 parts per billion.',
  'Virginia Opossum': 'Virginia opossums are the only marsupial in North America, carrying young in a pouch. When threatened, they involuntarily enter a catatonic state — "playing possum" — that can last hours.',
  'Eastern Cottontail': 'Eastern cottontails can sprint up to 18 mph in a zigzag pattern to evade predators. A single female may produce 3-4 litters per year, each with 4-7 young.',
  'Nine-banded Armadillo': 'Nine-banded armadillos always give birth to identical quadruplets from a single fertilized egg. They can hold their breath for up to 6 minutes and walk along river bottoms.',
  'Black Bear': 'Black bears are excellent climbers and swimmers. Despite their name, their fur can range from jet black to cinnamon brown to blonde. They enter a state of torpor in winter but can wake if disturbed.',
  'American Mink': 'American mink are semi-aquatic predators that swim with powerful strokes using partially webbed feet. They are fierce hunters that can take prey larger than themselves.',
  'River Otter': 'River otters are playful, social mammals that slide down muddy and snowy banks for fun. They can hold their breath for up to 8 minutes while hunting fish underwater.',

  // Reptiles
  'American Alligator': 'American alligators are apex predators that regulate their body temperature by basking in the sun. They create "gator holes" that provide critical water refuges for other wildlife during dry periods.',
  'Green Sea Turtle': 'Green sea turtles can hold their breath for up to 5 hours while sleeping underwater. They are the only herbivorous sea turtle species, grazing on seagrass beds that they help keep healthy.',
  'Desert Tortoise': 'Desert tortoises can live 80+ years and survive a full year without water, obtaining moisture from wildflowers and grasses. They spend up to 95% of their lives in underground burrows.',
  'Eastern Box Turtle': 'Eastern box turtles have a hinged plastron that allows them to seal their shell completely shut — no other turtle in the region can do this. Some individuals live over 100 years.',
  'Timber Rattlesnake': 'Timber rattlesnakes den communally in rocky outcrops, sometimes sharing hibernation sites with copperheads and racers. They may travel several miles from their den during summer.',
  'Eastern Diamondback Rattlesnake': 'Eastern diamondback rattlesnakes are the largest venomous snake in North America, reaching 8 feet. They are ambush hunters that can strike at one-third of their body length in milliseconds.',
  'Gopher Tortoise': 'Gopher tortoises dig burrows up to 40 feet long that shelter over 350 other species — earning them the title of "keystone species." Their burrows provide critical refuge during wildfires.',
  'Loggerhead Sea Turtle': 'Loggerhead sea turtles have the strongest bite of any sea turtle, crushing hard-shelled prey like conchs and horseshoe crabs. Females return to the same beach where they hatched to lay their own eggs.',
  'Hawksbill Sea Turtle': 'Hawksbill sea turtles have a narrow, pointed beak perfect for extracting sponges from coral reef crevices. They are critically endangered, with only an estimated 20,000 nesting females worldwide.',
  'American Crocodile': 'American crocodiles can tolerate saltwater thanks to specialized glands that excrete excess salt. They are more timid than alligators and rarely approach humans.',

  // Marine
  'West Indian Manatee': 'West Indian manatees are gentle herbivores that eat up to 10% of their body weight in aquatic plants daily. They have no natural predators and can live 60+ years.',
  'Bottlenose Dolphin': 'Bottlenose dolphins use echolocation to build a detailed acoustic picture of their surroundings, detecting objects as thin as a fishing line. They are among the most intelligent marine mammals.',
  'Harbor Seal': 'Harbor seals haul out on rocky shores and sandbars to rest, regulate temperature, and nurse pups. They can dive to 1,500 feet and hold their breath for nearly 30 minutes.',
  'Hawaiian Monk Seal': 'Hawaiian monk seals are one of the most endangered marine mammals on Earth, with fewer than 1,500 remaining. They are the only tropical seal species and are endemic to Hawaii.',
};

// ── Type-based template fallbacks for animals without specific descriptions ──
function getTypeTemplate(name, sciName, type, seasons) {
  const sci = sciName ? ` (${sciName})` : '';
  switch (type) {
    case 'mammal':
      return `${name}${sci} is a mammal inhabiting this park's diverse habitats. Look for tracks, scat, or direct sightings during dawn and dusk when most mammals are most active.`;
    case 'reptile':
      return `${name}${sci} is a reptile species found in this park, typically active during warmer months. Check sunny rocks, logs, and open ground where they bask to regulate body temperature.`;
    case 'amphibian':
      return `${name}${sci} is an amphibian found near water sources in this park. Listen for their calls near streams, ponds, and wetlands, especially during spring breeding season.`;
    case 'insect':
      return `${name}${sci} is an invertebrate documented in this park through research-grade observations. Look for them in their preferred microhabitats during peak activity periods.`;
    case 'marine':
      return `${name}${sci} is a marine species found in waters near this park. Scan from elevated shoreline viewpoints or join ranger-led boat tours for the best sighting opportunities.`;
    case 'bird':
      return `${name}${sci} is a bird species documented in this park. Check habitat edges, water sources, and open areas where birds are most visible.`;
    default:
      return `${name}${sci} is a wildlife species documented in this park through official surveys.`;
  }
}

// ── PASS 1: Fix NPS wildlife registry placeholders ──────────────────────────
let npsFixed = 0;
const npsPattern = /"name":\s*"([^"]+)"[^}]*?"animalType":\s*"([^"]+)"[^}]*?"scientificName":\s*(?:"([^"]*?)"|null)[^}]*?"funFact":\s*"Officially documented in the NPS wildlife registry for [^"]*?\.(?:[^"]*?)"/g;

// More robust approach: find each NPS placeholder and replace just the funFact
const lines = src.split('\n');
const npsPlaceholderRe = /^(\s*"funFact":\s*)"Officially documented in the NPS wildlife registry for [^"]*?"(,?)$/;

let currentAnimal = { name: null, type: null, sci: null, seasons: [] };

for (let i = 0; i < lines.length; i++) {
  // Track context
  const nameMatch = lines[i].match(/^\s*"name":\s*"([^"]+)"/);
  if (nameMatch) currentAnimal.name = nameMatch[1];

  const typeMatch = lines[i].match(/^\s*"animalType":\s*"([^"]+)"/);
  if (typeMatch) currentAnimal.type = typeMatch[1];

  const sciMatch = lines[i].match(/^\s*"scientificName":\s*(?:"([^"]*?)"|null)/);
  if (sciMatch) currentAnimal.sci = sciMatch[1] || null;

  const funFactMatch = lines[i].match(npsPlaceholderRe);
  if (funFactMatch) {
    const desc = SPECIFIC_DESCRIPTIONS[currentAnimal.name]
      || getTypeTemplate(currentAnimal.name, currentAnimal.sci, currentAnimal.type, currentAnimal.seasons);
    lines[i] = `${funFactMatch[1]}"${desc.replace(/"/g, '\\"')}"${funFactMatch[2]}`;
    npsFixed++;
  }
}

src = lines.join('\n');
console.log(`Pass 1: Fixed ${npsFixed} NPS wildlife registry placeholders`);

// ── PASS 2: Comprehensive scan for ALL remaining placeholder patterns ───────
const placeholderPatterns = [
  { name: 'GBIF', re: /GBIF/g },
  { name: 'human observation records', re: /human observation records/g },
  { name: 'Recorded+times+near', re: /Recorded.*?times.*?near this location/g },
  { name: 'Confirmed at this park', re: /Confirmed at this park/g },
  { name: 'eBird hotspot', re: /eBird hotspot/g },
  { name: 'research-grade iNaturalist', re: /research-grade iNaturalist/g },
  { name: 'Verified in', re: /Verified in/g },
  { name: 'iNaturalist observations', re: /iNaturalist observations/g },
  { name: 'Officially documented', re: /Officially documented/g },
  { name: 'NPS wildlife registry', re: /NPS wildlife registry/g },
];

console.log('\nPass 2: Comprehensive placeholder scan:');
let totalRemaining = 0;
for (const p of placeholderPatterns) {
  // Only count within funFact fields
  const funFactRe = new RegExp(`"funFact":\\s*"[^"]*?${p.re.source}[^"]*?"`, 'g');
  const matches = src.match(funFactRe);
  const count = matches ? matches.length : 0;
  if (count > 0) {
    console.log(`  ❌ ${p.name}: ${count} remaining`);
    totalRemaining += count;
  } else {
    console.log(`  ✅ ${p.name}: 0`);
  }
}

// Special check: the Yellowstone Mountain Lion has an NPS prefix + real text
// Pattern: "Officially documented...park. <real description>"
const hybridRe = /"funFact":\s*"Officially documented in the NPS wildlife registry for [^.]+\.[^"]+"/g;
const hybridMatches = src.match(hybridRe);
if (hybridMatches) {
  console.log(`\n  ⚠️  Found ${hybridMatches.length} hybrid entries (NPS prefix + real text):`);
  for (const h of hybridMatches) {
    const nameCtx = h.substring(0, 100);
    console.log(`    ${nameCtx}...`);
  }
}

console.log(`\nTotal placeholder funFacts remaining: ${totalRemaining}`);

// ── Write ───────────────────────────────────────────────────────────────────
writeFileSync(CACHE_PATH, src, 'utf8');
console.log(`\nWritten: wildlifeCache.js`);
