/**
 * sightingFeedback.js — ground-truth visitor-encounter signal.
 *
 * Why this exists: the rarity model is calibrated against ~206 hand-curated
 * anchors (scripts/rarityAnchors.json) — roughly 0.6% of the ~36k cache
 * entries. The other ~99.4% is unvalidated. No amount of curation reaches
 * it. The only path to accuracy beyond expert curation is real visitor
 * feedback: "the model said X here, in this season/zone/effort/time — did
 * you actually see it?"
 *
 * Design constraints:
 *   - The app is a static site (GitHub Pages / Vercel). NO backend, so this
 *     logs to localStorage and exposes a JSON export the maintainer can
 *     collect and feed back into anchors/overrides offline.
 *   - Privacy: NO PII, NO IP, NO geolocation, NO identifiers. Only the
 *     wildlife-context tuple + the model's prediction + the user's verdict.
 *     The data is the user's own (localStorage) until they choose to export.
 *   - Bounded: a ring buffer (MAX_ENTRIES) so it can never grow unbounded
 *     or slow the app.
 *   - Resilient: every call is wrapped — a storage failure (quota, private
 *     mode, disabled storage) must never break the app or lose a render.
 *
 * Each record is exactly what makes it ground truth: the prediction in
 * full context paired with the observed outcome. Aggregated offline, a
 * (park, species, season, zone, effort) bucket's seen-rate is a direct
 * empirical estimate of the very probability the model is trying to
 * predict — strictly better signal than any single hand-set anchor.
 */

const STORAGE_KEY = 'wm_sightings_v1';
const MAX_ENTRIES = 2000; // ring buffer cap — newest kept

function _safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function _safeWrite(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    return true;
  } catch {
    return false; // quota / private mode / disabled — silently no-op
  }
}

/**
 * Stable key for a (park, species, context) bucket so the UI can show the
 * user's prior verdict and avoid re-nagging for the same context.
 */
export function sightingKey({ parkId, species, season, zone, effort, visitTime }) {
  return [
    parkId ?? '',
    (species ?? '').toLowerCase().trim(),
    season ?? 'any',
    zone ?? 'park',
    effort ?? 'casual',
    visitTime ?? 'any',
  ].join('|');
}

/** The user's prior verdict for a context, or null. */
export function getSightingVerdict(ctx) {
  const key = sightingKey(ctx);
  const rec = _safeRead().find(r => r.key === key);
  return rec ? rec.verdict : null;
}

/**
 * Record (or update) a sighting verdict for a context.
 * verdict: 'seen' | 'missed'
 * Returns true if persisted, false if storage was unavailable.
 */
export function recordSighting(ctx, verdict) {
  if (verdict !== 'seen' && verdict !== 'missed') return false;
  const key = sightingKey(ctx);
  const entry = {
    key,
    parkId: ctx.parkId ?? null,
    species: ctx.species ?? null,
    scientificName: ctx.scientificName ?? null,
    predictedRarity: ctx.predictedRarity ?? null, // what the model showed
    season: ctx.season ?? 'any',
    zone: ctx.zone ?? null,
    effort: ctx.effort ?? 'casual',
    visitTime: ctx.visitTime ?? 'any',
    verdict,                       // observed outcome
    ts: new Date().toISOString(),
  };
  const arr = _safeRead();
  // De-dupe by context key — a later verdict supersedes an earlier one
  // (visitor corrects themselves, or revisits). Keeps the buffer honest.
  const without = arr.filter(r => r.key !== key);
  without.push(entry);
  // Ring-buffer trim: keep the newest MAX_ENTRIES.
  const trimmed = without.length > MAX_ENTRIES
    ? without.slice(without.length - MAX_ENTRIES)
    : without;
  return _safeWrite(trimmed);
}

/** Clear a single context's verdict (user toggles off). */
export function clearSighting(ctx) {
  const key = sightingKey(ctx);
  const arr = _safeRead();
  return _safeWrite(arr.filter(r => r.key !== key));
}

/** All recorded sightings (for export / aggregation). */
export function getAllSightings() {
  return _safeRead();
}

/**
 * Aggregate into (park, species, season, zone, effort) buckets with an
 * empirical seen-rate — the maintainer-facing summary that maps directly
 * onto what anchors/overrides encode.
 */
export function summarizeSightings() {
  const buckets = new Map();
  for (const r of _safeRead()) {
    const bk = [r.parkId, (r.species ?? '').toLowerCase(), r.season, r.zone ?? 'park', r.effort].join('|');
    const b = buckets.get(bk) ?? {
      parkId: r.parkId, species: r.species, season: r.season,
      zone: r.zone ?? 'park', effort: r.effort,
      predictedRarity: r.predictedRarity, seen: 0, missed: 0,
    };
    if (r.verdict === 'seen') b.seen++; else if (r.verdict === 'missed') b.missed++;
    buckets.set(bk, b);
  }
  return [...buckets.values()].map(b => ({
    ...b,
    n: b.seen + b.missed,
    empiricalSeenRate: b.seen + b.missed > 0
      ? +(b.seen / (b.seen + b.missed)).toFixed(3)
      : null,
  }));
}

/**
 * Trigger a JSON download of the raw log + the aggregated summary.
 * Maintainer collects these offline to refine anchors/overrides. No
 * automatic transmission anywhere — fully user-initiated.
 */
export function exportSightings() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: 'wm_sightings_v1',
    note: 'Anonymous wildlife-encounter feedback. No PII. Aggregate empiricalSeenRate per bucket is the ground-truth signal for rarity calibration.',
    raw: getAllSightings(),
    summary: summarizeSightings(),
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildlife-sightings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

// Maintainer console hook — `window.__wmSightings()` dumps the summary
// without needing the export download (handy during dev / debugging).
if (typeof window !== 'undefined') {
  window.__wmSightings = () => {
    // eslint-disable-next-line no-console
    console.table(summarizeSightings());
    return summarizeSightings();
  };
}
