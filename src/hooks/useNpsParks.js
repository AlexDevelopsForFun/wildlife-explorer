/**
 * useNpsParks — fetches all NPS park units from the NPS Data API.
 *
 * Returns an array of location objects compatible with the app's map layer.
 * Each park has lat/lng, name, stateCodes, npsCode, and an empty animals array
 * (wildlife data is populated separately by useLiveData when needed).
 *
 * Results are cached in localStorage for 24 hours to avoid redundant requests.
 */

import { useState, useEffect } from 'react';

// v5 — wildlife-focused refocus. Auto-include the inherently-NATURAL NPS
// designations (parks, preserves, seashores, lakeshores, recreation areas,
// reserves, rivers/riverways). "National Monument" is a mixed bag — it covers
// both natural areas (Craters of the Moon) and civic/archaeological sites
// (Statue of Liberty, pueblo ruins, forts) — so monuments are included ONLY via
// a curated allow-list of genuinely-natural ones. This keeps the wildlife
// habitats and drops the landmarks-to-people. Busts v4 cache.
const CACHE_KEY = 'wm_nps_parks_v5';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Inherently-natural designations — always wildlife-relevant.
const NP_NATURAL = [
  'national park', 'national preserve', 'national seashore', 'national lakeshore',
  'national recreation area', 'national reserve',
  'national river', 'scenic river', 'scenic riverway', 'wild and scenic river', 'wild river',
];
// Cultural/historic designations never qualify (also guards the rare
// "National Monument and Historic Shrine" style combos).
const NP_EXCLUDE = [
  'historic', 'memorial', 'battlefield', 'military', 'cemetery',
  'heritage', 'parkway', 'scenic trail', 'historic trail',
];
// Genuinely-natural National Monuments (by NPS parkCode). Everything not listed
// — civic monuments (Statue of Liberty, Castle Clinton…), archaeological sites
// (pueblos, cliff dwellings, ruins, mounds, flint quarries), forts and
// battlefields designated as monuments — is excluded.
const NATURAL_MONUMENTS = new Set([
  'agfo', 'ania', 'band', 'buis', 'cabr', 'cakr', 'camo', 'cavo', 'cebr', 'chir',
  'colm', 'crmo', 'depo', 'deto', 'dino', 'elma', 'flfo', 'fobu', 'hafo', 'jeca',
  'joda', 'kaww', 'labe', 'muwo', 'nabr', 'orca', 'orpi', 'para', 'rabr', 'sucr',
  'tica', 'tusk', 'vicr',
]);
// Map a full designation string to a short kind, for the UI/legend.
const NP_KIND = (d = '') => {
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
function npsQualifies(park) {
  const d = (park.designation || '').toLowerCase();
  if (NP_EXCLUDE.some(p => d.includes(p))) return false;
  if (NP_NATURAL.some(p => d.includes(p))) return true;   // seashore / preserve / NRA / …
  // Monuments: natural ones only (allow-list by parkCode).
  if (d.includes('national monument')) return NATURAL_MONUMENTS.has((park.parkCode || '').toLowerCase());
  return false;
}

/**
 * Convert one NPS API park record into the app's location shape.
 * Returns null for non-natural designations or missing coordinates.
 */
function parkToLocation(park) {
  // Reject civic/cultural units; monuments must be on the natural allow-list.
  if (!npsQualifies(park)) return null;

  const lat = parseFloat(park.latitude);
  const lng = parseFloat(park.longitude);
  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) return null;

  const stateCodes = park.states
    ? park.states.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    id:          `nps_${park.parkCode}`,
    name:        park.fullName ?? park.name,
    lat,
    lng,
    locationType:'nationalPark',
    npsCode:     park.parkCode,
    stateCodes,
    description: park.description ?? '',
    designation: park.designation ?? '',
    npsKind:     NP_KIND(park.designation),  // short type for UI (Monument/Seashore/…)
    url:         park.url ?? '',
    animals:     [],    // populated by useLiveData if this park is opened
    _fromNpsApi: true,  // marker flag so App can distinguish these entries
  };
}

export function useNpsParks(excludeNpsCodes = new Set()) {
  const [parks,   setParks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── 1. Try cache ──────────────────────────────────────────────────────────
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
          setParks(data.filter(p => !excludeNpsCodes.has(p.npsCode)));
          setLoading(false);
          return;
        }
      }
    } catch { /* corrupt cache — fall through to fetch */ }

    // ── 2. Fetch from NPS API (key injected server-side by /api/nps-proxy) ────
    fetch('/api/nps-proxy/parks?limit=500')
      .then(r => r.ok ? r.json() : Promise.reject(`NPS parks ${r.status}`))
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        const locations = data.map(parkToLocation).filter(Boolean);

        // Cache the full list (before dedup) so we can apply different
        // exclusion sets in future sessions without re-fetching.
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: locations, ts: Date.now() }));
        } catch { /* storage full */ }

        setParks(locations.filter(p => !excludeNpsCodes.has(p.npsCode)));
      })
      .catch(() => { /* silent — map still works with just hardcoded parks */ })
      .finally(() => setLoading(false));

    // excludeNpsCodes is a Set — stable reference passed from App useMemo,
    // so we intentionally omit it from deps to avoid infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { parks, loading };
}
