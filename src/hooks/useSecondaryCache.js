import { useState, useEffect } from 'react';
import { isSecondaryLoaded, onSecondaryLoaded, loadSecondaryCache } from '../data/wildlifeCacheLoader.js';

/**
 * Hook that triggers async loading of the secondary wildlife cache
 * and returns a boolean indicating when it's ready.
 *
 * The load is deferred until the browser is idle via `requestIdleCallback`
 * (with a 2 s fallback for Safari/older browsers) so the initial paint and
 * primary-cache interaction are never blocked by the 1.2 MB secondary bundle.
 *
 * Usage:
 *   const secondaryReady = useSecondaryCache();
 *   // secondaryReady is false until the 48 secondary parks load
 */
export function useSecondaryCache() {
  const [ready, setReady] = useState(isSecondaryLoaded);

  useEffect(() => {
    if (isSecondaryLoaded()) { setReady(true); return; }
    const unsub = onSecondaryLoaded(() => setReady(true));

    // Defer the heavy import until the browser is idle. This keeps first
    // interaction responsive — the primary cache (5 parks) is already loaded
    // eagerly, so nothing the user can immediately see is delayed.
    const schedule = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
      ? (cb) => window.requestIdleCallback(cb, { timeout: 3000 })
      : (cb) => setTimeout(cb, 2000);

    const cancel = typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
      ? (id) => window.cancelIdleCallback(id)
      : (id) => clearTimeout(id);

    const handle = schedule(() => { loadSecondaryCache(); });

    return () => {
      try { cancel(handle); } catch { /* ignore */ }
      unsub();
    };
  }, []);

  return ready;
}
