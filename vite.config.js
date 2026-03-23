import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),

      // ── eBird API proxy (api.ebird.org) ────────────────────────────────────
      // Routes /ebird-chart/* → api.ebird.org/* with API key injection.
      // Used for: hotspot lookup, species list, recent observations.
      // NOTE: api.ebird.org/v2/product/barChart does NOT exist — 404s on all
      //       hotspot codes. Bar chart data is served by ebird.org, not api.ebird.org.
      {
        name: 'ebird-api-proxy',
        configureServer(server) {
          server.middlewares.use('/ebird-chart', (req, res) => {
            const targetPath = req.url?.startsWith('/ebird-chart')
              ? req.url.slice('/ebird-chart'.length) || '/'
              : (req.url || '/')

            const proxyOpts = {
              hostname: 'api.ebird.org',
              path: targetPath,
              method: 'GET',
              headers: {
                'X-eBirdApiToken':  env.VITE_EBIRD_API_KEY ?? '',
                'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept':           'text/plain,text/csv,*/*;q=0.8',
                'Accept-Language':  'en-US,en;q=0.9',
                'Connection':       'keep-alive',
              },
            }

            const proxyReq = https.request(proxyOpts, proxyRes => {
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.statusCode = proxyRes.statusCode ?? 500
              const ct = proxyRes.headers['content-type']
              if (ct) res.setHeader('Content-Type', ct)
              proxyRes.pipe(res)
            })

            proxyReq.on('error', err => {
              console.error('[ebird-api-proxy]', err.message)
              if (!res.headersSent) { res.statusCode = 502; res.end(err.message) }
            })

            proxyReq.end()
          })
        },
      },

      // ── eBird website proxy (ebird.org) ─────────────────────────────────────
      // Routes /ebird-web/* → ebird.org/* with browser-like headers.
      // Used for: bar chart CSV download at /barchart?ptype=year&r=...&fmt=csv
      // The ebird.org website (not API) serves the actual bar chart frequency data.
      {
        name: 'ebird-web-proxy',
        configureServer(server) {
          server.middlewares.use('/ebird-web', (req, res) => {
            const targetPath = req.url?.startsWith('/ebird-web')
              ? req.url.slice('/ebird-web'.length) || '/'
              : (req.url || '/')

            const proxyOpts = {
              hostname: 'ebird.org',
              path: targetPath,
              method: 'GET',
              headers: {
                'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept':           'text/html,text/csv,application/json,*/*;q=0.8',
                'Accept-Language':  'en-US,en;q=0.9',
                'Accept-Encoding':  'identity',
                'Connection':       'keep-alive',
                'Referer':          'https://ebird.org/',
              },
            }

            const proxyReq = https.request(proxyOpts, proxyRes => {
              res.setHeader('Access-Control-Allow-Origin', '*')
              // Follow redirects (ebird.org sometimes 302s to login)
              res.statusCode = proxyRes.statusCode ?? 500
              const ct = proxyRes.headers['content-type']
              if (ct) res.setHeader('Content-Type', ct)
              const loc = proxyRes.headers['location']
              if (loc) res.setHeader('X-Redirect-Location', loc)
              proxyRes.pipe(res)
            })

            proxyReq.on('error', err => {
              console.error('[ebird-web-proxy]', err.message)
              if (!res.headersSent) { res.statusCode = 502; res.end(err.message) }
            })

            proxyReq.end()
          })
        },
      },
    ],

    server: {
      port: 5173,
      proxy: {
        // NPS Developer API — no CORS headers on their server
        '/nps-api': {
          target:       'https://developer.nps.gov',
          changeOrigin: true,
          secure:       true,
          rewrite:      (path) => path.replace(/^\/nps-api/, '/api/v1'),
        },
        // /ebird-chart is handled by the plugin above; no proxy entry needed
      },
    },

    build: {
      // Suppress the >500 kB warning — our cache chunk is intentionally large
      // but compresses to ~600 KB brotli (Vercel handles compression server-side).
      chunkSizeWarningLimit: 12000,

      rollupOptions: {
        output: {
          manualChunks: {
            // Split the 16 MB wildlife cache into its own chunk.
            // When only app code changes, browsers can skip re-downloading this file
            // (it rarely changes — only when scripts/buildWildlifeCache.js is re-run).
            'wildlife-cache': ['./src/data/wildlifeCache.js'],

            // Keep React + Leaflet in a stable vendor chunk so UI tweaks don't
            // bust the cache on these large dependencies either.
            vendor: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
          },
        },
      },
    },
  }
})
