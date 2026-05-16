import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
    ],

    server: {
      port: 5173,
      // Local-dev equivalents of the Vercel serverless proxies
      // (api/ebird-proxy.js / nps-proxy.js / inat-proxy.js). `vite dev` has
      // no serverless runtime, so without these the client's /api/*-proxy
      // calls 404 and ALL live data is broken locally. Keys come from the
      // same non-VITE server-side env names as production (.env / shell);
      // iNaturalist is keyless. Mirrors the upstream paths 1:1.
      proxy: {
        '/api/ebird-proxy': {
          target:       'https://api.ebird.org',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p) => p.replace(/^\/api\/ebird-proxy/, '/v2'),
          headers:      { 'X-eBirdApiToken': env.EBIRD_API_KEY || '' },
        },
        '/api/nps-proxy': {
          target:       'https://developer.nps.gov',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p) => p.replace(/^\/api\/nps-proxy/, '/api/v1'),
          headers:      { 'X-Api-Key': env.NPS_API_KEY || '' },
        },
        '/api/inat-proxy': {
          target:       'https://api.inaturalist.org',
          changeOrigin: true,
          secure:       true,
          rewrite:      (p) => p.replace(/^\/api\/inat-proxy/, '/v1'),
          headers:      { 'User-Agent': 'wildlife-explorer (+https://wildlifeexplorer.us)' },
        },
      },
    },

    build: {
      // Suppress the >500 kB warning — our cache chunks are intentionally large
      // but compress well (Vercel handles brotli compression server-side).
      chunkSizeWarningLimit: 12000,

      rollupOptions: {
        output: {
          manualChunks: {
            // Primary cache (15 most visited parks) — loaded synchronously on startup.
            'wildlife-cache-primary': ['./src/data/wildlifeCachePrimary.js'],

            // Secondary cache is loaded via dynamic import() in wildlifeCacheLoader.js.
            // Vite/Rollup automatically splits it into its own async chunk — no manual
            // entry needed. If listed here, Rollup would eagerly bundle it.

            // Keep React + Leaflet in a stable vendor chunk so UI tweaks don't
            // bust the cache on these large dependencies either.
            vendor: ['react', 'react-dom', 'leaflet', 'react-leaflet'],
          },
        },
      },
    },
  }
})
