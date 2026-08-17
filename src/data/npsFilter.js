/**
 * npsFilter — which NPS units count as wildlife destinations, and what to call
 * them. Extracted from useNpsParks so the build-time page generator applies the
 * IDENTICAL rules the running app does; a second copy would silently drift and
 * we'd prerender pages for units the map never shows (or miss ones it does).
 *
 * Deliberately free of React imports so a plain node script can use it.
 *
 * "National Monument" is a mixed bag — Craters of the Moon and the Statue of
 * Liberty share the designation — so monuments are included ONLY via a curated
 * allow-list of genuinely-natural parkCodes. Never blanket-include them.
 */

// Inherently-natural designations — always wildlife-relevant.
export const NP_NATURAL = [
  'national park', 'national preserve', 'national seashore', 'national lakeshore',
  'national recreation area', 'national reserve',
  'national river', 'scenic river', 'scenic riverway', 'wild and scenic river', 'wild river',
];

// Cultural/historic designations never qualify (also guards the rare
// "National Monument and Historic Shrine" style combos).
export const NP_EXCLUDE = [
  'historic', 'memorial', 'battlefield', 'military', 'cemetery',
  'heritage', 'parkway', 'scenic trail', 'historic trail',
];

// Genuinely-natural National Monuments (by NPS parkCode). Everything not listed
// — civic monuments (Statue of Liberty, Castle Clinton…), archaeological sites
// (pueblos, cliff dwellings, ruins, mounds, flint quarries), forts and
// battlefields designated as monuments — is excluded.
export const NATURAL_MONUMENTS = new Set([
  'agfo', 'ania', 'band', 'buis', 'cabr', 'cakr', 'camo', 'cavo', 'cebr', 'chir',
  'colm', 'crmo', 'depo', 'deto', 'dino', 'elma', 'flfo', 'fobu', 'hafo', 'jeca',
  'joda', 'kaww', 'labe', 'muwo', 'nabr', 'orca', 'orpi', 'para', 'rabr', 'sucr',
  'tica', 'tusk', 'vicr',
]);

// Map a full designation string to a short kind, for the UI/legend.
export const NP_KIND = (d = '') => {
  const s = d.toLowerCase();
  if (s.includes('national park')) return 'National Park';
  if (s.includes('monument')) return 'National Monument';
  if (s.includes('seashore')) return 'National Seashore';
  if (s.includes('lakeshore')) return 'National Lakeshore';
  if (s.includes('preserve')) return 'National Preserve';
  if (s.includes('recreation area')) return 'National Recreation Area';
  if (s.includes('reserve')) return 'National Reserve';
  if (s.includes('river')) return 'National River';
  return 'National Park Unit';
};

export function npsQualifies(park) {
  const d = (park.designation || '').toLowerCase();
  if (NP_EXCLUDE.some(p => d.includes(p))) return false;
  if (NP_NATURAL.some(p => d.includes(p))) return true;   // seashore / preserve / NRA / …
  // Monuments: natural ones only (allow-list by parkCode).
  if (d.includes('national monument')) return NATURAL_MONUMENTS.has((park.parkCode || '').toLowerCase());
  return false;
}
