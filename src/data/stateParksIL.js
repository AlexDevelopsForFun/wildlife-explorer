// Illinois state parks, forests & natural areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs IL.
// Lake Michigan → the Illinois River canyons & wintering eagles → the Shawnee
// Hills & Cache River cypress swamps. category → state-park 🏞️ · state-forest 🌲 ·
// state-beach 🏖️ · state-preserve 🦋 (natural areas)
export const STATE_PARKS_IL = [
  // ── Northern Illinois ───────────────────────────────────────────────────────
  { id: 'il-illinois-beach', name: 'Illinois Beach State Park',      lat: 42.4172, lng: -87.8117, radiusKm: 3, category: 'state-beach' },
  { id: 'il-chain-o-lakes',  name: "Chain O' Lakes State Park",      lat: 42.4589, lng: -88.1742, radiusKm: 3, category: 'state-park' },
  { id: 'il-moraine-hills',  name: 'Moraine Hills State Park',       lat: 42.3103, lng: -88.2492, radiusKm: 3, category: 'state-park' },
  { id: 'il-volo-bog',       name: 'Volo Bog State Natural Area',    lat: 42.3517, lng: -88.1861, radiusKm: 2, category: 'state-preserve' },
  { id: 'il-rock-cut',       name: 'Rock Cut State Park',            lat: 42.3517, lng: -88.9764, radiusKm: 3, category: 'state-park' },
  { id: 'il-apple-river-canyon', name: 'Apple River Canyon State Park', lat: 42.4461, lng: -90.0525, radiusKm: 2, category: 'state-park' },
  { id: 'il-mississippi-palisades', name: 'Mississippi Palisades State Park', lat: 42.1384, lng: -90.1590, radiusKm: 3, category: 'state-park' },
  { id: 'il-white-pines',    name: 'White Pines Forest State Park',  lat: 41.9956, lng: -89.4686, radiusKm: 2, category: 'state-park' },
  { id: 'il-castle-rock',    name: 'Castle Rock State Park',         lat: 41.9689, lng: -89.3819, radiusKm: 2, category: 'state-park' },
  // ── Illinois River canyons & north-central ──────────────────────────────────
  { id: 'il-starved-rock',   name: 'Starved Rock State Park',        lat: 41.3214, lng: -88.9903, radiusKm: 3, category: 'state-park' },
  { id: 'il-matthiessen',    name: 'Matthiessen State Park',         lat: 41.2956, lng: -89.0253, radiusKm: 2, category: 'state-park' },
  { id: 'il-buffalo-rock',   name: 'Buffalo Rock State Park',        lat: 41.3269, lng: -88.9097, radiusKm: 2, category: 'state-park' },
  { id: 'il-kankakee-river', name: 'Kankakee River State Park',      lat: 41.2131, lng: -88.0231, radiusKm: 4, category: 'state-park' },
  { id: 'il-goose-lake-prairie', name: 'Goose Lake Prairie State Natural Area', lat: 41.3675, lng: -88.2972, radiusKm: 3, category: 'state-preserve' },
  { id: 'il-silver-springs', name: 'Silver Springs State Park',      lat: 41.6275, lng: -88.5225, radiusKm: 3, category: 'state-park' },
  // ── Central Illinois ────────────────────────────────────────────────────────
  { id: 'il-sand-ridge-sf',  name: 'Sand Ridge State Forest',        lat: 40.4114, lng: -89.8661, radiusKm: 6, category: 'state-forest' },
  { id: 'il-jubilee-college', name: 'Jubilee College State Park',    lat: 40.8169, lng: -89.7811, radiusKm: 3, category: 'state-park' },
  { id: 'il-kickapoo',       name: 'Kickapoo State Park',            lat: 40.1167, lng: -87.7358, radiusKm: 3, category: 'state-park' },
  { id: 'il-siloam-springs', name: 'Siloam Springs State Park',      lat: 39.8831, lng: -90.9253, radiusKm: 3, category: 'state-park' },
  { id: 'il-sangchris-lake', name: 'Sangchris Lake State Park',      lat: 39.6508, lng: -89.4725, radiusKm: 3, category: 'state-park' },
  { id: 'il-fox-ridge',      name: 'Fox Ridge State Park',           lat: 39.4033, lng: -88.1531, radiusKm: 2, category: 'state-park' },
  { id: 'il-lincoln-trail',  name: 'Lincoln Trail State Park',       lat: 39.3458, lng: -87.7183, radiusKm: 2, category: 'state-park' },
  // ── West (Illinois & Mississippi confluence) ────────────────────────────────
  { id: 'il-pere-marquette', name: 'Pere Marquette State Park',      lat: 38.9992, lng: -90.5258, radiusKm: 4, category: 'state-park' },
  // ── Southern Illinois (Shawnee Hills & Cache River) ─────────────────────────
  { id: 'il-giant-city',     name: 'Giant City State Park',          lat: 37.6050, lng: -89.1883, radiusKm: 3, category: 'state-park' },
  { id: 'il-ferne-clyffe',   name: 'Ferne Clyffe State Park',        lat: 37.5294, lng: -88.9828, radiusKm: 2, category: 'state-park' },
  { id: 'il-cave-in-rock',   name: 'Cave-in-Rock State Park',        lat: 37.4686, lng: -88.1558, radiusKm: 2, category: 'state-park' },
  { id: 'il-dixon-springs',  name: 'Dixon Springs State Park',       lat: 37.3825, lng: -88.6656, radiusKm: 2, category: 'state-park' },
  { id: 'il-cache-river',    name: 'Cache River State Natural Area', lat: 37.3622, lng: -88.9556, radiusKm: 5, category: 'state-preserve' },
  { id: 'il-beall-woods',    name: 'Beall Woods State Park',         lat: 38.3586, lng: -87.8250, radiusKm: 2, category: 'state-park' },
  { id: 'il-lake-murphysboro', name: 'Lake Murphysboro State Park',  lat: 37.7825, lng: -89.3819, radiusKm: 2, category: 'state-park' },
  { id: 'il-wayne-fitzgerrell', name: 'Wayne Fitzgerrell State Park', lat: 38.1061, lng: -88.9383, radiusKm: 4, category: 'state-park' },
  { id: 'il-trail-of-tears-sf', name: 'Trail of Tears State Forest', lat: 37.5153, lng: -89.3403, radiusKm: 5, category: 'state-forest' },
  { id: 'il-big-river-sf',   name: 'Big River State Forest',         lat: 41.0103, lng: -90.9125, radiusKm: 5, category: 'state-forest' },
];
