/**
 * wildlifeCacheLoader.js — Chunked cache loading for performance
 *
 * Primary cache (15 most visited parks) loads synchronously on startup.
 * Secondary cache (48 remaining parks) loads asynchronously after first render.
 *
 * Consumers import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT, secondaryLoaded }
 * and get a reactive cache that grows once secondary data arrives.
 */

import { WILDLIFE_CACHE_PRIMARY } from './wildlifeCachePrimary.js';

// The merged cache starts with primary parks only
export const WILDLIFE_CACHE = { ...WILDLIFE_CACHE_PRIMARY };

export const WILDLIFE_CACHE_BUILT_AT = "2026-03-31T23:14:51.921Z";

// Tracks whether the secondary cache has been loaded
let _secondaryLoaded = false;
let _secondaryLoadPromise = null;
const _listeners = new Set();

export function isSecondaryLoaded() {
  return _secondaryLoaded;
}

export function onSecondaryLoaded(callback) {
  if (_secondaryLoaded) { callback(); return () => {}; }
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

export function loadSecondaryCache() {
  if (_secondaryLoadPromise) return _secondaryLoadPromise;
  _secondaryLoadPromise = import('./wildlifeCacheSecondary.js').then(mod => {
    const secondary = mod.WILDLIFE_CACHE_SECONDARY;
    for (const [id, val] of Object.entries(secondary)) {
      WILDLIFE_CACHE[id] = val;
    }
    _secondaryLoaded = true;
    for (const cb of _listeners) {
      try { cb(); } catch {}
    }
    _listeners.clear();
    return secondary;
  });
  return _secondaryLoadPromise;
}
