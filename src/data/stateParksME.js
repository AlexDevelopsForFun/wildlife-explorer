// Maine state parks, public reserved lands & WMAs — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of ME
// "State Park / Public Reserved Land / Wildlife Management Area" (53 raw units),
// curated to the wildlife destinations across the coast, western mountains, and
// north woods. Dropped: pure State Historic Sites (Forts Baldwin, Knox, O'Brien,
// Popham) and a few tiny/obscure units. Maine's biggest wild public lands are
// under-tagged in Wikidata, so five majors were added via authoritative
// Nominatim geocodes: Scarborough Marsh WMA (the state's largest salt marsh),
// Cutler Coast (the Bold Coast), Bigelow Preserve, Donnell Pond, and Mount Kineo
// SP. Acadia is a NATIONAL park (federal) and is intentionally excluded.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 (public reserved lands) · state-beach 🏖️ · state-preserve 🦋 (sanctuaries/WMAs)
// radiusKm is the fallback search radius. As with RI/NH, ME is sparse in iNat's
// PLACES database: 6/42 units have a boundary place_id; the rest query by radius
// (iNat observation density is still good), and county-level eBird gives every
// ME unit national-park-grade bird rarity.

export const STATE_PARKS_ME = [
  // ── North Woods & Katahdin ──────────────────────────────────────────────────
  { id: 'me-baxter',             name: 'Baxter State Park',                      lat: 46.0333, lng: -68.9333, radiusKm: 12, category: 'state-park' },
  { id: 'me-aroostook',          name: 'Aroostook State Park',                   lat: 46.6083, lng: -68.0083, radiusKm: 4, category: 'state-park' },
  { id: 'me-mount-kineo',        name: 'Mount Kineo State Park',                 lat: 45.7027, lng: -69.7415, radiusKm: 3, category: 'state-park' },
  { id: 'me-lily-bay',           name: 'Lily Bay State Park',                    lat: 45.5700, lng: -69.5500, radiusKm: 4, category: 'state-park' },
  { id: 'me-peaks-kenny',        name: 'Peaks-Kenny State Park',                 lat: 45.2581, lng: -69.2700, radiusKm: 3, category: 'state-park' },

  // ── Western mountains & lakes ───────────────────────────────────────────────
  { id: 'me-grafton-notch',      name: 'Grafton Notch State Park',               lat: 44.5934, lng: -70.9479, radiusKm: 5, category: 'state-park' },
  { id: 'me-bigelow-preserve',   name: 'Bigelow Preserve',                       lat: 45.1528, lng: -70.3033, radiusKm: 8, category: 'state-forest' },
  { id: 'me-mount-blue',         name: 'Mount Blue State Park',                  lat: 44.7353, lng: -70.3790, radiusKm: 5, category: 'state-park' },
  { id: 'me-rangeley-lake',      name: 'Rangeley Lake State Park',               lat: 44.9453, lng: -70.6939, radiusKm: 3, category: 'state-park' },
  { id: 'me-sebago-lake',        name: 'Sebago Lake State Park',                 lat: 43.9219, lng: -70.5769, radiusKm: 4, category: 'state-park' },
  { id: 'me-range-ponds',        name: 'Range Ponds State Park',                 lat: 44.0375, lng: -70.3442, radiusKm: 2, category: 'state-park' },

  // ── Casco Bay & southern coast ──────────────────────────────────────────────
  { id: 'me-bradbury-mountain',  name: 'Bradbury Mountain State Park',           lat: 43.9028, lng: -70.1806, radiusKm: 2, category: 'state-park' },
  { id: 'me-wolfes-neck',        name: "Wolfe's Neck Woods State Park",          lat: 43.8228, lng: -70.0881, radiusKm: 2, category: 'state-park' },
  { id: 'me-two-lights',         name: 'Two Lights State Park',                  lat: 43.5667, lng: -70.2167, radiusKm: 2, category: 'state-park' },
  { id: 'me-crescent-beach',     name: 'Crescent Beach State Park',              lat: 43.5642, lng: -70.2331, radiusKm: 2, category: 'state-beach' },
  { id: 'me-scarborough-beach',  name: 'Scarborough Beach State Park',           lat: 43.5453, lng: -70.3089, radiusKm: 2, category: 'state-beach' },
  { id: 'me-scarborough-marsh',  name: 'Scarborough Marsh Wildlife Management Area', lat: 43.5691, lng: -70.3507, radiusKm: 4, category: 'state-preserve' },
  { id: 'me-ferry-beach',        name: 'Ferry Beach State Park',                 lat: 43.4760, lng: -70.3900, radiusKm: 2, category: 'state-beach' },
  { id: 'me-fort-mcclary',       name: 'Fort McClary State Park',                lat: 43.0831, lng: -70.7089, radiusKm: 2, category: 'state-park' },
  { id: 'me-vaughan-woods',      name: 'Vaughan Woods State Park',               lat: 43.2083, lng: -70.8139, radiusKm: 2, category: 'state-park' },

  // ── Midcoast & Penobscot Bay ────────────────────────────────────────────────
  { id: 'me-reid',               name: 'Reid State Park',                        lat: 43.7849, lng: -69.7288, radiusKm: 3, category: 'state-park' },
  { id: 'me-popham-beach',       name: 'Popham Beach State Park',                lat: 43.7381, lng: -69.7996, radiusKm: 2, category: 'state-beach' },
  { id: 'me-birch-point',        name: 'Birch Point State Park',                 lat: 44.0419, lng: -69.0981, radiusKm: 2, category: 'state-beach' },
  { id: 'me-owls-head',          name: 'Owls Head Light State Park',             lat: 44.0919, lng: -69.0442, radiusKm: 2, category: 'state-park' },
  { id: 'me-camden-hills',       name: 'Camden Hills State Park',                lat: 44.2583, lng: -69.0667, radiusKm: 5, category: 'state-park' },
  { id: 'me-warren-island',      name: 'Warren Island State Park',               lat: 44.2725, lng: -68.9453, radiusKm: 2, category: 'state-park' },
  { id: 'me-fort-point',         name: 'Fort Point State Park',                  lat: 44.4667, lng: -68.8189, radiusKm: 2, category: 'state-park' },
  { id: 'me-moose-point',        name: 'Moose Point State Park',                 lat: 44.4394, lng: -68.9478, radiusKm: 2, category: 'state-park' },
  { id: 'me-swan-lake',          name: 'Swan Lake State Park',                   lat: 44.5639, lng: -68.9789, radiusKm: 2, category: 'state-park' },
  { id: 'me-damariscotta-lake',  name: 'Damariscotta Lake State Park',           lat: 44.1976, lng: -69.4539, radiusKm: 2, category: 'state-park' },
  { id: 'me-lake-st-george',     name: 'Lake St. George State Park',             lat: 44.4039, lng: -69.3561, radiusKm: 2, category: 'state-park' },
  { id: 'me-steve-powell',       name: 'Steve Powell Wildlife Management Area',  lat: 44.0647, lng: -69.7992, radiusKm: 3, category: 'state-preserve' },
  { id: 'me-bowdoinham',         name: 'Bowdoinham Wildlife Management Area',    lat: 43.9958, lng: -69.8731, radiusKm: 3, category: 'state-preserve' },

  // ── Down East ───────────────────────────────────────────────────────────────
  { id: 'me-lamoine',            name: 'Lamoine State Park',                     lat: 44.4550, lng: -68.3006, radiusKm: 2, category: 'state-park' },
  { id: 'me-holbrook-island',    name: 'Holbrook Island Sanctuary',             lat: 44.3553, lng: -68.7969, radiusKm: 3, category: 'state-preserve' },
  { id: 'me-donnell-pond',       name: 'Donnell Pond Public Reserved Land',      lat: 44.5929, lng: -68.1135, radiusKm: 6, category: 'state-forest' },
  { id: 'me-cobscook-bay',       name: 'Cobscook Bay State Park',                lat: 44.8415, lng: -67.1503, radiusKm: 4, category: 'state-park' },
  { id: 'me-cutler-coast',       name: 'Cutler Coast Public Reserved Land',      lat: 44.7065, lng: -67.2030, radiusKm: 5, category: 'state-preserve' },
  { id: 'me-quoddy-head',        name: 'Quoddy Head State Park',                 lat: 44.8070, lng: -66.9675, radiusKm: 2, category: 'state-park' },
  { id: 'me-shackford-head',     name: 'Shackford Head State Park',              lat: 44.9019, lng: -67.0178, radiusKm: 2, category: 'state-park' },
  { id: 'me-roque-bluffs',       name: 'Roque Bluffs State Park',                lat: 44.6150, lng: -67.4878, radiusKm: 2, category: 'state-park' },
  { id: 'me-great-works',        name: 'Great Works Wildlife Management Area',   lat: 44.8781, lng: -67.2778, radiusKm: 4, category: 'state-preserve' },
];
