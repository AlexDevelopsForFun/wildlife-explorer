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
};

// Returns zones for a park, or null if park isn't zoned.
export function getParkZones(parkId) {
  return PARK_ZONES[parkId] ?? null;
}
