// ── Park zones for zone-specific rarity (mega-park accuracy) ─────────────────
// The top visitation-weighted parks are too large to treat as a single rarity
// bucket. Grand Canyon's South Rim Village experiences a radically different
// species set from Phantom Ranch (mile below), Hermit Road, or the North Rim.
//
// Each zone records:
//   id         — stable key
//   label      — display name
//   access     — visitor demographic weight (5=front-country, 1=expedition)
//   lat,lng    — centroid for display / future map overlays
//   radiusKm   — rough radius (for hotspot membership tests)
//
// Species-level zone rarity is computed by re-running rarityFromObsCount
// against zone-filtered iNat queries in scripts/buildZoneRarity.js (follow-up).
// For now this file defines the zone taxonomy so the UI can display the
// zone selector even before all zone data is populated.

export const PARK_ZONES = {
  grandcanyon: [
    { id: 'south-rim',      label: 'South Rim (main visitor area)',          access: 5, lat: 36.0544, lng: -112.1401, radiusKm: 8 },
    { id: 'north-rim',      label: 'North Rim',                              access: 3, lat: 36.2014, lng: -112.0569, radiusKm: 6 },
    { id: 'inner-canyon',   label: 'Inner Canyon (Phantom Ranch / river)',   access: 2, lat: 36.1060, lng: -112.0945, radiusKm: 10 },
    { id: 'desert-view',    label: 'Desert View / east rim',                 access: 3, lat: 36.0420, lng: -111.8269, radiusKm: 5 },
  ],

  yellowstone: [
    { id: 'lamar-valley',   label: 'Lamar Valley (wildlife watching)',       access: 4, lat: 44.8997, lng: -110.2316, radiusKm: 12 },
    { id: 'hayden-valley',  label: 'Hayden Valley (wildlife watching)',      access: 4, lat: 44.6661, lng: -110.4640, radiusKm: 10 },
    { id: 'old-faithful',   label: 'Old Faithful / Upper Geyser',            access: 5, lat: 44.4605, lng: -110.8281, radiusKm: 6 },
    { id: 'mammoth',        label: 'Mammoth Hot Springs',                    access: 4, lat: 44.9769, lng: -110.7006, radiusKm: 5 },
    { id: 'yellowstone-lake', label: 'Yellowstone Lake shore',               access: 3, lat: 44.4280, lng: -110.3700, radiusKm: 12 },
    { id: 'backcountry',    label: 'Backcountry / Thorofare',                access: 1, lat: 44.2700, lng: -110.1800, radiusKm: 25 },
  ],

  yosemite: [
    { id: 'valley',         label: 'Yosemite Valley',                        access: 5, lat: 37.7456, lng: -119.5936, radiusKm: 5 },
    { id: 'tuolumne',       label: 'Tuolumne Meadows',                       access: 3, lat: 37.8754, lng: -119.3559, radiusKm: 8 },
    { id: 'mariposa-grove', label: 'Mariposa Grove',                         access: 4, lat: 37.5080, lng: -119.6021, radiusKm: 3 },
    { id: 'high-country',   label: 'High Country / backcountry',             access: 1, lat: 37.8300, lng: -119.2300, radiusKm: 20 },
  ],

  glacier: [
    { id: 'going-to-sun',   label: 'Going-to-the-Sun Road corridor',         access: 5, lat: 48.7407, lng: -113.7890, radiusKm: 10 },
    { id: 'many-glacier',   label: 'Many Glacier',                           access: 4, lat: 48.7969, lng: -113.6589, radiusKm: 5 },
    { id: 'two-medicine',   label: 'Two Medicine',                           access: 3, lat: 48.4852, lng: -113.3651, radiusKm: 5 },
    { id: 'north-fork',     label: 'North Fork / Polebridge',                access: 2, lat: 48.7764, lng: -114.2850, radiusKm: 10 },
    { id: 'backcountry',    label: 'Backcountry',                            access: 1, lat: 48.7000, lng: -113.9000, radiusKm: 20 },
  ],

  greatsmokymountains: [
    { id: 'cades-cove',     label: 'Cades Cove (wildlife loop)',             access: 5, lat: 35.6037, lng: -83.7757, radiusKm: 6 },
    { id: 'newfound-gap',   label: 'Newfound Gap Road / Clingmans',          access: 5, lat: 35.6110, lng: -83.4258, radiusKm: 8 },
    { id: 'cataloochee',    label: 'Cataloochee Valley (elk herd)',          access: 3, lat: 35.6400, lng: -83.1000, radiusKm: 5 },
    { id: 'backcountry',    label: 'Backcountry / AT corridor',              access: 1, lat: 35.5900, lng: -83.4500, radiusKm: 15 },
  ],

  rockymountain: [
    { id: 'bear-lake',      label: 'Bear Lake / Estes Park front-country',   access: 5, lat: 40.3128, lng: -105.6460, radiusKm: 8 },
    { id: 'trail-ridge',    label: 'Trail Ridge Road (alpine tundra)',       access: 5, lat: 40.4040, lng: -105.7580, radiusKm: 10 },
    { id: 'wild-basin',     label: 'Wild Basin',                             access: 3, lat: 40.2107, lng: -105.5667, radiusKm: 6 },
    { id: 'kawuneeche',     label: 'Kawuneeche Valley (west side)',          access: 3, lat: 40.3836, lng: -105.8570, radiusKm: 8 },
    { id: 'backcountry',    label: 'Backcountry / wilderness',               access: 1, lat: 40.3400, lng: -105.7000, radiusKm: 20 },
  ],

  olympic: [
    { id: 'hoh-rainforest', label: 'Hoh Rainforest (temperate rain)',        access: 4, lat: 47.8608, lng: -123.9349, radiusKm: 5 },
    { id: 'hurricane-ridge',label: 'Hurricane Ridge (sub-alpine)',           access: 5, lat: 47.9714, lng: -123.4984, radiusKm: 6 },
    { id: 'kalaloch',       label: 'Kalaloch / Pacific coast strip',         access: 4, lat: 47.6086, lng: -124.3750, radiusKm: 10 },
    { id: 'lake-crescent',  label: 'Lake Crescent / Sol Duc',                access: 4, lat: 48.0681, lng: -123.7980, radiusKm: 8 },
    { id: 'wilderness',     label: 'Wilderness interior',                    access: 1, lat: 47.8000, lng: -123.5000, radiusKm: 25 },
  ],

  bigbend: [
    { id: 'chisos',         label: 'Chisos Basin / mountain',                access: 5, lat: 29.2702, lng: -103.3006, radiusKm: 8 },
    { id: 'rio-grande',     label: 'Rio Grande Village / river corridor',    access: 4, lat: 29.1830, lng: -102.9590, radiusKm: 8 },
    { id: 'desert',         label: 'Chihuahuan Desert flats',                access: 3, lat: 29.3300, lng: -103.2000, radiusKm: 20 },
    { id: 'santa-elena',    label: 'Santa Elena Canyon / west',              access: 3, lat: 29.1665, lng: -103.6121, radiusKm: 6 },
  ],

  sequoia: [
    { id: 'giant-forest',   label: 'Giant Forest (sequoia groves)',          access: 5, lat: 36.5762, lng: -118.7654, radiusKm: 5 },
    { id: 'mineral-king',   label: 'Mineral King (sub-alpine)',              access: 3, lat: 36.4539, lng: -118.5971, radiusKm: 8 },
    { id: 'foothills',      label: 'Foothills / chaparral',                  access: 4, lat: 36.5155, lng: -118.7870, radiusKm: 8 },
    { id: 'high-sierra',    label: 'High Sierra / backcountry',              access: 1, lat: 36.5000, lng: -118.5000, radiusKm: 25 },
  ],

  hawaiivolcanoes: [
    { id: 'kilauea-summit', label: 'Kīlauea Summit / Volcano village',       access: 5, lat: 19.4194, lng: -155.2885, radiusKm: 5 },
    { id: 'chain-craters',  label: 'Chain of Craters Road (coast)',          access: 4, lat: 19.2960, lng: -155.1050, radiusKm: 10 },
    { id: 'mauna-loa',      label: 'Mauna Loa high-elevation',               access: 2, lat: 19.4750, lng: -155.5950, radiusKm: 12 },
    { id: 'kahuku',         label: 'Kahuku Unit (pasture / forest)',         access: 3, lat: 19.1880, lng: -155.6900, radiusKm: 8 },
  ],

  // Zones added 2026-04-25 to support sub-park hotspot rarity (boat tours,
  // bus tours, warm-water refugia, etc.) — drove a measurable improvement
  // in calibration accuracy. See scripts/rarityAnchors.json for verification.
  everglades: [
    { id: 'anhinga-trail',  label: 'Anhinga Trail (visitor center area)',    access: 5, lat: 25.3835, lng: -80.6111, radiusKm: 2 },
    { id: 'shark-valley',   label: 'Shark Valley loop',                       access: 5, lat: 25.7589, lng: -80.7656, radiusKm: 4 },
    { id: 'flamingo',       label: 'Flamingo / Florida Bay',                  access: 4, lat: 25.1411, lng: -80.9216, radiusKm: 6 },
    { id: 'gulf-coast',     label: 'Gulf Coast / Ten Thousand Islands',       access: 3, lat: 25.8480, lng: -81.3870, radiusKm: 10 },
  ],

  kenaifjords: [
    { id: 'boat-tour',      label: 'Day-cruise boat tour (Aialik / Holgate)', access: 5, lat: 59.9000, lng: -149.6500, radiusKm: 30 },
    { id: 'exit-glacier',   label: 'Exit Glacier road / trails',              access: 5, lat: 60.1888, lng: -149.6320, radiusKm: 4 },
  ],

  glacierbay: [
    { id: 'boat-tour',      label: 'Day-cruise / NPS tour boat',              access: 5, lat: 58.8000, lng: -136.6000, radiusKm: 40 },
    { id: 'bartlett-cove',  label: 'Bartlett Cove (visitor center area)',     access: 5, lat: 58.4554, lng: -135.8861, radiusKm: 2 },
  ],

  denali: [
    { id: 'park-road',      label: 'Park Road bus tour (Toklat / Eielson)',   access: 5, lat: 63.5470, lng: -150.2960, radiusKm: 50 },
    { id: 'entrance',       label: 'Entrance area / Savage River',            access: 5, lat: 63.7170, lng: -148.9320, radiusKm: 8 },
  ],

  katmai: [
    { id: 'brooks-falls',   label: 'Brooks Falls bear-viewing platform',      access: 5, lat: 58.5564, lng: -155.7849, radiusKm: 1 },
    { id: 'brooks-camp',    label: 'Brooks Camp (lake & beach)',              access: 4, lat: 58.5570, lng: -155.7799, radiusKm: 2 },
  ],

  zion: [
    { id: 'main-canyon',    label: 'Main Zion Canyon (shuttle corridor)',     access: 5, lat: 37.2982, lng: -113.0263, radiusKm: 6 },
    { id: 'east-zion',      label: 'East Zion / Mt Carmel Highway',           access: 4, lat: 37.2410, lng: -112.9100, radiusKm: 8 },
    { id: 'kolob-canyons',  label: 'Kolob Canyons',                           access: 3, lat: 37.4530, lng: -113.2330, radiusKm: 6 },
  ],

  // ── Round 3 zone additions (2026-04-25) ──────────────────────────
  acadia: [
    { id: 'park-loop',      label: 'Park Loop Road / Cadillac',              access: 5, lat: 44.3386, lng: -68.2733, radiusKm: 5 },
    { id: 'jordan-pond',    label: 'Jordan Pond / Bubble Pond',              access: 5, lat: 44.3221, lng: -68.2526, radiusKm: 3 },
    { id: 'schoodic',       label: 'Schoodic Peninsula',                     access: 3, lat: 44.3370, lng: -68.0515, radiusKm: 5 },
    { id: 'isle-au-haut',   label: 'Isle au Haut (boat-only)',               access: 2, lat: 44.0500, lng: -68.6300, radiusKm: 4 },
  ],

  saguaro: [
    { id: 'east-rincon',    label: 'East / Rincon Mountain District',         access: 5, lat: 32.1827, lng: -110.7376, radiusKm: 8 },
    { id: 'west-tucson',    label: 'West / Tucson Mountain District',         access: 5, lat: 32.2490, lng: -111.1643, radiusKm: 8 },
  ],

  channelislands: [
    { id: 'boat-tour',      label: 'Boat tour / channel crossing',            access: 5, lat: 34.0000, lng: -119.7500, radiusKm: 30 },
    { id: 'santa-cruz',     label: 'Santa Cruz Island (Scorpion / Prisoners)', access: 4, lat: 34.0306, lng: -119.6361, radiusKm: 8 },
    { id: 'anacapa',        label: 'Anacapa Island',                          access: 4, lat: 34.0150, lng: -119.4300, radiusKm: 4 },
  ],

  voyageurs: [
    { id: 'lake',           label: 'Rainy / Kabetogama / Namakan lakes',      access: 5, lat: 48.5000, lng: -92.8800, radiusKm: 25 },
    { id: 'kabetogama-pen', label: 'Kabetogama Peninsula trails',             access: 3, lat: 48.4533, lng: -92.8400, radiusKm: 12 },
  ],

  brycecanyon: [
    { id: 'rim-trail',      label: 'Rim Trail / Bryce Amphitheater',          access: 5, lat: 37.6238, lng: -112.1660, radiusKm: 4 },
    { id: 'fairyland',      label: 'Fairyland / Sunrise Point',               access: 4, lat: 37.6404, lng: -112.1659, radiusKm: 3 },
  ],

  arches: [
    { id: 'devils-garden',  label: 'Devils Garden / Landscape Arch',          access: 5, lat: 38.7836, lng: -109.5949, radiusKm: 4 },
    { id: 'windows',        label: 'Windows / Balanced Rock area',            access: 5, lat: 38.6920, lng: -109.5390, radiusKm: 3 },
  ],

  greatbasin: [
    { id: 'lehman-caves',   label: 'Lehman Caves / visitor center',           access: 5, lat: 38.9836, lng: -114.2200, radiusKm: 3 },
    { id: 'wheeler-peak',   label: 'Wheeler Peak / sub-alpine',               access: 4, lat: 38.9858, lng: -114.3133, radiusKm: 6 },
  ],

  // (bigbend zones already defined above — chisos / rio-grande / desert / santa-elena)

  drytortugas: [
    { id: 'fort-jefferson', label: 'Fort Jefferson / Garden Key',             access: 5, lat: 24.6286, lng: -82.8732, radiusKm: 1 },
    { id: 'open-water',     label: 'Boat / open water (snorkel)',             access: 4, lat: 24.6300, lng: -82.8800, radiusKm: 5 },
  ],

  // ── Round 4 zone additions (2026-04-25) ──────────────────────────
  mountrainier: [
    { id: 'paradise',       label: 'Paradise (sub-alpine meadows)',           access: 5, lat: 46.7858, lng: -121.7367, radiusKm: 4 },
    { id: 'sunrise',        label: 'Sunrise (alpine, NE side)',               access: 4, lat: 46.9145, lng: -121.6438, radiusKm: 5 },
    { id: 'longmire',       label: 'Longmire / Nisqually entrance',           access: 5, lat: 46.7510, lng: -121.8141, radiusKm: 4 },
    { id: 'carbon-river',   label: 'Carbon River (NW, rainforest)',           access: 3, lat: 46.9870, lng: -121.9156, radiusKm: 5 },
  ],

  deathvalley: [
    { id: 'furnace-creek',  label: 'Furnace Creek (visitor hub)',             access: 5, lat: 36.4615, lng: -116.8674, radiusKm: 4 },
    { id: 'stovepipe-wells',label: 'Stovepipe Wells / Mesquite Dunes',         access: 4, lat: 36.6047, lng: -117.1450, radiusKm: 5 },
    { id: 'badwater',       label: 'Badwater Basin / Devils Golf Course',     access: 4, lat: 36.2298, lng: -116.7674, radiusKm: 6 },
    { id: 'panamint',       label: 'Panamint Range / high elevation',         access: 2, lat: 36.4170, lng: -117.1110, radiusKm: 12 },
  ],

  joshuatree: [
    { id: 'hidden-valley',  label: 'Hidden Valley / Barker Dam',              access: 5, lat: 34.0117, lng: -116.1689, radiusKm: 3 },
    { id: 'cottonwood',     label: 'Cottonwood Spring (south entrance)',      access: 4, lat: 33.7355, lng: -115.8166, radiusKm: 4 },
    { id: 'jumbo-rocks',    label: 'Jumbo Rocks / Skull Rock',                access: 5, lat: 33.9928, lng: -116.0486, radiusKm: 3 },
    { id: 'keys-view',      label: 'Keys View',                               access: 5, lat: 33.9276, lng: -116.1873, radiusKm: 2 },
  ],

  sequoia: [
    { id: 'giant-forest',   label: 'Giant Forest / Lodgepole',                access: 5, lat: 36.5670, lng: -118.7660, radiusKm: 5 },
    { id: 'foothills',      label: 'Foothills (chaparral, lower elevations)', access: 4, lat: 36.4882, lng: -118.8261, radiusKm: 6 },
    { id: 'mineral-king',   label: 'Mineral King (sub-alpine, summer-only)',  access: 3, lat: 36.4500, lng: -118.6000, radiusKm: 8 },
  ],

  shenandoah: [
    { id: 'skyline-north',  label: 'Skyline Drive — North District',          access: 5, lat: 38.8240, lng: -78.2080, radiusKm: 12 },
    { id: 'skyline-central',label: 'Skyline Drive — Central (Big Meadows)',   access: 5, lat: 38.5230, lng: -78.4520, radiusKm: 10 },
    { id: 'skyline-south',  label: 'Skyline Drive — South District',          access: 5, lat: 38.0760, lng: -78.8410, radiusKm: 12 },
  ],
};

// Returns zones for a park, or null if park isn't zoned.
export function getParkZones(parkId) {
  return PARK_ZONES[parkId] ?? null;
}
