// ── AI fun-fact service ────────────────────────────────────────────────────────
// Generates park-specific animal descriptions via the /api/ai-funfact serverless
// function (Anthropic claude-haiku). This service is NOT called from the UI —
// descriptions are now pre-fetched at build time by scripts/enrichDescriptions.js
// and stored in wildlifeCache.js as animal.description + animal.descriptionSource.
//
// This module is kept intact so it can be re-enabled (e.g. for live animals that
// don't appear in the static cache). To re-enable, import fetchGeneratedDescription
// in App.jsx and call it from the AnimalCard / ExceptionalCard useEffect.
//
// The localStorage cache and deduplication infrastructure remain active so that
// if re-enabled, no redundant API calls fire.

const _descCache   = new Map(); // { key → description string }
const _pendingDesc = new Map(); // { key → Promise<string|null> }
const LS_PREFIX    = 'wm_desc_v1_';
const DESC_TTL     = 30 * 24 * 60 * 60 * 1000; // 30 days
const TIMEOUT_MS   = 8000;                       // 8 s — give up and hide shimmer

// Normalise to a stable localStorage key: "Ruffed Grouse" + "Acadia" → "ruffed_grouse__acadia_np"
function normKey(animalName, parkName) {
  const norm = s => s.toLowerCase().trim().replace(/\s+/g, '_');
  return `${norm(animalName)}__${norm(parkName)}`;
}

// ── Placeholder detection ──────────────────────────────────────────────────────
// Returns true when an animal's funFact is absent or is a generic API-generated
// placeholder that should be replaced with a real AI description.
const PLACEHOLDER_PATTERNS = [
  /^Confirmed at this park's eBird hotspot\.?$/i,
  /^Recorded in this region \(eBird historical checklist\)\.?$/i,
  /^\d+ research-grade iNaturalist observations at this park\.?$/i,
  /^Recorded \d+ times on iNaturalist at this park\.?$/i,
  /^Appears on \d+% of .+ eBird checklists/i,
  /^Verified in \d+ iNaturalist research-grade observations/i,
];

export function needsGeneratedDescription(funFact) {
  if (!funFact) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(funFact.trim()));
}

// ── Main public API ────────────────────────────────────────────────────────────
/**
 * Returns a generated fun fact for the given animal+park combination.
 * Checks memory cache → localStorage cache → API (in that order).
 * Returns null if the API call fails so callers can fall back gracefully.
 */
export async function fetchGeneratedDescription(animalName, parkName, parkState, animalType) {
  const key = normKey(animalName, parkName);

  // 1. Memory cache — instant
  if (_descCache.has(key)) return _descCache.get(key);

  // 2. Deduplicate concurrent calls for the same key
  if (_pendingDesc.has(key)) return _pendingDesc.get(key);

  // 3. localStorage cache (30-day TTL)
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw !== null) {
      const { data, ts } = JSON.parse(raw);
      if (ts && Date.now() - ts < DESC_TTL) {
        _descCache.set(key, data);
        return data;
      }
      localStorage.removeItem(LS_PREFIX + key); // expired — evict
    }
  } catch { /* storage unavailable */ }

  // 4. API call — POST to the Vercel serverless function
  //    AbortController gives us the 8-second timeout; on abort the catch
  //    returns null so callers hide the shimmer with a clean empty state.
  const promise = (async () => {
    const controller = new AbortController();
    const timerId = setTimeout(() => {
      controller.abort();
      console.warn('[descriptionService] timed out after 8 s:', key);
    }, TIMEOUT_MS);

    try {
      const res = await fetch('/api/ai-funfact', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ animalName, parkName, parkState, animalType }),
        signal:  controller.signal,
      });

      clearTimeout(timerId);

      if (!res.ok) {
        console.warn('[descriptionService] api error', res.status);
        return null;
      }

      const { description } = await res.json();
      if (!description) return null;

      _descCache.set(key, description);
      try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data: description, ts: Date.now() }));
      } catch { /* quota exceeded */ }

      return description;
    } catch (err) {
      clearTimeout(timerId);
      if (err.name !== 'AbortError') {
        console.warn('[descriptionService] fetch failed:', err.message);
      }
      return null;
    } finally {
      _pendingDesc.delete(key);
    }
  })();

  _pendingDesc.set(key, promise);
  return promise;
}
