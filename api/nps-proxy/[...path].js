// Serverless proxy for the NPS Developer API.
//
// Why: the client called NPS with `import.meta.env.VITE_NPS_API_KEY` in the
// `X-Api-Key` header — Vite inlines that into the public bundle (and the
// pre-existing /nps-api rewrite still leaked it because the client attached
// the header itself). This function holds the key SERVER-side
// (process.env.NPS_API_KEY, NOT VITE_-prefixed).
//
// Hardened: GET-only + an allowlist of the one upstream path the app uses.
//
// Catch-all route: /api/nps-proxy/<path...>?<query>  →
//   https://developer.nps.gov/api/v1/<path...>?<query>   (+ X-Api-Key header)

const ALLOW = [
  /^parks(\?|$)/,
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const key = process.env.NPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'NPS key not configured on server' });
  }
  const suffix = req.url.replace(/^\/api\/nps-proxy\//, '');
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
