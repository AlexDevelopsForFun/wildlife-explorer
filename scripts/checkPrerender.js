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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const errors = [];

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
  if (!html.includes('class="seo-parklinks"')) {
    errors.push(`park/${park.id}: crawlable internal park links missing (orphan page)`);
  }
}

const smPath = path.join(DIST, 'sitemap.xml');
if (!existsSync(smPath)) {
  errors.push('dist/sitemap.xml missing');
} else {
  const locs = (readFileSync(smPath, 'utf8').match(/<loc>/g) || []).length;
  const expected = wildlifeLocations.length + 1;
  if (locs !== expected) errors.push(`sitemap has ${locs} URLs, expected ${expected} (homepage + ${wildlifeLocations.length} parks)`);
}

if (errors.length) {
  console.error('❌ Prerender check failed:\n');
  for (const e of errors.slice(0, 12)) console.error('  • ' + e);
  if (errors.length > 12) console.error(`  … and ${errors.length - 12} more`);
  console.error('\n::error::SEO prerender is broken — see scripts/prerenderParks.js.');
  process.exit(1);
}

console.log(`✓ Prerender OK — ${wildlifeLocations.length} park pages (unique titles, canonical, `
  + `JSON-LD, internal links) + homepage index + sitemap.`);
process.exit(0);
