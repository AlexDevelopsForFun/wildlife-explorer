#!/usr/bin/env node
/**
 * scripts/prerenderParks.js — build-time SEO prerender (runs after vite build).
 *
 * The app is a single-URL SPA, so search engines saw one generic page for
 * all 63 parks — invisible for "wildlife at <park>" queries despite having
 * the best content for exactly those. This emits a static
 * dist/park/<id>/index.html per park with:
 *   • a unique <title>, meta description, canonical, OG/Twitter tags
 *   • JSON-LD (TouristAttraction) structured data
 *   • crawlable content (h1 + intro + species list) injected INTO #root,
 *     which React replaces on hydrate — so Google gets real per-URL text
 *     and users get a faster first paint.
 *
 * Clean URLs come from the directory-index file path (/park/<id>/), served
 * natively by Vercel — NO rewrites added, so the /api proxies and SPA root
 * are completely untouched. Unknown paths still 404→SPA as before.
 * Also (re)writes dist/sitemap.xml with every park URL.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { wildlifeLocations } from '../src/wildlifeData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://wildlifeexplorer.us';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const RARITY_WORD = {
  guaranteed: 'almost guaranteed', very_likely: 'very likely', likely: 'likely',
  unlikely: 'unlikely', rare: 'rare', exceptional: 'exceptional',
};

function main() {
  const indexPath = path.join(DIST, 'index.html');
  if (!existsSync(indexPath)) {
    console.error('❌ dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }
  const baseHtml = readFileSync(indexPath, 'utf8');
  let written = 0;

  for (const park of wildlifeLocations) {
    try {
      const url = `${ORIGIN}/park/${park.id}`;
      const animals = Array.isArray(park.animals) ? park.animals : [];
      const top = animals.slice(0, 6).map(a => a.name).filter(Boolean);
      const title = `Wildlife at ${park.name} — what to see & when | US Wildlife Explorer`;
      const desc = `See wildlife at ${park.name}${park.state ? ` (${park.state})` : ''}: `
        + (top.length ? `${top.slice(0, 4).join(', ')} and more` : 'species guide')
        + ` — sighting odds, best season, and where to look.`;
      const descClamped = desc.length > 158 ? desc.slice(0, 155) + '…' : desc;

      // Crawlable content React replaces on mount (initial #root children).
      const speciesLi = animals.slice(0, 30).map(a =>
        `<li>${esc(a.name)}${a.rarity ? ` — ${esc(RARITY_WORD[a.rarity] ?? a.rarity)} to see` : ''}</li>`
      ).join('');
      const seoBlock =
        `<article class="seo-prerender">` +
        `<h1>Wildlife at ${esc(park.name)}</h1>` +
        `<p>${esc(park.name)}${park.state ? ` in ${esc(park.state)}` : ''} — which animals you can `
        + `see, how likely each sighting is, and the best time to visit. Live data from `
        + `eBird, iNaturalist and the National Park Service.</p>` +
        (speciesLi ? `<h2>Notable species</h2><ul>${speciesLi}</ul>` : '') +
        `<p>Loading the interactive map…</p>` +
        `</article>`;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: park.name,
        description: descClamped,
        url,
        ...(Number.isFinite(park.lat) && Number.isFinite(park.lng) ? {
          geo: { '@type': 'GeoCoordinates', latitude: park.lat, longitude: park.lng },
        } : {}),
        isAccessibleForFree: true,
        touristType: 'Wildlife watching',
      };

      let html = baseHtml
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<div id="root">)(<\/div>)/, `$1${seoBlock}$2`);

      // JSON-LD before </head>
      html = html.replace(/<\/head>/,
        `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`);

      const dir = path.join(DIST, 'park', park.id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
      written++;
    } catch (e) {
      console.warn(`⚠  prerender skipped ${park.id}: ${e.message}`);
    }
  }

  // Sitemap — homepage + every park.
  const now = new Date().toISOString().slice(0, 10);
  const urls = [`${ORIGIN}/`, ...wildlifeLocations.map(p => `${ORIGIN}/park/${p.id}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join('\n')
    + `\n</urlset>\n`;
  writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`✅ Prerendered ${written}/${wildlifeLocations.length} park pages + sitemap (${urls.length} URLs).`);
}

main();
