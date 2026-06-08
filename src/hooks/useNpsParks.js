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

// v4 — broadened from 2 designations to the whole NATURAL NPS system (parks,
// monuments, preserves, seashores, lakeshores, recreation areas, reserves,
// rivers/riverways); busts v3 cache. Purely cultural/historic units
// (battlefields, memorials, historic sites/parks, parkways, trails) stay out.
const CACHE_KEY = 'wm_nps_parks_v4';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// A unit qualifies if its designation names a natural land/water type AND isn't
// a cultural/historic designation. This is wildlife-first: we want the habitats,
// not the monuments-to-people.
const NP_INCLUDE = [
  'national park', 'national monument', 'national preserve', 'national seashore',
  'national lakeshore', 'national recreation area', 'national reserve',
  'national river', 'scenic river', 'scenic riverway', 'wild and scenic river', 'wild river',
];
const NP_EXCLUDE = [
  'historic', 'memorial', 'battlefield', 'military', 'cemetery',
  'heritage', 'parkway', 'scenic trail', 'historic trail',
];
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
function npsQualifies(designation = '') {
  const d = designation.toLowerCase();
  return NP_INCLUDE.some(p => d.includes(p)) && !NP_EXCLUDE.some(p => d.includes(p));
}

/**
 * Convert one NPS API park record into the app's location shape.
 * Returns null for non-natural designations or missing coordinates.
 */
function parkToLocation(park) {
  // Reject cultural/historic units and anything without a natural designation.
  if (!npsQualifies(park.designation)) return null;

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
