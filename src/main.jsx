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
