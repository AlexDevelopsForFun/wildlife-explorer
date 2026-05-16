#!/usr/bin/env node
/**
 * checkProxyWiring.js — fail CI if a serverless proxy is mis-wired.
 *
 * History this guards against: the client calls server-side proxies at
 * `/api/<name>-proxy/...` to keep API keys off the browser and to dodge
 * CORS. Those only work as a *flat* function file (`api/<name>-proxy.js`)
 * fed by a `vercel.json` rewrite — the filesystem catch-all convention
 * (`api/<name>-proxy/[...path].js`) is NOT applied for this Vite project
 * and silently 404s every request.
 *
 * That exact mistake shipped to production undetected across several
 * commits (the security commit removed the original rewrite and switched
 * to catch-all dirs; nothing failed the build, so it went unnoticed until
 * users hit broken live data). This script makes it a hard build failure.
 *
 * For every `/api/<name>-proxy` referenced anywhere in src/, it asserts:
 *   1. a flat function file  api/<name>-proxy.js  exists
 *   2. vercel.json has a rewrite  /api/<name>-proxy/:path*  →  /api/<name>-proxy
 * It also fails if any catch-all `api/.../[...x].js` file exists at all
 * (the broken pattern that must never come back).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

const errors = [];

// ── 1. Collect proxy bases referenced by client code ───────────────────────
const srcFiles = walk(path.join(ROOT, 'src')).filter(f => /\.(js|jsx)$/.test(f));
const referenced = new Set();
const PROXY_RE = /\/api\/([a-z0-9-]+-proxy)\b/g;
for (const f of srcFiles) {
  const txt = readFileSync(f, 'utf8');
  let m;
  while ((m = PROXY_RE.exec(txt)) !== null) referenced.add(m[1]);
}

if (referenced.size === 0) {
  console.warn('⚠  No /api/*-proxy references found in src/ — nothing to verify.');
  process.exit(0);
}

// ── 2. vercel.json rewrites map ─────────────────────────────────────────────
let rewrites = [];
try {
  const vj = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  rewrites = Array.isArray(vj.rewrites) ? vj.rewrites : [];
} catch (e) {
  errors.push(`Cannot read/parse vercel.json: ${e.message}`);
}

for (const base of [...referenced].sort()) {
  // 2a. flat function file must exist
  const fnPath = path.join(ROOT, 'api', `${base}.js`);
  if (!existsSync(fnPath)) {
    errors.push(`Client calls /api/${base} but api/${base}.js does not exist `
      + `(a flat function file is required — catch-all dirs do not route here).`);
  }
  // 2b. matching rewrite must exist
  const wantSource = `/api/${base}/:path*`;
  const wantDest = `/api/${base}`;
  const ok = rewrites.some(r => r && r.source === wantSource && r.destination === wantDest);
  if (!ok) {
    errors.push(`vercel.json is missing the rewrite { "source": "${wantSource}", `
      + `"destination": "${wantDest}" } — without it /api/${base}/* sub-paths 404.`);
  }
}

// ── 3. No catch-all function files anywhere under api/ ──────────────────────
const apiDir = path.join(ROOT, 'api');
if (existsSync(apiDir)) {
  for (const f of walk(apiDir)) {
    if (/\[\.\.\..*\]\.(js|ts|mjs)$/.test(path.basename(f))) {
      errors.push(`Catch-all function ${path.relative(ROOT, f)} exists — this `
        + `pattern silently 404s on this project. Use a flat file + vercel.json rewrite.`);
    }
  }
}

if (errors.length) {
  console.error('❌ Proxy wiring check failed:\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n::error::Serverless proxy mis-wired — see scripts/checkProxyWiring.js header.');
  process.exit(1);
}

console.log(`✓ Proxy wiring OK — ${[...referenced].sort().join(', ')} `
  + `each have a flat function + matching vercel.json rewrite.`);
process.exit(0);
