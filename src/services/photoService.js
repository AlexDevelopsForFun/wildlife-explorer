import { BUNDLED_PHOTOS } from '../data/photoCache.js';

// ── Animal photo service ───────────────────────────────────────────────────────
// Fetches photos from iNaturalist (primary) or Wikipedia (fallback).
// Results are cached in-memory + localStorage so each species is only fetched once.
// Concurrent requests for the same animal are deduplicated via a pending-promise cache.

const _photoCache   = new Map(); // resolved results { url, largeUrl, credit, attribution, source }
const _pendingCache = new Map(); // in-flight promises — prevents duplicate network calls
const LS_PREFIX     = 'wm_photo_';
const PHOTO_TTL     = 30 * 24 * 60 * 60 * 1000; // 30 days — prevents unbounded localStorage growth

// Stable cache key: "Gray Wolf" → "gray_wolf"
function normKey(name) {
  return name.toLowerCase().trim().replace(/\s+/g, '_');
}

// Load an image and resolve true only if both dimensions meet minPx.
// Used for Wikipedia thumbnails, which can occasionally be tiny.
function checkImageSize(url, minPx = 100) {
  return new Promise(resolve => {
    const img   = new window.Image();
    const timer = setTimeout(() => resolve(false), 7000);
    img.onload  = () => { clearTimeout(timer); resolve(img.naturalWidth >= minPx && img.naturalHeight >= minPx); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

// Extract photographer name from an iNat attribution string.
// "(c) John Smith, some rights reserved (CC BY-NC)" → "John Smith"
function parseCredit(attribution) {
  if (!attribution) return null;
  let m = attribution.match(/^\(c\)\s+(.+?),/i);
  if (m) return m[1].trim();
  m = attribution.match(/©\s+(?:\d{4}\s+)?(.+?),/i);
  if (m) return m[1].trim();
  return attribution.split(',')[0]
    .replace(/^\(c\)\s*/i, '')
    .replace(/^©\s*\d*\s*/i, '')
    .trim() || null;
}

// ── iNaturalist ───────────────────────────────────────────────────────────────
// Uses the taxa/autocomplete endpoint — returns default_photo in a single call.
// iNat medium_url images are reliably sized (≥ 200px), so we skip the size check.
async function tryInat(animalName) {
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(animalName)}&per_page=5&locale=en`
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    for (const taxon of (results ?? [])) {
      const p = taxon.default_photo;
      if (!p?.medium_url) continue;
      // Derive large URL by swapping the size segment in the iNat CDN path
      const largeUrl = p.medium_url.replace(/\/medium\./, '/large.');
      return {
        url:         p.medium_url,
        largeUrl,
        credit:      parseCredit(p.attribution),
        attribution: p.attribution ?? null,
        source:      'inat',
      };
    }
  } catch { /* network error — fall through to Wikipedia */ }
  return null;
}

// ── Wikipedia ─────────────────────────────────────────────────────────────────
// Falls back to the Wikipedia page summary API which returns a thumbnail image.
//
// Rate-limit defence:
//   • Enforces a 1-second minimum gap between successive Wikipedia calls so
//     rapid multi-animal loads don't trigger Wikipedia's bot detection (429).
//   • On a 429 response, waits 2 seconds then retries exactly once.
//   • In-memory + localStorage caching in fetchAnimalPhoto means each species
//     is only ever fetched from Wikipedia once per device.
let _lastWikiCallAt = 0;

async function tryWikipedia(animalName) {
  // Enforce at least 1 s between consecutive Wikipedia calls
  const gap = 1000 - (Date.now() - _lastWikiCallAt);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  _lastWikiCallAt = Date.now();

  try {
    const title = animalName.replace(/\s+/g, '_');
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

    let res = await fetch(wikiUrl);

    // Single retry on 429 (Too Many Requests) — wait 2 s then try again
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      _lastWikiCallAt = Date.now();
      res = await fetch(wikiUrl);
    }

    if (!res.ok) return null;
    const data = await res.json();
    const url  = data.thumbnail?.source;
    if (!url) return null;
    // Wikipedia thumbnails can sometimes be very small — verify dimensions
    const ok = await checkImageSize(url);
    if (!ok) return null;
    return {
      url,
      largeUrl:    data.originalimage?.source ?? url,
      credit:      'Wikipedia contributors',
      attribution: `${data.title ?? animalName} — Wikipedia (CC BY-SA)`,
      source:      'wikipedia',
    };
  } catch { return null; }
}

// ── Public API ────────────────────────────────────────────────────────────────
// Accepts an optional scientificName for fallback lookups when the common name
// returns no result from iNaturalist or Wikipedia.
export async function fetchAnimalPhoto(animalName, scientificName) {
  const key = normKey(animalName);

  // 0. Bundled photo cache — pre-fetched at build time, zero network cost
  if (animalName in BUNDLED_PHOTOS) {
    const bundled = BUNDLED_PHOTOS[animalName];
    _photoCache.set(key, bundled);
    return bundled;
  }

  // 1. Memory cache — fastest path, no async needed
  if (_photoCache.has(key)) return _photoCache.get(key);

  // 2. Deduplicate concurrent calls — return same promise if already in flight
  if (_pendingCache.has(key)) return _pendingCache.get(key);

  // 3. localStorage cache — persists across sessions (30-day TTL)
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw !== null) {
      const { data, ts } = JSON.parse(raw);
      if (ts && Date.now() - ts < PHOTO_TTL) {
        _photoCache.set(key, data);
        return data;
      }
      // Expired — evict and re-fetch
      localStorage.removeItem(LS_PREFIX + key);
    }
  } catch { /* storage unavailable or parse error */ }

  // 4. Network fetch — four strategies in priority order:
  //    a) iNaturalist by common name  (fastest, best quality)
  //    b) Wikipedia by common name
  //    c) Wikipedia by scientific name (catches "Common Raccoon" → Procyon lotor etc.)
  //    d) iNaturalist by scientific name
  //    Only cache null after all four fail.
  const promise = (async () => {
    let photo = await tryInat(animalName);
    if (!photo) photo = await tryWikipedia(animalName);
    if (!photo && scientificName) photo = await tryWikipedia(scientificName);
    if (!photo && scientificName) photo = await tryInat(scientificName);
    photo = photo ?? null;

    _photoCache.set(key, photo);
    _pendingCache.delete(key);
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data: photo, ts: Date.now() }));
    } catch { /* quota exceeded */ }
    return photo;
  })();

  _pendingCache.set(key, promise);
  return promise;
}
