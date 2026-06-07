// North Dakota state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs ND.
// The Missouri River reservoirs, the western badlands, the Turtle Mountains, and
// the Pembina Gorge. category → state-park 🏞️ · state-forest 🌲
export const STATE_PARKS_ND = [
  // ── Missouri River & reservoirs (central/west) ──────────────────────────────
  { id: 'nd-cross-ranch',    name: 'Cross Ranch State Park',         lat: 47.2142, lng: -100.9990, radiusKm: 4, category: 'state-park' },
  { id: 'nd-lake-sakakawea', name: 'Lake Sakakawea State Park',      lat: 47.5239, lng: -101.4520, radiusKm: 4, category: 'state-park' },
  { id: 'nd-fort-stevenson', name: 'Fort Stevenson State Park',      lat: 47.5908, lng: -101.4200, radiusKm: 3, category: 'state-park' },
  { id: 'nd-lewis-and-clark', name: 'Lewis and Clark State Park',    lat: 48.1156, lng: -103.2430, radiusKm: 3, category: 'state-park' },
  // ── Western badlands ────────────────────────────────────────────────────────
  { id: 'nd-little-missouri', name: 'Little Missouri State Park',     lat: 47.5553, lng: -102.7280, radiusKm: 5, category: 'state-park' },
  // ── Turtle Mountains & north-central ────────────────────────────────────────
  { id: 'nd-lake-metigoshe', name: 'Lake Metigoshe State Park',      lat: 48.9867, lng: -100.3240, radiusKm: 3, category: 'state-park' },
  { id: 'nd-homen-sf',       name: 'Homen State Forest',             lat: 48.9556, lng: -100.2586, radiusKm: 4, category: 'state-forest' },
  // ── Red River Valley & northeast ────────────────────────────────────────────
  { id: 'nd-icelandic',      name: 'Icelandic State Park',           lat: 48.7792, lng: -97.7529, radiusKm: 3, category: 'state-park' },
  { id: 'nd-pembina-gorge',  name: 'Pembina Gorge State Recreation Area', lat: 48.9414, lng: -98.0600, radiusKm: 4, category: 'state-park' },
  { id: 'nd-pembina',        name: 'Pembina State Park',             lat: 48.9644, lng: -97.2411, radiusKm: 2, category: 'state-park' },
  { id: 'nd-fort-abercrombie', name: 'Fort Abercrombie State Park',  lat: 46.4453, lng: -96.7186, radiusKm: 2, category: 'state-park' },
  // ── Sheyenne Valley & south-central ─────────────────────────────────────────
  { id: 'nd-fort-ransom',    name: 'Fort Ransom State Park',         lat: 46.5444, lng: -97.9361, radiusKm: 3, category: 'state-park' },
  { id: 'nd-beaver-lake',    name: 'Beaver Lake State Park',         lat: 46.4027, lng: -99.6198, radiusKm: 3, category: 'state-park' },
];
