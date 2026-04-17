import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { track } from '@vercel/analytics';

import { wildlifeLocations, SEASONS, RARITY, ANIMAL_TYPES, STATE_NAMES } from './wildlifeData';
import { classifyAnimalSubtype, getSubtypeDefs } from './utils/subcategories';
import {
  mergeAnimals, balanceAnimals, filterGeographicOutliers, NEVER_EXCEPTIONAL_BIRDS,
  getCorrectionFactor, getMonthlyFrequency,
  rarityFromChecklist, applyRarityOverride,
  fetchInatMonthlyHist,
} from './services/apiService';
import { useLiveData } from './hooks/useLiveData';
import { useNpsParks } from './hooks/useNpsParks';
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from './data/wildlifeCacheLoader.js';
import { useSecondaryCache } from './hooks/useSecondaryCache.js';
import { fetchAnimalPhoto } from './services/photoService';
import { BUNDLED_PHOTOS } from './data/photoCache.js';
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

// Wraps matching substring in <mark> for autocomplete highlight
function highlightMatch(text, query) {
  if (!query?.trim() || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="sp-hl">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

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
    // Detect pure-touch devices (no fine pointer / no hover). On these devices
    // Leaflet tooltips fire on tap rather than hover, which interferes with
    // the click-to-open-popup behavior. Skip binding on touch-only devices.
    const isTouchOnly = window.matchMedia?.('(hover: none)').matches ?? false;

    const newMarkers = {};
    locations.forEach(loc => {
      const marker = L.marker([loc.lat, loc.lng], { icon: iconsRef.current[loc.id] });
      marker.on('click', () => onOpenRef.current(loc));
      if (!isTouchOnly) {
        marker.bindTooltip(loc.name, {
          direction:  'top',
          permanent:  false,
          sticky:     false,
          opacity:    0.95,
          className:  'park-tooltip',
        });
      }
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

// ── "What's Active Now" month-aware rotating banner ───────────────────────────
// Shows month-appropriate wildlife events that rotate every 10 s with a smooth
// fade. Uses new Date().getMonth() so it always reflects the real calendar month.
const SEASONAL_EVENTS = {
  0: [ // January
    'Bald Eagles gathering at their winter roosts across the Pacific Northwest',
    'Gray Whales beginning their southbound migration along the California coast',
    'Manatees congregating at warm water springs in Florida',
  ],
  1: [ // February
    'Great Horned Owls nesting — listen for hooting at dusk in forests nationwide',
    'Bald Eagles actively nesting across the northern states',
    'Gray Whales with calves heading south past Point Reyes',
  ],
  2: [ // March
    'Spring migration beginning — warblers and songbirds returning to eastern parks',
    'Gray Whales migrating north past Point Reyes with newborn calves',
    'Osprey returning to nest platforms along the Atlantic coast',
  ],
  3: [ // April
    'Peak spring bird migration — warblers flooding through eastern and Gulf Coast parks',
    'Wildflower blooms attracting butterflies across desert parks',
    'Black bears emerging from hibernation in Smoky Mountains and Shenandoah',
  ],
  4: [ // May
    'Elk calving season at Yellowstone and Grand Teton',
    'Synchronous fireflies beginning their 2-week display at Great Smoky Mountains',
    'Puffins arriving at Acadia\'s offshore islands for nesting season',
  ],
  5: [ // June
    'Synchronous fireflies peaking at Great Smoky Mountains — lottery required',
    'Mountain goat kids visible at Glacier National Park',
    'Sea turtle nesting season along Gulf Coast and Florida beaches',
  ],
  6: [ // July
    'Brown bears fishing for salmon at Brooks Falls in Katmai',
    'Humpback whales feeding in Glacier Bay and Kenai Fjords',
    'Monarch butterflies breeding across northern parks',
  ],
  7: [ // August
    'Brown bears at peak salmon fishing in Katmai and Denali',
    'Shorebird fall migration beginning along Atlantic coast',
    'Perseid meteor showers — perfect for nocturnal wildlife viewing',
  ],
  8: [ // September
    'Elk bugling season at Yellowstone and Rocky Mountain',
    'Monarch butterflies beginning southbound migration through central states',
    'Fall hawk migration peaking at Acadia and Shenandoah',
  ],
  9: [ // October
    'Elk rut continuing at Yellowstone — bulls bugling at dawn and dusk',
    'Salmon spawning runs visible at Olympic, Redwood, and North Cascades',
    'Fall bird migration peaking — warblers and sparrows heading south',
  ],
  10: [ // November
    'Bald Eagles congregating along rivers in the Pacific Northwest',
    'Manatees moving to warm water refuges in Everglades and Biscayne',
    'Snowy Owls arriving at northern coastal parks for winter',
  ],
  11: [ // December
    'Bald Eagles at peak winter concentrations along major rivers',
    'Gray Whale southbound migration visible from Point Reyes and Channel Islands',
    'Manatees at warm water springs — best viewing at Everglades',
  ],
};

const MONTH_LABELS = [
  'January ❄️', 'February ❄️', 'March 🌸', 'April 🌸', 'May 🌸', 'June ☀️',
  'July ☀️', 'August ☀️', 'September 🍂', 'October 🍂', 'November 🍂', 'December ❄️',
];

function WhatActiveNow() {
  const [month, setMonth]    = useState(() => new Date().getMonth());
  const msgs                 = SEASONAL_EVENTS[month];
  const [idx,  setIdx]       = useState(0);
  const [faded, setFaded]    = useState(false);

  useEffect(() => {
    // Rotate messages every 10 seconds
    const rotate = setInterval(() => {
      setFaded(true);
      setTimeout(() => { setIdx(i => (i + 1) % msgs.length); setFaded(false); }, 340);
    }, 10000);
    // Check if the calendar month changed every 60 seconds
    const monthCheck = setInterval(() => {
      const now = new Date().getMonth();
      setMonth(prev => { if (prev !== now) { setIdx(0); return now; } return prev; });
    }, 60000);
    return () => { clearInterval(rotate); clearInterval(monthCheck); };
  }, [msgs.length]);

  return (
    <div className="active-now" aria-live="polite" aria-atomic="true">
      <span className="active-now__season">{MONTH_LABELS[month]}</span>
      <span className="active-now__sep">·</span>
      <span className={`active-now__msg${faded ? ' active-now__msg--out' : ''}`}>
        {msgs[idx]}
      </span>
    </div>
  );
}

// ── Category (type + subtype) dropdowns ──────────────────────────────────────
function CategoryDropdowns({ categoryType, setCategoryType, categorySubtype, setCategorySubtype, onTrack }) {
  const subtypeDefs = getSubtypeDefs(categoryType); // null when type === 'all'

  const handleTypeChange = e => {
    const t = e.target.value;
    setCategoryType(t);
    setCategorySubtype('all');
    onTrack(t, 'all');
  };
  const handleSubtypeChange = e => {
    const s = e.target.value;
    setCategorySubtype(s);
    onTrack(categoryType, s);
  };

  return (
    <div className="cat-dropdowns">
      <select
        className="cat-select"
        value={categoryType}
        onChange={handleTypeChange}
        aria-label="Filter by animal category"
      >
        {Object.entries(ANIMAL_TYPES).map(([k, v]) => (
          <option key={k} value={k}>{v.emoji} {v.label}</option>
        ))}
      </select>

      {subtypeDefs && (
        <select
          className="cat-select"
          value={categorySubtype}
          onChange={handleSubtypeChange}
          aria-label="Filter by animal subcategory"
        >
          {subtypeDefs.map(({ key, emoji, label }) => (
            <option key={key} value={key}>{emoji} {label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ── Species search component ──────────────────────────────────────────────────
function SpeciesSearch({ suggestions, query, onChange, onSelect, onClear, hasFilter }) {
  const [activeIdx,    setActiveIdx]    = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false); setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = e => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Escape') { onChange(''); onClear(); e.target.blur(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      onSelect(suggestions[activeIdx]);
      setShowDropdown(false); setActiveIdx(-1);
    } else if (e.key === 'Escape') {
      setShowDropdown(false); setActiveIdx(-1);
    }
  };

  return (
    <div className="sp-search" ref={containerRef}>
      <div className="sp-search__bar">
        <span className="sp-search__icon" aria-hidden="true">🔍</span>
        <input
          className="sp-search__input"
          type="search"
          placeholder="Find parks with… (e.g., Bald Eagle)"
          value={query}
          onChange={e => { onChange(e.target.value); setShowDropdown(true); setActiveIdx(-1); }}
          onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Search species to filter parks"
          autoComplete="off"
          autoCorrect="off"
        />
        {(query || hasFilter) && (
          <button className="sp-search__clear"
            onClick={() => { onChange(''); onClear(); setShowDropdown(false); setActiveIdx(-1); }}
            aria-label="Clear species filter">✕</button>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul className="sp-search__dropdown" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.name}
              className={`sp-search__item${i === activeIdx ? ' sp-search__item--active' : ''}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={e => { e.preventDefault(); onSelect(s); setShowDropdown(false); setActiveIdx(-1); }}
            >
              {s.photoUrl && <img className="sp-search__item-photo" src={s.photoUrl} alt="" aria-hidden="true" />}
              <div className="sp-search__item-text">
                <span className="sp-search__item-name">{highlightMatch(s.name, query)}</span>
                {s.sciName && <span className="sp-search__item-sci">{highlightMatch(s.sciName, query)}</span>}
              </div>
              <span className="sp-search__item-parks">{s.parkCount} park{s.parkCount !== 1 ? 's' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── About modal ────────────────────────────────────────────────────────────────
function AboutModal({ onClose, scrollTo }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (scrollTo && bodyRef.current) {
      const el = bodyRef.current.querySelector(`[data-section="${scrollTo}"]`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [scrollTo]);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="about-modal" role="dialog" aria-modal="true" aria-label="About US Wildlife Explorer">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="about-modal__body" ref={bodyRef}>

          <div className="about-modal__hero">
            <span className="about-modal__hero-icon">🌿</span>
            <h2 className="about-modal__hero-title">US Wildlife Explorer</h2>
            <p className="about-modal__hero-sub">Your guide to wildlife encounters in America's national parks</p>
          </div>

          {/* Section 1 */}
          <section className="about-section" data-section="why">
            <h3 className="about-section__title">Why I Built This</h3>
            <div className="about-section__body">
              <p>I love visiting national parks and always wondered what animals I might actually see on my trip. Before every visit I'd spend hours searching forums and park websites trying to figure out what wildlife to look for.</p>
              <p>I wanted one simple tool that answers: <em>"If I visit this park today, what are my chances of seeing each animal?"</em></p>
              <p>This is that tool — built for fellow wildlife enthusiasts, hikers, and national park lovers.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="about-section" data-section="methodology">
            <h3 className="about-section__title">How We Calculate Encounter Probability</h3>
            <div className="about-section__body">
              <p>Our rarity ratings represent the <strong>estimated probability of seeing an animal on a single-day visit</strong> to the park.</p>

              <div className="about-rarity-grid">
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#1d4ed8',background:'#1d4ed818',borderColor:'#1d4ed844'}}>🔵 Guaranteed</span> <span className="about-rarity-pct">90%+</span> Almost certain to see</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#15803d',background:'#15803d18',borderColor:'#15803d44'}}>🟢 Very Likely</span> <span className="about-rarity-pct">60-90%</span> Probably will see</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#b45309',background:'#b4530918',borderColor:'#b4530944'}}>🟡 Likely</span> <span className="about-rarity-pct">30-60%</span> Good chance</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#c2410c',background:'#c2410c18',borderColor:'#c2410c44'}}>🟠 Unlikely</span> <span className="about-rarity-pct">10-30%</span> Possible with luck</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#b91c1c',background:'#b91c1c18',borderColor:'#b91c1c44'}}>🔴 Rare</span> <span className="about-rarity-pct">2-10%</span> Lucky sighting</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#7c3aed',background:'#7c3aed18',borderColor:'#7c3aed44'}}>⭐ Exceptional</span> <span className="about-rarity-pct">&lt;2%</span> Once in a lifetime</div>
              </div>

              <h4 className="about-subsection">Data by Category</h4>
              <ul className="about-list">
                <li><strong>Birds:</strong> eBird data from the Cornell Lab of Ornithology — county-level checklist frequency sampled across 48 dates per year, adjusted with a park-specific correction factor that accounts for how much of the county the park occupies.</li>
                <li><strong>Mammals, reptiles, amphibians:</strong> iNaturalist research-grade observation data with species-specific correction factors that account for reporting bias (people over-report exciting animals like bears and under-report common ones like mice).</li>
                <li><strong>Insects:</strong> Calibrated thresholds that account for the significant under-reporting of insects on citizen science platforms.</li>
                <li><strong>Manual overrides:</strong> Park ranger reports for flagship species like Bison at Yellowstone, Alligator at Everglades, and others where we have high-confidence encounter data.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="about-section" data-section="sources">
            <h3 className="about-section__title">Our Data Sources</h3>
            <div className="about-section__body">
              <div className="about-sources-grid">
                <div className="about-source-card">
                  <div className="about-source-card__icon">🐦</div>
                  <div className="about-source-card__name">Cornell Lab of Ornithology</div>
                  <div className="about-source-card__desc">Bird checklist frequency and seasonal presence across 10,000+ species</div>
                  <a className="about-source-card__link" href="https://ebird.org" target="_blank" rel="noopener noreferrer">ebird.org</a>
                </div>
                <div className="about-source-card">
                  <div className="about-source-card__icon">🌿</div>
                  <div className="about-source-card__name">iNaturalist</div>
                  <div className="about-source-card__desc">Research-grade wildlife observations from millions of citizen scientists</div>
                  <a className="about-source-card__link" href="https://www.inaturalist.org" target="_blank" rel="noopener noreferrer">inaturalist.org</a>
                </div>
                <div className="about-source-card">
                  <div className="about-source-card__icon">🏛️</div>
                  <div className="about-source-card__name">National Park Service</div>
                  <div className="about-source-card__desc">Official park information and ranger-curated species descriptions</div>
                  <a className="about-source-card__link" href="https://www.nps.gov" target="_blank" rel="noopener noreferrer">nps.gov</a>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="about-section" data-section="migration">
            <h3 className="about-section__title">Migration Badges</h3>
            <div className="about-section__body">
              <div className="about-migration-grid">
                <div className="about-migration-item"><span className="about-migration-badge about-migration-badge--resident">🏠 Year Round</span> Lives here all year; can be seen on any visit.</div>
                <div className="about-migration-item"><span className="about-migration-badge about-migration-badge--summer">🌤️ Summer Resident</span> Breeds here in summer, migrates south for winter. Best seen May through August.</div>
                <div className="about-migration-item"><span className="about-migration-badge about-migration-badge--winter">❄️ Winter Visitor</span> Arrives from the north in fall, winters here. Best seen November through March.</div>
                <div className="about-migration-item"><span className="about-migration-badge about-migration-badge--migratory">🔀 Migratory</span> Passes through during migration. Timing your visit to peak migration increases chances.</div>
              </div>
              <p className="about-note">Timing your visit to the right season dramatically changes what wildlife you'll see.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="about-section" data-section="limitations">
            <h3 className="about-section__title">Limitations & Transparency</h3>
            <div className="about-section__body">
              <ul className="about-list about-list--compact">
                <li>Encounter probability is an <strong>estimate</strong>, not a guarantee — actual sightings depend on weather, time of day, trail choice, and luck.</li>
                <li>Some parks have sparser data than others, particularly remote Alaska and territory parks.</li>
                <li>Bird data is our most accurate category thanks to eBird's comprehensive checklist system.</li>
                <li>Mammal and insect probabilities are less precise due to lower reporting rates on citizen science platforms.</li>
                <li>We continuously improve our data and methodology.</li>
              </ul>
            </div>
          </section>

          <div className="about-modal__footer">
            <p>Built with care for the wildlife-watching community.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Welcome splash screen ──────────────────────────────────────────────────────
// Shown only on the very first visit (localStorage key wm_visited).
// Dismissed by clicking the button; never shown again.
function SplashScreen({ onDismiss, onAbout }) {
  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label="Welcome to US Wildlife Explorer">
      <div className="splash__content">
        <div className="splash__logo" aria-hidden="true">🌿</div>
        <h1 className="splash__title">US Wildlife Explorer</h1>
        <p className="splash__tagline">Discover wildlife across America's parks</p>
        <button className="splash__btn" onClick={onDismiss} autoFocus>
          Explore the Map →
        </button>
        <button className="splash__about-link" onClick={() => { onDismiss(); onAbout(); }}>
          About this project
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
// Placeholder emoji shown while a photo is loading or unavailable.
// Deliberately generic per-type (paw for all mammals, not 🦌 deer specifically)
// so a raccoon, wolf, and beaver all get an appropriate placeholder.
const PHOTO_PLACEHOLDER = {
  bird: '🐦', mammal: '🐾', reptile: '🦎', amphibian: '🐸',
  insect: '🦋', marine: '🐠', fish: '🐟',
};

// ── Iconic sort helpers ───────────────────────────────────────────────────────
// Returns a charisma score (1–10) used to rank within iconic sort tiers.
// Higher = more exciting / visitor-recognisable.
function getCharismaScore(name, animalType) {
  const n = (name ?? '').toLowerCase();
  if (/\b(california condor|florida panther|gray wolf|grizzly bear|brown bear|wolverine)\b/.test(n)) return 11;
  if (/\b(bison|buffalo|grizzly|bear|wolf|wolves|alligator|crocodile|moose|elk|wapiti|mountain lion|puma|cougar|jaguar|panther|wolverine|manatee|california condor|javelina|peccary)\b/.test(n)) return 10;
  if (/\b(manatee|whale|dolphin|orca|shark|sea lion|walrus|sea otter|steller)\b/.test(n)) return 9;
  if (/\b(bald eagle|golden eagle|eagle|condor|peregrine|falcon|osprey|roadrunner)\b/.test(n)) return 9;
  if (/\b(hawk|owl|vulture|kite|harrier|merlin|kestrel|quail|gambel|gila woodpecker|cactus wren)\b/.test(n)) return 8;
  if (/\b(puffin|flamingo|spoonbill|whooping crane|sandhill crane|roseate|pelican|frigate|booby)\b/.test(n)) return 8;
  if (/\b(seal|harbor seal|grey seal|fur seal|sea turtle|leatherback|loggerhead)\b/.test(n)) return 8;
  if (/\b(fox|coyote|bobcat|lynx|otter|beaver|pronghorn|bighorn|mountain goat|caribou|muskox|bison|deer|elk|moose)\b/.test(n)) return 7;
  if (/\b(rattlesnake|boa|python|king snake|milk snake|gopher snake|coral snake)\b/.test(n)) return 7;
  if (/\b(heron|egret|ibis|stork|loon|puffin|cormorant|gannet|anhinga)\b/.test(n)) return 7;
  if (animalType === 'marine') return 7;
  if (animalType === 'mammal') return 6;
  if (animalType === 'reptile' || animalType === 'amphibian') return 6;
  if (animalType === 'bird') return 5;
  if (animalType === 'insect') return 3;
  return 4;
}

const _RARITY_ORDER = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };

function iconicSortFn(a, b) {
  // Tier 1: curated Park Naturalist animals (real funFact, not a placeholder)
  const aIsCurated = !!(a.funFact && !needsGeneratedDescription(a.funFact));
  const bIsCurated = !!(b.funFact && !needsGeneratedDescription(b.funFact));
  if (aIsCurated !== bIsCurated) return aIsCurated ? -1 : 1;
  if (aIsCurated) {
    // Within curated: charisma first (Bison/Wolf/Bear before common sparrows),
    // then rarity (Guaranteed before Rare within same charisma band)
    const cd = getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
    if (cd !== 0) return cd;
    return (_RARITY_ORDER[a.rarity] ?? 5) - (_RARITY_ORDER[b.rarity] ?? 5);
  }

  // Tier 2: exceptional animals — rare but exciting, once-in-a-lifetime
  const aIsExc = a.rarity === 'exceptional';
  const bIsExc = b.rarity === 'exceptional';
  if (aIsExc !== bIsExc) return aIsExc ? -1 : 1;
  if (aIsExc) {
    return getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
  }

  // Tier 3: guaranteed/very_likely mammals
  const aTopMammal = a.animalType === 'mammal' && (a.rarity === 'guaranteed' || a.rarity === 'very_likely');
  const bTopMammal = b.animalType === 'mammal' && (b.rarity === 'guaranteed' || b.rarity === 'very_likely');
  if (aTopMammal !== bTopMammal) return aTopMammal ? -1 : 1;
  if (aTopMammal) {
    const rd = (_RARITY_ORDER[a.rarity] ?? 5) - (_RARITY_ORDER[b.rarity] ?? 5);
    if (rd !== 0) return rd;
    return getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
  }

  // Tier 4: rare animals — exciting even if hard to see
  const aIsRare = a.rarity === 'rare';
  const bIsRare = b.rarity === 'rare';
  if (aIsRare !== bIsRare) return aIsRare ? -1 : 1;
  if (aIsRare) {
    return getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
  }

  // Tier 5: everything else — charisma descending, then rarity ascending
  const cd = getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
  if (cd !== 0) return cd;
  return (_RARITY_ORDER[a.rarity] ?? 5) - (_RARITY_ORDER[b.rarity] ?? 5);
}

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
function AnimalCard({ animal, debugMode, seasonalFreqs, location, openAbout, highlightSpecies }) {
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
    fetchAnimalPhoto(animal.name, animal.scientificName).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [animal.name, animal.scientificName]);

  // Generic per-type placeholder — avoids showing 🦌 deer for every mammal
  const placeholderEmoji = PHOTO_PLACEHOLDER[animal.animalType] ?? '🐾';

  const isExceptional = animal.rarity === 'exceptional';
  const isHighlighted = highlightSpecies && animal.name?.toLowerCase() === highlightSpecies.toLowerCase();

  return (
    <div className={`animal-card${isEstimated ? ' animal-card--estimated' : ''}${expanded && photo ? ' animal-card--photo-open' : ''}${isExceptional ? ' animal-card--exceptional' : ''}${isHighlighted ? ' animal-card--highlight' : ''}`}>

      {/* Once-in-a-lifetime banner for exceptional animals */}
      {isExceptional && (
        <div className="animal-card__exc-banner">⭐ ONCE IN A LIFETIME</div>
      )}

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
              onClick={() => setExpanded(prev => {
                const next = !prev;
                if (next) track('animal_view', { animal: animal.name, park: location.name, rarity: animal.rarity });
                return next;
              })}
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
            {openAbout && (
              <button
                className="rarity-help-btn"
                onClick={() => openAbout('methodology')}
                title="Learn how we calculate encounter probability"
                aria-label="How is this calculated?"
              >?</button>
            )}
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
              if (!freq) {
                // Exceptional animals always show a chance estimate even without season data
                if (animal.rarity !== 'exceptional') return null;
                const f = animal.frequency ?? animal._debug?.frequency ?? RARITY_FREQ_FALLBACK.exceptional;
                const pct = Math.max(1, Math.round(f * 100));
                const fetchInFlight = sciKey && !(sciKey in (seasonalFreqs ?? {}));
                return (
                  <div
                    className="exceptional-chance"
                    title="Exceptional sightings are documented but extremely rare — most visitors never see this animal"
                  >
                    ⭐ ~{pct}% chance per visit
                    <span className="freq-est-flag" title="Estimated from rarity tier">~est</span>
                    {fetchInFlight && (
                      <span className="freq-loading" title="Loading accurate seasonal data from iNaturalist…">↻</span>
                    )}
                  </div>
                );
              }
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
              {animal._debug?.obsCount > 0 && (
                <span className="obs-count-note">
                  Based on {animal._debug.obsCount.toLocaleString()} verified iNaturalist observations
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

      {/* Park-specific visitor tip */}
      {animal.parkTip && (
        <div className="animal-card__park-tip">
          <p className="animal-card__park-tip-text">{animal.parkTip}</p>
          <span className="park-tip-source">📍 Visitor Tip</span>
        </div>
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
  const placeholderEmoji = PHOTO_PLACEHOLDER[animal.animalType] ?? '🐾';

  const [photo,    setPhoto]    = useState(undefined);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAnimalPhoto(animal.name, animal.scientificName).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [animal.name, animal.scientificName]);

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
          {/* Exceptional chance — single prominent line; always shown for exceptional tier */}
          {(() => {
            const sciKey = animal.scientificName?.toLowerCase();
            const histFreq = sciKey ? seasonalFreqs?.[sciKey] : undefined;
            const isHistReal = histFreq && !histFreq._estimated;
            const SEASON_KEYS = ['spring', 'summer', 'fall', 'winter'];
            const SEASON_NAMES = { spring: 'spring', summer: 'summer', fall: 'fall', winter: 'winter' };

            let chanceText, isEstimated;

            if (isHistReal) {
              // Real iNaturalist histogram — show peak season percentage
              const peaks = SEASON_KEYS
                .map(s => ({ s, pct: histFreq[s] }))
                .filter(({ pct }) => pct != null && pct > 0)
                .sort((a, b) => b.pct - a.pct);
              if (peaks.length) {
                const { s, pct } = peaks[0];
                chanceText = `~${pct}% chance in ${SEASON_NAMES[s]}`;
                isEstimated = false;
              }
            }

            if (!chanceText) {
              // No histogram — derive from frequency field or rarity fallback
              const f = animal.frequency ?? animal._debug?.frequency ?? RARITY_FREQ_FALLBACK.exceptional;
              const pct = Math.max(1, Math.round(f * 100));
              chanceText = `~${pct}% chance per visit`;
              isEstimated = true;
            }

            const fetchInFlight = isEstimated && sciKey && !(sciKey in (seasonalFreqs ?? {}));

            return (
              <div
                className="exceptional-chance"
                title="Exceptional sightings are documented but extremely rare — most visitors never see this animal"
              >
                ⭐ {chanceText}
                {isEstimated && (
                  <span className="freq-est-flag" title="Estimated from rarity tier">~est</span>
                )}
                {fetchInFlight && (
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
              {animal._debug?.obsCount > 0 && (
                <span className="obs-count-note">
                  Based on {animal._debug.obsCount.toLocaleString()} verified iNaturalist observations
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

      {/* Park-specific visitor tip */}
      {animal.parkTip && (
        <div className="animal-card__park-tip">
          <p className="animal-card__park-tip-text">{animal.parkTip}</p>
          <span className="park-tip-source">📍 Visitor Tip</span>
        </div>
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

// ── Rarity Spectrum Bar ────────────────────────────────────────────────────────
// A proportional horizontal bar showing how many animals are in each rarity tier.
// Clicking a segment filters to that rarity. Shows total count on hover.
const SPECTRUM_CONFIG = [
  { key: 'guaranteed',  color: '#1a7a3c', label: 'Guaranteed',  emoji: '🔵' },
  { key: 'very_likely', color: '#2d9e56', label: 'Very Likely', emoji: '🟢' },
  { key: 'likely',      color: '#5aab3f', label: 'Likely',      emoji: '🟡' },
  { key: 'unlikely',    color: '#e0820a', label: 'Unlikely',    emoji: '🟠' },
  { key: 'rare',        color: '#c0392b', label: 'Rare',        emoji: '🔴' },
  { key: 'exceptional', color: '#7c3aed', label: 'Exceptional', emoji: '⭐' },
];

function RaritySpectrumBar({ animals, activeRarity, onSelectRarity }) {
  const counts = useMemo(() => {
    const c = {};
    for (const a of animals) c[a.rarity] = (c[a.rarity] ?? 0) + 1;
    return c;
  }, [animals]);

  const total = animals.length;
  if (total === 0) return null;

  return (
    <div className="rarity-spectrum">
      <div className="rarity-spectrum__bar">
        {SPECTRUM_CONFIG.map(({ key, color, label, emoji }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const pct = (count / total * 100).toFixed(1);
          const isActive = activeRarity === key;
          return (
            <button
              key={key}
              className={`rarity-spectrum__seg${isActive ? ' rarity-spectrum__seg--active' : ''}`}
              style={{ flex: count, background: color + (isActive ? '' : 'cc'), outline: isActive ? `2px solid ${color}` : 'none' }}
              title={`${emoji} ${label}: ${count} species (${pct}%) — click to filter`}
              onClick={() => onSelectRarity(isActive ? 'all' : key)}
              aria-pressed={isActive}
            />
          );
        })}
      </div>
      <div className="rarity-spectrum__legend">
        {SPECTRUM_CONFIG.map(({ key, color, label, emoji }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              className={`rarity-spectrum__pill${activeRarity === key ? ' rarity-spectrum__pill--active' : ''}`}
              style={{ '--seg-color': color }}
              onClick={() => onSelectRarity(activeRarity === key ? 'all' : key)}
              title={`Filter to ${label} only`}
            >
              <span className="rarity-spectrum__dot" style={{ background: color }} />
              {count}
            </button>
          );
        })}
        {activeRarity !== 'all' && (
          <button className="rarity-spectrum__clear" onClick={() => onSelectRarity('all')}>
            ✕ all
          </button>
        )}
      </div>
    </div>
  );
}

function LocationPopup({ location, effectiveAnimals, season, rarity, animalType,
  isLive, sources, isLoading, debugMode, stats, cacheTs,
  loadingProgress, refreshLocation,
  popupType, setPopupType, popupSort, setPopupSort,
  popupSeason, setPopupSeason, popupRarity, setPopupRarity,
  popupSubtype, setPopupSubtype,
  activeTypes, focusedType, openAbout, highlightSpecies }) {
  const POPUP_PROGRESS_GROUPS = ['birds', 'mammals', 'reptiles', 'amphibians', 'insects', 'marine'];
  const PROGRESS_EMOJI = { birds: '🐦', mammals: '🦌', reptiles: '🐊', amphibians: '🐸', insects: '🦋', marine: '🐋' };

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const monthName    = MONTH_NAMES[currentMonth - 1];

  // Search resets when popup switches to a different location
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [location.id]);
  const searchTrackTimerRef = useRef(null);

  // Mobile-only filter panel open/close state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useEffect(() => { setMobileFiltersOpen(false); }, [location.id]);

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
  }, [updateSubtypeArrows, focusedType]); // re-attach when focusedType changes (subtype bar mounts/unmounts)

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
    track('report_sighting', { animal: sightingDraft.animal.trim(), park: location.name });
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

  // Enrich every animal with corrected rarity where possible:
  //   • Animals with a raw frequency field + correction needed → corrected static rarity
  //   • Everything else → rarity from the animal object unchanged
  // Note: bar-chart enrichment was removed — the eBird barChart proxy never worked.
  // Rarity is now pre-computed at build time using county-level eBird frequency data.
  const enriched = useMemo(() => effectiveAnimals.map(a => {
    const factor  = getCorrectionFactor(a.name);

    // Compute displaySeasons: normalise seasons[] — all-4 or explicit 'year-round' → ['year-round'].
    const displaySeasons = (() => {
      const s = a.seasons ?? ['spring'];
      return (s.includes('year-round') || s.includes('year_round')) ? ['year-round'] : s;
    })();

    if (a.frequency != null && factor !== 1) {
      // Fallback path: apply correction to the existing raw frequency
      const correctedFreq = Math.min(1, a.frequency * factor);
      let ebirdRarity = rarityFromChecklist(correctedFreq);
      // Live-only animals cannot be Exceptional — only hand-curated entries can
      if (!a._curated && ebirdRarity === 'exceptional') ebirdRarity = 'rare';
      const computedRarity = applyRarityOverride(location.id, a.name, ebirdRarity);
      return { ...a, displaySeasons, rarity: computedRarity };
    }

    // Apply park-specific override (e.g. Bison at Yellowstone = guaranteed)
    // Live-only animals: cap exceptional at rare — only curated entries can be exceptional
    const baseRarity = (!a._curated && a.rarity === 'exceptional') ? 'rare' : a.rarity;
    const overriddenRarity = applyRarityOverride(location.id, a.name, baseRarity);
    return { ...a, displaySeasons, rarity: overriddenRarity };
  }), [effectiveAnimals, season, currentMonth, monthName, location.id]);

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
    if (!focusedType || !getSubtypeDefs(focusedType)) return null;
    const pool = seasonFiltered.filter(a => a.animalType === focusedType);
    const counts = {};
    pool.forEach(a => {
      const sub = classifyAnimalSubtype(a);
      counts[sub] = (counts[sub] ?? 0) + 1;
    });
    return counts;
  }, [seasonFiltered, focusedType]);

  // Display page size — 100 initially, +100 per Load More click.
  const [displayLimit, setDisplayLimit] = useState(100);

  // Reset paging whenever the location or any filter changes
  useEffect(() => { setDisplayLimit(100); }, [location.id]);
  useEffect(() => { setDisplayLimit(100); }, [activeTypes, popupSubtype, popupSeason, popupRarity, search, popupSort]);

  // Popup-local filtering + sorting (independent of global header filters).
  // Returns the full sorted list — slicing is handled in render based on state.
  const { display: filtered, isFiltered } = useMemo(() => {
    let result = enriched;

    // Multi-type filter: if not all types are active, filter to active ones
    const allTypeKeys = Object.keys(ANIMAL_TYPES).filter(t => t !== 'all');
    if (activeTypes.size < allTypeKeys.length) {
      result = result.filter(a => activeTypes.has(a.animalType));
    }

    // Subtype filter — only when a specific subtype is selected for a focused type
    if (popupSubtype !== 'all' && focusedType && getSubtypeDefs(focusedType)) {
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

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.scientificName?.toLowerCase().includes(q)
      );
    }

    if (popupSort === 'iconic-first') {
      result = [...result].sort(iconicSortFn);
    } else if (popupSort === 'common-first') {
      result = [...result].sort((a, b) => (_RARITY_ORDER[a.rarity] ?? 5) - (_RARITY_ORDER[b.rarity] ?? 5));
    } else if (popupSort === 'rarest-first') {
      result = [...result].sort((a, b) => (_RARITY_ORDER[b.rarity] ?? 5) - (_RARITY_ORDER[a.rarity] ?? 5));
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Bubble highlighted species to the very top
    if (highlightSpecies) {
      const hl = highlightSpecies.toLowerCase();
      result = [
        ...result.filter(a => a.name?.toLowerCase() === hl),
        ...result.filter(a => a.name?.toLowerCase() !== hl),
      ];
    }

    // A "filter" is any user-driven narrowing beyond the default full list view.
    const isFiltered = activeTypes.size < allTypeKeys.length || popupSubtype !== 'all'
      || popupSeason !== 'all' || popupRarity !== 'all' || !!search.trim();

    return { display: result, isFiltered };
  }, [enriched, activeTypes, popupSubtype, popupSeason, popupRarity, search, popupSort, focusedType]);

  // Exceptional animals for the Rare Finds section — fully filter-aware.
  // Applies the same type / subtype / season / search filters as the main list
  // so the section stays in sync with every active filter.
  const exceptionalAnimals = useMemo(() => {
    let result = enriched.filter(a => a.rarity === 'exceptional');

    const allTypeKeys = Object.keys(ANIMAL_TYPES).filter(t => t !== 'all');
    if (activeTypes.size < allTypeKeys.length) {
      result = result.filter(a => activeTypes.has(a.animalType));
    }

    if (popupSubtype !== 'all' && focusedType && getSubtypeDefs(focusedType)) {
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
  }, [enriched, activeTypes, popupSubtype, popupSeason, search, focusedType]);

  // Dynamic Rare Finds header — reflects the most specific active filter.
  // Priority: search > subtype > type > season > default.
  const rareFindTitle = (() => {
    if (search.trim()) return `⭐ Once in a Lifetime: "${search.trim()}"`;

    const subtypeDefs = focusedType ? getSubtypeDefs(focusedType) : null;
    if (popupSubtype !== 'all' && subtypeDefs) {
      const def = subtypeDefs.find(d => d.key === popupSubtype);
      if (def) return `🌟 Rare ${def.label} at This Park`;
    }

    if (focusedType) {
      const typeDef = ANIMAL_TYPES[focusedType];
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

      {/* ── Rarity spectrum bar ── */}
      {isLive && (
        <RaritySpectrumBar
          animals={seasonFiltered}
          activeRarity={popupRarity}
          onSelectRarity={setPopupRarity}
        />
      )}

      {/* ── Type tabs ── */}
      <div className="lp__tabs-wrapper">
        {tabsCanScrollLeft && (
          <button className="lp__tabs-arrow lp__tabs-arrow--left" aria-hidden="true" tabIndex={-1}
            onClick={() => tabsRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>‹</button>
        )}
        <div className="lp__tabs" role="tablist" ref={tabsRef}>
          {Object.entries(ANIMAL_TYPES).filter(([k]) => k !== 'all').map(([k, { emoji, label }]) => {
            const count   = typeCounts[k] ?? 0;
            const isEmpty = count === 0;
            const isActive = activeTypes.has(k);
            return (
              <button
                key={k}
                role="tab"
                aria-selected={isActive}
                className={`lp__tab${isActive ? ' lp__tab--active' : ''}${isEmpty ? ' lp__tab--empty' : ''}`}
                onClick={(e) => { if (!isEmpty) { setPopupType(k); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest' }); } }}
                disabled={isEmpty}
                title={`${isActive ? 'Hide' : 'Show'} ${label}`}
              >
                <span aria-hidden="true">{emoji}</span>
                <span className="lp__tab-label">{label}</span>
                {count > 0 && (
                  <span className="lp__tab-count" title={popupSeason !== 'all' ? `${count} in ${SEASONS[popupSeason]?.label ?? popupSeason} / ${totalTypeCounts[k] ?? 0} total` : undefined}>
                    {popupSeason !== 'all' && (totalTypeCounts[k] ?? 0) !== count
                      ? `${count}/${totalTypeCounts[k] ?? 0}`
                      : count}
                  </span>
                )}
              </button>
            );
          })}
          {/* Show All button — appears when not all types are active */}
          {activeTypes.size < Object.keys(ANIMAL_TYPES).length - 1 && (
            <button
              className="lp__tab lp__tab--show-all"
              onClick={() => setPopupType('all')}
              title="Show all animal types"
            >
              <span className="lp__tab-label">All</span>
            </button>
          )}
        </div>
        {tabsCanScrollRight && (
          <button className="lp__tabs-arrow lp__tabs-arrow--right" aria-hidden="true" tabIndex={-1}
            onClick={() => tabsRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}>›</button>
        )}
      </div>

      {/* ── Subtype filter bar — only for birds, mammals, reptiles ── */}
      {focusedType && getSubtypeDefs(focusedType) && (
        <div className="lp__subtypes-wrapper">
          {subtypesCanScrollLeft && (
            <button className="lp__subtypes-arrow lp__subtypes-arrow--left" aria-hidden="true" tabIndex={-1}
              onClick={() => subtypesRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}>‹</button>
          )}
          <div className="lp__subtypes" role="group" aria-label="Animal subcategory" ref={subtypesRef}>
            {getSubtypeDefs(focusedType).map(({ key, emoji, label }) => {
              const count   = key === 'all'
                ? (typeCounts[focusedType] ?? 0)
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

      {/* ── Mobile-only: summary count bar ── */}
      {isLive && (
        <div className="lp__mobile-summary">
          <span className="lp__mobile-summary__total">{enriched.length} species</span>
          {isFiltered && (
            <span className="lp__mobile-summary__filtered">· Showing {filtered.length}</span>
          )}
        </div>
      )}

      {/* ── Mobile-only: filter & search toggle button ── */}
      {(() => {
        const mobileActiveFilters = [
          popupSort !== 'iconic-first',
          popupRarity !== 'all',
          !!search.trim(),
        ].filter(Boolean).length;
        return (
          <button
            className={`lp__mobile-filter-toggle${mobileFiltersOpen ? ' lp__mobile-filter-toggle--open' : ''}`}
            onClick={() => setMobileFiltersOpen(v => !v)}
            aria-expanded={mobileFiltersOpen}
          >
            {mobileFiltersOpen
              ? '✕ Close Filters'
              : `⚙️ Filter & Search${mobileActiveFilters > 0 ? ` (${mobileActiveFilters})` : ''}`}
          </button>
        );
      })()}

      {/* ── Controls: sort + season filter + rarity filter + search ── */}
      <div className={`lp__controls${mobileFiltersOpen ? ' lp__controls--mobile-open' : ''}`}>
        <div className="lp__controls-row">
          <select
            className="lp__select"
            value={popupSort}
            onChange={e => setPopupSort(e.target.value)}
            aria-label="Sort order"
          >
            <option value="iconic-first">Most Iconic</option>
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
            onChange={e => {
              const q = e.target.value;
              setSearch(q);
              clearTimeout(searchTrackTimerRef.current);
              if (q.trim()) {
                searchTrackTimerRef.current = setTimeout(() =>
                  track('search', { query: q.trim(), park: location.name }), 1000);
              }
            }}
            onBlur={() => {
              clearTimeout(searchTrackTimerRef.current);
              if (search.trim()) track('search', { query: search.trim(), park: location.name });
            }}
            aria-label="Search species"
          />
          {search && (
            <button className="lp__search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>
        {/* Mobile-only: close the filter panel */}
        <button className="lp__filter-apply-btn" onClick={() => setMobileFiltersOpen(false)}>
          ✓ Apply Filters
        </button>
      </div>

      {/* ── Single scroll container: animal list ── */}
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
            const visibleList = filtered.slice(0, displayLimit);
            const remaining   = filtered.length - displayLimit;
            const hasMore     = displayLimit < filtered.length;
            const typeLabel   = focusedType ? (ANIMAL_TYPES[focusedType]?.label ?? focusedType) : 'species';

            return (
              <>
                <div className="lp__showing-count">
                  Showing {Math.min(displayLimit, filtered.length)} of {filtered.length} {typeLabel}
                </div>
                {visibleList.map((a, i) => <AnimalCard key={`${a.name}-${i}`} animal={a} debugMode={debugMode} seasonalFreqs={seasonalFreqs} location={location} openAbout={openAbout} highlightSpecies={highlightSpecies} />)}
                {hasMore && (
                  <div className="lp__load-more-row">
                    <button className="lp__load-more-btn" onClick={() => setDisplayLimit(d => d + 100)}>
                      Load 100 more · {remaining} remaining
                    </button>
                    <button className="lp__view-all-btn" onClick={() => setDisplayLimit(filtered.length)}>
                      View all {filtered.length} {typeLabel}
                    </button>
                  </div>
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
  const secondaryReady = useSecondaryCache();
  const [season,       setSeason]       = useState('all');
  const [rarity,       setRarity]       = useState('all');
  const [animalType,   setAnimalType]   = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [debugMode,    setDebugMode]    = useState(false);

  // Popup-local filter preferences (persist across popup open/close)
  // Multi-select type filter: Set of active animal types (persists across popups within session)
  const DEFAULT_ACTIVE_TYPES = new Set(['bird', 'mammal']);
  const [activeTypes, setActiveTypes] = useState(DEFAULT_ACTIVE_TYPES);
  // popupType is derived: 'all' when all types active, single type when exactly 1, otherwise 'multi'
  const popupType = activeTypes.size === Object.keys(ANIMAL_TYPES).length - 1 ? 'all'  // minus 'all' key
    : activeTypes.size === 1 ? [...activeTypes][0]
    : 'multi';
  // For subtype bar compatibility — only show subtypes when exactly 1 type is selected
  const focusedType = activeTypes.size === 1 ? [...activeTypes][0] : null;
  const setPopupType = (k) => {
    // Clicking 'all' activates everything; clicking a specific type toggles it
    if (k === 'all') {
      const allKeys = Object.keys(ANIMAL_TYPES).filter(t => t !== 'all');
      setActiveTypes(new Set(allKeys));
    } else {
      setActiveTypes(prev => {
        const next = new Set(prev);
        if (next.has(k)) {
          // Don't allow deselecting the last type
          if (next.size > 1) next.delete(k);
        } else {
          next.add(k);
        }
        return next;
      });
    }
  };
  const [popupSort,    setPopupSort]    = useState('iconic-first');
  const [popupRarity,  setPopupRarity]  = useState('all');
  const [popupSubtype, setPopupSubtype] = useState('all');
  // Reset subtype whenever the focused type changes
  useEffect(() => { setPopupSubtype('all'); }, [focusedType]);
  const [popupSeason, setPopupSeason] = useState(() => {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'fall';
    return 'winter';
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [speciesQuery,  setSpeciesQuery]  = useState('');
  const [speciesFilter, setSpeciesFilter] = useState(null); // selected species name string
  const [categoryType,    setCategoryType]    = useState('all');
  const [categorySubtype, setCategorySubtype] = useState('all');

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

  // Theme toggle — localStorage > prefers-color-scheme > light
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem('wm_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    try { localStorage.setItem('wm_theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);

  // About modal
  const [showAbout, setShowAbout] = useState(false);
  const [aboutScrollTo, setAboutScrollTo] = useState(null);
  const openAbout = useCallback((section = null) => { track('about_open'); setAboutScrollTo(section); setShowAbout(true); }, []);
  const closeAbout = useCallback(() => { setShowAbout(false); setAboutScrollTo(null); }, []);

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

  // Refs for global toolbar filters — lets handlePopupOpen read current values
  // without adding them to its dependency array (avoids MarkerLayer re-binds).
  const rarityRef     = useRef(rarity);
  const seasonRef     = useRef(season);
  const animalTypeRef = useRef(animalType);
  useEffect(() => { rarityRef.current     = rarity; },     [rarity]);
  useEffect(() => { seasonRef.current     = season; },     [season]);
  useEffect(() => { animalTypeRef.current = animalType; }, [animalType]);

  const handlePopupOpen = useCallback((loc) => {
    track('park_click', { park: loc.name, state: loc.stateCodes?.[0] ?? 'unknown' });
    setOpenPopup({ loc });

    // Sync global toolbar filters → popup-local filters on every open.
    // When global is 'all', reset to popup defaults; when specific, inherit.
    setPopupRarity(rarityRef.current);

    if (seasonRef.current !== 'all') {
      setPopupSeason(seasonRef.current);
    } else {
      const m = new Date().getMonth() + 1;
      setPopupSeason(m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'fall' : 'winter');
    }

    if (animalTypeRef.current !== 'all') {
      setActiveTypes(new Set([animalTypeRef.current]));
    } else {
      setActiveTypes(new Set(['bird', 'mammal']));
    }

    // Bypass the stagger queue if this location has no data yet
    if (!liveDataRef.current[loc.id] && !loadingRef.current.has(loc.id)) {
      refreshLocation(loc.id);
    }
  }, [refreshLocation]);
  const handlePopupClose = useCallback(() => setOpenPopup(null), []);

  const handleSpeciesSelect = useCallback((s) => {
    setSpeciesFilter(s.name);
    setSpeciesQuery(s.name);
    track('species_search', { species: s.name, parkCount: s.parkCount });
  }, []);
  const handleSpeciesClear = useCallback(() => {
    setSpeciesFilter(null);
    setSpeciesQuery('');
  }, []);
  const handleCategoryReset = useCallback(() => {
    setCategoryType('all');
    setCategorySubtype('all');
  }, []);

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
      out[loc.id] = balanceAnimals(filterGeographicOutliers(mergeAnimals(loc.animals, live), loc.id));
    });
    return out;
  }, [liveData]);

  // ── Species → parks reverse index ────────────────────────────────────────
  const allSpeciesList = useMemo(() => {
    const map = new Map(); // name → { parks: Set<parkId>, sciName: string|null }
    for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
      for (const a of data.animals ?? []) {
        if (!a.name) continue;
        if (!map.has(a.name)) map.set(a.name, { parks: new Set(), sciName: a.scientificName ?? null });
        map.get(a.name).parks.add(parkId);
      }
    }
    const list = [...map.entries()]
      .map(([name, v]) => ({
        name,
        sciName:   v.sciName,
        parkCount: v.parks.size,
        photoUrl:  BUNDLED_PHOTOS[name]?.url ?? null,
      }))
      .sort((a, b) => b.parkCount - a.parkCount);
    return list;
  }, []);

  const speciesSuggestions = useMemo(() => {
    if (speciesQuery.trim().length < 2) return [];
    const q = speciesQuery.toLowerCase();
    const exact = [], sw = [], contains = [];
    for (const s of allSpeciesList) {
      const n  = s.name.toLowerCase();
      const sc = s.sciName?.toLowerCase() ?? '';
      if (n === q)                             { exact.push(s);    continue; }
      if (n.startsWith(q) || sc.startsWith(q)){ sw.push(s);       continue; }
      if (n.includes(q)   || sc.includes(q))  { contains.push(s);           }
      if (exact.length + sw.length + contains.length >= 60) break;
    }
    return [...exact, ...sw, ...contains].slice(0, 8);
  }, [speciesQuery, allSpeciesList]);

  const speciesFilteredParkIds = useMemo(() => {
    if (!speciesFilter) return null;
    const q = speciesFilter.toLowerCase();
    const ids = new Set();
    for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
      if ((data.animals ?? []).some(a =>
        a.name?.toLowerCase() === q || a.scientificName?.toLowerCase() === q
      )) ids.add(parkId);
    }
    // Also catch any species only in wildlifeLocations static data
    for (const loc of wildlifeLocations) {
      if (!ids.has(loc.id) && (loc.animals ?? []).some(a => a.name?.toLowerCase() === q)) {
        ids.add(loc.id);
      }
    }
    return ids;
  }, [speciesFilter]);

  // Filters parks to those containing at least one animal matching the selected
  // type + subtype pair.  Returns null when no type is selected (no filtering).
  const categoryFilteredParkIds = useMemo(() => {
    if (categoryType === 'all') return null;
    const ids = new Set();
    for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
      if ((data.animals ?? []).some(a => {
        if (a.animalType !== categoryType) return false;
        if (categorySubtype === 'all') return true;
        return classifyAnimalSubtype(a) === categorySubtype;
      })) ids.add(parkId);
    }
    // Also check wildlifeLocations static animals
    for (const loc of wildlifeLocations) {
      if (!ids.has(loc.id) && (loc.animals ?? []).some(a => {
        if (a.animalType !== categoryType) return false;
        if (categorySubtype === 'all') return true;
        return classifyAnimalSubtype(a) === categorySubtype;
      })) ids.add(loc.id);
    }
    return ids;
  }, [categoryType, categorySubtype]);

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
        createPinIcon(
          loc.locationType, false,
          !secondaryReady && !WILDLIFE_CACHE[loc.id],  // show loading dot for unpopulated parks
          zoomTier
        ),
      ])
    );
  }, [npsParks, zoomTier, secondaryReady]);

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
  const allVisibleLocations = useMemo(() => {
    let all = [...visibleLocations, ...visibleNpsParks];
    if (speciesFilteredParkIds)  all = all.filter(loc => speciesFilteredParkIds.has(loc.id));
    if (categoryFilteredParkIds) all = all.filter(loc => categoryFilteredParkIds.has(loc.id));
    return all;
  }, [visibleLocations, visibleNpsParks, speciesFilteredParkIds, categoryFilteredParkIds]);

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

  // Auto-zoom to fit filtered parks when species filter is applied
  useEffect(() => {
    if (!speciesFilter || !speciesFilteredParkIds || !mapRef.current) return;
    const filteredLocs = wildlifeLocations.filter(loc => speciesFilteredParkIds.has(loc.id));
    if (filteredLocs.length === 0) return;
    if (filteredLocs.length === 1) {
      mapRef.current.setView([filteredLocs[0].lat, filteredLocs[0].lng], 8);
    } else {
      const bounds = L.latLngBounds(filteredLocs.map(loc => [loc.lat, loc.lng]));
      mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 10 });
    }
  }, [speciesFilter, speciesFilteredParkIds]);

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

  const activeFilterCount = [season, rarity, animalType, selectedState].filter(v => v !== 'all').length
    + (categoryType !== 'all' ? 1 : 0);

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
      {showSplash && <SplashScreen onDismiss={dismissSplash} onAbout={() => openAbout()} />}

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
            <button className="hdr__about-btn" onClick={() => openAbout()} title="About this project" aria-label="About">
              <span className="hdr__about-icon">i</span> About
            </button>
            <button className="hdr__theme-btn" onClick={() => { track('theme_toggle', { theme: darkMode ? 'light' : 'dark' }); setDarkMode(d => !d); }} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              className="hdr__filter-toggle"
              onClick={() => setMobileFiltersOpen(v => !v)}
              aria-expanded={mobileFiltersOpen}
              aria-label="Toggle filters"
            >
              {mobileFiltersOpen ? '✕ Close' : `⚙︎ Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
            </button>
          </div>

          {/* Category dropdowns + species search — desktop: inline in header row */}
          <div className="hdr__species">
            <CategoryDropdowns
              categoryType={categoryType}
              setCategoryType={setCategoryType}
              categorySubtype={categorySubtype}
              setCategorySubtype={setCategorySubtype}
              onTrack={(type, subtype) => track('category_filter', { type, subtype })}
            />
            <SpeciesSearch
              suggestions={speciesSuggestions}
              query={speciesQuery}
              onChange={setSpeciesQuery}
              onSelect={handleSpeciesSelect}
              onClear={handleSpeciesClear}
              hasFilter={!!speciesFilter}
            />
          </div>

          {/* All filters */}
          <div className="hdr__filters">

            {/* Row 1: Season + Rarity */}
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-group__label">Season</span>
                <div className="filter-group__btns">
                  {Object.entries(SEASONS).map(([k, { label, emoji, color }]) => (
                    <FilterBtn key={k} active={season === k} onClick={() => { setSeason(k); track('season_filter', { season: k }); }} emoji={emoji} label={label} activeColor={color} />
                  ))}
                </div>
              </div>
              <div className="filter-sep" />
              <div className="filter-group">
                <span className="filter-group__label">Rarity</span>
                <div className="filter-group__btns">
                  {Object.entries(RARITY).map(([k, { label, emoji, color }]) => (
                    <FilterBtn key={k} active={rarity === k} onClick={() => { setRarity(k); track('rarity_filter', { rarity: k }); }} emoji={emoji} label={label} activeColor={color} />
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
                    <FilterBtn key={k} active={animalType === k} onClick={() => { setAnimalType(k); track('type_filter', { type: k }); }} emoji={emoji} label={label} activeColor={color} title={label} />
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

      {/* ── Mobile filter drawer (≤768px only) ─────────────────────── */}
      <div className={`mobile-filter-drawer${mobileFiltersOpen ? ' mobile-filter-drawer--open' : ''}`}
        aria-hidden={!mobileFiltersOpen}>
        <div className="mobile-filter-drawer__inner">
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">Category</span>
            <CategoryDropdowns
              categoryType={categoryType}
              setCategoryType={setCategoryType}
              categorySubtype={categorySubtype}
              setCategorySubtype={setCategorySubtype}
              onTrack={(type, subtype) => track('category_filter', { type, subtype })}
            />
          </div>
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">Season</span>
            <div className="mobile-filter-btns">
              {Object.entries(SEASONS).map(([k, { label, emoji, color }]) => (
                <FilterBtn key={k} active={season === k}
                  onClick={() => { setSeason(k); track('season_filter', { season: k }); }}
                  emoji={emoji} label={label} activeColor={color} />
              ))}
            </div>
          </div>
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">Rarity</span>
            <div className="mobile-filter-btns">
              {Object.entries(RARITY).map(([k, { label, emoji, color }]) => (
                <FilterBtn key={k} active={rarity === k}
                  onClick={() => { setRarity(k); track('rarity_filter', { rarity: k }); }}
                  emoji={emoji} label={label} activeColor={color} />
              ))}
            </div>
          </div>
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">Animal Type</span>
            <div className="mobile-filter-btns">
              {Object.entries(ANIMAL_TYPES).map(([k, { label, emoji, color }]) => (
                <FilterBtn key={k} active={animalType === k}
                  onClick={() => { setAnimalType(k); track('type_filter', { type: k }); }}
                  emoji={emoji} label={label} activeColor={color} />
              ))}
            </div>
          </div>
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">State</span>
            <select className="filter-select mobile-filter-select"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              aria-label="Filter by state">
              <option value="all">🗺️ All States</option>
              {allStateCodes.map(code => (
                <option key={code} value={code}>{STATE_NAMES[code] ?? code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── What's Active Now rotating banner ── */}
      <WhatActiveNow />

      {/* ── Map ── */}
      <main className="map-wrap">
        {/* Zoom prompt — fades out after 3.5 s */}
        {showZoomHint && <div className="zoom-hint">Zoom in to explore parks</div>}
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            key={darkMode ? 'dark' : 'light'}
            url={darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
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
                cacheTs={liveData[openPopup.loc.id]?._cacheTs ?? null}
                popupType={popupType}       setPopupType={setPopupType}
                popupSort={popupSort}       setPopupSort={setPopupSort}
                loadingProgress={loadingProgress}
                refreshLocation={refreshLocation}
                popupSeason={popupSeason}   setPopupSeason={setPopupSeason}
                popupRarity={popupRarity}   setPopupRarity={setPopupRarity}
                popupSubtype={popupSubtype} setPopupSubtype={setPopupSubtype}
                activeTypes={activeTypes}   focusedType={focusedType}
                openAbout={openAbout}
                highlightSpecies={speciesFilter}
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

        {/* Species + category filter pills — stacked vertically in the centre */}
        {(speciesFilter || categoryType !== 'all') && (
          <div className="filter-pills-stack">
            {speciesFilter && (
              <div className="species-pill">
                <span className="species-pill__label">🔍 {speciesFilter}</span>
                <span className="species-pill__count">{allVisibleLocations.length} park{allVisibleLocations.length !== 1 ? 's' : ''}</span>
                <button className="species-pill__clear" onClick={handleSpeciesClear} aria-label="Clear species filter">✕</button>
              </div>
            )}
            {categoryType !== 'all' && (
              <div className="species-pill species-pill--category">
                <span className="species-pill__label">
                  {ANIMAL_TYPES[categoryType].emoji}{' '}
                  {categorySubtype !== 'all'
                    ? (getSubtypeDefs(categoryType)?.find(s => s.key === categorySubtype)?.label ?? ANIMAL_TYPES[categoryType].label)
                    : ANIMAL_TYPES[categoryType].label}
                </span>
                <span className="species-pill__count">{allVisibleLocations.length} park{allVisibleLocations.length !== 1 ? 's' : ''}</span>
                <button className="species-pill__clear" onClick={handleCategoryReset} aria-label="Clear category filter">✕</button>
              </div>
            )}
          </div>
        )}
        {speciesFilter && allVisibleLocations.length === 0 && (
          <div className="species-no-results">No parks found with "{speciesFilter}"</div>
        )}

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

      {/* ── About modal ── */}
      {showAbout && <AboutModal onClose={closeAbout} scrollTo={aboutScrollTo} />}

      {/* ── Vercel Analytics & Speed Insights ── */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
