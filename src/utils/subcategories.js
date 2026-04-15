// ── Subcategory definitions ───────────────────────────────────────────────────

export const BIRD_SUBTYPES = [
  { key: 'all',       emoji: '🐦', label: 'All Birds' },
  { key: 'raptor',    emoji: '🦅', label: 'Birds of Prey' },
  { key: 'songbird',  emoji: '🎵', label: 'Songbirds' },
  { key: 'waterfowl', emoji: '🦆', label: 'Waterfowl' },
  { key: 'wading',    emoji: '🦭', label: 'Wading Birds' },
  { key: 'seabird',   emoji: '🌊', label: 'Seabirds' },
  { key: 'gamebird',  emoji: '🦃', label: 'Game Birds' },
  { key: 'perching',  emoji: '🐦', label: 'Perching Birds' },
];

export const MAMMAL_SUBTYPES = [
  { key: 'all',    emoji: '🦌', label: 'All Mammals' },
  { key: 'large',  emoji: '🐻', label: 'Large Mammals' },
  { key: 'small',  emoji: '🦊', label: 'Small Mammals' },
  { key: 'rodent', emoji: '🐿️', label: 'Rodents' },
  { key: 'bat',    emoji: '🦇', label: 'Bats' },
  { key: 'marine', emoji: '🐋', label: 'Marine Mammals' },
];

export const REPTILE_SUBTYPES = [
  { key: 'all',         emoji: '🐊', label: 'All Reptiles' },
  { key: 'snake',       emoji: '🐍', label: 'Snakes' },
  { key: 'lizard',      emoji: '🦎', label: 'Lizards' },
  { key: 'turtle',      emoji: '🐢', label: 'Turtles & Tortoises' },
  { key: 'crocodilian', emoji: '🐊', label: 'Crocodilians' },
];

// ── Bird keyword lists ────────────────────────────────────────────────────────

const RAPTOR_KW = [
  'hawk', 'eagle', 'falcon', 'osprey', 'kite', 'harrier', 'vulture',
  'condor', 'owl', 'merlin', 'kestrel', 'caracara', 'gyrfalcon', 'hobby',
];

const WATERFOWL_KW = [
  'duck', 'goose', 'geese', 'teal', 'merganser', 'bufflehead', 'goldeneye',
  'canvasback', 'redhead', 'scaup', 'wigeon', 'pintail', 'shoveler', 'gadwall',
  'mallard', 'swan', 'scoter', 'eider', 'oldsquaw', 'harlequin',
];

const WADING_KW = [
  'heron', 'egret', 'ibis', 'spoonbill', 'crane', 'stork', 'limpkin', 'bittern',
  'flamingo',
];

const SEABIRD_KW = [
  'gull', 'tern', 'pelican', 'cormorant', 'gannet', 'booby', 'albatross',
  'petrel', 'puffin', 'murre', 'guillemot', 'razorbill', 'shearwater', 'skua',
  'jaeger', 'plover', 'sandpiper', 'phalarope', 'oystercatcher', 'avocet',
  'stilt', 'dunlin', 'dowitcher', 'curlew', 'godwit', 'yellowlegs', 'knot',
  'sanderling', 'turnstone', 'whimbrel', 'willet', 'killdeer',
];

const GAMEBIRD_KW = [
  'grouse', 'turkey', 'quail', 'pheasant', 'ptarmigan', 'partridge',
  'pigeon', 'dove', 'chukar',
];

const SONGBIRD_KW = [
  'warbler', 'sparrow', 'finch', 'thrush', 'robin', 'bluebird', 'bunting',
  'grosbeak', 'tanager', 'vireo', 'wren', 'nuthatch', 'creeper', 'chat',
  'oriole', 'mockingbird', 'catbird', 'thrasher', 'flycatcher', 'kingbird',
  'phoebe', 'pewee', 'redstart', 'parula', 'blackbird', 'cowbird', 'grackle',
  'meadowlark', 'bobolink', 'towhee', 'junco', 'longspur', 'pipit',
  'waxwing', 'kinglet', 'gnatcatcher', 'veery', 'solitaire', 'swallow',
  'martin', 'swift', 'nighthawk', 'nightjar', 'whip-poor-will',
];

// ── Mammal keyword lists ──────────────────────────────────────────────────────

// Bat identifiers — includes genus names and common suffixes
const BAT_KW = [
  'bat', 'myotis', 'pipistrelle', 'free-tailed bat', 'big-eared bat',
  'evening bat', 'yellow bat', 'red bat', 'hoary bat', 'silver-haired bat',
  'cave bat',
];

const MARINE_MAMMAL_KW = [
  'seal', 'sea lion', 'walrus', 'whale', 'dolphin', 'porpoise',
  'manatee', 'dugong', 'sea otter',
];

// Names containing any of these should NEVER be classified as "large" —
// checked BEFORE LARGE_MAMMAL_KW to prevent greedy keyword collisions
// (e.g., "Deermouse" matching "deer", "White-tailed Prairie Dog" matching
// "white-tailed deer" — but these lists avoid that; kept as a safety net).
const LARGE_EXCLUDE = [
  'deermouse', 'deer mouse', 'antelope squirrel', 'prairie dog',
];

// Large ungulates, big carnivores, and cat/cattle-size mammals.
// No bare 'deer' keyword — use specific species phrases to avoid matching
// "Deermouse", "Deer Mouse", etc.
const LARGE_MAMMAL_KW = [
  // Bears & large carnivores
  'bear', 'wolf', 'wolverine',
  'mountain lion', 'cougar', 'puma', 'panther', 'jaguar',
  // Bovids & related ungulates
  'bison', 'bighorn', 'dall sheep', 'mountain goat', 'goat',
  'cattle', 'aoudad', 'gemsbok', 'sheep',
  // Cervids (deer family) — explicit species names only
  'elk', 'moose', 'caribou', 'reindeer', 'musk ox',
  'white-tailed deer', 'mule deer', 'black-tailed deer',
  'sika deer', 'fallow deer', 'red deer', 'roe deer', 'axis deer',
  'key deer',
  // Pronghorn & suids
  'pronghorn',
  'wild boar', 'wild pig', 'feral pig', 'peccary', 'javelina',
  // Equids — 'horse' matches domestic, wild, feral variants
  'horse', 'donkey', 'burro',
];

const RODENT_KW = [
  // Muroids
  'mouse', 'mice', 'rat', 'vole', 'lemming',
  // Sciurids
  'squirrel', 'chipmunk', 'marmot', 'prairie dog',
  // Castorimorphs & others
  'pocket gopher', 'gopher',
  'kangaroo rat', 'kangaroo mouse',
  'wood rat', 'woodrat', 'packrat',
  'jumping mouse', 'harvest mouse',
  // Explicit Deermouse match — ensures RODENT catches them first
  'deermouse', 'deer mouse',
  // Large rodents often mis-categorised
  'beaver', 'mountain beaver', 'porcupine',
  'groundhog', 'woodchuck', 'nutria',
];

const SMALL_MAMMAL_KW = [
  // Canids & small felids
  'fox', 'coyote', 'bobcat', 'lynx',
  // Mustelids
  'mink', 'river otter', 'weasel', 'badger', 'marten', 'fisher',
  'ermine', 'stoat',
  // Mephitids
  'skunk',
  // Procyonids
  'raccoon', 'ringtail', 'coati',
  // Misc
  'opossum', 'muskrat',
  // Lagomorphs — rabbits, hares, pikas (NOT rodents)
  'jackrabbit', 'cottontail', 'rabbit', 'hare', 'pika',
  // Eulipotyphla — shrews, moles
  'shrew', 'mole',
  // Xenarthra
  'armadillo',
];

// ── Reptile keyword lists ─────────────────────────────────────────────────────

const SNAKE_KW = [
  'snake', 'racer', 'ratsnake', 'kingsnake', 'garter', 'copperhead',
  'rattlesnake', 'cottonmouth', 'ribbon snake', 'hognose', 'coachwhip',
  'whipsnake', 'milksnake', 'cornsnake', 'watersnake', 'mudsnake',
  'indigo', 'boa', 'python',
];

const LIZARD_KW = [
  'lizard', 'gecko', 'skink', 'anole', 'iguana', 'monitor', 'gila monster',
  'chuckwalla', 'swift', 'horned lizard', 'alligator lizard',
  'collared lizard', 'leopard lizard',
];

const TURTLE_KW = ['turtle', 'tortoise', 'terrapin'];

const CROC_KW = ['crocodile', 'alligator', 'caiman'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasKw(name, keywords) {
  const lc = name.toLowerCase();
  return keywords.some(kw => lc.includes(kw));
}

// ── Classifiers ───────────────────────────────────────────────────────────────

export function classifyBirdSubtype(name) {
  if (hasKw(name, RAPTOR_KW))    return 'raptor';
  if (hasKw(name, WATERFOWL_KW)) return 'waterfowl';
  if (hasKw(name, WADING_KW))    return 'wading';
  if (hasKw(name, SEABIRD_KW))   return 'seabird';
  if (hasKw(name, GAMEBIRD_KW))  return 'gamebird';
  if (hasKw(name, SONGBIRD_KW))  return 'songbird';
  return 'perching';
}

// Priority: bat → marine → (excluded?) → large → rodent → small → default(small)
// The exclude check prevents "Deermouse" from being classified as "large"
// just because substring matching would otherwise find a broader keyword.
export function classifyMammalSubtype(name) {
  const lc = (name ?? '').toLowerCase();
  if (hasKw(name, BAT_KW))           return 'bat';
  if (hasKw(name, MARINE_MAMMAL_KW)) return 'marine';
  const excluded = LARGE_EXCLUDE.some(kw => lc.includes(kw));
  if (!excluded && hasKw(name, LARGE_MAMMAL_KW)) return 'large';
  if (hasKw(name, RODENT_KW))        return 'rodent';
  if (hasKw(name, SMALL_MAMMAL_KW))  return 'small';
  return 'small'; // default for unrecognised mammals
}

export function classifyReptileSubtype(name) {
  if (hasKw(name, SNAKE_KW))  return 'snake';
  if (hasKw(name, LIZARD_KW)) return 'lizard';
  if (hasKw(name, TURTLE_KW)) return 'turtle';
  if (hasKw(name, CROC_KW))   return 'crocodilian';
  return 'lizard'; // default for unrecognised reptiles
}

export function classifyAnimalSubtype(animal) {
  const name = animal.name ?? '';
  switch (animal.animalType) {
    case 'bird':    return classifyBirdSubtype(name);
    case 'mammal':  return classifyMammalSubtype(name);
    case 'reptile': return classifyReptileSubtype(name);
    default:        return 'other';
  }
}

/** Returns the subtype definition array for a given animalType, or null if none. */
export function getSubtypeDefs(animalType) {
  switch (animalType) {
    case 'bird':    return BIRD_SUBTYPES;
    case 'mammal':  return MAMMAL_SUBTYPES;
    case 'reptile': return REPTILE_SUBTYPES;
    default:        return null;
  }
}
