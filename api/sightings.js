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
 * Storage: Redis (Vercel Marketplace integration), connected over the standard
 * Redis protocol via the REDIS_URL connection string + ioredis. One hash per
 * park — field "<speciesKey>|<season>:seen|:missed", incremented atomically.
 * Read = 1 HGETALL/park, write = 1 HINCRBY. Both tiny → stays in the free tier.
 *
 * GRACEFUL NO-OP: if REDIS_URL isn't set yet, GET returns an empty map and POST
 * returns { stored:false } (HTTP 200) — the app keeps working exactly as today
 * (localStorage-only), and lights up the moment the store is connected. No PII
 * is ever stored: only the wildlife-context tuple + verdict. (IP is used
 * transiently for rate-limiting and never persisted.)
 */
import Redis from 'ioredis';

// The Vercel Redis/Marketplace integration injects a connection string. Accept
// the common names so setup works regardless of which the integration chose.
const REDIS_URL =
  process.env.REDIS_URL || process.env.KV_URL ||
  process.env.UPSTASH_REDIS_URL || process.env.STORAGE_REDIS_URL || null;
const CONFIGURED = !!REDIS_URL;

const RATE_PER_MIN = 30;   // max votes per IP per minute — blocks scripted floods
const KEY_NS = 'sight:v1:';

// Module-scoped client, reused across warm invocations. Lazy + bounded retries
// so a transient datastore hiccup fails soft (caught below) instead of hanging.
let _client = null;
function getClient() {
  if (!CONFIGURED) return null;
  if (_client) return _client;
  _client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    connectTimeout: 4000,
    lazyConnect: true,
    enableReadyCheck: false,
  });
  _client.on('error', () => {}); // swallow — every call site is wrapped + fails soft
  return _client;
}

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
      const hash = await getClient().hgetall(KEY_NS + parkId); // { "<field>": "<val>", … }
      const buckets = {};
      for (const [field, valStr] of Object.entries(hash || {})) {
        const val = parseInt(valStr, 10) || 0;
        const m = field.match(/^(.*):(seen|missed)$/);
        if (!m) continue;
        (buckets[m[1]] ??= { seen: 0, missed: 0 })[m[2]] = val;
      }
      // Short edge cache: absorbs traffic bursts (keeps datastore reads cheap)
      // while keeping votes near-fresh — a reload reflects new votes within ~60s
      // (the in-session optimistic update shows the user's own vote instantly).
      res.setHeader('cache-control', 'public, max-age=60, s-maxage=60');
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
      const client = getClient();
      // Per-IP, per-minute rate limit (transient key, IP never persisted).
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
      const rlKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
      const n = await client.incr(rlKey);
      if (n === 1) await client.expire(rlKey, 120);
      if (n > RATE_PER_MIN) return res.status(429).json({ ok: false, error: 'rate limited' });

      const field = `${speciesKey(species)}|${seasonKey(season)}:${verdict}`;
      await client.hincrby(KEY_NS + parkId, field, 1);
      return res.status(200).json({ ok: true, stored: true });
    } catch {
      return res.status(200).json({ ok: true, stored: false }); // fail soft — never break a vote
    }
  }

  return res.status(405).json({ ok: false, error: 'method not allowed' });
}
