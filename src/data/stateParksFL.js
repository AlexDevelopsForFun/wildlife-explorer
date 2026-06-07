// Florida state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs FL
// (Paynes Prairie & Anastasia added via Nominatim). Curated from ~175: the
// spring-fed rivers (manatees, gators), SW Gulf birding, the Keys, both coasts,
// and the panhandle. Everglades/Big Cypress/Biscayne are federal. category →
// state-park 🏞️ · state-forest 🌲 · state-beach 🏖️
export const STATE_PARKS_FL = [
  // ── Spring-fed rivers (manatees, alligators, wading birds) ──────────────────
  { id: 'fl-wakulla-springs', name: 'Edward Ball Wakulla Springs State Park', lat: 30.2328, lng: -84.2922, radiusKm: 3, category: 'state-park' },
  { id: 'fl-blue-spring',    name: 'Blue Spring State Park',         lat: 28.9481, lng: -81.3400, radiusKm: 2, category: 'state-park' },
  { id: 'fl-silver-springs', name: 'Silver Springs State Park',      lat: 29.2011, lng: -82.0536, radiusKm: 3, category: 'state-park' },
  { id: 'fl-rainbow-springs', name: 'Rainbow Springs State Park',    lat: 29.1027, lng: -82.4370, radiusKm: 2, category: 'state-park' },
  { id: 'fl-ichetucknee-springs', name: 'Ichetucknee Springs State Park', lat: 29.9674, lng: -82.7761, radiusKm: 3, category: 'state-park' },
  { id: 'fl-manatee-springs', name: 'Manatee Springs State Park',    lat: 29.4904, lng: -82.9771, radiusKm: 2, category: 'state-park' },
  { id: 'fl-homosassa-springs', name: 'Homosassa Springs Wildlife State Park', lat: 28.8000, lng: -82.5881, radiusKm: 2, category: 'state-park' },
  { id: 'fl-wekiwa-springs', name: 'Wekiwa Springs State Park',      lat: 28.7700, lng: -81.5011, radiusKm: 4, category: 'state-park' },
  { id: 'fl-crystal-river',  name: 'Crystal River Preserve State Park', lat: 28.9164, lng: -82.6236, radiusKm: 4, category: 'state-park' },
  // ── Southwest Gulf coast & heartland (premier birding) ──────────────────────
  { id: 'fl-myakka-river',   name: 'Myakka River State Park',        lat: 27.2394, lng: -82.3167, radiusKm: 6, category: 'state-park' },
  { id: 'fl-oscar-scherer',  name: 'Oscar Scherer State Park',       lat: 27.1750, lng: -82.4661, radiusKm: 3, category: 'state-park' },
  { id: 'fl-collier-seminole', name: 'Collier-Seminole State Park',  lat: 25.9761, lng: -81.6039, radiusKm: 4, category: 'state-park' },
  { id: 'fl-cayo-costa',     name: 'Cayo Costa State Park',          lat: 26.6719, lng: -82.2469, radiusKm: 3, category: 'state-park' },
  { id: 'fl-lovers-key',     name: 'Lovers Key State Park',          lat: 26.3939, lng: -81.8789, radiusKm: 2, category: 'state-park' },
  { id: 'fl-delnor-wiggins', name: 'Delnor-Wiggins Pass State Park', lat: 26.2811, lng: -81.8281, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-gasparilla-island', name: 'Gasparilla Island State Park', lat: 26.7340, lng: -82.2605, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-highlands-hammock', name: 'Highlands Hammock State Park', lat: 27.4711, lng: -81.5419, radiusKm: 3, category: 'state-park' },
  { id: 'fl-lake-kissimmee', name: 'Lake Kissimmee State Park',      lat: 27.9581, lng: -81.3750, radiusKm: 4, category: 'state-park' },
  // ── Tampa Bay & central west ────────────────────────────────────────────────
  { id: 'fl-honeymoon-island', name: 'Honeymoon Island State Park',  lat: 28.0613, lng: -82.8265, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-caladesi-island', name: 'Caladesi Island State Park',    lat: 28.0200, lng: -82.8211, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-hillsborough-river', name: 'Hillsborough River State Park', lat: 28.1039, lng: -82.2781, radiusKm: 3, category: 'state-park' },
  { id: 'fl-egmont-key',     name: 'Egmont Key State Park',          lat: 27.5900, lng: -82.7628, radiusKm: 2, category: 'state-park' },
  // ── Central peninsula ───────────────────────────────────────────────────────
  { id: 'fl-paynes-prairie', name: 'Paynes Prairie Preserve State Park', lat: 29.5724, lng: -82.2943, radiusKm: 5, category: 'state-park' },
  { id: 'fl-lake-louisa',    name: 'Lake Louisa State Park',         lat: 28.4669, lng: -81.7581, radiusKm: 4, category: 'state-park' },
  { id: 'fl-hontoon-island', name: 'Hontoon Island State Park',      lat: 28.9669, lng: -81.3631, radiusKm: 2, category: 'state-park' },
  // ── Atlantic coast ──────────────────────────────────────────────────────────
  { id: 'fl-sebastian-inlet', name: 'Sebastian Inlet State Park',    lat: 27.8514, lng: -80.4447, radiusKm: 2, category: 'state-park' },
  { id: 'fl-st-sebastian-river', name: 'St. Sebastian River Preserve State Park', lat: 27.8275, lng: -80.5603, radiusKm: 4, category: 'state-park' },
  { id: 'fl-jonathan-dickinson', name: 'Jonathan Dickinson State Park', lat: 27.0061, lng: -80.1289, radiusKm: 5, category: 'state-park' },
  { id: 'fl-macarthur-beach', name: 'John D. MacArthur Beach State Park', lat: 26.8311, lng: -80.0461, radiusKm: 2, category: 'state-park' },
  { id: 'fl-bill-baggs',     name: 'Bill Baggs Cape Florida State Park', lat: 25.6736, lng: -80.1594, radiusKm: 2, category: 'state-park' },
  { id: 'fl-anastasia',      name: 'Anastasia State Park',           lat: 29.8839, lng: -81.2765, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-fort-clinch',    name: 'Fort Clinch State Park',         lat: 30.7047, lng: -81.4545, radiusKm: 2, category: 'state-park' },
  { id: 'fl-little-talbot',  name: 'Little Talbot Island State Park', lat: 30.4519, lng: -81.4189, radiusKm: 2, category: 'state-park' },
  { id: 'fl-tomoka',         name: 'Tomoka State Park',              lat: 29.3319, lng: -81.0811, radiusKm: 2, category: 'state-park' },
  { id: 'fl-faver-dykes',    name: 'Faver-Dykes State Park',         lat: 29.6761, lng: -81.2481, radiusKm: 2, category: 'state-park' },
  // ── The Keys ────────────────────────────────────────────────────────────────
  { id: 'fl-john-pennekamp', name: 'John Pennekamp Coral Reef State Park', lat: 25.1207, lng: -80.4045, radiusKm: 3, category: 'state-park' },
  { id: 'fl-bahia-honda',    name: 'Bahia Honda State Park',         lat: 24.6632, lng: -81.2637, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-long-key',       name: 'Long Key State Park',            lat: 24.8169, lng: -80.8200, radiusKm: 2, category: 'state-park' },
  { id: 'fl-curry-hammock',  name: 'Curry Hammock State Park',       lat: 24.7413, lng: -80.9808, radiusKm: 2, category: 'state-park' },
  // ── Panhandle (Gulf beaches) ────────────────────────────────────────────────
  { id: 'fl-st-andrews',     name: 'St. Andrews State Park',         lat: 30.1346, lng: -85.7440, radiusKm: 2, category: 'state-park' },
  { id: 'fl-st-joseph-peninsula', name: 'St. Joseph Peninsula State Park', lat: 29.7552, lng: -85.3954, radiusKm: 3, category: 'state-beach' },
  { id: 'fl-st-george-island', name: 'St. George Island State Park',  lat: 29.7252, lng: -84.7374, radiusKm: 3, category: 'state-beach' },
  { id: 'fl-grayton-beach',  name: 'Grayton Beach State Park',       lat: 30.3039, lng: -86.0789, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-topsail-hill',   name: 'Topsail Hill Preserve State Park', lat: 30.3669, lng: -86.2989, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-henderson-beach', name: 'Henderson Beach State Park',    lat: 30.3939, lng: -86.5831, radiusKm: 2, category: 'state-beach' },
  { id: 'fl-big-lagoon',     name: 'Big Lagoon State Park',          lat: 30.3208, lng: -87.4031, radiusKm: 2, category: 'state-park' },
  // ── Panhandle interior ──────────────────────────────────────────────────────
  { id: 'fl-florida-caverns', name: 'Florida Caverns State Park',    lat: 30.8139, lng: -85.2331, radiusKm: 3, category: 'state-park' },
  { id: 'fl-torreya',        name: 'Torreya State Park',             lat: 30.5689, lng: -84.9481, radiusKm: 3, category: 'state-park' },
  { id: 'fl-suwannee-river', name: 'Suwannee River State Park',      lat: 30.3788, lng: -83.1658, radiusKm: 3, category: 'state-park' },
  { id: 'fl-three-rivers',   name: 'Three Rivers State Park',        lat: 30.7398, lng: -84.9349, radiusKm: 3, category: 'state-park' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'fl-myakka-sf',      name: 'Myakka State Forest',            lat: 26.9801, lng: -82.2811, radiusKm: 4, category: 'state-forest' },
  { id: 'fl-wakulla-sf',     name: 'Wakulla State Forest',           lat: 30.2429, lng: -84.2798, radiusKm: 4, category: 'state-forest' },
];
