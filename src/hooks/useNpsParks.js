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
import { NP_KIND, npsQualifies } from '../data/npsFilter.js';

// v5 — wildlife-focused refocus. Auto-include the inherently-NATURAL NPS
// designations (parks, preserves, seashores, lakeshores, recreation areas,
// reserves, rivers/riverways). "National Monument" is a mixed bag — it covers
// both natural areas (Craters of the Moon) and civic/archaeological sites
// (Statue of Liberty, pueblo ruins, forts) — so monuments are included ONLY via
// a curated allow-list of genuinely-natural ones. This keeps the wildlife
// habitats and drops the landmarks-to-people. Busts v4 cache.
const CACHE_KEY = 'wm_nps_parks_v7';  // v7 picks the best scenery image (not images[0])
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Filter + kind mapping live in src/data/npsFilter.js so the build-time page
// generator can apply the exact same rules without duplicating (and drifting
// from) them, and without pulling React into a node script.

// NPS gives an ordered `images` array, but images[0] is frequently a wildlife
// close-up (e.g. Wind Cave's lead photo is a bison, not the park). Prefer a
// landscape/scenery shot: reward scenery words, penalise animal close-ups, and
// fall back to NPS's own ordering on ties.
const HERO_ANIMAL  = /\b(bison|buffalo|elk|deer|moose|bear|wolf|coyote|fox|bobcat|cougar|lynx|bird|eagle|hawk|falcon|owl|duck|goose|heron|crane|pelican|gull|snake|lizard|turtle|tortoise|frog|toad|fish|salmon|trout|insect|butterfly|dragonfly|bee|beetle|bug|bat|prairie dog|ferret|sheep|goat|pronghorn|antelope|elephant seal|seal|otter|squirrel|chipmunk|rabbit|marmot|portrait|close-?up|wildlife|critter|mammal|reptile|amphibian)\b/i;
const HERO_SCENERY = /\b(landscape|scenic|scenery|vista|overlook|panorama|sunset|sunrise|skyline|canyon|valley|mountain|peak|ridge|cliff|butte|mesa|prairie|grassland|meadow|forest|woods|river|creek|lake|pond|waterfall|falls|gorge|shore|coast|coastline|beach|dune|desert|cave|cavern|formation|boxwork|rock|badland|hill|view|trail|aerial|night sky|stars|milky way|wetland|marsh|spring|geyser)\b/i;

function pickHeroImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  let best = images[0], bestScore = -Infinity;
  images.forEach((img, i) => {
    const hay = `${img.title || ''} ${img.altText || ''} ${img.caption || ''}`.toLowerCase();
    // Scenery wins outright (a landscape word means it's a place shot, even if a
    // place NAME like "Eagle Peak" also trips the animal list). Only penalise an
    // animal word when there's NO scenery context — that's the tight-portrait case.
    let score = HERO_SCENERY.test(hay) ? 3 : (HERO_ANIMAL.test(hay) ? -3 : 0);
    score -= i * 0.01;                 // gentle tiebreak toward NPS's own order
    if (score > bestScore) { bestScore = score; best = img; }
  });
  return best;
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

  const hero = pickHeroImage(park.images);

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
    image:       hero?.url ?? null,   // best scenery photo (NPS, not just images[0])
    imageAlt:    hero?.altText ?? hero?.caption ?? '',
    animals:     [],    // populated by useLiveData if this park is opened
    _fromNpsApi: true,  // marker flag so App can distinguish these entries
  };
}

// Build { parkCode: heroImageUrl } from the FULL (pre-dedup) list, so the static
// 63 national parks (deduped out of `parks`) can still show a hero photo by code.
function buildImageMap(locations) {
  const m = {};
  for (const l of locations) if (l.npsCode && l.image) m[l.npsCode] = l.image;
  return m;
}

export function useNpsParks(excludeNpsCodes = new Set()) {
  const [parks,   setParks]   = useState([]);
  const [npsImages, setNpsImages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyData = (locations) => {
      setNpsImages(buildImageMap(locations));
      setParks(locations.filter(p => !excludeNpsCodes.has(p.npsCode)));
    };

    // ── 1. Try cache ──────────────────────────────────────────────────────────
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
          applyData(data);
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

        applyData(locations);
      })
      .catch(() => { /* silent — map still works with just hardcoded parks */ })
      .finally(() => setLoading(false));

    // excludeNpsCodes is a Set — stable reference passed from App useMemo,
    // so we intentionally omit it from deps to avoid infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { parks, loading, npsImages };
}
