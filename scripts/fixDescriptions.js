#!/usr/bin/env node
/**
 * scripts/fixDescriptions.js
 *
 * Step 1: Identify top ~200 animals by visibility (top 5 per park by rarity)
 * Step 2: Generate real descriptions for top animals with placeholders
 * Step 3: Replace ALL remaining placeholder funFacts with type-appropriate templates
 * Step 4: Never overwrite existing curated funFacts
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// ── Load cache ───────────────────────────────────────────────────────────────
const mod = await import('../src/data/wildlifeCache.js');
const cache = {};
for (const [id, val] of Object.entries(mod.WILDLIFE_CACHE)) {
  cache[id] = { ...val, animals: val.animals.map(a => ({ ...a })) };
}

const RARITY_ORDER = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];

function isPlaceholder(ff) {
  if (!ff) return true;
  if (/confirmed at this park/i.test(ff)) return true;
  if (/^\d+ research-grade iNaturalist/i.test(ff)) return true;
  if (/research-grade iNaturalist observations at this park/i.test(ff)) return true;
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1: Identify top animals
// ══════════════════════════════════════════════════════════════════════════════
console.log('=== Step 1: Identify top animals by visibility ===\n');

const topByPark = [];
for (const [parkId, parkData] of Object.entries(cache)) {
  if (!parkData?.animals?.length) continue;
  const sorted = [...parkData.animals].sort((a, b) => {
    return RARITY_ORDER.indexOf(a.rarity || 'exceptional') - RARITY_ORDER.indexOf(b.rarity || 'exceptional');
  });
  topByPark.push(...sorted.slice(0, 5).map(a => ({ ...a, _parkId: parkId })));
}

// Deduplicate by scientificName or name
const seen = new Set();
const uniqueTop = [];
for (const a of topByPark) {
  const key = (a.scientificName || a.name).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  uniqueTop.push(a);
}

const topWithPlaceholder = uniqueTop.filter(a => isPlaceholder(a.funFact));
const topWithReal = uniqueTop.filter(a => !isPlaceholder(a.funFact));

console.log(`  Top 5 per park (raw): ${topByPark.length}`);
console.log(`  Unique animals: ${uniqueTop.length}`);
console.log(`  Already have real funFact: ${topWithReal.length}`);
console.log(`  Need real descriptions: ${topWithPlaceholder.length}`);
console.log(`  Sample needing descriptions:`);
topWithPlaceholder.slice(0, 10).forEach(a => {
  console.log(`    ${a.name} (${a.animalType}, ${a.rarity}) @ ${a._parkId}: "${(a.funFact || 'null').slice(0, 60)}"`);
});

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2: Real descriptions for top animals
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== Step 2: Generate real descriptions for top animals ===\n');

// Hand-crafted natural history descriptions for common/iconic species.
// Key = lowercase common name. These are factual, visitor-oriented, 1-2 sentences.
const REAL_DESCRIPTIONS = {
  // ── BIRDS ──────────────────────────────────────────────────────────────────
  'sandhill crane': 'Sandhill Cranes stand nearly 4 feet tall with distinctive red foreheads and gray plumage. Listen for their rattling bugle call across river valleys from spring through fall.',
  'canada goose': 'Canada Geese are large waterfowl with black heads and white chinstraps, commonly seen grazing in open fields near water. They fly in distinctive V-formations during migration.',
  'mallard': 'Mallards are the most familiar duck in North America, with males sporting iridescent green heads. Found on nearly any body of water, they tip forward to feed on aquatic vegetation.',
  'common merganser': 'Common Mergansers are sleek diving ducks with thin, serrated bills built for catching fish. Females lead long lines of ducklings along rivers in early summer.',
  'eurasian collared-dove': 'Eurasian Collared-Doves are pale gray-buff doves with a distinctive black crescent on the back of the neck. Originally from Asia, they have rapidly colonized North America since the 1980s.',
  'killdeer': 'Killdeer are medium-sized plovers with two black breast bands and a loud, piercing call. They famously feign a broken wing to lure predators away from their ground nests.',
  'spotted sandpiper': 'Spotted Sandpipers bob their tails constantly as they walk along shorelines. In breeding plumage, their white underparts are covered with bold dark spots.',
  'great blue heron': 'Great Blue Herons stand motionless in shallow water waiting to strike at fish with lightning speed. Look for them along riverbanks and lake edges, especially at dawn.',
  'northern flicker': 'Northern Flickers are large, brown woodpeckers that often feed on the ground, probing for ants. Watch for their white rump patch flashing in flight and listen for their loud wicka-wicka call.',
  'black-billed magpie': 'Black-billed Magpies are striking black-and-white corvids with iridescent blue-green tail feathers nearly as long as their body. Highly social and curious, they frequently approach picnic areas.',
  "clark's nutcracker": "Clark's Nutcrackers are gray-and-black corvids that cache tens of thousands of pine seeds each fall, remembering most of them months later. Essential to whitebark pine regeneration at high elevations.",
  'common raven': 'Common Ravens are large, entirely black corvids with thick bills and wedge-shaped tails. Among the most intelligent birds, they perform aerial acrobatics and solve complex problems.',
  'mountain chickadee': 'Mountain Chickadees are small, active songbirds with a distinctive white eyebrow stripe. They flit through conifer branches gleaning insects, often hanging upside down.',
  'american robin': 'American Robins are familiar thrushes with orange-red breasts, often seen pulling earthworms from lawns. One of the earliest birds to sing at dawn, their cheerful carol announces the seasons.',
  'red-winged blackbird': 'Red-winged Blackbirds are abundant marsh birds where males flash scarlet-and-yellow shoulder patches while singing from cattail perches. They aggressively defend territories, even chasing hawks.',
  'song sparrow': 'Song Sparrows are streaky brown birds with a distinctive dark central breast spot. They sing a varied, musical song from exposed perches, often near water.',
  'american crow': 'American Crows are large, entirely black birds known for their intelligence and adaptability. They travel in family groups and use tools, recognize human faces, and hold apparent funerals for dead crows.',
  'turkey vulture': 'Turkey Vultures soar on thermals with wings held in a shallow V, rarely flapping. They locate carrion by smell, unusual among birds, and play a vital role as nature\'s cleanup crew.',
  'red-tailed hawk': 'Red-tailed Hawks are the most common large hawk in North America, often perched on telephone poles or soaring in wide circles. Their raspy, descending scream is the classic hawk call used in movies.',
  'bald eagle': 'Bald Eagles are massive raptors with white heads and tails contrasting dark brown bodies. They hunt fish by swooping low over water and snatching prey with powerful talons.',
  'osprey': 'Ospreys are specialized fish-eating raptors that hover over water before plunging feet-first to catch prey. Unlike most hawks, their outer toe is reversible for gripping slippery fish.',
  'great horned owl': 'Great Horned Owls are powerful nocturnal predators with prominent ear tufts and deep hooting calls. They hunt everything from rabbits to skunks and begin nesting in winter.',
  'barred owl': 'Barred Owls are stocky woodland owls best known for their distinctive "Who cooks for you?" call. They hunt small mammals and amphibians at night in mature forests.',
  'wild turkey': 'Wild Turkeys are large ground birds with iridescent bronze plumage and bare, colorful heads. Males fan their tails in spectacular courtship displays each spring.',
  'brown pelican': 'Brown Pelicans are coastal birds that plunge-dive from heights of 60 feet to scoop fish in their expandable throat pouches. Once endangered by pesticides, they have made a remarkable recovery.',
  'anhinga': 'Anhingas swim with only their long, serpentine neck above water, earning them the nickname "snakebird." After fishing, they spread their wings to dry since their feathers lack waterproofing.',
  'roseate spoonbill': 'Roseate Spoonbills are stunning pink wading birds that sweep their flat, spatula-shaped bills side to side through shallow water to filter out small prey. Their vivid color comes from carotenoids in their crustacean diet.',
  'common loon': 'Common Loons are powerful diving birds with haunting, yodel-like calls that echo across northern lakes. They can dive over 200 feet deep and stay submerged for several minutes hunting fish.',
  'atlantic puffin': 'Atlantic Puffins are small seabirds with colorful orange-and-black bills that nest in burrows on offshore islands. They can carry 10 or more small fish crosswise in their bill at once.',
  'snowy owl': 'Snowy Owls are large, white Arctic raptors that visit northern coasts and open fields in winter. Unlike most owls, they are largely diurnal and hunt from low perches or the ground.',
  'california condor': 'California Condors are massive vultures with 9.5-foot wingspans, among the rarest birds on Earth. Saved from extinction by captive breeding, they now soar over canyon country once again.',
  'american herring gull': 'American Herring Gulls are large, familiar coastal gulls with pink legs and yellow bills with a red spot. They are opportunistic feeders found at harbors, beaches, and parking lots.',
  'white-tailed ptarmigan': 'White-tailed Ptarmigan are small, plump grouse that live above treeline year-round, turning pure white in winter for camouflage. They are remarkably tame and easily approached.',
  'willow ptarmigan': 'Willow Ptarmigan are Arctic grouse that turn white in winter and reddish-brown in summer for camouflage. Males stand guard while females incubate, and they are Alaska\'s state bird.',
  'harlequin duck': 'Harlequin Ducks are small, boldly patterned sea ducks that breed on fast-flowing mountain streams. Males sport dramatic blue-gray, chestnut, and white markings.',
  'steller\'s jay': "Steller's Jays are bold, crested corvids with deep blue plumage and black heads. Raucous and curious, they are frequent visitors to campgrounds and picnic areas in western mountains.",
  "gambel's quail": "Gambel's Quail are plump desert birds with a distinctive teardrop-shaped topknot plume. Family groups called coveys scurry between shrubs in the cool morning and evening hours.",
  'cactus wren': 'Cactus Wrens are the largest North American wrens, boldly spotted with a prominent white eyebrow. They build multiple bulky nests in cholla cacti and are surprisingly loud singers.',
  'gila woodpecker': 'Gila Woodpeckers excavate nest cavities in saguaro cacti, creating homes later used by owls, flycatchers, and other desert birds. They have a rolling, chattering call.',
  'greater roadrunner': 'Greater Roadrunners are large, ground-dwelling cuckoos that can run up to 20 mph to catch lizards, snakes, and insects. They raise their dark crest when excited or alarmed.',
  'peregrine falcon': 'Peregrine Falcons are the fastest animals on Earth, diving at speeds over 240 mph to strike prey mid-air. They nest on cliff ledges and have adapted to tall buildings in cities.',
  'spotted owl': 'Spotted Owls are medium-sized, dark-eyed owls of old-growth forests that hunt wood rats and flying squirrels at night. They are federally threatened due to habitat loss.',
  'nene': 'The Nene is Hawaii\'s state bird and the world\'s rarest goose, descended from Canada Geese that arrived in Hawaii roughly 500,000 years ago. They have reduced webbing on their feet for walking on lava.',
  'sooty tern': 'Sooty Terns spend most of their lives over open ocean, sleeping on the wing and only coming to land to breed. Their "wideawake" call earned them the nickname Wideawake Tern.',
  'mexican jay': 'Mexican Jays are social, blue-and-gray corvids that live in cooperative family groups of up to 25 birds. They share food, defend territory together, and help raise each other\'s young.',
  'acorn woodpecker': 'Acorn Woodpeckers live in communal groups and drill thousands of precisely-fitted holes in tree trunks to store acorns. Their clown-like face pattern and raucous calls make them unmistakable.',
  'double-crested cormorant': 'Double-crested Cormorants are dark waterbirds that dive to catch fish, then perch with wings spread to dry. Their orange throat pouch is visible at close range.',

  // ── MAMMALS ────────────────────────────────────────────────────────────────
  'rock squirrel': 'Rock Squirrels are large, bushy-tailed ground squirrels common around canyon rims and trailheads. Despite their cute appearance, they bite — do not hand-feed them.',
  'california ground squirrel': 'California Ground Squirrels are common at trailheads and viewpoints, standing upright on hind legs to watch for predators. They live in extensive burrow systems and are resistant to rattlesnake venom.',
  'eastern gray squirrel': 'Eastern Gray Squirrels are familiar bushy-tailed rodents found in hardwood forests and urban parks. They bury thousands of nuts each fall and rely on spatial memory — and smell — to recover them.',
  'mule deer': 'Mule Deer are named for their large, mule-like ears that rotate independently to detect sounds. They bound in a distinctive stiff-legged gait called "stotting" when alarmed.',
  'white-tailed deer': 'White-tailed Deer flash the bright white underside of their tail as a warning signal when they flee. They are most active at dawn and dusk along forest edges and meadows.',
  'american elk': 'American Elk are among the largest deer in North America, with bulls growing massive antlers each year. Their bugling calls during the fall rut echo through mountain valleys.',
  'elk': 'Elk are among the largest deer in North America, with bulls growing massive antlers each year. Their bugling calls during the fall rut echo through mountain valleys.',
  'roosevelt elk': 'Roosevelt Elk are the largest subspecies of elk in North America, thriving in the temperate rainforests of the Pacific Northwest. Bulls can weigh over 1,000 pounds.',
  'american bison': "American Bison are the continent's heaviest land animal, with bulls weighing up to 2,000 pounds despite their surprising agility — they can run 35 mph and jump 6 feet vertically.",
  'american black bear': 'American Black Bears are adaptable omnivores that eat everything from berries to insects. Despite their name, they can be brown, cinnamon, or even blonde depending on region.',
  'black bear': 'Black Bears are adaptable omnivores that eat everything from berries to insects. Despite their name, they can be brown, cinnamon, or even blonde depending on region.',
  'grizzly bear': 'Grizzly Bears are powerful omnivores distinguished from black bears by their shoulder hump and dished face profile. They can weigh over 600 pounds and run 35 mph in short bursts.',
  'gray wolf': 'Gray Wolves are highly social predators that hunt in family packs of 5-10 members. Their howls carry up to 10 miles and help coordinate the pack across vast territories.',
  'mountain lion': 'Mountain Lions are solitary, elusive cats with tawny fur and long tails that can reach 8 feet from nose to tail tip. They are ambush predators active mainly at dawn, dusk, and night.',
  'moose': 'Moose are the largest members of the deer family, with bulls sporting massive palmate antlers spanning up to 6 feet. Despite their bulk, they are strong swimmers and can dive for aquatic plants.',
  'pronghorn': "Pronghorn are the fastest land mammals in the Western Hemisphere, reaching 55 mph in short bursts. Their oversized eyes provide nearly 360-degree vision to spot predators across open plains.",
  'bighorn sheep': 'Bighorn Sheep are agile climbers with specialized hooves that grip rocky terrain. Males engage in dramatic head-butting contests during the fall rut, audible from over a mile away.',
  'rocky mountain bighorn sheep': 'Rocky Mountain Bighorn Sheep are agile climbers with specialized split hooves that grip rocky terrain. Males clash in dramatic head-butting contests during the fall rut, audible from a mile away.',
  'sierra nevada bighorn sheep': 'Sierra Nevada Bighorn Sheep are a federally endangered subspecies found only in California\'s high Sierra. Fewer than 600 remain, navigating steep alpine terrain above 10,000 feet.',
  'desert bighorn sheep': 'Desert Bighorn Sheep are remarkably adapted to arid canyon country, going days without water by obtaining moisture from plants. They scale nearly vertical cliff faces with ease.',
  'mountain goat': 'Mountain Goats are sure-footed climbers that inhabit the steepest alpine terrain, with specialized rubbery hooves. Their thick white coats insulate them against harsh mountain winters.',
  'dall sheep': "Dall Sheep are pure white wild sheep found on high mountain slopes, where their color provides camouflage against snow. Males grow curling amber horns that indicate their age.",
  'caribou': 'Caribou are the only deer species where both males and females grow antlers. They undertake some of the longest migrations of any land animal, covering hundreds of miles seasonally.',
  'arctic ground squirrel': 'Arctic Ground Squirrels are the only Arctic mammal that truly hibernates, dropping their body temperature below freezing. In summer, they are constantly active, fattening up for 8 months underground.',
  'american pika': 'American Pikas are small, round-eared relatives of rabbits that live in rocky alpine talus slopes. They gather and dry wildflowers into "haystacks" to eat through winter, and do not hibernate.',
  'yellow-bellied marmot': 'Yellow-bellied Marmots are large, social rodents that live in rocky alpine meadows and emit a sharp whistle when alarmed. They hibernate for up to 8 months of the year.',
  'hoary marmot': 'Hoary Marmots are the largest North American marmots, living in alpine meadows and talus fields. Their loud, piercing whistle warning call earns them the nickname "whistle pig."',
  'olympic marmot': 'Olympic Marmots are found only in the Olympic Mountains, living in alpine meadows where they greet each other with nose-to-nose "kisses." They hibernate communally for 8 months.',
  'harbor seal': 'Harbor Seals are curious, spotted marine mammals that haul out on rocks and beaches to rest and warm up. They can dive over 1,500 feet and hold their breath for nearly 30 minutes.',
  'harbor porpoise': 'Harbor Porpoises are small, shy cetaceans that surface briefly with a quick rolling motion. Unlike dolphins, they rarely leap from the water and tend to avoid boats.',
  'sea otter': 'Sea Otters float on their backs while using rocks as tools to crack open shellfish on their chests. Their fur is the densest of any mammal, with up to one million hairs per square inch.',
  'wolverine': 'Wolverines are powerful, stocky members of the weasel family with a reputation for ferocity far exceeding their size. Solitary and elusive, they roam vast wilderness territories.',
  'canada lynx': 'Canada Lynx are medium-sized wild cats with distinctive ear tufts and oversized snowshoe-like paws. They are specialized hunters of snowshoe hares and are most active at twilight.',
  'american beaver': 'American Beavers are the largest rodents in North America, famous for building dams that create entire wetland ecosystems. Their orange teeth are hardened with iron and never stop growing.',
  'north american river otter': 'North American River Otters are playful, social members of the weasel family that slide down muddy banks and wrestle in the water. They are excellent indicators of clean waterways.',
  'ringtail': 'Ringtails are cat-sized relatives of raccoons with enormous eyes and a long, banded tail. Strictly nocturnal and incredibly agile climbers, they are rarely seen by park visitors.',
  'pacific fisher': 'Pacific Fishers are rare, cat-sized members of the weasel family that hunt in dense old-growth forests. Despite their name, they do not typically eat fish — they are one of few predators of porcupines.',
  'florida panther': 'Florida Panthers are a critically endangered subspecies of mountain lion with fewer than 200 remaining in the wild. Primarily nocturnal, a sighting is extraordinarily rare and worth reporting.',
  'west indian manatee': 'West Indian Manatees are gentle, slow-moving marine mammals that can weigh over 1,000 pounds. They graze on seagrass in warm, shallow waters and must surface to breathe every few minutes.',
  'common bottlenose dolphin': 'Common Bottlenose Dolphins are intelligent, social marine mammals that often ride boat wakes and bow waves. They live in pods and communicate with clicks, whistles, and body language.',
  'coyote': 'Coyotes are highly adaptable canids found in virtually every North American habitat from deserts to cities. They are most often heard at dusk, producing their iconic yipping howls.',
  'red fox': 'Red Foxes are elegant, cat-sized canids with bushy tails tipped in white. They pounce on prey by leaping high into the air and diving headfirst into snow or grass.',
  'desert cottontail': 'Desert Cottontails are small, tan rabbits with fluffy white tails common in arid scrublands. Most active at dawn and dusk, they freeze motionless when a predator approaches.',

  // ── REPTILES & AMPHIBIANS ──────────────────────────────────────────────────
  'american alligator': 'American Alligators are apex predators that can grow over 13 feet long and weigh 800 pounds. They regulate water flow by digging "gator holes" that become critical refuges for other wildlife during dry spells.',
  'american crocodile': 'American Crocodiles are the only crocodilian in North America that tolerates saltwater, inhabiting coastal mangroves and estuaries. They are shyer than alligators and rarely encountered.',
  'burmese python': 'Burmese Pythons are invasive constrictors from Southeast Asia that have devastated native mammal populations in the Everglades. Some exceed 18 feet, and removal efforts are ongoing.',
  'green iguana': 'Green Iguanas are large, herbivorous lizards that bask in trees and on rocks near water. Originally from Central and South America, they are now established in tropical US territories.',
  'grand canyon rattlesnake': 'Grand Canyon Rattlesnakes are a subspecies of the western rattlesnake found only within the Grand Canyon. Their pink-salmon coloring blends perfectly with the canyon\'s rock walls.',
  'timber rattlesnake': 'Timber Rattlesnakes are heavy-bodied pit vipers that hibernate communally in rocky dens through winter. They are generally docile and rattle as a warning before striking.',
  'common side-blotched lizard': 'Common Side-blotched Lizards are tiny, abundant reptiles with a dark blotch behind each front leg. Males come in three color morphs — orange, blue, and yellow — that compete in a rock-paper-scissors mating strategy.',
  'common chuckwalla': 'Common Chuckwallas are large, pot-bellied lizards that wedge themselves into rock crevices and inflate their bodies to avoid being pulled out by predators. They are strict herbivores.',
  'eastern hellbender': 'Eastern Hellbenders are North America\'s largest salamander, reaching 2 feet long. They breathe through their wrinkly skin and require clean, fast-flowing streams — their presence indicates excellent water quality.',
  'synchronous firefly': 'Synchronous Fireflies are one of only a few firefly species worldwide that synchronize their flashing patterns. Thousands blink in unison during a brief June mating display, creating waves of light across the forest.',
  'green sea turtle': 'Green Sea Turtles are large marine reptiles that graze on seagrass beds in tropical waters. Named for the green color of their body fat, they can live over 70 years and migrate thousands of miles.',
  'hawksbill sea turtle': 'Hawksbill Sea Turtles are critically endangered marine reptiles with beautiful, overlapping shell plates. They use their narrow, pointed beaks to extract sponges from coral reef crevices.',
  'western earless lizard': 'Western Earless Lizards lack external ear openings and are adapted to sandy habitats. At White Sands, a unique bleached-white population has evolved to match the gypsum dunes.',

  // ── INSECTS ────────────────────────────────────────────────────────────────
  'eastern lubber grasshopper': 'Eastern Lubber Grasshoppers are large, clumsy, brightly colored grasshoppers that walk rather than fly. Their bold yellow-and-black pattern warns predators of their toxic, foul-tasting secretions.',
  'mexican free-tailed bat': 'Mexican Free-tailed Bats form colonies of hundreds of thousands, emerging at dusk in spectacular spiraling columns. They can fly at speeds over 100 mph, making them the fastest mammals.',
  'little brown bat': 'Little Brown Bats are small, common bats that roost in caves and buildings by day and hunt insects at night using echolocation. They can eat up to 1,000 mosquitoes per hour.',
  'samoan flying fox': 'Samoan Flying Foxes are large fruit bats with wingspans up to 3 feet. Unlike most bats, they rely on keen eyesight rather than echolocation and are important pollinators of tropical plants.',
  'utah prairie dog': 'Utah Prairie Dogs are social rodents endemic to southern Utah that live in communal burrow towns. They greet each other with "kisses" and have a complex alarm call system describing specific predators.',
  "common golden-mantled ground squirrel": 'Common Golden-mantled Ground Squirrels resemble large chipmunks but lack facial stripes. They are bold, habitual beggars at scenic overlooks — admire them but do not feed them.',
  'black-tailed prairie dog': 'Black-tailed Prairie Dogs are social rodents that build extensive underground "towns" covering many acres. They greet each other with an open-mouthed "kiss" and bark alarm calls at predators.',
  'sockeye salmon': 'Sockeye Salmon turn brilliant crimson during their upstream spawning run, providing a critical food source for bears, eagles, and entire ecosystems. They die after spawning, fertilizing the streams.',
};

let topFixed = 0;
let topAlreadyGood = 0;
let topNoDescription = 0;

// Apply REAL_DESCRIPTIONS to animals across ALL parks (not just top 5)
for (const [parkId, parkData] of Object.entries(cache)) {
  if (!parkData?.animals) continue;
  for (const animal of parkData.animals) {
    if (!isPlaceholder(animal.funFact)) continue; // already good
    const key = animal.name.toLowerCase();
    if (REAL_DESCRIPTIONS[key]) {
      animal.funFact = REAL_DESCRIPTIONS[key];
      topFixed++;
    }
  }
}

// Count how many top animals were fixed
for (const a of uniqueTop) {
  const key = a.name.toLowerCase();
  if (!isPlaceholder(a.funFact)) { topAlreadyGood++; continue; }
  if (REAL_DESCRIPTIONS[key]) { /* counted above */ }
  else { topNoDescription++; }
}

console.log(`  Real descriptions written: ${topFixed} animal entries across all parks`);
console.log(`  Top animals already good: ${topAlreadyGood}`);
console.log(`  Top animals still missing description: ${topNoDescription}`);

// List any top animals still without descriptions
const stillMissing = topWithPlaceholder.filter(a => !REAL_DESCRIPTIONS[a.name.toLowerCase()]);
if (stillMissing.length > 0) {
  console.log(`\n  Top animals still needing descriptions (${stillMissing.length}):`);
  stillMissing.forEach(a => console.log(`    - ${a.name} (${a.animalType}) @ ${a._parkId}`));
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3: Replace remaining placeholders with type-appropriate templates
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== Step 3: Replace remaining placeholder funFacts ===\n');

const MIGRATION_LABELS = {
  'summer_resident': 'summer-breeding',
  'winter_visitor': 'winter-visiting',
  'migratory': 'migratory',
  'year_round': 'year-round resident',
};

function seasonsToWords(seasons) {
  if (!seasons?.length) return 'warmer months';
  if (seasons.includes('year_round')) return 'all seasons';
  return seasons.join(' and ');
}

function habitatGuess(seasons) {
  if (!seasons?.length) return 'varied habitats';
  if (seasons.includes('year_round')) return 'varied terrain year-round';
  const hasSummer = seasons.includes('summer');
  const hasWinter = seasons.includes('winter');
  if (hasSummer && !hasWinter) return 'forests and meadows during warmer months';
  if (hasWinter && !hasSummer) return 'sheltered areas during the colder months';
  return 'forests, meadows, and varied terrain';
}

let templated = 0;

for (const [parkId, parkData] of Object.entries(cache)) {
  if (!parkData?.animals) continue;
  for (const animal of parkData.animals) {
    if (!isPlaceholder(animal.funFact)) continue;

    const name = animal.name;
    const sci = animal.scientificName ? ` (${animal.scientificName})` : '';
    const type = animal.animalType || 'bird';
    const migLabel = MIGRATION_LABELS[animal.migrationStatus] || '';
    const seasonWords = seasonsToWords(animal.seasons);

    let newFact;
    switch (type) {
      case 'bird': {
        const migPart = migLabel ? `a ${migLabel} bird` : 'a bird';
        newFact = `${name}${sci} is ${migPart} species documented in this park through eBird checklists.`;
        break;
      }
      case 'mammal': {
        const hab = habitatGuess(animal.seasons);
        newFact = `${name}${sci} is a mammal inhabiting this park's ${hab}.`;
        break;
      }
      case 'reptile':
        newFact = `${name}${sci} is a reptile species found in this park, typically active during ${seasonWords}.`;
        break;
      case 'amphibian':
        newFact = `${name}${sci} is an amphibian found near water sources in this park.`;
        break;
      case 'insect':
        newFact = `${name}${sci} is an invertebrate documented in this park through research-grade observations.`;
        break;
      case 'marine':
        newFact = `${name}${sci} is a marine species found in waters near this park.`;
        break;
      default:
        newFact = `${name}${sci} has been documented in this park.`;
    }

    animal.funFact = newFact;
    templated++;
  }
}

console.log(`  Templated replacements: ${templated}`);

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== Verification ===\n');

let remainingEbird = 0;
let remainingINat = 0;
for (const parkData of Object.values(cache)) {
  if (!parkData?.animals) continue;
  for (const a of parkData.animals) {
    if (/confirmed at this park/i.test(a.funFact || '')) remainingEbird++;
    if (/research-grade iNaturalist observations at this park/i.test(a.funFact || '')) remainingINat++;
  }
}

console.log(`  Remaining "eBird hotspot" placeholders: ${remainingEbird}`);
console.log(`  Remaining "iNaturalist observations" placeholders: ${remainingINat}`);

// Check first 20 Yellowstone animals
console.log('\n  First 20 Yellowstone animals:');
const ys = cache.yellowstone?.animals?.slice(0, 20) ?? [];
ys.forEach((a, i) => {
  const ph = isPlaceholder(a.funFact) ? ' *** PLACEHOLDER ***' : '';
  console.log(`    ${i+1}. ${a.name}: "${(a.funFact || 'null').slice(0, 80)}..."${ph}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// WRITE
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== Writing patched wildlifeCache.js ===');

const builtAt = new Date().toISOString();
const allParkIds = Object.keys(cache);
const totalSpecies = Object.values(cache).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js -- do not edit manually.`,
  `// Built: ${builtAt}`,
  `// Parks: ${allParkIds.length} | Species bundled: ${totalSpecies}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  `// Descriptions fixed: ${new Date().toISOString().slice(0, 10)} via fixDescriptions.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
  ``,
  `export const WILDLIFE_CACHE = {`,
];

for (const [id, val] of Object.entries(cache)) {
  lines.push(`  ${JSON.stringify(id)}: {`);
  lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
  lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
  lines.push(`  },`);
}
lines.push(`};`);
lines.push(``);

const outPath = path.join(DATA_DIR, 'wildlifeCache.js');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`  Written: ${outPath} (${allParkIds.length} parks, ${totalSpecies} species)`);
console.log('\n=== Done ===');
