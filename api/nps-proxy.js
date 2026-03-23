/**
 * Vercel serverless function — NPS Data API proxy
 *
 * The NPS Developer API does not send CORS headers, so browsers cannot call
 * it directly. In dev, vite.config.js proxies /nps-api → developer.nps.gov.
 * In production on Vercel, vercel.json rewrites /nps-api/:path* to this
 * function, which relays the request server-side and attaches CORS headers.
 *
 * Environment variable required (set in Vercel Dashboard → Settings → Environment Variables):
 *   VITE_NPS_API_KEY  — your NPS Data API key (same value as in .env)
 */
export default async function handler(req, res) {
  // req.url is the original requested path, e.g. /nps-api/parks?parkCode=yell&fields=topics
  const targetPath = req.url.replace(/^\/nps-api/, '') || '/';
  const url = `https://developer.nps.gov/api/v1${targetPath}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'X-Api-Key':   process.env.VITE_NPS_API_KEY ?? '',
        'Accept':      'application/json',
        'User-Agent':  'WildlifeMap/1.0 (Vercel)',
      },
    });

    const body = await upstream.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(502).json({ error: 'NPS proxy error', detail: err.message });
  }
}
