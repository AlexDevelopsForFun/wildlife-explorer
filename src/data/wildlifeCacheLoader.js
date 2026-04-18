/**
 * wildlifeCacheLoader.js — Tiered cache loading for performance
 *
 * Three tiers:
 *   Primary   (15 most-visited parks)       — sync load, on critical path.
 *   Tier 2    (next 15 parks)                — async load on first idle callback.
 *   Tier 3    (remaining ~33 parks)          — async load on second idle or first search.
 *
 * Consumers still import { WILDLIFE_CACHE, isSecondaryLoaded, onSecondaryLoaded,
 * loadSecondaryCache } — the API is unchanged. "Secondary loaded" now means
 * BOTH tier-2 and tier-3 have finished.
 */

import { WILDLIFE_CACHE_PRIMARY } from './wildlifeCachePrimary.js';

// The merged cache starts with primary parks only and grows as tiers arrive.
export const WILDLIFE_CACHE = { ...WILDLIFE_CACHE_PRIMARY };

export const WILDLIFE_CACHE_BUILT_AT = "2026-03-31T23:14:51.921Z";

// Tracks tier load state
let _tier2Loaded = false;
let _tier3Loaded = false;
let _tier2Promise = null;
let _tier3Promise = null;
const _listeners = new Set();

function _notify() {
  for (const cb of _listeners) {
    try { cb(); } catch { /* swallow callback errors */ }
  }
}

// "Secondary loaded" means BOTH tiers are in. Preserves public API.
export function isSecondaryLoaded() {
  return _tier2Loaded && _tier3Loaded;
}

export function isTier2Loaded() { return _tier2Loaded; }
export function isTier3Loaded() { return _tier3Loaded; }

export function onSecondaryLoaded(callback) {
  if (isSecondaryLoaded()) { callback(); return () => {}; }
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

// ── Tier 2: next 15 most-visited parks (popular long tail) ──────────────────
export function loadTier2() {
  if (_tier2Promise) return _tier2Promise;
  _tier2Promise = import('./wildlifeCacheTier2.js').then(mod => {
    const data = mod.WILDLIFE_CACHE_TIER2;
    for (const [id, val] of Object.entries(data)) {
      WILDLIFE_CACHE[id] = val;
    }
    _tier2Loaded = true;
    _notify();
    return data;
  });
  return _tier2Promise;
}

// ── Tier 3: remaining parks (long tail) ──────────────────────────────────────
export function loadTier3() {
  if (_tier3Promise) return _tier3Promise;
  _tier3Promise = import('./wildlifeCacheTier3.js').then(mod => {
    const data = mod.WILDLIFE_CACHE_TIER3;
    for (const [id, val] of Object.entries(data)) {
      WILDLIFE_CACHE[id] = val;
    }
    _tier3Loaded = true;
    _notify();
    if (isSecondaryLoaded()) _listeners.clear();
    return data;
  });
  return _tier3Promise;
}

// Public API preserved — triggers both tiers. Tier 3 is chained off tier 2 so
// the network pipe isn't saturated during first paint.
export function loadSecondaryCache() {
  const t2 = loadTier2();
  // Kick off tier-3 only once tier-2 settles — keeps the network idle-friendly.
  t2.then(() => loadTier3(), () => loadTier3());
  return t2;
}
