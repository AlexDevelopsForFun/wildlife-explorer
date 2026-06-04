// ── Community sightings service ─────────────────────────────────────────────
// Talks to /api/sightings: posts a visitor's vote and fetches per-park
// aggregated counts so cards can show real cross-visitor ground truth
// ("9 of 12 visitors saw this here"). Every call is wrapped — the feedback
// UI must never break a render, and the backend no-ops gracefully until the
// datastore is connected, so this is safe to ship immediately.

const _parkCache   = new Map(); // parkId → { buckets, configured }
const _parkPending = new Map();

// MUST match api/sightings.js so client lookups hit the same buckets.
export function sightingsBucketKey(species, season) {
  const sp = String(species ?? '').toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80);
  const se = ['spring', 'summer', 'fall', 'winter', 'any'].includes(season) ? season : 'any';
  return `${sp}|${se}`;
}

// Fetch a park's aggregated vote counts. Cached per park for the session
// (the server also edge-caches 6h, so this is doubly cheap). Returns
// { buckets: { "<sp>|<season>": { seen, missed } }, configured }.
export async function fetchParkSightings(parkId) {
  if (!parkId) return { buckets: {}, configured: false };
  if (_parkCache.has(parkId)) return _parkCache.get(parkId);
  if (_parkPending.has(parkId)) return _parkPending.get(parkId);

  const promise = (async () => {
    try {
      const res = await fetch(`/api/sightings?parkId=${encodeURIComponent(parkId)}`);
      if (!res.ok) throw new Error(`sightings ${res.status}`);
      const data = await res.json();
      const out = { buckets: data.buckets ?? {}, configured: !!data.configured };
      _parkCache.set(parkId, out);
      return out;
    } catch {
      const empty = { buckets: {}, configured: false };
      _parkCache.set(parkId, empty); // cache the miss for the session
      return empty;
    } finally {
      _parkPending.delete(parkId);
    }
  })();

  _parkPending.set(parkId, promise);
  return promise;
}

// Record one vote. Fire-and-forget; never throws. The OPTIMISTIC display
// update is owned solely by the panel's bumpCommunity (immutable setState) —
// this function only POSTs. (It must NOT also mutate _parkCache: the panel's
// community state aliases that same object, so a second in-place bump here
// would double-count a single vote.)
export function postSighting({ parkId, species, season, verdict }) {
  if (!parkId || !species || (verdict !== 'seen' && verdict !== 'missed')) return;
  try {
    fetch('/api/sightings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parkId, species, season, verdict }),
      keepalive: true, // let it complete even if the panel closes
    }).catch(() => {});
  } catch { /* never break the UI */ }
}
