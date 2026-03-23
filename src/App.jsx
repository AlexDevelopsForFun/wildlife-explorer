import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster';

import { wildlifeLocations, SEASONS, RARITY, ANIMAL_TYPES, STATE_NAMES } from './wildlifeData';
import { classifyAnimalSubtype, getSubtypeDefs } from './utils/subcategories';
import {
  mergeAnimals, balanceAnimals,
  getCorrectionFactor, getMonthlyFrequency, getSeasonalFreq,
  rarityFromChecklist, getSeasonsFromBarChart, applyRarityOverride,
  fetchInatMonthlyHist,
} from './services/apiService';
import { useLiveData } from './hooks/useLiveData';
import { useNpsParks } from './hooks/useNpsParks';
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from './data/wildlifeCache.js';
import { fetchAnimalPhoto } from './services/photoService';
import { needsGeneratedDescription } from './services/descriptionService';

// ── Park type colors & icons ──────────────────────────────────────────────────
const PARK_COLORS = { nationalPark: '#7B5B2E' };
const PARK_ICONS  = { nationalPark: '⛰️' };

// ── Park type badge styles (used in popup header) ─────────────────────────────
const PARK_TYPE_STYLES = {
  nationalPark: { bg: '#7B5B2E', label: '🏔️ National Park' },
};

// ── Circular marker icon factory ──────────────────────────────────────────────
// Renders one of three tiers based on the current zoom level:
//   Tier 1 (zoom ≤ 4): 12 px colored dot — no icon, no badge, no pulse
//   Tier 2 (zoom 5-6): 24 px circle with park emoji — no badge, no pulse
//   Tier 3 (zoom ≥ 7): full 48 px — icon + LIVE badge + pulse animation
function createPinIcon(locationType, isLive = false, isLoading = false, zoomTier = 3) {
  const bg   = PARK_COLORS[locationType] ?? '#1a6640';
  const icon = PARK_ICONS[locationType]  ?? '📍';

  if (zoomTier === 1) {
    return L.divIcon({
      html:        `<div class="wm-pin wm-pin--dot" style="background:${bg}"></div>`,
      className:   '',
      iconSize:    [12, 12],
      iconAnchor:  [6, 6],
      popupAnchor: [0, -8],
    });
  }

  if (zoomTier === 2) {
    return L.divIcon({
      html: `
        <div class="wm-pin wm-pin--medium">
          <div class="wm-pin__circle" style="background:${bg}">
            <span class="wm-pin__icon">${icon}</span>
          </div>
        </div>`,
      className:   '',
      iconSize:    [24, 24],
      iconAnchor:  [12, 12],
      popupAnchor: [0, -15],
    });
  }

  // Tier 3: full size — icon + LIVE badge + pulse animation
  // Pulse ring is handled by CSS ::before/::after on .wm-pin--live (no DOM nodes
  // that could extend beyond iconSize and interfere with Leaflet click detection).
  const badge = isLive
    ? `<div class="wm-pin__badge">● LIVE</div>`
    : isLoading
      ? `<div class="wm-pin__badge wm-pin__badge--loading">⟳</div>`
      : '';
  return L.divIcon({
    html: `
      <div class="wm-pin${isLive ? ' wm-pin--live' : ''}">
        <div class="wm-pin__circle" style="background:${bg}">
          <span class="wm-pin__icon">${icon}</span>
        </div>
        ${badge}
      </div>`,
    className:   '',
    iconSize:    [48, 48],
    iconAnchor:  [24, 24],
    popupAnchor: [0, -30],
  });
}

// ── Source badge labels + colors ─────────────────────────────────────────────
// Color palette matches the emoji dots in the spec:
//   🟦 eBird       — blue
//   🟩 iNaturalist — green
//   🟨 GBIF        — amber/yellow
//   🟧 NPS         — orange
//   ⬜ Estimated   — gray  (hardcoded fallback, not from real data)
// ── Data source metadata ─────────────────────────────────────────────────────
// 'static' and 'estimated' are internal labels — never shown to users.
// They map to 'Park Records' (NPS styling) which is honest and meaningful.
const SOURCE_LABELS = {
  ebird:       'eBird',
  inaturalist: 'iNaturalist',
  nps:         'National Park Service',
  gbif:        'GBIF',
  static:      'Park Records',
  estimated:   'Park Records',
};

// Long institutional names used in the popup header attribution line
const SOURCE_LONG = {
  ebird:       'Cornell Lab of Ornithology',
  inaturalist: 'iNaturalist',
  nps:         'National Park Service',
  gbif:        'GBIF',
  static:      'Park Records',
  estimated:   'Park Records',
};

const SOURCE_COLORS = {
  ebird:       '#0891b2',
  inaturalist: '#16a34a',
  gbif:        '#ca8a04',
  nps:         '#ea580c',
  static:      '#ea580c', // same as nps — park records
  estimated:   '#ea580c',
};

const SOURCE_ICONS = {
  ebird:       '🐦',
  inaturalist: '🌿',
  gbif:        '🔬',
  nps:         '🏛️',
  static:      '🏛️',
  estimated:   '🏛️',
};

const SOURCE_TOOLTIPS = {
  ebird:       'Cornell Lab of Ornithology — the world\'s largest bird observation database with over 1 billion records',
  inaturalist: 'iNaturalist — research-grade observations verified by a global community of naturalists and scientists',
  nps:         'National Park Service — officially documented species from the park\'s scientific species inventory',
  gbif:        'Global Biodiversity Information Facility — international scientific biodiversity database used by researchers worldwide',
  static:      'Species documented in official park records and wildlife inventories',
  estimated:   'Species documented in official park records and wildlife inventories',
};

// ── Description source badges ─────────────────────────────────────────────────
// Shown below an animal's description line to indicate where it came from.
// Three-tier hierarchy:
//   🏛️ Park Naturalist — curated entries written for this app (wildlifeData.js)
//   🌿 iNaturalist     — wikipedia_summary field from api.inaturalist.org/v1/taxa
//   📖 Wikipedia       — extract field from en.wikipedia.org/api/rest_v1/page/summary
//   🏛️ Park Records    — factual fallback built from existing observation data
const DESC_SOURCE_ICON = {
  'iNaturalist':    '🌿',
  'Wikipedia':      '📖',
  'Park Records':   '🏛️',
};
const DESC_SOURCE_LABEL = {
  'iNaturalist':    'iNaturalist',
  'Wikipedia':      'Wikipedia',
  'Park Records':   'Park Records',
};

// ── Year-round display config ─────────────────────────────────────────────────
// Not part of SEASONS (which drives the filter dropdown) — display-only.
const YEAR_ROUND_DISPLAY = { label: 'Year Round', emoji: '🌀', color: '#6b7280' };

// ── State name → postal code reverse lookup ───────────────────────────────────
// The PublicaMundi GeoJSON uses full state names (e.g. "New Jersey") not codes.
// We reverse STATE_NAMES to match GeoJSON features to our park state codes.
const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [name, code])
);

// ── Marker layer ──────────────────────────────────────────────────────────────
// Each National Park gets an individual marker at every zoom level.
// All markers call back onPopupOpen on click.
function MarkerLayer({ locations, icons, onPopupOpen, onPopupClose }) {
  const map = useMap();
  const onOpenRef  = useRef(onPopupOpen);
  const onCloseRef = useRef(onPopupClose);
  // iconsRef lets Effect 2 update icons without re-creating markers.
  // markersRef maps locId → L.marker so Effect 2 can call setIcon().
  const iconsRef   = useRef(icons);
  const markersRef = useRef({});

  useEffect(() => { onOpenRef.current  = onPopupOpen;  }, [onPopupOpen]);
  useEffect(() => { onCloseRef.current = onPopupClose; }, [onPopupClose]);

  // ── Effect 1: create / remove markers when the location list changes ────────
  // Does NOT depend on `icons` — reads iconsRef for the initial icon so markers
  // are never removed from the map just because wildlife data loaded in the bg.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const newMarkers = {};
    locations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: iconsRef.current[loc.id] });
      marker.on('click', () => onOpenRef.current(loc));
      newMarkers[loc.id] = marker;
      marker.addTo(map);
    });

    markersRef.current = newMarkers;

    return () => {
      onCloseRef.current();
      Object.values(newMarkers).forEach(m => map.removeLayer(m));
      markersRef.current = {};
    };
  }, [map, locations]); // ← icons intentionally omitted — updated via setIcon() below

  // ── Effect 2: update icon visuals without removing markers from the map ─────
  // Fires when zoomTier changes — icons no longer depend on liveData/loading.
  // setIcon() swaps the DOM element in-place — the marker stays on the map and
  // its click handler remains registered the entire time.
  useEffect(() => {
    iconsRef.current = icons;
    Object.entries(markersRef.current).forEach(([locId, marker]) => {
      const icon = icons[locId];
      if (icon) marker.setIcon(icon);
    });
  }, [icons]);

  return null;
}

// ── Zoom level tracker ────────────────────────────────────────────────────────
// Fires onZoomChange whenever the map zoom changes so the parent can update
// icon tiers without needing direct access to the Leaflet map instance.
function ZoomTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    return () => map.off('zoomend', handler);
  }, [map, onZoomChange]);
  return null;
}

// ── State boundary GeoJSON layer ──────────────────────────────────────────────
// Subtle polygon outlines; states with parks get a light green fill tint.
// Hover turns border green; click zooms to that state.
function StateBoundaries({ geoData, statesWithParks, onStateClick }) {
  const map        = useMap();
  const geojsonRef = useRef(null);

  const stateStyle = useCallback(feature => {
    const code     = STATE_NAME_TO_CODE[feature.properties.name];
    const hasParks = code && statesWithParks.has(code);
    return {
      color:       '#666666',
      weight:      1.5,
      opacity:     0.6,
      fillColor:   hasParks ? '#4a7a5f' : '#f0f0f0',
      fillOpacity: hasParks ? 0.10     : 0.05,
    };
  }, [statesWithParks]);

  const onEachFeature = useCallback((feature, layer) => {
    // No tooltip — CartoDB base tiles already show state names clearly.
    // Hover highlight only (green border) so the polygon still feels clickable.
    layer.on({
      mouseover: e => {
        e.target.setStyle({ weight: 2.5, color: '#2d7a2d', opacity: 1 });
        e.target.bringToFront();
      },
      mouseout: e => {
        geojsonRef.current?.resetStyle(e.target);
      },
      click: e => {
        map.fitBounds(e.target.getBounds(), { padding: [30, 30] });
        onStateClick?.();
      },
    });
  }, [map, onStateClick]);

  if (!geoData) return null;
  return (
    <GeoJSON
      ref={geojsonRef}
      key="us-states"
      data={geoData}
      style={stateStyle}
      onEachFeature={onEachFeature}
    />
  );
}

// ── Map instance controller ────────────────────────────────────────────────────
// Captures the Leaflet map instance and stores it in the parent's ref so that
// actions outside the MapContainer (e.g. the "View Full Map" button) can call
// map.setView() without needing to be inside the MapContainer tree.
function MapController({ mapRef }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  return null;
}

// ── State park-count badges (shown at zoom < 6) ────────────────────────────────
// Places a small numbered circle at each state's geographic centre showing how
// many wildlife parks are in that state. Hidden at zoom ≥ 6 where individual
// markers are clearly visible.
function StateParkCounts({ geoData, locationsByState }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData) return;

    const countLayer = L.layerGroup();

    geoData.features.forEach(feature => {
      try {
        const code  = STATE_NAME_TO_CODE[feature.properties.name];
        const count = locationsByState[code] ?? 0;
        if (!count) return;

        const bounds = L.geoJSON(feature).getBounds();
        if (!bounds.isValid()) return;

        const marker = L.marker(bounds.getCenter(), {
          icon: L.divIcon({
            html:      `<div class="state-count">${count}</div>`,
            className: '',
            iconSize:  [28, 28],
            iconAnchor:[14, 14],
          }),
          interactive: false,
          keyboard:    false,
        });
        countLayer.addLayer(marker);
      } catch { /* malformed geometry */ }
    });

    const sync = () => {
      const z = map.getZoom();
      if (z < 6) { if (!map.hasLayer(countLayer)) map.addLayer(countLayer); }
      else        { if (map.hasLayer(countLayer))  map.removeLayer(countLayer); }
    };

    sync();
    map.on('zoomend', sync);
    return () => { map.off('zoomend', sync); map.removeLayer(countLayer); };
  }, [map, geoData, locationsByState]);

  return null;
}

// ── "What's Active Now" rotating banner ───────────────────────────────────────
// Shows season-appropriate wildlife activity messages that rotate every 5 s
// with a smooth fade. Always reflects the real-world season, not the filter.
const ACTIVE_NOW_MSGS = {
  spring: [
    'Bear cubs emerging with mothers in Great Smoky Mountains',
    'Gray Whales migrating north past Point Reyes',
    'Elk calving season begins in Yellowstone',
    'Warblers arriving at Acadia in peak numbers',
    'Wildflowers blooming across Great Smoky Mountains',
  ],
  summer: [
    'Bison rut peaks in Yellowstone — bulls bugling',
    'Bald Eagle nesting active in Denali backcountry',
    'Sea Turtle nesting season on Florida beaches',
    'Monarch Butterflies begin eastern migration',
    'Harbor Seal pups learning to swim in Channel Islands',
  ],
  fall: [
    'Elk rut in Yellowstone — bulls bugling at dawn',
    'Monarch Butterflies peak at Point Reyes in October',
    'Bears fattening up before winter hibernation',
    'Sandhill Cranes staging in Yellowstone valleys',
    'Hawk migration peaks at Shenandoah ridge',
  ],
  winter: [
    'Humpback Whales feeding off Channel Islands',
    'American Alligators basking in Everglades winter sun',
    'Bison breaking through snow to graze in Yellowstone',
    'Bald Eagles fishing open water in Denali',
    'Manatees gathering in warm Florida springs',
  ],
};

function getCurrentSeason() {
  const m = new Date().getMonth(); // 0 = Jan
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

function WhatActiveNow() {
  const msgs                 = ACTIVE_NOW_MSGS[getCurrentSeason()];
  const [idx,  setIdx]       = useState(0);
  const [faded, setFaded]    = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setFaded(true);
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setFaded(false); }, 340);
    }, 5000);
    return () => clearInterval(t);
  }, [msgs.length]);

  const seasonLabel = { spring: 'Spring 🌸', summer: 'Summer ☀️', fall: 'Fall 🍂', winter: 'Winter ❄️' }[getCurrentSeason()];

  return (
    <div className="active-now" aria-live="polite" aria-atomic="true">
      <span className="active-now__season">{seasonLabel}</span>
      <span className="active-now__sep">·</span>
      <span className={`active-now__msg${faded ? ' active-now__msg--out' : ''}`}>
        {msgs[idx]}
      </span>
    </div>
  );
}

// ── Welcome splash screen ──────────────────────────────────────────────────────
// Shown only on the very first visit (localStorage key wm_visited).
// Dismissed by clicking the button; never shown again.
function SplashScreen({ onDismiss }) {
  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label="Welcome to US Wildlife Explorer">
      <div className="splash__content">
        <div className="splash__logo" aria-hidden="true">🌿</div>
        <h1 className="splash__title">US Wildlife Explorer</h1>
        <p className="splash__tagline">Discover wildlife across America's parks</p>
        <button className="splash__btn" onClick={onDismiss} autoFocus>
          Explore the Map →
        </button>
      </div>
    </div>
  );
}


/**
 * Derive approximate seasonal frequency from a bird's single iNat `frequency`
 * value and its `seasons` array. Used as fallback when iNat histogram has <5 obs.
 * Spreads the overall encounter rate evenly across declared seasons, then scales
 * relative to the number of active seasons so the numbers feel meaningful.
 * Returns { spring, summer, fall, winter, _estimated: true } or null.
 */
// Approximate encounter-rate by rarity tier — used as last-resort when no
// frequency field exists (e.g. NPS-only records). Keeps estimated badges
// honest: exceptional animals show ~1%, rare ~4%, etc.
const RARITY_FREQ_FALLBACK = {
  guaranteed: 0.92, very_likely: 0.70, likely: 0.40,
  unlikely: 0.15, rare: 0.04, exceptional: 0.01,
};

function estimateSeasonalFreqFromField(frequency, seasons, rarity) {
  const f = frequency ?? RARITY_FREQ_FALLBACK[rarity] ?? null;
  if (!f || f <= 0 || !seasons?.length) return null;
  const pct = Math.min(99, Math.round(f * 100));
  const active = seasons.includes('year_round')
    ? ['spring', 'summer', 'fall', 'winter']
    : seasons;
  if (!active.length) return null;
  const result = { _estimated: true };
  active.forEach(s => { result[s] = pct; });
  return result;
}

// ── Migration status badge config ─────────────────────────────────────────────
const MIGRATION_BADGES = {
  migratory: {
    emoji: '🔀', label: 'Migratory',
    color: '#0369a1',
    tooltip: 'Passes through during migration — timing your visit to peak migration windows increases your chances of seeing this species',
  },
  partial: {
    emoji: '🌤️', label: 'Summer Resident',
    color: '#b45309',
    tooltip: 'Breeds here in summer and migrates south for winter — best seen May through August',
  },
  winter_visitor: {
    emoji: '❄️', label: 'Winter Visitor',
    color: '#6366f1',
    tooltip: 'Arrives from the north in fall and winters here — best seen November through March',
  },
  year_round: {
    emoji: '🏠', label: 'Year Round',
    color: '#15803d',
    tooltip: 'Lives here year round — can be seen on any visit',
  },
};

/**
 * Derive a migrationStatus value from a bird's seasons array.
 * Used as fallback when migrationStatus is not explicitly set on the animal.
 * Rules (ordered by specificity):
 *   year_round literal or all four seasons present → 'year_round'
 *   summer but no winter                           → 'partial'   (Summer Resident)
 *   winter but no summer                           → 'winter_visitor'
 *   spring/fall only (no summer, no winter)        → 'migratory'
 */
function deriveMigrationStatus(seasons) {
  if (!seasons?.length) return null;
  if (seasons.includes('year_round')) return 'year_round';
  const hasWinter = seasons.includes('winter');
  const hasSummer = seasons.includes('summer');
  const hasSpring = seasons.includes('spring');
  const hasFall   = seasons.includes('fall');
  if (hasWinter && hasSummer && hasSpring && hasFall) return 'year_round';
  if (hasSummer && !hasWinter) return 'partial';
  if (hasWinter && !hasSummer) return 'winter_visitor';
  if ((hasSpring || hasFall) && !hasSummer && !hasWinter) return 'migratory';
  return null;
}

// ── Source resolution helpers (shared by AnimalCard + ExceptionalCard) ───────
// When source is 'static'/'estimated' (pre-built cache), infer the real source
// from funFact text since buildWildlifeCache.js uses distinct templates per API.
const _REAL_SRCS = new Set(['ebird', 'inaturalist', 'nps', 'gbif']);

function inferSource(src, fact) {
  if (src !== 'static' && src !== 'estimated') return src;
  if (!fact) return src;
  if (/iNaturalist/i.test(fact))           return 'inaturalist';
  if (/eBird/i.test(fact))                return 'ebird';
  if (/NPS wildlife registry/i.test(fact)) return 'nps';
  return src; // genuine hardcoded park record
}

function resolveAnimalSources(animal) {
  const raw      = animal.sources?.length ? animal.sources : [animal.source ?? 'estimated'];
  const inferred = [...new Set(raw.map(s => inferSource(s, animal.funFact)))];
  const hasReal  = inferred.some(s => _REAL_SRCS.has(s));
  return hasReal ? inferred.filter(s => _REAL_SRCS.has(s)) : inferred;
}

// ── Animal card ───────────────────────────────────────────────────────────────
function AnimalCard({ animal, debugMode, seasonalFreqs, location }) {
  const r = RARITY[animal.rarity] ?? RARITY.rare;
  const t = ANIMAL_TYPES[animal.animalType];

  const sources     = resolveAnimalSources(animal);
  const primarySrc  = sources[0] ?? 'estimated';
  const isEstimated = sources.every(s => s === 'estimated');

  // Format the fetched timestamp for display
  const fetchedStr = animal._debug?.fetchedAt
    ? new Date(animal._debug.fetchedAt).toLocaleString()
    : null;

  // Photo state: undefined = loading, null = not found, object = loaded
  const [photo,    setPhoto]    = useState(undefined);
  const [expanded, setExpanded] = useState(false);

  // Fetch photo lazily when the card mounts (i.e. when the popup opens)
  useEffect(() => {
    let alive = true;
    fetchAnimalPhoto(animal.name).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [animal.name]);

  // Emoji used as silhouette placeholder by animal type
  const placeholderEmoji = t?.emoji ?? '🐾';

  return (
    <div className={`animal-card${isEstimated ? ' animal-card--estimated' : ''}${expanded && photo ? ' animal-card--photo-open' : ''}`}>

      {/* Expanded full-width photo — shown above the card content when clicked */}
      {expanded && photo && (
        <div className="photo-full" onClick={() => setExpanded(false)}>
          <img src={photo.largeUrl} alt={animal.name} className="photo-full__img" />
          <div className="photo-full__credit">
            📷 {photo.attribution ?? photo.credit ?? photo.source}
          </div>
          <div className="photo-full__hint">tap to close</div>
        </div>
      )}

      <div className="animal-card__top">

        {/* Photo thumbnail / loading skeleton / silhouette placeholder */}
        <div className="photo-col">
          {photo === undefined ? (
            // Still loading — shimmer skeleton with emoji hint
            <div className="photo-thumb photo-thumb--skeleton">
              <span aria-hidden="true">{placeholderEmoji}</span>
            </div>
          ) : photo === null ? (
            // No photo found — clean emoji silhouette
            <div className="photo-thumb photo-thumb--none">
              <span aria-hidden="true">{placeholderEmoji}</span>
            </div>
          ) : (
            // Photo loaded — clickable thumbnail with hover credit
            <button
              className="photo-thumb photo-thumb--img"
              onClick={() => setExpanded(prev => !prev)}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} photo of ${animal.name}`}
            >
              <img src={photo.url} alt={animal.name} />
              <div className="photo-thumb__credit">📷 {photo.credit ?? photo.source}</div>
            </button>
          )}
        </div>

        <div className="animal-card__meta">
          {/* Common name + type chip */}
          <div className="animal-card__name">
            {animal.name}
            {t && <span className="type-chip" style={{ background: t.color + '20', color: t.color }}>{t.emoji}</span>}
          </div>
          {/* Scientific name subtitle — shown when available */}
          {animal.scientificName && (
            <div className="animal-card__scientific">{animal.scientificName}</div>
          )}
          <div className="animal-card__badges">
            <span
              className={`rarity-badge${r.star ? ' rarity-badge--exceptional' : ''}`}
              style={{ color: r.color, background: r.color + '18', borderColor: r.color + '44' }}
            >
              {r.emoji} {r.label}{r.probability ? ` · ${r.probability}` : ''}{r.star ? ' ✦' : ''}
            </span>
            {/* Multi-season badges: one per season, or single 🌀 Year Round */}
            {(animal.displaySeasons ?? [animal.bestSeason ?? 'spring']).map(sk => {
              const sd = (sk === 'year-round' || sk === 'year_round')
                ? YEAR_ROUND_DISPLAY
                : (SEASONS[sk] ?? SEASONS.spring);
              return (
                <span key={sk} className="season-badge" style={{ color: sd.color, background: sd.color + '18', borderColor: sd.color + '44' }}>
                  {sd.emoji} {sd.label}
                </span>
              );
            })}
            {/* Migration status badge — birds only.
                Uses explicit migrationStatus if set, otherwise derives from seasons. */}
            {animal.animalType === 'bird' && (() => {
              const ms = animal.migrationStatus ?? deriveMigrationStatus(animal.seasons);
              if (!ms) return null;
              const mb = MIGRATION_BADGES[ms];
              if (!mb) return null;
              return (
                <span
                  className="migration-badge"
                  style={{ color: mb.color, background: mb.color + '18', borderColor: mb.color + '44' }}
                  title={mb.tooltip}
                >
                  {mb.emoji} {mb.label}
                </span>
              );
            })()}
            {/* Seasonal frequency percentages — all animal types.
                Primary source: iNat monthly histogram (fetched lazily, 30-day cache).
                Fallback: estimate from overall frequency field spread across active seasons. */}
            {(() => {
              const sciKey = animal.scientificName?.toLowerCase();
              // histFreq: null = fetched but <5 obs; undefined = not yet fetched / no sciName
              const histFreq = sciKey ? seasonalFreqs?.[sciKey] : undefined;
              const freq = (histFreq != null && histFreq !== undefined)
                ? histFreq
                : estimateSeasonalFreqFromField(
                    animal.frequency ?? animal._debug?.frequency,
                    animal.seasons,
                    animal.rarity,
                  );
              if (!freq) return null;
              const isEstimated = freq._estimated === true;
              const SEASON_KEYS = ['spring', 'summer', 'fall', 'winter'];
              const SEASON_EMOJI = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
              const validSeasons = (animal.seasons?.includes('year_round') || animal.seasons?.includes('year-round'))
                ? SEASON_KEYS
                : SEASON_KEYS.filter(s => animal.seasons?.includes(s));
              const items = validSeasons
                .map(s => ({ s, pct: freq[s] }))
                .filter(({ pct }) => pct != null && pct > 0);
              if (!items.length) return null;
              // True when the fetch is in-flight: sciKey exists but not yet in the map
              const fetchInFlight = isEstimated && sciKey && !(sciKey in (seasonalFreqs ?? {}));
              return (
                <div className={`seasonal-freq${isEstimated ? ' seasonal-freq--est' : ''}`}>
                  {items.map(({ s, pct }) => {
                    const colorClass = pct >= 60 ? 'freq--high' : pct >= 30 ? 'freq--med' : pct >= 10 ? 'freq--low' : 'freq--trace';
                    return (
                      <span
                        key={s}
                        className={`freq-badge ${colorClass}`}
                        title={isEstimated
                          ? `~${pct}% estimated presence in ${s} (from overall encounter rate)`
                          : `${pct}% of iNaturalist observations were recorded in ${s}`}
                      >
                        {SEASON_EMOJI[s]} {pct}%
                      </span>
                    );
                  })}
                  {isEstimated && (
                    <span className="freq-est-flag" title="Estimated from overall sighting frequency">~est</span>
                  )}
                  {fetchInFlight && (
                    <span className="freq-loading" title="Loading accurate seasonal data from iNaturalist…">↻</span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Description — 3-tier hierarchy with source badge */}
      {needsGeneratedDescription(animal.funFact) ? (
        animal.description
          ? <>
              <p className="animal-card__fact">{animal.description}</p>
              {animal.descriptionSource && (
                <span className="description-source">
                  {DESC_SOURCE_ICON[animal.descriptionSource] ?? '📖'}{' '}
                  {DESC_SOURCE_LABEL[animal.descriptionSource] ?? animal.descriptionSource}
                </span>
              )}
            </>
          : null
      ) : (
        <>
          <p className="animal-card__fact">{animal.funFact}</p>
          <span className="description-source">🏛️ Park Naturalist</span>
        </>
      )}

      {/* Source tags — one badge per source; multiple when confirmed by >1 API */}
      <div className="source-tags">
        {sources.map(srcKey => {
          const color = SOURCE_COLORS[srcKey] ?? '#6b7280';
          return (
            <span
              key={srcKey}
              className="source-tag"
              style={{ background: color + '18', color, borderColor: color + '44' }}
              title={SOURCE_TOOLTIPS[srcKey] ?? srcKey}
            >
              {SOURCE_ICONS[srcKey] ?? '🏛️'} {SOURCE_LABELS[srcKey] ?? srcKey}
            </span>
          );
        })}
        {sources.length >= 2 && (
          <span className="verified-badge" title="Presence confirmed by two or more independent databases">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Debug panel — only shown when debug mode is active (D key) */}
      {debugMode && (
        <div className="debug-panel">
          <div className="debug-panel__title">🐛 Debug Info</div>
          <div className="debug-row">
            <span className="debug-label">🔗 Endpoint</span>
            <span className="debug-value debug-value--url">
              {animal._debug?.endpoint ?? 'none — hardcoded estimate'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">📊 Observations</span>
            <span className="debug-value">
              {animal._debug?.obsCount != null ? animal._debug.obsCount : '— (NPS topic / hardcoded)'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">📈 Frequency</span>
            <span className="debug-value">
              {animal._debug?.frequency != null
                ? `${(animal._debug.frequency * 100).toFixed(1)}% → ${animal.rarity}`
                : '— (NPS / hardcoded)'}
            </span>
          </div>
          <div className="debug-row">
            <span className="debug-label">🕐 Fetched</span>
            <span className="debug-value">
              {fetchedStr ?? 'hardcoded — no API call made'}
            </span>
          </div>
          {animal._debug?.npsTopic && (
            <div className="debug-row">
              <span className="debug-label">🏕️ NPS Topic</span>
              <span className="debug-value">"{animal._debug.npsTopic}"</span>
            </div>
          )}
          {sources.length > 1 && (
            <div className="debug-row">
              <span className="debug-label">🔀 Sources</span>
              <span className="debug-value">{sources.join(', ')} (merged)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exceptional card (Rare Finds section) ─────────────────────────────────────
// Same photo logic as AnimalCard. fetchAnimalPhoto uses a shared in-memory +
// localStorage cache, so if the animal was already shown in the main list above
// the photo resolves instantly without a second network call.
function ExceptionalCard({ animal, seasonalFreqs, location }) {
  const t = ANIMAL_TYPES[animal.animalType];
  const placeholderEmoji = t?.emoji ?? animal.emoji ?? '🐾';

  const [photo,    setPhoto]    = useState(undefined);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAnimalPhoto(animal.name).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [animal.name]);

  return (
    <div className="exceptional-card">

      {/* Full-size photo overlay — same as AnimalCard */}
      {expanded && photo && (
        <div className="photo-full" onClick={() => setExpanded(false)}>
          <img src={photo.largeUrl} alt={animal.name} className="photo-full__img" />
          <div className="photo-full__credit">
            📷 {photo.attribution ?? photo.credit ?? photo.source}
          </div>
          <div className="photo-full__hint">tap to close</div>
        </div>
      )}

      <div className="exceptional-card__top">
        {/* Photo thumbnail — exact same states as AnimalCard */}
        <div className="photo-col">
          {photo === undefined ? (
            <div className="photo-thumb photo-thumb--skeleton">
              <span aria-hidden="true">{placeholderEmoji}</span>
            </div>
          ) : photo === null ? (
            <div className="photo-thumb photo-thumb--none">
              <span aria-hidden="true">{placeholderEmoji}</span>
            </div>
          ) : (
            <button
              className="photo-thumb photo-thumb--img"
              onClick={() => setExpanded(prev => !prev)}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} photo of ${animal.name}`}
            >
              <img src={photo.url} alt={animal.name} />
              <div className="photo-thumb__credit">📷 {photo.credit ?? photo.source}</div>
            </button>
          )}
        </div>

        <div className="exceptional-card__info">
          <div className="exceptional-card__name">
            {animal.name}
            {t && <span className="type-chip" style={{ background: t.color + '20', color: t.color }}>{t.emoji}</span>}
          </div>
          {animal.scientificName && (
            <div className="animal-card__scientific">{animal.scientificName}</div>
          )}
          <span className="rarity-badge rarity-badge--exceptional" style={{ color: '#7c3aed', background: '#7c3aed18', borderColor: '#7c3aed44' }}>
            ⭐ Exceptional
          </span>
          {/* Seasonal frequency percentages — same logic as AnimalCard */}
          {(() => {
            const sciKey = animal.scientificName?.toLowerCase();
            const histFreq = sciKey ? seasonalFreqs?.[sciKey] : undefined;
            const freq = (histFreq != null && histFreq !== undefined)
              ? histFreq
              : estimateSeasonalFreqFromField(
                  animal.frequency ?? animal._debug?.frequency,
                  animal.seasons,
                  animal.rarity,
                );
            if (!freq) return null;
            const isEstimated = freq._estimated === true;
            const SEASON_KEYS = ['spring', 'summer', 'fall', 'winter'];
            const SEASON_EMOJI = { spring: '🌸', summer: '☀️', fall: '🍂', winter: '❄️' };
            const validSeasons = (animal.seasons?.includes('year_round') || animal.seasons?.includes('year-round'))
              ? SEASON_KEYS
              : SEASON_KEYS.filter(s => animal.seasons?.includes(s));
            const items = validSeasons
              .map(s => ({ s, pct: freq[s] }))
              .filter(({ pct }) => pct != null && pct > 0);
            if (!items.length) return null;
            return (
              <div className={`seasonal-freq${isEstimated ? ' seasonal-freq--est' : ''}`}>
                {items.map(({ s, pct }) => {
                  const colorClass = pct >= 60 ? 'freq--high' : pct >= 30 ? 'freq--med' : pct >= 10 ? 'freq--low' : 'freq--trace';
                  return (
                    <span
                      key={s}
                      className={`freq-badge ${colorClass}`}
                      title={isEstimated
                        ? `~${pct}% estimated presence in ${s} (from overall encounter rate)`
                        : `${pct}% of iNaturalist observations were recorded in ${s}`}
                    >
                      {SEASON_EMOJI[s]} {pct}%
                    </span>
                  );
                })}
                {isEstimated && (
                  <span className="freq-est-flag" title="Estimated from overall sighting frequency">~est</span>
                )}
                {isEstimated && sciKey && !(sciKey in (seasonalFreqs ?? {})) && (
                  <span className="freq-loading" title="Loading accurate seasonal data from iNaturalist…">↻</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {needsGeneratedDescription(animal.funFact) ? (
        animal.description
          ? <>
              <p className="exceptional-card__fact">{animal.description}</p>
              {animal.descriptionSource && (
                <span className="description-source">
                  {DESC_SOURCE_ICON[animal.descriptionSource] ?? '📖'}{' '}
                  {DESC_SOURCE_LABEL[animal.descriptionSource] ?? animal.descriptionSource}
                </span>
              )}
            </>
          : null
      ) : (
        <>
          <p className="exceptional-card__fact">{animal.funFact}</p>
          <span className="description-source">🏛️ Park Naturalist</span>
        </>
      )}

      {/* Source badges — same logic as AnimalCard */}
      {(() => {
        const excSources = resolveAnimalSources(animal);
        return (
          <div className="source-tags">
            {excSources.map(srcKey => {
              const color = SOURCE_COLORS[srcKey] ?? '#6b7280';
              return (
                <span
                  key={srcKey}
                  className="source-tag"
                  style={{ background: color + '18', color, borderColor: color + '44' }}
                  title={SOURCE_TOOLTIPS[srcKey] ?? srcKey}
                >
                  {SOURCE_ICONS[srcKey] ?? '🏛️'} {SOURCE_LABELS[srcKey] ?? srcKey}
                </span>
              );
            })}
            {excSources.length >= 2 && (
              <span className="verified-badge" title="Presence confirmed by two or more independent databases">
                ✓ Verified
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ── Popup ─────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatCacheAge(ts) {
  const ms   = Date.now() - ts;
  const mins = Math.floor(ms / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins} minutes ago`;
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 24)   return 'today';
  const days = Math.floor(ms / 86400000);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function LocationPopup({ location, effectiveAnimals, season, rarity, animalType,
  isLive, sources, isLoading, debugMode, stats, barChart, cacheTs,
  loadingProgress, refreshLocation,
  popupType, setPopupType, popupSort, setPopupSort,
  popupSeason, setPopupSeason, popupRarity, setPopupRarity,
  popupSubtype, setPopupSubtype }) {
  const POPUP_PROGRESS_GROUPS = ['birds', 'mammals', 'reptiles', 'amphibians', 'insects', 'marine'];
  const PROGRESS_EMOJI = { birds: '🐦', mammals: '🦌', reptiles: '🐊', amphibians: '🐸', insects: '🦋', marine: '🐋' };

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const monthName    = MONTH_NAMES[currentMonth - 1];

  // Search resets when popup switches to a different location
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [location.id]);

  // ── Tab-bar scroll-hint arrows ───────────────────────────────────────────
  const tabsRef = useRef(null);
  const [tabsCanScrollLeft,  setTabsCanScrollLeft]  = useState(false);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);
  const updateTabArrows = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setTabsCanScrollLeft(el.scrollLeft > 4);
    setTabsCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    updateTabArrows();
    el.addEventListener('scroll', updateTabArrows, { passive: true });
    const ro = new ResizeObserver(updateTabArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateTabArrows); ro.disconnect(); };
  }, [updateTabArrows]);

  // Subtype bar scroll arrows — same pattern as main type tabs
  const subtypesRef = useRef(null);
  const [subtypesCanScrollLeft,  setSubtypesCanScrollLeft]  = useState(false);
  const [subtypesCanScrollRight, setSubtypesCanScrollRight] = useState(false);
  const updateSubtypeArrows = useCallback(() => {
    const el = subtypesRef.current;
    if (!el) return;
    setSubtypesCanScrollLeft(el.scrollLeft > 4);
    setSubtypesCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);
  useEffect(() => {
    const el = subtypesRef.current;
    if (!el) return;
    updateSubtypeArrows();
    el.addEventListener('scroll', updateSubtypeArrows, { passive: true });
    const ro = new ResizeObserver(updateSubtypeArrows);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateSubtypeArrows); ro.disconnect(); };
  }, [updateSubtypeArrows, popupType]); // re-attach when popupType changes (subtype bar mounts/unmounts)

  // ── User sightings ─────────────────────────────────────────────────────────
  // Persisted per-park in localStorage; reloaded whenever the popup changes park.
  const [sightings, setSightings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`wildlife_sightings_${location.id}`) || '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    try { setSightings(JSON.parse(localStorage.getItem(`wildlife_sightings_${location.id}`) || '[]')); }
    catch { setSightings([]); }
  }, [location.id]);

  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingDraft, setSightingDraft] = useState({ animal: '', date: '', howCommon: 'common' });
  const [showAboutData, setShowAboutData] = useState(false);

  const submitSighting = () => {
    if (!sightingDraft.animal.trim()) return;
    const entry = {
      id:        Date.now(),
      animal:    sightingDraft.animal.trim(),
      date:      sightingDraft.date || new Date().toISOString().slice(0, 10),
      howCommon: sightingDraft.howCommon,
    };
    const updated = [entry, ...sightings];
    setSightings(updated);
    localStorage.setItem(`wildlife_sightings_${location.id}`, JSON.stringify(updated));
    setSightingDraft({ animal: '', date: '', howCommon: 'common' });
    setShowSightingForm(false);
  };

  const deleteSighting = id => {
    const updated = sightings.filter(s => s.id !== id);
    setSightings(updated);
    localStorage.setItem(`wildlife_sightings_${location.id}`, JSON.stringify(updated));
  };

  // Build a case-insensitive bar chart lookup to handle minor name differences
  // between the recent-obs and bar-chart endpoints.
  const barChartLC = useMemo(() => {
    if (!barChart) return null;
    const m = {};
    Object.entries(barChart).forEach(([k, v]) => { m[k.toLowerCase()] = v; });
    return m;
  }, [barChart]);

  // ── iNat seasonal frequencies for bird cards ─────────────────────────────
  // { scientificNameLower → { spring, summer, fall, winter, total } | null }
  // null  = fetched but <5 observations (use estimateSeasonalFreqFromField fallback)
  // undefined key = not yet fetched
  const [seasonalFreqs, setSeasonalFreqs] = useState({});
  const freqFetchedRef = useRef(new Set());

  // Reset when the popup switches to a different location
  useEffect(() => {
    freqFetchedRef.current = new Set();
    setSeasonalFreqs({});
  }, [location.id]);

  // Lazy-fetch iNat histograms for every bird in the visible list.
  // • Sorted by frequency desc so the most-likely-seen birds load first.
  // • Staggered 150 ms apart so we don't hammer the iNat API.
  // • freqFetchedRef prevents duplicate fetches when effectiveAnimals updates
  //   mid-fetch (e.g. more data streaming in from useLiveData).
  // • fetchInatMonthlyHist has a 30-day localStorage cache, so re-running
  //   on subsequent popup opens is instant for already-cached species.
  useEffect(() => {
    if (!effectiveAnimals?.length) return;
    const withSciName = effectiveAnimals.filter(a => a.scientificName);
    const top250 = withSciName
      .sort((a, b) => {
        // Use Math.max(numeric freq, rarity-derived freq) so:
        // • Species with a good numeric frequency (e.g. Ruffed Grouse 0.046) are never
        //   demoted by the rarity fallback injection.
        // • Species with frequency: undefined but a known rarity (e.g. Common Loon
        //   "likely" → 0.40) are promoted above low-frequency eBird-only species.
        const fa = Math.max(a.frequency ?? 0, RARITY_FREQ_FALLBACK[a.rarity] ?? 0);
        const fb = Math.max(b.frequency ?? 0, RARITY_FREQ_FALLBACK[b.rarity] ?? 0);
        return fb - fa;
      })
      .slice(0, 250);
    // Force-include exceptional mammals/reptiles/amphibians not in top250 —
    // they appear in the Rare Sightings section and iNat has real seasonal data
    // for many of them (e.g. Mountain Lion: 15 obs, spring:20% summer:33%).
    // Excludes insects/marine to keep the queue bounded (hundreds of exc. insects).
    const top250Keys = new Set(top250.map(a => a.scientificName));
    const excExtras = withSciName.filter(a =>
      a.rarity === 'exceptional' &&
      !top250Keys.has(a.scientificName) &&
      ['mammal', 'reptile', 'amphibian', 'bird'].includes(a.animalType)
    );
    const birds = [...top250, ...excExtras]; // total: ~250 + handful of exc. vertebrates
    if (!birds.length) return;
    let alive = true;
    (async () => {
      for (const bird of birds) {
        if (!alive) break;
        const key = bird.scientificName.toLowerCase();
        if (freqFetchedRef.current.has(key)) continue;
        freqFetchedRef.current.add(key);
        const result = await fetchInatMonthlyHist(
          location.lat, location.lng, location.id, bird.scientificName,
        );
        if (!alive) break;
        setSeasonalFreqs(prev => ({ ...prev, [key]: result }));
        await new Promise(r => setTimeout(r, 150));
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id, effectiveAnimals]);

  // Enrich every animal with seasonally-accurate, corrected rarity where possible:
  //   • Animals with bar chart data → bar chart frequency + correction factor + new thresholds
  //   • Animals with a raw frequency field + correction needed → corrected static rarity
  //   • Everything else → rarity from the animal object unchanged
  const enriched = useMemo(() => effectiveAnimals.map(a => {
    const periods = barChart?.[a.name] ?? barChartLC?.[a.name?.toLowerCase()] ?? null;
    const factor  = getCorrectionFactor(a.name);

    // Compute displaySeasons: which seasons is this animal present in?
    // Bar-chart animals: derive from eBird data using 5% threshold per season.
    // Hardcoded animals: normalise seasons[] — all-4 or explicit 'year-round' → ['year-round'].
    const displaySeasons = periods
      ? getSeasonsFromBarChart(periods, factor)
      : (() => {
          const s = a.seasons ?? ['spring'];
          return (s.includes('year-round') || s.includes('year_round')) ? ['year-round'] : s;
        })();

    if (periods) {
      // Gold-standard path: eBird bar chart frequency for this season/month
      const rawFreq      = season === 'all'
        ? getMonthlyFrequency(periods, currentMonth)
        : getSeasonalFreq(periods, season);
      const correctedFreq = Math.min(1, rawFreq * factor);
      const periodLabel   = season === 'all' ? monthName : season;
      const computedRarity = applyRarityOverride(location.id, a.name, rarityFromChecklist(correctedFreq));
      return {
        ...a,
        displaySeasons,
        rarity:        computedRarity,
        _barChartFreq: correctedFreq,
        _rawBarFreq:   rawFreq,
        funFact: (a.source === 'ebird' || a.sources?.includes('ebird'))
          ? `Appears on ${Math.round(rawFreq * 100)}% of ${periodLabel} eBird checklists at this location.`
          : a.funFact,
      };
    }

    if (a.frequency != null && factor !== 1) {
      // Fallback path: apply correction to the existing raw frequency
      const correctedFreq = Math.min(1, a.frequency * factor);
      const computedRarity = applyRarityOverride(location.id, a.name, rarityFromChecklist(correctedFreq));
      return { ...a, displaySeasons, rarity: computedRarity };
    }

    // Apply park-specific override (e.g. Bison at Yellowstone = guaranteed)
    const overriddenRarity = applyRarityOverride(location.id, a.name, a.rarity);
    return { ...a, displaySeasons, rarity: overriddenRarity };
  }), [effectiveAnimals, barChart, barChartLC, season, currentMonth, monthName, location.id]);

  // Total counts across the full enriched list — used as denominators in tab badges
  const totalTypeCounts = useMemo(() => {
    const c = { all: enriched.length };
    enriched.forEach(a => { c[a.animalType] = (c[a.animalType] ?? 0) + 1; });
    return c;
  }, [enriched]);

  // Season-filtered pool — applies only the season filter, nothing else.
  // Used to drive season-aware tab/subtype counts.
  const seasonFiltered = useMemo(() => {
    if (popupSeason === 'all') return enriched;
    return enriched.filter(a => {
      const segs = a.displaySeasons ?? a.seasons ?? [];
      return segs.includes('year-round') || segs.includes('year_round') || segs.includes(popupSeason);
    });
  }, [enriched, popupSeason]);

  // Season-aware count per animal type (for tab badges)
  const typeCounts = useMemo(() => {
    const c = { all: seasonFiltered.length };
    seasonFiltered.forEach(a => { c[a.animalType] = (c[a.animalType] ?? 0) + 1; });
    return c;
  }, [seasonFiltered]);

  // Season-aware count per subtype for the active animal-type tab
  const subtypeCounts = useMemo(() => {
    if (!getSubtypeDefs(popupType)) return null;
    const pool = popupType === 'all' ? seasonFiltered : seasonFiltered.filter(a => a.animalType === popupType);
    const counts = {};
    pool.forEach(a => {
      const sub = classifyAnimalSubtype(a);
      counts[sub] = (counts[sub] ?? 0) + 1;
    });
    return counts;
  }, [seasonFiltered, popupType]);

  // "Show all" toggle for the default uncapped view; display page size for filtered views.
  const [showAll,      setShowAll]      = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);

  // Reset paging whenever the location or any filter changes
  useEffect(() => { setShowAll(false); setDisplayLimit(50); }, [location.id]);
  useEffect(() => { setDisplayLimit(50); }, [popupType, popupSubtype, popupSeason, popupRarity, search, popupSort]);

  // Popup-local filtering + sorting (independent of global header filters).
  // Returns the full sorted list — slicing is handled in render based on state.
  const { display: filtered, isFiltered } = useMemo(() => {
    let result = enriched;

    if (popupType !== 'all') result = result.filter(a => a.animalType === popupType);

    // Subtype filter — only when a specific subtype is selected for a supported type
    if (popupSubtype !== 'all' && getSubtypeDefs(popupType)) {
      result = result.filter(a => classifyAnimalSubtype(a) === popupSubtype);
    }

    if (popupSeason !== 'all') {
      // Use displaySeasons (computed in enriched from bar-chart or static data).
      // Year-round animals always pass any season filter.
      // Multi-season animals pass if the selected season is one of theirs.
      result = result.filter(a => {
        const segs = a.displaySeasons ?? a.seasons ?? [];
        return segs.includes('year-round') || segs.includes('year_round') || segs.includes(popupSeason);
      });
    }

    if (popupRarity !== 'all') result = result.filter(a => a.rarity === popupRarity);

    // When sort is 'common-first' and no specific rarity is selected, exceptional
    // animals are shown exclusively in the Rare Finds section below the main list.
    // Exclude them here so they don't appear twice. For all other sort orders
    // (rarest-first, a-z) they integrate naturally into the sorted main list.
    if (popupSort === 'common-first' && popupRarity === 'all') {
      result = result.filter(a => a.rarity !== 'exceptional');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.scientificName?.toLowerCase().includes(q)
      );
    }

    const rarityOrder = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
    if (popupSort === 'common-first') {
      result = [...result].sort((a, b) => (rarityOrder[a.rarity] ?? 5) - (rarityOrder[b.rarity] ?? 5));
    } else if (popupSort === 'rarest-first') {
      result = [...result].sort((a, b) => (rarityOrder[b.rarity] ?? 5) - (rarityOrder[a.rarity] ?? 5));
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    // A "filter" is any user-driven narrowing beyond the default full list view.
    const isFiltered = popupType !== 'all' || popupSubtype !== 'all'
      || popupSeason !== 'all' || popupRarity !== 'all' || !!search.trim();

    return { display: result, isFiltered };
  }, [enriched, popupType, popupSubtype, popupSeason, popupRarity, search, popupSort]);

  // Exceptional animals for the Rare Finds section — fully filter-aware.
  // Applies the same type / subtype / season / search filters as the main list
  // so the section stays in sync with every active filter.
  const exceptionalAnimals = useMemo(() => {
    let result = enriched.filter(a => a.rarity === 'exceptional');

    if (popupType !== 'all') result = result.filter(a => a.animalType === popupType);

    if (popupSubtype !== 'all' && getSubtypeDefs(popupType)) {
      result = result.filter(a => classifyAnimalSubtype(a) === popupSubtype);
    }

    if (popupSeason !== 'all') {
      result = result.filter(a => {
        const segs = a.displaySeasons ?? a.seasons ?? [];
        return segs.includes('year-round') || segs.includes('year_round') || segs.includes(popupSeason);
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.scientificName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [enriched, popupType, popupSubtype, popupSeason, search]);

  // Dynamic Rare Finds header — reflects the most specific active filter.
  // Priority: search > subtype > type > season > default.
  const rareFindTitle = (() => {
    if (search.trim()) return `⭐ Once in a Lifetime: "${search.trim()}"`;

    const subtypeDefs = getSubtypeDefs(popupType);
    if (popupSubtype !== 'all' && subtypeDefs) {
      const def = subtypeDefs.find(d => d.key === popupSubtype);
      if (def) return `🌟 Rare ${def.label} at This Park`;
    }

    if (popupType !== 'all') {
      const typeDef = ANIMAL_TYPES[popupType];
      if (typeDef) return `🌟 Rare ${typeDef.label} at This Park`;
    }

    if (popupSeason !== 'all') {
      const seasonDef = SEASONS[popupSeason];
      if (seasonDef) return `🌟 Rare ${seasonDef.label} Sightings`;
    }

    return '⭐ Once in a Lifetime Sightings';
  })();

  // Count animals by type — season-filtered so breakdown chips reflect active season
  const typeBreakdown = seasonFiltered.reduce((acc, a) => {
    const t = a.animalType ?? 'other';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const parkStyle = PARK_TYPE_STYLES[location.locationType];

  // Source coverage summary for debug mode.
  // An animal confirmed by multiple APIs contributes to each source's count.
  const sourceCounts = debugMode
    ? enriched.reduce((acc, a) => {
        const srcs = a.sources?.length ? a.sources : [a.source ?? 'estimated'];
        srcs.forEach(s => { acc[s] = (acc[s] ?? 0) + 1; });
        return acc;
      }, {})
    : null;

  return (
    <div className="lp">
      <div className="lp__head">
        <div className="lp__name">{location.name}</div>
        <div className="lp__meta">
          <span className="lp__state">{location.state}</span>
          {parkStyle && (
            <span className="lp__park-badge" style={{ background: parkStyle.bg }}>
              {parkStyle.label}
            </span>
          )}
        </div>
        {/* ── Data attribution line ─────────────────────────────────────── */}
        {isLive && (() => {
          // Build unique institutional names from live sources (skip static/estimated)
          const liveSrcs = [...new Set(sources.filter(s => s !== 'static' && s !== 'estimated'))];
          const attrs = liveSrcs.length
            ? liveSrcs.map(s => SOURCE_LONG[s] ?? SOURCE_LABELS[s]).join(' · ')
            : 'National Park Service · Park Records';
          return (
            <div className="lp__source-attr">
              {cacheTs && !isLoading
                ? <span title="Data loaded from local cache">◉ {formatCacheAge(cacheTs)} · </span>
                : <span title="Live data">● Live · </span>
              }
              {attrs}
            </div>
          );
        })()}
        {isLoading && !isLive && <div className="lp__loading">⟳ Fetching live data…</div>}

        {isLoading && !isLive && loadingProgress?.[location.id] && (
          <div className="lp__progress">
            {POPUP_PROGRESS_GROUPS.map(g => {
              const status = loadingProgress[location.id][g] ?? 'pending';
              return (
                <span key={g} className={`lp__progress-item lp__progress-item--${status}`}>
                  {PROGRESS_EMOJI[g]} {g} {status === 'done' ? '✓' : status === 'loading' ? '↻' : ''}
                </span>
              );
            })}
          </div>
        )}

        {/* Refreshing pill — has cached data, silently re-fetching */}
        {isLive && isLoading && (
          <div className="lp__refreshing">↻ Refreshing wildlife data…</div>
        )}

        {/* Manual refresh button — only when idle */}
        {!isLoading && (
          <button className="lp__refresh-btn" onClick={() => refreshLocation(location.id)}
            aria-label="Refresh wildlife data" title="Refresh live data">↻</button>
        )}
        {/* Species type breakdown row */}
        {Object.keys(typeBreakdown).length > 0 && (
          <div className="lp__breakdown">
            {Object.entries(ANIMAL_TYPES)
              .filter(([k]) => k !== 'all' && typeBreakdown[k])
              .map(([k, { emoji, label }]) => (
                <span key={k} className="breakdown-chip" title={label}>
                  {emoji} {typeBreakdown[k]}
                </span>
              ))}
            {popupSeason !== 'all' && (
              <span className="breakdown-chip breakdown-chip--season" title="Active season filter">
                {SEASONS[popupSeason]?.emoji ?? '📅'} {SEASONS[popupSeason]?.label ?? popupSeason}
              </span>
            )}
          </div>
        )}
        {/* API data note — eBird checklist count + iNat observation count */}
        {stats && (stats.ebirdChecklists || stats.inatObservations > 0) && (
          <div className="lp__api-note">
            📊{' '}
            {[
              stats.ebirdChecklists
                ? `${stats.ebirdChecklists} eBird checklist${stats.ebirdChecklists !== 1 ? 's' : ''}`
                : null,
              stats.inatObservations
                ? `${stats.inatObservations.toLocaleString()} iNat obs`
                : null,
            ].filter(Boolean).join(' · ')}
            {stats.ebirdHistoricalSpecies
              ? ` · ${stats.ebirdHistoricalSpecies} historical spp`
              : null}
          </div>
        )}
        {/* Debug mode: source coverage summary */}
        {debugMode && sourceCounts && (
          <div className="lp__debug-summary">
            <span className="debug-summary-title">🐛 Source coverage:</span>
            {Object.entries(sourceCounts).map(([src, cnt]) => (
              <span key={src} className="debug-summary-chip" style={{ color: SOURCE_COLORS[src] ?? '#6b7280' }}>
                {SOURCE_ICONS[src]} {SOURCE_LABELS[src] ?? src}: {cnt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Type tabs ── */}
      <div className="lp__tabs-wrapper">
        {tabsCanScrollLeft && (
          <button className="lp__tabs-arrow lp__tabs-arrow--left" aria-hidden="true" tabIndex={-1}
            onClick={() => tabsRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>‹</button>
        )}
        <div className="lp__tabs" role="tablist" ref={tabsRef}>
          {Object.entries(ANIMAL_TYPES).map(([k, { emoji, label }]) => {
            const count   = typeCounts[k] ?? 0;
            const isEmpty = k !== 'all' && count === 0;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={popupType === k}
                className={`lp__tab${popupType === k ? ' lp__tab--active' : ''}${isEmpty ? ' lp__tab--empty' : ''}`}
                onClick={(e) => { if (!isEmpty) { setPopupType(k); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest' }); } }}
                disabled={isEmpty}
                title={label}
              >
                <span aria-hidden="true">{emoji}</span>
                <span className="lp__tab-label">{k === 'all' ? 'All' : label}</span>
                {k !== 'all' && count > 0 && (
                  <span className="lp__tab-count" title={popupSeason !== 'all' ? `${count} in ${SEASONS[popupSeason]?.label ?? popupSeason} / ${totalTypeCounts[k] ?? 0} total` : undefined}>
                    {popupSeason !== 'all' && (totalTypeCounts[k] ?? 0) !== count
                      ? `${count}/${totalTypeCounts[k] ?? 0}`
                      : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {tabsCanScrollRight && (
          <button className="lp__tabs-arrow lp__tabs-arrow--right" aria-hidden="true" tabIndex={-1}
            onClick={() => tabsRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}>›</button>
        )}
      </div>

      {/* ── Subtype filter bar — only for birds, mammals, reptiles ── */}
      {getSubtypeDefs(popupType) && (
        <div className="lp__subtypes-wrapper">
          {subtypesCanScrollLeft && (
            <button className="lp__subtypes-arrow lp__subtypes-arrow--left" aria-hidden="true" tabIndex={-1}
              onClick={() => subtypesRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>‹</button>
          )}
          <div className="lp__subtypes" role="group" aria-label="Animal subcategory" ref={subtypesRef}>
            {getSubtypeDefs(popupType).map(({ key, emoji, label }) => {
              const count   = key === 'all'
                ? (typeCounts[popupType] ?? 0)
                : (subtypeCounts?.[key] ?? 0);
              const isEmpty = key !== 'all' && count === 0;
              return (
                <button
                  key={key}
                  className={`lp__subtype-btn${popupSubtype === key ? ' lp__subtype-btn--active' : ''}${isEmpty ? ' lp__subtype-btn--empty' : ''}`}
                  onClick={() => { if (!isEmpty) { setPopupSubtype(key); subtypesRef.current?.querySelector('.lp__subtype-btn--active')?.scrollIntoView({ behavior: 'smooth', inline: 'nearest' }); } }}
                  disabled={isEmpty}
                  title={label}
                  aria-pressed={popupSubtype === key}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span className="lp__subtype-label">{label}</span>
                  {count > 0 && <span className="lp__subtype-count">{count}</span>}
                </button>
              );
            })}
          </div>
          {subtypesCanScrollRight && (
            <button className="lp__subtypes-arrow lp__subtypes-arrow--right" aria-hidden="true" tabIndex={-1}
              onClick={() => subtypesRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}>›</button>
          )}
        </div>
      )}

      {/* ── Controls: sort + season filter + rarity filter + search ── */}
      <div className="lp__controls">
        <div className="lp__controls-row">
          <select
            className="lp__select"
            value={popupSort}
            onChange={e => setPopupSort(e.target.value)}
            aria-label="Sort order"
          >
            <option value="common-first">Most Common</option>
            <option value="rarest-first">Rarest First</option>
            <option value="a-z">A–Z</option>
          </select>
          <select
            className="lp__select"
            value={popupSeason}
            onChange={e => setPopupSeason(e.target.value)}
            aria-label="Season filter"
          >
            {Object.entries(SEASONS).map(([k, { emoji, label }]) => (
              <option key={k} value={k}>{emoji} {label}</option>
            ))}
          </select>
        </div>
        {/* Rarity filter — full width row */}
        <select
          className="lp__select lp__select--full"
          value={popupRarity}
          onChange={e => setPopupRarity(e.target.value)}
          aria-label="Rarity filter"
        >
          {Object.entries(RARITY).map(([k, { emoji, label }]) => (
            <option key={k} value={k}>{emoji} {label}</option>
          ))}
        </select>
        <div className="lp__search">
          <span className="lp__search-icon" aria-hidden="true">🔍</span>
          <input
            className="lp__search-input"
            type="search"
            placeholder="Search species…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search species"
          />
          {search && (
            <button className="lp__search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>
      </div>

      {/* ── Single scroll container: animal list + Rare Finds section ── */}
      <div className="lp__scroll">
        <div className="lp__body">
          {!isLive && isLoading && (
            [0, 1, 2, 3].map(i => <div key={i} className="lp__skeleton-card" aria-hidden="true" />)
          )}
          {/* No data yet and no fetch in flight — park just queued, show holding message */}
          {!isLive && !isLoading && (
            <p className="lp__empty lp__empty--loading">
              🌿 Wildlife data loading… tap again in a moment.
            </p>
          )}
          {isLive && (() => {
            if (filtered.length === 0) {
              return (
                <p className="lp__empty">
                  {search
                    ? `No species matching "${search}"`
                    : 'No wildlife matches the current filters at this location.'}
                </p>
              );
            }
            // Default view (no filters): cap at 20, show "Show all" button
            const isDefaultCapped = !isFiltered && !showAll && filtered.length > 20;
            // Filtered view: paginate at displayLimit, never cut off entirely
            const visibleList = isDefaultCapped
              ? filtered.slice(0, 20)
              : filtered.slice(0, displayLimit);
            const hasMore = !isDefaultCapped && displayLimit < filtered.length;

            return (
              <>
                {visibleList.map((a, i) => <AnimalCard key={`${a.name}-${i}`} animal={a} debugMode={debugMode} seasonalFreqs={seasonalFreqs} location={location} />)}
                {isDefaultCapped && (
                  <button className="lp__show-all-btn" onClick={() => setShowAll(true)}>
                    Show all {filtered.length} species ↓
                  </button>
                )}
                {hasMore && (
                  <button className="lp__load-more-btn" onClick={() => setDisplayLimit(d => d + 50)}>
                    Load more · {filtered.length - displayLimit} remaining
                  </button>
                )}
              </>
            );
          })()}

          {/* Background API refresh in progress — show at bottom so static data stays visible */}
          {isLive && isLoading && (
            <div className="lp__loading-more" aria-live="polite">
              <span className="lp__loading-more-dot" aria-hidden="true" />
              Loading more species…
            </div>
          )}
        </div>

        {/* ── Rare Finds highlight section ───────────────────────────────────
             Shown only on 'Most Common First' sort with rarity set to 'all'
             (exceptional animals are excluded from the main list in that mode
             and displayed here instead). On other sorts they integrate into the
             main list naturally. Fully filter-aware: respects type, subtype,
             season, and search. Hidden automatically when the filtered set is
             empty (requirement: no empty section).                            ── */}
        {isLive && exceptionalAnimals.length > 0 && popupSort === 'common-first' && popupRarity === 'all' && (
          <div className="lp__exceptional">
            <div className="lp__exceptional-title">
              {rareFindTitle}
            </div>
            <p className="lp__exceptional-sub">
              These animals have been documented at this park but are extremely rarely seen by visitors. A sighting is once-in-a-lifetime lucky.
            </p>
            <div className="lp__exceptional-cards">
              {exceptionalAnimals.map((a, i) => (
                <ExceptionalCard key={`exc-${a.name}-${i}`} animal={a} seasonalFreqs={seasonalFreqs} location={location} />
              ))}
            </div>
          </div>
        )}

        {/* ── Report a Sighting ─────────────────────────────────────────────
             Shows a compact form; saves to localStorage with 👤 badge.     ── */}
        <div className="lp__sightings">
          <button
            className={`lp__sighting-trigger${showSightingForm ? ' lp__sighting-trigger--open' : ''}`}
            onClick={() => setShowSightingForm(v => !v)}
          >
            📍 {showSightingForm ? 'Cancel' : 'Report a Sighting'}
          </button>

          {showSightingForm && (
            <div className="lp__sighting-form">
              <label className="lp__sighting-label">
                Animal name
                <input
                  className="lp__sighting-input"
                  type="text"
                  placeholder="e.g. Bald Eagle"
                  value={sightingDraft.animal}
                  onChange={e => setSightingDraft(d => ({ ...d, animal: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitSighting()}
                  autoFocus
                />
              </label>
              <div className="lp__sighting-row">
                <label className="lp__sighting-label">
                  Date seen
                  <input
                    className="lp__sighting-input"
                    type="date"
                    value={sightingDraft.date}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => setSightingDraft(d => ({ ...d, date: e.target.value }))}
                  />
                </label>
                <label className="lp__sighting-label">
                  How common?
                  <select
                    className="lp__sighting-select"
                    value={sightingDraft.howCommon}
                    onChange={e => setSightingDraft(d => ({ ...d, howCommon: e.target.value }))}
                  >
                    <option value="abundant">Abundant — saw many</option>
                    <option value="common">Common — easy to find</option>
                    <option value="uncommon">Uncommon — spotted once</option>
                    <option value="rare">Rare — unexpected</option>
                    <option value="exceptional">Exceptional — first time!</option>
                  </select>
                </label>
              </div>
              <button
                className="lp__sighting-submit"
                onClick={submitSighting}
                disabled={!sightingDraft.animal.trim()}
              >
                ✓ Submit Sighting
              </button>
            </div>
          )}

          {sightings.length > 0 && (
            <div className="lp__user-sightings">
              <div className="lp__user-sightings-title">👤 Community Sightings ({sightings.length})</div>
              {sightings.map(s => (
                <div key={s.id} className="lp__user-sighting">
                  <span className="user-reported-badge">👤 User Reported</span>
                  <span className="lp__user-sighting-name">{s.animal}</span>
                  <span className="lp__user-sighting-meta">{s.date} · {s.howCommon}</span>
                  <button
                    className="lp__user-sighting-delete"
                    onClick={() => deleteSighting(s.id)}
                    title="Remove this sighting"
                    aria-label="Remove sighting"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ── About Our Data ────────────────────────────────────────────────── */}
        <div className="lp__about-data">
          <button
            className="lp__about-trigger"
            onClick={() => setShowAboutData(v => !v)}
            aria-expanded={showAboutData}
          >
            ℹ️ About Our Data {showAboutData ? '▲' : '▼'}
          </button>
          {showAboutData && (
            <div className="lp__about-body">
              <p>Wildlife data is sourced from:</p>
              <ul className="lp__about-list">
                <li><strong>🐦 Cornell Lab of Ornithology · eBird</strong> — the world's largest bird observation database with over 1 billion records. Bird frequencies reflect real checklist data from this location.</li>
                <li><strong>🌿 iNaturalist</strong> — research-grade observations verified by a global community of naturalists and scientists.</li>
                <li><strong>🏛️ National Park Service</strong> — officially documented species from the park's scientific species inventory and wildlife records.</li>
                <li><strong>🔬 GBIF</strong> — Global Biodiversity Information Facility, an international scientific biodiversity database used by researchers worldwide.</li>
              </ul>
              <p className="lp__about-note">Rarity ratings reflect the probability of seeing each species on a typical visit, based on real observation frequency data — not just whether a species has been recorded at the park.</p>
            </div>
          )}
        </div>

      </div>{/* end lp__scroll */}
    </div>
  );
}

// ── Filter button ─────────────────────────────────────────────────────────────
function FilterBtn({ active, onClick, emoji, label, activeColor, title }) {
  return (
    <button
      className={`filter-btn${active ? ' filter-btn--on' : ''}`}
      onClick={onClick}
      style={active ? { background: activeColor, borderColor: activeColor, boxShadow: `0 3px 12px ${activeColor}66` } : {}}
      aria-pressed={active}
      title={title ?? label}
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="filter-btn__label">{label}</span>
    </button>
  );
}

// ── Map legend ─────────────────────────────────────────────────────────────────
function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend__item">
        <div className="map-legend__swatch" style={{ borderColor: PARK_COLORS.nationalPark }}>🏔️</div>
        <span className="map-legend__label">National Park</span>
      </div>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [season,       setSeason]       = useState('all');
  const [rarity,       setRarity]       = useState('all');
  const [animalType,   setAnimalType]   = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [debugMode,    setDebugMode]    = useState(false);

  // Popup-local filter preferences (persist across popup open/close)
  const [popupType,    setPopupType]    = useState('all');
  const [popupSort,    setPopupSort]    = useState('common-first');
  const [popupRarity,  setPopupRarity]  = useState('all');
  const [popupSubtype, setPopupSubtype] = useState('all');
  // Reset subtype whenever the animal-type tab changes
  useEffect(() => { setPopupSubtype('all'); }, [popupType]);
  const [popupSeason, setPopupSeason] = useState(() => {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'fall';
    return 'winter';
  });

  // Map ref — populated by MapController; lets buttons outside MapContainer call map.setView()
  const mapRef = useRef(null);

  // Current zoom level — drives icon tier selection (dot / medium / full).
  // Initialised to 4 which matches the MapContainer's initial zoom prop.
  const [zoom, setZoom] = useState(4);
  const handleZoomChange = useCallback(z => setZoom(z), []);

  // Zoom hint — visible on first load, auto-dismissed after 3.5 s.
  const [showZoomHint, setShowZoomHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowZoomHint(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // Tracks whether the user has zoomed into a specific state polygon.
  // Controls visibility of the "View Full Map" reset button.
  const [stateZoomed, setStateZoomed] = useState(false);

  // Welcome splash — shown only on first visit, gated by localStorage.
  const [showSplash, setShowSplash] = useState(() => {
    try { return !localStorage.getItem('wm_visited'); } catch { return false; }
  });
  const dismissSplash = useCallback(() => {
    try { localStorage.setItem('wm_visited', '1'); } catch {}
    setShowSplash(false);
  }, []);

  // Park count per state code — used by StateParkCounts badges.
  const locationsByState = useMemo(() => {
    const counts = {};
    wildlifeLocations.forEach(loc => {
      (loc.stateCodes ?? []).forEach(code => { counts[code] = (counts[code] ?? 0) + 1; });
    });
    return counts;
  }, []);

  // Toggle debug mode with D key; Escape closes the popup
  useEffect(() => {
    const handleKey = e => {
      if ((e.key === 'd' || e.key === 'D') &&
          !['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        setDebugMode(prev => !prev);
      }
      if (e.key === 'Escape') setOpenPopup(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── State boundary GeoJSON ────────────────────────────────────────────────
  const [stateGeoData, setStateGeoData] = useState(null);
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(r => r.json())
      .then(data => setStateGeoData(data))
      .catch(() => { /* silently skip if offline — map still works */ });
  }, []);

  // Set of state postal codes that have at least one park in the app
  const statesWithParks = useMemo(() => {
    const s = new Set();
    wildlifeLocations.forEach(loc => loc.stateCodes.forEach(c => s.add(c)));
    return s;
  }, []);

  // ── Popup portal state ────────────────────────────────────────────────────
  // ClusterLayer calls these when a Leaflet popup opens/closes; we render
  // the React popup content via createPortal so it stays in the React tree
  // and receives live state updates (popupType, popupSort, etc.)
  const [openPopup, setOpenPopup] = useState(null); // { loc }
  // Fetch live data from all four APIs in the background
  const { liveData, loading, loadingProgress, refreshLocation } = useLiveData(wildlifeLocations);

  const liveDataRef = useRef(liveData);
  const loadingRef  = useRef(loading);
  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);
  useEffect(() => { loadingRef.current  = loading;  }, [loading]);

  const handlePopupOpen = useCallback((loc) => {
    setOpenPopup({ loc });
    // Bypass the stagger queue if this location has no data yet
    if (!liveDataRef.current[loc.id] && !loadingRef.current.has(loc.id)) {
      refreshLocation(loc.id);
    }
  }, [refreshLocation]);
  const handlePopupClose = useCallback(() => setOpenPopup(null), []);

  // NPS codes already covered by hardcoded wildlifeLocations — used to
  // deduplicate so the same park doesn't appear twice on the map.
  const existingNpsCodes = useMemo(() =>
    new Set(wildlifeLocations.filter(l => l.npsCode).map(l => l.npsCode)),
    []
  );

  // Fetch all NPS park units; deduplication against existingNpsCodes is done
  // inside the hook. useLiveData is NOT called for these parks (wildlife data
  // is fetched on demand when a park is opened, per the user's plan).
  const { parks: npsParks } = useNpsParks(existingNpsCodes);

  // Build effective (hardcoded + live) animal list for each location,
  // then apply per-type caps so no single group dominates the popup.
  const effectiveAnimalsByLoc = useMemo(() => {
    const out = {};
    wildlifeLocations.forEach(loc => {
      const live = liveData[loc.id]?.animals ?? null;
      out[loc.id] = mergeAnimals(loc.animals, live);
    });
    return out;
  }, [liveData]);

  // Zoom tier: 1 = dot (≤4), 2 = medium (5-6), 3 = full (≥7).
  // LIVE badge and pulse only render at tier 3 — too small to read at lower zooms.
  const zoomTier = zoom <= 4 ? 1 : zoom <= 6 ? 2 : 3;

  // Pre-build icons for all locations (hardcoded + NPS API).
  // Recreated when liveData / loading / zoomTier changes so icon size and
  // LIVE badge update instantly as the user zooms.
  // Icons intentionally do NOT depend on liveData or loading.
  // Previously, any park's API response triggered a full icons recompute → setIcon()
  // on all 63 markers → Leaflet removes/inserts DOM nodes → visible flicker on every park.
  // Live/loading status is shown in the popup header instead (● Live / ↻ Refreshing…).
  const icons = useMemo(() => {
    const allLocs = [...wildlifeLocations, ...npsParks];
    return Object.fromEntries(
      allLocs.map(loc => [
        loc.id,
        createPinIcon(loc.locationType, false, false, zoomTier),
      ])
    );
  }, [npsParks, zoomTier]);

  // Collect unique state codes across all locations for the dropdown
  const allStateCodes = useMemo(() => {
    const codes = new Set();
    wildlifeLocations.forEach(l => l.stateCodes.forEach(c => codes.add(c)));
    return [...codes].sort();
  }, []);

  // Hardcoded locations filtered by animal / season / rarity / type / state.
  // Uses static loc.animals (not effectiveAnimalsByLoc) so liveData updates
  // during background loading never rebuild the marker list and remove markers.
  // effectiveAnimalsByLoc is still used inside the popup for the merged list.
  const visibleLocations = useMemo(() => {
    const noAnimalFilter = season === 'all' && rarity === 'all' && animalType === 'all';
    return wildlifeLocations.filter(loc => {
      if (selectedState !== 'all' && !loc.stateCodes.includes(selectedState)) return false;
      if (noAnimalFilter) return true;
      const animals = loc.animals ?? [];
      return animals.some(a =>
        (season     === 'all' || a.seasons?.includes('year-round') || a.seasons?.includes('year_round') || a.seasons?.includes(season)) &&
        (rarity     === 'all' || a.rarity     === rarity) &&
        (animalType === 'all' || a.animalType === animalType)
      );
    });
  }, [season, rarity, animalType, selectedState]);

  // NPS API parks filtered by state (no animal filter — they
  // have no animals array yet, so animal/season/rarity filters don't apply).
  const visibleNpsParks = useMemo(() =>
    npsParks.filter(loc => {
      if (selectedState !== 'all' && !loc.stateCodes.includes(selectedState)) return false;
      return true;
    }),
    [npsParks, selectedState]
  );

  // Combined marker list for ClusterLayer
  const allVisibleLocations = useMemo(
    () => [...visibleLocations, ...visibleNpsParks],
    [visibleLocations, visibleNpsParks]
  );

  const liveCount  = Object.keys(liveData).length;
  const showPill   = season !== 'all' || rarity !== 'all' || animalType !== 'all' || selectedState !== 'all';

  // ── Cache warming progress bar ────────────────────────────────────────────
  // Tracks how many locations have data (cache hit or API response) vs total.
  // Once all are loaded and no fetches are in flight, fades out after 600 ms.
  const totalLocs   = wildlifeLocations.length;
  const loadedCount = liveCount;  // liveCount = Object.keys(liveData).length
  const warmPct     = totalLocs > 0 ? Math.min(100, Math.round((loadedCount / totalLocs) * 100)) : 0;
  const warmDone    = loadedCount >= totalLocs && loading.size === 0;
  const [warmVisible, setWarmVisible] = useState(true);
  useEffect(() => {
    if (!warmDone) return;
    const t = setTimeout(() => setWarmVisible(false), 600);
    return () => clearTimeout(t);
  }, [warmDone]);

  // ── First-time-use / stale-cache banner ───────────────────────────────────
  // Shown when wildlifeCache.js still has the placeholder build date (script
  // has never been run) OR when fewer than 10 parks have > 5 bundled species.
  // The banner disappears automatically once background API fetches complete.
  const CACHE_PLACEHOLDER_DATE = '2026-03-14T00:00:00.000Z';
  const cacheBuildAge  = Date.now() - new Date(WILDLIFE_CACHE_BUILT_AT).getTime();
  const cacheIsStale   = WILDLIFE_CACHE_BUILT_AT === CACHE_PLACEHOLDER_DATE ||
                         cacheBuildAge > 7 * 24 * 60 * 60 * 1000;
  const parksWithData  = Object.values(WILDLIFE_CACHE).filter(v => v.animals?.length > 5).length;
  const cacheIsSparse  = parksWithData < 10;
  const showBuildBanner = (cacheIsStale || cacheIsSparse) && !warmDone;

  return (
    <div className="app">
      {/* ── Cache warming bar — fills as parks load from cache/API, then fades ── */}
      {warmVisible && (
        <div className={`cache-warming-bar${warmDone ? ' cache-warming-bar--done' : ''}`}
          aria-hidden="true">
          <div className="cache-warming-bar__fill" style={{ width: `${warmPct}%` }} />
        </div>
      )}

      {/* ── First-time / stale cache banner ── */}
      {showBuildBanner && (
        <div className="build-banner" role="status" aria-live="polite">
          <span className="build-banner__dot" aria-hidden="true" />
          🌿 Building wildlife database for first-time use — fetching live species data for all parks…
          <span className="build-banner__sub">This takes about 60 seconds once, then loads instantly forever.</span>
        </div>
      )}

      {/* ── Welcome splash (first visit only) ── */}
      {showSplash && <SplashScreen onDismiss={dismissSplash} />}

      {/* ── Debug mode banner ── */}
      {debugMode && (
        <div className="debug-banner" role="status">
          🐛 Debug Mode active — showing API endpoints, observation counts &amp; fetch timestamps · Press <kbd>D</kbd> to exit
        </div>
      )}

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr__inner">
          {/* Brand */}
          <div className="hdr__brand">
            <span className="hdr__logo" aria-hidden="true">🌿</span>
            <div>
              <h1 className="hdr__title">US Wildlife Explorer</h1>
              <p className="hdr__sub">
                {liveCount > 0
                  ? `● ${liveCount} live · ${allVisibleLocations.length} parks`
                  : `${allVisibleLocations.length} park${allVisibleLocations.length !== 1 ? 's' : ''}`}
                {debugMode && <span className="hdr__debug-pill">🐛 DEBUG</span>}
              </p>
            </div>
          </div>

          {/* All filters */}
          <div className="hdr__filters">

            {/* Row 1: Season + Rarity */}
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-group__label">Season</span>
                <div className="filter-group__btns">
                  {Object.entries(SEASONS).map(([k, { label, emoji, color }]) => (
                    <FilterBtn key={k} active={season === k} onClick={() => setSeason(k)} emoji={emoji} label={label} activeColor={color} />
                  ))}
                </div>
              </div>
              <div className="filter-sep" />
              <div className="filter-group">
                <span className="filter-group__label">Rarity</span>
                <div className="filter-group__btns">
                  {Object.entries(RARITY).map(([k, { label, emoji, color }]) => (
                    <FilterBtn key={k} active={rarity === k} onClick={() => setRarity(k)} emoji={emoji} label={label} activeColor={color} />
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Animal Type + Park Type + State */}
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-group__label">Animal Type</span>
                <div className="filter-group__btns">
                  {Object.entries(ANIMAL_TYPES).map(([k, { label, emoji, color }]) => (
                    <FilterBtn key={k} active={animalType === k} onClick={() => setAnimalType(k)} emoji={emoji} label={label} activeColor={color} title={label} />
                  ))}
                </div>
              </div>
              <div className="filter-sep" />
              <div className="filter-group filter-group--selects">
                <div className="select-wrap">
                  <span className="filter-group__label">State</span>
                  <select
                    className="filter-select"
                    value={selectedState}
                    onChange={e => setSelectedState(e.target.value)}
                    aria-label="Filter by state"
                  >
                    <option value="all">🗺️ All States</option>
                    {allStateCodes.map(code => (
                      <option key={code} value={code}>{STATE_NAMES[code] ?? code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── What's Active Now rotating banner ── */}
      <WhatActiveNow />

      {/* ── Map ── */}
      <main className="map-wrap">
        {/* Zoom prompt — fades out after 3.5 s */}
        {showZoomHint && <div className="zoom-hint">Zoom in to explore parks</div>}
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Capture map instance so the View Full Map button can call map.setView() */}
          <MapController mapRef={mapRef} />

          {/* Update zoom state so icon tiers re-render on zoom */}
          <ZoomTracker onZoomChange={handleZoomChange} />

          {/* State boundaries — rendered before markers so they sit beneath pins */}
          <StateBoundaries
            geoData={stateGeoData}
            statesWithParks={statesWithParks}
            onStateClick={() => setStateZoomed(true)}
          />

          {/* Park count badges — shown at zoom < 6 so individual markers are visible */}
          <StateParkCounts geoData={stateGeoData} locationsByState={locationsByState} />

          {/* Individual park markers — popup content rendered via portal below */}
          <MarkerLayer
            locations={allVisibleLocations}
            icons={icons}
            onPopupOpen={handlePopupOpen}
            onPopupClose={handlePopupClose}
          />
        </MapContainer>

        {/* Overlay modal — semi-transparent backdrop + centered panel.
            Rendered inside .map-wrap so it overlays the map correctly.     */}
        {openPopup && (
          <>
            {/* Backdrop: darkens the map and closes popup on click */}
            <div
              className="popup-overlay"
              onClick={handlePopupClose}
              aria-hidden="true"
            />
            {/* Centered panel */}
            <div
              className="popup-panel"
              role="dialog"
              aria-modal="true"
              aria-label={openPopup.loc.name}
            >
              <button
                className="popup-panel__close"
                onClick={handlePopupClose}
                aria-label="Close popup"
              >×</button>
              <LocationPopup
                location={openPopup.loc}
                effectiveAnimals={effectiveAnimalsByLoc[openPopup.loc.id] ?? openPopup.loc.animals}
                season={season}
                rarity={rarity}
                animalType={animalType}
                isLive={!!liveData[openPopup.loc.id]}
                sources={liveData[openPopup.loc.id]?.sources ?? []}
                isLoading={loading.has(openPopup.loc.id)}
                debugMode={debugMode}
                stats={liveData[openPopup.loc.id]?.stats}
                barChart={liveData[openPopup.loc.id]?.barChart}
                cacheTs={liveData[openPopup.loc.id]?._cacheTs ?? null}
                popupType={popupType}       setPopupType={setPopupType}
                popupSort={popupSort}       setPopupSort={setPopupSort}
                loadingProgress={loadingProgress}
                refreshLocation={refreshLocation}
                popupSeason={popupSeason}   setPopupSeason={setPopupSeason}
                popupRarity={popupRarity}   setPopupRarity={setPopupRarity}
                popupSubtype={popupSubtype} setPopupSubtype={setPopupSubtype}
              />
            </div>
          </>
        )}

        {/* View Full Map — appears after zooming into a state polygon */}
        {stateZoomed && (
          <button
            className="view-full-map-btn"
            onClick={() => {
              mapRef.current?.setView([39.5, -98.35], 4);
              setStateZoomed(false);
            }}
          >
            🗺️ View Full Map
          </button>
        )}

        {/* Map legend — bottom-left corner */}
        <MapLegend />

        {/* Active-filter summary pill */}
        {showPill && (
          <div className="filter-pill" aria-live="polite">
            {season !== 'all' && <span>{SEASONS[season].emoji} {SEASONS[season].label}</span>}
            {rarity !== 'all' && <><span className="filter-pill__sep">·</span><span>{RARITY[rarity].emoji} {RARITY[rarity].label}</span></>}
            {animalType !== 'all' && <><span className="filter-pill__sep">·</span><span>{ANIMAL_TYPES[animalType].emoji} {ANIMAL_TYPES[animalType].label}</span></>}
            {selectedState !== 'all' && <><span className="filter-pill__sep">·</span><span>📍 {STATE_NAMES[selectedState]}</span></>}
            <span className="filter-pill__count">{visibleLocations.length} spot{visibleLocations.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </main>
    </div>
  );
}
