// Serverless proxy for the iNaturalist API.
//
// Why: iNaturalist is keyless, so it was always called directly from the
// browser. As observed in the field, those direct calls return "CORS Missing
// Allow Origin" (no Access-Control-Allow-Origin on rate-limited / error
// responses), so the browser blocks them and seasonal histogram +
// species-count data silently breaks for every user.
//
// Server-to-server requests are not subject to CORS, so routing through this
// function fixes the outage. Same hardened shape as the eBird/NPS proxies:
// GET-only + an explicit allowlist of the exact upstream paths the app uses.
//
// Routing: a flat function file + a vercel.json rewrite
//   /api/inat-proxy/:path*  →  /api/inat-proxy
// (req.url stays the original source path, e.g.
//  /api/inat-proxy/observations/histogram?taxon_name=..)
//   →  https://api.inaturalist.org/v1/<path...>?<query>

const ALLOW = [
  /^taxa\/autocomplete(\?|$)/,
  /^observations\/species_counts(\?|$)/,
  /^observations\/histogram(\?|$)/,
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  // Defense-in-depth: legit calls are short (species name + lat/lng).
  // Bound the URI so the allowlist can't be probed with huge inputs.
  if (req.url.length > 1024) {
    return res.status(414).json({ error: 'request URI too long' });
  }
  // req.url = /api/inat-proxy/observations/histogram?taxon_name=..&lat=..
  const suffix = req.url.replace(/^\/api\/inat-proxy\/?/, '');
  if (!ALLOW.some((re) => re.test(suffix))) {
    return res.status(403).json({ error: 'path not allowed' });
  }
  const upstream = `https://api.inaturalist.org/v1/${suffix}`;
  try {
    // iNaturalist asks API consumers to send an identifying User-Agent.
    const r = await fetch(upstream, {
      headers: { 'User-Agent': 'wildlife-explorer (+https://wildlifeexplorer.us)' },
    });
    const body = await r.text();
    res
      .status(r.status)
      .setHeader('content-type', r.headers.get('content-type') || 'application/json')
      // Edge-cache successful responses 6h — histogram / species-count data is
      // slow-moving and this keeps function invocations (and upstream load) low.
      .setHeader('cache-control', r.ok ? 'public, max-age=21600, s-maxage=21600' : 'no-store')
      .send(body);
  } catch {
    res.status(502).json({ error: 'iNaturalist upstream fetch failed' });
  }
}
