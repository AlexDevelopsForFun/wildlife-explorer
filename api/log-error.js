// Minimal client-error sink — no third-party service, no storage.
//
// The client posts a small JSON blob on uncaught errors/rejections (see
// main.jsx); this function writes it to console.error, which lands in the
// Vercel runtime logs (Dashboard → Project → Logs, filter "[client-error]").
// That gives real-user breakage visibility without a Sentry dependency.
//
// Hardened: POST-only, body clamped, fields whitelisted + truncated, 204
// always (an error sink must never become an error source).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    let raw = req.body;
    if (typeof raw !== 'string') raw = JSON.stringify(raw ?? {});
    if (raw.length > 4096) raw = raw.slice(0, 4096);
    const b = JSON.parse(raw || '{}');
    const clamp = (v, n) => String(v ?? '').slice(0, n);
    console.error('[client-error]', JSON.stringify({
      msg:   clamp(b.msg, 300),
      src:   clamp(b.src, 200),
      line:  Number(b.line) || 0,
      stack: clamp(b.stack, 800),
      url:   clamp(b.url, 200),
      ua:    clamp(req.headers['user-agent'], 120),
      ts:    new Date().toISOString(),
    }));
  } catch { /* never throw from the sink */ }
  res.status(204).end();
}
