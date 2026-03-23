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

// ── Keyword lists ─────────────────────────────────────────────────────────────

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

// ── Mammal keywords ───────────────────────────────────────────────────────────

const BAT_KW = ['bat'];

const MARINE_MAMMAL_KW = [
  'seal', 'sea lion', 'walrus', 'whale', 'dolphin', 'porpoise',
  'manatee', 'dugong', 'sea otter',
];

const LARGE_MAMMAL_KW = [
  'bear', 'bison', 'elk', 'moose', 'deer', 'wolf', 'mountain lion',
  'cougar', 'puma', 'jaguar', 'bighorn', 'pronghorn', 'wild boar',
  'mule deer', 'white-tailed', 'whitetail', 'caribou', 'reindeer',
  'musk ox', 'wolverine',
];

const RODENT_KW = [
  'mouse', 'rat', 'squirrel', 'chipmunk', 'vole', 'lemming', 'marmot',
  'prairie dog', 'pocket gopher', 'kangaroo rat', 'kangaroo mouse',
  'wood rat', 'woodrat', 'packrat', 'jumping mouse', 'harvest mouse',
];

const SMALL_MAMMAL_KW = [
  'fox', 'coyote', 'bobcat', 'lynx', 'mink', 'river otter', 'weasel',
  'badger', 'skunk', 'raccoon', 'opossum', 'porcupine', 'muskrat',
  'beaver', 'groundhog', 'woodchuck', 'nutria', 'ringtail', 'coati',
];

// ── Reptile keywords ──────────────────────────────────────────────────────────

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

export function classifyMammalSubtype(name) {
  if (hasKw(name, BAT_KW))           return 'bat';
  if (hasKw(name, MARINE_MAMMAL_KW)) return 'marine';
  if (hasKw(name, LARGE_MAMMAL_KW))  return 'large';
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
