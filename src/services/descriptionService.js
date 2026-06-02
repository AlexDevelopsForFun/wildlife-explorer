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
  /^Officially documented in the NPS wildlife registry/i,
  // Live runtime formats (state-park + live national-park species):
  /^Last reported .+ \(eBird\)\.?$/i,                 // eBird geo/recent birds
  /^Verified in \d+ iNaturalist research-grade observations near this location/i,
];

export function needsGeneratedDescription(funFact) {
  if (!funFact) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(funFact.trim()));
}

// ── Runtime factual species descriptions ────────────────────────────────────
// Fetches a real, SOURCED natural-history summary for a species — the same
// content national parks bake in at build time via scripts/enrichDescriptions.js
// (iNaturalist's wikipedia_summary, falling back to the Wikipedia REST summary).
// Species-keyed (reusable across every park) and cached in memory + localStorage,
// so each species is fetched at most once per device. Returns { text, source }
// | null. No fabrication: if no sourced summary matches, returns null and the
// card keeps its factual observation-record line.
const _factCache    = new Map();
const _factPending  = new Map();
const FACT_PREFIX   = 'wm_factdesc_v1_';
const FACT_TTL      = 30 * 24 * 60 * 60 * 1000; // 30 days
const FACT_NEG_TTL  = 3  * 24 * 60 * 60 * 1000; // 3 days for null (let new sources fill in)

function speciesKeyFor(name, sci) {
  return (sci || name || '').toLowerCase().trim().replace(/\s+/g, '_');
}

function firstNSentences(text, n = 2) {
  const parts = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g);
  if (!parts) return text.trim();
  return parts.slice(0, n).join(' ').trim();
}

// iNaturalist taxon → wikipedia_summary, with a name-match guard so a fuzzy
// query can't attach the wrong species' description.
async function factFromInat(name, sci) {
  try {
    const query = sci || name;
    const res = await fetch(
      `/api/inat-proxy/taxa?q=${encodeURIComponent(query)}&per_page=1&locale=en&is_active=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const taxon = data?.results?.[0];
    const summary = taxon?.wikipedia_summary?.replace(/<[^>]+>/g, '').trim();
    if (!summary || summary.length < 30) return null;
    const common  = name.toLowerCase();
    const rCommon = (taxon.preferred_common_name ?? '').toLowerCase();
    const rSci    = (taxon.name ?? '').toLowerCase();
    const sciL    = (sci ?? '').toLowerCase();
    const matches =
      (rCommon && (rCommon.includes(common.split(' ').pop()) || common.includes(rCommon.split(' ').pop()))) ||
      (sciL && rSci.startsWith(sciL.split(' ')[0]));
    if (!matches) return null;
    return { text: firstNSentences(summary, 2), source: 'iNaturalist' };
  } catch { return null; }
}

// Wikipedia REST summary (CORS-enabled, called direct — same as photoService).
// Rejects non-animal disambiguation pages (city/river/etc.).
async function factFromWikipedia(name) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.extract || data.type === 'disambiguation' || data.extract.length < 30) return null;
    const desc = (data.description ?? '').toLowerCase();
    const bad = ['city', 'town', 'county', 'region', 'river', 'mountain', 'lake',
                 'disambiguation', 'village', 'municipality'];
    if (bad.some(t => desc.includes(t))) return null;
    return { text: firstNSentences(data.extract, 2), source: 'Wikipedia' };
  } catch { return null; }
}

export async function fetchAnimalDescription(animalName, scientificName) {
  if (!animalName && !scientificName) return null;
  const key = speciesKeyFor(animalName, scientificName);

  if (_factCache.has(key)) return _factCache.get(key);
  if (_factPending.has(key)) return _factPending.get(key);

  try {
    const raw = localStorage.getItem(FACT_PREFIX + key);
    if (raw !== null) {
      const { data, ts } = JSON.parse(raw);
      const ttl = data ? FACT_TTL : FACT_NEG_TTL;
      if (ts && Date.now() - ts < ttl) { _factCache.set(key, data); return data; }
      localStorage.removeItem(FACT_PREFIX + key);
    }
  } catch { /* storage unavailable */ }

  const promise = (async () => {
    let result = await factFromInat(animalName, scientificName);
    if (!result) result = await factFromWikipedia(animalName);
    if (!result && scientificName) result = await factFromWikipedia(scientificName);
    result = result ?? null;
    _factCache.set(key, result);
    _factPending.delete(key);
    try {
      localStorage.setItem(FACT_PREFIX + key, JSON.stringify({ data: result, ts: Date.now() }));
    } catch { /* quota */ }
    return result;
  })();

  _factPending.set(key, promise);
  return promise;
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
