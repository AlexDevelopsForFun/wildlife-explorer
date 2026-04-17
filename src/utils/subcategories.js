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

export const AMPHIBIAN_SUBTYPES = [
  { key: 'all',        emoji: '🐸', label: 'All Amphibians'      },
  { key: 'frog',       emoji: '🐸', label: 'Frogs & Toads'       },
  { key: 'salamander', emoji: '🦎', label: 'Salamanders & Newts' },
];

export const INSECT_SUBTYPES = [
  { key: 'all',         emoji: '🦋', label: 'All Insects'               },
  { key: 'butterfly',   emoji: '🦋', label: 'Butterflies & Moths'       },
  { key: 'beetle',      emoji: '🪲', label: 'Beetles'                   },
  { key: 'dragonfly',   emoji: '🪁', label: 'Dragonflies & Damselflies'  },
  { key: 'bee',         emoji: '🐝', label: 'Bees & Wasps'              },
  { key: 'grasshopper', emoji: '🦗', label: 'Grasshoppers & Crickets'   },
];

export const MARINE_SUBTYPES = [
  { key: 'all',          emoji: '🌊', label: 'All Marine Life'  },
  { key: 'fish',         emoji: '🐟', label: 'Fish'             },
  { key: 'shark',        emoji: '🦈', label: 'Sharks & Rays'    },
  { key: 'invertebrate', emoji: '🦀', label: 'Invertebrates'    },
  { key: 'marine_mammal',emoji: '🐋', label: 'Marine Mammals'   },
  { key: 'sea_turtle',   emoji: '🐢', label: 'Sea Turtles'      },
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

// ── Amphibian keyword lists ───────────────────────────────────────────────────

const AMPHIBIAN_FROG_KW = [
  'frog', 'toad', 'treefrog', 'tree frog', 'bullfrog', 'chorus frog',
  'cricket frog', 'leopard frog', 'wood frog', 'spring peeper', 'peeper',
  'spadefoot', 'narrow-mouthed', 'narrowmouth',
];

const AMPHIBIAN_SALAMANDER_KW = [
  'salamander', 'newt', 'siren', 'mudpuppy', 'hellbender', 'amphiuma',
  'waterdog', 'axolotl', 'ambystoma', 'plethodon', 'desmognathus',
  'eurycea', 'gyrinophilus', 'pseudotriton', 'necturus',
];

// ── Insect keyword lists ──────────────────────────────────────────────────────

const INSECT_BUTTERFLY_KW = [
  'butterfly', 'moth', 'skipper', 'swallowtail', 'monarch', 'admiral',
  'fritillary', 'hairstreak', 'sulfur', 'sulphur', 'sphinx',
  'hawk-moth', 'underwing', 'geometrid', 'inchworm', 'caterpillar',
];

const INSECT_BEETLE_KW = [
  'beetle', 'firefly', 'lightning bug', 'weevil', 'borer', 'longhorn',
  'lady beetle', 'ladybug', 'ladybird', 'scarab', 'click beetle',
  'ground beetle', 'tiger beetle', 'dung beetle',
];

const INSECT_DRAGONFLY_KW = [
  'dragonfly', 'damselfly', 'darner', 'skimmer', 'bluet', 'spreadwing',
  'meadowhawk', 'clubtail', 'baskettail', 'whiteface', 'pondhawk',
];

const INSECT_BEE_KW = [
  'bee', 'wasp', 'hornet', 'yellowjacket', 'yellow jacket',
  'bumblebee', 'bumble bee', 'honeybee', 'honey bee', 'mason bee',
  'leafcutter', 'ichneumon',
];

const INSECT_GRASSHOPPER_KW = [
  'grasshopper', 'cricket', 'katydid', 'locust', 'cicada',
  'walkingstick', 'walking stick', 'mantis', 'mantid', 'cockroach',
];

// ── Marine keyword lists ──────────────────────────────────────────────────────

const MARINE_SHARK_KW = [
  'shark', 'ray', 'skate', 'guitarfish', 'sawfish', 'chimaera',
];

const MARINE_TURTLE_KW = [
  'sea turtle', 'green turtle', 'hawksbill', 'leatherback', 'loggerhead',
  "kemp's ridley", 'olive ridley', 'flatback turtle',
];

const MARINE_INVERT_KW = [
  'crab', 'lobster', 'shrimp', 'clam', 'oyster', 'scallop', 'mussel',
  'sea urchin', 'starfish', 'sea star', 'jellyfish', 'octopus', 'squid',
  'nautilus', 'barnacle', 'coral', 'anemone', 'sea cucumber',
  'horseshoe crab', 'nudibranch', 'brittle star', 'sand dollar',
  'sea worm', 'urchin', 'bryozoan', 'hydroid',
];

const MARINE_FISH_KW = [
  'fish', 'trout', 'salmon', 'bass', 'perch', 'pike', 'walleye',
  'catfish', 'sturgeon', 'eel', 'cod', 'tuna', 'mackerel', 'herring',
  'anchovy', 'flounder', 'halibut', 'sole', 'rockfish', 'snapper',
  'grouper', 'wrasse', 'parrotfish', 'sunfish', 'minnow', 'carp',
  'sucker', 'darter', 'shiner', 'chub', 'seahorse', 'pipefish',
  'goby', 'blenny', 'clownfish', 'damselfish', 'triggerfish',
];

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

export function classifyAmphibianSubtype(name) {
  if (hasKw(name, AMPHIBIAN_FROG_KW))       return 'frog';
  if (hasKw(name, AMPHIBIAN_SALAMANDER_KW))  return 'salamander';
  return 'frog'; // most NA amphibians are frogs/toads
}

export function classifyInsectSubtype(name) {
  if (hasKw(name, INSECT_BUTTERFLY_KW))   return 'butterfly';
  if (hasKw(name, INSECT_BEETLE_KW))      return 'beetle';
  if (hasKw(name, INSECT_DRAGONFLY_KW))   return 'dragonfly';
  if (hasKw(name, INSECT_BEE_KW))         return 'bee';
  if (hasKw(name, INSECT_GRASSHOPPER_KW)) return 'grasshopper';
  return 'beetle'; // default for unrecognised insects
}

// Priority: marine mammals first (reuses existing MARINE_MAMMAL_KW),
// then sharks, sea turtles, invertebrates, fish (broadest keyword last).
export function classifyMarineSubtype(name) {
  if (hasKw(name, MARINE_MAMMAL_KW))  return 'marine_mammal';
  if (hasKw(name, MARINE_SHARK_KW))   return 'shark';
  if (hasKw(name, MARINE_TURTLE_KW))  return 'sea_turtle';
  if (hasKw(name, MARINE_INVERT_KW))  return 'invertebrate';
  if (hasKw(name, MARINE_FISH_KW))    return 'fish';
  return 'fish'; // default for unrecognised marine life
}

export function classifyAnimalSubtype(animal) {
  const name = animal.name ?? '';
  switch (animal.animalType) {
    case 'bird':      return classifyBirdSubtype(name);
    case 'mammal':    return classifyMammalSubtype(name);
    case 'reptile':   return classifyReptileSubtype(name);
    case 'amphibian': return classifyAmphibianSubtype(name);
    case 'insect':    return classifyInsectSubtype(name);
    case 'marine':    return classifyMarineSubtype(name);
    default:          return 'other';
  }
}

/** Returns the subtype definition array for a given animalType, or null if none. */
export function getSubtypeDefs(animalType) {
  switch (animalType) {
    case 'bird':      return BIRD_SUBTYPES;
    case 'mammal':    return MAMMAL_SUBTYPES;
    case 'reptile':   return REPTILE_SUBTYPES;
    case 'amphibian': return AMPHIBIAN_SUBTYPES;
    case 'insect':    return INSECT_SUBTYPES;
    case 'marine':    return MARINE_SUBTYPES;
    default:          return null;
  }
}
