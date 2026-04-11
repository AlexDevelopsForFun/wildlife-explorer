#!/usr/bin/env node
/**
 * scripts/generateTipsLocal.js
 *
 * Generates park-specific visitor tips locally using embedded knowledge
 * of park geography and animal behavior. No API key needed.
 *
 * Produces the same parkTips-cache.json format as generateParkTips.js,
 * then applies tips to wildlifeCache.js.
 *
 * Usage:
 *   node scripts/generateTipsLocal.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const TIPS_CACHE_PATH = path.join(__dirname, 'parkTips-cache.json');
const TARGETS_PATH = path.join(__dirname, 'tipTargets.json');

// ══════════════════════════════════════════════════════════════════════════════
// PARK PROFILES — key habitats, features, and viewing areas for each park
// ══════════════════════════════════════════════════════════════════════════════
const PARK_PROFILES = {
  yellowstone: {
    waters: ['Yellowstone River', 'Yellowstone Lake', 'the Lamar Valley river corridor', 'Hayden Valley streams'],
    meadows: ['Lamar Valley', 'Hayden Valley', 'the meadows near Mammoth Hot Springs'],
    forests: ['lodgepole pine forests along the Grand Loop Road', 'the forested areas near Canyon Village'],
    features: ['thermal areas', 'geyser basins', 'the Grand Canyon of the Yellowstone'],
    roads: ['the Grand Loop Road', 'Lamar Valley Road'],
    shoreline: null,
    desert: null,
    alpine: ['the high meadows near Dunraven Pass'],
    eco: 'mountain-meadow',
  },
  everglades: {
    waters: ['the Anhinga Trail boardwalk', 'freshwater sloughs', 'mangrove waterways', 'Nine Mile Pond'],
    meadows: ['the sawgrass prairies along the main park road', 'Shark Valley'],
    forests: ['hardwood hammocks along the Gumbo Limbo Trail', 'the tropical hammocks near Flamingo'],
    features: ['Shark Valley observation tower', 'Eco Pond at Flamingo', 'the coastal prairie'],
    roads: ['the main park road to Flamingo', 'Shark Valley tram road'],
    shoreline: ['Florida Bay shoreline near Flamingo', 'the mangrove coast'],
    desert: null,
    alpine: null,
    eco: 'subtropical-wetland',
  },
  denali: {
    waters: ['the braided rivers along the park road', 'Wonder Lake', 'tundra ponds'],
    meadows: ['the open tundra near Polychrome Pass', 'Stony Hill Overlook area', 'the tundra above treeline'],
    forests: ['spruce forests near the park entrance', 'the taiga zone below treeline'],
    features: ['Denali (the peak)', 'the Toklat River area', 'Sable Pass'],
    roads: ['the single park road beyond Savage River'],
    shoreline: null,
    desert: null,
    alpine: ['the alpine tundra above 3,000 feet', 'ridgelines near Thoroughfare Pass'],
    eco: 'subarctic-tundra',
  },
  acadia: {
    waters: ['Jordan Pond', 'Eagle Lake', 'freshwater ponds throughout the park'],
    meadows: ['the open meadows near the visitor center', 'clearings along the carriage roads'],
    forests: ['the spruce-fir forests along the carriage roads', 'mixed forests near Jordan Pond'],
    features: ['Cadillac Mountain summit', 'Thunder Hole', 'Sand Beach'],
    roads: ['the Park Loop Road', 'the carriage roads'],
    shoreline: ['the rocky coastline along Ocean Path', 'the shore near Bass Harbor Head', 'tidal pools at low tide'],
    desert: null,
    alpine: ['the summit areas of Cadillac Mountain'],
    eco: 'coastal-forest',
  },
  shenandoah: {
    waters: ['mountain streams and waterfalls', 'Dark Hollow Falls area', 'small creek crossings'],
    meadows: ['Big Meadows', 'the open areas along Skyline Drive overlooks'],
    forests: ['the dense hardwood forests along the Appalachian Trail', 'the oak-hickory woodlands'],
    features: ['Big Meadows', 'Skyline Drive overlooks', 'Stony Man summit'],
    roads: ['Skyline Drive'],
    shoreline: null,
    desert: null,
    alpine: null,
    eco: 'appalachian-forest',
  },
  newrivergorge: {
    waters: ['the New River corridor', 'streams flowing into the gorge', 'Sandstone Falls area'],
    meadows: ['the rim trails above the gorge', 'open areas near Canyon Rim Visitor Center'],
    forests: ['the mixed hardwood forests along rim trails', 'the gorge walls'],
    features: ['the New River Gorge Bridge area', 'Grandview overlook', 'Endless Wall Trail area'],
    roads: ['the Fayette Station Road into the gorge'],
    shoreline: null, desert: null, alpine: null,
    eco: 'appalachian-gorge',
  },
  cuyahogavalley: {
    waters: ['the Cuyahoga River corridor', 'Brandywine Falls area', 'Blue Hen Falls streams'],
    meadows: ['the open fields along the Towpath Trail', 'Stanford meadows area'],
    forests: ['the mixed forests along the Valley Trail', 'the ravines near Brandywine Falls'],
    features: ['Brandywine Falls', 'the Towpath Trail', 'the Cuyahoga Valley Scenic Railroad corridor'],
    roads: ['Riverview Road', 'the Towpath Trail'],
    shoreline: null, desert: null, alpine: null,
    eco: 'midwestern-river-valley',
  },
  isleroyale: {
    waters: ['the inland lakes and beaver ponds', 'Lake Superior shoreline', 'Siskiwit Lake'],
    meadows: ['the open ridgelines along the Greenstone Ridge', 'meadows near Windigo'],
    forests: ['the boreal forests along interior trails', 'the spruce-fir forests'],
    features: ['Rock Harbor area', 'the Greenstone Ridge', 'Windigo area'],
    roads: null,
    shoreline: ['the Lake Superior shoreline near Rock Harbor', 'the rocky coves'],
    desert: null, alpine: null,
    eco: 'boreal-island',
  },
  greatsmokymountains: {
    waters: ['mountain streams along the trails', 'Little River Road area', 'Abrams Creek'],
    meadows: ['Cades Cove', 'Cataloochee Valley', 'the grassy balds at high elevation'],
    forests: ['the old-growth forests along Roaring Fork', 'the spruce-fir forests at Clingmans Dome'],
    features: ['Cades Cove', 'Newfound Gap Road', 'Clingmans Dome'],
    roads: ['Cades Cove Loop Road', 'Newfound Gap Road', 'Little River Road'],
    shoreline: null, desert: null,
    alpine: ['the high-elevation spruce-fir zone near Clingmans Dome'],
    eco: 'appalachian-cove-forest',
  },
  biscayne: {
    waters: ['the shallow bay waters', 'the mangrove channels along the shore'],
    meadows: null,
    forests: ['the hardwood hammock on Elliott Key', 'the mangrove forests along the coast'],
    features: ['Elliott Key', 'Adams Key', 'the coral reefs offshore', 'Boca Chita Key'],
    roads: null,
    shoreline: ['the shoreline near Convoy Point', 'the mangrove-lined coast', 'the bay side of Elliott Key'],
    desert: null, alpine: null,
    eco: 'subtropical-marine',
  },
  drytortugas: {
    waters: ['the crystal-clear waters around Garden Key', 'the moat around Fort Jefferson'],
    meadows: null,
    forests: null,
    features: ['Fort Jefferson', 'Bush Key (bird nesting island)', 'the coral reefs', 'Garden Key'],
    roads: null,
    shoreline: ['the beaches around Fort Jefferson', 'the seawall of the fort', 'the shallow reef flats'],
    desert: null, alpine: null,
    eco: 'tropical-island',
  },
  congaree: {
    waters: ['Cedar Creek', 'Congaree River floodplain', 'the swamp waterways'],
    meadows: null,
    forests: ['the old-growth bottomland hardwood forest', 'the boardwalk loop trail through the floodplain'],
    features: ['the Boardwalk Loop', 'the champion trees', 'Weston Lake'],
    roads: ['the entrance road near the visitor center'],
    shoreline: null, desert: null, alpine: null,
    eco: 'bottomland-swamp',
  },
  mammothcave: {
    waters: ['the Green River corridor', 'cave streams and springs', 'Turnhole Bend'],
    meadows: ['the open fields near the visitor center', 'forest clearings along surface trails'],
    forests: ['the mixed hardwood forests along surface trails', 'the cedar glades'],
    features: ['the cave entrance area', 'the Historic Entrance', 'the Green River valley'],
    roads: ['the park roads through the forest'],
    shoreline: null, desert: null, alpine: null,
    eco: 'karst-forest',
  },
  voyageurs: {
    waters: ['Rainy Lake', 'Kabetogama Lake', 'Namakan Lake', 'the interconnected lake system'],
    meadows: ['the open areas on the Kabetogama Peninsula', 'beaver meadows'],
    forests: ['the boreal forest on the Kabetogama Peninsula', 'shoreline forests'],
    features: ['the lake shorelines accessible by boat', 'Ellsworth Rock Gardens', 'the beaver ponds'],
    roads: null,
    shoreline: ['the lake shorelines', 'rocky islands'],
    desert: null, alpine: null,
    eco: 'boreal-lake',
  },
  indianadunes: {
    waters: ['the interdunal ponds', 'the Great Marsh', 'inland wetlands'],
    meadows: ['the dune grasslands', 'the open prairie areas', 'the oak savanna'],
    forests: ['the wooded dune and swale areas', 'the forests behind the dunes'],
    features: ['the Lake Michigan shoreline', 'Miller Woods', 'West Beach dunes'],
    roads: ['the roads connecting beach areas'],
    shoreline: ['the Lake Michigan beach areas', 'the shoreline along West Beach'],
    desert: null, alpine: null,
    eco: 'great-lakes-dunes',
  },
  badlands: {
    waters: ['seasonal streams in the draws', 'stock ponds in the grasslands'],
    meadows: ['the mixed-grass prairie', 'the open grasslands along the Loop Road', 'Roberts Prairie Dog Town'],
    forests: null,
    features: ['the eroded buttes and pinnacles', 'Roberts Prairie Dog Town', 'the Badlands Wall'],
    roads: ['the Badlands Loop Road', 'the Sage Creek Rim Road'],
    shoreline: null,
    desert: ['the barren badlands formations', 'the semi-arid buttes'],
    alpine: null,
    eco: 'prairie-badlands',
  },
  windcave: {
    waters: ['seasonal springs and small creeks', 'Highland Creek'],
    meadows: ['the open prairie grasslands', 'the mixed-grass prairies in the eastern section'],
    forests: ['the ponderosa pine forests', 'the transition zone between prairie and forest'],
    features: ['the cave entrance area', 'the prairie-forest ecotone', 'the elk meadows'],
    roads: ['the park roads through the prairie'],
    shoreline: null, desert: null, alpine: null,
    eco: 'prairie-pine',
  },
  theodoreroosevelt: {
    waters: ['the Little Missouri River', 'streams cutting through the badlands'],
    meadows: ['the open grasslands and plateaus', 'river bottom meadows'],
    forests: ['cottonwood groves along the river', 'juniper woodlands on the ridges'],
    features: ['the badlands formations', 'the Painted Canyon overlook', 'the prairie dog towns'],
    roads: ['the Scenic Loop Drive in the South Unit', 'the Scenic Drive in the North Unit'],
    shoreline: null,
    desert: ['the eroded badlands terrain'],
    alpine: null,
    eco: 'northern-badlands',
  },
  gatewayarch: {
    waters: ['the Mississippi River riverfront', 'flood pools along the river'],
    meadows: ['the park grounds and open green spaces'],
    forests: ['the riparian woodland along the river', 'scattered trees on the grounds'],
    features: ['the Gateway Arch grounds', 'the Mississippi River overlook'],
    roads: null,
    shoreline: ['the Mississippi River bank'],
    desert: null, alpine: null,
    eco: 'urban-riverfront',
  },
  grandcanyon: {
    waters: ['the Colorado River corridor', 'seasonal seeps and springs on the canyon walls'],
    meadows: ['the ponderosa meadows along the rim', 'the meadows near the South Rim visitor area'],
    forests: ['the ponderosa and pinyon-juniper forests along the rim', 'North Rim spruce-fir forests'],
    features: ['the South Rim overlooks', 'the North Rim', 'Bright Angel Trail area', 'the inner canyon'],
    roads: ['Hermit Road', 'Desert View Drive'],
    shoreline: null,
    desert: ['the arid inner canyon', 'the desert scrub below the rim'],
    alpine: ['the North Rim at 8,000+ feet'],
    eco: 'canyon-desert',
  },
  zion: {
    waters: ['the Virgin River corridor', 'the Emerald Pools area', 'hanging gardens and seeps'],
    meadows: ['the open areas near the visitor center', 'Kolob Terrace meadows'],
    forests: ['the cottonwood groves along the Virgin River', 'the pinyon-juniper woodlands on the plateaus'],
    features: ['Zion Canyon floor', 'the shuttle stops along the scenic drive', 'the Watchman area'],
    roads: ['the Zion Canyon Scenic Drive (shuttle required)', 'the Kolob Terrace Road'],
    shoreline: null,
    desert: ['the arid upper canyon walls', 'the slickrock zones'],
    alpine: null,
    eco: 'desert-canyon',
  },
  brycecanyon: {
    waters: ['seasonal streams in the canyon', 'small springs in the hoodoo formations'],
    meadows: ['the meadows along the rim', 'open areas near Rainbow Point'],
    forests: ['the ponderosa and bristlecone pine forests along the rim', 'the Douglas fir in the canyon'],
    features: ['the Bryce Amphitheater', 'Sunset Point', 'the hoodoo formations'],
    roads: ['the main park road along the rim'],
    shoreline: null,
    desert: ['the semi-arid canyon terrain'],
    alpine: ['the high-elevation forests near Rainbow Point at 9,100 feet'],
    eco: 'high-desert-plateau',
  },
  arches: {
    waters: ['seasonal pools and potholes after rain', 'Courthouse Wash'],
    meadows: null,
    forests: null,
    features: ['the Windows Section', 'Devils Garden area', 'Delicate Arch viewpoint area'],
    roads: ['the main park road', 'the Devils Garden Road'],
    shoreline: null,
    desert: ['the slickrock desert', 'the sandy desert scrub throughout the park', 'cryptobiotic soil areas'],
    alpine: null,
    eco: 'high-desert',
  },
  canyonlands: {
    waters: ['the Green and Colorado River corridors', 'seasonal potholes and pools'],
    meadows: ['the open areas along the mesa tops', 'grasslands in the Needles District'],
    forests: null,
    features: ['Island in the Sky overlooks', 'the Needles District', 'Grand View Point'],
    roads: ['the Island in the Sky scenic road', 'the Needles District road'],
    shoreline: null,
    desert: ['the vast desert mesa landscape', 'the canyon rim areas', 'the desert scrub throughout'],
    alpine: null,
    eco: 'canyon-desert',
  },
  capitolreef: {
    waters: ['the Fremont River corridor', 'seasonal washes', 'Sulphur Creek'],
    meadows: ['the orchards near the visitor center', 'the open areas along the Scenic Drive'],
    forests: ['the cottonwood gallery forest along the Fremont River', 'pinyon-juniper woodlands'],
    features: ['the Waterpocket Fold', 'the historic orchards', 'Capitol Dome area'],
    roads: ['the Scenic Drive', 'Highway 24 through the park'],
    shoreline: null,
    desert: ['the desert terrain along the Waterpocket Fold', 'the sandstone cliffs'],
    alpine: null,
    eco: 'desert-riparian',
  },
  mesaverde: {
    waters: ['seasonal springs and seeps', 'small streams in the canyons'],
    meadows: ['the open mesa top areas', 'the parkland between canyon rims'],
    forests: ['the pinyon-juniper forests on the mesa top', 'the Douglas fir in sheltered canyons'],
    features: ['the cliff dwellings', 'the mesa top sites', 'Park Point overlook'],
    roads: ['the park entrance road and mesa top loops'],
    shoreline: null,
    desert: ['the semi-arid mesa terrain'],
    alpine: null,
    eco: 'mesa-woodland',
  },
  petrifiedforest: {
    waters: ['the Puerco River (often dry)', 'seasonal washes and playas'],
    meadows: ['the grasslands in the southern section', 'the open shortgrass prairie'],
    forests: null,
    features: ['the Painted Desert', 'the petrified wood concentrations', 'Blue Mesa'],
    roads: ['the main park road between the two entrances'],
    shoreline: null,
    desert: ['the Painted Desert badlands', 'the arid grassland-desert transition'],
    alpine: null,
    eco: 'painted-desert',
  },
  saguaro: {
    waters: ['seasonal washes and arroyos', 'desert springs and tinajas'],
    meadows: null,
    forests: ['the saguaro forests throughout', 'the oak-pine forests at higher elevations in the Rincons'],
    features: ['the saguaro forests', 'the Rincon Mountain District', 'the Tucson Mountain District'],
    roads: ['the Cactus Forest Scenic Drive (east)', 'the Bajada Loop Drive (west)'],
    shoreline: null,
    desert: ['the Sonoran Desert throughout', 'the saguaro-studded bajadas'],
    alpine: null,
    eco: 'sonoran-desert',
  },
  whitesands: {
    waters: ['seasonal pools after rain', 'the edges of the gypsum flats'],
    meadows: ['the desert grasslands at the park edges', 'the transitional zone between dunes and desert'],
    forests: null,
    features: ['the white gypsum dune fields', 'the Interdune Boardwalk', 'the Dune Life Nature Trail'],
    roads: ['Dunes Drive into the heart of the dune field'],
    shoreline: null,
    desert: ['the white gypsum dunes', 'the Chihuahuan Desert margins'],
    alpine: null,
    eco: 'gypsum-desert',
  },
  guadalupemountains: {
    waters: ['Smith Spring', 'McKittrick Canyon stream', 'seasonal canyon springs'],
    meadows: ['the salt flats basin', 'the grasslands near the Pine Springs area'],
    forests: ['the relict conifer forest at the summit', 'the deciduous forest in McKittrick Canyon'],
    features: ['El Capitan', 'Guadalupe Peak', 'McKittrick Canyon'],
    roads: ['the access road to Pine Springs'],
    shoreline: null,
    desert: ['the Chihuahuan Desert lowlands', 'the arid canyon approaches'],
    alpine: ['the forested summit area above 7,000 feet'],
    eco: 'desert-mountain',
  },
  bigbend: {
    waters: ['the Rio Grande river corridor', 'seasonal springs in the Chisos', 'Hot Springs area'],
    meadows: ['the grasslands of the Chisos Basin', 'the open desert flats'],
    forests: ['the oak-juniper woodlands of the Chisos Mountains', 'cottonwoods along the Rio Grande'],
    features: ['Santa Elena Canyon', 'the Chisos Basin', 'the Rio Grande Village area'],
    roads: ['the Ross Maxwell Scenic Drive', 'the road to Rio Grande Village'],
    shoreline: null,
    desert: ['the Chihuahuan Desert floor', 'the desert bajadas and washes'],
    alpine: ['the Chisos Mountains above 5,000 feet'],
    eco: 'chihuahuan-desert',
  },
  grandteton: {
    waters: ['the Snake River corridor', 'Jenny Lake', 'Jackson Lake', 'Schwabacher Landing'],
    meadows: ['the sagebrush flats along the main road', 'Antelope Flats', 'the meadows near Moose'],
    forests: ['the conifer forests at the base of the Tetons', 'cottonwood groves along the Snake River'],
    features: ['the Teton Range', 'Oxbow Bend', 'Schwabacher Landing'],
    roads: ['Teton Park Road', 'the Moose-Wilson Road'],
    shoreline: ['the lake shores of Jenny Lake and Jackson Lake'],
    desert: null,
    alpine: ['the alpine areas above treeline on the Teton Range'],
    eco: 'mountain-valley',
  },
  rockymountain: {
    waters: ['Bear Lake', 'Sprague Lake', 'the Colorado River headwaters', 'mountain streams'],
    meadows: ['the montane meadows in Moraine Park', 'Horseshoe Park', 'the tundra along Trail Ridge Road'],
    forests: ['the subalpine forests below treeline', 'the montane zone along Bear Lake Road'],
    features: ['Trail Ridge Road', 'the alpine tundra', 'Moraine Park'],
    roads: ['Trail Ridge Road', 'Bear Lake Road', 'Old Fall River Road'],
    shoreline: null, desert: null,
    alpine: ['the alpine tundra above 11,500 feet along Trail Ridge Road'],
    eco: 'alpine-montane',
  },
  glacier: {
    waters: ['Lake McDonald', 'St. Mary Lake', 'mountain streams and waterfalls', 'Many Glacier lake shore'],
    meadows: ['the alpine meadows at Logan Pass', 'the meadows along Many Glacier Road'],
    forests: ['the cedar-hemlock forests along Lake McDonald', 'the subalpine forests'],
    features: ['Going-to-the-Sun Road', 'Logan Pass', 'Many Glacier area'],
    roads: ['Going-to-the-Sun Road', 'Many Glacier Road'],
    shoreline: ['the lake shores of McDonald and St. Mary'],
    desert: null,
    alpine: ['the alpine areas at Logan Pass and along the Continental Divide'],
    eco: 'northern-rockies',
  },
  greatsanddunes: {
    waters: ['Medano Creek (seasonal)', 'Sand Creek', 'the wetland areas along the creek'],
    meadows: ['the grasslands and shrublands around the dune field', 'the San Luis Valley floor'],
    forests: ['the montane forests on the Sangre de Cristo slopes', 'the cottonwood groves near the creek'],
    features: ['the dune field', 'Medano Creek', 'the Sangre de Cristo Mountains backdrop'],
    roads: ['the park entrance road', 'the Medano Pass road'],
    shoreline: null,
    desert: ['the sand dunes and surrounding arid grasslands'],
    alpine: ['the Sangre de Cristo mountain slopes above treeline'],
    eco: 'dune-grassland',
  },
  blackcanyon: {
    waters: ['the Gunnison River far below', 'seasonal streams on the rim'],
    meadows: ['the scrub oak openings along the rim', 'the open areas near overlooks'],
    forests: ['the Gambel oak and serviceberry thickets along the rim', 'the mixed forest along the rim road'],
    features: ['the Painted Wall', 'the South Rim overlooks', 'the canyon rim trail'],
    roads: ['the South Rim Road'],
    shoreline: null,
    desert: ['the inner canyon walls'],
    alpine: null,
    eco: 'canyon-rim',
  },
  olympic: {
    waters: ['the Hoh River', 'Sol Duc River', 'Lake Crescent', 'mountain streams'],
    meadows: ['the subalpine meadows at Hurricane Ridge', 'the open areas along rivers'],
    forests: ['the Hoh Rain Forest', 'the Quinault Rain Forest', 'the temperate old-growth forests'],
    features: ['Hurricane Ridge', 'the Hoh Rain Forest', 'Rialto Beach', 'the hot springs area'],
    roads: ['Hurricane Ridge Road', 'the road to Hoh Rain Forest'],
    shoreline: ['Rialto Beach', 'Ruby Beach', 'the Olympic coast tide pools'],
    desert: null,
    alpine: ['the subalpine zone at Hurricane Ridge'],
    eco: 'temperate-rainforest',
  },
  northcascades: {
    waters: ['Ross Lake', 'Diablo Lake', 'the Skagit River corridor', 'mountain creeks'],
    meadows: ['the subalpine meadows above treeline', 'open areas along river valleys'],
    forests: ['the old-growth forests in the valleys', 'the western red cedar forests'],
    features: ['the Cascades mountain scenery', 'Diablo Lake overlook', 'the Skagit Valley'],
    roads: ['the North Cascades Highway (Hwy 20)'],
    shoreline: ['the lake shores of Ross and Diablo Lakes'],
    desert: null,
    alpine: ['the alpine areas above treeline'],
    eco: 'cascade-mountain',
  },
  mountrainier: {
    waters: ['the glacial rivers', 'Christine Falls area', 'Narada Falls', 'mountain streams'],
    meadows: ['the wildflower meadows at Paradise', 'Sunrise meadows', 'the subalpine areas'],
    forests: ['the old-growth forests along the Trail of the Patriarchs', 'the lower elevation forests'],
    features: ['Paradise area', 'Sunrise area', 'Mount Rainier itself'],
    roads: ['the road to Paradise', 'the Sunrise Road'],
    shoreline: null, desert: null,
    alpine: ['the subalpine and alpine areas at Paradise and Sunrise'],
    eco: 'cascade-volcanic',
  },
  craterlake: {
    waters: ['Crater Lake itself', 'Annie Creek', 'the Cleetwood Cove shore'],
    meadows: ['the pumice flats and open areas along the rim', 'wildflower meadows in summer'],
    forests: ['the mountain hemlock and whitebark pine forests along the rim', 'the old-growth forests'],
    features: ['the Rim Drive', 'Wizard Island', 'the Pinnacles overlook'],
    roads: ['the Rim Drive (seasonal)'],
    shoreline: ['the lakeshore at Cleetwood Cove'],
    desert: null,
    alpine: ['the high-elevation rim at 7,000+ feet'],
    eco: 'cascade-volcanic-lake',
  },
  redwood: {
    waters: ['Redwood Creek', 'the Smith River', 'Fern Canyon creek', 'coastal streams'],
    meadows: ['the prairies along Bald Hills Road', 'the elk meadows at Elk Prairie'],
    forests: ['the old-growth redwood groves', 'Stout Memorial Grove', 'Fern Canyon'],
    features: ['the redwood groves', 'Fern Canyon', 'the Bald Hills prairies'],
    roads: ['Newton B. Drury Scenic Parkway', 'Howland Hill Road'],
    shoreline: ['Gold Bluffs Beach', 'the coastal areas'],
    desert: null, alpine: null,
    eco: 'coastal-redwood',
  },
  lassenvolcanic: {
    waters: ['Manzanita Lake', 'Lake Helen', 'Hat Creek', 'hydrothermal areas'],
    meadows: ['the meadows at Kings Creek', 'the open areas around Manzanita Lake'],
    forests: ['the mixed conifer forests', 'the red fir forests at mid-elevation'],
    features: ['Bumpass Hell', 'Lassen Peak', 'Manzanita Lake', 'the Devastated Area'],
    roads: ['the main park highway'],
    shoreline: ['the shores of Manzanita Lake'],
    desert: null,
    alpine: ['the high terrain around Lassen Peak'],
    eco: 'cascade-volcanic',
  },
  yosemite: {
    waters: ['the Merced River through the valley', 'Yosemite Falls area', 'Tenaya Lake', 'Tuolumne River'],
    meadows: ['the valley floor meadows', 'Tuolumne Meadows', 'Cook\'s Meadow and Sentinel Meadow'],
    forests: ['the mixed conifer forests on the valley walls', 'the giant sequoia groves'],
    features: ['Yosemite Valley', 'Glacier Point', 'Tuolumne Meadows', 'Mariposa Grove'],
    roads: ['the Valley Loop Road', 'Tioga Road (seasonal)', 'Glacier Point Road'],
    shoreline: null, desert: null,
    alpine: ['the high country along Tioga Road above 8,000 feet'],
    eco: 'sierra-montane',
  },
  kingscanyon: {
    waters: ['the Kings River', 'canyon streams', 'Roaring River'],
    meadows: ['Zumwalt Meadow along the Kings River', 'the meadows in Cedar Grove'],
    forests: ['the giant sequoia groves', 'the mixed conifer forests at Grant Grove', 'Cedar Grove forests'],
    features: ['the Kings Canyon itself', 'Grant Grove', 'Cedar Grove area'],
    roads: ['the Kings Canyon Scenic Byway', 'the Generals Highway'],
    shoreline: null, desert: null,
    alpine: ['the high backcountry above treeline'],
    eco: 'sierra-montane',
  },
  sequoia: {
    waters: ['the Kaweah River', 'Marble Fork', 'mountain streams'],
    meadows: ['Crescent Meadow', 'the meadows near Giant Forest'],
    forests: ['the Giant Forest sequoia groves', 'the mixed conifer forests'],
    features: ['the General Sherman Tree area', 'Moro Rock', 'Crescent Meadow'],
    roads: ['the Generals Highway'],
    shoreline: null, desert: null,
    alpine: ['the high Sierra above 9,000 feet'],
    eco: 'sierra-montane',
  },
  joshuatree: {
    waters: ['Barker Dam area (seasonal)', 'oasis areas', 'seasonal desert washes'],
    meadows: null,
    forests: ['the Joshua tree forests in the higher Mojave section', 'pinyon-juniper woodlands'],
    features: ['the rock formations', 'Hidden Valley', 'Keys View', 'Cholla Cactus Garden'],
    roads: ['the park boulevard between the west and north entrances'],
    shoreline: null,
    desert: ['the Mojave and Colorado Desert landscapes', 'the boulder fields', 'the bajadas'],
    alpine: null,
    eco: 'mojave-desert',
  },
  deathvalley: {
    waters: ['Badwater Basin (seasonal)', 'Salt Creek', 'desert springs and seeps', 'Furnace Creek area'],
    meadows: null,
    forests: null,
    features: ['Badwater Basin', 'the sand dunes at Mesquite Flat', 'Zabriskie Point', 'the alluvial fans'],
    roads: ['the main park roads', 'Artists Drive'],
    shoreline: null,
    desert: ['the vast desert floor', 'the salt flats', 'the alluvial fans and canyons'],
    alpine: ['Telescope Peak area at 11,000 feet'],
    eco: 'extreme-desert',
  },
  channelislands: {
    waters: ['the kelp forests offshore', 'the channel waters between islands'],
    meadows: ['the coastal grasslands on the island plateaus', 'the open areas above sea cliffs'],
    forests: ['the island oak groves', 'the remnant pine forests on Santa Cruz'],
    features: ['the sea caves', 'Painted Cave', 'the island fox habitat', 'Anacapa Island'],
    roads: null,
    shoreline: ['the rocky shorelines', 'the tidepools', 'the beaches on Santa Cruz Island'],
    desert: null, alpine: null,
    eco: 'island-marine',
  },
  pinnacles: {
    waters: ['Bear Creek', 'seasonal springs in the canyons', 'the reservoir'],
    meadows: ['the open chaparral areas', 'the grasslands near the east entrance'],
    forests: ['the oak woodlands in the valleys', 'the chaparral on the hillsides'],
    features: ['the rock spires and talus caves', 'the Bear Gulch cave system', 'the High Peaks'],
    roads: ['the east and west entrance roads'],
    shoreline: null,
    desert: ['the dry chaparral hillsides in summer'],
    alpine: null,
    eco: 'california-chaparral',
  },
  kenaifjords: {
    waters: ['Resurrection Bay', 'the tidewater glaciers', 'Exit Glacier area streams'],
    meadows: ['the recently deglaciated areas near Exit Glacier', 'the early-succession meadows'],
    forests: ['the coastal spruce-hemlock forests near Exit Glacier', 'the boreal forests'],
    features: ['Exit Glacier', 'the Harding Icefield', 'Resurrection Bay'],
    roads: ['the Exit Glacier Road'],
    shoreline: ['Resurrection Bay shoreline', 'the rocky coastline accessible by boat'],
    desert: null,
    alpine: ['the Harding Icefield area'],
    eco: 'coastal-glacial',
  },
  glacierbay: {
    waters: ['the tidewater glaciers', 'Glacier Bay itself', 'Bartlett Cove area'],
    meadows: ['the recently deglaciated terrain', 'meadows near Bartlett Cove'],
    forests: ['the spruce-hemlock forests at Bartlett Cove', 'early-succession alder thickets'],
    features: ['the tidewater glaciers', 'Bartlett Cove', 'Margerie Glacier'],
    roads: null,
    shoreline: ['Bartlett Cove shoreline', 'the bay coastline accessible by boat tour'],
    desert: null,
    alpine: ['the icefields and high mountain areas'],
    eco: 'coastal-glacial',
  },
  katmai: {
    waters: ['Brooks Falls (salmon run)', 'Naknek Lake', 'the Brooks River', 'the Bay of Islands'],
    meadows: ['the tundra meadows', 'the open areas along the rivers', 'the Valley of Ten Thousand Smokes'],
    forests: ['the spruce forests near Brooks Camp', 'the alder thickets along rivers'],
    features: ['Brooks Falls', 'the Valley of Ten Thousand Smokes', 'Brooks Camp'],
    roads: null,
    shoreline: ['Naknek Lake shore', 'the coastal areas'],
    desert: null,
    alpine: ['the volcanic highlands'],
    eco: 'subarctic-volcanic',
  },
  wrangellstelias: {
    waters: ['the Copper River', 'glacial rivers and streams', 'mountain lakes'],
    meadows: ['the tundra meadows above treeline', 'the river valley grasslands'],
    forests: ['the boreal spruce forests in the valleys', 'the riparian areas along rivers'],
    features: ['the massive glaciers', 'the Wrangell and St. Elias mountain ranges', 'Kennecott Mine area'],
    roads: ['the McCarthy Road'],
    shoreline: null, desert: null,
    alpine: ['the vast alpine and glacial areas'],
    eco: 'subarctic-mountain',
  },
  lakeclark: {
    waters: ['Lake Clark', 'the coastal bays', 'salmon streams', 'Crescent Lake'],
    meadows: ['the tundra meadows', 'the open areas along the lakeshore'],
    forests: ['the boreal forests along the lake', 'the spruce-birch forests'],
    features: ['Lake Clark', 'the volcanic peaks', 'the coastal bear viewing areas'],
    roads: null,
    shoreline: ['the lake shores', 'the Cook Inlet coast'],
    desert: null,
    alpine: ['the volcanic peaks and high tundra'],
    eco: 'subarctic-lake',
  },
  gatesofthearctic: {
    waters: ['the Kobuk and Alatna Rivers', 'tundra lakes and ponds', 'mountain streams'],
    meadows: ['the vast tundra expanses', 'the open valleys between the Brooks Range peaks'],
    forests: ['the sparse boreal forests in the southern valleys'],
    features: ['the Brooks Range', 'the Arctic Divide', 'the remote wilderness'],
    roads: null,
    shoreline: null, desert: null,
    alpine: ['the arctic-alpine terrain of the Brooks Range'],
    eco: 'arctic-mountain',
  },
  kobukvalley: {
    waters: ['the Kobuk River', 'tundra lakes and oxbow ponds', 'the Salmon River'],
    meadows: ['the tundra meadows and wetlands', 'the boreal-tundra transition zone'],
    forests: ['the boreal spruce forest along the Kobuk River'],
    features: ['the Great Kobuk Sand Dunes', 'the Kobuk River corridor', 'the caribou migration route'],
    roads: null,
    shoreline: null, desert: null,
    alpine: ['the Baird Mountains'],
    eco: 'arctic-tundra',
  },
  hawaiivolcanoes: {
    waters: ['ocean entry areas', 'rain forest streams'],
    meadows: ['the open volcanic terrain', 'the grasslands near Kilauea'],
    forests: ['the native ohia lehua rain forest', 'the tree fern forests along Crater Rim Trail'],
    features: ['Kilauea caldera', 'the Thurston Lava Tube', 'Chain of Craters Road'],
    roads: ['Crater Rim Drive', 'Chain of Craters Road'],
    shoreline: ['the volcanic coast where lava meets the ocean'],
    desert: ['the Kau Desert area'],
    alpine: ['the summit area of Mauna Loa'],
    eco: 'tropical-volcanic',
  },
  haleakala: {
    waters: ['mountain streams in the Kipahulu area', 'the pools along the Pipiwai Trail'],
    meadows: ['the shrubland in the crater', 'the open volcanic landscape at the summit'],
    forests: ['the bamboo and tropical forests in the Kipahulu District', 'native shrubland'],
    features: ['the Haleakala crater', 'the summit area above 10,000 feet', 'the Kipahulu District'],
    roads: ['the Haleakala Highway to the summit'],
    shoreline: ['the coast near Kipahulu'],
    desert: ['the barren volcanic crater floor'],
    alpine: ['the high alpine summit zone above 9,000 feet'],
    eco: 'tropical-volcanic',
  },
  americansamoa: {
    waters: ['the coral reef flats', 'the lagoon areas', 'offshore waters'],
    meadows: null,
    forests: ['the tropical rainforest on Tutuila', 'the cloud forest on Ta\'u'],
    features: ['the coral reefs', 'the tropical forest trails', 'the coastal villages'],
    roads: null,
    shoreline: ['the reef-fringed coast', 'the rocky shoreline'],
    desert: null, alpine: null,
    eco: 'tropical-pacific',
  },
  virginislands: {
    waters: ['Trunk Bay', 'the coral reef areas', 'Leinster Bay'],
    meadows: null,
    forests: ['the dry tropical forest', 'the moist forest on the ridges'],
    features: ['the underwater snorkel trail at Trunk Bay', 'the ruins and historic sites'],
    roads: ['North Shore Road'],
    shoreline: ['the beaches', 'the rocky headlands', 'the mangrove areas'],
    desert: null, alpine: null,
    eco: 'caribbean-tropical',
  },
  hotsprings: {
    waters: ['the hot springs and thermal waters', 'the mountain streams', 'Gulpha Creek'],
    meadows: ['the open areas along the Grand Promenade', 'the clearings on the mountain trails'],
    forests: ['the hardwood forests on Hot Springs Mountain', 'the oak-hickory forests on the trails'],
    features: ['Bathhouse Row', 'the hot spring cascades', 'Hot Springs Mountain Tower'],
    roads: ['the mountain drives'],
    shoreline: null, desert: null, alpine: null,
    eco: 'ouachita-thermal',
  },
  carlsbadcaverns: {
    waters: ['Rattlesnake Springs (a desert oasis)', 'seasonal washes in the canyons'],
    meadows: ['the desert grasslands along the park roads', 'the Chihuahuan Desert floor'],
    forests: null,
    features: ['the cave entrance at dusk (bat flight)', 'Rattlesnake Springs', 'the desert canyon country'],
    roads: ['the scenic loop road', 'the road to Rattlesnake Springs'],
    shoreline: null,
    desert: ['the Chihuahuan Desert terrain', 'the rocky limestone canyons'],
    alpine: null,
    eco: 'chihuahuan-desert-cave',
  },
  greatbasin: {
    waters: ['Lehman Creek', 'Baker Creek', 'mountain springs'],
    meadows: ['the sagebrush flats at the base', 'the alpine meadows near the treeline'],
    forests: ['the bristlecone pine groves', 'the pinyon-juniper woodlands at mid-elevation'],
    features: ['Lehman Caves', 'Wheeler Peak', 'the bristlecone pine grove'],
    roads: ['Wheeler Peak Scenic Drive'],
    shoreline: null,
    desert: ['the Great Basin sagebrush desert at the base'],
    alpine: ['the alpine zone on Wheeler Peak above 10,000 feet'],
    eco: 'basin-range',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ANIMAL BEHAVIOR TEMPLATES
// ══════════════════════════════════════════════════════════════════════════════

// Time of day by animal type / name
function getBestTime(name, animalType) {
  const n = name.toLowerCase();
  // Nocturnal
  if (/\b(owl|nighthawk|nightjar|whip-poor-will|poorwill|bat|flying squirrel|ringtail|raccoon|skunk|moth|luna moth|sphinx moth|firefly|salamander)\b/.test(n)) return 'dusk and after dark';
  if (/\b(cottontail|jackrabbit|hare|fox|coyote|bobcat|lynx|mountain lion|cougar|puma)\b/.test(n)) return 'dawn and dusk';
  // Crepuscular / dawn-dusk
  if (/\b(deer|elk|moose|bear|bison|pronghorn|bighorn|sheep|goat|javelina|peccary)\b/.test(n)) return 'early morning and late afternoon';
  if (/\b(crane|heron|egret|ibis|bittern)\b/.test(n)) return 'early morning';
  if (/\b(hawk|eagle|falcon|osprey|vulture|kite|condor)\b/.test(n)) return 'mid-morning when thermals develop';
  if (/\b(turtle|tortoise|cooter|slider)\b/.test(n)) return 'mid-morning when they bask in sun';
  if (/\b(snake|rattlesnake|copperhead|cottonmouth|racer|kingsnake|garter)\b/.test(n)) return 'mid-morning when they bask, or warm evenings';
  if (/\b(lizard|anole|skink|gecko|iguana|whiptail)\b/.test(n)) return 'mid-morning and early afternoon when they bask';
  if (/\b(frog|toad|treefrog|peeper)\b/.test(n)) return 'evening and after rain';
  if (/\b(butterfly|swallowtail|monarch|admiral|skipper|fritillary|painted lady|buckeye|hairstreak|sulphur|copper|blue|white|peacock)\b/.test(n)) return 'warm sunny mornings';
  if (/\b(dragonfly|damselfly|darner|skimmer|pennant|pondhawk|dasher)\b/.test(n)) return 'sunny midday';
  if (/\b(bee|bumble|wasp|beetle|grasshopper|cricket|katydid|weevil|lanternfly)\b/.test(n)) return 'warm afternoons';
  if (/\b(whale|dolphin|porpoise|seal|sea lion|otter|manatee|ray)\b/.test(n)) return 'early to mid-morning when waters are calm';
  if (/\b(pelican|cormorant|anhinga|gannet|booby|frigate|puffin)\b/.test(n)) return 'early morning';
  if (/\b(warbler|vireo|tanager|oriole|grosbeak|bunting)\b/.test(n)) return 'early morning when they are most vocal';
  if (/\b(woodpecker|sapsucker|flicker)\b/.test(n)) return 'morning hours';
  if (/\b(wren|nuthatch|chickadee|titmouse|creeper|kinglet)\b/.test(n)) return 'morning hours';
  if (/\b(sparrow|finch|junco|towhee|thrush|robin|bluebird)\b/.test(n)) return 'early morning';
  if (/\b(gull|tern|plover|sandpiper|godwit|curlew|willet|turnstone|dunlin|sanderling)\b/.test(n)) return 'morning or at low tide';
  if (/\b(goose|duck|teal|wigeon|shoveler|pintail|merganser|goldeneye|bufflehead|scoter|scaup|loon|grebe)\b/.test(n)) return 'early morning';
  if (/\b(squirrel|chipmunk|marmot|pika|prairie dog)\b/.test(n)) return 'morning';
  if (animalType === 'bird') return 'early morning when bird activity peaks';
  if (animalType === 'mammal') return 'early morning or late afternoon';
  if (animalType === 'reptile') return 'warm mid-morning';
  if (animalType === 'amphibian') return 'evening or after rain';
  if (animalType === 'insect') return 'warm sunny periods';
  if (animalType === 'marine') return 'morning when conditions are calmest';
  return 'early morning';
}

// Where to look by animal type / name + park profile
function getHabitat(name, animalType, profile) {
  const n = name.toLowerCase();

  // Water-associated animals
  if (/\b(otter|beaver|muskrat|mink|manatee|alligator|crocodile|gar|cichlid|trout|bass|catfish)\b/.test(n)) return profile.waters?.[0] ?? 'near water sources';
  if (/\b(heron|egret|ibis|bittern|anhinga|cormorant|pelican|kingfisher|crane|stork|spoonbill)\b/.test(n)) return profile.waters?.[0] ?? profile.shoreline?.[0] ?? 'near water';
  if (/\b(duck|goose|teal|wigeon|shoveler|pintail|merganser|goldeneye|bufflehead|scoter|scaup|coot|moorhen|gallinule|grebe|loon)\b/.test(n)) return profile.waters?.[1] ?? profile.waters?.[0] ?? 'on lakes and ponds';
  if (/\b(turtle|cooter|slider|softshell)\b/.test(n)) return profile.waters?.[0] ?? 'near ponds and streams';
  if (/\b(frog|toad|treefrog|peeper|salamander|newt)\b/.test(n)) return profile.waters?.[2] ?? profile.forests?.[0] ?? 'in moist areas near streams';
  if (/\b(dragonfly|damselfly|darner|skimmer|pennant|pondhawk|dasher)\b/.test(n)) return profile.waters?.[0] ?? 'near ponds and wet areas';

  // Marine animals
  if (/\b(whale|dolphin|porpoise)\b/.test(n)) return profile.shoreline?.[0] ?? 'from elevated headlands and shoreline overlooks';
  if (/\b(sea lion|seal|fur seal|walrus)\b/.test(n)) return profile.shoreline?.[0] ?? 'on rocky haul-out beaches and offshore rocks';
  if (/\b(sea turtle|loggerhead|leatherback|green turtle|hawksbill)\b/.test(n)) return profile.shoreline?.[0] ?? 'along sandy beaches and nearshore waters';
  if (/\b(manatee)\b/.test(n)) return profile.waters?.[0] ?? profile.shoreline?.[0] ?? 'in warm, shallow coastal waters and spring-fed rivers';
  if (/\b(shark|ray|skate)\b/.test(n)) return profile.shoreline?.[0] ?? 'in shallow coastal waters — scan from piers and overlooks';
  if (/\b(crab|lobster|shrimp|barnacle)\b/.test(n)) return profile.shoreline?.[0] ?? 'in tidal pools and along rocky shoreline at low tide';
  if (/\b(starfish|sea star|urchin|anemone|coral|jellyfish)\b/.test(n)) return profile.shoreline?.[0] ?? 'in tidal pools and shallow reef areas at low tide';
  if (/\b(gull|tern|plover|sandpiper|oystercatcher|turnstone|sanderling|dunlin|willet|curlew|godwit)\b/.test(n)) return profile.shoreline?.[0] ?? profile.waters?.[0] ?? 'along shorelines and mudflats';
  if (/\b(puffin|gannet|booby|frigate|petrel|shearwater|murre|auklet)\b/.test(n)) return profile.shoreline?.[0] ?? 'on coastal cliffs and offshore rocks';

  // Raptors
  if (/\b(eagle|hawk|falcon|kite|osprey|harrier|merlin|kestrel)\b/.test(n)) return profile.meadows?.[0] ?? profile.features?.[0] ?? 'scanning the sky from open overlooks';
  if (/\b(vulture|condor)\b/.test(n)) return profile.features?.[1] ?? profile.features?.[0] ?? 'soaring over the landscape from overlooks';
  if (/\b(owl)\b/.test(n)) return profile.forests?.[0] ?? 'in dense forest areas';

  // Large mammals
  if (/\b(bison|buffalo|elk|deer|pronghorn|caribou|muskox)\b/.test(n)) return profile.meadows?.[0] ?? 'in open meadows and grasslands';
  if (/\b(bear|grizzly)\b/.test(n)) return profile.meadows?.[0] ?? profile.forests?.[0] ?? 'in meadows and along the forest edges';
  if (/\b(moose)\b/.test(n)) return profile.waters?.[0] ?? profile.meadows?.[0] ?? 'near wetlands, ponds, and willow thickets';
  if (/\b(mountain goat|bighorn sheep)\b/.test(n)) return profile.alpine?.[0] ?? profile.features?.[0] ?? 'on steep rocky slopes and ridgelines';
  if (/\b(mountain lion|cougar|puma|bobcat|lynx|wolf)\b/.test(n)) return profile.meadows?.[0] ?? profile.forests?.[0] ?? 'in remote areas, often at dawn or dusk';
  if (/\b(fox|coyote)\b/.test(n)) return profile.meadows?.[0] ?? profile.roads?.[0] ?? 'in open areas and along roadsides';
  if (/\b(javelina|peccary)\b/.test(n)) return profile.desert?.[0] ?? profile.features?.[0] ?? 'in desert scrub areas';

  // Small mammals
  if (/\b(squirrel|chipmunk)\b/.test(n)) return profile.forests?.[0] ?? profile.features?.[0] ?? 'in forested areas and around picnic areas';
  if (/\b(marmot|pika)\b/.test(n)) return profile.alpine?.[0] ?? profile.features?.[0] ?? 'in rocky areas at higher elevations';
  if (/\b(prairie dog)\b/.test(n)) return profile.meadows?.[1] ?? profile.meadows?.[0] ?? 'in prairie grasslands';
  if (/\b(hare|rabbit|cottontail|jackrabbit)\b/.test(n)) return profile.meadows?.[0] ?? profile.forests?.[0] ?? 'in meadows and forest edges';
  if (/\b(raccoon|skunk|opossum)\b/.test(n)) return profile.forests?.[0] ?? 'near campgrounds and picnic areas at dusk';
  if (/\b(bat)\b/.test(n)) return profile.waters?.[0] ?? profile.features?.[0] ?? 'flying over open areas at dusk';
  if (/\b(ringtail|coati)\b/.test(n)) return profile.features?.[0] ?? profile.forests?.[0] ?? 'in rocky areas and canyon walls';

  // Snakes
  if (/\b(rattlesnake|copperhead|cottonmouth|moccasin)\b/.test(n)) return profile.desert?.[0] ?? profile.forests?.[0] ?? 'along rocky trails and sun-exposed areas';
  if (/\b(snake|racer|kingsnake|garter|whipsnake|coachwhip)\b/.test(n)) return profile.meadows?.[0] ?? profile.forests?.[0] ?? 'in open sunny areas and along trail edges';

  // Lizards
  if (/\b(lizard|anole|skink|gecko|iguana|whiptail|horned|chuckwalla|collared)\b/.test(n)) return profile.desert?.[0] ?? profile.features?.[0] ?? 'on sun-warmed rocks and along trails';

  // Forest birds
  if (/\b(woodpecker|sapsucker|flicker)\b/.test(n)) return profile.forests?.[0] ?? 'in wooded areas, listening for drumming';
  if (/\b(warbler|vireo|tanager|oriole|grosbeak|bunting|chat)\b/.test(n)) return profile.forests?.[0] ?? profile.meadows?.[0] ?? 'in the tree canopy at forest edges';
  if (/\b(wren|nuthatch|chickadee|titmouse|creeper|kinglet)\b/.test(n)) return profile.forests?.[0] ?? 'in mixed forest areas';
  if (/\b(thrush|robin|bluebird|catbird|mockingbird|thrasher)\b/.test(n)) return profile.forests?.[0] ?? profile.meadows?.[0] ?? 'in forest understory and clearings';

  // Open-country birds
  if (/\b(sparrow|finch|junco|towhee|longspur|lark|meadowlark|pipit)\b/.test(n)) return profile.meadows?.[0] ?? 'in open grassy areas';
  if (/\b(swallow|swift|nighthawk|martin)\b/.test(n)) return profile.features?.[0] ?? 'flying over open areas';
  if (/\b(crow|raven|jay|magpie|nutcracker)\b/.test(n)) return profile.forests?.[0] ?? profile.features?.[0] ?? 'near picnic areas and overlooks';
  if (/\b(dove|pigeon)\b/.test(n)) return profile.meadows?.[0] ?? profile.features?.[0] ?? 'in open areas near the ground';
  if (/\b(hummingbird)\b/.test(n)) return profile.meadows?.[0] ?? profile.forests?.[0] ?? 'near wildflower patches';
  if (/\b(roadrunner)\b/.test(n)) return profile.desert?.[0] ?? profile.roads?.[0] ?? 'on open desert ground and along roads';
  if (/\b(quail|grouse|pheasant|ptarmigan|turkey)\b/.test(n)) return profile.forests?.[0] ?? profile.meadows?.[0] ?? 'on the ground in forest openings';

  // Butterflies & moths
  if (/\b(butterfly|swallowtail|monarch|admiral|skipper|fritillary|painted lady|buckeye|hairstreak|sulphur|copper|blue|white|peacock|crescent)\b/.test(n)) return profile.meadows?.[0] ?? 'in sunny meadows with wildflowers';
  if (/\b(moth|tussock|sphinx|silk)\b/.test(n)) return profile.forests?.[0] ?? 'around porch lights or in the forest canopy';

  // Other insects
  if (/\b(bee|bumble)\b/.test(n)) return profile.meadows?.[0] ?? 'in wildflower meadows';
  if (/\b(beetle|weevil|ladybug|firefly|lanternfly)\b/.test(n)) return profile.forests?.[0] ?? profile.meadows?.[0] ?? 'in vegetation along trails';
  if (/\b(grasshopper|cricket|katydid|mantis)\b/.test(n)) return profile.meadows?.[0] ?? 'in grassy areas';
  if (/\b(cicada)\b/.test(n)) return profile.forests?.[0] ?? 'in the forest canopy — listen for their buzzing';
  if (/\b(ant|termite)\b/.test(n)) return profile.forests?.[0] ?? 'on the forest floor and along logs';
  // Aquatic insects
  if (/\b(mayfly|stonefly|caddisfly|water strider|water bug|whirligig)\b/.test(n)) return profile.waters?.[0] ?? 'near clean streams and rivers';
  // Spiders / scorpions
  if (/\b(spider|tarantula|orb weaver)\b/.test(n)) return profile.forests?.[0] ?? profile.desert?.[0] ?? 'along trail edges — check webs in morning dew';
  if (/\b(scorpion)\b/.test(n)) return profile.desert?.[0] ?? 'under rocks in dry, rocky areas — use a UV flashlight at night';
  // Snails / slugs / worms
  if (/\b(snail|slug)\b/.test(n)) return profile.forests?.[0] ?? 'in damp leaf litter, especially after rain';
  if (/\b(worm|millipede|centipede)\b/.test(n)) return profile.forests?.[0] ?? 'under logs and in leaf litter';

  // Fallback by animalType + park biome awareness
  if (animalType === 'bird') return profile.forests?.[0] ?? profile.meadows?.[0] ?? profile.shoreline?.[0] ?? 'along the main trails';
  if (animalType === 'mammal') return profile.meadows?.[0] ?? profile.forests?.[0] ?? profile.desert?.[0] ?? 'in open areas near forest edges';
  if (animalType === 'reptile') return profile.desert?.[0] ?? profile.forests?.[0] ?? profile.features?.[0] ?? 'along sunny trail sections';
  if (animalType === 'amphibian') return profile.waters?.[0] ?? profile.forests?.[0] ?? 'near water sources';
  if (animalType === 'insect') return profile.meadows?.[0] ?? profile.forests?.[0] ?? profile.waters?.[0] ?? 'in sunny areas along trails';
  if (animalType === 'marine') return profile.shoreline?.[0] ?? profile.waters?.[0] ?? 'in coastal waters';
  if (animalType === 'fish') return profile.waters?.[0] ?? 'in clear water from bridges and overlooks';

  return profile.features?.[0] ?? 'along the main park trails';
}

// Behavior-based tip addition
function getBehaviorTip(name, animalType) {
  const n = name.toLowerCase();
  // Songbirds
  if (/\b(warbler|vireo|kinglet|gnatcatcher|tanager|oriole|grosbeak|bunting|chat)\b/.test(n)) return "Listen for their song — you'll often hear them before you see them.";
  // Waterfowl
  if (/\b(goose|duck|teal|wigeon|shoveler|pintail|merganser|goldeneye|bufflehead|scoter|scaup|coot|gallinule|moorhen)\b/.test(n)) return 'Scan ponds and slow-moving water — they\'re often in groups.';
  // Shorebirds
  if (/\b(plover|sandpiper|godwit|curlew|willet|turnstone|dunlin|sanderling|oystercatcher|avocet|stilt|dowitcher|yellowlegs|phalarope|knot)\b/.test(n)) return 'Check mudflats and shoreline at low tide.';
  // Raptors
  if (/\b(eagle|hawk|osprey|vulture|condor|kite|harrier)\b/.test(n)) return 'Look up — they soar on thermals above open areas and ridgelines.';
  if (/\b(falcon|kestrel|merlin)\b/.test(n)) return 'Scan perches on high branches, utility poles, and cliff faces.';
  // Owls
  if (/\b(owl)\b/.test(n)) return 'Listen at dusk and dawn — they\'re more often heard than seen.';
  // Woodpeckers
  if (/\b(woodpecker|sapsucker|flicker)\b/.test(n)) return 'Listen for drumming on dead trees and snags.';
  // Herons / waders
  if (/\b(heron|egret|bittern|stork|spoonbill|ibis)\b/.test(n)) return 'Look for their motionless silhouette as they hunt along the water\'s edge.';
  // Cranes
  if (/\b(crane)\b/.test(n)) return 'Listen for their distinctive bugling call, which carries over long distances.';
  // Pelicans
  if (/\b(pelican)\b/.test(n)) return 'Watch for groups soaring in formation or diving for fish.';
  // Gulls / terns
  if (/\b(gull|tern|skimmer)\b/.test(n)) return 'Look along the shoreline and over open water.';
  // Seabirds
  if (/\b(puffin|gannet|booby|frigate|petrel|shearwater|murre|auklet|cormorant)\b/.test(n)) return 'Scan coastal cliffs and offshore rocks — binoculars help.';
  // Small songbirds
  if (/\b(wren|nuthatch|chickadee|titmouse|creeper|kinglet)\b/.test(n)) return 'They often travel in mixed flocks — find one species and watch for others.';
  if (/\b(sparrow|junco|towhee|longspur)\b/.test(n)) return 'Look for them foraging on the ground in brushy areas.';
  if (/\b(thrush|robin|bluebird|solitaire)\b/.test(n)) return 'Check open lawns and forest clearings where they forage on the ground.';
  if (/\b(swallow|swift|martin|nighthawk)\b/.test(n)) return 'Watch the sky over open areas — they feed on the wing.';
  if (/\b(hummingbird)\b/.test(n)) return 'Watch for them hovering at wildflowers — they return to favorites repeatedly.';
  if (/\b(jay|magpie|crow|raven|nutcracker)\b/.test(n)) return 'Bold and vocal near picnic areas — listen for their raucous calls.';
  if (/\b(dove|pigeon)\b/.test(n)) return 'Listen for their cooing, then look on the ground or on low perches.';
  if (/\b(quail|grouse|pheasant|ptarmigan|turkey)\b/.test(n)) return 'Walk slowly along trail edges — they flush from ground cover.';
  if (/\b(roadrunner)\b/.test(n)) return 'Watch roadsides and open desert floor — they run rather than fly.';
  if (/\b(loon|grebe)\b/.test(n)) return 'Scan open lake surfaces — they dive frequently and resurface at a distance.';
  // Frogs / salamanders
  if (/\b(frog|toad|treefrog|peeper)\b/.test(n)) return 'Search near streams and under damp logs, especially after rain.';
  if (/\b(salamander|newt)\b/.test(n)) return 'Search near streams and under damp logs, especially after rain.';
  // Turtles
  if (/\b(turtle|tortoise|cooter|slider|softshell)\b/.test(n)) return 'Check sunny logs and banks near ponds — they bask in the warmth.';
  // Snakes
  if (/\b(snake|rattlesnake|copperhead|cottonmouth|racer|kingsnake|garter|whipsnake|coachwhip|boa|python)\b/.test(n)) return 'Watch the trail edges on warm, sunny mornings — they bask on exposed rocks.';
  // Lizards
  if (/\b(lizard|anole|skink|gecko|iguana|whiptail|horned|chuckwalla|collared)\b/.test(n)) return 'Check sunny rock faces and fallen logs — they bask in warm spots.';
  // Alligators / crocs
  if (/\b(alligator|crocodile|caiman)\b/.test(n)) return 'Scan still water surfaces and sunny banks — they bask along the shore.';
  // Large mammals
  if (/\b(bear|grizzly)\b/.test(n)) return 'Use binoculars to scan distant meadows — always maintain safe distance.';
  if (/\b(deer|elk)\b/.test(n)) return 'Scan meadow edges at dawn, using binoculars from a pullout.';
  if (/\b(moose)\b/.test(n)) return 'Check willow thickets and pond edges — give them wide space.';
  if (/\b(bison|buffalo)\b/.test(n)) return 'Stay at least 25 yards away — they are faster than they look.';
  if (/\b(mountain lion|cougar|puma|bobcat|lynx)\b/.test(n)) return 'Extremely elusive — look for tracks on dusty trail sections.';
  if (/\b(wolf|wolves)\b/.test(n)) return 'Scan open valleys at dawn with a scope — listen for howling.';
  if (/\b(fox|coyote)\b/.test(n)) return 'Scan open areas and roadsides, especially at dawn and dusk.';
  if (/\b(pronghorn)\b/.test(n)) return 'Scan the open plains — their white rumps are visible from far away.';
  if (/\b(bighorn|sheep)\b/.test(n)) return 'Glass rocky cliffs and ledges with binoculars — they blend in well.';
  if (/\b(mountain goat)\b/.test(n)) return 'Look for white patches on high cliffs and steep snowfields.';
  // Small mammals
  if (/\b(squirrel|chipmunk)\b/.test(n)) return "They're bold near picnic areas and trailheads.";
  if (/\b(marmot)\b/.test(n)) return 'Listen for their sharp whistling alarm calls from rocky outcrops.';
  if (/\b(pika)\b/.test(n)) return 'Listen for their distinctive "eek!" calls from rocky talus slopes.';
  if (/\b(prairie dog)\b/.test(n)) return 'Watch for them popping up from their burrows and listen for their barking calls.';
  if (/\b(raccoon|opossum|skunk)\b/.test(n)) return 'Most active at dusk around campgrounds — secure your food.';
  if (/\b(otter)\b/.test(n)) return 'Watch for their playful sliding and diving along riverbanks.';
  if (/\b(beaver)\b/.test(n)) return 'Look for their lodges and dams — watch the water at dusk for swimming silhouettes.';
  // Bats
  if (/\b(bat)\b/.test(n)) return 'Watch near water sources at dusk — they emerge to feed on insects.';
  // Marine mammals
  if (/\b(whale|dolphin|porpoise)\b/.test(n)) return 'Scan from elevated viewpoints and headlands — binoculars help.';
  if (/\b(seal|sea lion|fur seal)\b/.test(n)) return 'Scan offshore rocks and haul-out areas with binoculars.';
  if (/\b(manatee)\b/.test(n)) return 'Watch for their rounded backs breaking the surface in calm, shallow water.';
  // Fish
  if (/\b(salmon|trout|char|steelhead)\b/.test(n)) return 'Look in clear, shallow water from bridges and overlooks.';
  if (/\b(bass|sunfish|bluegill|perch|pike|walleye|catfish|gar|carp|sucker|minnow|dace|darter|shiner|chub)\b/.test(n)) return 'Look in clear, shallow water from bridges and overlooks.';
  // Butterflies
  if (/\b(butterfly|swallowtail|monarch|admiral|skipper|fritillary|painted lady|buckeye|hairstreak|sulphur|copper|blue|white|checkerspot|ringlet|satyr|comma|question mark)\b/.test(n)) return 'Look in sunny meadows with wildflowers, especially midday.';
  // Dragonflies
  if (/\b(dragonfly|damselfly|darner|skimmer|pennant|pondhawk|dasher|clubtail|saddlebag)\b/.test(n)) return 'Found near ponds and slow streams — they patrol the same routes repeatedly.';
  // Beetles
  if (/\b(beetle|weevil|ladybug|firefly|lightning bug|longhorn|scarab|stag)\b/.test(n)) return 'Check under bark and rotting logs on forest trails.';
  // Moths
  if (/\b(moth|luna|sphinx|silk|tussock|underwing|geometrid|tiger moth)\b/.test(n)) return 'Attracted to lights near buildings at night — check porch areas after dark.';
  // Other insects
  if (/\b(grasshopper|cricket|katydid)\b/.test(n)) return 'Walk through grassy areas slowly and watch for them jumping ahead of you.';
  if (/\b(bee|bumble|wasp|hornet)\b/.test(n)) return 'Look for them visiting flowers in open meadows on warm days.';
  if (/\b(cicada)\b/.test(n)) return 'Listen for their loud buzzing in the treetops on hot afternoons.';
  if (/\b(ant|fly|mosquito|midge)\b/.test(n)) return 'Common throughout — most noticeable near water and in shaded areas.';
  // Spiders
  if (/\b(spider|tarantula|orb weaver|black widow|brown recluse)\b/.test(n)) return 'Look for webs in morning dew along trail edges and between branches.';
  // Crabs / marine invertebrates
  if (/\b(crab|lobster|shrimp|barnacle)\b/.test(n)) return 'Check tidal pools and rocky shoreline at low tide.';
  if (/\b(starfish|sea star|urchin|anemone|jellyfish|coral)\b/.test(n)) return 'Explore tidal pools at low tide — tread carefully on wet rocks.';
  // Snails / slugs
  if (/\b(snail|slug)\b/.test(n)) return 'Check damp leaf litter and under logs, especially after rain.';
  // Worms / millipedes
  if (/\b(worm|millipede|centipede)\b/.test(n)) return 'Look under rotting logs and in damp leaf litter.';
  // Generic fallbacks by type
  if (animalType === 'bird') return 'Listen for their calls first, then scan with binoculars.';
  if (animalType === 'mammal') return 'Move quietly and scan with binoculars from a distance.';
  if (animalType === 'reptile') return 'Watch sunny, exposed areas where they bask in the warmth.';
  if (animalType === 'amphibian') return 'Search damp areas near water, especially after rain.';
  if (animalType === 'insect') return 'Look along trail edges and on vegetation in sunny spots.';
  if (animalType === 'marine') return 'Scan from elevated viewpoints with binoculars.';
  if (animalType === 'fish') return 'Look in clear, shallow water from bridges and overlooks.';
  return 'Move quietly and keep your eyes peeled.';
}

// ══════════════════════════════════════════════════════════════════════════════
// TIP GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

// Add proper preposition before a location phrase
function prep(location) {
  const l = location.trim();
  // Already has a preposition
  if (/^(along |near |in |at |on |around |over |from |scanning |flying |soaring )/i.test(l)) return l;
  // Starts with "the" — infer preposition from context
  if (/^the .*(river|creek|stream|corridor|waterway|channel|slough|bay|cove|inlet|shore)/i.test(l)) return `along ${l}`;
  if (/^the .*(lake|pond|pool|basin|marsh|wetland|spring|falls)/i.test(l)) return `near ${l}`;
  if (/^the .*(forest|grove|wood|canopy|hammock|thicket|chaparral)/i.test(l)) return `in ${l}`;
  if (/^the .*(meadow|prairie|grassland|flat|tundra|field|savanna|steppe)/i.test(l)) return `in ${l}`;
  if (/^the .*(desert|dune|bajada|slickrock|canyon|butte|rim|cliff|wall|formation)/i.test(l)) return `in ${l}`;
  if (/^the .*(road|drive|highway|route|trail|boardwalk|path|loop)/i.test(l)) return `along ${l}`;
  if (/^the .*(overlook|point|summit|peak|ridge|pass|tower|area|zone|section|district|entrance|visitor)/i.test(l)) return `near ${l}`;
  if (/^the .*(shore|coast|beach|tidepools|rocks|reef)/i.test(l)) return `along ${l}`;
  if (/^the /i.test(l)) return `in ${l}`;
  // Named locations (no "the")
  if (/\b(Lake|River|Creek|Falls|Pond|Bay|Cove)\b/.test(l)) return `near ${l}`;
  if (/\b(Valley|Meadow|Prairie|Park|Flats|Basin)\b/.test(l)) return `in ${l}`;
  if (/\b(Road|Drive|Trail|Highway|Loop)\b/.test(l)) return `along ${l}`;
  if (/\b(Point|Peak|Summit|Pass|Overlook|Ridge|Tower)\b/.test(l)) return `near ${l}`;
  if (/\b(Beach|Shore|Coast|Island|Key)\b/.test(l)) return `at ${l}`;
  if (/\b(Canyon|Gorge|Gulch|Cave)\b/.test(l)) return `near ${l}`;
  return `near ${l}`;
}

// Seasonal phrase
function seasonPhrase(seasons) {
  if (!seasons || seasons === 'year_round') return 'year-round';
  const s = seasons.toLowerCase();
  if (s.includes('year_round')) return 'year-round';
  if (s.includes('spring') && s.includes('summer') && s.includes('fall')) return 'from spring through fall';
  if (s.includes('spring') && s.includes('summer')) return 'in spring and summer';
  if (s.includes('summer') && s.includes('fall')) return 'in summer and fall';
  if (s.includes('fall') && s.includes('winter')) return 'in fall and winter';
  if (s.includes('spring')) return 'especially in spring';
  if (s.includes('summer')) return 'especially in summer';
  if (s.includes('fall')) return 'especially in fall';
  if (s.includes('winter')) return 'especially in winter';
  return 'when conditions are right';
}

function generateTip(target) {
  const profile = PARK_PROFILES[target.parkId];
  if (!profile) return null;

  const rawWhere = getHabitat(target.animal, target.animalType, profile);
  const where = prep(rawWhere);
  const when = getBestTime(target.animal, target.animalType);
  const behavior = getBehaviorTip(target.animal, target.animalType);
  const season = seasonPhrase(target.seasons);

  // Vary sentence structure using a hash of the animal name for deterministic variety
  const hash = target.animal.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const variant = Math.abs(hash) % 10;
  const bare = where.replace(/^(in|near|along|at) /i, '');

  let tip;
  if (behavior) {
    switch (variant) {
      case 0: tip = `Best spotted ${where} during ${when}. ${behavior}`; break;
      case 1: tip = `Check ${where} during ${when}, ${season}. ${behavior}`; break;
      case 2: tip = `During ${when}, scan ${where}. ${behavior}`; break;
      case 3: tip = `Head to ${bare} during ${when}. ${behavior}`; break;
      case 4: tip = `Dawn and dusk are prime viewing times ${where}. ${behavior}`; break;
      case 5: tip = `Your best bet is ${bare} during ${when}. ${behavior}`; break;
      case 6: tip = `Commonly found ${where}, ${season}. ${behavior}`; break;
      case 7: tip = `Scan ${where} during ${when} for your best chance. ${behavior}`; break;
      case 8: tip = `Most active ${season}, particularly ${where}. ${behavior}`; break;
      default: tip = `Try ${bare} at ${when} — ${behavior.charAt(0).toLowerCase() + behavior.slice(1)}`; break;
    }
  } else {
    switch (variant) {
      case 0: tip = `Best spotted ${where} during ${when}, ${season}.`; break;
      case 1: tip = `Check ${where} during ${when} for the best chance of a sighting, ${season}.`; break;
      case 2: tip = `Most active ${where} during ${when}, ${season}.`; break;
      case 3: tip = `Visit ${bare} during ${when} for the best viewing, ${season}.`; break;
      case 4: tip = `Dawn and dusk are prime viewing times ${where}, ${season}.`; break;
      case 5: tip = `Your best bet is ${bare} during ${when}, ${season}.`; break;
      case 6: tip = `Commonly found ${where}, ${season}.`; break;
      case 7: tip = `Scan ${where} during ${when} for your best chance, ${season}.`; break;
      case 8: tip = `Most active ${season}, particularly ${where}.`; break;
      default: tip = `Try ${bare} at ${when}, ${season}.`; break;
    }
  }

  return tip;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n  === generateTipsLocal.js ===\n');

  // Load targets
  const targets = JSON.parse(readFileSync(TARGETS_PATH, 'utf8'));
  console.log(`  Loaded ${targets.length} tip targets`);

  // Load or init tips cache
  let tipsCache = {};
  if (existsSync(TIPS_CACHE_PATH)) {
    try { tipsCache = JSON.parse(readFileSync(TIPS_CACHE_PATH, 'utf8')); } catch {}
  }
  const existingCount = Object.keys(tipsCache).length;
  console.log(`  Existing cached tips: ${existingCount}`);

  // Generate tips
  let generated = 0, skipped = 0, noProfile = 0;
  for (const t of targets) {
    if (tipsCache[t.key]) { skipped++; continue; }

    const tip = generateTip(t);
    if (tip) {
      tipsCache[t.key] = tip;
      generated++;
    } else {
      noProfile++;
      console.log(`  ⚠️  No profile for ${t.parkId} — skipping ${t.animal}`);
    }
  }

  // Save tips cache
  saveTipsCache(tipsCache);

  console.log(`\n  Generated: ${generated} | Skipped (cached): ${skipped} | No profile: ${noProfile}`);
  console.log(`  Total tips in cache: ${Object.keys(tipsCache).length}`);

  // Apply tips to wildlife cache
  console.log(`\n  Applying tips to wildlifeCache.js...`);
  const cacheMod = await import('../src/data/wildlifeCache.js');
  const wildlifeCache = cacheMod.WILDLIFE_CACHE;

  let applied = 0;
  for (const [key, tip] of Object.entries(tipsCache)) {
    const [parkId, animalName] = key.split('::');
    const park = wildlifeCache[parkId];
    if (!park) continue;
    const animal = park.animals?.find(a => a.name === animalName);
    if (animal) {
      animal.parkTip = tip;
      applied++;
    }
  }
  console.log(`  Applied ${applied} tips to cache entries`);

  // Write updated cache
  writeUpdatedCache(wildlifeCache);

  // Quality check
  console.log(`\n  ── QUALITY CHECK: 10 example tips ──\n`);
  const sampleParks = ['yellowstone', 'acadia', 'everglades', 'grandcanyon', 'glacier'];
  let ex = 0;
  for (const pid of sampleParks) {
    const park = wildlifeCache[pid];
    if (!park) continue;
    const tipped = park.animals.filter(a => a.parkTip).slice(0, 2);
    for (const a of tipped) {
      ex++;
      const parkName = targets.find(t => t.parkId === pid)?.parkName ?? pid;
      const isGeneric = !a.parkTip.includes(parkName.split(' ')[0]) && !a.parkTip.includes('the park');
      const hasTrailName = /\b(trail|loop|path|overlook)\b/i.test(a.parkTip) &&
                           !/\b(main park|Towpath|Loop Road|Scenic|carriage|boardwalk|rim|Appalachian)\b/i.test(a.parkTip);
      console.log(`  ${ex}. [${parkName}] ${a.name} (${a.rarity})`);
      console.log(`     "${a.parkTip}"`);
      if (isGeneric) console.log(`     ⚠️  FLAG: May be generic`);
      if (hasTrailName) console.log(`     ⚠️  FLAG: May contain specific trail name`);
      console.log('');
    }
  }
}

function saveTipsCache(cache) {
  writeFileSync(TIPS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

function writeUpdatedCache(cache) {
  const parkIds = Object.keys(cache);
  const totalSpecies = Object.values(cache).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${new Date().toISOString()}`,
    `// Parks: ${parkIds.length} | Species bundled: ${totalSpecies}`,
    `// To regenerate: node scripts/buildWildlifeCache.js`,
    `// Bird rarity patched: 2026-04-05 via patchBirdRarity.js`,
    `// Park tips generated: ${new Date().toISOString().slice(0, 10)} via generateTipsLocal.js`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(new Date().toISOString())};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];

  for (const [parkId, parkData] of Object.entries(cache)) {
    lines.push(`  ${JSON.stringify(parkId)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(parkData.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(parkData.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }

  lines.push(`};`);
  lines.push(``);

  writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
  console.log(`\n  Wrote ${CACHE_PATH}`);
  console.log(`  Parks: ${parkIds.length} | Species: ${totalSpecies}`);
}

main().catch(err => { console.error(err); process.exit(1); });
