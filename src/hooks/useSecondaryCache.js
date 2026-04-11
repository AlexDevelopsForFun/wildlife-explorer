import { useState, useEffect } from 'react';
import { isSecondaryLoaded, onSecondaryLoaded, loadSecondaryCache } from '../data/wildlifeCacheLoader.js';

/**
 * Hook that triggers async loading of the secondary wildlife cache
 * and returns a boolean indicating when it's ready.
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
    loadSecondaryCache();
    return unsub;
  }, []);

  return ready;
}
