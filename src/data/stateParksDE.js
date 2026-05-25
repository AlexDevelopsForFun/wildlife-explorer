/**
 * stateParksDE.js — Delaware state parks (2nd state, after NJ).
 *
 * Same shape as stateParksNJ.js: each entry carries only location +
 * `radiusKm` (the live-data search radius); species are fetched LIVE from
 * eBird + iNaturalist at runtime, exactly like NJ. No bundled species cache.
 *
 * COORDINATES — verified May 2026 against each park's individual Wikipedia
 * article infobox, and spot-checked against an independent source (the
 * Delaware State Parks reservation system + topo databases) for Cape
 * Henlopen (the largest, most-spread park); all agreed to within the park's
 * own footprint. Two units in the official 17-park system are omitted, as
 * NJ omitted Capital/Stow Creek: First State Heritage Park (a boundary-less
 * partnership of historic sites in Dover, no single natural area) and
 * Wilmington State Parks (urban riverfront that overlaps Brandywine/Alapocas).
 *
 * `radiusKm` mirrors NJ's sizing: compact/historic units 2 km, mid parks
 * 3–4 km, the larger coastal + woodland parks 5–6 km. Delaware classifies
 * every unit as a "state park" (no state forests), so all use that category.
 */

export const STATE_PARKS_DE = [
  { id: 'de-alapocas',       name: 'Alapocas Run State Park',     lat: 39.7687240, lng: -75.5588125, radiusKm: 2, category: 'state-park' },
  { id: 'de-auburn-valley',  name: 'Auburn Valley State Park',    lat: 39.80917,   lng: -75.67972,   radiusKm: 2, category: 'state-park' },
  { id: 'de-bellevue',       name: 'Bellevue State Park',         lat: 39.77917,   lng: -75.49583,   radiusKm: 2, category: 'state-park' },
  { id: 'de-brandywine',     name: 'Brandywine Creek State Park', lat: 39.8112231, lng: -75.5663143, radiusKm: 3, category: 'state-park' },
  { id: 'de-cape-henlopen',  name: 'Cape Henlopen State Park',    lat: 38.8031678, lng: -75.0946255, radiusKm: 5, category: 'state-park' },
  { id: 'de-seashore',       name: 'Delaware Seashore State Park', lat: 38.6103267, lng: -75.0680895, radiusKm: 6, category: 'state-park' },
  { id: 'de-fenwick',        name: 'Fenwick Island State Park',   lat: 38.47583,   lng: -75.05444,   radiusKm: 3, category: 'state-park' },
  { id: 'de-fort-delaware',  name: 'Fort Delaware State Park',    lat: 39.59000,   lng: -75.57194,   radiusKm: 2, category: 'state-park' },
  { id: 'de-fort-dupont',    name: 'Fort DuPont State Park',      lat: 39.57139,   lng: -75.58361,   radiusKm: 2, category: 'state-park' },
  { id: 'de-fox-point',      name: 'Fox Point State Park',        lat: 39.75611,   lng: -75.48972,   radiusKm: 2, category: 'state-park' },
  { id: 'de-holts-landing',  name: 'Holts Landing State Park',    lat: 38.5931681, lng: -75.1340726, radiusKm: 2, category: 'state-park' },
  { id: 'de-killens-pond',   name: 'Killens Pond State Park',     lat: 38.9815077, lng: -75.5361511, radiusKm: 3, category: 'state-park' },
  { id: 'de-lums-pond',      name: 'Lums Pond State Park',        lat: 39.554287,  lng: -75.714942,  radiusKm: 4, category: 'state-park' },
  { id: 'de-trap-pond',      name: 'Trap Pond State Park',        lat: 38.5245921, lng: -75.4743265, radiusKm: 4, category: 'state-park' },
  { id: 'de-white-clay',     name: 'White Clay Creek State Park', lat: 39.73611,   lng: -75.76222,   radiusKm: 5, category: 'state-park' },
];
