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

// v3 — tightened to exactly two designations; busts v2 cache
const CACHE_KEY = 'wm_nps_parks_v3';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Exactly two designation strings qualify as true National Parks.
// 'National Parks' (plural) and all others are excluded.
const NP_DESIGNATIONS = new Set([
  'National Park',
  'National Park & Preserve',
]);

/**
 * Convert one NPS API park record into the app's location shape.
 * Returns null for non-National-Park designations or missing coordinates.
 */
function parkToLocation(park) {
  // Reject anything that isn't a true National Park designation
  if (!NP_DESIGNATIONS.has(park.designation)) return null;

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

    // ── 2. Fetch from NPS API ─────────────────────────────────────────────────
    const key = import.meta.env.VITE_NPS_API_KEY;
    if (!key) { setLoading(false); return; }

    fetch('/nps-api/parks?limit=500', { headers: { 'X-Api-Key': key } })
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
