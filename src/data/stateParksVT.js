// Vermont state parks, forests & WMAs — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of VT
// "State Park / State Forest / Wildlife Management Area" (165 raw units), curated
// to the wildlife destinations across every region (Lake Champlain, the Green
// Mountains, central VT, the Groton forest block, the Northeast Kingdom, and the
// southern lakes). Dropped: dups (Coolidge SP/SF, Camels Hump SP/SF, Quechee ×3,
// Emerald Lake/Molly Stark/Townshend SP+SF twins), Groton sub-campgrounds
// (Stillwater, Big Deer, New Discovery, Ricker Pond, Boulder Beach — folded into
// Groton SF + Kettle Pond), and small/duplicate Champlain units. Grand Isle SP,
// Camel's Hump, and Wilgus SP were re-geocoded via Nominatim (Wikidata held
// stray coordinates copied from Button Bay / the forest / Lake St. Catherine).
// Dead Creek WMA — VT's premier waterfowl & snow-goose staging area — included.
// Vermont is landlocked, so there is no beach category.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 · state-preserve 🦋 (WMAs)
// radiusKm is the fallback search radius; parks with an iNat place_id query the real boundary.

export const STATE_PARKS_VT = [
  // ── Lake Champlain (waterfowl, islands, Champlain Valley) ────────────────────
  { id: 'vt-mount-philo',        name: 'Mount Philo State Park',                 lat: 44.2786, lng: -73.2164, radiusKm: 2, category: 'state-park' },
  { id: 'vt-button-bay',         name: 'Button Bay State Park',                  lat: 44.1830, lng: -73.3504, radiusKm: 2, category: 'state-park' },
  { id: 'vt-kingsland-bay',      name: 'Kingsland Bay State Park',               lat: 44.2360, lng: -73.3040, radiusKm: 2, category: 'state-park' },
  { id: 'vt-dar',                name: 'D.A.R. State Park',                      lat: 44.0534, lng: -73.4123, radiusKm: 2, category: 'state-park' },
  { id: 'vt-sand-bar',           name: 'Sand Bar State Park',                    lat: 44.6271, lng: -73.2399, radiusKm: 2, category: 'state-park' },
  { id: 'vt-niquette-bay',       name: 'Niquette Bay State Park',                lat: 44.5919, lng: -73.1900, radiusKm: 2, category: 'state-park' },
  { id: 'vt-grand-isle',         name: 'Grand Isle State Park',                  lat: 44.6878, lng: -73.2953, radiusKm: 2, category: 'state-park' },
  { id: 'vt-north-hero',         name: 'North Hero State Park',                  lat: 44.9090, lng: -73.2370, radiusKm: 3, category: 'state-park' },
  { id: 'vt-knight-point',       name: 'Knight Point State Park',                lat: 44.7714, lng: -73.2942, radiusKm: 2, category: 'state-park' },
  { id: 'vt-burton-island',      name: 'Burton Island State Park',              lat: 44.7725, lng: -73.2049, radiusKm: 2, category: 'state-park' },
  { id: 'vt-alburg-dunes',       name: 'Alburg Dunes State Park',               lat: 44.8758, lng: -73.2925, radiusKm: 2, category: 'state-park' },
  { id: 'vt-kill-kare',          name: 'Kill Kare State Park',                  lat: 44.7792, lng: -73.1826, radiusKm: 2, category: 'state-park' },
  { id: 'vt-saint-albans-bay',   name: 'Saint Albans Bay State Park',           lat: 44.8108, lng: -73.1444, radiusKm: 2, category: 'state-park' },

  // ── Green Mountains (peaks, notches, alpine) ─────────────────────────────────
  { id: 'vt-mount-mansfield-sf', name: 'Mount Mansfield State Forest',          lat: 44.5438, lng: -72.8143, radiusKm: 7, category: 'state-forest' },
  { id: 'vt-underhill',          name: 'Underhill State Park',                  lat: 44.5305, lng: -72.8331, radiusKm: 2, category: 'state-park' },
  { id: 'vt-smugglers-notch',    name: "Smugglers' Notch State Park",           lat: 44.5536, lng: -72.7961, radiusKm: 3, category: 'state-park' },
  { id: 'vt-camels-hump',        name: "Camel's Hump State Park",               lat: 44.3196, lng: -72.8863, radiusKm: 5, category: 'state-park' },
  { id: 'vt-ascutney',           name: 'Ascutney State Park',                   lat: 43.4419, lng: -72.4392, radiusKm: 3, category: 'state-park' },
  { id: 'vt-coolidge-sf',        name: 'Calvin Coolidge State Forest',          lat: 43.5834, lng: -72.9285, radiusKm: 6, category: 'state-forest' },
  { id: 'vt-okemo-sf',           name: 'Okemo State Forest',                    lat: 43.3992, lng: -72.7520, radiusKm: 4, category: 'state-forest' },
  { id: 'vt-gifford-woods',      name: 'Gifford Woods State Park',              lat: 43.6762, lng: -72.8109, radiusKm: 2, category: 'state-park' },
  { id: 'vt-jay-sf',             name: 'Jay State Forest',                      lat: 44.9250, lng: -72.5246, radiusKm: 4, category: 'state-forest' },
  { id: 'vt-hazens-notch',       name: "Hazen's Notch State Park",              lat: 44.8444, lng: -72.5204, radiusKm: 3, category: 'state-park' },

  // ── Waterbury & central Vermont ─────────────────────────────────────────────
  { id: 'vt-little-river',       name: 'Little River State Park',               lat: 44.3899, lng: -72.7672, radiusKm: 4, category: 'state-park' },
  { id: 'vt-waterbury-center',   name: 'Waterbury Center State Park',           lat: 44.3818, lng: -72.7296, radiusKm: 2, category: 'state-park' },
  { id: 'vt-elmore',            name: 'Elmore State Park',                     lat: 44.5356, lng: -72.5404, radiusKm: 3, category: 'state-park' },
  { id: 'vt-green-river-reservoir', name: 'Green River Reservoir State Park',   lat: 44.6218, lng: -72.5268, radiusKm: 4, category: 'state-park' },
  { id: 'vt-mollys-falls-pond',  name: "Molly's Falls Pond State Park",         lat: 44.3634, lng: -72.3036, radiusKm: 2, category: 'state-park' },

  // ── Groton State Forest block ───────────────────────────────────────────────
  { id: 'vt-groton-sf',          name: 'Groton State Forest',                   lat: 44.2758, lng: -72.2794, radiusKm: 6, category: 'state-forest' },
  { id: 'vt-kettle-pond',        name: 'Kettle Pond State Park',                lat: 44.2944, lng: -72.3078, radiusKm: 2, category: 'state-park' },

  // ── Northeast Kingdom (loons, boreal, moose) ────────────────────────────────
  { id: 'vt-maidstone',          name: 'Maidstone State Park',                  lat: 44.6387, lng: -71.6434, radiusKm: 3, category: 'state-park' },
  { id: 'vt-brighton',           name: 'Brighton State Park',                   lat: 44.7980, lng: -71.8550, radiusKm: 3, category: 'state-park' },
  { id: 'vt-crystal-lake',       name: 'Crystal Lake State Park',               lat: 44.7461, lng: -72.1712, radiusKm: 2, category: 'state-park' },
  { id: 'vt-lake-carmi',         name: 'Lake Carmi State Park',                 lat: 44.9569, lng: -72.8756, radiusKm: 3, category: 'state-park' },
  { id: 'vt-willoughby-sf',      name: 'Willoughby State Forest',               lat: 44.7037, lng: -72.1137, radiusKm: 5, category: 'state-forest' },
  { id: 'vt-victory-sf',         name: 'Victory State Forest',                  lat: 44.5481, lng: -71.8278, radiusKm: 6, category: 'state-forest' },
  { id: 'vt-sentinel-rock',      name: 'Sentinel Rock State Park',              lat: 44.7935, lng: -72.0325, radiusKm: 2, category: 'state-park' },

  // ── Southern Vermont ────────────────────────────────────────────────────────
  { id: 'vt-jamaica',            name: 'Jamaica State Park',                    lat: 43.1057, lng: -72.7734, radiusKm: 3, category: 'state-park' },
  { id: 'vt-townshend',          name: 'Townshend State Park',                  lat: 43.0409, lng: -72.6924, radiusKm: 3, category: 'state-park' },
  { id: 'vt-molly-stark',        name: 'Molly Stark State Park',                lat: 42.8508, lng: -72.8098, radiusKm: 2, category: 'state-park' },
  { id: 'vt-woodford',           name: 'Woodford State Park',                   lat: 42.8908, lng: -73.0375, radiusKm: 3, category: 'state-park' },
  { id: 'vt-fort-dummer',        name: 'Fort Dummer State Park',                lat: 42.8194, lng: -72.5628, radiusKm: 2, category: 'state-park' },
  { id: 'vt-emerald-lake',       name: 'Emerald Lake State Park',               lat: 43.2798, lng: -73.0098, radiusKm: 2, category: 'state-park' },
  { id: 'vt-lake-shaftsbury',    name: 'Lake Shaftsbury State Park',            lat: 43.0225, lng: -73.1835, radiusKm: 2, category: 'state-park' },
  { id: 'vt-lake-st-catherine',  name: 'Lake St. Catherine State Park',         lat: 43.4803, lng: -73.2047, radiusKm: 2, category: 'state-park' },
  { id: 'vt-bomoseen',           name: 'Bomoseen State Park',                   lat: 43.6580, lng: -73.2290, radiusKm: 3, category: 'state-park' },
  { id: 'vt-half-moon-pond',     name: 'Half Moon Pond State Park',             lat: 43.6990, lng: -73.2230, radiusKm: 2, category: 'state-park' },
  { id: 'vt-branbury',           name: 'Branbury State Park',                   lat: 43.9060, lng: -73.0667, radiusKm: 2, category: 'state-park' },
  { id: 'vt-silver-lake',        name: 'Silver Lake State Park',                lat: 43.7322, lng: -72.6167, radiusKm: 2, category: 'state-park' },
  { id: 'vt-quechee',            name: 'Quechee State Park',                    lat: 43.6368, lng: -72.4005, radiusKm: 2, category: 'state-park' },
  { id: 'vt-wilgus',             name: 'Wilgus State Park',                     lat: 43.3909, lng: -72.4079, radiusKm: 2, category: 'state-park' },

  // ── Wildlife Management Area ────────────────────────────────────────────────
  { id: 'vt-dead-creek',         name: 'Dead Creek Wildlife Management Area',   lat: 44.0092, lng: -73.3369, radiusKm: 4, category: 'state-preserve' },
];
