/**
 * Vercel serverless function — eBird bar-chart proxy
 *
 * The /v2/product/barChart endpoint on api.ebird.org does not include CORS
 * headers, and the API key must be injected as X-eBirdApiToken. In dev, the
 * custom Vite plugin in vite.config.js handles this. In production on Vercel,
 * vercel.json rewrites /ebird-chart/:path* to this function.
 *
 * Environment variable required (set in Vercel Dashboard → Settings → Environment Variables):
 *   VITE_EBIRD_API_KEY  — your eBird API key (same value as in .env)
 */
export default async function handler(req, res) {
  // req.url is the original requested path, e.g. /ebird-chart/v2/product/barChart?r=yell&...
  const targetPath = req.url.replace(/^\/ebird-chart/, '') || '/';
  const url = `https://api.ebird.org${targetPath}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'X-eBirdApiToken': process.env.VITE_EBIRD_API_KEY ?? '',
        'User-Agent':      'Mozilla/5.0 (compatible; WildlifeMap/1.0)',
        'Accept':          'text/plain,text/csv,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const body = await upstream.text();
    const ct   = upstream.headers.get('content-type') ?? 'text/plain';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', ct);
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(502).send(`eBird proxy error: ${err.message}`);
  }
}
