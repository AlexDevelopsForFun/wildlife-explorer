/**
 * seenList.js — the visitor's personal wildlife life list.
 *
 * Product goal: retention. "I've seen 47 species — 12 here at Yellowstone,
 * 35 still to find" turns a one-off lookup into a collection people come
 * back to fill in. Distinct from sightingFeedback.js (that logs per-context
 * verdicts to calibrate the rarity MODEL; this is the user's own keepsake
 * of what they've personally spotted, species-global, not context-bound).
 *
 * Design constraints (same as the rest of the app):
 *   - Static site, NO backend → localStorage only. The list is the user's
 *     own; nothing is transmitted. An export gives them a portable copy.
 *   - Privacy: no PII, no location beyond the park they tapped, no IDs.
 *   - Resilient: every storage touch is wrapped — quota / private mode /
 *     disabled storage must never throw into a render.
 *   - A "seen" entry is precious (user effort); unlike the feedback ring
 *     buffer we DON'T silently drop oldest. We cap very high and, if ever
 *     exceeded, refuse new writes rather than lose recorded sightings.
 *
 * Identity: a species is the same animal across every park, so the life
 * list is keyed by species, not by (park, species). scientificName is the
 * stable key when present (common names drift / alias); else the common
 * name, lowercased + trimmed. Per-park progress is derived by intersecting
 * a park's animal list with the seen set.
 */

const STORAGE_KEY = 'wm_seen_v1';
const MAX_SPECIES  = 10000; // a real life list never approaches this

function _safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

function _safeWrite(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    return true;
  } catch {
    return false; // quota / private mode / disabled — silently no-op
  }
}

/** Stable per-species identity. scientificName wins; else common name. */
export function speciesKey(species) {
  if (!species) return '';
  if (typeof species === 'string') return species.toLowerCase().trim();
  const sci = species.scientificName;
  if (sci && typeof sci === 'string' && sci.trim()) return sci.toLowerCase().trim();
  return (species.name ?? '').toLowerCase().trim();
}

/** True if this species is on the life list. */
export function isSeen(species) {
  const k = speciesKey(species);
  if (!k) return false;
  return Object.prototype.hasOwnProperty.call(_safeRead(), k);
}

/**
 * Add a species to the life list (idempotent — keeps the FIRST sighting's
 * park/timestamp, since that's the memorable one).
 * Returns true if persisted (or already present), false if storage failed
 * or the cap was hit.
 */
export function markSeen(species, ctx = {}) {
  const k = speciesKey(species);
  if (!k) return false;
  const all = _safeRead();
  if (Object.prototype.hasOwnProperty.call(all, k)) return true; // keep first
  if (Object.keys(all).length >= MAX_SPECIES) return false;
  all[k] = {
    name: (typeof species === 'object' ? species.name : species) ?? null,
    scientificName: (typeof species === 'object' ? species.scientificName : null) ?? null,
    firstParkId: ctx.parkId ?? null,
    firstParkName: ctx.parkName ?? null,
    ts: new Date().toISOString(),
  };
  return _safeWrite(all);
}

/** Remove a species from the life list. Returns true if persisted. */
export function markUnseen(species) {
  const k = speciesKey(species);
  if (!k) return false;
  const all = _safeRead();
  if (!Object.prototype.hasOwnProperty.call(all, k)) return true;
  delete all[k];
  return _safeWrite(all);
}

/** Flip seen/unseen. Returns the NEW state (true = now seen). */
export function toggleSeen(species, ctx = {}) {
  if (isSeen(species)) { markUnseen(species); return false; }
  markSeen(species, ctx); return true;
}

/** Total species on the life list. */
export function getSeenCount() {
  return Object.keys(_safeRead()).length;
}

/** Set of seen species keys (for cheap repeated lookups in a render pass). */
export function getSeenKeySet() {
  return new Set(Object.keys(_safeRead()));
}

/**
 * Progress for one park: how many of its animals the user has seen.
 * `parkAnimals` is the park's animal array (objects with name/scientificName).
 */
export function parkProgress(parkAnimals) {
  if (!Array.isArray(parkAnimals) || parkAnimals.length === 0) {
    return { seen: 0, total: 0, pct: 0 };
  }
  const seenSet = getSeenKeySet();
  // De-dupe the park list by species key first so pct can't exceed 100%.
  const keys = new Set(parkAnimals.map(a => speciesKey(a)).filter(Boolean));
  let seen = 0;
  for (const k of keys) if (seenSet.has(k)) seen++;
  const total = keys.size;
  return { seen, total, pct: total ? Math.round((seen / total) * 100) : 0 };
}

// Milestone tiers — a counting-UP goal ladder. The old per-park "% of ~585"
// framing made progress feel hopeless (1/585 ≈ 0%); milestones reward every
// sighting and give a concrete next target → return visits.
export const MILESTONES = [
  { at: 1,   label: 'First Sighting' },
  { at: 5,   label: 'Spotter' },
  { at: 10,  label: 'Tracker' },
  { at: 25,  label: 'Naturalist' },
  { at: 50,  label: 'Park Ranger' },
  { at: 100, label: 'Field Expert' },
  { at: 200, label: 'Master Naturalist' },
];

/**
 * Milestone status for a life-list count.
 * → { count, current: {at,label}|null, next: {at,label}|null, toNext: number|null }
 */
export function getMilestone(count = getSeenCount()) {
  let current = null;
  let next = null;
  for (const m of MILESTONES) {
    if (count >= m.at) current = m;
    else { next = m; break; }
  }
  return {
    count,
    current,
    next,
    toNext: next ? next.at - count : null,
  };
}

/** Full life list (newest first) for a "my sightings" view / export. */
export function getLifeList() {
  return Object.entries(_safeRead())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
}

/** Wipe the entire life list (user-initiated reset). */
export function clearAll() {
  return _safeWrite({});
}

/** User-initiated JSON download of their life list. Nothing auto-sent. */
export function exportLifeList() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: STORAGE_KEY,
    count: getSeenCount(),
    species: getLifeList(),
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-wildlife-life-list-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge an exported list back in (file restore or share-token). Accepts the
 * export payload {species:[…]}, a raw {key:{…}} map, or an entry array.
 * The FIRST sighting wins on conflict (earliest ts) — re-importing never
 * clobbers an earlier real sighting. Returns {imported,total} or false.
 */
export function importLifeList(input) {
  try {
    let entries;
    if (Array.isArray(input)) entries = input;
    else if (input && Array.isArray(input.species)) entries = input.species;
    else if (input && typeof input === 'object') {
      entries = Object.entries(input).map(([key, v]) => ({ key, ...v }));
    } else return false;

    const all = _safeRead();
    let imported = 0;
    for (const e of entries) {
      const k = (e?.key || speciesKey(e)).toString().toLowerCase().trim();
      if (!k) continue;
      const incoming = {
        name: e.name ?? null,
        scientificName: e.scientificName ?? null,
        firstParkId: e.firstParkId ?? null,
        firstParkName: e.firstParkName ?? null,
        ts: e.ts ?? new Date().toISOString(),
      };
      const cur = all[k];
      if (!cur) {
        if (Object.keys(all).length >= MAX_SPECIES) break;
        all[k] = incoming;
        imported++;
      } else if (String(incoming.ts) < String(cur.ts)) {
        // Older sighting than what we have → keep the earlier one's metadata.
        all[k] = { ...cur, ...incoming };
      }
    }
    return _safeWrite(all) ? { imported, total: Object.keys(all).length } : false;
  } catch {
    return false;
  }
}

// ── Portable share token (no backend — the token IS the credential) ─────────
function _b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _b64urlDecode(tok) {
  const t = tok.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Compact, self-contained token of the whole list. '' when empty. */
export function encodeShareToken() {
  const list = getLifeList();
  if (list.length === 0) return '';
  // Positional tuples keep it small: [key,name,sci,parkId,parkName,ts].
  const compact = list.map(e =>
    [e.key, e.name, e.scientificName, e.firstParkId, e.firstParkName, e.ts]);
  try { return '1' + _b64urlEncode(JSON.stringify(compact)); }
  catch { return ''; }
}

/** Decode a share token → entry array (or null if malformed). */
export function decodeShareToken(token) {
  try {
    if (!token || token[0] !== '1') return null;
    const arr = JSON.parse(_b64urlDecode(token.slice(1)));
    if (!Array.isArray(arr)) return null;
    return arr.map(([key, name, scientificName, firstParkId, firstParkName, ts]) =>
      ({ key, name, scientificName, firstParkId, firstParkName, ts }));
  } catch { return null; }
}

/**
 * If the page was opened with #list=<token>, merge it in and strip the
 * fragment (so a refresh doesn't re-trigger). Returns imported count.
 * Called once on app mount. Uses the hash (not a query param) so the
 * token never reaches the server — fully private.
 */
export function applyShareTokenFromUrl() {
  try {
    const m = (window.location.hash || '').match(/[#&]list=([^&]+)/);
    if (!m) return 0;
    const entries = decodeShareToken(decodeURIComponent(m[1]));
    history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!entries) return 0;
    const r = importLifeList(entries);
    return r ? r.imported : 0;
  } catch { return 0; }
}

/**
 * Best-effort request that the browser not silently evict our storage
 * under disk pressure. Silent on installed PWAs / engaged sites; safe to
 * call unconditionally. No-op where unsupported.
 */
export function requestPersistentStorage() {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch { /* unsupported — non-fatal */ }
}

// Dev/maintainer console hook, parity with __wmSightings.
if (typeof window !== 'undefined') {
  window.__wmSeen = () => {
    // eslint-disable-next-line no-console
    console.table(getLifeList());
    return { count: getSeenCount() };
  };
}
