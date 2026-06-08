// Texas state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs TX.
// Palo Duro & the Panhandle canyons (bison) → the East Texas Pineywoods & Caddo
// cypress → the Hill Country rivers & golden-cheeked warbler country → the Gulf
// coast (whooping cranes, gators) → the Rio Grande Valley World Birding Centers →
// the Chihuahuan desert & sky islands. Big Bend NP & Padre Island NS are FEDERAL
// (excluded). category → state-park 🏞️ · state-preserve 🦋 (state natural areas)
export const STATE_PARKS_TX = [
  // ── Panhandle & North Texas ─────────────────────────────────────────────────
  { id: 'tx-palo-duro-canyon', name: 'Palo Duro Canyon State Park',  lat: 34.9333, lng: -101.6625, radiusKm: 6, category: 'state-park' },
  { id: 'tx-caprock-canyons', name: 'Caprock Canyons State Park',    lat: 34.4437, lng: -101.0521, radiusKm: 5, category: 'state-park' },
  { id: 'tx-copper-breaks',  name: 'Copper Breaks State Park',       lat: 34.1114, lng: -99.7525, radiusKm: 3, category: 'state-park' },
  { id: 'tx-possum-kingdom', name: 'Possum Kingdom State Park',      lat: 32.8694, lng: -98.5611, radiusKm: 4, category: 'state-park' },
  { id: 'tx-dinosaur-valley', name: 'Dinosaur Valley State Park',    lat: 32.2533, lng: -97.8186, radiusKm: 3, category: 'state-park' },
  // ── East Texas (Pineywoods & Big Thicket) ───────────────────────────────────
  { id: 'tx-caddo-lake',     name: 'Caddo Lake State Park',          lat: 32.6908, lng: -94.1792, radiusKm: 4, category: 'state-park' },
  { id: 'tx-martin-dies',    name: 'Martin Dies, Jr. State Park',    lat: 30.8567, lng: -94.1736, radiusKm: 4, category: 'state-park' },
  { id: 'tx-village-creek',  name: 'Village Creek State Park',       lat: 30.2551, lng: -94.1710, radiusKm: 3, category: 'state-park' },
  { id: 'tx-huntsville',     name: 'Huntsville State Park',          lat: 30.6181, lng: -95.5264, radiusKm: 3, category: 'state-park' },
  // ── Hill Country (Edwards Plateau) ──────────────────────────────────────────
  { id: 'tx-enchanted-rock', name: 'Enchanted Rock State Natural Area', lat: 30.5064, lng: -98.8186, radiusKm: 3, category: 'state-preserve' },
  { id: 'tx-pedernales-falls', name: 'Pedernales Falls State Park',  lat: 30.3000, lng: -98.2417, radiusKm: 4, category: 'state-park' },
  { id: 'tx-lost-maples',    name: 'Lost Maples State Natural Area', lat: 29.8197, lng: -99.5831, radiusKm: 3, category: 'state-preserve' },
  { id: 'tx-garner',         name: 'Garner State Park',              lat: 29.5833, lng: -99.7389, radiusKm: 3, category: 'state-park' },
  { id: 'tx-guadalupe-river', name: 'Guadalupe River State Park',    lat: 29.8747, lng: -98.5044, radiusKm: 4, category: 'state-park' },
  { id: 'tx-colorado-bend',  name: 'Colorado Bend State Park',       lat: 31.0539, lng: -98.4922, radiusKm: 4, category: 'state-park' },
  { id: 'tx-inks-lake',      name: 'Inks Lake State Park',           lat: 30.7311, lng: -98.3706, radiusKm: 3, category: 'state-park' },
  { id: 'tx-south-llano-river', name: 'South Llano River State Park', lat: 30.4468, lng: -99.8053, radiusKm: 3, category: 'state-park' },
  { id: 'tx-government-canyon', name: 'Government Canyon State Natural Area', lat: 29.5480, lng: -98.7650, radiusKm: 4, category: 'state-preserve' },
  { id: 'tx-palmetto',       name: 'Palmetto State Park',            lat: 29.5872, lng: -97.5822, radiusKm: 2, category: 'state-park' },
  // ── Gulf Coast ──────────────────────────────────────────────────────────────
  { id: 'tx-goose-island',   name: 'Goose Island State Park',        lat: 28.1336, lng: -96.9843, radiusKm: 3, category: 'state-park' },
  { id: 'tx-mustang-island', name: 'Mustang Island State Park',      lat: 27.6753, lng: -97.1769, radiusKm: 4, category: 'state-park' },
  { id: 'tx-galveston-island', name: 'Galveston Island State Park',  lat: 29.2011, lng: -94.9603, radiusKm: 3, category: 'state-park' },
  { id: 'tx-sea-rim',        name: 'Sea Rim State Park',             lat: 29.6994, lng: -94.0256, radiusKm: 4, category: 'state-park' },
  { id: 'tx-brazos-bend',    name: 'Brazos Bend State Park',         lat: 29.3789, lng: -95.5950, radiusKm: 4, category: 'state-park' },
  // ── Rio Grande Valley (World Birding Centers) & South Texas ─────────────────
  { id: 'tx-bentsen',        name: 'Bentsen-Rio Grande Valley State Park', lat: 26.1731, lng: -98.3825, radiusKm: 3, category: 'state-park' },
  { id: 'tx-estero-llano-grande', name: 'Estero Llano Grande State Park', lat: 26.1253, lng: -97.9574, radiusKm: 2, category: 'state-park' },
  { id: 'tx-falcon',         name: 'Falcon State Park',              lat: 26.5800, lng: -99.1428, radiusKm: 4, category: 'state-park' },
  { id: 'tx-choke-canyon',   name: 'Choke Canyon State Park',        lat: 28.4658, lng: -98.3542, radiusKm: 5, category: 'state-park' },
  // ── West Texas (Chihuahuan desert & sky islands) ────────────────────────────
  { id: 'tx-big-bend-ranch', name: 'Big Bend Ranch State Park',      lat: 29.5306, lng: -104.1540, radiusKm: 9, category: 'state-park' },
  { id: 'tx-davis-mountains', name: 'Davis Mountains State Park',    lat: 30.5958, lng: -103.9330, radiusKm: 4, category: 'state-park' },
  { id: 'tx-balmorhea',      name: 'Balmorhea State Park',           lat: 30.9444, lng: -103.7830, radiusKm: 2, category: 'state-park' },
  { id: 'tx-franklin-mountains', name: 'Franklin Mountains State Park', lat: 31.8836, lng: -106.5020, radiusKm: 5, category: 'state-park' },
  { id: 'tx-monahans-sandhills', name: 'Monahans Sandhills State Park', lat: 31.6475, lng: -102.8230, radiusKm: 4, category: 'state-park' },
];
