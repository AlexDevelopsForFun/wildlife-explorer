import { useState, useMemo, useEffect, useRef, useCallback, Component } from 'react';
import { basemapUrl, BASEMAP_ATTRIBUTION } from './data/basemap.js';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { track } from '@vercel/analytics';

import { wildlifeLocations, SEASONS, RARITY, ANIMAL_TYPES, STATE_NAMES } from './wildlifeData';
import { NATIONAL_WILDLIFE_REFUGES } from './data/nationalWildlifeRefuges.js';
import { STATE_PARKS_NJ, STATE_PARKS_BY_STATE, findStatePark, INAT_PLACE_IDS, STATE_PARK_HIGHLIGHTS } from './data/stateParksNJ';
// County bird-frequency data — PER-STATE lazy chunks (~25KB each), never in
// the main bundle. Opening a park fetches only its own state's data; the old
// all-states monolith (12MB) is split by scripts/splitBirdFreq.mjs.
import { loadStateBirdFreq } from './data/birdFreq/loader.js';
import { loadCountyNonbird } from './data/countyNonbird/loader.js';
import { loadCountyBirdList } from './data/countyBirdList/loader.js';
import { safeSetItem } from './utils/safeStorage.js';
import { SUPPORTERS, FOUNDING_LIMIT, SUPPORT_URL } from './data/supporters.js';
import { CHANGELOG } from './data/changelog.js';

// Non-bird county floor (mammals/reptiles/amphibians/fish/insects): seed a group
// only when the live list for it is thin; emoji shown per seeded species.
const NONBIRD_EMOJI = { mammal: '🦌', reptile: '🦎', amphibian: '🐸', marine: '🐟', insect: '🦋' };
const NONBIRD_THIN  = { mammal: 12, reptile: 12, amphibian: 8, marine: 12, insect: 25 };

// County fallback for the handful of state parks the eBird-hotspot build never
// resolved (so they had no floor). Hand-mapped by point-in-polygon; only the
// ones whose county actually has floor data are listed. The newest parks
// (MA/NY) self-resolve on the next monthly bird rebuild — this is their stopgap.
const PARK_COUNTY_EXTRA = {
  'ma-richard-mckinnon': 'US-MA-017',
  'ny-three-falls':      'US-NY-099',
  'ms-holmes-county':    'US-MS-051',
  'ak-wood-tikchik':     'US-AK-070',
  'al-cedar-creek':      'US-AL-097', // Mobile — point-in-polygon
  'ms-kurtz-sf':         'US-MS-041', // Greene — point-in-polygon
  'ca-border-field':     'US-CA-073', // San Diego — park sits ON the MX border so
                                      // its centroid fell in a MX municipio; it's
                                      // a San Diego coastal park (full SD floor).
};

// Hiking-trails deep link (MVP). Opens AllTrails' map centered on the park
// (~13 km box) so visitors see the routes/trails there — AllTrails has far
// richer US trail coverage than OSM route-relations. Single source of truth:
// swap this one URL to change the destination (e.g. an OSM hiking map).
const trailsUrl = (lat, lng) => {
  const d = 0.06;
  return `https://www.alltrails.com/explore?b_tl_lat=${(lat + d).toFixed(4)}&b_tl_lng=${(lng - d).toFixed(4)}` +
         `&b_br_lat=${(lat - d).toFixed(4)}&b_br_lng=${(lng + d).toFixed(4)}`;
};

// Park hero photos are opt-in: collapsed behind a pill by default (the species
// are the point; the photo is a peek), and the visitor's last choice is
// remembered — open it once and parks keep showing photos, close it and they
// stay closed. Shared by the national popup and the state-park panel.
// Persisted via safeSetItem: engaged sessions FILL the localStorage quota with
// API caches, after which plain setItem throws QuotaExceededError silently.
const HERO_PREF_KEY = 'wm_show_park_photo';
function useHeroPreference() {
  const [showHero, setShowHero] = useState(() => {
    try { return localStorage.getItem(HERO_PREF_KEY) === '1'; } catch { return false; }
  });
  const toggleHero = useCallback(() => {
    setShowHero(v => {
      const next = !v;
      safeSetItem(HERO_PREF_KEY, next ? '1' : '0');
      return next;
    });
  }, []);
  return [showHero, toggleHero];
}

// Hero block: collapsed pill ⇄ uncropped photo (+ Wikimedia credit when the
// image isn't public-domain NPS) with a close control. Wiki-sourced photos
// also get a "🚩 Wrong photo" flag — reports land in the runtime error log
// (filter "photo-flag") for periodic review → PHOTO_BLOCKLIST. Free
// crowd-sourced audit of 4,000+ park photos.
function ParkHero({ hero, parkId, parkName, showHero, onToggle, onFlag }) {
  if (!hero?.src) return null;
  if (!showHero) {
    return (
      <button type="button" className="lp__hero-toggle" onClick={onToggle}>
        📷 See what this park looks like
      </button>
    );
  }
  const flag = () => {
    try {
      const body = JSON.stringify({ msg: 'photo-flag', src: `${parkId} ${hero.src.split('/').pop()}`.slice(0, 200), line: 0 });
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/log-error', body))) {
        fetch('/api/log-error', { method: 'POST', body, keepalive: true }).catch(() => {});
      }
    } catch { /* best effort */ }
    onFlag?.();
  };
  return (
    <div className="lp__hero-wrap">
      <img className="lp__hero lp__hero--natural" src={hero.src} alt={`${parkName} scenery`} loading="lazy"
           onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
      {hero.credit && (
        <a className="lp__hero-credit" href={hero.credit} target="_blank" rel="noopener noreferrer"
           title="Photo source & license (Wikimedia)">📷 Wikimedia</a>
      )}
      {/* Photo controls live in a labeled row at the BOTTOM — the only ✕ in the
          corners is the popup's own close, so there's no duplicate close button. */}
      <div className="lp__hero-tools">
        <button type="button" className="lp__hero-tool" onClick={onToggle}
                aria-label="Hide park photo" title="Hide photo">✕ Hide photo</button>
        {hero.credit && (
          <button type="button" className="lp__hero-tool lp__hero-flag" onClick={flag}
                  title="Report: this photo doesn't represent the park">🚩 Wrong photo</button>
        )}
      </div>
    </div>
  );
}

// States we have curated park data for. Add a new state's entry here +
// extend STATE_PARKS_BY_STATE — the selector + map handle it automatically.
// `view` (center + zoom) gives a tight, hand-tuned framing per state;
// `bounds` is the maxBounds (panning fence) so the user can't drift far.
const STATE_PARK_STATES = [
  {
    code: 'NJ',
    name: 'New Jersey',
    view: { center: [40.18, -74.55], zoom: 8 },
    bounds: [[38.60, -75.90], [41.70, -73.60]],
  },
  {
    code: 'DE',
    name: 'Delaware',
    view: { center: [39.00, -75.50], zoom: 9 },
    bounds: [[38.30, -75.90], [39.95, -75.00]],
  },
  {
    code: 'CT',
    name: 'Connecticut',
    view: { center: [41.55, -72.70], zoom: 9 },
    bounds: [[40.85, -73.95], [42.20, -71.65]],
  },
  {
    code: 'RI',
    name: 'Rhode Island',
    view: { center: [41.62, -71.55], zoom: 9 },
    bounds: [[41.05, -72.00], [42.10, -71.05]],
  },
  {
    code: 'MA',
    name: 'Massachusetts',
    view: { center: [42.20, -71.80], zoom: 8 },
    bounds: [[41.10, -73.65], [42.95, -69.80]],
  },
  {
    code: 'NH',
    name: 'New Hampshire',
    view: { center: [43.70, -71.55], zoom: 7 },
    bounds: [[42.50, -72.70], [45.40, -70.45]],
  },
  {
    code: 'VT',
    name: 'Vermont',
    view: { center: [44.00, -72.70], zoom: 7 },
    bounds: [[42.60, -73.55], [45.10, -71.40]],
  },
  {
    code: 'ME',
    name: 'Maine',
    view: { center: [45.30, -69.20], zoom: 7 },
    bounds: [[42.90, -71.20], [47.60, -66.80]],
  },
  {
    code: 'NY',
    name: 'New York',
    view: { center: [43.00, -75.50], zoom: 6 },
    bounds: [[40.40, -79.90], [45.10, -71.80]],
  },
  {
    code: 'PA',
    name: 'Pennsylvania',
    view: { center: [41.00, -77.60], zoom: 7 },
    bounds: [[39.60, -80.65], [42.40, -74.60]],
  },
  {
    code: 'MD',
    name: 'Maryland',
    view: { center: [39.00, -77.00], zoom: 7 },
    bounds: [[37.80, -79.60], [39.80, -74.90]],
  },
  {
    code: 'VA',
    name: 'Virginia',
    view: { center: [37.70, -79.00], zoom: 6 },
    bounds: [[36.40, -83.80], [39.60, -75.10]],
  },
  {
    code: 'WV',
    name: 'West Virginia',
    view: { center: [38.80, -80.50], zoom: 7 },
    bounds: [[37.10, -82.80], [40.70, -77.60]],
  },
  {
    code: 'NC',
    name: 'North Carolina',
    view: { center: [35.50, -79.50], zoom: 6 },
    bounds: [[33.70, -84.40], [36.70, -75.30]],
  },
  {
    code: 'SC',
    name: 'South Carolina',
    view: { center: [33.90, -80.90], zoom: 7 },
    bounds: [[31.95, -83.45], [35.30, -78.40]],
  },
  {
    code: 'GA',
    name: 'Georgia',
    view: { center: [32.90, -83.30], zoom: 6 },
    bounds: [[30.30, -85.70], [35.10, -80.80]],
  },
  {
    code: 'TN',
    name: 'Tennessee',
    view: { center: [35.80, -86.40], zoom: 6 },
    bounds: [[34.90, -90.40], [36.75, -81.55]],
  },
  {
    code: 'KY',
    name: 'Kentucky',
    view: { center: [37.60, -85.80], zoom: 6 },
    bounds: [[36.40, -89.70], [39.25, -81.85]],
  },
  {
    code: 'OH',
    name: 'Ohio',
    view: { center: [40.20, -82.80], zoom: 7 },
    bounds: [[38.30, -84.90], [42.10, -80.40]],
  },
  {
    code: 'MI',
    name: 'Michigan',
    view: { center: [44.80, -85.60], zoom: 6 },
    bounds: [[41.60, -90.50], [47.60, -82.30]],
  },
  {
    code: 'IN',
    name: 'Indiana',
    view: { center: [39.90, -86.30], zoom: 7 },
    bounds: [[37.70, -88.20], [41.85, -84.70]],
  },
  {
    code: 'IL',
    name: 'Illinois',
    view: { center: [40.00, -89.20], zoom: 6 },
    bounds: [[36.90, -91.60], [42.60, -87.00]],
  },
  {
    code: 'WI',
    name: 'Wisconsin',
    view: { center: [44.50, -89.90], zoom: 6 },
    bounds: [[42.40, -93.00], [47.20, -86.70]],
  },
  {
    code: 'MN',
    name: 'Minnesota',
    view: { center: [46.30, -94.30], zoom: 6 },
    bounds: [[43.40, -97.30], [49.45, -89.40]],
  },
  {
    code: 'FL',
    name: 'Florida',
    view: { center: [28.00, -82.50], zoom: 6 },
    bounds: [[24.40, -87.70], [31.10, -79.90]],
  },
  {
    code: 'AL',
    name: 'Alabama',
    view: { center: [32.80, -86.80], zoom: 7 },
    bounds: [[30.10, -88.60], [35.10, -84.80]],
  },
  {
    code: 'MS',
    name: 'Mississippi',
    view: { center: [32.70, -89.70], zoom: 7 },
    bounds: [[30.00, -91.80], [35.10, -88.00]],
  },
  {
    code: 'LA',
    name: 'Louisiana',
    view: { center: [31.00, -92.00], zoom: 7 },
    bounds: [[28.90, -94.10], [33.10, -88.90]],
  },
  {
    code: 'AR',
    name: 'Arkansas',
    view: { center: [34.80, -92.40], zoom: 7 },
    bounds: [[32.90, -94.70], [36.60, -89.50]],
  },
  {
    code: 'IA',
    name: 'Iowa',
    view: { center: [42.00, -93.50], zoom: 7 },
    bounds: [[40.30, -96.80], [43.60, -90.00]],
  },
  {
    code: 'MO',
    name: 'Missouri',
    view: { center: [38.40, -92.50], zoom: 6 },
    bounds: [[35.90, -95.90], [40.70, -89.00]],
  },
  {
    code: 'ND',
    name: 'North Dakota',
    view: { center: [47.45, -100.40], zoom: 6 },
    bounds: [[45.85, -104.15], [49.05, -96.45]],
  },
  {
    code: 'SD',
    name: 'South Dakota',
    view: { center: [44.40, -100.20], zoom: 6 },
    bounds: [[42.40, -104.15], [45.99, -96.40]],
  },
  {
    code: 'NE',
    name: 'Nebraska',
    view: { center: [41.50, -99.70], zoom: 6 },
    bounds: [[39.95, -104.10], [43.05, -95.25]],
  },
  {
    code: 'KS',
    name: 'Kansas',
    view: { center: [38.50, -98.30], zoom: 6 },
    bounds: [[36.95, -102.10], [40.05, -94.55]],
  },
  {
    code: 'OK',
    name: 'Oklahoma',
    view: { center: [35.50, -97.50], zoom: 6 },
    bounds: [[33.60, -103.05], [37.05, -94.40]],
  },
  {
    code: 'MT',
    name: 'Montana',
    view: { center: [47.00, -109.60], zoom: 6 },
    bounds: [[44.30, -116.10], [49.05, -104.00]],
  },
  {
    code: 'WY',
    name: 'Wyoming',
    view: { center: [43.00, -107.55], zoom: 6 },
    bounds: [[40.95, -111.10], [45.05, -104.00]],
  },
  {
    code: 'CO',
    name: 'Colorado',
    view: { center: [39.00, -105.55], zoom: 6 },
    bounds: [[36.95, -109.10], [41.05, -102.00]],
  },
  {
    code: 'ID',
    name: 'Idaho',
    view: { center: [44.40, -114.50], zoom: 6 },
    bounds: [[41.95, -117.30], [49.05, -111.00]],
  },
  {
    code: 'UT',
    name: 'Utah',
    view: { center: [39.30, -111.70], zoom: 6 },
    bounds: [[36.95, -114.10], [42.05, -109.00]],
  },
  {
    code: 'NV',
    name: 'Nevada',
    view: { center: [39.30, -116.90], zoom: 6 },
    bounds: [[35.00, -120.05], [42.05, -114.00]],
  },
  {
    code: 'AZ',
    name: 'Arizona',
    view: { center: [34.20, -111.70], zoom: 6 },
    bounds: [[31.30, -114.90], [37.05, -109.00]],
  },
  {
    code: 'NM',
    name: 'New Mexico',
    view: { center: [34.40, -106.10], zoom: 6 },
    bounds: [[31.30, -109.10], [37.05, -103.00]],
  },
  {
    code: 'CA',
    name: 'California',
    view: { center: [37.20, -119.40], zoom: 5 },
    bounds: [[32.50, -124.50], [42.05, -114.10]],
  },
  {
    code: 'OR',
    name: 'Oregon',
    view: { center: [44.00, -120.50], zoom: 6 },
    bounds: [[41.95, -124.60], [46.30, -116.40]],
  },
  {
    code: 'WA',
    name: 'Washington',
    view: { center: [47.40, -120.50], zoom: 6 },
    bounds: [[45.50, -124.80], [49.05, -116.90]],
  },
  {
    code: 'TX',
    name: 'Texas',
    view: { center: [31.30, -99.30], zoom: 5 },
    bounds: [[25.80, -106.70], [36.55, -93.50]],
  },
  {
    code: 'AK',
    name: 'Alaska',
    view: { center: [61.50, -149.00], zoom: 4 },
    bounds: [[57.50, -160.00], [65.50, -134.00]],
  },
  {
    code: 'HI',
    name: 'Hawaii',
    view: { center: [20.70, -157.00], zoom: 6 },
    bounds: [[18.90, -159.80], [22.30, -154.80]],
  },
];
import { classifyAnimalSubtype, getSubtypeDefs } from './utils/subcategories';
import { findStateParksWithSpecies } from './utils/birdParkSearch';
import {
  mergeAnimals, balanceAnimals, filterGeographicOutliers, NEVER_EXCEPTIONAL_BIRDS,
  getCorrectionFactor, getMonthlyFrequency,
  rarityFromChecklist, rarityFromInatAbundance, nonbirdSeasons, applyRarityOverride,
  fetchInatMonthlyHist, fetchInatParkMonthlyEffort,
  fetchEbird, fetchINat, fetchEbirdHotspot, deduplicateAnimals,
  fetchWikiParkImage, fetchEbirdNotable,
} from './services/apiService';
import { useLiveData } from './hooks/useLiveData';
import { useNpsParks } from './hooks/useNpsParks';
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT, loadSecondaryCache } from './data/wildlifeCacheLoader.js';
import { useSecondaryCache } from './hooks/useSecondaryCache.js';
import { fetchAnimalPhoto } from './services/photoService';
import { BUNDLED_PHOTOS } from './data/photoCache.js';
import { needsGeneratedDescription, fetchAnimalDescription } from './services/descriptionService';
import {
  toggleSeen, getSeenKeySet, parkProgress, speciesKey,
  getSeenCount, exportLifeList, getMilestone, getLifeList, clearAll,
  importLifeList, encodeShareToken, applyShareTokenFromUrl,
} from './services/seenList';
import {
  ACTIVITY_PERIOD_UI, CONFIDENCE_UI, rarityFromFrequency,
  VISITOR_EFFORT, PARK_EFFORT_BASELINES, DEFAULT_VISITOR_EFFORT,
  TIME_OF_DAY_MULTIPLIER, TIME_OF_DAY_UI, classifyActivityPeriod,
} from './data/speciesMetadata.js';
import { getParkZones } from './data/parkZones.js';
import { detectabilityCeiling, classifyDetectability, DETECTABILITY_LEVELS } from './data/detectability.js';
import { recordSighting, clearSighting, getSightingVerdict, exportSightings, getAllSightings } from './data/sightingFeedback.js';
import { fetchParkSightings, postSighting, sightingsBucketKey } from './services/sightingsService.js';

// ── Park type colors & icons ──────────────────────────────────────────────────
const PARK_COLORS = { nationalPark: '#7B5B2E', wildlifeRefuge: '#1f6f6f' };
const PARK_ICONS  = { nationalPark: '⛰️', wildlifeRefuge: '🦆' };

// Per-NPS-kind marker emoji (national map). A distinct emoji per designation is
// a colour-independent cue, mirroring the state-park category markers. Order
// here also drives the legend/filter chips.
const NPS_KIND_EMOJI = {
  'National Park':            '🏔️',
  'National Monument':        '🗿',
  'National Preserve':        '🌲',
  'National Seashore':        '🏖️',
  'National Lakeshore':       '⛵',
  'National Recreation Area': '🛶',
  'National Reserve':         '🌾',
  'National River':           '🏞️',
  'National Park Unit':       '⛰️',
  'Wildlife Refuge':          '🦆',   // USFWS — opt-in layer, off by default
};
const NPS_KIND_ORDER = Object.keys(NPS_KIND_EMOJI);
const npsKindOf  = (loc) => loc?.npsKind || 'National Park';   // static 63 have no npsKind → all are NPs
const npsEmojiOf = (loc) => NPS_KIND_EMOJI[npsKindOf(loc)] ?? '⛰️';

// State-park category → emoji (for the mixed "near me" results list).
const STATE_CAT_EMOJI = {
  'state-park': '🏞️', 'state-forest': '🌲', 'recreation-area': '🛶',
  'state-beach': '🏖️', 'state-preserve': '🦋',
};

// ── Park type badge styles (used in popup header) ─────────────────────────────
const PARK_TYPE_STYLES = {
  nationalPark:   { bg: '#7B5B2E', label: '🏔️ National Park' },
  wildlifeRefuge: { bg: '#1f6f6f', label: '🦆 Wildlife Refuge' },
};

// ── Circular marker icon factory ──────────────────────────────────────────────
// Renders one of three tiers based on the current zoom level:
//   Tier 1 (zoom ≤ 4): 12 px colored dot — no icon, no badge, no pulse
//   Tier 2 (zoom 5-6): 24 px circle with park emoji — no badge, no pulse
//   Tier 3 (zoom ≥ 7): full 48 px — icon + LIVE badge + pulse animation
function createPinIcon(locationType, isLive = false, isLoading = false, zoomTier = 3, emoji = null) {
  const bg   = PARK_COLORS[locationType] ?? '#1a6640';
  const icon = emoji ?? PARK_ICONS[locationType] ?? '📍';

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

// Long institutional names used in the popup header attribution line.
// eBird's API Terms §3 require attributing "eBird.org as the source of the
// data ... with a link back to eBird.org" — so the eBird label names eBird
// explicitly and SOURCE_URL links it. (iNat/NPS/GBIF linked too — good
// practice and their terms.)
const SOURCE_LONG = {
  ebird:       'eBird (Cornell Lab of Ornithology)',
  inaturalist: 'iNaturalist',
  nps:         'National Park Service',
  gbif:        'GBIF',
  static:      'Park Records',
  estimated:   'Park Records',
};

const SOURCE_URL = {
  ebird:       'https://ebird.org',
  inaturalist: 'https://www.inaturalist.org',
  nps:         'https://www.nps.gov',
  gbif:        'https://www.gbif.org',
};

// Render the live-data attribution as linked source names joined by " · ".
// Used by both the national popup and the state-park panel so the eBird.org
// link (API Terms §3) is present wherever bird data is displayed.
function renderSourceAttr(sources) {
  const live = [...new Set((sources || []).filter(s => s !== 'static' && s !== 'estimated'))];
  const list = live.length ? live : ['ebird', 'inaturalist'];
  const nodes = [];
  list.forEach((s, i) => {
    if (i > 0) nodes.push(<span key={`sep-${i}`}> · </span>);
    const name = SOURCE_LONG[s] ?? s;
    nodes.push(SOURCE_URL[s]
      ? <a key={s} className="lp__source-link" href={SOURCE_URL[s]} target="_blank" rel="noopener noreferrer">{name}</a>
      : <span key={s}>{name}</span>);
  });
  return nodes;
}

// Source attribution — quiet tint + small glyph so provenance is legible but
// doesn't compete with the rarity signal for attention.
const SOURCE_COLORS = {
  ebird:       '#4a7a8a',
  inaturalist: '#5a7a4a',
  gbif:        '#6b7280',
  nps:         '#5c6f52',
  static:      '#6b7280',
  estimated:   '#9ca3af',
};

const SOURCE_ICONS = {
  ebird:       '🔭',
  inaturalist: '🌿',
  gbif:        '🌐',
  nps:         '🏛️',
  static:      '📋',
  estimated:   '📊',
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

    // locations changed (e.g. the async NPS units just loaded, growing the list
    // well past the icon snapshot captured at mount) — refresh the icon map so
    // every current id resolves to a real icon. Effect 2 then applies the
    // zoom-tier visuals. The `?? createPinIcon(...)` is a belt-and-suspenders
    // guard so a marker can never be created with an undefined icon (Leaflet
    // throws on createIcon of undefined).
    iconsRef.current = icons;

    const newMarkers = {};
    locations.forEach(loc => {
      // Leaflet gives every interactive marker role="button" and tabindex="0"
      // but NO accessible name, so a screen reader announced "button" 65 times
      // with nothing to tell the parks apart. `title` supplies the name (and
      // the native tooltip on desktop); `alt` covers image-icon rendering.
      const marker = L.marker([loc.lat, loc.lng], {
        icon: iconsRef.current[loc.id] ?? createPinIcon(loc.locationType, false, false, 3, npsEmojiOf(loc)),
        title: loc.name,
        alt: loc.name,
      });
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
      // NOTE: deliberately does NOT close the open popup. The popup is a
      // React panel keyed by openPopup.loc — independent of Leaflet markers —
      // so rebuilding markers (locations changing as NPS parks load async, or
      // filters change) can't orphan it. Calling onClose here previously
      // (a) closed the user's panel whenever park data updated, and
      // (b) raced the deep-link restore (/park/<id> & ?park=) closed instantly.
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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
    <div className="active-now-card" aria-live="polite" aria-atomic="true">
      <div className="active-now-card__kicker">Happening in {MONTH_LABELS[month]}</div>
      <div className={`active-now-card__msg${faded ? ' active-now-card__msg--out' : ''}`}>
        {msgs[idx]}
      </div>
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
function SpeciesSearch({ suggestions, query, onChange, onSelect, onClear, hasFilter, categoryActive, categoryLabel }) {
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

  const placeholder = categoryActive
    ? `Browse ${categoryLabel?.toLowerCase() ?? 'species'} or search by name…`
    : 'Find parks with… (e.g., Bald Eagle)';

  return (
    <div className="sp-search" ref={containerRef}>
      <div className="sp-search__bar">
        <span className="sp-search__icon" aria-hidden="true">🔍</span>
        <input
          className="sp-search__input"
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={e => { onChange(e.target.value); setShowDropdown(true); setActiveIdx(-1); }}
          onFocus={() => { if (query.trim().length >= 2 || categoryActive) setShowDropdown(true); }}
          onClick={() => { if (query.trim().length >= 2 || categoryActive) setShowDropdown(true); }}
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
          {categoryActive && query.trim().length < 2 && (
            <li className="sp-search__kicker" aria-hidden="true">
              Top {categoryLabel?.toLowerCase() ?? 'species'} — click to filter parks
            </li>
          )}
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
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#15833f',background:'#15833f22',borderColor:'#15833f55'}}>Guaranteed</span> <span className="about-rarity-pct">90%+</span> Almost certain to see</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#2e7d32',background:'#3e9e5222',borderColor:'#3e9e5255'}}>Very Likely</span> <span className="about-rarity-pct">60-90%</span> Probably will see</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#8a6914',background:'#c4942022',borderColor:'#c4942055'}}>Likely</span> <span className="about-rarity-pct">30-60%</span> Good chance</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#a3550f',background:'#d27a2e22',borderColor:'#d27a2e55'}}>Unlikely</span> <span className="about-rarity-pct">10-30%</span> Possible with luck</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#c24640',background:'#c2464022',borderColor:'#c2464055'}}>Rare</span> <span className="about-rarity-pct">2-10%</span> Lucky sighting</div>
                <div className="about-rarity-item"><span className="about-badge" style={{color:'#9c4b8a',background:'#9c4b8a22',borderColor:'#9c4b8a55'}}>Exceptional</span> <span className="about-rarity-pct">&lt;2%</span> Once in a lifetime</div>
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
            <p>No accounts, no ads, no tracking — <a className="guide-link" href="/privacy" target="_blank" rel="noopener noreferrer">read the privacy policy</a>.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── How-to-use guide ───────────────────────────────────────────────────────
// Action-first quick start: the high-value moves most visitors never discover
// (species search, near-me, filters, life list, trails) + how to read the
// likelihood bar. Reuses the about-modal shell; also prerendered at /guide.
const GUIDE_TIPS = [
  ['🔎', 'Search any animal', 'Type a species — “Bald Eagle”, “Black Bear”, “Monarch” — in the search bar to find every park where it’s been seen. The fastest way to chase a specific creature.'],
  ['📍', 'Find parks near you', 'Tap “Near me” for the closest national parks, state parks, and refuges, sorted by distance — including what’s rare in the area right now.'],
  ['🎚️', 'Filter for your trip', 'Open a park and set the season + likelihood filters to answer “what will I actually see in July?” Sort by Most Iconic, or by how likely each species is.'],
  ['✅', 'Keep a life list', 'Tap “+ Mark seen” on any animal to build your personal life list — it remembers everything you’ve spotted across every park.'],
  ['🥾', 'Plan the visit', 'Every park has Directions and Trails buttons, plus an opt-in photo of what it actually looks like.'],
];
function GuideModal({ onClose, onAbout }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="about-modal" role="dialog" aria-modal="true" aria-label="How to use US Wildlife Explorer">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="about-modal__body">
          <div className="about-modal__hero">
            <span className="about-modal__hero-icon">✨</span>
            <h2 className="about-modal__hero-title">Get the most out of it</h2>
            <p className="about-modal__hero-sub">Five quick ways to find the wildlife you’re after</p>
          </div>

          <ol className="guide-tips">
            {GUIDE_TIPS.map(([emoji, title, body], i) => (
              <li key={i} className="guide-tip">
                <span className="guide-tip__emoji" aria-hidden="true">{emoji}</span>
                <div>
                  <h3 className="guide-tip__title">{title}</h3>
                  <p className="guide-tip__body">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="about-section">
            <h3 className="about-section__title">How to read the likelihood bar</h3>
            <div className="about-section__body">
              <p>Each species shows how likely you are to encounter it — <strong>Guaranteed → Very Likely → Likely → Unlikely → Rare</strong> — based on real eBird and iNaturalist sightings, adjusted for the park.</p>
              <p>A <strong>“County-level” note</strong> means sightings right at that spot were sparse, so we show the wildlife documented in the surrounding county — the species you can reasonably expect in the area.</p>
            </div>
          </section>

          <div className="about-modal__footer">
            <p>Want the methodology behind the numbers?{' '}
              {onAbout && <button type="button" className="guide-link" onClick={() => { onClose(); onAbout('methodology'); }}>Read how we calculate it →</button>}
            </p>
            <p>Spotted something off? Use the 💬 Feedback button — your reports keep it accurate.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Support modal (☕) ──────────────────────────────────────────────────────
// Why the project needs support, the Buy Me a Coffee link, the Supporters wall
// (the 💚/🌟/🔗 membership perks), and the 📝 "What's new" changelog. Donations
// are deliberately the ONLY revenue: they're non-commercial, so the app stays
// inside the eBird / iNaturalist data terms — no ads, no paywall, no accounts.
function SupportModal({ onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Founding members first, then alphabetical.
  const wall = [...SUPPORTERS].sort((a, b) =>
    (b.founding ? 1 : 0) - (a.founding ? 1 : 0) || a.name.localeCompare(b.name)
  );
  const foundingLeft = Math.max(0, FOUNDING_LIMIT - wall.filter(s => s.founding).length);

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="about-modal" role="dialog" aria-modal="true" aria-label="Support US Wildlife Explorer">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="about-modal__body">
          <div className="about-modal__hero">
            <span className="about-modal__hero-icon">☕</span>
            <h2 className="about-modal__hero-title">Keep it free &amp; ad-free</h2>
            <p className="about-modal__hero-sub">US Wildlife Explorer is one person, no ads, no sign-up</p>
          </div>

          <section className="about-section">
            <div className="about-section__body">
              <p>Every park view pulls live data and map tiles, and those costs grow with every visitor. There's no paywall and no advertising here — <strong>donations are what keep it that way</strong>.</p>
              <p>If this helped you plan a hike, find a new park, or finally spot that bird, a coffee keeps it online for everyone.</p>
            </div>
            <a
              className="support-cta"
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('support_click')}
            >
              ☕ Buy me a coffee
            </a>
            <p className="support-cta__note">
              One-time, or $3/month membership — your name on the wall below, a Founding Supporter badge, and a say in what gets built next.
            </p>
          </section>

          <section className="about-section">
            <h3 className="about-section__title">💚 Supporters</h3>
            <div className="about-section__body">
              {wall.length === 0 ? (
                <p className="support-wall__empty">
                  No supporters yet — <strong>be the first</strong>, and you'll head up this wall as a Founding Supporter. 🌿
                </p>
              ) : (
                <>
                  <ul className="support-wall">
                    {wall.map((s, i) => (
                      <li key={i} className={`support-wall__item${s.founding ? ' support-wall__item--founding' : ''}`}>
                        {s.founding && <span className="support-wall__badge" title="Founding Supporter">🌟</span>}
                        {s.link
                          ? <a href={s.link} target="_blank" rel="noopener noreferrer nofollow">{s.name}</a>
                          : <span>{s.name}</span>}
                      </li>
                    ))}
                  </ul>
                  {foundingLeft > 0 && (
                    <p className="support-wall__note">
                      🌟 {foundingLeft} Founding Supporter {foundingLeft === 1 ? 'spot' : 'spots'} left.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="about-section">
            <h3 className="about-section__title">📝 What's new</h3>
            <div className="about-section__body">
              <ol className="changelog">
                {CHANGELOG.map((rel, i) => (
                  <li key={i} className="changelog__release">
                    <div className="changelog__head">
                      <h4 className="changelog__title">{rel.title}</h4>
                      <span className="changelog__date">{rel.date}</span>
                    </div>
                    <ul className="changelog__items">
                      {rel.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <div className="about-modal__footer">
            <p>Got an idea for what to build next? Use the 💬 Feedback button — supporters' suggestions go to the top of the list.</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── My Life List modal ─────────────────────────────────────────────────────
// The keepsake view: everything the visitor has personally logged, grouped
// by the park where they first saw it, with milestone rank + export/clear.
function LifeListModal({ onClose }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [, setTick] = useState(0);          // force re-read after import
  const [linkCopied, setLinkCopied] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const onRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const r = importLifeList(data);
      if (r) {
        track('lifelist_import', { via: 'file', added: r.imported });
        setRestoreMsg(`Restored — ${r.imported} new, ${r.total} total.`);
        setTick(t => t + 1);
      } else setRestoreMsg('Could not read that file.');
    } catch { setRestoreMsg('That file isn’t a valid life-list export.'); }
  };

  const onCopyLink = async () => {
    const tok = encodeShareToken();
    if (!tok) return;
    const link = `${window.location.origin}/#list=${encodeURIComponent(tok)}`;
    try {
      await navigator.clipboard.writeText(link);
      track('lifelist_share_link');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch { window.prompt('Copy your restore link:', link); }
  };

  const list = getLifeList();
  const ms = getMilestone(getSeenCount());
  const groups = {};
  for (const s of list) { (groups[s.firstParkName || 'Other'] ||= []).push(s); }

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="lifelist-modal" role="dialog" aria-modal="true" aria-label="My wildlife life list">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="lifelist-modal__body">
          <div className="lifelist-modal__hero">
            <span className="lifelist-modal__hero-icon" aria-hidden="true">🏅</span>
            <h2 className="lifelist-modal__hero-title">My Life List</h2>
            <p className="lifelist-modal__hero-sub">
              {ms.count === 0
                ? 'No sightings logged yet — tap “+ Mark seen” on any species to start your list.'
                : <>
                    <strong>{ms.count}</strong> species
                    {ms.current && <> · <strong>{ms.current.label}</strong></>}
                    {ms.next ? <> · {ms.toNext} to {ms.next.label}</> : <> · top rank reached 🎉</>}
                  </>}
            </p>
          </div>

          {list.length > 0 && (
            <div className="lifelist-modal__list">
              {Object.entries(groups).map(([park, items]) => (
                <div key={park} className="lifelist-modal__group">
                  <div className="lifelist-modal__group-title">{park} · {items.length}</div>
                  {items.map(s => (
                    <div key={s.key} className="lifelist-modal__item">
                      <span className="lifelist-modal__item-name">{s.name}</span>
                      {s.scientificName && (
                        <span className="lifelist-modal__item-sci">{s.scientificName}</span>
                      )}
                      <span className="lifelist-modal__item-date">
                        {(() => { try { return new Date(s.ts).toLocaleDateString(); } catch { return ''; } })()}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {restoreMsg && <p className="lifelist-modal__restoremsg">{restoreMsg}</p>}

          <div className="lifelist-modal__footer">
            <input ref={fileRef} type="file" accept="application/json,.json"
              style={{ display: 'none' }} onChange={onRestoreFile} />
            <button className="lifelist-modal__export"
              onClick={() => fileRef.current?.click()}>
              ↥ Restore from file
            </button>
            {list.length > 0 && (
              <>
                <button className="lifelist-modal__export"
                  onClick={() => { track('lifelist_export'); exportLifeList(); }}>
                  ↓ Export JSON
                </button>
                <button className="lifelist-modal__export"
                  onClick={() => {
                    track('lifelist_export_csv');
                    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
                    const rows = getLifeList().map(s => [
                      esc(s.name), esc(s.scientificName),
                      esc(s.firstParkName), esc((() => { try { return new Date(s.ts).toISOString().slice(0, 10); } catch { return ''; } })()),
                    ].join(','));
                    const csv = ['Species,Scientific name,First seen at,Date', ...rows].join('\r\n');
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                    a.download = 'wildlife-life-list.csv';
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}>
                  ↓ Export CSV
                </button>
                <button className="lifelist-modal__export" onClick={onCopyLink}>
                  {linkCopied ? '✓ Link copied' : '🔗 Copy restore link'}
                </button>
                {confirmClear ? (
                  <button className="lifelist-modal__clear is-confirm"
                    onClick={() => { clearAll(); onClose(); }}>
                    Tap again to erase all {ms.count}
                  </button>
                ) : (
                  <button className="lifelist-modal__clear"
                    onClick={() => setConfirmClear(true)}>
                    Clear list
                  </button>
                )}
              </>
            )}
          </div>
          {list.length > 0 && (
            <p className="lifelist-modal__hint">
              Your list lives only on this device. Export a file or copy a
              restore link to back it up or move it to another device.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ── Accessible park browser ────────────────────────────────────────────────
// The map markers (Leaflet) are not keyboard-focusable, so without this a
// keyboard / screen-reader user cannot open ANY park — the core function of
// the site (WCAG 2.1.1). This dialog lists every park as a real button with
// a type-ahead filter; picking one opens the same panel a marker click does.
// `preserveOrder` keeps the caller's ranking (the species search sorts by odds
// and distance); without it the list is alphabetical, which is what the plain
// park browsers want.
// How many rows to put in the DOM at once. A species search can match 3,496
// state parks, and rendering them all cost 18,008 DOM nodes on a phone —
// for a list where the first fifty rows were identical ("100%") and nobody
// scrolls that far. Filtering still runs over the WHOLE list; only the
// rendered slice is capped.
const PARKLIST_PAGE = 200;

function ParkListModal({ parks, onPick, onClose, title = 'Browse parks', subtitle = null, ariaLabel = 'Browse national parks', preserveOrder = false, onUseLocation = null }) {
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PARKLIST_PAGE);
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const sorted = preserveOrder ? parks : [...parks].sort((a, b) => a.name.localeCompare(b.name));
  const needle = q.trim().toLowerCase();
  const list = needle
    ? sorted.filter(p =>
        p.name.toLowerCase().includes(needle) ||
        String(p.state ?? '').toLowerCase().includes(needle))
    : sorted;
  // A new query means a new list — start it from the top again, or the user
  // sees page 18 of results they never asked for.
  useEffect(() => { setShown(PARKLIST_PAGE); }, [needle]);
  const visible = list.slice(0, shown);
  const remaining = list.length - visible.length;

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="parklist-modal" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="parklist-modal__head">
          <h2 className="parklist-modal__title">{title}</h2>
          {subtitle && <p className="parklist-modal__subtitle">{subtitle}</p>}
          {/* Without a coordinate this list falls back to registry order, so a
              species reported everywhere (bald eagle: 3,496 parks, the first
              fifty all at 100%) opens on Alaska for a user in Ohio. The hint
              used to be passive text telling them to go find the Near me
              button; make it the button. */}
          {onUseLocation && parks.length > PARKLIST_PAGE && (
            <button className="parklist-modal__locate" onClick={onUseLocation}>
              📍 Sort by distance from me
            </button>
          )}
          <input
            ref={inputRef}
            type="search"
            className="parklist-modal__search"
            placeholder="Filter by park or state…"
            value={q}
            onChange={e => setQ(e.target.value)}
            aria-label="Filter parks by name or state"
          />
        </div>
        <ul className="parklist-modal__list" aria-label="National parks">
          {visible.map(p => {
            const tier = p.rarity ? SPECTRUM_CONFIG.find(c => c.key === p.rarity) : null;
            return (
              <li key={p.id}>
                <button className="parklist-modal__item" onClick={() => onPick(p)}>
                  <span className="parklist-modal__item-name">{p.name}</span>
                  {tier && typeof p.freq === 'number' && (
                    // Deliberately NOT the tier word. "Guaranteed" means "at this
                    // park" everywhere else in the app, but this figure is the
                    // park's COUNTY reporting rate — one number shared by every
                    // park in the county (Mat-Su Borough alone has 11). Showing
                    // the rate itself keeps it comparable without promising
                    // something the county data cannot support.
                    <span
                      className="parklist-modal__item-odds"
                      style={{ color: tier.color, borderColor: `${tier.color}66`, background: `${tier.color}18` }}
                      title={`Reported on ${Math.round(p.freq * 100)}% of eBird checklists in this park's county`}
                    >
                      {Math.round(p.freq * 100)}%
                    </span>
                  )}
                  {typeof p.miles === 'number' && (
                    <span className="parklist-modal__item-miles">{Math.round(p.miles)} mi</span>
                  )}
                  {p.state && <span className="parklist-modal__item-state">{p.state}</span>}
                </button>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="parklist-modal__empty">No parks match “{q}”.</li>
          )}
          {remaining > 0 && (
            <li className="parklist-modal__more-row">
              <button
                className="parklist-modal__more"
                onClick={() => setShown(n => n + PARKLIST_PAGE)}
              >
                Show {Math.min(remaining, PARKLIST_PAGE)} more
                <span className="parklist-modal__more-count">
                  {visible.length} of {list.length}
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

// ── State-park panel ───────────────────────────────────────────────────────
// State parks have NO bundled species cache and NO NPS Species API. This
// panel fetches species LIVE from iNaturalist (community observations) for
// the park's lat/lng/radius via the existing /api/inat-proxy. Rough rarity
// tier is derived from observation count within the radius (less precise
// than the calibrated national-park model — banner makes that explicit).
//
// Reuses the seenList engine so the user's life list spans both park
// types automatically.
// Fallback emoji (no photo) keyed by iNaturalist iconic taxon.
const STATE_ICONIC_EMOJI = {
  Aves: '🐦', Mammalia: '🦌', Reptilia: '🦎', Amphibia: '🐸',
  Actinopterygii: '🐟', Insecta: '🦋', Arachnida: '🕷️', Mollusca: '🐌',
  Animalia: '🐾',
};

// iNat iconic taxon → UI category group.
const STATE_GROUP_OF = (ic) => ({
  Aves: 'birds', Mammalia: 'mammals', Reptilia: 'reptiles', Amphibia: 'amphibians',
  Actinopterygii: 'fish', Insecta: 'insects', Arachnida: 'insects', Mollusca: 'other',
}[ic] || 'other');
const STATE_GROUP_META = {
  birds: { label: 'Birds', emoji: '🐦' }, mammals: { label: 'Mammals', emoji: '🦌' },
  reptiles: { label: 'Reptiles', emoji: '🦎' }, amphibians: { label: 'Amphibians', emoji: '🐸' },
  fish: { label: 'Fish', emoji: '🐟' }, insects: { label: 'Insects', emoji: '🦋' },
  other: { label: 'Other', emoji: '🐾' },
};
const STATE_GROUP_ORDER = ['birds', 'mammals', 'reptiles', 'amphibians', 'fish', 'insects', 'other'];
// Map our category group → the app's animalType, so the SAME name-based
// subtype classifier the national parks use (raptor / songbird / …) works
// on state-park species too.
const STATE_GROUP_TO_TYPE = {
  birds: 'bird', mammals: 'mammal', reptiles: 'reptile',
  amphibians: 'amphibian', fish: 'fish', insects: 'insect', other: null,
};

function StateParkPanel({ park, onClose, openAbout, onSwitchPark }) {
  const [state, setState] = useState({ status: 'loading', species: [], total: 0, sources: [], stats: null });
  // Hero photo — state parks have no NPS image source, so use the park's
  // Wikipedia/Commons image ({ src, credit }; cached; null when none — the
  // header simply renders without a hero). The credit link satisfies the
  // CC-BY/CC-BY-SA attribution requirement for Wikimedia images.
  const [wikiHero, setWikiHero] = useState(null);
  const [showHero, toggleHero] = useHeroPreference();
  useEffect(() => {
    let alive = true;
    setWikiHero(null);
    fetchWikiParkImage(park.name, park.lat, park.lng, park.id).then(img => { if (alive) setWikiHero(img); });
    return () => { alive = false; };
  }, [park.id]);
  const [seenVersion, setSeenVersion] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(40);
  // Multi-select animal-type filter, identical to national parks: defaults to
  // birds/mammals/reptiles/amphibians/marine (insects opt-in). Clicking a tab
  // focuses just that type (enabling its subtype bar); "All" re-selects every
  // type present in the data.
  const [activeTypes, setActiveTypes] = useState(() => new Set(DEFAULT_ACTIVE_TYPES));
  const [subtypeFilter, setSubtypeFilter] = useState('all'); // e.g. raptor (Birds of Prey)
  const [sortBy, setSortBy]         = useState('iconic-first'); // iconic-first | common-first | rarest-first | a-z
  const [season, setSeason]         = useState(currentSeasonKey); // default to current season, like national parks
  const [query, setQuery]           = useState('');
  const [seenFilter, setSeenFilter] = useState('all');      // all | unseen | seen
  const [rarityFilter, setRarityFilter] = useState('all');  // spectrum bar / rarity dropdown
  // Phones collapse .lp__controls via CSS (≤768px) — without this toggle the
  // sort/season/search controls were simply unreachable on mobile.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Per-point search radius (km): the park's own radiusKm, floored at 3 km so
  // even tiny/urban parks (Liberty, Barnegat Lighthouse) don't inherit a whole
  // city's species, capped at 20 km. For multi-point parks (large forests,
  // linear canals) this is the radius around EACH sample point — coverage
  // comes from the points, so the per-point radius stays tight.
  const searchRadiusKm = Math.min(Math.max(park.radiusKm ?? 5, 3), 20);
  // iNaturalist non-bird taxa (mammals, reptiles, amphibians) are FAR more
  // sparsely sampled than birds and range more widely, so a tight radius
  // returns almost none — a park looks "birds only" purely as a sampling
  // artifact. Give iNat a wider net (≥15 km, ≤25 km) so those species actually
  // surface, while birds stay park-tight on the dense eBird data. Research-grade
  // filtering still guards against misidentified species, so completeness rises
  // without accuracy loss. The fetch also retries at the 25 km cap if a taxon
  // still comes back empty, so even isolated parks surface vertebrates.
  const inatRadiusKm = Math.min(Math.max(park.radiusKm ?? 8, 15), 25);
  // Sample points: most parks use their single center; large/linear parks
  // (see stateParksNJ.js `points`) sample several spots so one off-centre
  // point can't misrepresent a 100k-acre forest or a 70 km linear canal.
  const samplePoints = useMemo(
    () => (Array.isArray(park.points) && park.points.length ? park.points : [[park.lat, park.lng]]),
    [park.points, park.lat, park.lng],
  );
  // Per-species iNat seasonal histograms + park-wide observer-effort baseline —
  // the SAME ancillary inputs national parks fetch (fetchInatMonthlyHist /
  // fetchInatParkMonthlyEffort). Feeding these into the identical
  // computeEffectiveRarity / AnimalCard turns the flat season chips into real
  // per-season encounter probabilities and makes rarity season-aware — without
  // touching any national-park code (purely additive, location-based).
  const [seasonalFreqs, setSeasonalFreqs] = useState({});
  const [parkEffort, setParkEffort] = useState(null);
  const freqFetchedRef = useRef(new Set());
  useEffect(() => {
    setDisplayLimit(24); setActiveTypes(new Set(DEFAULT_ACTIVE_TYPES)); setSubtypeFilter('all'); setQuery(''); setSeenFilter('all'); setSortBy('iconic-first'); setSeason(currentSeasonKey()); setRarityFilter('all');
    freqFetchedRef.current = new Set(); setSeasonalFreqs({}); setParkEffort(null);
  }, [park.id]);
  // Fire-and-forget park-wide effort baseline (90-day cached, once per park).
  useEffect(() => {
    let alive = true;
    fetchInatParkMonthlyEffort(park.lat, park.lng, park.id).then(eff => { if (alive) setParkEffort(eff); });
    return () => { alive = false; };
  }, [park.id, park.lat, park.lng]);
  // focusedType = the single selected type (drives the subtype bar); null when
  // multiple types are active.
  const focusedType = activeTypes.size === 1 ? [...activeTypes][0] : null;
  useEffect(() => { setSubtypeFilter('all'); setRarityFilter('all'); }, [focusedType]); // reset subtype + rarity when focus changes
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Derive species + rarity the SAME way national parks do: eBird checklist
  // frequency (birds) + iNaturalist density (other taxa), via the shared
  // apiService engine. The resulting animals carry .frequency + .animalType,
  // so computeEffectiveRarity (the calibrated model) and AnimalCard work
  // identically — no offline cache, all runtime.
  const SP_TAXA = ['bird', 'mammal', 'reptile', 'amphibian', 'insect', 'marine'];
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading', species: [], total: 0, sources: [], stats: null });
    (async () => {
      try {
        const birdDist = searchRadiusKm;       // tight — dense eBird data
        const inatRadius = inatRadiusKm;        // wider — sparse non-bird taxa
        const pool = [];
        const sources = [];
        let ebirdChecklists = null, ebirdHistoricalSpecies = 0, inatObservations = 0;

        // Run up to `conc` async tasks at a time (gentle on the APIs).
        const runQueue = (tasks, conc = 2) => new Promise(resolve => {
          let i = 0, running = 0, done = 0;
          if (!tasks.length) return resolve();
          const next = () => {
            while (running < conc && i < tasks.length) {
              const task = tasks[i++]; running++;
              task().finally(() => { running--; if (++done === tasks.length) resolve(); else next(); });
            }
          };
          next();
        });

        // ── eBird birds: per sample point (radius). eBird has no boundary
        //    query, so multi-point sampling stays the way large/linear parks
        //    get full coverage. ──
        const fetchEbirdAt = async ([lat, lng], idx) => {
          const pointId = samplePoints.length > 1 ? `${park.id}-p${idx}` : park.id;
          const hotspot = await fetchEbirdHotspot(lat, lng);
          const eb = await fetchEbird(lat, lng, pointId, hotspot, { dist: birdDist });
          if (eb?.animals?.length) {
            pool.push(...eb.animals);
            if (!sources.includes('ebird')) sources.push('ebird');
            ebirdHistoricalSpecies = Math.max(ebirdHistoricalSpecies, eb._stats?.historicalSpeciesCount ?? 0);
          }
        };
        for (let i = 0; i < samplePoints.length; i++) {
          if (!alive) return;
          await fetchEbirdAt(samplePoints[i], i);
        }
        if (!alive) return;

        // Dedupe + re-rate birds with eBird county-level peak-season checklist
        // frequency (build-time cache, scripts/buildStateParkBirdFreqNJ.js) —
        // the gold-standard signal national parks use, far better than the
        // geo/recent recency proxy. Only re-rates birds ALREADY in the list
        // (keeps the species set park-specific); birds absent from the cache
        // keep their existing rarity (graceful — e.g. Salem-county parks).
        // Factored into finalize() so we can emit birds first, then the full set.
        const birdFreqMod = await loadStateBirdFreq(park.id.slice(0, 2));
        if (!alive) return;
        // County for both floors. PARK_COUNTY_EXTRA is the hand-curated AUTHORITY
        // (it overrides PARK_COUNTY — e.g. Border Field, whose auto point-in-polygon
        // landed in a Mexican municipio, is corrected to San Diego here); fall back
        // to PARK_COUNTY (from the bird build) otherwise.
        const _spCounty = PARK_COUNTY_EXTRA[park.id] ?? birdFreqMod?.PARK_COUNTY?.[park.id] ?? null;
        const countyFreq = (birdFreqMod && _spCounty)
          ? (birdFreqMod.COUNTY_BIRD_FREQ[_spCounty] ?? null)
          : null;
        const finalize = () => {
          // Drop clear out-of-range live-API artifacts (state-aware: keeps Dall
          // sheep at AK parks, monk seals at HI parks; blocks polar bears etc.).
          const animals = filterGeographicOutliers(deduplicateAnimals(pool), park.id);
          if (countyFreq) {
            for (const a of animals) {
              if (a.animalType !== 'bird' || !a.name) continue;
              const e = countyFreq[a.name.toLowerCase()];
              if (!e) continue;
              a.frequency = e.f;
              a.rarity = rarityFromChecklist(e.f);
              a.seasons = e.s;        // real per-species seasonality (migrants ≠ year-round)
              a._raritySource = 'ebird_county_freq';
            }
          }
          return animals;
        };

        // ── Phase 1: render birds (eBird) immediately so the panel populates
        //    fast, while the slower iNat non-bird taxa stream in below. ──
        const birds = finalize();
        if (alive && birds.length) {
          setState({
            status: 'ok', species: birds, total: birds.length, sources: [...sources],
            stats: { ebirdChecklists, ebirdHistoricalSpecies: ebirdHistoricalSpecies || null, inatObservations },
            partial: true,
          });
        }

        // ── Phase 2: iNaturalist. Boundary query (place_id) when the park has a
        //    verified iNat polygon — ONE query per taxon counts species INSIDE
        //    the park; parks without one use the radius path (per-point +
        //    adaptive widen for sparse non-bird taxa). ──
        const placeId = INAT_PLACE_IDS[park.id] ?? null;
        const takeInat = (r) => {
          if (r?.animals?.length) { pool.push(...r.animals); if (!sources.includes('inaturalist')) sources.push('inaturalist'); }
          inatObservations += r?._stats?.totalObsCount ?? 0;
        };
        if (placeId) {
          await runQueue(SP_TAXA.map(taxon => async () => {
            try { takeInat(await fetchINat(park.lat, park.lng, park.id, taxon, { placeId })); }
            catch { /* non-fatal */ }
          }), 2);
        } else {
          for (let idx = 0; idx < samplePoints.length; idx++) {
            if (!alive) return;
            const [lat, lng] = samplePoints[idx];
            const pointId = samplePoints.length > 1 ? `${park.id}-p${idx}` : park.id;
            await runQueue(SP_TAXA.map(taxon => async () => {
              const taxonRadius = taxon === 'bird' ? birdDist : inatRadius;
              try {
                let r = await fetchINat(lat, lng, pointId, taxon, { radius: taxonRadius, days: 0 });
                // Widen to the 25 km cap only on a genuine empty (not a 503).
                if (taxon !== 'bird' && r && r.animals.length === 0 && taxonRadius < 25) {
                  const wide = await fetchINat(lat, lng, `${pointId}-wide`, taxon, { radius: 25, days: 0 });
                  if (wide) r = wide;
                }
                takeInat(r);
              } catch { /* non-fatal — other taxa still load */ }
            }), 2);
          }
        }

        if (!alive) return;
        let animals = finalize();
        let countySeeded = false;
        // Seed the county bird list when the LIVE bird list is thin — not only
        // when the whole panel is empty. eBird can fail/return sparse while the
        // non-bird floor (below) still fills `animals`, which previously blocked
        // birds entirely (the "park shows reptiles but no birds" bug). Merge the
        // county birds the live list missed, so the bird side is comprehensive.
        {
          const liveBirdNames = new Set(
            animals.filter(a => a.animalType === 'bird' && a.name).map(a => a.name.toLowerCase()));
          if (liveBirdNames.size < 40) {
            if (countyFreq) {
              const seededBirds = Object.entries(countyFreq)
                .filter(([n]) => !n.startsWith('__') && !liveBirdNames.has(n))
                .sort((a, b) => (b[1].f ?? 0) - (a[1].f ?? 0))
                .slice(0, 80)
                .map(([n, e]) => ({
                  name: n.replace(/(^|[\s-])\w/g, c => c.toUpperCase()),
                  animalType: 'bird', frequency: e.f, rarity: rarityFromChecklist(e.f),
                  seasons: e.s, _raritySource: 'ebird_county_freq', _countySeeded: true,
                }));
              if (seededBirds.length) {
                animals = [...animals, ...seededBirds];
                countySeeded = true;
                if (!sources.includes('ebird')) sources.push('ebird');
              }
            } else if (_spCounty) {
              // No frequency floor for this county — fall back to eBird's county
              // species LIST (presence only, flat rarity) so the park shows its
              // real bird list instead of collapsing to ~1 species.
              const _cbl = await loadCountyBirdList(park.id.slice(0, 2));
              const _list = _cbl?.[_spCounty] ?? null;
              if (alive && _list?.length) {
                const seededBirds = _list
                  .filter(n => !liveBirdNames.has(n.toLowerCase()))
                  .map(n => ({
                    name: n, animalType: 'bird', frequency: 0.2, rarity: 'unlikely',
                    seasons: ['spring', 'summer', 'fall', 'winter'],
                    _raritySource: 'ebird_county_list', _countySeeded: true,
                  }));
                if (seededBirds.length) {
                  animals = [...animals, ...seededBirds];
                  countySeeded = true;
                  if (!sources.includes('ebird')) sources.push('ebird');
                }
              }
            }
          }
        }

        // ── Non-bird county floor (mammals/reptiles/amphibians/fish/insects) ──
        // Seed each group from the county's iNaturalist list when the live data
        // for it is thin, so a sparse state park still shows the animals
        // documented in its county (e.g. gators at a quiet Florida park).
        try {
          const _nbAll = _spCounty ? await loadCountyNonbird(park.id.slice(0, 2)) : null;
          const _nb = _nbAll?.[_spCounty] ?? null;
          if (alive && _nb) {
            const liveByGroup = {}; const liveNames = new Set();
            for (const a of animals) {
              if (a.animalType === 'bird' || !a.name) continue;
              liveByGroup[a.animalType] = (liveByGroup[a.animalType] ?? 0) + 1;
              liveNames.add(a.name.toLowerCase());
            }
            for (const [group, list] of Object.entries(_nb)) {
              if ((liveByGroup[group] ?? 0) >= (NONBIRD_THIN[group] ?? 12)) continue;
              for (const [name, f] of list) {
                if (liveNames.has(name.toLowerCase())) continue;
                animals.push({
                  name, animalType: group, emoji: NONBIRD_EMOJI[group] ?? '🐾',
                  frequency: f, rarity: rarityFromInatAbundance(f),
                  seasons: nonbirdSeasons(group, park.lat),
                  _raritySource: 'inat_county_freq', _countySeeded: true,
                });
                countySeeded = true;
              }
            }
          }
        } catch { /* non-fatal — non-bird floor is best-effort */ }

        const stats = { ebirdChecklists, ebirdHistoricalSpecies: ebirdHistoricalSpecies || null, inatObservations };
        setState({ status: animals.length ? 'ok' : 'empty', species: animals, total: animals.length, sources, stats, partial: false, countySeeded });
      } catch {
        if (alive) setState({ status: 'error', species: [], total: 0, sources: [], stats: null });
      }
    })();
    return () => { alive = false; };
  }, [park.id, park.lat, park.lng, park.radiusKm, samplePoints]);

  const spLocation = useMemo(() => ({ id: park.id, name: park.name, lat: park.lat, lng: park.lng }), [park.id, park.name, park.lat, park.lng]);

  // Enrich each live species EXACTLY as national parks do (App's `enriched`):
  // apply the county→park correction factor, cap live-only (non-curated)
  // species at `rare` (only hand-curated entries can be Exceptional), apply
  // any rarity override, and clamp frequency to the resulting tier's ceiling.
  // Without this, computeEffectiveRarity reads the raw iNat frequency proxy and
  // mislabels hundreds of one-off sightings as "Exceptional" — national parks
  // never show that for live-only species. This makes the rarity derivation
  // identical and keeps the spectrum, sort, and card badges in agreement.
  const enrichedSpecies = useMemo(() => {
    const clampFreq = (freq, rarity) => {
      if (freq == null || rarity == null) return freq;
      const ceiling = TIER_CEILING[rarity];
      return ceiling != null ? Math.min(freq, ceiling) : freq;
    };
    return state.species.map(a => {
      const factor = getCorrectionFactor(a.name);
      if (a.frequency != null && factor !== 1) {
        const correctedFreq = Math.min(1, a.frequency * factor);
        let ebirdRarity = rarityFromChecklist(correctedFreq);
        if (!a._curated && ebirdRarity === 'exceptional') ebirdRarity = 'rare';
        const computedRarity = applyRarityOverride(park.id, a.name, ebirdRarity);
        return { ...a, rarity: computedRarity, frequency: clampFreq(correctedFreq, computedRarity) };
      }
      const baseRarity = (!a._curated && a.rarity === 'exceptional') ? 'rare' : a.rarity;
      const overridden = applyRarityOverride(park.id, a.name, baseRarity);
      const clamped = clampFreq(a.frequency, overridden);
      return { ...a, rarity: overridden, ...(clamped !== a.frequency ? { frequency: clamped } : {}) };
    });
  }, [state.species, park.id]);

  // Active season for rarity (null when "All Seasons" selected).
  const activeSeasonForRarity = season === 'all' ? null : season;

  // Cross-visitor sighting aggregates for this park (api/sightings). Fetched
  // once per park open; empty + no-op until the datastore is connected.
  const [community, setCommunity] = useState({ buckets: {}, configured: false });
  useEffect(() => {
    let alive = true;
    setCommunity({ buckets: {}, configured: false });
    fetchParkSightings(park.id).then(r => { if (alive) setCommunity(r); });
    return () => { alive = false; };
  }, [park.id]);
  // Optimistic local bump so a card's "N of M" updates instantly on vote.
  const bumpCommunity = useCallback((species, season, verdict) => {
    setCommunity(prev => {
      const bk = sightingsBucketKey(species, season);
      const cur = prev.buckets[bk] ?? { seen: 0, missed: 0 };
      return { ...prev, buckets: { ...prev.buckets, [bk]: { ...cur, [verdict]: (cur[verdict] ?? 0) + 1 } } };
    });
  }, []);
  const communityFor = useCallback((species) => {
    const b = community.buckets[sightingsBucketKey(species, activeSeasonForRarity ?? 'any')];
    if (!b) return null;
    const n = (b.seen ?? 0) + (b.missed ?? 0);
    return n > 0 ? { seen: b.seen ?? 0, n } : null;
  }, [community, activeSeasonForRarity]);

  // Effective rarity per (enriched) animal — the SAME function + inputs national
  // parks use: season-aware, using the live iNat seasonal histograms
  // (seasonalFreqs) effort-corrected by parkEffort, then the conservative
  // community nudge. Drives the spectrum, sort, and rarity-dropdown filter so
  // they all agree with the (also-nudged) card pills.
  const effRarity = useMemo(() => {
    const m = new Map();
    for (const a of enrichedSpecies) {
      const base = computeEffectiveRarity(a, {
        activeSeason: activeSeasonForRarity, activeZone: null, seasonalFreqs,
        parkEffort, parkZones: null, effortRescaler: 1, visitTime: 'any',
      });
      m.set(a, nudgeRarityWithCommunity(base, communityFor(a.name)));
    }
    return m;
  }, [enrichedSpecies, activeSeasonForRarity, seasonalFreqs, parkEffort, communityFor]);

  // Lazy-fetch iNat seasonal histograms for the most-likely species first
  // (same throttle/ordering as national parks). Each result streams into
  // seasonalFreqs, which re-derives rarity + season chips for that species.
  useEffect(() => {
    if (!enrichedSpecies?.length) return;
    const withSci = enrichedSpecies.filter(a => a.scientificName);
    const sorted = [...withSci].sort((a, b) =>
      (Math.max(b.frequency ?? 0, RARITY_FREQ_FALLBACK[b.rarity] ?? 0)) -
      (Math.max(a.frequency ?? 0, RARITY_FREQ_FALLBACK[a.rarity] ?? 0)));
    const queue = sorted.slice(0, 300).filter(b => !freqFetchedRef.current.has(b.scientificName.toLowerCase()));
    if (!queue.length) return;
    let alive = true, cursor = 0;
    const worker = async () => {
      while (alive) {
        const idx = cursor++;
        if (idx >= queue.length) return;
        const sp = queue[idx];
        const key = sp.scientificName.toLowerCase();
        if (freqFetchedRef.current.has(key)) continue;
        freqFetchedRef.current.add(key);
        const result = await fetchInatMonthlyHist(park.lat, park.lng, park.id, sp.scientificName);
        if (!alive) return;
        setSeasonalFreqs(prev => ({ ...prev, [key]: result }));
      }
    };
    Promise.all(Array.from({ length: 6 }, worker));
    return () => { alive = false; };
  }, [enrichedSpecies, park.id, park.lat, park.lng]);

  const seenKeys = useMemo(() => getSeenKeySet(), [seenVersion]);
  const spProgress = useMemo(() => parkProgress(enrichedSpecies), [enrichedSpecies, seenVersion]);
  const onToggleSeen = (s) => {
    const added = !seenKeys.has(speciesKey(s));
    toggleSeen(s, { parkId: park.id, parkName: park.name });
    setSeenVersion(v => v + 1);
    track('seen_toggle', { added, animal: s.name, park: park.name });
  };

  // Season-filtered pool (mirrors national parks' seasonFiltered) — applies
  // ONLY the season filter, so tab/breakdown counts are season-aware. Live
  // eBird/iNat species carry year-round seasons, so this rarely narrows, but
  // the control + behaviour match national parks exactly.
  const seasonSpecies = useMemo(() => {
    if (season === 'all') return enrichedSpecies;
    return enrichedSpecies.filter(s => {
      const segs = s.seasons ?? [];
      return segs.includes('year-round') || segs.includes('year_round') || segs.includes(season);
    });
  }, [enrichedSpecies, season]);

  // Category tab counts by the app's native animalType (same as national parks).
  const typeCounts = useMemo(() => {
    const m = {};
    for (const s of seasonSpecies) { const t = s.animalType || 'other'; m[t] = (m[t] || 0) + 1; }
    return m;
  }, [seasonSpecies]);

  // Type breakdown row (🐦 184 chips) — same order/markup as national parks.
  const typeBreakdown = useMemo(() => {
    const m = {};
    for (const s of seasonSpecies) { const t = s.animalType; if (t) m[t] = (m[t] || 0) + 1; }
    return m;
  }, [seasonSpecies]);

  // All animal-type keys actually present in this park's data — drives the
  // tab list and the "All" selection target.
  const presentTypeKeys = useMemo(
    () => ['bird', 'mammal', 'reptile', 'amphibian', 'insect', 'marine', 'fish', 'other'].filter(t => typeCounts[t]),
    [typeCounts],
  );
  const allTypesActive = presentTypeKeys.length > 0 && presentTypeKeys.every(t => activeTypes.has(t));

  // Subtype tabs (Birds of Prey, Songbirds, …) — only when exactly one type is
  // focused (same rule as national parks).
  const subtypeDefs = focusedType ? getSubtypeDefs(focusedType) : null;

  // Species after season + (multi-select) type + subtype filters — drives
  // spectrum + list. Mirrors national parks: filter to active types unless all
  // present types are selected.
  const inCategory = useMemo(() => {
    let list = allTypesActive ? seasonSpecies : seasonSpecies.filter(s => activeTypes.has(s.animalType));
    if (subtypeFilter !== 'all' && subtypeDefs) {
      list = list.filter(s => classifyAnimalSubtype(s) === subtypeFilter);
    }
    return list;
  }, [seasonSpecies, activeTypes, allTypesActive, subtypeFilter, subtypeDefs]);

  // Copies with `.rarity` set to the calibrated effective tier, so the SAME
  // RaritySpectrumBar national parks use renders the correct composition,
  // and so the spectrum click-to-filter highlights the right segment.
  const spectrumAnimals = useMemo(
    () => inCategory.map(s => ({ ...s, rarity: effRarity.get(s) || s.rarity })),
    [inCategory, effRarity],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = inCategory.filter(s => {
      if (q && !((s.name || '').toLowerCase().includes(q) || (s.scientificName || '').toLowerCase().includes(q))) return false;
      if (rarityFilter !== 'all' && effRarity.get(s) !== rarityFilter) return false;
      if (seenFilter !== 'all') {
        const seen = seenKeys.has(speciesKey(s));
        if (seenFilter === 'seen' ? !seen : seen) return false;
      }
      return true;
    });
    // Same four sort modes as national parks. For iconic, reuse the shared
    // iconicSortFn on copies whose `.rarity` is the calibrated effective tier
    // (state-park species have no curated funFact, so they sort by charisma +
    // rarity — exactly national parks' behaviour for live-only species).
    if (sortBy === 'a-z') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'iconic-first') {
      list = [...list]
        .map(s => ({ s, k: { ...s, rarity: effRarity.get(s) || s.rarity } }))
        .sort((a, b) => iconicSortFn(a.k, b.k))
        .map(x => x.s);
    } else {
      const dir = sortBy === 'common-first' ? 1 : -1; // rarest-first = -1
      list = [...list].sort((a, b) =>
        ((_RARITY_ORDER[effRarity.get(a)] ?? 5) - (_RARITY_ORDER[effRarity.get(b)] ?? 5)) * dir
        || (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [inCategory, query, seenFilter, seenKeys, sortBy, effRarity, rarityFilter]);

  // Same-state siblings, for the in-panel park switcher (jump to another park
  // without returning to the state map). Derived from the id prefix so it also
  // works on a direct deep-link landing.
  const stateInfo = STATE_PARK_STATES.find(s => park.id?.startsWith(s.code.toLowerCase() + '-'));
  const siblingParks = useMemo(
    () => (stateInfo ? (STATE_PARKS_BY_STATE[stateInfo.code] || []).slice().sort((a, b) => a.name.localeCompare(b.name)) : []),
    [stateInfo?.code],
  );

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="statepark-modal" role="dialog" aria-modal="true" aria-label={`Wildlife at ${park.name}`}>
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="statepark-modal__head">
          <ParkHero hero={wikiHero} parkId={park.id} parkName={park.name} showHero={showHero} onToggle={toggleHero}
                    onFlag={() => setWikiHero(null)} />
          <h2 className="statepark-modal__title">{park.name}</h2>
          {/* Meta row — state + park-type badge, mirroring national parks.
              State name is derived from the park id prefix (nj-/de-/…) so it's
              correct for every wired state, not hardcoded. */}
          <div className="lp__meta">
            <span className="lp__state">{stateInfo?.name ?? ''}</span>
            <span className="lp__park-badge" style={{ background: '#2f7d4f' }}>
              {(park.category?.replace('-', ' ') ?? 'state park').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            <a
              className="lp__share-btn lp__directions-btn"
              href={`https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`}
              target="_blank" rel="noopener noreferrer"
              aria-label={`Get directions to ${park.name}`}
              title="Open directions in your maps app"
            >
              🧭 Directions
            </a>
            <a
              className="lp__share-btn lp__directions-btn lp__trails-btn"
              href={trailsUrl(park.lat, park.lng)}
              target="_blank" rel="noopener noreferrer"
              aria-label={`See hiking trails at ${park.name}`}
              title="See hiking trails & routes (AllTrails)"
            >
              🥾 Trails
            </a>
          </div>
          {/* In-panel park switcher — jump to another park in the same state
              without closing back to the state map. */}
          {onSwitchPark && siblingParks.length > 1 && (
            <div className="statepark-modal__switch">
              <span className="statepark-modal__switch-label" aria-hidden="true">↔ Jump to another {stateInfo?.name ?? ''} park:</span>
              <select
                className="statepark-modal__switch-select"
                aria-label={`Jump to another park in ${stateInfo?.name ?? 'this state'}`}
                value={park.id}
                onChange={e => {
                  const next = siblingParks.find(p => p.id === e.target.value);
                  if (next && next.id !== park.id) onSwitchPark(next);
                }}
              >
                {siblingParks.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Data attribution line — same format as national parks. */}
          {state.status === 'ok' && state.species.length > 0 && (
            <div className="lp__source-attr"><span title="Live data">● Live · </span>{renderSourceAttr(state.sources)}</div>
          )}

          {state.status === 'ok' && state.species.length > 0 && (
            <>
              {/* Species type breakdown row (🐦 184 …) — same as national parks. */}
              {Object.keys(typeBreakdown).length > 0 && (
                <div className="lp__breakdown">
                  {Object.entries(ANIMAL_TYPES)
                    .filter(([k]) => k !== 'all' && typeBreakdown[k])
                    .map(([k, { emoji, label }]) => (
                      <span key={k} className="breakdown-chip" title={label}>{emoji} {typeBreakdown[k]}</span>
                    ))}
                  {season !== 'all' && (
                    <span className="breakdown-chip breakdown-chip--season" title="Active season filter">
                      {SEASONS[season]?.emoji ?? '📅'} {SEASONS[season]?.label ?? season}
                    </span>
                  )}
                </div>
              )}
              {/* API data note — eBird checklist + iNat observation + historical-spp counts. */}
              {state.stats && (state.stats.ebirdChecklists || state.stats.inatObservations > 0) && (
                <div className="lp__api-note">
                  📊{' '}
                  {[
                    state.stats.ebirdChecklists
                      ? `${state.stats.ebirdChecklists} eBird checklist${state.stats.ebirdChecklists !== 1 ? 's' : ''}`
                      : null,
                    state.stats.inatObservations
                      ? `${state.stats.inatObservations.toLocaleString()} iNat obs`
                      : null,
                  ].filter(Boolean).join(' · ')}
                  {state.stats.ebirdHistoricalSpecies
                    ? ` · ${state.stats.ebirdHistoricalSpecies} historical spp`
                    : null}
                </div>
              )}
              {/* Curated naturalist highlight (flagship parks only). */}
              {STATE_PARK_HIGHLIGHTS[park.id] && (
                <div className="statepark-modal__highlight" role="note">
                  <span className="statepark-modal__highlight-label">🌟 Park highlight</span>
                  <p className="statepark-modal__highlight-text">{STATE_PARK_HIGHLIGHTS[park.id]}</p>
                </div>
              )}
              {state.countySeeded ? (
                <div className="statepark-modal__banner" role="note">
                  <strong>Some entries are county-wide.</strong> Sightings logged at this exact
                  spot were thin, so the list is topped up with species documented in the
                  surrounding county (eBird + iNaturalist). Those carry a <code>~</code> on their
                  likelihood badge — the rest is recorded here.
                </div>
              ) : (
                <div className="statepark-modal__banner" role="note">
                  <strong>Live from eBird + iNaturalist.</strong> Rarity is derived the same
                  way as national parks{STATE_PARK_HIGHLIGHTS[park.id]
                    ? '.'
                    : '. State parks have no NPS curated species inventory, so that section isn’t shown.'}
                </div>
              )}

              {/* Rarity spectrum — the SAME component national parks use. */}
              <RaritySpectrumBar
                animals={spectrumAnimals}
                activeRarity={rarityFilter}
                onSelectRarity={setRarityFilter}
              />

              {/* Category tabs — multi-select, national-park behaviour: the
                  default preset highlights several types at once; clicking one
                  focuses it; "All" re-selects every present type. */}
              <div className="lp__tabs-wrapper">
                <div className="lp__tabs" role="tablist">
                  {presentTypeKeys.map(t => {
                    const isActive = activeTypes.has(t);
                    return (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={isActive}
                        className={`lp__tab${isActive ? ' lp__tab--active' : ''}`}
                        onClick={() => { setActiveTypes(new Set([t])); setDisplayLimit(24); track('state_park_filter', { group: t }); }}
                        title={`Show ${ANIMAL_TYPES[t]?.label ?? t}`}
                      >
                        <span aria-hidden="true">{ANIMAL_TYPES[t]?.emoji ?? '🐾'}</span>
                        <span className="lp__tab-label">{ANIMAL_TYPES[t]?.label ?? t}</span>
                        <span className="lp__tab-count">{typeCounts[t]}</span>
                      </button>
                    );
                  })}
                  {!allTypesActive && (
                    <button
                      className="lp__tab lp__tab--show-all"
                      onClick={() => { setActiveTypes(new Set(presentTypeKeys)); setDisplayLimit(24); }}
                      title="Show all animal types"
                    >
                      <span className="lp__tab-label">All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Subtype filter bar — national-park styling (.lp__subtype*). */}
              {subtypeDefs && (
                <div className="lp__subtypes-wrapper">
                  <div className="lp__subtypes" role="group" aria-label="Animal subcategory">
                    <button
                      className={`lp__subtype-btn${subtypeFilter === 'all' ? ' lp__subtype-btn--active' : ''}`}
                      onClick={() => { setSubtypeFilter('all'); setDisplayLimit(24); }}
                      aria-pressed={subtypeFilter === 'all'}
                    >
                      <span className="lp__subtype-label">All {ANIMAL_TYPES[focusedType]?.label ?? ''}</span>
                    </button>
                    {subtypeDefs.map(({ key, emoji, label }) => {
                      const count = inCategory.filter(s => classifyAnimalSubtype(s) === key).length;
                      const isEmpty = count === 0;
                      return (
                        <button
                          key={key}
                          className={`lp__subtype-btn${subtypeFilter === key ? ' lp__subtype-btn--active' : ''}${isEmpty ? ' lp__subtype-btn--empty' : ''}`}
                          onClick={() => { if (!isEmpty) { setSubtypeFilter(key); setDisplayLimit(24); track('state_park_subtype', { type: focusedType, subtype: key }); } }}
                          disabled={isEmpty}
                          aria-pressed={subtypeFilter === key}
                          title={label}
                        >
                          <span aria-hidden="true">{emoji}</span>
                          <span className="lp__subtype-label">{label}</span>
                          {count > 0 && <span className="lp__subtype-count">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile-only filter toggle — same pattern as the national popup.
                  CSS hides .lp__controls on phones; this is the way back in. */}
              {(() => {
                const activeCount = [
                  sortBy !== 'iconic-first',
                  rarityFilter !== 'all',
                  season !== currentSeasonKey,
                  !!query.trim(),
                ].filter(Boolean).length;
                return (
                  <button
                    className={`lp__mobile-filter-toggle${mobileFiltersOpen ? ' lp__mobile-filter-toggle--open' : ''}`}
                    onClick={() => setMobileFiltersOpen(v => !v)}
                    aria-expanded={mobileFiltersOpen}
                  >
                    {mobileFiltersOpen
                      ? '✕ Close Filters'
                      : `⚙️ Filter & Search${activeCount > 0 ? ` (${activeCount})` : ''}`}
                  </button>
                );
              })()}

              {/* Controls — sort + season + rarity + search, identical to national parks. */}
              <div className={`lp__controls${mobileFiltersOpen ? ' lp__controls--mobile-open' : ''}`}>
                <div className="lp__controls-row">
                  <select className="lp__select" value={sortBy} onChange={e => { setSortBy(e.target.value); setDisplayLimit(24); }}
                    aria-label="Sort order">
                    <option value="iconic-first">Most Iconic</option>
                    <option value="common-first">Most Common</option>
                    <option value="rarest-first">Rarest First</option>
                    <option value="a-z">A–Z</option>
                  </select>
                  <select className="lp__select" value={season} onChange={e => { setSeason(e.target.value); setDisplayLimit(24); }}
                    aria-label="Season filter">
                    {Object.entries(SEASONS).map(([k, { emoji, label }]) => (
                      <option key={k} value={k}>{emoji} {label}</option>
                    ))}
                  </select>
                </div>
                <select className="lp__select lp__select--full" value={rarityFilter}
                  onChange={e => { setRarityFilter(e.target.value); setDisplayLimit(24); }}
                  aria-label="Likelihood filter">
                  {Object.entries(RARITY).map(([k, { emoji, label }]) => (
                    <option key={k} value={k}>{emoji} {label}</option>
                  ))}
                </select>
                <div className="lp__search">
                  <span className="lp__search-icon" aria-hidden="true">🔍</span>
                  <input className="lp__search-input" type="search" placeholder="Search species…"
                    value={query} onChange={e => { setQuery(e.target.value); setDisplayLimit(24); }}
                    aria-label="Search species" />
                  {query && (
                    <button className="lp__search-clear" onClick={() => { setQuery(''); setDisplayLimit(24); }} aria-label="Clear search">✕</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="statepark-modal__body">
          {state.status === 'loading' && <p className="statepark-modal__empty">Loading wildlife from eBird + iNaturalist…</p>}
          {state.status === 'error' && <p className="statepark-modal__empty">Could not load live data right now. Try again in a moment.</p>}
          {state.status === 'empty' && (
            <p className="statepark-modal__empty">No recent eBird/iNaturalist observations found within {searchRadiusKm} km.</p>
          )}
          {state.status === 'ok' && state.species.length > 0 && (
            <>
              <div className="lp__showing-count">
                Showing {Math.min(displayLimit, visible.length)} of {visible.length} species
                {state.partial && <span className="statepark-modal__loading-more"> · loading mammals, reptiles &amp; more…</span>}
              </div>

              {/* Same rating key + seen-filter bar as national parks. */}
              <div className="lp__legend" aria-label="Rating key">
                <span><span className="lp__legend-dot lp__legend-dot--high">●</span> strong data</span>
                <span><span className="lp__legend-dot lp__legend-dot--med">◐</span> moderate</span>
                <span><span className="lp__legend-dot lp__legend-dot--low">○</span> thin — approximate</span>
                <span><span className="lp__legend-tilde">~</span> observability, not a per-visit %</span>
              </div>

              <div className="lifelist-bar">
                <span className="lifelist-bar__progress" title={`${spProgress.seen} seen at ${park.name}`}>
                  🏅 <strong>{spProgress.seen}</strong> seen here
                </span>
                <span className="lifelist-bar__seg" role="group" aria-label="Filter by seen status">
                  {[['all', 'All'], ['unseen', 'To find'], ['seen', 'Seen']].map(([v, lbl]) => (
                    <button
                      key={v}
                      type="button"
                      className={`lifelist-bar__seg-btn${seenFilter === v ? ' is-active' : ''}`}
                      aria-pressed={seenFilter === v}
                      onClick={() => { setSeenFilter(v); setDisplayLimit(24); }}
                    >
                      {lbl}
                    </button>
                  ))}
                </span>
              </div>

              {visible.length === 0 && <p className="statepark-modal__empty">No species match the current filters.</p>}
              {/* The REAL national-park AnimalCard — same component, same
                  rarity model + ancillary inputs (live iNat seasonal
                  histograms + park effort), photos, badges. State parks just
                  lack zones + NPS curated descriptions. */}
              <div className="statepark-grid">
                {visible.slice(0, displayLimit).map(a => (
                  <AnimalCard
                    key={(a.scientificName || a.name) + '-' + (a.animalType || '')}
                    animal={a}
                    location={spLocation}
                    debugMode={false}
                    seasonalFreqs={seasonalFreqs}
                    parkEffort={parkEffort}
                    activeSeason={activeSeasonForRarity}
                    activeZone={null}
                    parkZones={null}
                    onSelectZone={null}
                    effortRescaler={1}
                    visitTime="any"
                    effortLabel="casual"
                    openAbout={openAbout}
                    highlightSpecies={null}
                    seen={seenKeys.has(speciesKey(a))}
                    onToggleSeen={onToggleSeen}
                    communitySightings={community.buckets}
                    onCommunityVote={bumpCommunity}
                  />
                ))}
              </div>
              {visible.length > displayLimit && (
                <button className="statepark-modal__more" onClick={() => setDisplayLimit(d => d + 24)}>
                  Show more ({visible.length - displayLimit} remaining)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Contact / Feedback ──────────────────────────────────────────────────────
// Lets visitors report bugs, suggest features, and — importantly for data
// quality — confirm or correct what they actually saw at a park.
//
// Delivery: the visitor's browser POSTs directly to Web3Forms (FormData, which
// is a CORS "simple request" — no preflight), and Web3Forms emails it to
// contact@wildlifeexplorer.us. No email app, account, or sign-up needed on the
// visitor's side — they just type and hit Send. The access key is public by
// design (safe in client code). A same-origin backup copy is logged to
// /api/feedback, and a mailto fallback is offered only if the send fails.
const FEEDBACK_CATEGORIES = [
  { key: 'data', emoji: '📍', label: 'Correct park data', hint: 'A species is wrong/missing, or the rarity looks off' },
  { key: 'bug', emoji: '🐛', label: 'Report a problem', hint: 'Something is broken or behaving oddly' },
  { key: 'idea', emoji: '💡', label: 'Suggest an idea', hint: 'A feature or improvement you’d like' },
  { key: 'other', emoji: '💬', label: 'Something else', hint: '' },
];
function ContactModal({ onClose, presetPark = '' }) {
  const [category, setCategory] = useState('data');
  const [park, setPark] = useState(presetPark);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');           // honeypot
  const [status, setStatus] = useState('idle');         // idle | sending | sent | error
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Public Web3Forms access key (safe in client code — it only authorises
  // posting to the inbox it's bound to: contact@wildlifeexplorer.us).
  const WEB3FORMS_ACCESS_KEY = '6c5c24a7-500a-49fd-8bd0-98ab6944bb68';

  const cat = FEEDBACK_CATEGORIES.find(c => c.key === category);
  // Only used if the direct send fails — lets the visitor email it themselves.
  const mailto = `mailto:contact@wildlifeexplorer.us`
    + `?subject=${encodeURIComponent(`[Wildlife Explorer] ${cat?.label ?? 'Feedback'}${park ? ` — ${park}` : ''}`)}`
    + `&body=${encodeURIComponent(
        `Category: ${cat?.label ?? category}\n`
        + (park ? `Park: ${park}\n` : '')
        + (email ? `Reply to: ${email}\n` : '')
        + `\n${message}\n`)}`;

  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 3 || status === 'sending') return;
    if (company) { setStatus('sent'); return; }   // honeypot tripped — fake success
    setStatus('sending');
    track('feedback_sent', { category });

    // Send straight from the visitor's browser to Web3Forms. FormData keeps it a
    // CORS "simple request" (no preflight), the canonical Web3Forms method.
    const fd = new FormData();
    fd.append('access_key', WEB3FORMS_ACCESS_KEY);
    fd.append('subject', `[Wildlife Explorer] ${cat?.label ?? 'Feedback'}${park ? ` — ${park}` : ''}`);
    fd.append('from_name', 'US Wildlife Explorer');
    fd.append('Category', cat?.label ?? category);
    if (park) fd.append('Park', park);
    fd.append('message', message);
    if (email) fd.append('replyto', email);
    fd.append('botcheck', '');

    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      setStatus(res.ok && json.success ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }

    // Best-effort backup copy in our own runtime logs (same-origin, no preflight).
    try {
      fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, park, message, email, company }), keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="contact-modal" role="dialog" aria-modal="true" aria-label="Send feedback">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        {status === 'sent' ? (
          <div className="contact-modal__sent">
            <div className="contact-modal__sent-icon" aria-hidden="true">✅</div>
            <h2 className="contact-modal__title">Thank you!</h2>
            <p>Your message is on its way to me — no email app, no account needed. I read every one. 🌿</p>
            {email && (
              <p className="contact-modal__sent-fallback">
                If a reply would help, I’ll reach you at <strong>{email}</strong>.
              </p>
            )}
            <button className="contact-modal__submit" onClick={onClose}>Done</button>
          </div>
        ) : status === 'error' ? (
          <div className="contact-modal__sent">
            <div className="contact-modal__sent-icon" aria-hidden="true">📭</div>
            <h2 className="contact-modal__title">Couldn’t send just now</h2>
            <p>Something blocked the send — usually a network hiccup or an ad-blocker. You can email it to me directly instead:</p>
            <p className="contact-modal__sent-fallback">
              <a href={mailto}>contact@wildlifeexplorer.us</a>
            </p>
            <div className="contact-modal__actions">
              <button className="contact-modal__submit" onClick={() => setStatus('idle')}>← Try again</button>
            </div>
          </div>
        ) : (
          <form className="contact-modal__body" onSubmit={submit}>
            <h2 className="contact-modal__title">💬 Feedback &amp; corrections</h2>
            <p className="contact-modal__sub">
              Spotted wrong data, hit a bug, or have an idea? Tell me — your reports keep
              {' '}4,000+ parks accurate.
            </p>

            <div className="contact-modal__cats" role="radiogroup" aria-label="What's this about?">
              {FEEDBACK_CATEGORIES.map(c => (
                <button key={c.key} type="button" role="radio" aria-checked={category === c.key}
                  className={`contact-modal__cat${category === c.key ? ' contact-modal__cat--on' : ''}`}
                  onClick={() => setCategory(c.key)}>
                  <span aria-hidden="true">{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
            {cat?.hint && <p className="contact-modal__hint">{cat.hint}</p>}

            {(category === 'data' || category === 'bug') && (
              <input className="contact-modal__input" type="text" value={park}
                onChange={e => setPark(e.target.value)} maxLength={120}
                placeholder="Which park? (optional)" aria-label="Which park" />
            )}

            <textarea className="contact-modal__textarea" value={message}
              onChange={e => setMessage(e.target.value)} maxLength={4000} rows={5} required
              placeholder={category === 'data'
                ? 'e.g. “Bald Eagle is listed as Rare at this park but they nest here year-round.”'
                : 'Your message…'} aria-label="Your message" />

            <input className="contact-modal__input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} maxLength={160}
              placeholder="Your email (optional — only if you'd like a reply)" aria-label="Your email" />

            {/* Honeypot — hidden from real users */}
            <input className="contact-modal__hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" />

            <div className="contact-modal__actions">
              <button type="submit" className="contact-modal__submit"
                disabled={message.trim().length < 3 || status === 'sending'}>
                {status === 'sending' ? 'Sending…' : '📨 Send'}
              </button>
            </div>
            <p className="contact-modal__privacy">
              Sends straight to me — no email app, no account, nothing shared or sold.
            </p>
          </form>
        )}
      </div>
    </>
  );
}

// ── "Parks near me" ─────────────────────────────────────────────────────────
// Requests the browser geolocation (client-side only — the coordinate is never
// sent anywhere) and lists the nearest wildlife sites, national + state, by
// great-circle distance. Works wherever you are in the US.
function NearMeModal({ index, onPick, onClose, onLocate }) {
  const [status, setStatus]   = useState('locating'); // locating | ok | denied | error | unsupported
  const [results, setResults] = useState([]);
  const [notable, setNotable] = useState(null);       // rare-bird alerts (eBird notable feed)
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  useEffect(() => {
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return; }
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (!alive) return;
        const { latitude, longitude } = pos.coords;
        onLocate?.({ lat: latitude, lng: longitude });
        const R = 3958.8, toRad = d => d * Math.PI / 180;            // miles
        const miFrom = (la, lo) => {
          const dLa = toRad(la - latitude), dLo = toRad(lo - longitude);
          const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(latitude)) * Math.cos(toRad(la)) * Math.sin(dLo / 2) ** 2;
          return 2 * R * Math.asin(Math.sqrt(a));
        };
        setResults(index.map(it => ({ ...it, miles: miFrom(it.lat, it.lng) }))
          .sort((a, b) => a.miles - b.miles).slice(0, 20));
        setStatus('ok');
        // Rare-bird alerts (eBird's locally-notable feed). The coordinate is
        // ROUNDED to ~1 km before the query so the precise location still
        // never leaves the device.
        fetchEbirdNotable(+latitude.toFixed(2), +longitude.toFixed(2)).then(list => {
          if (!alive) return;
          setNotable((list ?? []).map(o => ({ ...o, miles: miFrom(o.lat, o.lng) })));
        });
      },
      err => { if (alive) setStatus(err?.code === 1 ? 'denied' : 'error'); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
    return () => { alive = false; };
  }, [index, onLocate]);

  const MSG = {
    locating:    'Finding your location…',
    denied:      'Location permission was denied. Enable location access in your browser to see the parks nearest you.',
    error:       'Couldn’t get your location — please try again.',
    unsupported: 'Your browser doesn’t support location.',
  };
  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="nearme-modal" role="dialog" aria-modal="true" aria-label="Parks near me">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="nearme-modal__head">
          <h2 className="nearme-modal__title">📍 Parks near you</h2>
          <p className="nearme-modal__sub">Nearest national &amp; state wildlife sites</p>
        </div>
        {status === 'ok' && notable?.length > 0 && (
          <div className="nearme-modal__rare">
            <div className="nearme-modal__rare-title">🔥 Rare nearby <span>recent notable birds · eBird</span></div>
            <ul className="nearme-modal__rare-list">
              {notable.slice(0, 6).map(o => {
                let when = '';
                try { when = new Date(o.obsDt.replace(' ', 'T')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch {}
                return (
                  <li key={`${o.name}-${o.obsDt}`} className="nearme-modal__rare-item">
                    <span className="nearme-modal__rare-name">{o.name}</span>
                    <span className="nearme-modal__rare-meta">{Math.round(o.miles)} mi · {o.locName}{when ? ` · ${when}` : ''}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {status !== 'ok'
          ? <p className="nearme-modal__msg">{MSG[status]}</p>
          : (
            <ul className="nearme-modal__list" aria-label="Nearest parks">
              {results.map(it => (
                <li key={`${it.kind}-${it.id}`}>
                  <button className="nearme-modal__item" onClick={() => onPick(it)}>
                    <span className="nearme-modal__emoji" aria-hidden="true">{it.emoji}</span>
                    <span className="nearme-modal__text">
                      <span className="nearme-modal__name">{it.name}</span>
                      <span className="nearme-modal__metaline">{it.kind === 'national' ? it.sub : `${it.sub} · State Park`}</span>
                    </span>
                    <span className="nearme-modal__dist">{Math.round(it.miles)} mi</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </>
  );
}

// ── State selector ─────────────────────────────────────────────────────────
// "🗺️ State Parks" header button opens this. All 50 states are wired; the list
// is alphabetical with a search box and region filter so 50 entries stay
// browsable. Add a state to STATE_PARK_STATES + STATE_PARKS_BY_STATE and it
// appears automatically (give it a STATE_REGION entry too).
const STATE_REGION = {
  CT:'Northeast', ME:'Northeast', MA:'Northeast', NH:'Northeast', RI:'Northeast', VT:'Northeast', NJ:'Northeast', NY:'Northeast', PA:'Northeast',
  DE:'Southeast', MD:'Southeast', VA:'Southeast', WV:'Southeast', NC:'Southeast', SC:'Southeast', GA:'Southeast', FL:'Southeast', KY:'Southeast', TN:'Southeast', AL:'Southeast', MS:'Southeast',
  OH:'Midwest', MI:'Midwest', IN:'Midwest', IL:'Midwest', WI:'Midwest', MN:'Midwest', IA:'Midwest', MO:'Midwest', KS:'Midwest', NE:'Midwest', ND:'Midwest', SD:'Midwest',
  AR:'South Central', LA:'South Central', OK:'South Central', TX:'South Central',
  MT:'Mountain', WY:'Mountain', CO:'Mountain', ID:'Mountain', UT:'Mountain', NV:'Mountain', AZ:'Mountain', NM:'Mountain',
  CA:'Pacific', OR:'Pacific', WA:'Pacific', AK:'Pacific', HI:'Pacific',
};
const REGION_ORDER = ['Northeast', 'Southeast', 'Midwest', 'South Central', 'Mountain', 'Pacific'];

function StateSelectorModal({ states, onPick, onClose }) {
  const [region, setRegion] = useState('All');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const totalParks = useMemo(
    () => Object.values(STATE_PARKS_BY_STATE).reduce((n, l) => n + l.length, 0),
    [],
  );
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (
    states
      .filter(s => region === 'All' || STATE_REGION[s.code] === region)
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [states, region, q]);

  const renderStateItem = (s, showRegion) => {
    const count = (STATE_PARKS_BY_STATE[s.code] || []).length;
    return (
      <li key={s.code}>
        <button className="stateselect-modal__item" onClick={() => onPick(s)}>
          <span className="stateselect-modal__item-name">{s.name}</span>
          {showRegion && <span className="stateselect-modal__item-region">{STATE_REGION[s.code]}</span>}
          <span className="stateselect-modal__item-count">{count} parks</span>
        </button>
      </li>
    );
  };

  return (
    <>
      <div className="about-overlay" onClick={onClose} />
      <div className="stateselect-modal" role="dialog" aria-modal="true" aria-label="Choose a state">
        <button className="about-modal__close" onClick={onClose} aria-label="Close">X</button>
        <div className="stateselect-modal__head">
          <h2 className="stateselect-modal__title">State Parks</h2>
          <p className="stateselect-modal__sub">All 50 states · {totalParks.toLocaleString()} parks &amp; preserves</p>
        </div>
        <div className="stateselect-modal__controls">
          <input
            className="stateselect-modal__search"
            type="search"
            placeholder="Search states…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search states"
          />
          <div className="stateselect-modal__regions" role="tablist" aria-label="Filter by region">
            {['All', ...REGION_ORDER].map(r => (
              <button
                key={r}
                role="tab"
                aria-selected={region === r}
                className={`stateselect-modal__region${region === r ? ' is-active' : ''}`}
                onClick={() => setRegion(r)}
              >{r}</button>
            ))}
          </div>
        </div>
        <ul className="stateselect-modal__list" aria-label="Available states">
          {visible.length === 0 && (
            <li className="stateselect-modal__empty">No states match “{query}”.</li>
          )}
          {/* When browsing everything, group under region headers; when a region
              chip or search is active, show a flat alphabetical list. */}
          {(region === 'All' && !q)
            ? REGION_ORDER.flatMap(rg => {
                const inRg = visible.filter(s => STATE_REGION[s.code] === rg);
                if (!inRg.length) return [];
                return [
                  <li key={`head-${rg}`} className="stateselect-modal__region-head" aria-hidden="true">{rg}</li>,
                  ...inRg.map(s => renderStateItem(s, false)),
                ];
              })
            : visible.map(s => renderStateItem(s, true))}
        </ul>
      </div>
    </>
  );
}

// ── State-park interactive map ─────────────────────────────────────────────
// Full-screen overlay containing a Leaflet map zoomed to the selected
// state's bounds with a pin per park. Mirrors the national-park flow:
// pin → click → opens StateParkPanel (which stacks above this overlay).
// Renders its own MapContainer so the main national-park map is untouched.
// `federal` carries the national parks, monuments, preserves and refuges that
// fall inside this state, normalised by the caller to the same shape as a state
// park (plus `emoji`, `catLabel`, `__federal` and the original `unit`). Before
// this, opening Utah showed state parks with Zion, Bryce, Arches and every
// refuge simply missing — the two layers lived in separate views and neither
// answered "what's in this state?".
function StateParkMap({ state, parks, federal = [], stateGeo, onPickPark, onPickFederal, onClose, onSwitchState }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // The selected state's boundary polygon (from the shared US-states
  // GeoJSON the national map already loads) — highlighted so the state
  // stands out from its dark neighbours, and used to frame the map tightly.
  const stateFeature = useMemo(
    () => stateGeo?.features?.find(f => f.properties?.name === state.name) || null,
    [stateGeo, state.name],
  );

  // Category-aware pins — circular emoji badge mirroring the national-park
  // pin style. Distinct emoji is itself a colour-independent cue, so this
  // remains accessible without the earlier shape variants.
  const CAT_EMOJI = {
    'state-park':       '🏞️',   // landscape — the iconic "park"
    'state-forest':     '🌲',   // evergreen — forest
    'recreation-area':  '🛶',   // canoe — NJ rec areas are reservoirs/lakes
    'state-beach':      '🏖️',   // beach — RI (Ocean State) coastal state beaches
    'state-preserve':   '🦋',   // butterfly — wildlife preserve / management area
  };
  const CAT_LABEL = {
    'state-park':       'Park',
    'state-forest':     'Forest',
    'recreation-area':  'Recreation',
    'state-beach':      'Beach',
    'state-preserve':   'Preserve',
  };
  const pinFor = (park) => {
    const cat = park.category || 'state-park';
    // Federal units carry their own emoji from npsEmojiOf, so the state map
    // doesn't need a second copy of that mapping.
    const emoji = park.emoji || CAT_EMOJI[cat] || '🏞️';
    return L.divIcon({
      className: `state-park-pin${park.__federal ? ' state-park-pin--federal' : ''}`,
      html: `<div class="state-park-pin__badge" aria-hidden="true">${emoji}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    });
  };

  // State parks and federal units share one list, one filter bar and one map.
  const allUnits = useMemo(() => [...parks, ...federal], [parks, federal]);

  // Distinct categories present in this state — drives the filter chips.
  const legendCats = useMemo(
    () => [...new Set(allUnits.map(p => p.category || 'state-park'))],
    [allUnits],
  );
  const catCount = (c) => allUnits.filter(p => (p.category || 'state-park') === c).length;
  // Chip emoji/label: federal units bring their own, state parks use the tables.
  const catMeta = useMemo(() => {
    const m = new Map();
    for (const u of allUnits) {
      const c = u.category || 'state-park';
      if (!m.has(c)) m.set(c, {
        emoji: u.emoji || CAT_EMOJI[c] || '🏞️',
        label: u.catLabel || CAT_LABEL[c] || c,
      });
    }
    return m;
  }, [allUnits]);

  // Category + name filtering (mirrors the national map's filter bar). Default:
  // all categories on. Clicking a category chip toggles it; the search box
  // narrows by park name.
  const [activeCats, setActiveCats] = useState(() => new Set(legendCats));
  const [query, setQuery] = useState('');
  // Switching states changes which categories exist; without this the old
  // state's set carries over and silently hides the new state's units.
  useEffect(() => { setActiveCats(new Set(legendCats)); }, [state.code, legendCats.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleCat = (c) => setActiveCats(prev => {
    const next = new Set(prev);
    if (next.has(c)) next.delete(c); else next.add(c);
    return next.size ? next : new Set(legendCats); // never allow an empty (all-off) map
  });
  const visibleParks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allUnits.filter(p =>
      activeCats.has(p.category || 'state-park') &&
      (!q || (p.name || '').toLowerCase().includes(q))
    );
  }, [allUnits, activeCats, query]);

  // Frame the state tightly: fit to the actual boundary polygon when we
  // have it (snug, regardless of viewport), else the hand-tuned view, else
  // the bounds fence.
  function FrameState({ state, feature }) {
    const map = useMap();
    useEffect(() => {
      // Move the panning fence to THIS state FIRST. MapContainer's maxBounds
      // prop only applies on mount, so when the user switches states the old
      // fence (with 0.85 viscosity) would clamp the recenter and trap the map
      // on the previous state. Releasing + re-setting it fixes that.
      try { map.setMaxBounds(state.bounds ?? null); } catch { /* ignore */ }
      if (feature) {
        try { map.fitBounds(L.geoJSON(feature).getBounds(), { padding: [18, 18] }); return; }
        catch { /* fall through */ }
      }
      if (state.view) map.setView(state.view.center, state.view.zoom);
      else if (state.bounds) map.fitBounds(state.bounds, { padding: [12, 12] });
    }, [map, state, feature]);
    return null;
  }

  // Bind markers imperatively into a marker-cluster group — parity with the
  // national map (which clusters), and it declutters the crowded northern-NJ
  // pins. Clusters use the existing .wm-cluster--nj green badge; at close zoom
  // (≥11) clustering disables so individual category-emoji pins show, and
  // overlapping pins spiderfy at max zoom.
  function StateMarkers({ parks, onPick }) {
    const map = useMap();
    useEffect(() => {
      const group = L.markerClusterGroup({
        maxClusterRadius: 44,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 11,
        iconCreateFunction: (cluster) => L.divIcon({
          html: `<div class="wm-cluster--nj">${cluster.getChildCount()}</div>`,
          className: '',
          iconSize: [38, 38],
        }),
      });
      parks.forEach(p => {
        // title/alt give the marker an accessible name — a bound tooltip does
        // not (it's mouse-hover only and never reaches assistive tech).
        const m = L.marker([p.lat, p.lng], {
          icon: pinFor(p),
          title: p.name,
          alt: p.__federal ? `${p.name} (${p.catLabel ?? 'federal land'})` : p.name,
        });
        m.bindTooltip(p.name, { direction: 'top', opacity: 0.95, className: 'park-tooltip' });
        m.on('click', () => (p.__federal ? onPickFederal?.(p) : onPick(p)));
        group.addLayer(m);
      });
      group.addTo(map);
      return () => { map.removeLayer(group); };
    }, [map, parks, onPick]);
    return null;
  }

  return (
    <div className="statemap-overlay" role="dialog" aria-modal="true" aria-label={`${state.name} state parks map`}>
      <div className="statemap-overlay__bar">
        <div className="statemap-overlay__title">
          🗺️ {state.name} Parks &amp; Refuges
          <span className="statemap-overlay__count">
            · {visibleParks.length === allUnits.length ? `${allUnits.length} places` : `${visibleParks.length} of ${allUnits.length}`}
          </span>
        </div>
        {/* Switch to another state's map without returning to the national map. */}
        {onSwitchState && (
          <select
            className="statemap-overlay__stateswitch"
            aria-label="Switch to another state"
            value={state.code}
            onChange={e => { if (e.target.value !== state.code) onSwitchState(e.target.value); }}
          >
            {STATE_PARK_STATES.slice().sort((a, b) => a.name.localeCompare(b.name)).map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        )}
        {/* Clickable category filter (Park / Forest / Recreation / Preserve). */}
        <div className="statemap-overlay__filters" role="group" aria-label="Filter by park type">
          {legendCats.map(c => {
            const on = activeCats.has(c);
            const meta = catMeta.get(c) ?? { emoji: '🏞️', label: c };
            return (
              <button
                key={c}
                type="button"
                className={`statemap-filter-chip${on ? ' is-active' : ''}`}
                aria-pressed={on}
                onClick={() => toggleCat(c)}
                title={`${on ? 'Hide' : 'Show'} ${meta.label}`}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="statemap-filter-chip__count">{catCount(c)}</span>
              </button>
            );
          })}
        </div>
        {/* Park-name search (the national map's "find parks" equivalent). */}
        <div className="statemap-overlay__search">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Find a park…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search parks by name"
          />
          {query && (
            <button className="statemap-overlay__search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>
        <button className="statemap-overlay__close" onClick={onClose} aria-label="Back to main map">
          <span className="full">← Back to national map</span>
          <span className="short">← Back</span>
        </button>
      </div>
      <div className="statemap-overlay__map">
        <MapContainer
          center={state.view?.center || [40, -74]}
          zoom={state.view?.zoom || 7}
          minZoom={6}
          maxBounds={state.bounds}
          maxBoundsViscosity={0.85}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url={basemapUrl(true)}
          />
          {stateFeature && (
            <GeoJSON
              key={state.code}
              data={stateFeature}
              interactive={false}
              style={{ color: '#5fd38a', weight: 3, opacity: 0.95, fillColor: '#4caf50', fillOpacity: 0.12 }}
            />
          )}
          <FrameState state={state} feature={stateFeature} />
          <StateMarkers parks={visibleParks} onPick={onPickPark} />
        </MapContainer>
      </div>
      <p className="statemap-overlay__hint">
        Tap any pin to see the wildlife at that park. Data is community-observed via iNaturalist.
      </p>
    </div>
  );
}

// ── Welcome splash screen ──────────────────────────────────────────────────────
// Shown only on the very first visit (localStorage key wm_visited).
// Dismissed by clicking the button; never shown again.
function SplashScreen({ onDismiss, onAbout, onGuide }) {
  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label="Welcome to US Wildlife Explorer">
      <div className="splash__content">
        <div className="splash__logo" aria-hidden="true">🌿</div>
        <h1 className="splash__title">US Wildlife Explorer</h1>
        <p className="splash__tagline">Discover wildlife across America's parks</p>
        <button className="splash__btn" onClick={onDismiss} autoFocus>
          Explore the Map →
        </button>
        <div className="splash__links">
          {onGuide && (
            <button className="splash__about-link" onClick={() => { onDismiss(); onGuide(); }}>
              ✨ How to use it
            </button>
          )}
          <button className="splash__about-link" onClick={() => { onDismiss(); onAbout(); }}>
            About this project
          </button>
        </div>
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
// Returns a charisma score (1–11) used to rank within iconic sort tiers.
// Higher = more exciting / visitor-recognisable.
//
// IMPORTANT: name patterns are gated by animalType so a fish named "Jaguar
// Guapote" doesn't inherit the big-cat's score, and a "Mountain Bluebird"
// doesn't get a mammal score from the word "mountain". Fish (animalType
// 'marine' or 'fish' that aren't whales/seals/sea turtles/etc.) are demoted
// — visitors care about big iconic sea life (whales, manatees, seals,
// orcas, sea turtles, sharks), not minnows.
function getCharismaScore(name, animalType) {
  const n = (name ?? '').toLowerCase();

  // ── Mammals ───────────────────────────────────────────────────────────
  if (animalType === 'mammal') {
    // Tier 11: critically endangered icons people travel specifically to see
    if (/\b(california condor|florida panther|gray wolf|grizzly bear|brown bear|wolverine|polar bear)\b/.test(n)) return 11;
    // Tier 10: marquee large mammals
    if (/\b(bison|buffalo|grizzly|bear|wolf|wolves|moose|elk|wapiti|mountain lion|puma|cougar|jaguar|panther|wolverine|caribou|muskox|bighorn|mountain goat|pronghorn)\b/.test(n)) return 10;
    // Tier 9: marine mammals
    if (/\b(whale|dolphin|orca|sea lion|walrus|sea otter|steller|manatee|seal)\b/.test(n)) return 9;
    // Tier 7: charismatic medium mammals
    if (/\b(fox|coyote|bobcat|lynx|otter|beaver|deer|javelina|peccary|porcupine|badger|marmot|prairie dog)\b/.test(n)) return 7;
    // Generic mammal floor
    return 6;
  }

  // ── Reptiles / Amphibians ─────────────────────────────────────────────
  if (animalType === 'reptile' || animalType === 'amphibian') {
    // Tier 10: big iconic reptiles (alligators, crocs only — these are the
    // marquee "I came to see one" species at parks like the Everglades)
    if (/\b(alligator|crocodile)\b/.test(n)) return 10;
    // Tier 8: sea turtles (charismatic, slow, photogenic) + gila monster
    if (/\b(sea turtle|leatherback|loggerhead|green turtle|hawksbill|kemp|olive ridley|gila monster)\b/.test(n)) return 8;
    // Tier 6: venomous snakes (recognisable danger animals, but not what
    // most visitors come to see — and many actively avoid them)
    if (/\b(rattlesnake|cottonmouth|copperhead|coral snake|cobra|mamba)\b/.test(n)) return 6;
    // Tier 5: large monitors / iguanas / big snakes / tortoises — niche
    // interest, not headline draws
    if (/\b(komodo|iguana|monitor|boa|python|king snake|milk snake|gopher snake|tortoise|gopher tortoise|desert tortoise)\b/.test(n)) return 5;
    // Generic reptile/amphibian floor (lizards, frogs, salamanders)
    return 4;
  }

  // ── Birds ─────────────────────────────────────────────────────────────
  if (animalType === 'bird') {
    // Tier 11: condors (iconic recovery story, see-one-in-a-lifetime)
    if (/\b(california condor|condor)\b/.test(n)) return 11;
    // Tier 10: birds of prey — eagles, falcons, hawks, owls, ospreys,
    // vultures. Visitors specifically look for these and stop in their
    // tracks when they see one.
    if (/\b(bald eagle|golden eagle|eagle|peregrine|falcon|osprey|hawk|owl|vulture|kite|harrier|merlin|kestrel|caracara|goshawk)\b/.test(n)) return 10;
    // Tier 8: showpiece large birds
    if (/\b(puffin|flamingo|spoonbill|whooping crane|sandhill crane|roseate|pelican|frigate|booby|albatross|trumpeter swan|tundra swan)\b/.test(n)) return 8;
    // Tier 7: large wading + waterbirds visitors notice
    if (/\b(heron|egret|ibis|stork|loon|cormorant|gannet|anhinga|kingfisher|wood duck|harlequin|hooded merganser)\b/.test(n)) return 7;
    // Tier 6: woodpeckers, charismatic small birds + colourful songbirds
    if (/\b(woodpecker|jay|magpie|raven|roadrunner|grouse|ptarmigan|wild turkey|turkey|quail|cardinal|bluebird|oriole|tanager|bunting|warbler|hummingbird|goldfinch|bluejay)\b/.test(n)) return 6;
    // Generic small bird floor (sparrows, finches) — birds are the headline
    // draw at most parks, so they edge out generic reptiles/amphibians (4).
    return 5;
  }

  // ── Marine life (non-mammal: sea turtles, sharks, rays, fish) ─────────
  if (animalType === 'marine' || animalType === 'fish') {
    // Tier 10: marine megafauna (whales sometimes get tagged 'marine' instead of 'mammal')
    if (/\b(whale|orca|dolphin|manatee|walrus)\b/.test(n)) return 10;
    // Tier 9: sharks, rays, sea turtles — apex / iconic
    if (/\b(shark|manta|stingray|ray|sea turtle|leatherback|loggerhead|green turtle|hawksbill|kemp|olive ridley)\b/.test(n)) return 9;
    // Tier 8: seals, sea lions, sea otters
    if (/\b(seal|sea lion|sea otter|steller)\b/.test(n)) return 8;
    // Tier 7: showpiece reef fish + iconic sportfish
    if (/\b(marlin|sailfish|swordfish|tarpon|tuna|barracuda|grouper|moray|octopus|squid|cuttlefish|seahorse)\b/.test(n)) return 7;
    // Tier 5: salmon (iconic spawning runs), trout (fly-fishing recognition)
    if (/\b(salmon|steelhead|cutthroat|rainbow trout)\b/.test(n)) return 5;
    // Generic fish floor — minnows, guppies, cichlids like Jaguar Guapote.
    // Visitors generally don't pick a park to see a freshwater fish.
    return 2;
  }

  // ── Insects ───────────────────────────────────────────────────────────
  if (animalType === 'insect') {
    if (/\b(monarch|swallowtail|morpho)\b/.test(n)) return 5;
    return 2;
  }

  return 4;
}

const _RARITY_ORDER = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
const _RARITY_BY_INDEX = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];

// ── Community ground-truth rarity nudge ─────────────────────────────────────
// Blend the cross-visitor seen-rate (api/sightings) into the model's tier —
// CONSERVATIVELY, so thin or noisy votes can never hijack the calibrated
// eBird/iNaturalist model:
//   • requires a real consensus sample (≥ COMMUNITY_MIN_N votes in the bucket)
//   • moves the tier AT MOST one step, and ONLY toward the empirical signal
//   • only fires when the community CLEARLY disagrees with the model (the
//     empirical band differs by ≥ 2 tiers); near-agreement leaves it untouched
// The card always shows the underlying "N of M saw this here" count, so the
// adjustment is transparent and auditable. Returns the (possibly) shifted tier.
const COMMUNITY_MIN_N = 12;
function _communityBandTier(rate) {
  if (rate >= 0.75) return 'guaranteed';
  if (rate >= 0.55) return 'very_likely';
  if (rate >= 0.30) return 'likely';
  if (rate >= 0.12) return 'unlikely';
  if (rate >= 0.03) return 'rare';
  return 'exceptional';
}
function nudgeRarityWithCommunity(baseTier, community) {
  if (!community || (community.n ?? 0) < COMMUNITY_MIN_N) return baseTier;
  const rate = community.seen / community.n;
  const bi = _RARITY_ORDER[baseTier];
  const ti = _RARITY_ORDER[_communityBandTier(rate)];
  if (bi == null || ti == null) return baseTier;
  // Only act on a clear disagreement (≥2 tiers apart); then step exactly one.
  if (Math.abs(ti - bi) < 2) return baseTier;
  return _RARITY_BY_INDEX[bi + (ti > bi ? 1 : -1)];
}

// Charisma threshold a rare/exceptional animal must clear to be treated as a
// "highlight" (and bubble above common species). Below it, rarity does NOT
// override charisma — so a rare obscure skink can't outrank a gray fox.
const ICONIC_CHARISMA_BAR = 7;

function iconicSortFn(a, b) {
  const ca = getCharismaScore(a.name, a.animalType);
  const cb = getCharismaScore(b.name, b.animalType);
  const ra = _RARITY_ORDER[a.rarity] ?? 5;
  const rb = _RARITY_ORDER[b.rarity] ?? 5;

  // Tier 1: curated Park Naturalist animals (real funFact, not a placeholder)
  const aIsCurated = !!(a.funFact && !needsGeneratedDescription(a.funFact));
  const bIsCurated = !!(b.funFact && !needsGeneratedDescription(b.funFact));
  if (aIsCurated !== bIsCurated) return aIsCurated ? -1 : 1;
  if (aIsCurated) {
    // Within curated: charisma first (Bison/Wolf/Bear before common sparrows),
    // then rarity (Guaranteed before Rare within same charisma band)
    if (cb !== ca) return cb - ca;
    return ra - rb;
  }

  // Tier 2: a rare-but-CHARISMATIC animal is a true once-in-a-lifetime highlight
  // (a rare bobcat, a rare bird of prey). Gated by charisma so the long tail of
  // obscure rare reptiles/amphibians does NOT bubble above charismatic species.
  const aIsExc = a.rarity === 'exceptional' && ca >= ICONIC_CHARISMA_BAR;
  const bIsExc = b.rarity === 'exceptional' && cb >= ICONIC_CHARISMA_BAR;
  if (aIsExc !== bIsExc) return aIsExc ? -1 : 1;
  if (aIsExc) { if (cb !== ca) return cb - ca; return ra - rb; }

  // Tier 3: high-charisma species (mammals, big reptiles, big sea life,
  // birds of prey) you can actually expect to see — charisma 8+ at likely-or-
  // better gets bubbled so a guaranteed alligator sits beside a guaranteed
  // bison, not buried under generic mammals.
  const likelyPlus = (r) => r === 'guaranteed' || r === 'very_likely' || r === 'likely';
  const aTopIconic = ca >= 8 && likelyPlus(a.rarity);
  const bTopIconic = cb >= 8 && likelyPlus(b.rarity);
  if (aTopIconic !== bTopIconic) return aTopIconic ? -1 : 1;
  if (aTopIconic) { if (cb !== ca) return cb - ca; return ra - rb; }

  // Tier 4: rare AND charismatic — same gating as Tier 2.
  const aIsRare = a.rarity === 'rare' && ca >= ICONIC_CHARISMA_BAR;
  const bIsRare = b.rarity === 'rare' && cb >= ICONIC_CHARISMA_BAR;
  if (aIsRare !== bIsRare) return aIsRare ? -1 : 1;
  if (aIsRare) { if (cb !== ca) return cb - ca; return ra - rb; }

  // Tier 5: everything else — charisma descending (so gray foxes/coyotes and
  // charismatic birds sit above common snakes/lizards/turtles regardless of how
  // often each is logged), then rarity ascending.
  if (cb !== ca) return cb - ca;
  return ra - rb;
}

// Approximate encounter-rate by rarity tier — used as last-resort when no
// frequency field exists (e.g. NPS-only records). Keeps estimated badges
// honest: exceptional animals show ~1%, rare ~4%, etc.
// Default popup type filter — surfaces all wildlife visitors typically come
// for: birds, mammals, reptiles (alligators, rattlesnakes), amphibians
// (salamanders), and marine life (manatees, whales, sea turtles). Insects
// stay opt-in — most visitors aren't there for the bug list, and showing
// 60+ insect cards by default buries the iconic species. Insects tab is
// one click away. Hoisted to module scope so it's a stable reference for
// useState init and useCallback closures.
const DEFAULT_ACTIVE_TYPES = ['bird', 'mammal', 'reptile', 'amphibian', 'marine'];

// Current meteorological season key — shared so national parks and state parks
// both default their season filter to "now".
function currentSeasonKey() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

const RARITY_FREQ_FALLBACK = {
  guaranteed: 0.92, very_likely: 0.70, likely: 0.40,
  unlikely: 0.15, rare: 0.04, exceptional: 0.01,
};

// Tier upper bounds — used to clamp live iNat freq proxies that would
// otherwise exceed the curated rarity tier's range. Mirrors the upper edge
// of each tier's probability band per RARITY config in wildlifeData.js.
// Slight headroom (0.99 / 0.62 / 0.30 / etc) so a freq just touching the
// tier's defined max stays in-band rather than tipping into the next.
const TIER_CEILING = {
  guaranteed: 0.99,
  very_likely: 0.92,
  likely: 0.62,
  unlikely: 0.30,
  rare: 0.10,
  exceptional: 0.03,
};

// Convert per-season encounter probabilities (0–1, from eBird Status & Trends)
// directly into percentages (0-99). These are ALREADY encounter probabilities
// per season — no normalization needed. The badge displays "chance of seeing
// this species on a visit during season X".
function freqFromBuiltInSeasonFrequencies(sf) {
  if (!sf) return null;
  const keys = ['spring', 'summer', 'fall', 'winter'];
  const out = { _source: 'ebird_st' };
  let any = false;
  for (const k of keys) {
    const v = sf[k];
    if (v == null) continue;
    out[k] = Math.min(99, Math.max(1, Math.round(v * 100)));
    any = true;
  }
  return any ? out : null;
}

// Resolve the species' baseline "chance per typical visit" (0-1). Uses the
// rarity tier's curated fallback unless the raw frequency field agrees and is
// more precise. This matters for species where iNat undersamples reality
// (e.g. large mammals): Grizzly Bear has frequency=0.0005 from iNat but
// rarity="unlikely" after manual override — the tier fallback (0.15) is
// far closer to true visitor encounter rate than the raw 0.05%.
function resolveBaselineFrequency(rawFrequency, rarity) {
  const tierFallback = RARITY_FREQ_FALLBACK[rarity] ?? 0.15;
  const raw = rawFrequency ?? 0;
  // Take the max so we never fall below the curated rarity tier's floor.
  return Math.max(raw, tierFallback);
}

// Compute the same "displayed" rarity tier that AnimalCard renders on its
// pill — mirrors the displayRarity useMemo in AnimalCard. Pulled out so the
// "Most Common" / "Rarest First" sort comparators agree with the visible
// pills (otherwise the sort uses raw `animal.rarity` and silently disagrees
// with the rescaled card pill, which looks broken to users).
//
// Inputs intentionally mirror AnimalCard's props so the two stay in lock-step.
function computeEffectiveRarity(animal, {
  activeSeason = null,
  activeZone = null,
  seasonalFreqs = null,
  parkEffort = null,
  parkZones = null,
  effortRescaler = 1,
  visitTime = 'any',
} = {}) {
  const period = animal.activityPeriod ?? 'diurnal';
  const todMultiplier = visitTime === 'any'
    ? 1
    : (TIME_OF_DAY_MULTIPLIER[period]?.[visitTime] ?? 1);

  // Detectability ceiling — caps the displayed pill for genuinely cryptic
  // species (mountain lion, wolverine, secretive owls). Skipped when a zone
  // is active because zones already encode the visible-context behavior
  // (Lamar wolves, Brooks Falls bears) and a generic detectability cap
  // would unfairly suppress them.
  const detectCeiling = activeZone ? null : detectabilityCeiling(animal);

  const rescale = (tier, freq) => {
    if (freq == null) return tier;
    let rescaled = Math.min(Math.max(freq * effortRescaler * todMultiplier, 0), 1);
    if (detectCeiling != null) {
      rescaled = Math.min(rescaled, detectCeiling);
    }
    return rarityFromFrequency(rescaled);
  };

  // Zone override (most specific)
  if (activeZone && animal.zones?.[activeZone]) {
    const z = animal.zones[activeZone];
    if (activeSeason && z.seasonFrequencies?.[activeSeason] != null) {
      return rescale(z.rarity, z.seasonFrequencies[activeSeason]);
    }
    return rescale(z.rarity, resolveBaselineFrequency(z.frequency, z.rarity));
  }

  // Season override
  if (activeSeason) {
    const seasons = animal.displaySeasons ?? animal.seasons ?? [];
    const hasSeason = seasons.includes(activeSeason) ||
                      seasons.includes('year_round') ||
                      seasons.includes('year-round');
    if (!hasSeason) return 'exceptional';
    if (animal.seasonFrequencies?.[activeSeason] != null) {
      return rescale(animal.rarity, animal.seasonFrequencies[activeSeason]);
    }
    const sciKey = animal.scientificName?.toLowerCase();
    const rawHist = sciKey ? seasonalFreqs?.[sciKey] : null;
    // Effort-correct the iNat seasonal histogram before computing encounter
    // probability — strips visitor-seasonality confounding so a year-round
    // resident doesn't read as a "summer-only" species. parkEffort may be null
    // (still loading or fetch failed at small parks), in which case we fall
    // back to the raw histogram (legacy behaviour).
    const correctedHist = rawHist && parkEffort
      ? effortCorrectHistogram(rawHist, parkEffort)
      : rawHist;
    const distPct = correctedHist?.[activeSeason];
    if (distPct != null && distPct > 0) {
      const base = resolveBaselineFrequency(
        animal.frequency ?? animal._debug?.frequency,
        animal.rarity,
      );
      const seasonalProb = Math.min(0.99, base * (distPct / 25));
      return rescale(animal.rarity, seasonalProb);
    }
    return rescale(animal.rarity, resolveBaselineFrequency(animal.frequency, animal.rarity));
  }

  // Park-level
  if (animal.frequency != null || animal.rarity) {
    // Apply destination boost when the park has a high-frequency front-country
    // zone for this species. Only fires when no zone is selected — selecting
    // a zone uses that zone's data directly.
    const boost = parkZones ? applyDestinationBoost(animal, parkZones) : null;
    if (boost) {
      return rescale(boost.rarity, resolveBaselineFrequency(boost.frequency, boost.rarity));
    }
    return rescale(animal.rarity, resolveBaselineFrequency(animal.frequency, animal.rarity));
  }
  return animal.rarity;
}

// ── Best-zone hint ─────────────────────────────────────────────────────────
// Surface the highest-rarity zone for a species when the park-level pill
// understates the visitor-encounter potential. Most users won't discover
// the zone selector — but a casual visitor at Yellowstone seeing "Gray Wolf
// · Rare · 2-10%" is missing the truth that Lamar Valley puts that at
// "Likely · 30-60%" with a spotting scope at dawn.
//
// Returns null when:
//   - the species has no zones
//   - a zone is already selected (no need for a hint)
//   - the best zone tier isn't meaningfully better than the park-level tier
//     (don't pollute the UI with hints that don't matter)
//
// Returns { zoneId, zoneLabel, zoneTier, zoneRange } when:
//   - best zone is at least 1 tier better than current displayed pill
function getBestZoneHint(animal, parkZones, displayRarity) {
  if (!animal?.zones) return null;
  const zoneEntries = Object.entries(animal.zones);
  if (!zoneEntries.length) return null;

  // Find the zone with the highest rarity tier (lowest rank index)
  let best = null;
  let bestRank = Infinity;
  for (const [zoneId, z] of zoneEntries) {
    const rank = _RARITY_ORDER[z.rarity] ?? 5;
    if (rank < bestRank) {
      bestRank = rank;
      best = { zoneId, ...z };
    }
  }
  if (!best) return null;

  // Only surface when the best zone is at least 1 tier better than the
  // currently displayed park-level pill. A "Likely" species whose best
  // zone is also "Likely" doesn't need a hint.
  const displayRank = _RARITY_ORDER[displayRarity] ?? 5;
  if (bestRank >= displayRank) return null;

  // Map zoneId → human label from parkZones metadata
  const zoneMeta = parkZones?.find?.(z => z.id === best.zoneId);
  const zoneLabel = zoneMeta?.label ?? best.zoneId;
  const tier = RARITY[best.rarity];

  return {
    zoneId: best.zoneId,
    zoneLabel,
    zoneTier: best.rarity,
    zoneTierLabel: tier?.label ?? best.rarity,
    zoneRange: tier?.probability ?? '',
    rationale: best.rationale ?? null,
  };
}

// ── Destination boost ─────────────────────────────────────────────────────
// When a species has a high-frequency front-country zone, the park-level
// pill shown to a casual visitor is honest about "random click" probability
// but understates the trip-planning question — most people opening the
// Yellowstone popup are deciding whether to visit, not estimating their
// chances during a midday gas-station stop.
//
// The fix: when (a) the species has a zone with rarity ≥ 2 tiers above the
// park-level pill AND (b) that zone is front-country (access ≥ 4 in
// parkZones metadata) AND (c) no zone is currently selected, elevate the
// park-level pill by AT MOST 1 tier toward the best zone. Capped at 1 tier
// so we never overpromise — a "rare" species at a park with a "guaranteed"
// zone moves to "unlikely," not "guaranteed."
//
// Effect on calibration: pulls park-level predictions for iconic species
// at zone-rich parks (Yellowstone wolves, Smokies elk, Everglades manatee)
// upward into the band that matches anchors derived from "wildlife-
// interested visitor" expectations.
//
// Returns { rarity, frequency, boosted: true } when boosted, or null when
// no boost applies (caller should keep the original park-level rarity).
function applyDestinationBoost(animal, parkZones) {
  if (!animal?.zones) return null;
  const zoneEntries = Object.entries(animal.zones);
  if (!zoneEntries.length) return null;
  const animalRank = _RARITY_ORDER[animal.rarity] ?? 5;

  // Find the best zone among those that are front-country accessible.
  // Wilderness / boat-only / expedition zones don't count for destination
  // boost — most casual planners aren't reaching them.
  const FRONT_COUNTRY_ACCESS_MIN = 4;
  let bestRank = Infinity;
  let bestRarity = null;
  for (const [zoneId, z] of zoneEntries) {
    const meta = parkZones?.find?.(pz => pz.id === zoneId);
    const access = meta?.access ?? 5;       // default to front-country if no metadata
    if (access < FRONT_COUNTRY_ACCESS_MIN) continue;
    const rank = _RARITY_ORDER[z.rarity] ?? 5;
    if (rank < bestRank) {
      bestRank = rank;
      bestRarity = z.rarity;
    }
  }
  if (bestRarity == null) return null;

  // Only boost when the gap is meaningful (≥2 tiers).
  if (animalRank - bestRank < 2) return null;

  // Cap the boost at 1 tier — never lie that a "rare" species is "guaranteed."
  const boostedRank = animalRank - 1;
  const tierKeys = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
  const boostedRarity = tierKeys[boostedRank] ?? animal.rarity;
  return {
    rarity: boostedRarity,
    frequency: RARITY_FREQ_FALLBACK[boostedRarity] ?? animal.frequency,
    boosted: true,
  };
}

// Effort-correct a species' seasonal distribution using the park's
// observer-effort baseline. Both inputs are season percentages summing to ~100.
//
// Why: a raw iNat histogram for a year-round resident shows ~50% of sightings
// in summer at most parks — but that's because there are 5-20× more visitors
// in summer, not because the animal is more present. Without correction, the
// pipeline systematically overstates summer encounter probability and
// understates winter for almost every resident species (Claude's deep-research
// review identified this as the highest-impact accuracy bug in the pipeline).
//
// Math:
//   corrected_raw[s] = speciesPct[s] / max(parkEffortPct[s], floor)
//   corrected[s]     = corrected_raw[s] / sum(corrected_raw) × 100
//
// Properties:
//   - Species with the same seasonal distribution as park-wide effort
//     (i.e. true year-round resident) → flat 25% per season ✓
//   - Species peaking beyond what visitor effort alone explains
//     (salmon spawn, bear hyperphagia) keeps that signal ✓
//   - parkEffort[s] = 0 (truly no visitors) → division by floor avoids NaN
//
// Returns the corrected histogram in the same shape as input (with `total`
// preserved if present), or the input unchanged if parkEffort is null/missing.
function effortCorrectHistogram(hist, parkEffort) {
  if (!hist || !parkEffort) return hist;
  const keys = ['spring', 'summer', 'fall', 'winter'];
  // Floor effort at 1% per season — prevents extreme amplification when a
  // park genuinely has near-zero off-season visitors. Real effect: a species
  // with 1 winter sighting at a park with 1% winter effort gets a corrected
  // distribution that respects the rare-visitor signal but doesn't spike to
  // implausible heights from a single record.
  const corrected = {};
  let total = 0;
  for (const k of keys) {
    const sp = hist[k] ?? 0;
    const eff = Math.max(parkEffort[k] ?? 0, 1);
    const v = sp / eff;
    corrected[k] = v;
    total += v;
  }
  if (total <= 0) return hist;       // species had no obs in any season — bail
  const out = { _effortCorrected: true };
  for (const k of keys) {
    out[k] = Math.round((corrected[k] / total) * 100);
  }
  // Preserve any non-season metadata so downstream consumers don't lose info
  for (const meta of ['total', '_source', '_estimated']) {
    if (hist[meta] != null) out[meta] = hist[meta];
  }
  return out;
}

// Convert an iNat-histogram-style seasonal distribution (percentages of TOTAL
// observations summing to ~100) into per-season encounter probabilities using
// the species' baseline overall frequency.
//
// Why: an iNat histogram alone tells you "what fraction of sightings occur in
// this season", not "what are my chances of seeing the animal in this season".
// Grizzly Bear in Yellowstone with 58% of obs in summer is NOT 58% likely to
// be seen on a summer visit — it's (baseline × concentration) likely, since
// 58% concentration = 2.32× the even-distribution baseline of 25%.
//
//   seasonalProb = baselineProb × (distPct / 25)
//
// Averaging across the 4 seasons returns the baseline — so this is a
// mathematically consistent transform, not a hack.
//
// Pass `parkEffort` to first deconfound visitor seasonality from the histogram
// before applying this transform. Without that step, summer probabilities are
// systematically too high and winter too low for resident species.
function histogramToEncounterProb(hist, baseFrequency, rarity, parkEffort = null) {
  if (!hist) return hist;
  if (hist._converted) return hist; // already transformed
  // Strip visitor-effort confounding before computing encounter prob.
  const corrected = parkEffort ? effortCorrectHistogram(hist, parkEffort) : hist;
  const base = resolveBaselineFrequency(baseFrequency, rarity);
  const baselinePct = base * 100;
  const keys = ['spring', 'summer', 'fall', 'winter'];
  const out = { _source: corrected._source ?? 'inat_hist', _converted: true };
  if (corrected._estimated) out._estimated = true;
  if (corrected._effortCorrected) out._effortCorrected = true;
  let any = false;
  for (const k of keys) {
    const dist = corrected[k];
    if (dist == null) continue;
    // dist is % of obs in this season; 25 = even distribution baseline
    const scaled = baselinePct * (dist / 25);
    out[k] = Math.min(99, Math.max(1, Math.round(scaled)));
    any = true;
  }
  return any ? out : null;
}

function estimateSeasonalFreqFromField(frequency, seasons, rarity) {
  // Flag as estimated when we lean on the rarity-tier floor rather than a
  // species-specific numeric frequency. Use max(raw, tier floor) so curated
  // rarity overrides (e.g. Grizzly: raw 0.05%, rarity "unlikely" floor 15%)
  // don't show implausibly low seasonal percentages.
  const tierFallback = RARITY_FREQ_FALLBACK[rarity] ?? null;
  const raw = frequency ?? 0;
  const f = Math.max(raw, tierFallback ?? 0);
  const usedFallback = frequency == null || (tierFallback != null && tierFallback > raw);
  if (!f || f <= 0 || !seasons?.length) return null;
  const pct = Math.min(99, Math.round(f * 100));
  const active = seasons.includes('year_round')
    ? ['spring', 'summer', 'fall', 'winter']
    : seasons;
  if (!active.length) return null;
  const result = usedFallback ? { _estimated: true } : {};
  active.forEach(s => { result[s] = pct; });
  return result;
}

// ── Migration status badge config ─────────────────────────────────────────────
// Migration status demoted to grayscale — status folds into the season string.
const MIGRATION_BADGES = {
  migratory: {
    emoji: '', label: 'Migratory',
    color: '#6b7280',
    tooltip: 'Passes through during migration — timing your visit to peak migration windows increases your chances of seeing this species',
  },
  partial: {
    emoji: '', label: 'Summer Resident',
    color: '#6b7280',
    tooltip: 'Breeds here in summer and migrates south for winter — best seen May through August',
  },
  winter_visitor: {
    emoji: '', label: 'Winter Visitor',
    color: '#6b7280',
    tooltip: 'Arrives from the north in fall and winters here — best seen November through March',
  },
  year_round: {
    emoji: '', label: 'Year Round',
    color: '#6b7280',
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

// ── Pill semantics — honest about what the percentage actually measures ─────
// The rarity pill on every card displays a tier ("Likely · 30-60%") that means
// different things depending on the underlying data source. Both deep-research
// reviews flagged this as a trust issue: a bird backed by eBird Status & Trends
// is genuinely modeled per-visit encounter probability, but a non-bird backed
// by iNaturalist observation counts is closer to "habitat suitability" or
// "relative observability" — confounded by visitor effort and species
// detectability. Showing identical "X% chance per visit" copy for both is
// implicitly overclaiming for the iNat path.
//
// This helper returns a richer tooltip that names the semantic:
//   - 'encounter'     — eBird Status & Trends: real per-visit encounter prob
//   - 'observability' — iNat density-derived: relative observability index
//   - 'curated'       — hand-curated override: ecologist judgment
//   - 'inventory'     — NPS list only, no observation density: presence-only
//
// The visible pill ("Likely · 30-60%") is unchanged so the UI stays compact;
// the honest qualifier lives in the tooltip and a tiny inline indicator on
// the pill (a faint `~` prefix for observability/inventory tiers).
function resolvePillSemantics(animal, displayRarity, sources) {
  const tier = RARITY[displayRarity] ?? RARITY.rare;
  const range = tier.probability;
  const label = tier.label;
  const isBird = animal.animalType === 'bird';
  const hasEbirdST = animal.seasonFrequencies != null
                  && animal.seasonFrequenciesSource === 'ebird_st';
  const rs = animal.raritySource ?? '';
  const isCurated = rs === 'override' || rs === 'override_curated' || rs === 'curated';
  const npsOnly = sources?.length === 1 && sources[0] === 'nps';

  // County-seeded — checked FIRST because the provenance caveat outranks every
  // other reading. The figure is the surrounding COUNTY's reporting rate, not
  // this park's: every park in the county carries the identical number
  // (Matanuska-Susitna Borough alone has 11, spanning lakeshore sites and
  // alpine Denali State Park). Rendering the bare park-level tier word here
  // promises far more than county data can support.
  if (animal._countySeeded) {
    return {
      kind: 'county',
      title: `${label} (${range}) — from eBird/iNaturalist records for the surrounding COUNTY, not sightings at this exact spot. Every park in the county shares this figure, so read it as "what lives in this area", not a park-level guarantee.`,
      indicator: '~',
    };
  }
  // Encounter probability — eBird Status & Trends models the literal per-
  // checklist probability, which is the cleanest answer to "will I see this
  // on a visit?". Birds with S&T data get this even when other sources are
  // also present.
  if (isBird && hasEbirdST) {
    return {
      kind: 'encounter',
      title: `${label} (${range}) — modeled chance of encountering this species on a typical visit, from eBird Status & Trends weekly occurrence rasters.`,
      indicator: null,
    };
  }
  // Hand-curated override — a known reality the ecologist asserted, often
  // because automated sources were obviously wrong (iNat undercounts bison,
  // etc.). Treat as authoritative.
  if (isCurated) {
    return {
      kind: 'curated',
      title: `${label} (${range}) — hand-curated by a park ecologist. Reflects known visitor encounter rates that automated data sources don't capture well.`,
      indicator: null,
    };
  }
  // NPS-list-only species — we know it's in the park but have no observation
  // density data. Tier comes from the NPS Abundance field (Abundant/Common/
  // Rare/etc.) which is about population density, not detectability.
  if (npsOnly) {
    return {
      kind: 'inventory',
      title: `${label} (${range}) — based on NPS species inventory abundance class (population density, not per-visit probability). No observation-density data for this species at this park.`,
      indicator: '~',
    };
  }
  // Bird with checklist-frequency / county-frequency fallback (no S&T)
  if (isBird) {
    return {
      kind: 'encounter',
      title: `${label} (${range}) — chance of encountering this species on a typical visit, derived from eBird checklist-reporting frequency. Less precise than eBird Status & Trends but still real per-visit data.`,
      indicator: null,
    };
  }
  // Non-bird: iNaturalist observation density.
  // Append a detectability caveat when the species is hard/cryptic — the
  // pill is then a ceiling, not a population estimate.
  const detLevel = classifyDetectability(animal);
  const detSuffix = (detLevel === 'hard' || detLevel === 'cryptic')
    ? ` Detectability: ${DETECTABILITY_LEVELS[detLevel].label.toLowerCase()} — ${DETECTABILITY_LEVELS[detLevel].tooltip}`
    : '';
  return {
    kind: 'observability',
    title: `${label} (${range}) — relative observability estimate based on iNaturalist observation density at this park. This is closer to "how often this species turns up in field reports" than a strict per-visit probability — visitor effort and species detectability are baked in. Treat as a guide rather than a precise number.${detSuffix}`,
    indicator: '~',
  };
}

// ── Fallback activity period + visitor tip (always renderable) ──────────────
// Returns one of 'diurnal' | 'crepuscular' | 'nocturnal' | 'cathemeral' for
// every animal by classifying via name > keyword > animalType default.
function resolveActivityPeriod(animal) {
  if (animal?.activityPeriod && ACTIVITY_PERIOD_UI[animal.activityPeriod]) {
    return animal.activityPeriod;
  }
  return classifyActivityPeriod(animal);
}

const TYPE_HABITAT_HINT = {
  bird:      'treetops, open sky, and water edges',
  mammal:    'meadows, forest edges, and quiet trails',
  reptile:   'sunny rocks, logs, and trail edges',
  amphibian: 'ponds, streams, and damp leaf litter',
  insect:    'wildflowers, streams, and sunny clearings',
  fish:      'clear streams, lake edges, and tide pools',
  marine:    'shorelines, tide pools, and offshore waters',
};

// Keyword → habitat phrase. More specific than the per-type default, so the
// auto-composed tip names where to actually look (raptors over ridgelines,
// waterfowl on ponds, woodpeckers on snags…). Purely associative — general
// habitat knowledge, no park-specific claims to get wrong. Checked in order;
// first match wins. Benefits national + state parks alike.
const HABITAT_KEYWORDS = [
  [/\b(hawk|eagle|falcon|osprey|owl|vulture|kite|harrier|merlin|kestrel|condor|caracara|goshawk)\b/, 'ridgelines, open fields, and tall bare perches'],
  [/\b(duck|goose|geese|swan|merganser|teal|widgeon|wigeon|bufflehead|loon|grebe|cormorant|coot|gallinule|pintail|mallard|gadwall)\b/, 'lakes, ponds, and quiet marshes'],
  [/\b(heron|egret|ibis|bittern|crane|stork|rail|sora|spoonbill)\b/, 'shorelines, mudflats, and marsh edges'],
  [/\b(gull|tern|sandpiper|plover|sanderling|dunlin|yellowlegs|willet|dowitcher|oystercatcher|skimmer|turnstone)\b/, 'beaches, tidal flats, and jetties'],
  [/\b(woodpecker|flicker|sapsucker|nuthatch)\b/, 'mature trees, dead snags, and woodland edges'],
  [/\b(warbler|sparrow|finch|wren|thrush|vireo|chickadee|titmouse|kinglet|gnatcatcher|bunting|tanager|oriole|grosbeak|catbird|towhee)\b/, 'shrubby edges, thickets, and treetops'],
  [/\b(turtle|terrapin|tortoise)\b/, 'basking logs, pond banks, and slow water'],
  [/\b(snake|rattlesnake|copperhead|racer|watersnake)\b/, 'sunny rock piles, logs, and trail edges'],
  [/\b(frog|toad|spring peeper|bullfrog)\b/, 'ponds, vernal pools, and damp leaf litter'],
  [/\b(salamander|newt|mudpuppy)\b/, 'streambeds, springs, and damp logs'],
  [/\b(squirrel|chipmunk|woodchuck|groundhog|marmot)\b/, 'oak woods, stone walls, and trail edges'],
  [/\b(deer|elk|moose|pronghorn)\b/, 'forest edges and meadows at dawn and dusk'],
  [/\b(bat)\b/, 'open water and clearings at dusk'],
  [/\b(fox|coyote|bobcat|otter|mink|weasel|raccoon|opossum|skunk|beaver|muskrat)\b/, 'water edges, field margins, and quiet trails'],
  [/\b(butterfly|skipper|swallowtail|monarch|fritillary|dragonfly|damselfly)\b/, 'sunny wildflower meadows and pond edges'],
];

function resolveHabitatHint(animal) {
  const n = (animal.name ?? '').toLowerCase();
  for (const [re, phrase] of HABITAT_KEYWORDS) if (re.test(n)) return phrase;
  return TYPE_HABITAT_HINT[animal.animalType] ?? 'trails and quiet overlooks';
}

function composeFallbackTip(animal, period) {
  const seasons = animal.displaySeasons ?? animal.seasons ?? [];
  const yearRound = seasons.includes('year-round') || seasons.includes('year_round') || seasons.length >= 4;
  const seasonList = seasons
    .filter(s => s !== 'year-round' && s !== 'year_round')
    .map(s => s.replace('_', ' '));
  const seasonPhrase = yearRound || !seasonList.length
    ? 'year-round'
    : seasonList.length === 1
      ? `in ${seasonList[0]}`
      : `in ${seasonList.slice(0, -1).join(', ')} and ${seasonList[seasonList.length - 1]}`;
  const activityPhrase = period === 'diurnal'     ? 'during daylight hours'
                       : period === 'crepuscular' ? 'at dawn and dusk'
                       : period === 'nocturnal'   ? 'after dark'
                       :                            'any time of day';
  const habitat = resolveHabitatHint(animal);
  const scan = seasonPhrase === 'year-round' ? 'Scan' : `Visit ${seasonPhrase} and scan`;
  return `${scan} ${habitat} — most active ${activityPhrase}. Binoculars help.`;
}

// ── Animal card ───────────────────────────────────────────────────────────────
function AnimalCard({ animal, debugMode, seasonalFreqs, parkEffort = null, location, openAbout, highlightSpecies, activeSeason, activeZone, parkZones = null, onSelectZone = null, effortRescaler = 1, visitTime = 'any', effortLabel = 'casual', seen = false, onToggleSeen = null, communitySightings = null, onCommunityVote = null }) {
  // Combined zone- + season- + effort- + time-of-day-aware rarity.
  //   1. Pick base frequency: zone freq > season freq > park freq.
  //   2. Rescale by effort multiplier (expert=1.54, casual=1.0, drive=0.54 —
  //      relative to the casual baseline baked into the stored frequency).
  //   3. Rescale by activity-period × time-of-day multiplier.
  //   4. Re-map to tier.
  // Community ground-truth count for THIS card's (species, season) bucket.
  const community = useMemo(() => {
    if (!communitySightings) return null;
    const b = communitySightings[sightingsBucketKey(animal.name, activeSeason ?? 'any')];
    if (!b) return null;
    const n = (b.seen ?? 0) + (b.missed ?? 0);
    return n > 0 ? { seen: b.seen ?? 0, n } : null;
  }, [communitySightings, animal.name, activeSeason]);

  const modelRarity = useMemo(
    () => computeEffectiveRarity(animal, {
      activeSeason, activeZone, seasonalFreqs, parkEffort, parkZones, effortRescaler, visitTime,
    }),
    [animal, activeSeason, activeZone, seasonalFreqs, parkEffort, parkZones, effortRescaler, visitTime],
  );
  // Conservatively blend cross-visitor ground truth into the displayed tier
  // (gated by sample size, bounded to ±1 tier). No-op until a bucket has
  // ≥ COMMUNITY_MIN_N votes, so this is dormant until real data accumulates.
  const displayRarity = useMemo(
    () => nudgeRarityWithCommunity(modelRarity, community),
    [modelRarity, community],
  );
  const rarityNudged = displayRarity !== modelRarity;

  const r = RARITY[displayRarity] ?? RARITY.rare;
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
  // Runtime species description — only fetched when the animal has no curated
  // funFact AND no build-time `description` (i.e. live state-park species and
  // non-enriched national-park species). { text, source } | null.
  const [fetchedDesc, setFetchedDesc] = useState(null);
  const wantsRuntimeDesc = needsGeneratedDescription(animal.funFact) && !animal.description;

  // Ground-truth sighting feedback (see src/data/sightingFeedback.js).
  // The context tuple is exactly what makes a verdict useful for
  // calibration: which prediction, in which season/zone/effort/time.
  const sightingCtx = useMemo(() => ({
    parkId: location?.id ?? null,
    species: animal.name,
    scientificName: animal.scientificName ?? null,
    predictedRarity: displayRarity,
    season: activeSeason ?? 'any',
    zone: activeZone ?? null,
    effort: effortLabel,
    visitTime,
  }), [location?.id, animal.name, animal.scientificName, displayRarity, activeSeason, activeZone, effortLabel, visitTime]);
  const [verdict, setVerdict] = useState(() => getSightingVerdict(sightingCtx));
  // Re-sync the shown verdict when the context changes (season/zone/effort
  // switch makes it a different ground-truth question).
  useEffect(() => { setVerdict(getSightingVerdict(sightingCtx)); }, [sightingCtx]);
  const submitVerdict = (v) => {
    if (verdict === v) { clearSighting(sightingCtx); setVerdict(null); }      // toggle off
    else {
      recordSighting(sightingCtx, v); setVerdict(v);
      // Cross-visitor aggregation (state parks): post the vote + optimistically
      // bump the panel's community count. localStorage de-dupes per device, so
      // we only post when SETTING a verdict, not on toggle-off.
      if (onCommunityVote) {
        const seasonBk = activeSeason ?? 'any';
        postSighting({ parkId: location?.id, species: animal.name, season: seasonBk, verdict: v });
        onCommunityVote(animal.name, seasonBk, v);
      }
    }
  };

  // Fetch photo lazily when the card mounts (i.e. when the popup opens)
  useEffect(() => {
    let alive = true;
    fetchAnimalPhoto(animal.name, animal.scientificName).then(p => { if (alive) setPhoto(p); });
    return () => { alive = false; };
  }, [animal.name, animal.scientificName]);

  // Fetch a sourced species description lazily, but only when the card would
  // otherwise show the dry observation-record placeholder. Reuses the cached,
  // species-keyed service so each species is fetched once per device.
  useEffect(() => {
    if (!wantsRuntimeDesc) { setFetchedDesc(null); return; }
    let alive = true;
    fetchAnimalDescription(animal.name, animal.scientificName).then(d => { if (alive) setFetchedDesc(d); });
    return () => { alive = false; };
  }, [animal.name, animal.scientificName, wantsRuntimeDesc]);

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
          <img src={photo.largeUrl} alt={animal.name} className="photo-full__img" loading="lazy" decoding="async" />
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
              <img src={photo.url} alt={animal.name} loading="lazy" decoding="async" />
              <div className="photo-thumb__credit">📷 {photo.credit ?? photo.source}</div>
            </button>
          )}
        </div>

        <div className="animal-card__meta">
          {/* Common name + muted type label */}
          <div className="animal-card__name">
            {animal.name}
            {t && <span className="type-label">{t.label}</span>}
          </div>
          {/* Scientific name subtitle — shown when available */}
          {animal.scientificName && (
            <div className="animal-card__scientific">{animal.scientificName}</div>
          )}
          {/* Personal life-list toggle — the return-visit hook. */}
          {onToggleSeen && (
            <button
              type="button"
              className={`seen-toggle${seen ? ' seen-toggle--on' : ''}`}
              onClick={() => onToggleSeen(animal)}
              aria-pressed={seen}
              title={seen ? 'On your life list — tap to remove' : 'Mark as seen — add to your life list'}
            >
              {seen ? '✓ Seen' : '+ Mark seen'}
            </button>
          )}
          <div className="animal-card__badges">
            {(() => {
              // Honest pill semantics: bird-with-S&T is real per-visit
              // encounter probability; non-bird is observability index.
              // Tooltip names the difference; `~` indicator on observability
              // pills signals "approximate / different unit" without breaking
              // the visual rhythm of the existing badge row.
              const pill = resolvePillSemantics(animal, displayRarity, sources);
              return (
                <span
                  className={`rarity-badge${r.star ? ' rarity-badge--exceptional' : ''}`}
                  // Colour moves to custom properties so the stylesheet can pick a
                  // theme-appropriate text colour. `textColor` is a DARKENED variant
                  // tuned for the pale tint over a white page; on the dark panel that
                  // made things worse, not better (2.5-4.1:1). See index.css.
                  style={{
                    '--rarity-text': r.textColor || r.color,
                    '--rarity-hue':  r.color,
                    background: r.color + '22', borderColor: r.color + '55',
                  }}
                  title={pill.title}
                >
                  {r.emoji && <span className="rarity-badge__glyph" aria-hidden="true">{r.emoji}</span>}
                  {pill.indicator ? <span className="rarity-badge__indicator" aria-hidden="true">{pill.indicator}</span> : null}
                  {r.label}{r.probability ? ` · ${r.probability}` : ''}{r.star ? ' ✦' : ''}
                  {/* Confidence dot — signals how much data backs this rating. */}
                  {animal.confidence && CONFIDENCE_UI[animal.confidence] && (
                    <span
                      className={`confidence-dot confidence-dot--${animal.confidence}`}
                      style={{ color: CONFIDENCE_UI[animal.confidence].color }}
                      title={CONFIDENCE_UI[animal.confidence].tooltip}
                      role="img"
                      aria-label={`${animal.confidence} confidence`}
                    >
                      {CONFIDENCE_UI[animal.confidence].emoji}
                    </span>
                  )}
                </span>
              );
            })()}
            {/* Best-zone hint — only when no zone is selected and a zone
                with materially higher rarity exists. Casual visitors won't
                discover the zone selector on their own; the hint surfaces
                the species' real reliable-viewing site. Click to switch. */}
            {!activeZone && (() => {
              const hint = getBestZoneHint(animal, parkZones, displayRarity);
              if (!hint) return null;
              const zoneTierUI = RARITY[hint.zoneTier] ?? RARITY.likely;
              const tooltip = `Best chance: ${hint.zoneLabel} — ${hint.zoneTierLabel} (${hint.zoneRange})${hint.rationale ? '. ' + hint.rationale : ''}. Tap to switch the zone filter.`;
              const handler = onSelectZone
                ? () => onSelectZone(hint.zoneId)
                : undefined;
              return (
                <button
                  type="button"
                  className="best-zone-hint"
                  style={{ color: zoneTierUI.color, borderColor: zoneTierUI.color + '55', background: zoneTierUI.color + '12' }}
                  title={tooltip}
                  onClick={handler}
                  disabled={!handler}
                >
                  💡 Best at {hint.zoneLabel.replace(/\s*\([^)]*\)\s*$/, '')}: {hint.zoneTierLabel.toLowerCase()}
                </button>
              );
            })()}
            {openAbout && (
              <button
                className="rarity-help-btn"
                onClick={() => openAbout('methodology')}
                title="Learn how we calculate encounter probability"
                aria-label="How is this calculated?"
              >?</button>
            )}
            {/* Seasonal frequency percentages — all animal types.
                Primary source: iNat monthly histogram (fetched lazily, 30-day cache).
                Fallback: estimate from overall frequency field spread across active seasons. */}
            {(() => {
              const sciKey = animal.scientificName?.toLowerCase();
              // histFreq: null = fetched but <5 obs; undefined = not yet fetched / no sciName
              const rawHistFreq = sciKey ? seasonalFreqs?.[sciKey] : undefined;
              // Convert iNat distribution histogram → seasonal encounter probability
              // so "Summer 35%" means "35% chance per visit in summer", not
              // "35% of observations were recorded in summer".
              const histFreq = rawHistFreq
                ? histogramToEncounterProb(
                    rawHistFreq,
                    animal.frequency ?? animal._debug?.frequency,
                    animal.rarity,
                    parkEffort,
                  )
                : rawHistFreq;
              // Priority: live iNat histogram > prebuilt eBird S&T > rarity-tier estimate.
              // Using the prebuilt S&T data avoids the ~est flag for ~19k birds where
              // seasonal probabilities were computed at build time.
              const builtInFreq = histFreq == null
                ? freqFromBuiltInSeasonFrequencies(animal.seasonFrequencies)
                : null;
              const freq = (histFreq != null && histFreq !== undefined)
                ? histFreq
                : (builtInFreq
                    ?? estimateSeasonalFreqFromField(
                      animal.frequency ?? animal._debug?.frequency,
                      animal.seasons,
                      animal.rarity,
                    ));
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
                    ~{pct}% chance per visit
                    <span className="freq-est-flag" title="Estimated from rarity tier">~est</span>
                    {fetchInFlight && (
                      <span className="freq-loading" title="Loading accurate seasonal data from iNaturalist…">↻</span>
                    )}
                  </div>
                );
              }
              const isEstimated = freq._estimated === true;
              const SEASON_KEYS = ['spring', 'summer', 'fall', 'winter'];
              const SEASON_LABEL = { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' };
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
                          ? `~${pct}% estimated chance of seeing this animal per visit in ${s} (from overall encounter rate)`
                          : `~${pct}% estimated chance of seeing this animal per visit in ${s} (from iNaturalist seasonal observations)`}
                      >
                        {SEASON_LABEL[s]} {pct}%
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

      {/* Description — 3-tier hierarchy with source badge.
          Priority: curated funFact → enriched description → raw placeholder (fallback so the card is never blank). */}
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
          : fetchedDesc?.text
            ? <>
                <p className="animal-card__fact">{fetchedDesc.text}</p>
                <span className="description-source">
                  {DESC_SOURCE_ICON[fetchedDesc.source] ?? '📖'}{' '}
                  {DESC_SOURCE_LABEL[fetchedDesc.source] ?? fetchedDesc.source}
                </span>
              </>
            : animal.funFact
              ? <>
                  <p className="animal-card__fact animal-card__fact--placeholder">{animal.funFact}</p>
                  <span className="description-source">📊 Observation record</span>
                </>
              : <>
                  <p className="animal-card__fact animal-card__fact--placeholder">
                    Documented presence at {location?.name ?? 'this park'} — species description coming soon.
                  </p>
                  <span className="description-source">📊 Park record</span>
                </>
      ) : (
        <>
          <p className="animal-card__fact">{animal.funFact}</p>
          <span className="description-source">🏛️ Park Naturalist</span>
        </>
      )}

      {/* Park-specific visitor tip — falls back to auto-composed when absent */}
      {(() => {
        const period  = resolveActivityPeriod(animal);
        const tipText = animal.parkTip ?? composeFallbackTip(animal, period);
        const isAuto  = !animal.parkTip;
        return (
          <div className="animal-card__park-tip">
            <p className="animal-card__park-tip-text">{tipText}</p>
            <span className="park-tip-source" title={isAuto ? 'Composed from seasons + activity period' : 'Park-specific tip'}>
              📍 Visitor Tip
            </span>
          </div>
        );
      })()}

      {/* Best-time-to-view — classified from name/keyword/type when missing */}
      {(() => {
        const period = resolveActivityPeriod(animal);
        const ap = ACTIVITY_PERIOD_UI[period];
        if (!ap) return null;
        return (
          <div className="best-time" title={ap.tooltip}>
            <span className="best-time__label">Best time to view</span>
            <span className="best-time__value">{ap.emoji} {ap.label}</span>
          </div>
        );
      })()}
      {/* Concentration-event peak window — surfaces curated week-precision
          peak data when the user has selected a zone with a known event
          (Cataloochee elk rut, Brooks Falls salmon run, Carlsbad bat
          flight, etc.). Subtle chip below the best-time-to-view row so
          peak-timing-aware visitors can plan their trip. */}
      {(() => {
        if (!activeZone) return null;
        const peak = animal.zones?.[activeZone]?.peakWindow;
        if (!peak?.label) return null;
        return (
          <div className="best-time best-time--peak" title="Curated peak window for this concentration event — sightings approach guaranteed during this window, drop sharply outside it.">
            <span className="best-time__label">Concentration peak</span>
            <span className="best-time__value">🎯 {peak.label}</span>
          </div>
        );
      })()}
      {/* Ground-truth feedback — anonymous, localStorage-only. Turns the
          99.4% of unanchored predictions into a real visitor-encounter
          signal the maintainer can fold back into calibration. */}
      <div className="sighting-feedback" title="Anonymous, stored only in your browser. Helps calibrate sighting odds.">
        <span className="sighting-feedback__q">Did you see this here?</span>
        <button
          type="button"
          className={`sighting-feedback__btn${verdict === 'seen' ? ' is-active is-seen' : ''}`}
          aria-pressed={verdict === 'seen'}
          onClick={() => submitVerdict('seen')}
        >👍 Saw it</button>
        <button
          type="button"
          className={`sighting-feedback__btn${verdict === 'missed' ? ' is-active is-missed' : ''}`}
          aria-pressed={verdict === 'missed'}
          onClick={() => submitVerdict('missed')}
        >👎 Didn’t</button>
        {verdict && <span className="sighting-feedback__thanks">✓ thanks</span>}
      </div>

      {/* Cross-visitor ground truth — real seen-rate from other visitors'
          votes for this species + season at this park. Once a bucket has
          enough votes it conservatively refines the odds above (±1 tier). */}
      {community && (
        <div className="sighting-community" title="Anonymous community reports for this species and season at this park.">
          🧭 <strong>{community.seen}</strong> of <strong>{community.n}</strong> visitor{community.n === 1 ? '' : 's'} saw this here
          {rarityNudged && <span className="sighting-community__adj"> · refining the odds</span>}
        </div>
      )}

      {(() => {
        const segments = [];
        const displaySeasons = animal.displaySeasons ?? [animal.bestSeason ?? 'spring'];
        if (displaySeasons.length) {
          const seasonText = (displaySeasons.includes('year-round') || displaySeasons.includes('year_round'))
            ? 'Year-round'
            : displaySeasons.map(sk => (SEASONS[sk]?.label ?? sk)).join(' · ');
          segments.push(<span key="season">{seasonText}</span>);
        }
        if (animal.animalType === 'bird') {
          const ms = animal.migrationStatus ?? deriveMigrationStatus(animal.seasons);
          const mb = ms ? MIGRATION_BADGES[ms] : null;
          if (mb) segments.push(<span key="mig" title={mb.tooltip}>{mb.label}</span>);
        }
        if (sources.length) {
          const sourceParts = sources.map(s => {
            const icon = SOURCE_ICONS[s];
            return `${icon ? icon + ' ' : ''}${SOURCE_LABELS[s] ?? s}`;
          });
          segments.push(
            <span
              key="src"
              title={sources.length >= 2 ? 'Presence confirmed by two or more independent databases' : (SOURCE_TOOLTIPS[sources[0]] ?? '')}
            >
              via {sourceParts.join(', ')}{sources.length >= 2 ? ' · ✓ verified' : ''}
            </span>
          );
        }
        if (!segments.length) return null;
        return (
          <div className="animal-card__footer">
            {segments.map((seg, i) => (
              <span key={i} className="animal-card__footer-seg">
                {seg}
                {i < segments.length - 1 && <span className="animal-card__footer-sep"> · </span>}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Debug panel — only shown when debug mode is active (D key) */}
      {debugMode && (
        <div className="debug-panel">
          <div className="debug-panel__title">🐛 Debug Info</div>
          <div className="debug-row">
            <span className="debug-label">📥 Sightings</span>
            <span className="debug-value">
              {getAllSightings().length} logged{' '}
              <button
                type="button"
                className="debug-export-btn"
                onClick={(e) => { e.stopPropagation(); exportSightings(); }}
                title="Download anonymous sighting-feedback JSON (raw + per-bucket empirical seen-rate) to refine calibration offline"
              >export ⬇</button>
            </span>
          </div>
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
function ExceptionalCard({ animal, seasonalFreqs, parkEffort = null, location }) {
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
          <img src={photo.largeUrl} alt={animal.name} className="photo-full__img" loading="lazy" decoding="async" />
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
              <img src={photo.url} alt={animal.name} loading="lazy" decoding="async" />
              <div className="photo-thumb__credit">📷 {photo.credit ?? photo.source}</div>
            </button>
          )}
        </div>

        <div className="exceptional-card__info">
          <div className="exceptional-card__name">
            {animal.name}
            {t && <span className="type-label">{t.label}</span>}
          </div>
          {animal.scientificName && (
            <div className="animal-card__scientific">{animal.scientificName}</div>
          )}
          <span className="rarity-badge rarity-badge--exceptional" style={{ color: '#9c4b8a', background: '#9c4b8a22', borderColor: '#9c4b8a55' }}>
            ⭐ Exceptional
          </span>
          {/* Exceptional chance — single prominent line; always shown for exceptional tier */}
          {(() => {
            const sciKey = animal.scientificName?.toLowerCase();
            const rawHistFreq = sciKey ? seasonalFreqs?.[sciKey] : undefined;
            const histFreq = rawHistFreq
              ? histogramToEncounterProb(
                  rawHistFreq,
                  animal.frequency ?? animal._debug?.frequency,
                  animal.rarity,
                  parkEffort,
                )
              : rawHistFreq;
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
          : animal.funFact
            ? <>
                <p className="exceptional-card__fact">{animal.funFact}</p>
                <span className="description-source">📊 Observation record</span>
              </>
            : <>
                <p className="exceptional-card__fact">
                  Rare sighting — documented at {location?.name ?? 'this park'} but seldom observed.
                </p>
                <span className="description-source">📊 Park record</span>
              </>
      ) : (
        <>
          <p className="exceptional-card__fact">{animal.funFact}</p>
          <span className="description-source">🏛️ Park Naturalist</span>
        </>
      )}

      {/* Visitor tip + Best time to view — always rendered (auto when missing) */}
      {(() => {
        const period  = resolveActivityPeriod(animal);
        const tipText = animal.parkTip ?? composeFallbackTip(animal, period);
        const isAuto  = !animal.parkTip;
        const ap      = ACTIVITY_PERIOD_UI[period];
        return (
          <>
            <div className="animal-card__park-tip">
              <p className="animal-card__park-tip-text">{tipText}</p>
              <span className="park-tip-source" title={isAuto ? 'Composed from seasons + activity period' : 'Park-specific tip'}>
                📍 Visitor Tip
              </span>
            </div>
            {ap && (
              <div className="best-time" title={ap.tooltip}>
                <span className="best-time__label">Best time to view</span>
                <span className="best-time__value">{ap.emoji} {ap.label}</span>
              </div>
            )}
          </>
        );
      })()}

      {/* Muted footer: sources only — exceptionals rarely have season data worth surfacing here */}
      {(() => {
        const excSources = resolveAnimalSources(animal);
        if (!excSources.length) return null;
        const sourceText = 'via ' + excSources.map(s => SOURCE_LABELS[s] ?? s).join(', ');
        return (
          <div className="animal-card__footer">
            <span
              className="animal-card__footer-seg"
              title={excSources.length >= 2 ? 'Presence confirmed by two or more independent databases' : (SOURCE_TOOLTIPS[excSources[0]] ?? '')}
            >
              {sourceText}{excSources.length >= 2 ? ' · verified' : ''}
            </span>
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
// Sequential ramp matches RARITY in wildlifeData.js. The spectrum serves double
// duty: it filters on click AND shows the park's actual rarity composition.
const SPECTRUM_CONFIG = [
  { key: 'guaranteed',  color: '#1a6640', label: 'Guaranteed',  emoji: '' },
  { key: 'very_likely', color: '#4a8557', label: 'Very Likely', emoji: '' },
  { key: 'likely',      color: '#8a7a3e', label: 'Likely',      emoji: '' },
  { key: 'unlikely',    color: '#a06a44', label: 'Unlikely',    emoji: '' },
  { key: 'rare',        color: '#9a5248', label: 'Rare',        emoji: '' },
  { key: 'exceptional', color: '#7a4e6e', label: 'Exceptional', emoji: '' },
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
      <div className="rarity-spectrum__axis">
        <span className="rarity-spectrum__axis-left">← more likely</span>
        <span className="rarity-spectrum__axis-right">less likely →</span>
      </div>
      <div className="rarity-spectrum__bar">
        {SPECTRUM_CONFIG.map(({ key, color, label }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const pct = (count / total * 100).toFixed(1);
          const isActive = activeRarity === key;
          return (
            <button
              key={key}
              className={`rarity-spectrum__seg${isActive ? ' rarity-spectrum__seg--active' : ''}`}
              style={{ flex: count, background: color + (isActive ? '' : 'cc'), outline: isActive ? `2px solid ${color}` : 'none' }}
              title={`${label}: ${count} species (${pct}%) — click to filter`}
              onClick={() => onSelectRarity(isActive ? 'all' : key)}
              aria-pressed={isActive}
            />
          );
        })}
      </div>
      <div className="rarity-spectrum__legend">
        {SPECTRUM_CONFIG.map(({ key, color, label }) => {
          const count = counts[key] ?? 0;
          if (count === 0) return null;
          const isActive = activeRarity === key;
          return (
            <button
              key={key}
              className={`rarity-spectrum__tier${isActive ? ' rarity-spectrum__tier--active' : ''}`}
              style={{ '--seg-color': color }}
              onClick={() => onSelectRarity(isActive ? 'all' : key)}
              title={`Filter to ${label} only`}
            >
              <span className="rarity-spectrum__tier-label">{label}</span>
              <span className="rarity-spectrum__tier-count">· {count}</span>
            </button>
          );
        })}
        {activeRarity !== 'all' && (
          <button className="rarity-spectrum__clear" onClick={() => onSelectRarity('all')}>
            clear
          </button>
        )}
      </div>
    </div>
  );
}

function LocationPopup({ location, heroImage, heroAlt, effectiveAnimals, season, rarity, animalType,
  isLive, sources, isLoading, debugMode, stats, cacheTs, countySeeded,
  loadingProgress, refreshLocation,
  popupType, setPopupType, popupSort, setPopupSort,
  popupSeason, setPopupSeason, popupRarity, setPopupRarity,
  popupSubtype, setPopupSubtype,
  activeTypes, focusedType, openAbout, highlightSpecies, onOpenLifeList,
  visitorEffort, setVisitorEffort,
  visitTime, setVisitTime }) {
  const POPUP_PROGRESS_GROUPS = ['birds', 'mammals', 'reptiles', 'amphibians', 'insects', 'marine'];
  const PROGRESS_EMOJI = { birds: '🐦', mammals: '🦌', reptiles: '🐊', amphibians: '🐸', insects: '🦋', marine: '🐋' };

  // Hero fallback for units with no NPS photo (refuges, a few NPS units):
  // the same junk-filtered Wikipedia/Commons lookup the state parks use.
  // NPS photos are public domain (no credit line); Wikimedia ones get the
  // attribution link required by their CC licenses.
  const [wikiHero, setWikiHero] = useState(null);
  const [showHero, toggleHero] = useHeroPreference();
  useEffect(() => {
    let alive = true;
    setWikiHero(null);
    // Prefer the Wikipedia LEAD image — for national parks it's the editor-curated
    // iconic landscape (Wind Cave returns the cave itself, not a stray bison from
    // the NPS photo set). The NPS image is only the fallback below.
    fetchWikiParkImage(location.name, location.lat, location.lng, location.id)
      .then(img => { if (alive) setWikiHero(img); });
    return () => { alive = false; };
  }, [location.id]);
  // Wikipedia lead (with attribution) wins; fall back to the NPS scenery photo
  // (public domain, no credit) only when Wikipedia has nothing usable.
  const effectiveHero = wikiHero || (heroImage ? { src: heroImage, credit: null } : null);

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const monthName    = MONTH_NAMES[currentMonth - 1];

  // Search resets when popup switches to a different location
  const [search, setSearch] = useState('');
  useEffect(() => { setSearch(''); }, [location.id]);
  const searchTrackTimerRef = useRef(null);

  // Zone filter (only used for mega-parks with zones defined in parkZones.js)
  const availableZones = useMemo(() => getParkZones(location.id), [location.id]);
  const [popupZone, setPopupZone] = useState('all');
  useEffect(() => { setPopupZone('all'); }, [location.id]);

  // Personal life list (localStorage, via services/seenList). seenVersion is
  // bumped on every toggle so the progress chip + seen-filter + cards all
  // re-derive from one localStorage read per render pass (seenKeys memo).
  const [seenVersion, setSeenVersion] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [seenFilter, setSeenFilter] = useState('all'); // 'all' | 'unseen' | 'seen'
  useEffect(() => { setSeenFilter('all'); }, [location.id]);
  const seenKeys = useMemo(() => getSeenKeySet(), [seenVersion]);
  const markSeenToggle = useCallback((animal) => {
    const nowSeen = toggleSeen(animal, { parkId: location.id, parkName: location.name });
    setSeenVersion(v => v + 1);
    // Usage signal for the keep/cut decision (no PII; species name only,
    // same as the existing animal_view / report_sighting events).
    track('seen_toggle', { added: !!nowSeen, animal: animal?.name, park: location.name });
  }, [location.id, location.name]);

  // Resolve the effective visitor effort for this park:
  //   • If user picked 'auto', use park baseline (or casual default).
  //   • Otherwise respect user choice.
  // Build-time rarity was computed with 'casual' (0.65). When the effective
  // effort differs, we rescale frequency by (effectiveScalar / buildScalar)
  // and re-map to tier at render time.
  const effectiveEffort = visitorEffort === 'auto'
    ? (PARK_EFFORT_BASELINES[location.id] ?? DEFAULT_VISITOR_EFFORT)
    : visitorEffort;
  const effortRescaler = useMemo(() => {
    const buildScalar = VISITOR_EFFORT.casual;               // build-time scalar
    const userScalar  = VISITOR_EFFORT[effectiveEffort] ?? VISITOR_EFFORT.casual;
    return userScalar / buildScalar;                         // 1.0 = no change
  }, [effectiveEffort]);

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

  // Park-wide observer-effort baseline — used to deconfound species seasonal
  // histograms from visitor seasonality (more visitors in summer ≠ animal more
  // present in summer). Fetched once per park, 90-day localStorage cache.
  // null = still loading or park has too few total obs to compute a baseline,
  // in which case all downstream consumers gracefully fall back to the raw
  // (uncorrected) histogram so the pipeline never breaks.
  const [parkEffort, setParkEffort] = useState(null);

  // Reset when the popup switches to a different location
  useEffect(() => {
    freqFetchedRef.current = new Set();
    setSeasonalFreqs({});
    setParkEffort(null);
  }, [location.id]);

  // Fire-and-forget fetch for the park-wide effort baseline. One call per park
  // for the lifetime of this popup; cached cross-session for 90 days.
  useEffect(() => {
    let alive = true;
    fetchInatParkMonthlyEffort(location.lat, location.lng, location.id).then(eff => {
      if (alive) setParkEffort(eff);
    });
    return () => { alive = false; };
  }, [location.id, location.lat, location.lng]);

  // Cross-visitor sighting aggregates for this park (api/sightings) — same
  // backend as state parks; empty + no-op until the datastore is connected.
  const [npCommunity, setNpCommunity] = useState({ buckets: {}, configured: false });
  useEffect(() => {
    let alive = true;
    setNpCommunity({ buckets: {}, configured: false });
    fetchParkSightings(location.id).then(r => { if (alive) setNpCommunity(r); });
    return () => { alive = false; };
  }, [location.id]);
  const bumpNpCommunity = useCallback((species, season, verdict) => {
    setNpCommunity(prev => {
      const bk = sightingsBucketKey(species, season);
      const cur = prev.buckets[bk] ?? { seen: 0, missed: 0 };
      return { ...prev, buckets: { ...prev.buckets, [bk]: { ...cur, [verdict]: (cur[verdict] ?? 0) + 1 } } };
    });
  }, []);

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
    const sorted = withSciName.sort((a, b) => {
      // Use Math.max(numeric freq, rarity-derived freq) so:
      // • Species with a good numeric frequency (e.g. Ruffed Grouse 0.046) are never
      //   demoted by the rarity fallback injection.
      // • Species with frequency: undefined but a known rarity (e.g. Common Loon
      //   "likely" → 0.40) are promoted above low-frequency eBird-only species.
      const fa = Math.max(a.frequency ?? 0, RARITY_FREQ_FALLBACK[a.rarity] ?? 0);
      const fb = Math.max(b.frequency ?? 0, RARITY_FREQ_FALLBACK[b.rarity] ?? 0);
      return fb - fa;
    });
    const top500 = sorted.slice(0, 500);
    // Force-include ALL vertebrates regardless of rank so mammals / reptiles /
    // amphibians don't sit on permanent ~est flags. Non-vertebrate tail (insects,
    // plants, fungi) is capped by the top500 cut above to keep the queue bounded.
    const top500Keys = new Set(top500.map(a => a.scientificName));
    const vertExtras = sorted.filter(a =>
      !top500Keys.has(a.scientificName) &&
      ['mammal', 'reptile', 'amphibian', 'bird', 'fish'].includes(a.animalType)
    );
    const birds = [...top500, ...vertExtras];
    if (!birds.length) return;
    let alive = true;
    const CONCURRENCY = 6;
    // Skip species that already have real built-in season data (eBird S&T) —
    // their badges are accurate without a live fetch and we can drop ~19k birds
    // worth of network calls on popup open. The lazy fetch still runs for the
    // remainder so iNat-specific histograms get layered in when available.
    const queue = birds.filter(b => {
      const key = b.scientificName.toLowerCase();
      if (freqFetchedRef.current.has(key)) return false;
      if (b.seasonFrequencies && b.seasonFrequenciesSource === 'ebird_st') return false;
      return true;
    });
    let cursor = 0;
    const worker = async () => {
      while (alive) {
        const idx = cursor++;
        if (idx >= queue.length) return;
        const bird = queue[idx];
        const key = bird.scientificName.toLowerCase();
        if (freqFetchedRef.current.has(key)) continue;
        freqFetchedRef.current.add(key);
        const result = await fetchInatMonthlyHist(
          location.lat, location.lng, location.id, bird.scientificName,
        );
        if (!alive) return;
        setSeasonalFreqs(prev => ({ ...prev, [key]: result }));
      }
    };
    Promise.all(Array.from({ length: CONCURRENCY }, worker));
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

    // When a curated rarity override applies, also clamp frequency to that
    // tier's ceiling. Otherwise the live iNat fetch's frequency proxy
    // (obsCount/500 — line 791 of apiService.js) can leak a high baseline
    // into seasonal computations even though the override correctly tiers
    // the species lower. Concrete bug it fixes: Grizzly Bear at Yellowstone
    // has 213 iNat obs → freq 0.426. Override says "unlikely" (≤30%
    // ceiling). Without clamping, histogramToEncounterProb uses 42.6% as
    // baseline → multiplies seasonal distPct by ~1.7× → summer pill jumps
    // to "very_likely 99%" despite the override saying unlikely 15-30%.
    function clampFrequencyToTier(freq, rarity) {
      if (freq == null || rarity == null) return freq;
      const ceiling = TIER_CEILING[rarity];
      return ceiling != null ? Math.min(freq, ceiling) : freq;
    }

    if (a.frequency != null && factor !== 1) {
      // Fallback path: apply correction to the existing raw frequency
      const correctedFreq = Math.min(1, a.frequency * factor);
      let ebirdRarity = rarityFromChecklist(correctedFreq);
      // Live-only animals cannot be Exceptional — only hand-curated entries can
      if (!a._curated && ebirdRarity === 'exceptional') ebirdRarity = 'rare';
      const computedRarity = applyRarityOverride(location.id, a.name, ebirdRarity);
      const clampedFreq = clampFrequencyToTier(correctedFreq, computedRarity);
      return { ...a, displaySeasons, rarity: computedRarity, frequency: clampedFreq };
    }

    // Apply park-specific override (e.g. Bison at Yellowstone = guaranteed)
    // Live-only animals: cap exceptional at rare — only curated entries can be exceptional
    const baseRarity = (!a._curated && a.rarity === 'exceptional') ? 'rare' : a.rarity;
    const overriddenRarity = applyRarityOverride(location.id, a.name, baseRarity);
    const clampedFreq = clampFrequencyToTier(a.frequency, overriddenRarity);
    return {
      ...a,
      displaySeasons,
      rarity: overriddenRarity,
      ...(clampedFreq !== a.frequency ? { frequency: clampedFreq } : {}),
    };
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

  // Display page size — 25 initially (reduces initial DOM + photo-fetch storm),
  // +50 per Load More click.
  const [displayLimit, setDisplayLimit] = useState(25);

  // Reset paging whenever the location or any filter changes
  useEffect(() => { setDisplayLimit(25); }, [location.id]);
  useEffect(() => { setDisplayLimit(25); }, [activeTypes, popupSubtype, popupSeason, popupRarity, popupZone, search, popupSort]);

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

    if (popupRarity !== 'all') {
      // When a zone is active, filter by the zone's effective rarity (if known),
      // so the rarity filter matches the tier the card actually displays.
      result = result.filter(a => {
        const effective = (popupZone !== 'all' && a.zones?.[popupZone]?.rarity) || a.rarity;
        return effective === popupRarity;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.scientificName?.toLowerCase().includes(q)
      );
    }

    // Life-list filter — "what's left to find here" is the core return-visit
    // view, so unseen/seen narrowing happens before sort.
    if (seenFilter !== 'all') {
      result = result.filter(a => {
        const s = seenKeys.has(speciesKey(a));
        return seenFilter === 'seen' ? s : !s;
      });
    }

    if (popupSort === 'iconic-first') {
      result = [...result].sort(iconicSortFn);
    } else if (popupSort === 'common-first' || popupSort === 'rarest-first') {
      // Sort by the SAME effective rarity tier the card pill displays —
      // not the raw stored `animal.rarity` field. Otherwise an animal with
      // stored "unlikely" but a curated tier-floor override that bumps the
      // pill to "very_likely" would sort as if it were unlikely, making the
      // sort visibly disagree with the card it's reordering.
      const effRarityCache = new Map();
      const eff = (a) => {
        if (effRarityCache.has(a)) return effRarityCache.get(a);
        const r = computeEffectiveRarity(a, {
          activeSeason: popupSeason !== 'all' ? popupSeason : null,
          activeZone:   popupZone   !== 'all' ? popupZone   : null,
          seasonalFreqs, parkEffort, parkZones: availableZones, effortRescaler, visitTime,
        });
        effRarityCache.set(a, r);
        return r;
      };
      // Tie-break alphabetically so equal tiers have a stable, intuitive order.
      const dir = popupSort === 'common-first' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const d = ((_RARITY_ORDER[eff(a)] ?? 5) - (_RARITY_ORDER[eff(b)] ?? 5)) * dir;
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
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
      || popupSeason !== 'all' || popupRarity !== 'all' || !!search.trim()
      || seenFilter !== 'all';

    return { display: result, isFiltered };
  }, [enriched, activeTypes, popupSubtype, popupSeason, popupRarity, popupZone, search, popupSort, focusedType, seasonalFreqs, parkEffort, effortRescaler, visitTime, highlightSpecies, seenFilter, seenKeys]);

  // Life-list progress for THIS park (de-duped; pct can't exceed 100).
  const lifeProgress = useMemo(() => parkProgress(enriched), [enriched, seenVersion]);
  // Global life-list milestone (counting-up goal ladder).
  const milestone = useMemo(() => getMilestone(getSeenCount()), [seenVersion]);

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
        <ParkHero hero={effectiveHero} parkId={location.id} parkName={location.name} showHero={showHero} onToggle={toggleHero}
                  onFlag={() => setWikiHero(null)} />
        <div className="lp__name">{location.name}</div>
        <div className="lp__meta">
          <span className="lp__state">{location.state}</span>
          {parkStyle && (
            <span className="lp__park-badge" style={{ background: parkStyle.bg }}>
              {location.npsKind ? `${NPS_KIND_EMOJI[location.npsKind] ?? '🏔️'} ${location.npsKind}` : parkStyle.label}
            </span>
          )}
        </div>
        {/* Park actions — directions, shareable link, manual refresh.
            Rendered as a row BELOW the hero (on the dark header) so they never
            collide with the photo's own controls and stay legible on any image. */}
        <div className="lp__actions">
          <a
            className="lp__action-btn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
            target="_blank" rel="noopener noreferrer"
            aria-label={`Get directions to ${location.name}`}
            title="Open directions in your maps app"
          >🧭 Directions</a>
          <a
            className="lp__action-btn"
            href={trailsUrl(location.lat, location.lng)}
            target="_blank" rel="noopener noreferrer"
            aria-label={`See hiking trails at ${location.name}`}
            title="See hiking trails & routes (AllTrails)"
          >🥾 Trails</a>
          <button
            className="lp__action-btn"
            aria-label={`Copy a shareable link to ${location.name}`}
            title="Copy shareable link"
            onClick={async () => {
              const link = `${window.location.origin}/park/${encodeURIComponent(location.id)}`;
              try {
                await navigator.clipboard.writeText(link);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              } catch {
                window.prompt('Copy this link:', link);
              }
            }}
          >{shareCopied ? '✓ Link copied' : '🔗 Share'}</button>
          {!isLoading && (
            <button className="lp__action-btn" onClick={() => refreshLocation(location.id)}
              aria-label="Refresh wildlife data" title="Refresh live data">↻ Refresh</button>
          )}
        </div>
        {/* ── Data attribution line ─────────────────────────────────────── */}
        {isLive && (() => {
          const liveSrcs = [...new Set(sources.filter(s => s !== 'static' && s !== 'estimated'))];
          return (
            <div className="lp__source-attr">
              {cacheTs && !isLoading
                ? <span title="Data loaded from local cache">◉ {formatCacheAge(cacheTs)} · </span>
                : <span title="Live data">● Live · </span>
              }
              {liveSrcs.length
                ? renderSourceAttr(sources)
                : <><a className="lp__source-link" href="https://www.nps.gov" target="_blank" rel="noopener noreferrer">National Park Service</a> · Park Records</>}
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
        {/* County-level fallback — live sightings were thin, so the bird list is
            seeded from the surrounding county's eBird checklists (honest about
            the source so visitors trust it). */}
        {countySeeded && (
          <div className="lp__banner" role="note">
            <strong>Some entries are county-wide.</strong> Live sightings were sparse here just
            now, so the list is topped up with species documented in the surrounding county
            (eBird + iNaturalist). Those carry a <code>~</code> on their likelihood badge — the
            rest is recorded at this park.
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

                {/* Always-visible key — this nuance used to live only in
                    hover tooltips, invisible on touch + to keyboard users. */}
                <div className="lp__legend" aria-label="Rating key">
                  <span><span className="lp__legend-dot lp__legend-dot--high">●</span> strong data</span>
                  <span><span className="lp__legend-dot lp__legend-dot--med">◐</span> moderate</span>
                  <span><span className="lp__legend-dot lp__legend-dot--low">○</span> thin — approximate</span>
                  <span><span className="lp__legend-tilde">~</span> observability, not a per-visit %</span>
                </div>

                {/* ── Life-list bar: progress + what's-left filter + export ── */}
                <div className="lifelist-bar">
                  <span
                    className="lifelist-bar__progress"
                    title={`${lifeProgress.seen} logged at ${location.name} · ${milestone.count} on your life list${milestone.current ? ` · rank: ${milestone.current.label}` : ''}`}
                  >
                    🏅 <strong>{lifeProgress.seen}</strong> seen here
                    {milestone.count > 0 && (
                      <> · <strong>{milestone.count}</strong> on your life list
                        {milestone.current && (
                          <span className="lifelist-bar__rank"> · {milestone.current.label}</span>
                        )}
                        {milestone.next && (
                          <span className="lifelist-bar__next"> · {milestone.toNext} to {milestone.next.label}</span>
                        )}
                      </>
                    )}
                  </span>
                  <span className="lifelist-bar__seg" role="group" aria-label="Filter by seen status">
                    {[['all', 'All'], ['unseen', 'To find'], ['seen', 'Seen']].map(([v, lbl]) => (
                      <button
                        key={v}
                        type="button"
                        className={`lifelist-bar__seg-btn${seenFilter === v ? ' is-active' : ''}`}
                        aria-pressed={seenFilter === v}
                        onClick={() => { setSeenFilter(v); setDisplayLimit(50); track('lifelist_filter', { filter: v }); }}
                      >
                        {lbl}
                      </button>
                    ))}
                  </span>
                  {getSeenCount() > 0 && (
                    <button
                      type="button"
                      className="lifelist-bar__export"
                      onClick={() => { track('lifelist_open'); onOpenLifeList?.(); }}
                      title="View your full wildlife life list"
                    >
                      📖 My list ({getSeenCount()})
                    </button>
                  )}
                </div>

                {visibleList.map((a, i) => <AnimalCard key={`${a.name}-${i}`} animal={a} debugMode={debugMode} seasonalFreqs={seasonalFreqs} parkEffort={parkEffort} location={location} openAbout={openAbout} highlightSpecies={highlightSpecies} activeSeason={popupSeason !== 'all' ? popupSeason : null} activeZone={popupZone !== 'all' ? popupZone : null} parkZones={availableZones} onSelectZone={setPopupZone} effortRescaler={effortRescaler} visitTime={visitTime} effortLabel={effectiveEffort} seen={seenKeys.has(speciesKey(a))} onToggleSeen={markSeenToggle} communitySightings={npCommunity.buckets} onCommunityVote={bumpNpCommunity} />)}
                {hasMore && (
                  <div className="lp__load-more-row">
                    <button className="lp__load-more-btn" onClick={() => setDisplayLimit(d => d + 50)}>
                      Load 50 more · {remaining} remaining
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
function MapLegend({ kinds, hiddenKinds, onToggle, onBrowseStateParks }) {
  // Collapsed by default on phones — the full chip set eats ~15% of a small
  // screen. The title row toggles it; desktop starts open as before.
  const [open, setOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth > 640));
  if (!kinds?.length) return null;
  const activeCount = kinds.filter(({ kind }) => !hiddenKinds.has(kind)).length;
  return (
    <div className="map-legend">
      <button
        type="button"
        className="map-legend__title map-legend__toggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        Federal lands — tap a type to filter
        <span className="map-legend__caret" aria-hidden="true">{open ? '▾' : `▸ ${activeCount}/${kinds.length} shown`}</span>
      </button>
      {open && (
        <>
          <div className="map-legend__chips" role="group" aria-label="Filter by park type">
            {kinds.map(({ kind, emoji, count }) => {
              const on = !hiddenKinds.has(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  className={`map-legend__chip${on ? ' is-active' : ''}`}
                  aria-pressed={on}
                  onClick={() => onToggle(kind)}
                  title={`${on ? 'Hide' : 'Show'} ${kind}s`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span className="map-legend__chip-label">{kind.replace('National ', '')}</span>
                  <span className="map-legend__chip-count">{count}</span>
                </button>
              );
            })}
          </div>
          {onBrowseStateParks && (
            <button type="button" className="map-legend__statelink" onClick={onBrowseStateParks}>
              This isn’t everything — also browse <strong>4,000+ State Parks</strong> in all 50 states →
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────
// Prevents a single bad cache entry or stale localStorage blob from blanking the
// whole app. Shows a minimal retry UI with the underlying message.
class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    if (import.meta.env.DEV) console.error('[AppErrorBoundary]', err, info);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="app-error" role="alert">
        <div className="app-error__card">
          <h2 className="app-error__title">Something went wrong</h2>
          <p className="app-error__msg">{String(this.state.err?.message ?? this.state.err)}</p>
          <button className="app-error__btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

// ── Main app ──────────────────────────────────────────────────────────────────
function AppInner() {
  const secondaryReady = useSecondaryCache();
  const [season,       setSeason]       = useState('all');
  const [rarity,       setRarity]       = useState('all');
  const [animalType,   setAnimalType]   = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  // Default to National Parks only — every other NPS kind (Monument, Preserve,
  // Seashore, …) starts hidden, and viewers opt in via the legend filter chips.
  const [hiddenKinds,  setHiddenKinds]  = useState(() => new Set(NPS_KIND_ORDER.filter(k => k !== 'National Park')));
  const [debugMode,    setDebugMode]    = useState(false);

  // Popup-local filter preferences (persist across popup open/close)
  // Multi-select type filter: Set of active animal types (persists across popups within session)
  const [activeTypes, setActiveTypes] = useState(() => new Set(DEFAULT_ACTIVE_TYPES));
  // popupType is derived: 'all' when all types active, single type when exactly 1, otherwise 'multi'
  const popupType = activeTypes.size === Object.keys(ANIMAL_TYPES).length - 1 ? 'all'  // minus 'all' key
    : activeTypes.size === 1 ? [...activeTypes][0]
    : 'multi';
  // For subtype bar compatibility — only show subtypes when exactly 1 type is selected
  const focusedType = activeTypes.size === 1 ? [...activeTypes][0] : null;
  const setPopupType = (k) => {
    // Clicking 'all' activates everything; clicking a specific type focuses just that type
    // so the subtype bar can appear (Large Mammals, Rodents, etc.)
    if (k === 'all') {
      const allKeys = Object.keys(ANIMAL_TYPES).filter(t => t !== 'all');
      setActiveTypes(new Set(allKeys));
    } else {
      setActiveTypes(new Set([k]));
    }
  };
  const [popupSort,    setPopupSort]    = useState('iconic-first');
  const [popupRarity,  setPopupRarity]  = useState('all');
  const [popupSubtype, setPopupSubtype] = useState('all');
  // When the focused type changes, drop the subtype only if it's no longer
  // valid for the new type. Keeping a still-valid subtype lets handlePopupOpen
  // pre-apply the map's category+subtype filter without this effect (which
  // runs right after, since focusedType derives from activeTypes) wiping it.
  useEffect(() => {
    const valid = focusedType
      ? new Set((getSubtypeDefs(focusedType) || []).map(d => d.key))
      : null;
    setPopupSubtype(prev => (prev === 'all' || (valid && valid.has(prev)) ? prev : 'all'));
  }, [focusedType]);
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
  // Taxon group of the selected species, when known. Only used to break ties
  // in the county name fallback (see findStateParksWithSpecies) — never to
  // filter, so a null here costs nothing.
  const [speciesFilterType, setSpeciesFilterType] = useState(null);
  const [categoryType,    setCategoryType]    = useState('all');
  const [categorySubtype, setCategorySubtype] = useState('all');

  // Map ref — populated by MapController; lets buttons outside MapContainer call map.setView()
  const mapRef = useRef(null);

  // Initial zoom is responsive — mobile gets zoom 3 (whole US fits a narrow
  // viewport), desktop keeps zoom 4. Computed once at mount so later resizes
  // don't jump the user's view.
  const initialZoom = typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 4;
  const [zoom, setZoom] = useState(initialZoom);
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

  // Visitor-effort preference — gates how much to trust park-level rarity.
  //   'auto'   → use PARK_EFFORT_BASELINES[park.id] ?? 'casual'
  //   'expert' → assume dedicated observer (power birder, binoculars, 45-min survey)
  //   'casual' → assume typical tourist with a half-hour stop
  //   'drive'  → assume windshield tourism (drive-through, no stops)
  // Persists in localStorage. Consumed by AnimalCard (rescales frequency).
  const [visitorEffort, setVisitorEffort] = useState(() => {
    try { return localStorage.getItem('wm_effort') || 'auto'; } catch { return 'auto'; }
  });
  useEffect(() => {
    try { localStorage.setItem('wm_effort', visitorEffort); } catch {}
  }, [visitorEffort]);

  // Time-of-day preference — rescales rarity per activity period.
  //   'any'/default: no adjustment
  //   'dawn'|'morning'|'midday'|'evening'|'dusk'|'night': apply multiplier
  const [visitTime, setVisitTime] = useState(() => {
    try { return localStorage.getItem('wm_time') || 'any'; } catch { return 'any'; }
  });
  useEffect(() => {
    try { localStorage.setItem('wm_time', visitTime); } catch {}
  }, [visitTime]);

  // About modal
  const [showAbout, setShowAbout] = useState(false);
  const [showLifeList, setShowLifeList] = useState(false);
  const [showParkList, setShowParkList] = useState(false);
  // State Parks: state selector → state-zoomed map → click pin → park panel.
  const [showStateSelector, setShowStateSelector] = useState(false);
  const [showNearMe, setShowNearMe] = useState(false);
  // Coordinate captured when the user opens "Near me" and grants permission.
  // Kept in memory only (never persisted, never sent anywhere) so the species
  // search can rank matches by distance without prompting a second time.
  const [userLoc, setUserLoc] = useState(null);     // { lat, lng } | null
  const [showContact, setShowContact] = useState(false);
  const [selectedStateForMap, setSelectedStateForMap] = useState(null); // state code, e.g. 'NJ'
  const [activeStatePark, setActiveStatePark] = useState(null);         // park entry
  const [aboutScrollTo, setAboutScrollTo] = useState(null);
  const openAbout = useCallback((section = null) => { track('about_open'); setAboutScrollTo(section); setShowAbout(true); }, []);
  const closeAbout = useCallback(() => { setShowAbout(false); setAboutScrollTo(null); }, []);
  const [showGuide, setShowGuide] = useState(false);
  const openGuide  = useCallback(() => { track('guide_open'); setShowGuide(true); }, []);
  const closeGuide = useCallback(() => setShowGuide(false), []);
  const [showSupport, setShowSupport] = useState(false);

  // Welcome splash — shown only on first visit, gated by localStorage.
  const [showSplash, setShowSplash] = useState(() => {
    try { return !localStorage.getItem('wm_visited'); } catch { return false; }
  });
  const dismissSplash = useCallback(() => {
    try { localStorage.setItem('wm_visited', '1'); } catch {}
    setShowSplash(false);
  }, []);

  // (locationsByState — the per-state count for the StateParkCounts badges — is
  // declared below, after allVisibleLocations, so it reflects the SAME filtered
  // set the markers do.)

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
    // Served from our own origin (public/us-states.json), NOT hotlinked from
    // raw.githubusercontent.com: that came back with Cache-Control max-age=300
    // so it re-downloaded 87KB nearly every visit, sat outside the service
    // worker cache (breaking the offline promise for state outlines), and made
    // an unmaintained third-party repo a single point of failure.
    fetch('/us-states.json')
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

  // NPS codes already in the static wildlifeLocations — dedupe so a park never
  // appears twice. Then fetch the whole natural NPS system (Monuments, Seashores,
  // Preserves, NRAs, Rivers); these load async and are wildlife-fetched on demand.
  const existingNpsCodes = useMemo(() =>
    new Set(wildlifeLocations.filter(l => l.npsCode).map(l => l.npsCode)),
    []
  );
  const { parks: npsParks, npsImages } = useNpsParks(existingNpsCodes);

  // Fetch live data in the background. The combined list lets refreshLocation
  // resolve NPS units for on-demand fetch; npsParks is empty at mount, so the
  // once-only bulk warm-up still only touches the static parks.
  const liveLocations = useMemo(() => [...wildlifeLocations, ...npsParks, ...NATIONAL_WILDLIFE_REFUGES], [npsParks]);
  const { liveData, loading, loadingProgress, refreshLocation } = useLiveData(liveLocations);

  const liveDataRef = useRef(liveData);
  const loadingRef  = useRef(loading);
  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);
  useEffect(() => { loadingRef.current  = loading;  }, [loading]);

  // Refs for global toolbar filters — lets handlePopupOpen read current values
  // without adding them to its dependency array (avoids MarkerLayer re-binds).
  const rarityRef         = useRef(rarity);
  const seasonRef         = useRef(season);
  const animalTypeRef     = useRef(animalType);
  const categoryTypeRef   = useRef(categoryType);
  const categorySubtypeRef = useRef(categorySubtype);
  useEffect(() => { rarityRef.current      = rarity; },         [rarity]);
  useEffect(() => { seasonRef.current      = season; },         [season]);
  useEffect(() => { animalTypeRef.current  = animalType; },     [animalType]);
  useEffect(() => { categoryTypeRef.current = categoryType; },  [categoryType]);
  useEffect(() => { categorySubtypeRef.current = categorySubtype; }, [categorySubtype]);

  const handlePopupOpen = useCallback((loc) => {
    track('park_click', { park: loc.name, state: loc.stateCodes?.[0] ?? 'unknown' });
    // On-demand cache trigger: Data-Saver users skip the idle warm-up
    // (useSecondaryCache), so make sure the tier caches load the moment any
    // park is actually opened. Idempotent — a no-op once loaded.
    loadSecondaryCache();
    setOpenPopup({ loc });
    // Shareable deep link: reflect the open park as the clean prerendered
    // path /park/<id> (replaceState — no history/back entanglement). Shared
    // links then land on the static SEO page with correct OG tags, and
    // reopen the park on load. Old ?park=<id> links still work (the restore
    // effect accepts both).
    try {
      window.history.replaceState(null, '', `/park/${encodeURIComponent(loc.id)}`);
    } catch { /* non-browser / blocked — non-fatal */ }

    // Sync global toolbar filters → popup-local filters on every open.
    // When global is 'all', reset to popup defaults; when specific, inherit.
    setPopupRarity(rarityRef.current);

    if (seasonRef.current !== 'all') {
      setPopupSeason(seasonRef.current);
    } else {
      const m = new Date().getMonth() + 1;
      setPopupSeason(m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'fall' : 'winter');
    }

    // Inherit the active map filters so the park opens pre-filtered to what
    // the user was browsing. Precedence: the category dropdowns (type +
    // subtype, e.g. Birds → Birds of Prey) win, since they're the most
    // specific; else the legacy single-type toolbar; else sensible defaults.
    if (categoryTypeRef.current && categoryTypeRef.current !== 'all') {
      setActiveTypes(new Set([categoryTypeRef.current]));
      setPopupSubtype(
        categorySubtypeRef.current && categorySubtypeRef.current !== 'all'
          ? categorySubtypeRef.current
          : 'all'
      );
    } else if (animalTypeRef.current !== 'all') {
      setActiveTypes(new Set([animalTypeRef.current]));
      setPopupSubtype('all');
    } else {
      // Match DEFAULT_ACTIVE_TYPES: include reptiles, amphibians, marine life
      // by default so iconic non-bird/mammal species (alligators, manatees,
      // sea turtles) aren't hidden when a park is first opened.
      setActiveTypes(new Set(DEFAULT_ACTIVE_TYPES));
      setPopupSubtype('all');
    }

    // Bypass the stagger queue if this location has no data yet
    if (!liveDataRef.current[loc.id] && !loadingRef.current.has(loc.id)) {
      refreshLocation(loc.id);
    }
  }, [refreshLocation]);
  const handlePopupClose = useCallback(() => {
    setOpenPopup(null);
    try {
      // Return to the homepage URL (clears /park/<id> or a legacy ?park=).
      window.history.replaceState(null, '', '/');
    } catch { /* non-fatal */ }
  }, []);

  // Combined national + state index for "parks near me" (all kinds, regardless
  // of the current map filter — you want the genuinely nearest site).
  const nearMeIndex = useMemo(() => {
    const nat = [...wildlifeLocations, ...npsParks, ...NATIONAL_WILDLIFE_REFUGES].map(l => ({
      id: l.id, name: l.name, lat: l.lat, lng: l.lng, kind: 'national',
      emoji: npsEmojiOf(l), sub: npsKindOf(l), loc: l,
    }));
    const st = [];
    for (const [code, list] of Object.entries(STATE_PARKS_BY_STATE)) {
      const stName = STATE_PARK_STATES.find(s => s.code === code)?.name ?? code;
      for (const p of list) st.push({
        id: p.id, name: p.name, lat: p.lat, lng: p.lng, kind: 'state',
        emoji: STATE_CAT_EMOJI[p.category] ?? '🏞️', sub: stName, state: code, park: p,
      });
    }
    return [...nat, ...st].filter(it => typeof it.lat === 'number' && typeof it.lng === 'number');
  }, [npsParks]);

  // Stable identity matters: NearMeModal lists this in an effect's deps, and an
  // inline arrow would re-trigger the geolocation request on every render.
  const handleUserLocate = useCallback((c) => setUserLoc(c), []);

  // Federal units inside the state whose map is open, normalised to the shape
  // StateParkMap expects. The three source lists are disjoint by construction
  // (npsParks excludes the static 63 via existingNpsCodes, refuges are their
  // own file), which is why they can be concatenated without de-duping.
  const federalForStateMap = useMemo(() => {
    if (!selectedStateForMap) return [];
    const code = selectedStateForMap;
    return [...wildlifeLocations, ...npsParks, ...NATIONAL_WILDLIFE_REFUGES]
      .filter(l => l.stateCodes?.includes(code)
        && typeof l.lat === 'number' && typeof l.lng === 'number')
      .map(l => {
        const kind = npsKindOf(l) || 'National Park';
        return {
          id: l.id, name: l.name, lat: l.lat, lng: l.lng,
          category: `federal:${kind}`,
          emoji: npsEmojiOf(l),
          catLabel: kind,
          __federal: true,
          unit: l,
        };
      });
  }, [selectedStateForMap, npsParks]);

  const handleNearMePick = useCallback((item) => {
    setShowNearMe(false);
    if (item.kind === 'national') {
      handlePopupOpen(item.loc);
    } else {
      setActiveStatePark(item.park);
      setSelectedStateForMap(item.state);
      track('near_me_pick', { park: item.name, kind: 'state', state: item.state });
      try { window.history.replaceState(null, '', `/state-park/${item.state.toLowerCase()}/${encodeURIComponent(item.id)}`); } catch {}
    }
  }, [handlePopupOpen]);

  // Restore a shared life-list (#list=<token>) once on mount, then strip it.
  const shareTokenDone = useRef(false);
  useEffect(() => {
    if (shareTokenDone.current) return;
    shareTokenDone.current = true;
    try { applyShareTokenFromUrl(); } catch { /* non-fatal */ }
  }, []);

  // (The shared-deep-link restore lives just below the npsParks declaration —
  // it reads npsParks, so it must be defined after that const to avoid a TDZ.)

  const handleSpeciesSelect = useCallback((s) => {
    setSpeciesFilter(s.name);
    setSpeciesFilterType(s.animalType ?? null);
    setSpeciesQuery(s.name);
    track('species_search', { species: s.name, parkCount: s.parkCount });
  }, []);
  const handleSpeciesClear = useCallback(() => {
    setSpeciesFilter(null);
    setSpeciesFilterType(null);
    setSpeciesQuery('');
    setStateParkMatches(null);
    setShowStateMatches(false);
  }, []);

  // ── Universal species search: state-park matches ──────────────────────────
  // When a species is selected, also look it up across all 4,000+ state parks
  // via the county bird-frequency index (lazy chunk; birds only — iNat species
  // for state parks are live-fetched and have no static index).
  const allStateParksFlat = useMemo(() => {
    const m = new Map();
    for (const [code, arr] of Object.entries(STATE_PARKS_BY_STATE))
      for (const p of arr) m.set(p.id, { ...p, state: code });
    return m;
  }, []);
  const [stateParkMatches, setStateParkMatches] = useState(null);
  // 'bird' | 'nonbird' | 'none' — decides how the % is described. Bird numbers
  // are checklist reporting rates; non-bird numbers are iNaturalist
  // observability indexes. Same glyph, different unit.
  const [matchKind, setMatchKind] = useState('none');
  const [showStateMatches, setShowStateMatches] = useState(false);
  useEffect(() => {
    if (!speciesFilter) { setStateParkMatches(null); setMatchKind('none'); return; }
    let alive = true;
    findStateParksWithSpecies(speciesFilter, speciesFilterType).then(({ kind, hits }) => {
      if (!alive) return;
      setMatchKind(kind);
      let parks = hits
        .map(h => {
          const p = allStateParksFlat.get(h.id);
          return p ? { ...p, freq: h.freq, rarity: h.rarity } : null;
        })
        .filter(Boolean);

      if (userLoc) {
        // Rank by odds, but only among parks that are actually reachable —
        // otherwise "best odds" surfaces a park 2,000 miles away. Widen the
        // radius rather than show an empty list in sparsely-covered regions.
        const R = 3958.8, toRad = d => d * Math.PI / 180;
        for (const p of parks) {
          const dLa = toRad(p.lat - userLoc.lat), dLo = toRad(p.lng - userLoc.lng);
          const a = Math.sin(dLa / 2) ** 2
            + Math.cos(toRad(userLoc.lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLo / 2) ** 2;
          p.miles = 2 * R * Math.asin(Math.sqrt(a));
        }
        let within = [];
        for (const radius of [150, 300, 600]) {
          within = parks.filter(p => p.miles <= radius);
          if (within.length >= 8) break;
        }
        parks = within.length ? within : parks;
        // County frequency is identical for every park in a county, so distance
        // is the tiebreaker that makes the ordering useful rather than arbitrary.
        parks.sort((a, b) => b.freq - a.freq || a.miles - b.miles);
      } else {
        parks.sort((a, b) =>
          b.freq - a.freq || a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
      }
      setStateParkMatches(parks);
    });
    return () => { alive = false; };
  }, [speciesFilter, speciesFilterType, allStateParksFlat, userLoc]);
  const handleCategoryReset = useCallback(() => {
    setCategoryType('all');
    setCategorySubtype('all');
  }, []);

  // (existingNpsCodes + npsParks are declared above, just before useLiveData.)

  // Restore a shared deep link. Re-runs
  // until resolved because NPS units load async — a /park/nps_<code> link can
  // arrive before npsParks is populated, so we search both the static set and
  // npsParks and wait for the latter if needed (guarded so it opens once).
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current) return;
    try {
      const u = new URL(window.location.href);
      // /guide — the prerendered how-to-use page; open the guide on arrival.
      if (/^\/guide\/?$/i.test(u.pathname)) {
        deepLinkDone.current = true;
        openGuide();
        return;
      }
      const spMatch  = u.pathname.match(/^\/state-park\/([a-z]{2})\/([^/]+)\/?$/i);
      const stMatch  = u.pathname.match(/^\/state\/([a-z]{2})\/?$/i);
      // Species landing pages (/species/<slug>[/<state>]) — prerendered for
      // SEO; on mount, apply the species filter so the page is the live app
      // already searching that bird. Slug → proper name via the species list
      // (slug-equality), falling back to a title-cased de-slug.
      const sppMatch = u.pathname.match(/^\/species\/([a-z0-9-]+)(?:\/([a-z]{2}))?\/?$/i);
      if (sppMatch && sppMatch[1]) {
        deepLinkDone.current = true;
        const slug = sppMatch[1].toLowerCase();
        const slugOf = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const known = allSpeciesList.find(s => slugOf(s.name) === slug);
        const name = known?.name ?? slug.replace(/-/g, ' ').replace(/(^|[\s])\w/g, c => c.toUpperCase());
        setSpeciesFilter(name);
        setSpeciesFilterType(known?.animalType ?? null);
        setSpeciesQuery(name);
        return;
      }
      if (spMatch) {
        deepLinkDone.current = true;
        const sp = findStatePark(spMatch[1], decodeURIComponent(spMatch[2]));
        if (sp) { setSelectedStateForMap(spMatch[1].toUpperCase()); setActiveStatePark(sp); }
        return;
      }
      if (stMatch) {
        deepLinkDone.current = true;
        const code = stMatch[1].toUpperCase();
        if (STATE_PARK_STATES.some(s => s.code === code)) setSelectedStateForMap(code);
        return;
      }
      const pathMatch = u.pathname.match(/^\/park\/([^/]+)\/?$/);
      const id = u.searchParams.get('park') || (pathMatch && decodeURIComponent(pathMatch[1]));
      if (!id) { deepLinkDone.current = true; return; }
      const loc = wildlifeLocations.find(l => l.id === id) || npsParks.find(l => l.id === id) || NATIONAL_WILDLIFE_REFUGES.find(l => l.id === id);
      if (loc) { deepLinkDone.current = true; handlePopupOpen(loc); return; }
      if (npsParks.length === 0) return;  // NPS data not loaded yet — wait & retry
      deepLinkDone.current = true;        // unknown id — give up gracefully
    } catch { deepLinkDone.current = true; }
  }, [handlePopupOpen, npsParks]);

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

  // Effective animals for the currently-open park. Static parks come from the
  // map above; NPS units (not in wildlifeLocations) derive from their live data
  // as it streams in on demand, processed through the identical pipeline.
  const openPopupAnimals = useMemo(() => {
    const loc = openPopup?.loc;
    if (!loc) return [];
    if (effectiveAnimalsByLoc[loc.id]) return effectiveAnimalsByLoc[loc.id];
    const live = liveData[loc.id]?.animals ?? null;
    return balanceAnimals(filterGeographicOutliers(mergeAnimals(loc.animals ?? [], live), loc.id));
  }, [openPopup, effectiveAnimalsByLoc, liveData]);

  // ── Species → parks reverse index ────────────────────────────────────────
  const allSpeciesList = useMemo(() => {
    // name → { parks: Set<parkId>, sciName, animalType, subtype }
    const map = new Map();
    for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
      for (const a of data.animals ?? []) {
        if (!a.name) continue;
        if (!map.has(a.name)) {
          map.set(a.name, {
            parks: new Set(),
            sciName: a.scientificName ?? null,
            animalType: a.animalType ?? null,
            subtype: classifyAnimalSubtype(a),
          });
        }
        map.get(a.name).parks.add(parkId);
      }
    }
    const list = [...map.entries()]
      .map(([name, v]) => ({
        name,
        sciName:   v.sciName,
        animalType:v.animalType,
        subtype:   v.subtype,
        parkCount: v.parks.size,
        photoUrl:  BUNDLED_PHOTOS[name]?.url ?? null,
      }))
      .sort((a, b) => b.parkCount - a.parkCount);
    return list;
  }, []);

  // ── Species the county data has but WILDLIFE_CACHE doesn't ───────────────
  // Suggestions were built only from the 63 national parks' cache (2,583
  // species), so ~7,000 animals the app holds county data for could not be
  // searched AT ALL — Brown Bear, Caribou, Walrus, Grey Whale. The search
  // requires picking a suggestion, so they were unreachable rather than merely
  // hard to find.
  //
  // The index is ~250KB, so it loads lazily on first use rather than riding in
  // the main bundle: nobody who never touches the search pays for it.
  const [extraSpecies, setExtraSpecies] = useState(null);
  const wantsSpeciesPool = speciesQuery.trim().length >= 2 || categoryType !== 'all';
  useEffect(() => {
    if (extraSpecies || !wantsSpeciesPool) return;
    let alive = true;
    import('./data/speciesSearchIndex.js')
      .then(m => { if (alive) setExtraSpecies(m.SPECIES_SEARCH_EXTRA ?? []); })
      .catch(() => { /* search still works on the cache-derived list */ });
    return () => { alive = false; };
  }, [wantsSpeciesPool, extraSpecies]);

  // Cache-derived entries stay FIRST so existing ordering and the richer
  // records (scientific name, bundled photo) keep winning ties.
  const speciesSearchPool = useMemo(() => {
    if (!extraSpecies?.length) return allSpeciesList;
    return [
      ...allSpeciesList,
      ...extraSpecies.map(([name, animalType, parkCount]) => ({
        name, animalType, parkCount,
        sciName: null, subtype: null, photoUrl: null,
        _fromCounty: true,
      })),
    ];
  }, [allSpeciesList, extraSpecies]);

  const speciesSuggestions = useMemo(() => {
    const q = speciesQuery.trim().toLowerCase();
    const catActive = categoryType !== 'all';
    // When neither query nor category is active, no suggestions.
    if (q.length < 2 && !catActive) return [];

    // Pre-filter by category/subtype if the user has narrowed the picker.
    let pool = speciesSearchPool;
    if (catActive) {
      pool = pool.filter(s => {
        if (s.animalType !== categoryType) return false;
        if (categorySubtype !== 'all' && s.subtype !== categorySubtype) return false;
        return true;
      });
    }

    // No query: browse mode — show a generous slice so users can scroll.
    if (q.length < 2) return pool.slice(0, 60);

    const exact = [], sw = [], contains = [];
    for (const s of pool) {
      const n  = s.name.toLowerCase();
      const sc = s.sciName?.toLowerCase() ?? '';
      if (n === q)                             { exact.push(s);    continue; }
      if (n.startsWith(q) || sc.startsWith(q)){ sw.push(s);       continue; }
      if (n.includes(q)   || sc.includes(q))  { contains.push(s);           }
      if (exact.length + sw.length + contains.length >= 120) break;
    }
    return [...exact, ...sw, ...contains].slice(0, catActive ? 60 : 12);
  }, [speciesQuery, speciesSearchPool, categoryType, categorySubtype]);

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
    const allLocs = [...wildlifeLocations, ...npsParks, ...NATIONAL_WILDLIFE_REFUGES];
    return Object.fromEntries(
      allLocs.map(loc => [
        loc.id,
        createPinIcon(
          loc.locationType, false,
          !secondaryReady && !WILDLIFE_CACHE[loc.id],  // show loading dot for unpopulated parks
          zoomTier,
          npsEmojiOf(loc),
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

  // NPS units + National Wildlife Refuges, filtered by state (no animal filter —
  // they have no animals array yet, so animal/season/rarity filters don't apply).
  // The NPS-kind filter (hiddenKinds, incl. 'Wildlife Refuge' off by default) is
  // applied downstream in allVisibleLocations.
  const visibleNpsParks = useMemo(() =>
    [...npsParks, ...NATIONAL_WILDLIFE_REFUGES].filter(loc => {
      if (selectedState !== 'all' && !(loc.stateCodes ?? []).includes(selectedState)) return false;
      return true;
    }),
    [npsParks, selectedState]
  );

  // Combined marker list for ClusterLayer
  const allVisibleLocations = useMemo(() => {
    let all = [...visibleLocations, ...visibleNpsParks];
    if (speciesFilteredParkIds)  all = all.filter(loc => speciesFilteredParkIds.has(loc.id));
    if (categoryFilteredParkIds) all = all.filter(loc => categoryFilteredParkIds.has(loc.id));
    if (hiddenKinds.size)        all = all.filter(loc => !hiddenKinds.has(npsKindOf(loc)));
    return all;
  }, [visibleLocations, visibleNpsParks, speciesFilteredParkIds, categoryFilteredParkIds, hiddenKinds]);

  // Per-state count for the StateParkCounts badges — derived from the SAME
  // filtered set as the markers so a state's badge always matches the pins you
  // see when you zoom in (previously this counted only the static parks and
  // ignored every filter, so e.g. a "Preserve" filter still showed a state's
  // park count).
  const locationsByState = useMemo(() => {
    const counts = {};
    for (const loc of allVisibleLocations) {
      (loc.stateCodes ?? []).forEach(code => { counts[code] = (counts[code] ?? 0) + 1; });
    }
    return counts;
  }, [allVisibleLocations]);

  // Per-NPS-kind counts for the legend/filter chips (before the kind filter, so
  // toggling one kind doesn't change the others' counts). Ordered by NPS_KIND_ORDER.
  const npsKindCounts = useMemo(() => {
    const counts = {};
    for (const loc of [...visibleLocations, ...visibleNpsParks]) {
      const k = npsKindOf(loc);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return NPS_KIND_ORDER.filter(k => counts[k]).map(k => ({ kind: k, emoji: NPS_KIND_EMOJI[k], count: counts[k] }));
  }, [visibleLocations, visibleNpsParks]);
  const toggleKind = useCallback((kind) => {
    setHiddenKinds(prev => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  }, []);

  const liveCount  = Object.keys(liveData).length;

  // Cache warming progress tracking removed — the static bundle provides full
  // content immediately, and the background live-fetch enrichment runs silently
  // without surfacing progress UI.

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

  // Auto-zoom to the selected state's parks (both curated + NPS).
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedState === 'all') {
      mapRef.current.setView([39.5, -98.35], initialZoom);
      return;
    }
    const locs = [
      ...wildlifeLocations.filter(l => l.stateCodes?.includes(selectedState)),
      ...npsParks.filter(l => l.stateCodes?.includes(selectedState)),
    ];
    if (locs.length === 0) return;
    if (locs.length === 1) {
      mapRef.current.setView([locs[0].lat, locs[0].lng], 8);
    } else {
      const bounds = L.latLngBounds(locs.map(l => [l.lat, l.lng]));
      mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
    }
  }, [selectedState, npsParks]);

  // ── First-time-use / stale-cache banner ───────────────────────────────────
  // The static bundle is rebuilt weekly via .github/workflows/weekly-rebuild.yml
  // and contains the full species set for every park — the page is fully usable
  // the moment React mounts. The live warm-up that runs in useLiveData is pure
  // enrichment (newer sightings since the bundle was built) and runs silently
  // in the background regardless of bundle age. We deliberately do NOT surface
  // a loading bar or banner to visitors: the static cache is always the source
  // of truth from their perspective, and showing "loading…" UI for a background
  // refresh just confuses people into thinking the page isn't ready.

  const activeFilterCount = [season, rarity, animalType, selectedState].filter(v => v !== 'all').length
    + (categoryType !== 'all' ? 1 : 0);

  return (
    <div className="app">
      {/* Cache-warming bar and build banner intentionally removed — the static
          bundle provides instant content; live enrichment runs silently. */}

      {/* ── Welcome splash (first visit only) ── */}
      {showSplash && <SplashScreen onDismiss={dismissSplash} onAbout={() => openAbout()} onGuide={openGuide} />}

      {/* ── Debug mode banner ── */}
      {debugMode && (
        <div className="debug-banner" role="status">
          🐛 Debug Mode active — showing API endpoints, observation counts &amp; fetch timestamps · Press <kbd>D</kbd> to exit
        </div>
      )}

      {/* Skip link — the map puts 65+ focusable markers in the tab order, so
          without this a keyboard user cannot reach anything past it in fewer
          than 65 presses. Visually hidden until focused. */}
      <a className="skip-link" href="#park-list-skip-target">Skip map, browse parks as a list</a>

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr__inner">

          {/* ── Row 1: Brand + Species Search + Action buttons ── */}
          <div className="hdr__row1">

            {/* Brand: logo + title + live count */}
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

            {/* Species search bar — dedicated horizontal slot */}
            <div className="hdr__search-slot">
              <SpeciesSearch
                suggestions={speciesSuggestions}
                query={speciesQuery}
                onChange={setSpeciesQuery}
                onSelect={handleSpeciesSelect}
                onClear={handleSpeciesClear}
                hasFilter={!!speciesFilter}
                categoryActive={categoryType !== 'all'}
                categoryLabel={
                  categoryType !== 'all'
                    ? (categorySubtype !== 'all'
                        ? (getSubtypeDefs(categoryType)?.find(s => s.key === categorySubtype)?.label ?? ANIMAL_TYPES[categoryType]?.label)
                        : ANIMAL_TYPES[categoryType]?.label)
                    : null
                }
              />
            </div>

            {/* Right actions: About + theme toggle + mobile filter toggle */}
            <div className="hdr__actions">
              <button className="hdr__about-btn" onClick={() => { track('near_me_open'); setShowNearMe(true); }} title="Find wildlife sites near you" aria-label="Parks near me">
                <span className="hdr__about-icon" aria-hidden="true">📍</span> Near me
              </button>
              <button id="park-list-skip-target" className="hdr__about-btn" onClick={() => setShowParkList(true)} title="Browse all national parks (keyboard accessible)" aria-label="Browse national parks">
                <span className="hdr__about-icon" aria-hidden="true">⌖</span> National Parks
              </button>
              <button className="hdr__about-btn" onClick={() => setShowStateSelector(true)} title="Browse state parks by state" aria-label="Browse state parks">
                <span className="hdr__about-icon" aria-hidden="true">🗺️</span> State Parks
              </button>
              <button className="hdr__about-btn" onClick={openGuide} title="How to use it — quick tips" aria-label="How to use it">
                <span className="hdr__about-icon" aria-hidden="true">✨</span> Tips
              </button>
              <button className="hdr__about-btn" onClick={() => openAbout()} title="About this project" aria-label="About">
                <span className="hdr__about-icon">i</span> About
              </button>
              <button className="hdr__about-btn" onClick={() => { track('contact_open'); setShowContact(true); }} title="Report an issue, suggest a feature, or correct park data" aria-label="Send feedback">
                <span className="hdr__about-icon" aria-hidden="true">💬</span> Feedback
              </button>
              <button className="hdr__about-btn hdr__about-btn--support" onClick={() => { track('support_open'); setShowSupport(true); }} title="Support the project — keep it free and ad-free" aria-label="Support this project">
                <span className="hdr__about-icon" aria-hidden="true">☕</span> Support
              </button>
              <button
                className="hdr__theme-btn"
                onClick={() => { track('theme_toggle', { theme: darkMode ? 'light' : 'dark' }); setDarkMode(d => !d); }}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label="Toggle theme"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              {/* Mobile-only: opens the filter drawer */}
              <button
                className="hdr__filter-toggle"
                onClick={() => setMobileFiltersOpen(v => !v)}
                aria-expanded={mobileFiltersOpen}
                aria-label="Toggle filters"
              >
                {mobileFiltersOpen ? '✕ Close' : `⚙︎ Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
              </button>
            </div>
          </div>

          {/* ── Row 2: All filter controls (desktop only — hidden on mobile) ── */}
          <div className="hdr__row2">

            {/* Category type + subtype dropdowns */}
            <CategoryDropdowns
              categoryType={categoryType}
              setCategoryType={setCategoryType}
              categorySubtype={categorySubtype}
              setCategorySubtype={setCategorySubtype}
              onTrack={(type, subtype) => track('category_filter', { type, subtype })}
            />

            <div className="filter-sep" />

            {/* Season pills */}
            <div className="filter-group">
              <span className="filter-group__label">Season</span>
              <div className="filter-group__btns">
                {Object.entries(SEASONS).map(([k, { label, emoji, color }]) => (
                  <FilterBtn key={k} active={season === k} onClick={() => { setSeason(k); track('season_filter', { season: k }); }} emoji={emoji} label={label} activeColor={color} />
                ))}
              </div>
            </div>

            <div className="filter-sep" />

            {/* Rarity pills */}
            <div className="filter-group">
              <span className="filter-group__label">Rarity</span>
              <div className="filter-group__btns">
                {Object.entries(RARITY).map(([k, { label, emoji, color }]) => (
                  <FilterBtn key={k} active={rarity === k} onClick={() => { setRarity(k); track('rarity_filter', { rarity: k }); }} emoji={emoji} label={label} activeColor={color} />
                ))}
              </div>
            </div>

            <div className="filter-sep" />

            {/* State dropdown */}
            <select
              className="filter-select"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              aria-label="Filter by state"
            >
              <option value="all">All States</option>
              {allStateCodes.map(code => (
                <option key={code} value={code}>{STATE_NAMES[code] ?? code}</option>
              ))}
            </select>

          </div>
        </div>
      </header>

      {/* ── Mobile filter drawer (≤768px only) ─────────────────────── */}
      <div className={`mobile-filter-drawer${mobileFiltersOpen ? ' mobile-filter-drawer--open' : ''}`}
        aria-hidden={!mobileFiltersOpen}>
        <div className="mobile-filter-drawer__inner">
          <div className="mobile-filter-section">
            <span className="mobile-filter-section__label">Animal Type</span>
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
            <span className="mobile-filter-section__label">State</span>
            <select className="filter-select mobile-filter-select"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              aria-label="Filter by state">
              <option value="all">All States</option>
              {allStateCodes.map(code => (
                <option key={code} value={code}>{STATE_NAMES[code] ?? code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <main className="map-wrap">
        {/* What's Active Now — floating corner card (top-right) */}
        <WhatActiveNow />
        {/* Zoom prompt — fades out after 3.5 s */}
        {showZoomHint && <div className="zoom-hint">Zoom in to explore parks</div>}
        <MapContainer center={[39.5, -98.35]} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            key={darkMode ? 'dark' : 'light'}
            url={basemapUrl(darkMode)}
            attribution={BASEMAP_ATTRIBUTION}
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
                heroImage={openPopup.loc.image || npsImages[openPopup.loc.npsCode] || null}
                heroAlt={openPopup.loc.imageAlt || openPopup.loc.name}
                effectiveAnimals={openPopupAnimals}
                season={season}
                rarity={rarity}
                animalType={animalType}
                isLive={!!liveData[openPopup.loc.id]}
                sources={liveData[openPopup.loc.id]?.sources ?? []}
                isLoading={loading.has(openPopup.loc.id)}
                debugMode={debugMode}
                stats={liveData[openPopup.loc.id]?.stats}
                countySeeded={!!liveData[openPopup.loc.id]?.countySeeded}
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
                onOpenLifeList={() => setShowLifeList(true)}
                highlightSpecies={speciesFilter}
                visitorEffort={visitorEffort}
                setVisitorEffort={setVisitorEffort}
                visitTime={visitTime}
                setVisitTime={setVisitTime}
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
        <MapLegend
          kinds={npsKindCounts}
          hiddenKinds={hiddenKinds}
          onToggle={toggleKind}
          onBrowseStateParks={() => setShowStateSelector(true)}
        />

        {/* Species + category filter pills — stacked vertically in the centre */}
        {(speciesFilter || categoryType !== 'all') && (
          <div className="filter-pills-stack">
            {speciesFilter && (
              <div className="species-pill">
                <span className="species-pill__label">{speciesFilter}</span>
                <span className="species-pill__count">{allVisibleLocations.length} park{allVisibleLocations.length !== 1 ? 's' : ''}</span>
                <button className="species-pill__clear" onClick={handleSpeciesClear} aria-label="Clear species filter">✕</button>
              </div>
            )}
            {speciesFilter && stateParkMatches?.length > 0 && (
              <button
                type="button"
                className="species-pill species-pill--statelink"
                onClick={() => setShowStateMatches(true)}
                title={`Browse the state parks where ${speciesFilter} is found`}
              >
                🌲 also in <strong>{stateParkMatches.length} state parks</strong> →
              </button>
            )}
            {categoryType !== 'all' && (
              <div className="species-pill species-pill--category">
                <span className="species-pill__label">
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
          stateParkMatches?.length > 0 ? (
            <button type="button" className="species-no-results species-no-results--statelink" onClick={() => setShowStateMatches(true)}>
              Not in any national park here — but found in <strong>{stateParkMatches.length} state parks</strong> →
            </button>
          ) : (
            <div className="species-no-results">No parks found with "{speciesFilter}"</div>
          )
        )}

      </main>

      {/* ── About modal ── */}
      {showAbout && <AboutModal onClose={closeAbout} scrollTo={aboutScrollTo} />}
      {showGuide && <GuideModal onClose={closeGuide} onAbout={openAbout} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showLifeList && <LifeListModal onClose={() => setShowLifeList(false)} />}
      {showParkList && (
        <ParkListModal
          parks={wildlifeLocations}
          title="National Parks"
          onPick={(loc) => { setShowParkList(false); handlePopupOpen(loc); }}
          onClose={() => setShowParkList(false)}
        />
      )}
      {showNearMe && (
        <NearMeModal
          index={nearMeIndex}
          onPick={handleNearMePick}
          onLocate={handleUserLocate}
          onClose={() => setShowNearMe(false)}
        />
      )}
      {showStateMatches && stateParkMatches?.length > 0 && (
        <ParkListModal
          parks={stateParkMatches}
          preserveOrder
          title={`Where to look for ${speciesFilter}`}
          subtitle={
            (matchKind === 'nonbird'
              ? '% = how commonly this species is photographed in the park’s COUNTY on iNaturalist — a relative observability score, not a chance of seeing it. '
              : '% = share of eBird checklists in the park’s COUNTY that report this species. ')
            + 'It’s county-wide, shared by every park in that county — a good steer, not a promise for the park itself. '
            + (userLoc ? 'Nearest strong counties first.' : 'Sorted by odds; use the button below to put the closest first.')}
          ariaLabel={`State parks with ${speciesFilter}`}
          onUseLocation={userLoc ? null : () => { setShowStateMatches(false); track('near_me_open'); setShowNearMe(true); }}
          onPick={(p) => {
            setShowStateMatches(false);
            handleNearMePick({ kind: 'state', park: p, state: p.state, id: p.id, name: p.name });
          }}
          onClose={() => setShowStateMatches(false)}
        />
      )}
      {showStateSelector && (
        <StateSelectorModal
          states={STATE_PARK_STATES}
          onPick={(s) => {
            setShowStateSelector(false);
            setSelectedStateForMap(s.code);
            track('state_select', { state: s.code });
            try { window.history.replaceState(null, '', `/state/${s.code.toLowerCase()}`); } catch {}
          }}
          onClose={() => setShowStateSelector(false)}
        />
      )}
      {selectedStateForMap && (() => {
        const s = STATE_PARK_STATES.find(x => x.code === selectedStateForMap);
        if (!s) return null;
        return (
          <StateParkMap
            state={s}
            parks={STATE_PARKS_BY_STATE[s.code] || []}
            federal={federalForStateMap}
            onPickFederal={(u) => {
              // Federal units live on the national map's popup, so close the
              // state overlay and hand off — same route "Near me" already uses.
              setSelectedStateForMap(null);
              setActiveStatePark(null);
              track('state_map_federal_open', { park: u.name, state: s.code });
              handlePopupOpen(u.unit);
            }}
            stateGeo={stateGeoData}
            onSwitchState={(code) => {
              setActiveStatePark(null);   // close any open panel
              setSelectedStateForMap(code);
              track('state_switch', { state: code });
              try { window.history.replaceState(null, '', `/state/${code.toLowerCase()}`); } catch {}
            }}
            onPickPark={(p) => {
              setActiveStatePark(p);
              track('state_park_open', { park: p.name, state: s.code });
              try { window.history.replaceState(null, '', `/state-park/${s.code.toLowerCase()}/${encodeURIComponent(p.id)}`); } catch {}
            }}
            onClose={() => {
              setSelectedStateForMap(null);
              setActiveStatePark(null);
              try { window.history.replaceState(null, '', '/'); } catch {}
            }}
          />
        );
      })()}
      {activeStatePark && (
        <StateParkPanel
          park={activeStatePark}
          openAbout={openAbout}
          onSwitchPark={(p) => {
            setActiveStatePark(p);
            const sc = STATE_PARK_STATES.find(s => p.id?.startsWith(s.code.toLowerCase() + '-'))?.code;
            // Keep the map underneath in sync (matters on a deep-link landing).
            if (sc && sc !== selectedStateForMap) setSelectedStateForMap(sc);
            track('state_park_switch', { park: p.name, state: sc });
            try { window.history.replaceState(null, '', `/state-park/${(sc || '').toLowerCase()}/${encodeURIComponent(p.id)}`); } catch {}
          }}
          onClose={() => {
            setActiveStatePark(null);
            // Don't drop the state map underneath — close panel returns to the map.
            try {
              const s = STATE_PARK_STATES.find(x => x.code === selectedStateForMap);
              if (s) window.history.replaceState(null, '', `/state/${s.code.toLowerCase()}`);
              else   window.history.replaceState(null, '', '/');
            } catch {}
          }}
        />
      )}

      {/* ── Vercel Analytics & Speed Insights ── */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppInner />
    </AppErrorBoundary>
  );
}
