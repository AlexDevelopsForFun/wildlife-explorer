/**
 * stateParksNJ.js — curated New Jersey state parks (v1 seed).
 *
 * v1 proof-of-concept for the State Parks feature. National parks have a
 * bundled species cache + NPS Species API; state parks have NEITHER, so
 * each entry here just carries the location and a sensible default search
 * radius. The runtime fetches species live from eBird + iNat (via the
 * existing /api/*-proxy endpoints) using these coordinates.
 *
 * Coordinates are compiled from general knowledge; spot-check against:
 *   • NJ DEP Division of Parks & Forestry — https://nj.gov/dep/parksandforests/parks/
 *   • OpenStreetMap park polygons
 *
 * `radiusKm` is the per-park live-data search radius (capped at eBird's
 * 50 km max). Bigger parks → bigger radius. Default 5 km if unsure.
 */

export const STATE_PARKS_NJ = [
  { id: 'nj-liberty',          name: 'Liberty State Park',                  lat: 40.6995, lng: -74.0521, radiusKm: 3 },
  { id: 'nj-island-beach',     name: 'Island Beach State Park',             lat: 39.8076, lng: -74.0859, radiusKm: 5 },
  { id: 'nj-high-point',       name: 'High Point State Park',               lat: 41.3070, lng: -74.6571, radiusKm: 5 },
  { id: 'nj-wawayanda',        name: 'Wawayanda State Park',                lat: 41.1959, lng: -74.4400, radiusKm: 6 },
  { id: 'nj-stokes-forest',    name: 'Stokes State Forest',                 lat: 41.1812, lng: -74.7745, radiusKm: 8 },
  { id: 'nj-allaire',          name: 'Allaire State Park',                  lat: 40.1545, lng: -74.1340, radiusKm: 4 },
  { id: 'nj-cheesequake',      name: 'Cheesequake State Park',              lat: 40.4310, lng: -74.2645, radiusKm: 3 },
  { id: 'nj-worthington',      name: 'Worthington State Forest',            lat: 41.0500, lng: -75.0500, radiusKm: 6 },
  { id: 'nj-ringwood',         name: 'Ringwood State Park',                 lat: 41.1170, lng: -74.2515, radiusKm: 5 },
  { id: 'nj-wharton',          name: 'Wharton State Forest',                lat: 39.7800, lng: -74.6500, radiusKm: 12 },
  { id: 'nj-bass-river',       name: 'Bass River State Forest',             lat: 39.6298, lng: -74.4380, radiusKm: 6 },
  { id: 'nj-byrne-forest',     name: 'Brendan T. Byrne State Forest',       lat: 39.8884, lng: -74.4760, radiusKm: 8 },
  { id: 'nj-belleplain',       name: 'Belleplain State Forest',             lat: 39.2715, lng: -74.8559, radiusKm: 7 },
  { id: 'nj-cape-may-point',   name: 'Cape May Point State Park',           lat: 38.9320, lng: -74.9669, radiusKm: 3 },
  { id: 'nj-corsons-inlet',    name: "Corson's Inlet State Park",           lat: 39.2257, lng: -74.6395, radiusKm: 2 },
  { id: 'nj-d-and-r-canal',    name: 'Delaware & Raritan Canal State Park', lat: 40.3500, lng: -74.6500, radiusKm: 10 },
  { id: 'nj-double-trouble',   name: 'Double Trouble State Park',           lat: 39.8783, lng: -74.2410, radiusKm: 4 },
  { id: 'nj-hopatcong',        name: 'Hopatcong State Park',                lat: 40.9000, lng: -74.6500, radiusKm: 3 },
  { id: 'nj-long-pond',        name: 'Long Pond Ironworks State Park',      lat: 41.1500, lng: -74.2900, radiusKm: 4 },
  { id: 'nj-norvin-green',     name: 'Norvin Green State Forest',           lat: 41.0700, lng: -74.3200, radiusKm: 5 },
  { id: 'nj-parvin',           name: 'Parvin State Park',                   lat: 39.5117, lng: -75.1290, radiusKm: 4 },
  { id: 'nj-penn-forest',      name: 'Penn State Forest',                   lat: 39.7800, lng: -74.5500, radiusKm: 6 },
  { id: 'nj-princeton-battle', name: 'Princeton Battlefield State Park',    lat: 40.3290, lng: -74.6883, radiusKm: 2 },
  { id: 'nj-round-valley',     name: 'Round Valley Recreation Area',        lat: 40.6500, lng: -74.8500, radiusKm: 5 },
  { id: 'nj-spruce-run',       name: 'Spruce Run Recreation Area',          lat: 40.6500, lng: -74.9200, radiusKm: 4 },
  { id: 'nj-swartswood',       name: 'Swartswood State Park',               lat: 41.0700, lng: -74.8300, radiusKm: 4 },
  { id: 'nj-voorhees',         name: 'Voorhees State Park',                 lat: 40.6700, lng: -74.9600, radiusKm: 3 },
  { id: 'nj-washington-x',     name: 'Washington Crossing State Park',      lat: 40.3000, lng: -74.8678, radiusKm: 3 },
  { id: 'nj-monmouth-battle',  name: 'Monmouth Battlefield State Park',     lat: 40.2700, lng: -74.3490, radiusKm: 3 },
];

export const STATE_PARKS_BY_STATE = {
  NJ: STATE_PARKS_NJ,
};

// Resolve a state-park entry from a path like /state-park/nj/<id>.
export function findStatePark(stateCode, parkId) {
  const list = STATE_PARKS_BY_STATE[String(stateCode).toUpperCase()];
  if (!list) return null;
  return list.find(p => p.id === parkId) || null;
}
