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
import { PARK_COUNTY, COUNTY_BIRD_FREQ } from '../src/data/stateParkBirdFreq.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { loadCountyNonbird, NONBIRD_STATE_KEYS } from '../src/data/countyNonbird/loader.js';
import { renderPrivacyHtml } from './privacyPage.mjs';

// State-code → full name, for prerendered titles/copy. Extend as states ship.
const STATE_NAMES = { NJ: 'New Jersey', DE: 'Delaware', CT: 'Connecticut', RI: 'Rhode Island', MA: 'Massachusetts', NH: 'New Hampshire', VT: 'Vermont', ME: 'Maine', NY: 'New York', PA: 'Pennsylvania', MD: 'Maryland', VA: 'Virginia', WV: 'West Virginia', NC: 'North Carolina', SC: 'South Carolina', GA: 'Georgia', TN: 'Tennessee', KY: 'Kentucky', OH: 'Ohio', MI: 'Michigan', IN: 'Indiana', IL: 'Illinois', WI: 'Wisconsin', MN: 'Minnesota', FL: 'Florida', AL: 'Alabama', MS: 'Mississippi', LA: 'Louisiana', AR: 'Arkansas', IA: 'Iowa', MO: 'Missouri', ND: 'North Dakota', SD: 'South Dakota', NE: 'Nebraska', KS: 'Kansas', OK: 'Oklahoma', MT: 'Montana', WY: 'Wyoming', CO: 'Colorado', ID: 'Idaho', UT: 'Utah', NV: 'Nevada', AZ: 'Arizona', NM: 'New Mexico', CA: 'California', OR: 'Oregon', WA: 'Washington', TX: 'Texas', AK: 'Alaska', HI: 'Hawaii' };

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

// Species names in COUNTY_BIRD_FREQ are lowercase ("bald eagle"). Module scope
// because both the refuge pages and the species pages need it, and the refuge
// loop runs first — a const inside main() would be in the TDZ there.
//
// Capitalises after whitespace ONLY, never after a hyphen: the accepted forms
// are "Red-tailed Hawk" and "White-tailed Deer", not "Red-Tailed". Slugs are
// derived from the raw lowercase name, so this is display-only and cannot
// change any existing URL.
const titleCase = (n) => String(n).replace(/(^|\s)\S/g, c => c.toUpperCase());

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

  // ── National Wildlife Refuges ────────────────────────────────────────
  // 543 refuges were reachable in the app but had NO static page: /park/
  // nwr_barnegat served the generic SPA shell, so Google saw the homepage
  // and shared links previewed as the homepage. They're prime long-tail
  // queries ("birds at Bosque del Apache") and the data was already here.
  //
  // Unlike state parks these get a real species list: UNIT_COUNTY maps each
  // refuge to its county and COUNTY_BIRD_FREQ has that county's eBird
  // reporting rates, so the crawlable body carries actual bird names.
  //
  // NOTE the ~86 non-park NPS units (monuments, preserves, seashores) are
  // still missing. They're fetched at RUNTIME from /api/nps-proxy, so no
  // names or coordinates exist at build time — adding them means either a
  // keyed NPS fetch during the build or a committed static list.
  const refugeUrls = [];
  const refugesByState = new Map();
  for (const r of NATIONAL_WILDLIFE_REFUGES) {
    const st = r.stateCodes?.[0];
    if (!st) continue;                       // ~71 offshore units, no state
    if (!refugesByState.has(st)) refugesByState.set(st, []);
    refugesByState.get(st).push(r);
  }

  for (const refuge of NATIONAL_WILDLIFE_REFUGES) {
    try {
      const url = `${ORIGIN}/park/${refuge.id}`;
      const st = refuge.stateCodes?.[0];
      const stName = st ? (STATE_NAMES[st] || st) : null;

      // Top county birds, most-reported first — real content, not filler.
      const county = UNIT_COUNTY[refuge.id];
      const countyBirds = county && COUNTY_BIRD_FREQ[county]
        ? Object.entries(COUNTY_BIRD_FREQ[county])
            .filter(([sp, e]) => !sp.startsWith('__') && Number.isFinite(e?.f))
            .sort((a, b) => b[1].f - a[1].f)
            .slice(0, 25)
            .map(([sp, e]) => ({ name: titleCase(sp), f: e.f }))
        : [];

      const title = `Wildlife at ${refuge.name} — birds & when to see them | US Wildlife Explorer`;
      const desc = `See wildlife at ${refuge.name}${stName ? `, ${stName}` : ''}: `
        + (countyBirds.length
            ? `${countyBirds.slice(0, 4).map(b => b.name).join(', ')} and more`
            : 'birds, mammals and more')
        + ` — how likely each sighting is, and the season to look.`;
      const descClamped = desc.length > 158 ? desc.slice(0, 155) + '…' : desc;

      // Same-state refuges only: a 543-link nav on every page would bury the
      // real content and read as a link farm.
      const sibs = (st ? refugesByState.get(st) : []) ?? [];
      const refNav = sibs.length > 1
        ? `<nav class="seo-parklinks" aria-label="Other ${esc(stName)} refuges">`
          + `<h2>More ${esc(stName)} national wildlife refuges</h2><ul>`
          + sibs.filter(s => s.id !== refuge.id)
              .map(s => `<li><a href="/park/${encodeURIComponent(s.id)}">Wildlife at ${esc(s.name)}</a></li>`)
              .join('')
          + `</ul></nav>`
        : '';

      const birdLi = countyBirds
        .map(b => `<li>${esc(b.name)} — reported on ${Math.round(b.f * 100)}% of nearby checklists</li>`)
        .join('');

      const seoBlock =
        `<article class="seo-prerender">` +
        `<h1>Wildlife at ${esc(refuge.name)}</h1>` +
        `<p>${esc(refuge.name)}${stName ? ` in ${esc(stName)}` : ''} is a US national `
        + `wildlife refuge — which animals are recorded there, how likely you are to see `
        + `each one, and the best season to visit. Live data from eBird and iNaturalist.</p>` +
        (birdLi
          ? `<h2>Birds regularly recorded nearby</h2><ul>${birdLi}</ul>`
            + `<p>Percentages are the share of eBird checklists in the surrounding county `
            + `reporting each species — a county-wide signal, not a park-level guarantee.</p>`
          : '') +
        `<p>Loading the interactive map…</p>` +
        refNav +
        `</article>`;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        name: refuge.name,
        description: descClamped,
        url,
        ...(Number.isFinite(refuge.lat) && Number.isFinite(refuge.lng) ? {
          geo: { '@type': 'GeoCoordinates', latitude: refuge.lat, longitude: refuge.lng },
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
      html = html.replace(/<\/head>/,
        `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`);

      const dir = path.join(DIST, 'park', refuge.id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
      refugeUrls.push(url);
      written++;
    } catch (e) {
      console.warn(`⚠  refuge prerender skipped ${refuge.id}: ${e.message}`);
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
      `<h1>US Wildlife Explorer — wildlife at America's parks and refuges</h1>` +
      `<p>See which animals are recorded at more than 4,700 US national parks, ` +
      `state parks and national wildlife refuges — how likely you are to see ` +
      `each species, and the season to look. Live data from eBird, iNaturalist ` +
      `and the National Park Service.</p>` +
      `<p><a href="/park/nwr_bosque-del-apache">Browse national wildlife refuges →</a></p>` +
      `<p><a href="/species/">Looking for a specific bird? Find the parks where it lives →</a></p>` +
      `<p><a href="/guide">New here? See how to get the most out of it →</a></p>` +
      parkNav +
      `<p>Loading the interactive map…</p></article>`;
    const homeHtml = baseHtml.replace(/(<div id="root">)(<\/div>)/, `$1${homeBlock}$2`);
    writeFileSync(indexPath, homeHtml, 'utf8');
  } catch (e) {
    console.warn(`⚠  homepage prerender skipped: ${e.message}`);
  }

  // ── Species pages (/species/<slug>[/<state>]) ────────────────────────────
  // "Where to see a Bald Eagle in Florida" — long-tail landing pages built
  // from the county bird-frequency data (the same dataset that powers
  // state-park rarity). Top 150 birds by park coverage; one hub per species
  // listing its states, plus a page per species×state with ≥3 parks linking
  // straight to those parks' pages. /species/ is the crawl entry (linked from
  // the homepage). React mounts over each page and applies the species filter
  // (the /species/<slug> SPA route), so the pages are interactive, not stubs.
  const speciesUrls = [];
  try {
    const parkById = new Map();
    for (const [code, parks] of Object.entries(STATE_PARKS_BY_STATE))
      for (const p of (parks ?? [])) parkById.set(p.id, { ...p, st: code.toLowerCase() });

    // species → state → [{ park, f }], built once per dataset.
    const buildIndex = (perCounty) => {
      const idx = new Map();
      for (const [pid, county] of Object.entries(PARK_COUNTY)) {
        const park = parkById.get(pid);
        if (!park) continue;
        for (const [sp, f] of perCounty(county)) {
          let states = idx.get(sp);
          if (!states) idx.set(sp, (states = new Map()));
          let arr = states.get(park.st);
          if (!arr) states.set(park.st, (arr = []));
          arr.push({ park, f });
        }
      }
      return idx;
    };

    const birdIndex = buildIndex(function* (county) {
      const freq = COUNTY_BIRD_FREQ[county];
      if (!freq) return;
      for (const [sp, e] of Object.entries(freq)) {
        if (sp.startsWith('__')) continue;
        yield [sp, e?.f ?? 0];
      }
    });

    // Non-birds: mammals, reptiles, amphibians, marine life and insects. Same
    // county→park join, different source and — critically — a different UNIT.
    // Bird `f` is an eBird checklist reporting rate; non-bird `f` is an
    // iNaturalist observability index. The page copy below must never describe
    // one as the other, or we'd mass-produce the exact county/park overclaim
    // that took two rounds to remove from the UI — this time into Google's
    // index across thousands of pages, where it's effectively permanent.
    const nonbirdByCounty = new Map();
    for (const key of NONBIRD_STATE_KEYS) {
      const mod = await loadCountyNonbird(key);
      if (!mod) continue;
      for (const [county, groups] of Object.entries(mod)) {
        let bucket = nonbirdByCounty.get(county);
        if (!bucket) nonbirdByCounty.set(county, (bucket = []));
        for (const list of Object.values(groups)) {
          if (!Array.isArray(list)) continue;
          for (const pair of list) {
            const n = pair?.[0], f = pair?.[1];
            if (n && Number.isFinite(f)) bucket.push([String(n).toLowerCase(), f]);
          }
        }
      }
    }
    const nonbirdIndex = buildIndex(county => nonbirdByCounty.get(county) ?? []);

    const slugOf = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    // Shared across both datasets so a mammal can never overwrite a bird's page.
    const seenSlug = new Set();
    const topOf = (idx, limit) => [...idx.entries()]
      .map(([sp, states]) => ({ sp, states, slug: slugOf(sp), total: [...states.values()].reduce((s, a) => s + a.length, 0) }))
      .sort((a, b) => b.total - a.total)
      .filter(s => s.slug && !seenSlug.has(s.slug) && seenSlug.add(s.slug))
      .slice(0, limit);

    const top = topOf(birdIndex, 150);
    const topNonbird = topOf(nonbirdIndex, 150);

    // Shared page assembly — same meta treatment as the park pages.
    const renderPage = (relDir, url, title, descRaw, article, jsonLd) => {
      const desc = descRaw.length > 158 ? descRaw.slice(0, 155) + '…' : descRaw;
      let html = baseHtml
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<div id="root">)(<\/div>)/, `$1${article}$2`);
      html = html.replace(/<\/head>/,
        `  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`);
      mkdirSync(path.join(DIST, relDir), { recursive: true });
      writeFileSync(path.join(DIST, relDir, 'index.html'), html, 'utf8');
      speciesUrls.push(url);
      written++;
    };

    // Copy varies by dataset because the underlying number means different
    // things. Birds: "regularly recorded", eBird checklists. Non-birds:
    // "photographed", iNaturalist observations — never framed as a sighting
    // probability or a checklist rate.
    const COPY = {
      bird: {
        stateLead: (d, n, s) => `The ${d} is regularly recorded in the counties of ${n} ${s} state parks (eBird historical checklists). The strongest bets:`,
        stateDesc: (d, n, s) => `${n} ${s} state parks where the ${d} is regularly recorded — ranked by eBird checklist frequency, with live sighting data for each park.`,
        hubLead:   (d) => `State parks where the ${d} is regularly recorded, by state (eBird historical checklist data; live sighting odds on every park page):`,
        hubDesc:   (d, n) => `Find the ${d}: ${n} states with parks where it is regularly recorded, ranked, with live sighting data from eBird and iNaturalist.`,
      },
      nonbird: {
        stateLead: (d, n, s) => `The ${d} is recorded in the counties of ${n} ${s} state parks (research-grade iNaturalist observations). Ranked by how often it is observed in each area:`,
        stateDesc: (d, n, s) => `${n} ${s} state parks in counties where the ${d} is observed — ranked by iNaturalist observation frequency, with live sighting data for each park.`,
        hubLead:   (d) => `State parks in counties where the ${d} is observed, by state (research-grade iNaturalist records; live sighting data on every park page):`,
        hubDesc:   (d, n) => `Find the ${d}: ${n} states with parks in counties where it is observed, ranked by iNaturalist observation frequency.`,
      },
    };

    const emitSpecies = (list, kind) => {
      const c = COPY[kind];
      for (const { sp, states, slug } of list) {
        const display = titleCase(sp);
        const qualifying = [...states.entries()]
          .map(([st, arr]) => ({ st, arr }))
          .filter(x => x.arr.length >= 3)
          .sort((a, b) => b.arr.length - a.arr.length);
        if (!qualifying.length) continue;

        // Per species×state pages.
        for (const { st, arr } of qualifying) {
          const stName = STATE_NAMES[st.toUpperCase()] ?? st.toUpperCase();
          const parksTop = arr.sort((a, b) => b.f - a.f).slice(0, 25);
          const url = `${ORIGIN}/species/${slug}/${st}`;
          const lis = parksTop.map(({ park }) =>
            `<li><a href="/state-park/${st}/${encodeURIComponent(park.id)}">${esc(park.name)}</a></li>`).join('');
          const article =
            `<article class="seo-prerender">` +
            `<h1>Where to see a ${esc(display)} in ${esc(stName)}</h1>` +
            `<p>${esc(c.stateLead(display, arr.length, stName))}</p>` +
            `<ol>${lis}</ol>` +
            `<p>These are county-level records — the species is documented in the area ` +
            `around each park, which is a strong steer rather than a guarantee for the ` +
            `park itself.</p>` +
            `<p><a href="/species/${slug}">${esc(display)} in other states →</a> · ` +
            `<a href="/state/${st}">All ${esc(stName)} state parks →</a></p>` +
            `</article>`;
          renderPage(`species/${slug}/${st}`, url,
            `Where to see a ${display} in ${stName} — best parks | US Wildlife Explorer`,
            c.stateDesc(display, arr.length, stName),
            article,
            { '@context': 'https://schema.org', '@type': 'ItemList', name: `${display} in ${stName}`, url,
              itemListElement: parksTop.map(({ park }, i) => ({ '@type': 'ListItem', position: i + 1, name: park.name, url: `${ORIGIN}/state-park/${st}/${park.id}` })) });
        }

        // Species hub.
        const url = `${ORIGIN}/species/${slug}`;
        const stateLis = qualifying.map(({ st, arr }) =>
          `<li><a href="/species/${slug}/${st}">${esc(STATE_NAMES[st.toUpperCase()] ?? st)} — ${arr.length} parks</a></li>`).join('');
        const article =
          `<article class="seo-prerender">` +
          `<h1>Where to see a ${esc(display)} in the US</h1>` +
          `<p>${esc(c.hubLead(display))}</p>` +
          `<ul>${stateLis}</ul>` +
          `<p><a href="/species/">Browse all species →</a></p>` +
          `</article>`;
        renderPage(`species/${slug}`, url,
          `Where to see a ${display} — best US parks by state | US Wildlife Explorer`,
          c.hubDesc(display, qualifying.length),
          article,
          { '@context': 'https://schema.org', '@type': 'WebPage', name: `Where to see a ${display}`, url });
      }
    };

    emitSpecies(top, 'bird');
    emitSpecies(topNonbird, 'nonbird');

    // /species/ index — the crawl entry, linked from the homepage. Lists both
    // datasets under their own headings so the crawler reaches every hub.
    const liOf = ({ sp, slug }) =>
      `<li><a href="/species/${slug}">Where to see a ${esc(titleCase(sp))}</a></li>`;
    const total = top.length + topNonbird.length;
    renderPage('species', `${ORIGIN}/species/`,
      `Where to see ${total} US animals — park finder | US Wildlife Explorer`,
      `Pick an animal, get the US state parks where it's recorded — ${total} birds, mammals, reptiles and more, ranked from eBird and iNaturalist data.`,
      `<article class="seo-prerender"><h1>Find parks for a specific animal</h1>` +
      `<p>The most widespread species across 4,000+ US state parks, from eBird and ` +
      `iNaturalist records.</p>` +
      `<h2>Birds</h2><ul>${top.map(liOf).join('')}</ul>` +
      `<h2>Mammals, reptiles, amphibians &amp; more</h2><ul>${topNonbird.map(liOf).join('')}</ul>` +
      `</article>`,
      { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Animal park finder', url: `${ORIGIN}/species/` });
  } catch (e) {
    console.warn(`⚠  species pages skipped: ${e.message}`);
  }

  // ── How-to-use guide (/guide) — prerendered for SEO + sharing ─────────────
  // The crawlable body carries the tips so the page can rank for "how to find
  // wildlife at parks"; React mounts over it and the /guide route opens the
  // in-app guide modal.
  try {
    const gTitle = 'How to Use US Wildlife Explorer — Find Wildlife at 4,700+ Parks';
    const gDesc  = 'Five quick ways to get the most out of US Wildlife Explorer: search any animal to find the parks it lives in, find parks near you, filter by season and likelihood, keep a life list, and plan your visit with directions and trails.';
    const gUrl   = `${ORIGIN}/guide`;
    const tips = [
      ['Search any animal', 'Type a species — Bald Eagle, Black Bear, Monarch — to find every park where it has been seen. The fastest way to chase a specific creature.'],
      ['Find parks near you', 'See the closest national parks, state parks, and wildlife refuges sorted by distance, plus what is rare in the area right now.'],
      ['Filter for your trip', 'Set the season and likelihood filters to answer "what will I actually see in July?" and sort by how likely each species is.'],
      ['Keep a life list', 'Mark species seen to build a personal life list that remembers everything you have spotted across every park.'],
      ['Plan the visit', 'Every park has directions, hiking trails, and an opt-in photo of what it actually looks like.'],
    ];
    const guideBlock =
      `<article class="seo-prerender">` +
      `<h1>How to use US Wildlife Explorer</h1>` +
      `<p>Five quick ways to find the wildlife you're after across 4,700+ US national parks, state parks, and wildlife refuges.</p>` +
      tips.map(([t, b]) => `<h2>${esc(t)}</h2><p>${esc(b)}</p>`).join('') +
      `<h2>How to read the likelihood bar</h2><p>Each species shows how likely you are to encounter it — Guaranteed, Very Likely, Likely, Unlikely, or Rare — based on real eBird and iNaturalist sightings, adjusted for the park.</p>` +
      `<p><a href="/">Open the interactive map &rarr;</a></p></article>`;
    const html = baseHtml
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(gTitle)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(gDesc)}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${gUrl}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${gUrl}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(gTitle)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(gDesc)}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(gTitle)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(gDesc)}$2`)
      .replace(/(<div id="root">)(<\/div>)/, `$1${guideBlock}$2`);
    const dir = path.join(DIST, 'guide');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    written++;
  } catch (e) { console.warn(`⚠  guide prerender skipped: ${e.message}`); }

  // ── Privacy policy (/privacy) — REQUIRED by Google Play, and it must load for
  // reviewers with no JS, so it's a standalone static page rather than an SPA
  // route the React bundle would paint over.
  try {
    const dir = path.join(DIST, 'privacy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'index.html'), renderPrivacyHtml(ORIGIN), 'utf8');
    written++;
  } catch (e) { console.warn(`⚠  privacy prerender skipped: ${e.message}`); }

  // Sitemap — homepage + every park.
  const now = new Date().toISOString().slice(0, 10);
  const urls = [`${ORIGIN}/`, `${ORIGIN}/guide`, `${ORIGIN}/privacy`,
    ...wildlifeLocations.map(p => `${ORIGIN}/park/${p.id}`),
    ...refugeUrls, ...stateParkUrls, ...speciesUrls];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map(u => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join('\n')
    + `\n</urlset>\n`;
  writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`✅ Prerendered ${written} pages `
    + `(${wildlifeLocations.length} national parks + ${refugeUrls.length} refuges `
    + `+ ${stateParkUrls.length} state + ${speciesUrls.length} species) `
    + `+ OG images + sitemap (${urls.length} URLs).`);
}

main().catch(err => { console.error(err); process.exit(1); });
