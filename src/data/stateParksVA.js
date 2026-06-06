// Virginia state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs VA.
// Spans the Tidewater/Eastern Shore coast, the Piedmont, the Blue Ridge, and the
// Southwest Virginia highlands. category → state-park 🏞️ · state-beach 🏖️
export const STATE_PARKS_VA = [
  // ── Tidewater coast & Eastern Shore ─────────────────────────────────────────
  { id: 'va-first-landing',  name: 'First Landing State Park',       lat: 36.9061, lng: -76.0153, radiusKm: 3, category: 'state-beach' },
  { id: 'va-false-cape',     name: 'False Cape State Park',          lat: 36.5878, lng: -75.8842, radiusKm: 3, category: 'state-beach' },
  { id: 'va-kiptopeke',      name: 'Kiptopeke State Park',           lat: 37.1694, lng: -75.9794, radiusKm: 2, category: 'state-park' },
  { id: 'va-machicomoco',    name: 'Machicomoco State Park',         lat: 37.3112, lng: -76.5418, radiusKm: 2, category: 'state-park' },
  { id: 'va-york-river',     name: 'York River State Park',          lat: 37.4053, lng: -76.7139, radiusKm: 3, category: 'state-park' },
  { id: 'va-chippokes',      name: 'Chippokes State Park',           lat: 37.1367, lng: -76.7275, radiusKm: 2, category: 'state-park' },
  { id: 'va-belle-isle',     name: 'Belle Isle State Park',          lat: 37.7744, lng: -76.5994, radiusKm: 2, category: 'state-park' },
  { id: 'va-westmoreland',   name: 'Westmoreland State Park',        lat: 38.1625, lng: -76.8661, radiusKm: 3, category: 'state-park' },
  { id: 'va-caledon',        name: 'Caledon State Park',             lat: 38.3525, lng: -77.1328, radiusKm: 3, category: 'state-park' },
  { id: 'va-leesylvania',    name: 'Leesylvania State Park',         lat: 38.5900, lng: -77.2556, radiusKm: 2, category: 'state-park' },
  { id: 'va-mason-neck',     name: 'Mason Neck State Park',          lat: 38.6566, lng: -77.1894, radiusKm: 2, category: 'state-park' },
  { id: 'va-widewater',      name: 'Widewater State Park',           lat: 38.4269, lng: -77.3350, radiusKm: 2, category: 'state-park' },
  // ── Piedmont & central ──────────────────────────────────────────────────────
  { id: 'va-pocahontas',     name: 'Pocahontas State Park',          lat: 37.3748, lng: -77.5718, radiusKm: 4, category: 'state-park' },
  { id: 'va-powhatan',       name: 'Powhatan State Park',            lat: 37.6597, lng: -77.9228, radiusKm: 3, category: 'state-park' },
  { id: 'va-james-river',    name: 'James River State Park',         lat: 37.6222, lng: -78.8172, radiusKm: 4, category: 'state-park' },
  { id: 'va-bear-creek-lake', name: 'Bear Creek Lake State Park',    lat: 37.5317, lng: -78.2725, radiusKm: 2, category: 'state-park' },
  { id: 'va-holliday-lake',  name: 'Holliday Lake State Park',       lat: 37.3972, lng: -78.6408, radiusKm: 2, category: 'state-park' },
  { id: 'va-twin-lakes',     name: 'Twin Lakes State Park',          lat: 37.1739, lng: -78.2736, radiusKm: 2, category: 'state-park' },
  { id: 'va-lake-anna',      name: 'Lake Anna State Park',           lat: 38.1186, lng: -77.8200, radiusKm: 3, category: 'state-park' },
  { id: 'va-high-bridge-trail', name: 'High Bridge Trail State Park', lat: 37.3113, lng: -78.3183, radiusKm: 5, category: 'state-park' },
  // ── Southside ───────────────────────────────────────────────────────────────
  { id: 'va-occoneechee',    name: 'Occoneechee State Park',         lat: 36.6186, lng: -78.5069, radiusKm: 3, category: 'state-park' },
  { id: 'va-staunton-river', name: 'Staunton River State Park',      lat: 36.6961, lng: -78.6853, radiusKm: 3, category: 'state-park' },
  { id: 'va-mayo-river',     name: 'Mayo River State Park',          lat: 36.5549, lng: -79.9998, radiusKm: 2, category: 'state-park' },
  // ── Blue Ridge & Shenandoah ─────────────────────────────────────────────────
  { id: 'va-sky-meadows',    name: 'Sky Meadows State Park',         lat: 38.9847, lng: -77.9586, radiusKm: 3, category: 'state-park' },
  { id: 'va-shenandoah-river', name: 'Shenandoah River State Park',  lat: 38.8556, lng: -78.3033, radiusKm: 3, category: 'state-park' },
  { id: 'va-seven-bends',    name: 'Seven Bends State Park',         lat: 38.8548, lng: -78.4904, radiusKm: 3, category: 'state-park' },
  { id: 'va-douthat',        name: 'Douthat State Park',             lat: 37.8975, lng: -79.8111, radiusKm: 4, category: 'state-park' },
  { id: 'va-fairy-stone',    name: 'Fairy Stone State Park',         lat: 36.7847, lng: -80.0961, radiusKm: 3, category: 'state-park' },
  // ── Southwest highlands ─────────────────────────────────────────────────────
  { id: 'va-smith-mountain-lake', name: 'Smith Mountain Lake State Park', lat: 37.0967, lng: -79.5942, radiusKm: 3, category: 'state-park' },
  { id: 'va-claytor-lake',   name: 'Claytor Lake State Park',        lat: 37.0589, lng: -80.6283, radiusKm: 3, category: 'state-park' },
  { id: 'va-new-river-trail', name: 'New River Trail State Park',    lat: 36.8847, lng: -80.8525, radiusKm: 6, category: 'state-park' },
  { id: 'va-grayson-highlands', name: 'Grayson Highlands State Park', lat: 36.6292, lng: -81.5146, radiusKm: 4, category: 'state-park' },
  { id: 'va-hungry-mother',  name: 'Hungry Mother State Park',       lat: 36.8811, lng: -81.5347, radiusKm: 3, category: 'state-park' },
  { id: 'va-natural-tunnel', name: 'Natural Tunnel State Park',      lat: 36.7030, lng: -82.7430, radiusKm: 3, category: 'state-park' },
  { id: 'va-wilderness-road', name: 'Wilderness Road State Park',    lat: 36.6339, lng: -83.5236, radiusKm: 3, category: 'state-park' },
];
