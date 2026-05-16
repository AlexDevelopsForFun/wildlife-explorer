// Serverless proxy for the NPS Developer API.
//
// Why: the client called NPS with `import.meta.env.VITE_NPS_API_KEY` in the
// `X-Api-Key` header — Vite inlines that into the public bundle. This
// function holds the key SERVER-side (process.env.NPS_API_KEY, NOT
// VITE_-prefixed).
//
// Hardened: GET-only + an allowlist of the one upstream path the app uses.
//
// Routing: a flat function file + a vercel.json rewrite
//   /api/nps-proxy/:path*  →  /api/nps-proxy
// (req.url stays the original source path, e.g. /api/nps-proxy/parks?...)
//   →  https://developer.nps.gov/api/v1/<path...>?<query>   (+ X-Api-Key)

const ALLOW = [
  /^parks(\?|$)/,
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const key = process.env.NPS_API_KEY;
  if (!key) {
    // Unambiguous, actionable signal in the Network tab if the Vercel env
    // var is missing/misnamed — instead of a vague 500.
    return res.status(503).json({
      error: 'NPS_API_KEY is not set on the server',
      code: 'MISSING_SERVER_ENV',
      fix: 'Add NPS_API_KEY (no VITE_ prefix) in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }
  const suffix = req.url.replace(/^\/api\/nps-proxy\/?/, '');
  if (!ALLOW.some((re) => re.test(suffix))) {
    return res.status(403).json({ error: 'path not allowed' });
  }
  const upstream = `https://developer.nps.gov/api/v1/${suffix}`;
  try {
    const r = await fetch(upstream, { headers: { 'X-Api-Key': key } });
    const body = await r.text();
    res
      .status(r.status)
      .setHeader('content-type', r.headers.get('content-type') || 'application/json')
      // Park topic/metadata is near-static — cache 24h at the edge.
      .setHeader('cache-control', r.ok ? 'public, max-age=86400, s-maxage=86400' : 'no-store')
      .send(body);
  } catch {
    res.status(502).json({ error: 'NPS upstream fetch failed' });
  }
}
