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
import sharp from 'sharp';
import { wildlifeLocations } from '../src/wildlifeData.js';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';

// State-code → full name, for prerendered titles/copy. Extend as states ship.
const STATE_NAMES = { NJ: 'New Jersey' /* , DE: 'Delaware' — wired when NJ accuracy is locked */ };

// Category → human label, for state-park prerender copy.
const CAT_LABEL = {
  'state-park': 'State Park', 'state-forest': 'State Forest',
  'recreation-area': 'Recreation Area', 'state-preserve': 'State Preserve',
};

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

// Per-park social card (1200×630). Mirrors public/og-image.svg branding but
// NO emoji — sharp/resvg has no colour-emoji font on the build host, so
// emoji would rasterise as tofu. Title font scales down for long park names.
function ogSvg(park) {
  const name = esc(park.name);
  const sub = esc([park.state, 'wildlife guide · sighting odds · best time to visit']
    .filter(Boolean).join(' · '));
  const len = park.name.length;
  const size = len > 38 ? 52 : len > 28 ? 64 : len > 20 ? 76 : 88;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#0c3823"/><stop offset="100%" stop-color="#1a5c38"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g stroke="#ffffff" stroke-opacity="0.06" fill="none" stroke-width="1.5">
    <path d="M-20 480 C 200 440, 400 520, 620 460 S 1000 420, 1220 480"/>
    <path d="M-20 540 C 240 500, 440 580, 660 520 S 1040 480, 1220 540"/>
    <path d="M-20 600 C 260 560, 460 640, 680 580 S 1060 540, 1220 600"/>
  </g>
  <text x="90" y="120" font-family="'Segoe UI',system-ui,sans-serif" font-size="30"
        font-weight="700" fill="#9ee6a9" letter-spacing="2">US WILDLIFE EXPLORER</text>
  <text x="90" y="320" font-family="'Segoe UI','SF Pro Display',system-ui,sans-serif"
        font-size="${size}" font-weight="800" fill="#ffffff" letter-spacing="-1">${name}</text>
  <text x="90" y="385" font-family="'Segoe UI',system-ui,sans-serif" font-size="30"
        font-weight="500" fill="#d8efd8">${sub}</text>
  <g transform="translate(90 520)">
    <rect x="0" y="-34" rx="30" ry="30" width="330" height="60" fill="#ffffff"/>
    <text x="165" y="6" text-anchor="middle" font-family="'Segoe UI',system-ui,sans-serif"
          font-size="26" font-weight="700" fill="#0c3823">wildlifeexplorer.us</text>
  </g>
</svg>`;
}

async function main() {
  const indexPath = path.join(DIST, 'index.html');
  if (!existsSync(indexPath)) {
    console.error('❌ dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }
  const baseHtml = readFileSync(indexPath, 'utf8');
  let written = 0;

  // Crawlable internal link graph: every page links to every park, so
  // search engines can discover & rank all 63 (sitemap helps, internal
  // links matter more — without these the prerendered pages are orphans).
  const parkLinks = wildlifeLocations
    .map(p => `<li><a href="/park/${encodeURIComponent(p.id)}">Wildlife at ${esc(p.name)}</a></li>`)
    .join('');
  const parkNav =
    `<nav class="seo-parklinks" aria-label="All national parks">` +
    `<h2>Explore wildlife by national park</h2><ul>${parkLinks}</ul></nav>`;

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
        parkNav +
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

      // Per-park social card. If rasterisation fails, fall back to the
      // generic og-image.png so the tag never points at a missing file.
      let ogImg = `${ORIGIN}/og-image.png`;
      try {
        const ogDir = path.join(DIST, 'og');
        mkdirSync(ogDir, { recursive: true });
        await sharp(Buffer.from(ogSvg(park)))
          .png().toFile(path.join(ogDir, `${park.id}.png`));
        ogImg = `${ORIGIN}/og/${park.id}.png`;
      } catch (e) {
        console.warn(`⚠  og image fell back for ${park.id}: ${e.message}`);
      }

      let html = baseHtml
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${ogImg}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${ogImg}$2`)
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

  // ── State parks ──────────────────────────────────────────────────────
  // Same treatment as national parks: a static index page per state +
  // a static page per state park, so deep links (/state/<st>, /state-park/
  // <st>/<id>) resolve natively instead of 404ing, and each gets unique SEO
  // metadata. Species lists aren't bundled (fetched live), so the crawlable
  // body carries location + "live data" copy rather than a species list.
  const stateParkUrls = [];
  for (const [code, parks] of Object.entries(STATE_PARKS_BY_STATE)) {
    const stName = STATE_NAMES[code] || code;
    const list = Array.isArray(parks) ? parks : [];

    // Internal link graph for this state's parks (every page links to all).
    const spLinks = list
      .map(p => `<li><a href="/state-park/${code.toLowerCase()}/${encodeURIComponent(p.id)}">`
        + `Wildlife at ${esc(p.name)}</a></li>`)
      .join('');
    const spNav =
      `<nav class="seo-parklinks" aria-label="All ${esc(stName)} state parks">` +
      `<h2>Explore wildlife by ${esc(stName)} state park</h2><ul>${spLinks}</ul></nav>`;

    // Per state-park page.
    for (const park of list) {
      try {
        const url = `${ORIGIN}/state-park/${code.toLowerCase()}/${park.id}`;
        const catLabel = CAT_LABEL[park.category] || 'State Park';
        const title = `Wildlife at ${park.name} — what to see & when | US Wildlife Explorer`;
        const desc = `See wildlife at ${park.name}, a ${stName} ${catLabel.toLowerCase()}: `
          + `birds, mammals, reptiles and more — live sighting odds from eBird and `
          + `iNaturalist, with the best time to visit.`;
        const descClamped = desc.length > 158 ? desc.slice(0, 155) + '…' : desc;

        const seoBlock =
          `<article class="seo-prerender">` +
          `<h1>Wildlife at ${esc(park.name)}</h1>` +
          `<p>${esc(park.name)} is a ${esc(catLabel.toLowerCase())} in ${esc(stName)} — ` +
          `which animals you can see, how likely each sighting is, and the best time to ` +
          `visit. Live data from eBird and iNaturalist.</p>` +
          `<p>Loading the interactive map…</p>` +
          spNav +
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

        let ogImg = `${ORIGIN}/og-image.png`;
        try {
          const ogDir = path.join(DIST, 'og');
          mkdirSync(ogDir, { recursive: true });
          await sharp(Buffer.from(ogSvg({ name: park.name, state: stName })))
            .png().toFile(path.join(ogDir, `sp-${code.toLowerCase()}-${park.id}.png`));
          ogImg = `${ORIGIN}/og/sp-${code.toLowerCase()}-${park.id}.png`;
        } catch (e) {
          console.warn(`⚠  og image fell back for ${park.id}: ${e.message}`);
        }

        let html = baseHtml
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
          .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${ogImg}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(descClamped)}$2`)
          .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${ogImg}$2`)
          .replace(/(<div id="root">)(<\/div>)/, `$1${seoBlock}$2`);
        html = html.replace(/<\/head>/,
          `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`);

        const dir = path.join(DIST, 'state-park', code.toLowerCase(), park.id);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
        stateParkUrls.push(url);
        written++;
      } catch (e) {
        console.warn(`⚠  prerender skipped ${park.id}: ${e.message}`);
      }
    }

    // State index page (/state/<code>) — the hub linking all of that state's parks.
    try {
      const url = `${ORIGIN}/state/${code.toLowerCase()}`;
      const title = `${stName} State Parks — wildlife guide | US Wildlife Explorer`;
      const desc = `Explore wildlife across ${list.length} ${stName} state parks, forests `
        + `and recreation areas — live sighting odds from eBird and iNaturalist.`;
      const descClamped = desc.length > 158 ? desc.slice(0, 155) + '…' : desc;
      const seoBlock =
        `<article class="seo-prerender">` +
        `<h1>${esc(stName)} state parks — wildlife guide</h1>` +
        `<p>Discover which animals you can see across ${list.length} ${esc(stName)} state ` +
        `parks, forests and recreation areas, how likely each sighting is, and the best ` +
        `time to visit — with live data from eBird and iNaturalist.</p>` +
        spNav +
        `<p>Loading the interactive map…</p></article>`;
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
      const dir = path.join(DIST, 'state', code.toLowerCase());
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
      stateParkUrls.push(url);
      written++;
    } catch (e) {
      console.warn(`⚠  state index prerender skipped ${code}: ${e.message}`);
    }
  }

  // Homepage: inject a crawlable park index into #root (React replaces it
  // on mount). This makes the homepage the hub that links to all 63 park
  // pages — the primary crawl entry point. Keeps the original generic
  // homepage <title>/meta.
  try {
    const homeBlock =
      `<article class="seo-prerender">` +
      `<h1>US Wildlife Explorer — wildlife in America's national parks</h1>` +
      `<p>Discover which animals you can see at 63 US national parks, how ` +
      `likely each sighting is, and the best time to visit — with live data ` +
      `from eBird, iNaturalist and the National Park Service.</p>` +
      parkNav +
      `<p>Loading the interactive map…</p></article>`;
    const homeHtml = baseHtml.replace(/(<div id="root">)(<\/div>)/, `$1${homeBlock}$2`);
    writeFileSync(indexPath, homeHtml, 'utf8');
  } catch (e) {
    console.warn(`⚠  homepage prerender skipped: ${e.message}`);
  }

  // Sitemap — homepage + every park.
  const now = new Date().toISOString().slice(0, 10);
  const urls = [`${ORIGIN}/`, ...wildlifeLocations.map(p => `${ORIGIN}/park/${p.id}`),
    ...stateParkUrls];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join('\n')
    + `\n</urlset>\n`;
  writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`✅ Prerendered ${written} pages `
    + `(${wildlifeLocations.length} national parks + ${stateParkUrls.length} state) `
    + `+ OG images + sitemap (${urls.length} URLs).`);
}

main().catch(err => { console.error(err); process.exit(1); });
