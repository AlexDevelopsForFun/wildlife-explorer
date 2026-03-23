// ── AI fun-fact service ────────────────────────────────────────────────────────
// For animals with no real description (generic placeholders or null funFact),
// calls /api/ai-funfact to generate a park-specific 2-3 sentence description.
// Results are cached in localStorage (30-day TTL) so the API fires once per
// animal per park per device. Concurrent requests for the same key are
// deduplicated via a pending-promise map.

const _descCache   = new Map(); // { key → description string }
const _pendingDesc = new Map(); // { key → Promise<string|null> }
const LS_PREFIX    = 'wm_desc_v1_';
const DESC_TTL     = 30 * 24 * 60 * 60 * 1000; // 30 days

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
  const promise = (async () => {
    try {
      const res = await fetch('/api/ai-funfact', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ animalName, parkName, parkState, animalType }),
      });

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
      console.warn('[descriptionService] fetch failed:', err.message);
      return null;
    } finally {
      _pendingDesc.delete(key);
    }
  })();

  _pendingDesc.set(key, promise);
  return promise;
}
