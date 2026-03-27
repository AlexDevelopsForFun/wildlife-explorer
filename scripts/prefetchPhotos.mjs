#!/usr/bin/env node
// ── scripts/prefetchPhotos.mjs ────────────────────────────────────────────────
// Pre-fetches iNaturalist photos for the top N most-seen animals across all
// parks and writes the results to src/data/photoCache.js.
//
// PhotoService.js imports this cache and returns results instantly (no network
// call needed) for animals that are already in the bundle.
//
// Usage:  node scripts/prefetchPhotos.mjs
//         node scripts/prefetchPhotos.mjs --count 500   (default: 300)

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir   = dirname(fileURLToPath(import.meta.url));
const ROOT    = join(__dir, '..');
const OUT     = join(ROOT, 'src', 'data', 'photoCache.js');
const COUNT   = parseInt(process.argv[process.argv.indexOf('--count') + 1] || '300', 10) || 300;
const DELAY   = 350;   // ms between iNat requests (well under their rate limit)

const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');

// ── 1. Rank animals by a hybrid score: park count × charisma boost ────────────
const parkCount  = new Map();   // name → # parks containing it
const sciNameMap = new Map();   // name → scientificName (first non-null found)
const rarityMap  = new Map();   // name → rarity (best across parks)
const typeMap    = new Map();   // name → animalType

const RARITY_SCORE = { guaranteed: 6, very_likely: 5, likely: 4, unlikely: 3, rare: 2, exceptional: 2 };

for (const entry of Object.values(WILDLIFE_CACHE)) {
  const seen = new Set();
  for (const a of entry.animals ?? []) {
    if (!a.name) continue;
    if (!seen.has(a.name)) {
      seen.add(a.name);
      parkCount.set(a.name, (parkCount.get(a.name) ?? 0) + 1);
    }
    if (a.scientificName && !sciNameMap.has(a.name)) sciNameMap.set(a.name, a.scientificName);
    if (a.animalType && !typeMap.has(a.name)) typeMap.set(a.name, a.animalType);
    // Keep highest rarity score seen across all parks
    const rs = RARITY_SCORE[a.rarity] ?? 0;
    if (rs > (rarityMap.get(a.name) ?? 0)) rarityMap.set(a.name, rs);
  }
}

// Charisma boost for iconic/visitor-facing animals
function charismaBoost(name, type) {
  const n = (name ?? '').toLowerCase();
  if (/\b(bison|buffalo|bear|grizzly|wolf|alligator|moose|elk|wapiti|mountain lion|puma|cougar|manatee|wolverine)\b/.test(n)) return 40;
  if (/\b(eagle|condor|osprey|peregrine|falcon|hawk|owl|puffin|flamingo|spoonbill|crane|loon|pelican)\b/.test(n)) return 30;
  if (/\b(whale|dolphin|orca|seal|sea lion|sea turtle|shark|manta ray)\b/.test(n)) return 30;
  if (/\b(deer|pronghorn|bighorn|mountain goat|caribou|fox|coyote|bobcat|lynx|otter|beaver)\b/.test(n)) return 20;
  if (type === 'mammal') return 15;
  if (type === 'marine') return 15;
  if (type === 'reptile') return 10;
  return 0;
}

const ranked = [...parkCount.entries()]
  .map(([name, parks]) => {
    const type = typeMap.get(name);
    const score = parks + charismaBoost(name, type) + (rarityMap.get(name) ?? 0);
    return { name, score, sci: sciNameMap.get(name) ?? null };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, COUNT);

console.log(`\n📸  Photo Pre-fetch`);
console.log(`   Animals to fetch: ${ranked.length}`);
console.log(`   Estimated time:   ~${Math.ceil(ranked.length * DELAY / 60000)} min\n`);

// ── 2. Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseCredit(attribution) {
  if (!attribution) return null;
  let m = attribution.match(/^\(c\)\s+(.+?),/i);
  if (m) return m[1].trim();
  m = attribution.match(/©\s+(?:\d{4}\s+)?(.+?),/i);
  if (m) return m[1].trim();
  return attribution.split(',')[0].replace(/^\(c\)\s*/i, '').replace(/^©\s*\d*\s*/i, '').trim() || null;
}

async function tryInat(query) {
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=5&locale=en`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    for (const taxon of results ?? []) {
      const p = taxon.default_photo;
      if (!p?.medium_url) continue;
      return {
        url:         p.medium_url,
        largeUrl:    p.medium_url.replace(/\/medium\./, '/large.'),
        credit:      parseCredit(p.attribution),
        attribution: p.attribution ?? null,
        source:      'inat',
      };
    }
  } catch { /* timeout / network */ }
  return null;
}

// ── 3. Fetch photos ───────────────────────────────────────────────────────────
const results  = {};   // name → photo object | null
let fetched = 0, found = 0, failed = 0;

for (const { name, sci } of ranked) {
  let photo = await tryInat(name);
  if (!photo && sci) photo = await tryInat(sci);
  photo = photo ?? null;

  results[name] = photo;
  fetched++;
  if (photo) found++; else failed++;

  const pct = Math.round(fetched / ranked.length * 100);
  process.stdout.write(`\r   ${fetched}/${ranked.length} (${pct}%) — found: ${found}  failed: ${failed}  `);

  await sleep(DELAY);
}

console.log(`\n\n✅  Done — ${found}/${fetched} photos found\n`);

// ── 4. Write photoCache.js ────────────────────────────────────────────────────
const lines = [
  `// Auto-generated by scripts/prefetchPhotos.mjs — DO NOT EDIT MANUALLY`,
  `// Rebuilt by running:  node scripts/prefetchPhotos.mjs`,
  `// ${found} bundled photos for the ${ranked.length} most common animals across all parks`,
  ``,
  `export const BUNDLED_PHOTOS = {`,
];

for (const [name, photo] of Object.entries(results)) {
  if (photo) {
    lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(photo)},`);
  }
}

lines.push(`};`);
lines.push(``);

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`📄  Written → src/data/photoCache.js  (${found} entries)\n`);
