// Tennessee state parks, forests & natural areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs TN.
// Mississippi River bottoms → Middle TN → Cumberland Plateau → East TN mountains.
// category → state-park 🏞️ · state-forest 🌲 · state-preserve 🦋
export const STATE_PARKS_TN = [
  // ── West TN & Mississippi River ─────────────────────────────────────────────
  { id: 'tn-reelfoot-lake',  name: 'Reelfoot Lake State Park',       lat: 36.3932, lng: -89.3802, radiusKm: 5, category: 'state-park' },
  { id: 'tn-meeman-shelby',  name: 'Meeman-Shelby Forest State Park', lat: 35.3436, lng: -90.0604, radiusKm: 4, category: 'state-park' },
  { id: 'tn-fort-pillow',    name: 'Fort Pillow State Park',         lat: 35.6361, lng: -89.8422, radiusKm: 3, category: 'state-park' },
  { id: 'tn-chickasaw',      name: 'Chickasaw State Park',           lat: 35.3654, lng: -88.8295, radiusKm: 3, category: 'state-park' },
  { id: 'tn-big-hill-pond',  name: 'Big Hill Pond State Park',       lat: 35.0503, lng: -88.7278, radiusKm: 3, category: 'state-park' },
  { id: 'tn-natchez-trace',  name: 'Natchez Trace State Park',       lat: 35.7863, lng: -88.2636, radiusKm: 5, category: 'state-park' },
  { id: 'tn-pickwick-landing', name: 'Pickwick Landing State Park',  lat: 35.0554, lng: -88.2395, radiusKm: 3, category: 'state-park' },
  { id: 'tn-paris-landing',  name: 'Paris Landing State Park',       lat: 36.4350, lng: -88.0860, radiusKm: 3, category: 'state-park' },
  // ── Middle Tennessee ────────────────────────────────────────────────────────
  { id: 'tn-radnor-lake',    name: 'Radnor Lake State Natural Area', lat: 36.0619, lng: -86.8075, radiusKm: 2, category: 'state-preserve' },
  { id: 'tn-long-hunter',    name: 'Long Hunter State Park',         lat: 36.0950, lng: -86.5318, radiusKm: 3, category: 'state-park' },
  { id: 'tn-cedars-of-lebanon', name: 'Cedars of Lebanon State Park', lat: 36.0737, lng: -86.3115, radiusKm: 3, category: 'state-park' },
  { id: 'tn-montgomery-bell', name: 'Montgomery Bell State Park',    lat: 36.0900, lng: -87.2733, radiusKm: 3, category: 'state-park' },
  { id: 'tn-harpeth-river',  name: 'Harpeth River State Park',       lat: 36.1466, lng: -87.1207, radiusKm: 4, category: 'state-park' },
  { id: 'tn-bledsoe-creek',  name: 'Bledsoe Creek State Park',       lat: 36.3791, lng: -86.3568, radiusKm: 2, category: 'state-park' },
  { id: 'tn-tims-ford',      name: 'Tims Ford State Park',           lat: 35.2196, lng: -86.2506, radiusKm: 3, category: 'state-park' },
  { id: 'tn-david-crockett', name: 'David Crockett State Park',      lat: 35.2629, lng: -87.3617, radiusKm: 2, category: 'state-park' },
  { id: 'tn-natchez-trace-sf', name: 'Natchez Trace State Forest',   lat: 35.8333, lng: -88.2583, radiusKm: 6, category: 'state-forest' },
  // ── Cumberland Plateau ──────────────────────────────────────────────────────
  { id: 'tn-fall-creek-falls', name: 'Fall Creek Falls State Park',  lat: 35.6621, lng: -85.3498, radiusKm: 5, category: 'state-park' },
  { id: 'tn-south-cumberland', name: 'South Cumberland State Park',  lat: 35.2590, lng: -85.7890, radiusKm: 5, category: 'state-park' },
  { id: 'tn-savage-gulf',    name: 'Savage Gulf State Natural Area', lat: 35.4556, lng: -85.6208, radiusKm: 4, category: 'state-preserve' },
  { id: 'tn-cumberland-mountain', name: 'Cumberland Mountain State Park', lat: 35.9179, lng: -85.0130, radiusKm: 3, category: 'state-park' },
  { id: 'tn-frozen-head',    name: 'Frozen Head State Park',         lat: 36.1264, lng: -84.5014, radiusKm: 4, category: 'state-park' },
  { id: 'tn-cummins-falls',  name: 'Cummins Falls State Park',       lat: 36.2536, lng: -85.5648, radiusKm: 2, category: 'state-park' },
  { id: 'tn-burgess-falls',  name: 'Burgess Falls State Park',       lat: 36.0442, lng: -85.5942, radiusKm: 2, category: 'state-park' },
  { id: 'tn-pickett',        name: 'Pickett State Park',             lat: 36.5664, lng: -84.8042, radiusKm: 3, category: 'state-park' },
  { id: 'tn-norris-dam',     name: 'Norris Dam State Park',          lat: 36.2396, lng: -84.1094, radiusKm: 3, category: 'state-park' },
  { id: 'tn-big-ridge',      name: 'Big Ridge State Park',           lat: 36.2600, lng: -83.9225, radiusKm: 3, category: 'state-park' },
  { id: 'tn-prentice-cooper-sf', name: 'Prentice Cooper State Forest', lat: 35.1450, lng: -85.3597, radiusKm: 6, category: 'state-forest' },
  // ── East Tennessee mountains ────────────────────────────────────────────────
  { id: 'tn-roan-mountain',  name: 'Roan Mountain State Park',       lat: 36.1689, lng: -82.1008, radiusKm: 4, category: 'state-park' },
  { id: 'tn-warriors-path',  name: "Warriors' Path State Park",      lat: 36.4914, lng: -82.4839, radiusKm: 3, category: 'state-park' },
  { id: 'tn-panther-creek',  name: 'Panther Creek State Park',       lat: 36.2130, lng: -83.4070, radiusKm: 3, category: 'state-park' },
  { id: 'tn-rocky-fork',     name: 'Lamar Alexander Rocky Fork State Park', lat: 36.0508, lng: -82.5711, radiusKm: 4, category: 'state-park' },
  { id: 'tn-davy-crockett-birthplace', name: 'Davy Crockett Birthplace State Park', lat: 36.2043, lng: -82.6561, radiusKm: 2, category: 'state-park' },
  { id: 'tn-harrison-bay',   name: 'Harrison Bay State Park',        lat: 35.1764, lng: -85.1186, radiusKm: 3, category: 'state-park' },
  { id: 'tn-booker-t-washington', name: 'Booker T. Washington State Park', lat: 35.1089, lng: -85.1761, radiusKm: 2, category: 'state-park' },
  { id: 'tn-red-clay',       name: 'Red Clay State Park',            lat: 34.9931, lng: -84.9472, radiusKm: 2, category: 'state-park' },
];
