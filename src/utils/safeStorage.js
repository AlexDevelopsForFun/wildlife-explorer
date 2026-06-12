// localStorage.setItem with quota recovery.
//
// The API caches legitimately fill the origin's ~5-10MB quota over time (they
// have their own LRU eviction inside apiService), which makes every OTHER
// plain setItem on the page — the life list, preferences — throw
// QuotaExceededError and silently fail. Verified live: an engaged session
// reaches 10MB/594 keys, after which "Mark seen" stops persisting.
//
// Recovery: user data ALWAYS outranks cached API responses — evict the largest
// cache entries (cache namespaces only, never user data) until the write fits.
const CACHE_KEY_RE = /^wm_(loc|inat|ebird|wiki|gbif|nps|hotspot|barchart|tier)/;

export function safeSetItem(key, value) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try { localStorage.setItem(key, value); return true; } catch { /* evict & retry */ }
    let biggest = null, biggestLen = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k === key || !CACHE_KEY_RE.test(k)) continue;
      const len = (localStorage.getItem(k) || '').length;
      if (len > biggestLen) { biggest = k; biggestLen = len; }
    }
    if (!biggest) break;                       // nothing evictable left
    try { localStorage.removeItem(biggest); } catch { break; }
  }
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
