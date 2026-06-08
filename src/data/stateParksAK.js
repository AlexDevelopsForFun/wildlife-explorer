// Alaska state parks & recreation areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs AK.
// The Chugach & Kenai (Dall sheep, moose, beluga, sea otters) → the Mat-Su lakes
// → the Interior boreal forest → the Southeast eagle & bear country → the vast
// remote parks. Denali, Katmai, Kenai Fjords & Glacier Bay are FEDERAL (excluded).
// Interior/remote units are eBird-sparse → radius/iNat fallback. category →
// state-park 🏞️ · recreation-area 🛶
export const STATE_PARKS_AK = [
  // ── Southcentral (Anchorage, Mat-Su, Kenai) ─────────────────────────────────
  { id: 'ak-chugach',        name: 'Chugach State Park',             lat: 61.0519, lng: -149.7969, radiusKm: 10, category: 'state-park' },
  { id: 'ak-kachemak-bay',   name: 'Kachemak Bay State Park',        lat: 59.5328, lng: -151.2100, radiusKm: 9, category: 'state-park' },
  { id: 'ak-denali',         name: 'Denali State Park',              lat: 62.7700, lng: -150.0530, radiusKm: 9, category: 'state-park' },
  { id: 'ak-caines-head',    name: 'Caines Head State Recreation Area', lat: 60.0010, lng: -149.4220, radiusKm: 4, category: 'recreation-area' },
  { id: 'ak-captain-cook',   name: 'Captain Cook State Recreation Area', lat: 60.7883, lng: -151.0397, radiusKm: 5, category: 'recreation-area' },
  { id: 'ak-nancy-lake',     name: 'Nancy Lake State Recreation Area', lat: 61.6853, lng: -149.9660, radiusKm: 4, category: 'recreation-area' },
  { id: 'ak-lake-louise',    name: 'Lake Louise State Recreation Area', lat: 62.2811, lng: -146.5386, radiusKm: 4, category: 'recreation-area' },
  { id: 'ak-matanuska-glacier', name: 'Matanuska Glacier State Recreation Site', lat: 61.7990, lng: -147.8141, radiusKm: 3, category: 'recreation-area' },
  // ── Interior (Fairbanks) ────────────────────────────────────────────────────
  { id: 'ak-chena-river',    name: 'Chena River State Recreation Area', lat: 64.9167, lng: -146.3330, radiusKm: 7, category: 'recreation-area' },
  // ── Southeast (Inside Passage) ──────────────────────────────────────────────
  { id: 'ak-chilkat',        name: 'Chilkat State Park',             lat: 59.2111, lng: -135.3981, radiusKm: 4, category: 'state-park' },
  { id: 'ak-chilkoot-lake',  name: 'Chilkoot Lake State Recreation Area', lat: 59.3358, lng: -135.5636, radiusKm: 3, category: 'recreation-area' },
  // ── Remote (Bristol Bay & Kodiak archipelago) ───────────────────────────────
  { id: 'ak-wood-tikchik',   name: 'Wood-Tikchik State Park',        lat: 59.7456, lng: -158.7525, radiusKm: 12, category: 'state-park' },
  { id: 'ak-afognak-island', name: 'Afognak Island State Park',      lat: 58.3558, lng: -152.3000, radiusKm: 8, category: 'state-park' },
];
