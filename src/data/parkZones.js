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
};

// Returns zones for a park, or null if park isn't zoned.
export function getParkZones(parkId) {
  return PARK_ZONES[parkId] ?? null;
}
