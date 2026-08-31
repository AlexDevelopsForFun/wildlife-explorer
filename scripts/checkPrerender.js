#!/usr/bin/env node
/**
 * scripts/checkPrerender.js — fail CI if the SEO prerender silently breaks.
 *
 * The per-park static pages are the SEO surface. They're produced by a
 * post-build script (scripts/prerenderParks.js); if a refactor changes
 * dist/index.html's shape, the regex replacements can no-op and every page
 * ships with the generic title/meta again — invisible, exactly the class
 * of silent regression the proxy-wiring guard exists for. Run AFTER
 * `npm run build` (which now includes the prerender step).
 *
 * Asserts, for the homepage + all 63 parks:
 *   • dist/park/<id>/index.html exists
 *   • park-specific <title> (contains the park name, not the generic one)
 *   • canonical → /park/<id>
 *   • JSON-LD present
 *   • crawlable internal park-link nav present (not orphan pages)
 *   • dist/index.html homepage has the injected park index
 *   • dist/sitemap.xml lists exactly (parks + 1) URLs
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { wildlifeLocations } from '../src/wildlifeData.js';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';

// Total state-park entries + one state-index page per state.
const stateCodes = Object.keys(STATE_PARKS_BY_STATE);
const stateParkCount = stateCodes.reduce(
  (n, c) => n + (Array.isArray(STATE_PARKS_BY_STATE[c]) ? STATE_PARKS_BY_STATE[c].length : 0), 0);
const stateExtraUrls = stateParkCount + stateCodes.length; // parks + state index pages

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const errors = [];

// Match the prerender's HTML escaping so names with &, <, > etc. compare cleanly.
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('❌ dist/ not found — run `npm run build` before this guard.');
  process.exit(1);
}

// Homepage must carry the injected crawlable park index.
const home = readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (!home.includes('class="seo-parklinks"')) {
  errors.push('dist/index.html is missing the injected park-index nav (homepage prerender no-op).');
}

for (const park of wildlifeLocations) {
  const f = path.join(DIST, 'park', park.id, 'index.html');
  if (!existsSync(f)) { errors.push(`Missing prerendered page: park/${park.id}/index.html`); continue; }
  const html = readFileSync(f, 'utf8');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  if (!title.includes(park.name)) {
    errors.push(`park/${park.id}: <title> not park-specific ("${title.slice(0, 60)}")`);
  }
  if (!new RegExp(`<link rel="canonical" href="[^"]*/park/${park.id}"`).test(html)) {
    errors.push(`park/${park.id}: canonical not → /park/${park.id}`);
  }
  if (!html.includes('application/ld+json')) {
    errors.push(`park/${park.id}: JSON-LD structured data missing`);
  }
  if (!html.includes(`/og/${park.id}.png`)) {
    errors.push(`park/${park.id}: og:image not the per-park card`);
  } else if (!existsSync(path.join(DIST, 'og', `${park.id}.png`))) {
    errors.push(`park/${park.id}: og:image references missing /og/${park.id}.png`);
  }
  if (!html.includes('class="seo-parklinks"')) {
    errors.push(`park/${park.id}: crawlable internal park links missing (orphan page)`);
  }
}

// State parks — same SEO contract (static page per park + per state index).
for (const code of stateCodes) {
  const lc = code.toLowerCase();
  for (const park of STATE_PARKS_BY_STATE[code]) {
    const f = path.join(DIST, 'state-park', lc, park.id, 'index.html');
    if (!existsSync(f)) { errors.push(`Missing prerendered page: state-park/${lc}/${park.id}/index.html`); continue; }
    const html = readFileSync(f, 'utf8');
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    if (!title.includes(esc(park.name))) {
      errors.push(`state-park/${lc}/${park.id}: <title> not park-specific ("${title.slice(0, 60)}")`);
    }
    if (!new RegExp(`<link rel="canonical" href="[^"]*/state-park/${lc}/${park.id}"`).test(html)) {
      errors.push(`state-park/${lc}/${park.id}: canonical not → /state-park/${lc}/${park.id}`);
    }
    if (!html.includes('application/ld+json')) {
      errors.push(`state-park/${lc}/${park.id}: JSON-LD structured data missing`);
    }
    if (!html.includes('class="seo-parklinks"')) {
      errors.push(`state-park/${lc}/${park.id}: crawlable internal links missing (orphan page)`);
    }
  }
  const idx = path.join(DIST, 'state', lc, 'index.html');
  if (!existsSync(idx)) {
    errors.push(`Missing prerendered state index: state/${lc}/index.html`);
  } else {
    const html = readFileSync(idx, 'utf8');
    if (!new RegExp(`<link rel="canonical" href="[^"]*/state/${lc}"`).test(html)) {
      errors.push(`state/${lc}: canonical not → /state/${lc}`);
    }
    if (!html.includes('class="seo-parklinks"')) {
      errors.push(`state/${lc}: crawlable park links missing`);
    }
  }
}

const smPath = path.join(DIST, 'sitemap.xml');
if (!existsSync(smPath)) {
  errors.push('dist/sitemap.xml missing');
} else {
  const sm = readFileSync(smPath, 'utf8');
  const locs = (sm.match(/<loc>/g) || []).length;

  // The core set MUST be present, url by url. This is the part that actually
  // matters for SEO and the part a broken prerender would drop.
  const core = wildlifeLocations.length + 1 + stateExtraUrls;
  const missingCore = [];
  if (!/<loc>[^<]*\/<\/loc>|<loc>[^<]*wildlifeexplorer\.us\/?<\/loc>/.test(sm)
      && !sm.includes('<loc>https://wildlifeexplorer.us/</loc>')) missingCore.push('homepage');
  for (const l of wildlifeLocations) {
    if (!sm.includes(`/park/${l.id}<`)) missingCore.push(`/park/${l.id}`);
  }
  for (const code of stateCodes) {
    const lc = code.toLowerCase();
    if (!sm.includes(`/state/${lc}<`)) missingCore.push(`/state/${lc}`);
  }
  if (missingCore.length) {
    errors.push(`sitemap missing ${missingCore.length} core URL(s): ${missingCore.slice(0, 5).join(', ')}`
      + (missingCore.length > 5 ? ' …' : ''));
  }

  // Total is a FLOOR, not an equality. The old check asserted exactly
  // (homepage + national parks + state), which silently went stale the moment
  // refuge, NPS-unit and species pages were added: it demanded 4,164 while the
  // real sitemap carried 17,469. That single false failure skipped every
  // downstream check in pr-checks.yml — override curation, cache freshness,
  // proxy wiring and all three test suites — across five consecutive PRs.
  // A guard that breaks whenever the site legitimately grows trains people to
  // ignore it, so only a COLLAPSE below the core is treated as broken.
  if (locs < core) {
    errors.push(`sitemap has ${locs} URLs, fewer than the ${core} core pages `
      + `(homepage + ${wildlifeLocations.length} national parks + ${stateExtraUrls} state) — prerender lost pages`);
  }
}

if (errors.length) {
  console.error('❌ Prerender check failed:\n');
  for (const e of errors.slice(0, 12)) console.error('  • ' + e);
  if (errors.length > 12) console.error(`  … and ${errors.length - 12} more`);
  console.error('\n::error::SEO prerender is broken — see scripts/prerenderParks.js.');
  process.exit(1);
}

console.log(`✓ Prerender OK — ${wildlifeLocations.length} national-park + ${stateParkCount} state-park pages `
  + `(unique titles, canonical, JSON-LD, internal links) + homepage + ${stateCodes.length} state index + sitemap.`);
process.exit(0);
