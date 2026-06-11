import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { requestPersistentStorage } from './services/seenList'

// Ask the browser not to silently evict our storage (the life list) under
// disk pressure. Silent on installed PWAs / engaged sites; no-op elsewhere.
requestPersistentStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Client-error reporting → /api/log-error → Vercel runtime logs. No
// third-party service. Deduped per message and capped per session so a
// render-loop crash can't flood the endpoint. PROD only.
if (import.meta.env.PROD) {
  const seen = new Set()
  let budget = 10
  const report = (payload) => {
    const key = `${payload.msg}|${payload.line}`
    if (seen.has(key) || budget <= 0) return
    seen.add(key); budget -= 1
    try {
      const body = JSON.stringify({ ...payload, url: location.pathname })
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/log-error', body))) {
        fetch('/api/log-error', { method: 'POST', body, keepalive: true }).catch(() => {})
      }
    } catch { /* never throw from the reporter */ }
  }
  window.addEventListener('error', (e) => report({
    msg: String(e.message ?? e.error ?? 'unknown'),
    src: String(e.filename ?? ''), line: e.lineno ?? 0,
    stack: String(e.error?.stack ?? '').slice(0, 800),
  }))
  window.addEventListener('unhandledrejection', (e) => report({
    msg: `unhandledrejection: ${String(e.reason?.message ?? e.reason ?? 'unknown')}`,
    src: '', line: 0,
    stack: String(e.reason?.stack ?? '').slice(0, 800),
  }))
}

// PWA: register the offline service worker. Dev (vite) is skipped so HMR
// is never intercepted. One-time reload on SW takeover so a new build's
// hashed assets are used immediately (guarded against a reload loop).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}
