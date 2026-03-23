/**
 * scripts/fixDataQuality.mjs
 *
 * 1. Remove duplicate no-sci-name entries (bare "Elk" where "American Elk" exists)
 * 2. Fix single-word no-sci-name entries by adding scientific name
 * 3. Pre-fetch photos for top-50 most common animals and store in cache
 * 4. Rewrite wildlifeCache.js with all fixes applied
 *
 * Run: node scripts/fixDataQuality.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── Load cache ──────────────────────────────────────────────────────────────
const { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } = await import('../src/data/wildlifeCache.js');

// ── Known single-word sci-name fixes ────────────────────────────────────────
const SCI_NAME_FIXES = {
  'Elk':       'Cervus canadensis',
  'Wolverine': 'Gulo gulo',
};

// ── Step 1: Clean entries ───────────────────────────────────────────────────
function hasForeignScript(name) {
  return /[\u0400-\u04FF\u4E00-\u9FFF\u0600-\u06FF\u0590-\u05FF\u0900-\u097F]/.test(name);
}
function isGenusOnlySci(sci) {
  if (!sci) return false;
  const parts = sci.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return true;
  if (parts.length === 2 && /^spp?\.?$/i.test(parts[1])) return true;
  return false;
}

let totalRemoved = 0;
let totalFixed = 0;
const removedByPark = {};

const cleanedCache = {};
for (const [parkId, entry] of Object.entries(WILDLIFE_CACHE)) {
  const animals = entry.animals ?? [];
  const allNames = animals.map(a => a.name).filter(Boolean);

  const cleaned = [];
  for (const a of animals) {
    const n = a.name?.trim();
    if (!n) { totalRemoved++; removedByPark[parkId] = (removedByPark[parkId] ?? 0) + 1; continue; }

    // Remove entries with clearly bad name patterns
    if (/\b(unidentified|unknown|hybrid)\b/i.test(n) ||
        /\bspp?\./i.test(n) ||
        /,\s*\d{4}/.test(n) ||
        /\b(family|order|class|phylum|suborder|tribe)\s+[A-Z]/.test(n) ||
        hasForeignScript(n) ||
        isGenusOnlySci(a.scientificName)) {
      totalRemoved++;
      removedByPark[parkId] = (removedByPark[parkId] ?? 0) + 1;
      continue;
    }

    // Remove bare single-word entries that are duplicates of a named entry
    if (!n.includes(' ') && !a.scientificName) {
      const hasBetterEntry = allNames.some(other => other !== n && other.toLowerCase().includes(n.toLowerCase()));
      if (hasBetterEntry) {
        totalRemoved++;
        removedByPark[parkId] = (removedByPark[parkId] ?? 0) + 1;
        continue;
      }
      // Fix: add known scientific name
      const sci = SCI_NAME_FIXES[n];
      if (sci) {
        cleaned.push({ ...a, scientificName: sci });
        totalFixed++;
        continue;
      }
    }

    cleaned.push(a);
  }

  cleanedCache[parkId] = { ...entry, animals: cleaned };
}

console.log(`\n✅ Cleaning complete:`);
console.log(`   Removed: ${totalRemoved} invalid entries`);
console.log(`   Fixed:   ${totalFixed} entries (added scientific names)`);
if (Object.keys(removedByPark).length > 0) {
  console.log(`   By park: ${Object.entries(removedByPark).map(([id,n])=>`${id}(${n})`).join(', ')}`);
}

// ── Step 2: Find top-50 most common animals ─────────────────────────────────
const nameCount = {};
const nameSciMap = {};
for (const { animals } of Object.values(cleanedCache)) {
  const seen = new Set();
  for (const a of animals) {
    if (!a.name || seen.has(a.name)) continue;
    seen.add(a.name);
    nameCount[a.name] = (nameCount[a.name] ?? 0) + 1;
    if (a.scientificName && !nameSciMap[a.name]) nameSciMap[a.name] = a.scientificName;
  }
}

const top50 = Object.entries(nameCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([name]) => name);

console.log(`\n🔍 Fetching photos for top-50 most common animals...`);

// ── Step 3: Fetch photos ─────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function tryInat(name, sciName) {
  const q = sciName ?? name;
  try {
    const res = await fetch(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(q)}&per_page=5&locale=en`
    );
    if (!res.ok) return null;
    const { results } = await res.json();
    for (const taxon of (results ?? [])) {
      const p = taxon.default_photo;
      if (!p?.medium_url) continue;
      return p.medium_url;
    }
  } catch { /* fall through */ }
  return null;
}

async function tryWikipedia(name) {
  await sleep(1200); // 1.2s gap to avoid rate limiting
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/\s+/g, '_'))}`
    );
    if (res.status === 429) { await sleep(3000); return null; }
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail?.source ?? null;
  } catch { return null; }
}

const photoMap = {};    // name → url
const photoFailed = []; // names where both APIs failed

for (let i = 0; i < top50.length; i++) {
  const name = top50[i];
  const sci  = nameSciMap[name];
  process.stdout.write(`  [${(i+1).toString().padStart(2)}/50] ${name}... `);

  let url = await tryInat(name, sci);
  if (!url) {
    url = await tryWikipedia(name);
  }

  if (url) {
    photoMap[name] = url;
    console.log(`✅ ${url.slice(0,60)}...`);
  } else {
    photoFailed.push(name);
    console.log(`❌ no photo`);
  }

  // Small delay between iNat calls to be polite
  await sleep(300);
}

console.log(`\n📸 Photos fetched: ${Object.keys(photoMap).length}/50`);
if (photoFailed.length > 0) {
  console.log(`   Still missing: ${photoFailed.join(', ')}`);
}

// ── Step 4: Apply photos to all matching animals in cache ─────────────────
let photosApplied = 0;
for (const [parkId, entry] of Object.entries(cleanedCache)) {
  const updated = entry.animals.map(a => {
    if (!a.name || a.photoUrl || !photoMap[a.name]) return a;
    photosApplied++;
    return { ...a, photoUrl: photoMap[a.name] };
  });
  cleanedCache[parkId] = { ...entry, animals: updated };
}
console.log(`\n🖼️  Photo URLs applied to ${photosApplied} cache entries`);

// ── Step 5: Write updated cache ─────────────────────────────────────────────
const builtAt   = WILDLIFE_CACHE_BUILT_AT;
const totalSpec = Object.values(cleanedCache).reduce((s, v) => s + v.animals.length, 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Built: ${builtAt}`,
  `// Parks: ${Object.keys(cleanedCache).length} | Species bundled: ${totalSpec}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
  ``,
  `export const WILDLIFE_CACHE = {`,
];

for (const [id, val] of Object.entries(cleanedCache)) {
  lines.push(`  ${JSON.stringify(id)}: {`);
  lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
  lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
  lines.push(`  },`);
}
lines.push(`};`);
lines.push(``);

const outPath = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`\n💾 Cache written to ${outPath}`);
console.log(`   Total species: ${totalSpec}`);

// ── Final report ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`FINAL REPORT`);
console.log(`${'─'.repeat(60)}`);
console.log(`  Invalid entries removed:  ${totalRemoved}`);
console.log(`  Entries fixed (sci name): ${totalFixed}`);
console.log(`  Photos pre-fetched:       ${Object.keys(photoMap).length}/50`);
console.log(`  Photo URLs in cache:      ${photosApplied}`);
console.log(`  Total species in cache:   ${totalSpec}`);
if (photoFailed.length > 0) {
  console.log(`  Still missing photos:     ${photoFailed.join(', ')}`);
}
