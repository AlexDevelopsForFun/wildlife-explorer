/**
 * Vercel serverless function — community sighting feedback (ground truth).
 *
 * Aggregates the anonymous "Did you see this here? 👍/👎" votes ACROSS visitors
 * so the per-(park, species, season) seen-rate becomes a real empirical signal
 * — the path to accuracy beyond the ~0.6% hand-curated anchors.
 *
 *   GET  /api/sightings?parkId=<id>
 *        → { ok, buckets: { "<speciesKey>|<season>": { seen, missed } } }
 *        Edge-cached 6h so most park-opens never touch the datastore.
 *
 *   POST /api/sightings   body { parkId, species, season, verdict }
 *        → { ok, stored }   (verdict: 'seen' | 'missed')
 *
 * Storage: Upstash Redis REST (Vercel Marketplace integration). One hash per
 * park — field "<speciesKey>|<season>:seen|:missed", incremented atomically.
 * Read = 1 HGETALL/park, write = 1 HINCRBY. Both tiny → stays in the free tier.
 *
 * GRACEFUL NO-OP: if the Redis env vars aren't set yet, GET returns an empty
 * map and POST returns { stored:false } (HTTP 200) — the app keeps working
 * exactly as today (localStorage-only), and lights up the moment the store is
 * connected. No PII is ever stored: only the wildlife-context tuple + verdict.
 * (IP is used transiently for rate-limiting and never persisted.)
 */

// Resolve the Upstash/KV REST credentials. Vercel's Marketplace integration
// can name these differently depending on how the store was added (KV_*,
// UPSTASH_*, or a prefixed variant like STORAGE_KV_REST_API_URL), so we check
// the known names first, then AUTO-DETECT any "*REST*URL"/"*REST*TOKEN" pair
// (with an https Upstash URL) — making setup work regardless of the exact
// var names the integration chose.
function resolveRedisCreds() {
  const e = process.env;
  let url = e.KV_REST_API_URL || e.UPSTASH_REDIS_REST_URL || null;
  let token = e.KV_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN || null;
  if (!url) {
    const k = Object.keys(e).find(
      (key) => /REST.*URL$/i.test(key) && /^https:\/\//.test(e[key] || '')
    );
    if (k) url = e[k];
  }
  if (!token) {
    const k = Object.keys(e).find((key) => /REST.*TOKEN$/i.test(key) && e[key]);
    if (k) token = e[k];
  }
  return { url, token };
}
const { url: REDIS_URL, token: REDIS_TOKEN } = resolveRedisCreds();
const CONFIGURED = !!(REDIS_URL && REDIS_TOKEN);

const RATE_PER_MIN = 30;   // max votes per IP per minute — blocks scripted floods
const KEY_NS = 'sight:v1:';

const ALLOWED_ORIGIN = (origin) => {
  if (!origin) return null;
  try {
    const h = new URL(origin).hostname;
    return (h === 'wildlifeexplorer.us' || h.endsWith('.wildlifeexplorer.us')
      || h.endsWith('.vercel.app') || h === 'localhost') ? origin : null;
  } catch { return null; }
};
const isStr = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
// Stable, storage-safe species key (mirrors the client + sightingFeedback.js).
const speciesKey = (s) => String(s).toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 80);
const seasonKey  = (s) => (['spring', 'summer', 'fall', 'winter', 'any'].includes(s) ? s : 'any');

// ── Upstash Redis REST helpers ───────────────────────────────────────────────
async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const { result } = await r.json();
  return result;
}

export default async function handler(req, res) {
  const allowed = ALLOWED_ORIGIN(req.headers.origin);
  if (allowed) res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: aggregated buckets for a park ────────────────────────────────────
  if (req.method === 'GET') {
    const parkId = String(req.query?.parkId ?? '');
    if (!isStr(parkId, 80)) return res.status(400).json({ ok: false, error: 'parkId required' });
    if (!CONFIGURED) {
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ ok: true, configured: false, buckets: {} });
    }
    try {
      const flat = await redis(['HGETALL', KEY_NS + parkId]); // [field,val,field,val,…]
      const buckets = {};
      for (let i = 0; i < (flat?.length ?? 0); i += 2) {
        const field = flat[i];                  // "<speciesKey>|<season>:seen"
        const val = parseInt(flat[i + 1], 10) || 0;
        const m = field.match(/^(.*):(seen|missed)$/);
        if (!m) continue;
        const bk = m[1];
        (buckets[bk] ??= { seen: 0, missed: 0 })[m[2]] = val;
      }
      // Slow-moving data — edge-cache 6h so repeat park-opens skip the datastore.
      res.setHeader('cache-control', 'public, max-age=21600, s-maxage=21600');
      return res.status(200).json({ ok: true, configured: true, buckets });
    } catch {
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json({ ok: true, configured: true, buckets: {} }); // fail soft
    }
  }

  // ── POST: record one vote ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { parkId, species, season, verdict } = req.body ?? {};
    if (!isStr(parkId, 80) || !isStr(species, 80)) {
      return res.status(400).json({ ok: false, error: 'parkId and species required' });
    }
    if (verdict !== 'seen' && verdict !== 'missed') {
      return res.status(400).json({ ok: false, error: "verdict must be 'seen' or 'missed'" });
    }
    if (!CONFIGURED) return res.status(200).json({ ok: true, stored: false }); // graceful no-op

    try {
      // Per-IP, per-minute rate limit (transient key, IP never persisted).
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
      const rlKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
      const n = await redis(['INCR', rlKey]);
      if (n === 1) await redis(['EXPIRE', rlKey, '120']);
      if (n > RATE_PER_MIN) return res.status(429).json({ ok: false, error: 'rate limited' });

      const field = `${speciesKey(species)}|${seasonKey(season)}:${verdict}`;
      await redis(['HINCRBY', KEY_NS + parkId, field, '1']);
      return res.status(200).json({ ok: true, stored: true });
    } catch {
      return res.status(200).json({ ok: true, stored: false }); // fail soft — never break a vote
    }
  }

  return res.status(405).json({ ok: false, error: 'method not allowed' });
}
