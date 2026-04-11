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
      proxy: {
        // NPS Developer API — no CORS headers on their server
        '/nps-api': {
          target:       'https://developer.nps.gov',
          changeOrigin: true,
          secure:       true,
          rewrite:      (path) => path.replace(/^\/nps-api/, '/api/v1'),
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
