// North Carolina state parks, forests & natural areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs NC.
// Coast → Sandhills → Piedmont → Southern Appalachians. Cape Hatteras (federal
// National Seashore) excluded. category → state-park 🏞️ · state-forest 🌲 ·
// state-beach 🏖️ · state-preserve 🦋 (natural areas)
export const STATE_PARKS_NC = [
  // ── Coast & Outer Banks ─────────────────────────────────────────────────────
  { id: 'nc-jockeys-ridge',   name: "Jockey's Ridge State Park",     lat: 35.9619, lng: -75.6342, radiusKm: 2, category: 'state-park' },
  { id: 'nc-fort-macon',      name: 'Fort Macon State Park',         lat: 34.6956, lng: -76.6889, radiusKm: 2, category: 'state-park' },
  { id: 'nc-fort-fisher',     name: 'Fort Fisher State Recreation Area', lat: 33.9542, lng: -77.9297, radiusKm: 2, category: 'state-beach' },
  { id: 'nc-carolina-beach',  name: 'Carolina Beach State Park',     lat: 34.0500, lng: -77.9100, radiusKm: 2, category: 'state-park' },
  { id: 'nc-hammocks-beach',  name: 'Hammocks Beach State Park',     lat: 34.6319, lng: -77.1456, radiusKm: 2, category: 'state-beach' },
  { id: 'nc-goose-creek',     name: 'Goose Creek State Park',        lat: 35.4736, lng: -76.9139, radiusKm: 3, category: 'state-park' },
  { id: 'nc-pettigrew',       name: 'Pettigrew State Park',          lat: 35.7972, lng: -76.4219, radiusKm: 4, category: 'state-park' },
  { id: 'nc-merchants-millpond', name: 'Merchants Millpond State Park', lat: 36.4372, lng: -76.6844, radiusKm: 3, category: 'state-park' },
  { id: 'nc-dismal-swamp',    name: 'Dismal Swamp State Park',       lat: 36.5128, lng: -76.4164, radiusKm: 4, category: 'state-park' },
  // ── Coastal Plain lakes ─────────────────────────────────────────────────────
  { id: 'nc-lake-waccamaw',   name: 'Lake Waccamaw State Park',      lat: 34.2593, lng: -78.4681, radiusKm: 3, category: 'state-park' },
  { id: 'nc-lumber-river',    name: 'Lumber River State Park',       lat: 34.3914, lng: -78.9981, radiusKm: 4, category: 'state-park' },
  { id: 'nc-jones-lake',      name: 'Jones Lake State Park',         lat: 34.7083, lng: -78.6417, radiusKm: 2, category: 'state-park' },
  { id: 'nc-singletary-lake', name: 'Singletary Lake State Park',    lat: 34.5986, lng: -78.4583, radiusKm: 2, category: 'state-park' },
  { id: 'nc-bladen-lakes-sf', name: 'Bladen Lakes State Forest',     lat: 34.6883, lng: -78.5944, radiusKm: 5, category: 'state-forest' },
  // ── Sandhills & Piedmont ────────────────────────────────────────────────────
  { id: 'nc-carvers-creek',   name: 'Carvers Creek State Park',      lat: 35.1858, lng: -78.8781, radiusKm: 3, category: 'state-park' },
  { id: 'nc-raven-rock',      name: 'Raven Rock State Park',         lat: 35.4725, lng: -78.9072, radiusKm: 3, category: 'state-park' },
  { id: 'nc-eno-river',       name: 'Eno River State Park',          lat: 36.0567, lng: -78.9811, radiusKm: 3, category: 'state-park' },
  { id: 'nc-umstead',         name: 'William B. Umstead State Park', lat: 35.8536, lng: -78.7431, radiusKm: 3, category: 'state-park' },
  { id: 'nc-haw-river',       name: 'Haw River State Park',          lat: 36.2494, lng: -79.7547, radiusKm: 3, category: 'state-park' },
  { id: 'nc-medoc-mountain',  name: 'Medoc Mountain State Park',     lat: 36.2578, lng: -77.8783, radiusKm: 2, category: 'state-park' },
  { id: 'nc-occoneechee-mtn', name: 'Occoneechee Mountain State Natural Area', lat: 36.0620, lng: -79.1209, radiusKm: 2, category: 'state-preserve' },
  { id: 'nc-mayo-river',      name: 'Mayo River State Park',         lat: 36.4388, lng: -79.9382, radiusKm: 3, category: 'state-park' },
  { id: 'nc-lake-norman',     name: 'Lake Norman State Park',        lat: 35.6683, lng: -80.9411, radiusKm: 3, category: 'state-park' },
  { id: 'nc-crowders-mountain', name: 'Crowders Mountain State Park', lat: 35.2328, lng: -81.2769, radiusKm: 3, category: 'state-park' },
  // ── Southern Appalachians ───────────────────────────────────────────────────
  { id: 'nc-hanging-rock',    name: 'Hanging Rock State Park',       lat: 36.3914, lng: -80.2661, radiusKm: 3, category: 'state-park' },
  { id: 'nc-pilot-mountain',  name: 'Pilot Mountain State Park',     lat: 36.3428, lng: -80.4827, radiusKm: 2, category: 'state-park' },
  { id: 'nc-stone-mountain',  name: 'Stone Mountain State Park',     lat: 36.3986, lng: -81.0622, radiusKm: 3, category: 'state-park' },
  { id: 'nc-new-river',       name: 'New River State Park',          lat: 36.4153, lng: -81.3872, radiusKm: 4, category: 'state-park' },
  { id: 'nc-mount-jefferson', name: 'Mount Jefferson State Natural Area', lat: 36.4008, lng: -81.4625, radiusKm: 2, category: 'state-preserve' },
  { id: 'nc-elk-knob',        name: 'Elk Knob State Park',           lat: 36.3272, lng: -81.6769, radiusKm: 2, category: 'state-park' },
  { id: 'nc-grandfather-mountain', name: 'Grandfather Mountain State Park', lat: 36.1549, lng: -81.7872, radiusKm: 3, category: 'state-park' },
  { id: 'nc-mount-mitchell',  name: 'Mount Mitchell State Park',     lat: 35.7703, lng: -82.2633, radiusKm: 3, category: 'state-park' },
  { id: 'nc-lake-james',      name: 'Lake James State Park',         lat: 35.7339, lng: -81.8892, radiusKm: 3, category: 'state-park' },
  { id: 'nc-south-mountains',  name: 'South Mountains State Park',    lat: 35.5986, lng: -81.6597, radiusKm: 5, category: 'state-park' },
  { id: 'nc-chimney-rock',    name: 'Chimney Rock State Park',       lat: 35.4331, lng: -82.2506, radiusKm: 3, category: 'state-park' },
  { id: 'nc-gorges',          name: 'Gorges State Park',             lat: 35.0700, lng: -82.9211, radiusKm: 4, category: 'state-park' },
  { id: 'nc-dupont-sf',       name: 'DuPont State Recreational Forest', lat: 35.1970, lng: -82.5943, radiusKm: 5, category: 'state-forest' },
  { id: 'nc-pisgah-view',     name: 'Pisgah View State Park',        lat: 35.4686, lng: -82.7689, radiusKm: 3, category: 'state-park' },
];
