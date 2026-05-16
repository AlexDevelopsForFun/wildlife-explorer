// Serverless proxy for the eBird API.
//
// Why: the client used to call api.ebird.org directly with
// `import.meta.env.VITE_EBIRD_API_KEY`, which Vite inlines into the public
// bundle — the key shipped to every visitor. This function holds the key
// SERVER-side (process.env.EBIRD_API_KEY, NOT VITE_-prefixed) so it never
// reaches the browser.
//
// Hardened against open-proxy abuse (a key-injecting proxy that forwards
// arbitrary requests is itself a vulnerability): GET-only, and an explicit
// allowlist of the exact upstream path prefixes the app actually uses.
//
// Catch-all route: /api/ebird-proxy/<path...>?<query>  →
//   https://api.ebird.org/v2/<path...>?<query>   (+ X-eBirdApiToken header)

const ALLOW = [
  /^ref\/hotspot\/geo(\?|$)/,
  /^product\/spplist\/[A-Za-z0-9]+(\?|$)/,
  /^data\/obs\/geo\/recent(\?|$)/,
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const key = process.env.EBIRD_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'eBird key not configured on server' });
  }
  // req.url = /api/ebird-proxy/ref/hotspot/geo?lat=..&lng=..
  const suffix = req.url.replace(/^\/api\/ebird-proxy\//, '');
  if (!ALLOW.some((re) => re.test(suffix))) {
    return res.status(403).json({ error: 'path not allowed' });
  }
  const upstream = `https://api.ebird.org/v2/${suffix}`;
  try {
    const r = await fetch(upstream, { headers: { 'X-eBirdApiToken': key } });
    const body = await r.text();
    res
      .status(r.status)
      .setHeader('content-type', r.headers.get('content-type') || 'application/json')
      // Edge-cache successful responses 6h — eBird hotspot/obs data is slow-moving
      // and this keeps function invocations (and upstream key usage) low.
      .setHeader('cache-control', r.ok ? 'public, max-age=21600, s-maxage=21600' : 'no-store')
      .send(body);
  } catch {
    res.status(502).json({ error: 'eBird upstream fetch failed' });
  }
}
