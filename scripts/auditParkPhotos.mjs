#!/usr/bin/env node
/**
 * scripts/auditParkPhotos.mjs — VISION audit of park hero photos.
 *
 * Filename/source filters can't judge what a photo actually shows: Bowman Lake
 * SP's only name-related Commons photo is a close-up of a trail-register box
 * ("Register at N boundary Bowman Lake S. P.") — name-related, a real .jpg,
 * and useless as a park hero. The only real audit is to LOOK at the images.
 *
 * For every state park (+ wildlife refuge): gather candidates (Wikipedia lead
 * image, then name-related Commons geosearch photos), run each through Claude
 * Haiku vision ("clear outdoor scenery that helps a visitor recognize the
 * park" vs "sign/building/object close-up, map, interior, blurry trailcam…"),
 * keep the first GOOD one, else record "no good photo" (no photo beats a
 * wrong one). Results bake into src/data/parkPhotos.js — the client uses the
 * curated entry (or curated-none) and only falls back to runtime lookup for
 * parks the audit hasn't seen (e.g. future expansion units before a re-run).
 *
 * Resumable: per-park verdicts cache in scripts/_photo_audit_cache/.
 * Cost: ~4.6k parks ≈ $5-10 of Haiku vision (one-time; re-runs hit the cache).
 * Run:  node scripts/auditParkPhotos.mjs           (audit + emit)
 *       node scripts/auditParkPhotos.mjs --emit    (emit from cache only)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '_photo_audit_cache');
mkdirSync(CACHE_DIR, { recursive: true });

// Read a key from process.env or the .env file (same pattern as other scripts).
const envVal = (names) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  try {
    const txt = readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    for (const n of names) {
      const m = txt.match(new RegExp(`^${n}=(.+)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
};

// API key (Anthropic vision).
const KEY = envVal(['ANTHROPIC_API_KEY']);
if (!KEY && !process.argv.includes('--emit')) { console.error('No ANTHROPIC_API_KEY'); process.exit(1); }
const client = KEY ? new Anthropic({ apiKey: KEY }) : null;
const MODEL = 'claude-haiku-4-5-20251001'; // cheapest vision-capable model

// NPS key — lets the audit pull national-park units (id `nps_<code>`), so the
// curated map also covers them (e.g. Roosevelt Campobello → the cottage, BAD).
const NPS_KEY = envVal(['NPS_API_KEY', 'VITE_NPS_API_KEY', 'REACT_APP_NPS_API_KEY']);

// Mirror useNpsParks.js: which NPS designations are natural (wildlife) units.
const NP_NATURAL = ['national park', 'national preserve', 'national seashore', 'national lakeshore',
  'national recreation area', 'national reserve', 'national river', 'scenic river', 'scenic riverway',
  'wild and scenic river', 'wild river'];
const NP_EXCLUDE = ['historic', 'memorial', 'battlefield', 'military', 'cemetery', 'heritage',
  'parkway', 'scenic trail', 'historic trail'];
const NATURAL_MONUMENTS = new Set(['agfo','ania','band','buis','cabr','cakr','camo','cavo','cebr','chir',
  'colm','crmo','depo','deto','dino','elma','flfo','fobu','hafo','jeca','joda','kaww','labe','muwo','nabr',
  'orca','orpi','para','rabr','sucr','tica','tusk','vicr']);
const npsQualifies = (d = '', code = '') => {
  d = d.toLowerCase();
  if (NP_EXCLUDE.some(p => d.includes(p))) return false;
  if (NP_NATURAL.some(p => d.includes(p))) return true;
  if (d.includes('national monument')) return NATURAL_MONUMENTS.has(code.toLowerCase());
  return false;
};

async function fetchNationalUnits() {
  if (!NPS_KEY) { console.warn('  (no NPS key — skipping national-park units)'); return []; }
  try {
    const r = await fetch(`https://developer.nps.gov/api/v1/parks?limit=600&api_key=${NPS_KEY}`,
      { signal: AbortSignal.timeout(20000) });
    if (!r.ok) { console.warn(`  (NPS API ${r.status} — skipping national units)`); return []; }
    const { data } = await r.json();
    const out = [];
    for (const p of data ?? []) {
      if (!npsQualifies(p.designation, p.parkCode)) continue;
      const lat = parseFloat(p.latitude), lng = parseFloat(p.longitude);
      if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) continue;
      out.push({ id: `nps_${p.parkCode}`, name: p.fullName ?? p.name, lat, lng });
    }
    return out;
  } catch (e) { console.warn(`  (NPS fetch failed: ${e.message})`); return []; }
}

// Same junk/photo filters as the client (apiService.js).
const JUNK = /\b(map|locator|logo|seal|crest|coat of arms|flag|plaque|marker|sign|signage|diagram|chart|layout|floor plan|site plan|emblem|icon|banner|brochure|poster|nrhp|aerial|satellite|landsat|orthophoto|topographic|topo|view of earth|space station|from space)\b|\biss\d|\.svg(\?|$)/i;
const norm = (s) => decodeURIComponent(s ?? '').replace(/[_-]+/g, ' ');
const isPhoto = (u) => { const n = norm(u); return /\.jpe?g(\?|$)/i.test(n) && !JUNK.test(n); };
const filePage = (imgUrl) => {
  try {
    const parts = new URL(imgUrl).pathname.split('/');
    const i = parts.indexOf('thumb');
    const file = i >= 0 ? parts[i + 3] : parts[parts.length - 1];
    const host = imgUrl.includes('/wikipedia/en/') ? 'en.wikipedia.org' : 'commons.wikimedia.org';
    return file ? `https://${host}/wiki/File:${file}` : null;
  } catch { return null; }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Candidate photos for one park: [{ display(960px), audit(640px), credit }].
async function candidatesFor(p) {
  const out = [];
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.name.replace(/ /g, '_'))}`,
      { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const j = await r.json();
      if (j.type !== 'disambiguation' && j.thumbnail?.source && isPhoto(j.thumbnail.source)) {
        const w = Math.min(960, j.originalimage?.width || 640);
        const a = Math.min(640, j.originalimage?.width || 640);
        const mk = (px) => /\/\d+px-/.test(j.thumbnail.source)
          ? j.thumbnail.source.replace(/\/\d+px-/, `/${px}px-`) : j.thumbnail.source;
        out.push({ display: mk(w), audit: mk(a), credit: filePage(j.thumbnail.source) });
      }
    }
  } catch {}
  try {
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
      `&generator=geosearch&ggscoord=${p.lat}%7C${p.lng}&ggsradius=2500&ggslimit=14&ggsnamespace=6` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=640`;
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (r.ok) {
      const j = await r.json();
      const words = p.name.toLowerCase().replace(/\b(state|national|park|forest|beach|preserve|recreation|area|wildlife|management|reserve|refuge)\b/g, ' ')
        .split(/\W+/).filter(w => w.length >= 4);
      const related = Object.values(j?.query?.pages ?? {})
        .map(pg => ({ title: pg.title ?? '', info: pg.imageinfo?.[0] }))
        .filter(pg => pg.info?.thumburl && isPhoto(pg.info.url) && !JUNK.test(norm(pg.title))
          && words.some(w => pg.title.toLowerCase().includes(w)));
      for (const pg of related.slice(0, 4)) {
        const display = pg.info.url && /\.jpe?g$/i.test(pg.info.url)
          ? pg.info.thumburl.replace(/\/640px-/, '/960px-') : pg.info.thumburl;
        out.push({
          display, audit: pg.info.thumburl,
          credit: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pg.title.replace(/ /g, '_')).replace(/%3A/gi, ':')}`,
        });
      }
    }
  } catch {}
  // de-dupe (lead often also appears in geosearch)
  const seen = new Set();
  return out.filter(c => { const k = c.display.split('/').pop(); if (seen.has(k)) return false; seen.add(k); return true; });
}

const PROMPT =
  'You are auditing hero photos for a parks website. Look at this image. ' +
  'Reply GOOD only if it is a clear outdoor scenery photograph that would help a visitor recognize the park: ' +
  'a landscape, lake, river, waterfall, forest vista, trail view, beach, canyon, meadow, or similar. ' +
  'Reply BAD if the main subject is a sign, post, plaque, register box, building, restroom, parking lot, ' +
  'bridge close-up, boardwalk close-up, map, document, person, vehicle, animal close-up, interior, ' +
  'or if the photo is blurry, very dark, heavily zoomed-in on an object, or looks like a trail-camera frame. ' +
  'Reply with exactly one word: GOOD or BAD.';

async function visionVerdict(auditUrl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ir = await fetch(auditUrl, { signal: AbortSignal.timeout(20000) });
      if (!ir.ok) return 'FETCH_FAIL';
      const buf = Buffer.from(await ir.arrayBuffer());
      if (buf.length < 4000 || buf.length > 4_500_000) return 'FETCH_FAIL';
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 5,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: buf.toString('base64') } },
          { type: 'text', text: PROMPT },
        ] }],
      });
      const t = (msg.content?.[0]?.text ?? '').trim().toUpperCase();
      if (t.includes('GOOD')) return 'GOOD';
      if (t.includes('BAD')) return 'BAD';
      return 'BAD';
    } catch (e) {
      if (e?.status === 429 || e?.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
      return 'FETCH_FAIL';
    }
  }
  return 'FETCH_FAIL';
}

async function auditOne(p) {
  const cacheFile = path.join(CACHE_DIR, `${p.id}.json`);
  if (existsSync(cacheFile)) return;
  const cands = await candidatesFor(p);
  let result = { none: true };
  for (const c of cands.slice(0, 3)) {
    const v = await visionVerdict(c.audit);
    if (v === 'GOOD') { result = { src: c.display, credit: c.credit }; break; }
  }
  writeFileSync(cacheFile, JSON.stringify(result));
}

function emit(parks) {
  const map = {};
  let good = 0, none = 0;
  for (const p of parks) {
    const f = path.join(CACHE_DIR, `${p.id}.json`);
    if (!existsSync(f)) continue;
    try {
      const r = JSON.parse(readFileSync(f, 'utf8'));
      if (r.src) { map[p.id] = [r.src, r.credit ?? null]; good++; }
      else { map[p.id] = 0; none++; }
    } catch {}
  }
  const body =
`// Vision-audited park hero photos — generated by scripts/auditParkPhotos.mjs.
// id → [src, credit] (credit = Wikimedia file page) | 0 = audited, nothing
// representative found (show NO photo; do not fall back to runtime lookup).
// Parks absent here were not audited yet (runtime lookup applies).
export const PARK_PHOTOS = ${JSON.stringify(map)};
`;
  writeFileSync(path.join(__dirname, '..', 'src', 'data', 'parkPhotos.js'), body);
  console.log(`Emitted ${good + none} audited parks (${good} with photos, ${none} no-good-photo).`);
}

async function main() {
  const parks = [];
  for (const arr of Object.values(STATE_PARKS_BY_STATE)) for (const p of (arr ?? [])) parks.push(p);
  for (const r of NATIONAL_WILDLIFE_REFUGES) parks.push(r);
  const national = await fetchNationalUnits();
  for (const n of national) parks.push(n);
  console.log(`Park set: ${parks.length} total (incl. ${national.length} national-park units).`);

  if (!process.argv.includes('--emit')) {
    const todo = parks.filter(p => !existsSync(path.join(CACHE_DIR, `${p.id}.json`)));
    console.log(`Auditing ${todo.length} of ${parks.length} parks (rest cached)…`);
    let done = 0;
    const worker = async () => {
      while (todo.length) {
        const p = todo.shift();
        try { await auditOne(p); } catch (e) { console.error(`  ! ${p.id}: ${e.message}`); }
        if (++done % 100 === 0) console.log(`  …${done} done, ${todo.length} left`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  emit(parks);
}

main().catch(e => { console.error(e); process.exit(1); });
