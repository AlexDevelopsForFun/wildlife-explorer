#!/usr/bin/env node
// ── scripts/fixNullDescriptions.mjs ──────────────────────────────────────────
// Fixes all 487 animals that have null/empty descriptions in wildlifeCache.js.
// These are curated animals whose funFacts are real (not placeholders), so
// enrichDescriptions.js skipped them. This script handles them directly.
//
// Strategy per species (deduped):
//   1. Check existing description-cache.json
//   2. Try iNaturalist taxa API (wikipedia_summary)
//   3. Try Wikipedia by scientific name
//   4. Try Wikipedia by common name
//   5. Factual template fallback
//
// Usage: node scripts/fixNullDescriptions.mjs

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CACHE_PATH  = join(ROOT, 'src', 'data', 'wildlifeCache.js');
const DESC_CACHE  = join(__dir, 'description-cache.json');

const DELAY = 400;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Load existing description cache ───────────────────────────────────────────
const descCache = existsSync(DESC_CACHE)
  ? JSON.parse(readFileSync(DESC_CACHE, 'utf8'))
  : {};

// ── Load wildlifeCache ────────────────────────────────────────────────────────
const { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } = await import('../src/data/wildlifeCache.js');
const { wildlifeLocations } = await import('../src/wildlifeData.js');
const parkNames = Object.fromEntries(wildlifeLocations.map(l => [l.id, l.name]));

// ── Find all null-description animals ────────────────────────────────────────
const nullAnimals = [];
for (const [parkId, park] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of park.animals ?? []) {
    if (!a.description || a.description.trim() === '') {
      nullAnimals.push({ parkId, animal: a });
    }
  }
}

// Deduplicate: one fetch per species
const uniqueSpecies = new Map(); // name → {sci, type, seasons, parkId, parkName}
for (const { parkId, animal } of nullAnimals) {
  if (!uniqueSpecies.has(animal.name)) {
    uniqueSpecies.set(animal.name, {
      sci:      animal.scientificName,
      type:     animal.animalType,
      seasons:  animal.seasons ?? [],
      parkId,
      parkName: parkNames[parkId] ?? parkId,
    });
  }
}

console.log(`\n📚  Fix Null Descriptions`);
console.log(`   Null-desc animals:   ${nullAnimals.length}`);
console.log(`   Unique species:      ${uniqueSpecies.size}`);
console.log(`   Already in d-cache:  checking...`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function firstNSentences(text, n = 2) {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/\s+/g, ' ').replace(/<[^>]+>/g, '').trim();
  const re = /[^.!?]+(?:[.!?](?:\s|$))+/g;
  const matches = [...cleaned.matchAll(re)].map(m => m[0].trim()).filter(s => s.length > 15);
  if (!matches.length) return cleaned.length > 300 ? cleaned.slice(0, 300) + '…' : cleaned;
  return matches.slice(0, n).join(' ').trim();
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildlifeExplorerMap/1.0 (educational)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function tryInat(name, sci) {
  const query = sci || name;
  const data = await safeFetch(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=1&locale=en&is_active=true`
  );
  const taxon = data?.results?.[0];
  if (!taxon) return null;
  const summary = taxon.wikipedia_summary?.replace(/<[^>]+>/g, '').trim();
  if (!summary || summary.length < 30) return null;
  // Loose name match
  const retSci  = (taxon.name ?? '').toLowerCase();
  const sciLow  = (sci ?? '').toLowerCase();
  const retCom  = (taxon.preferred_common_name ?? '').toLowerCase();
  const nameLow = name.toLowerCase();
  const match =
    (sciLow && retSci.startsWith(sciLow.split(' ')[0])) ||
    retCom.includes(nameLow.split(' ').pop()) ||
    nameLow.includes(retCom.split(' ').pop());
  if (!match) return null;
  return { text: firstNSentences(summary, 2), source: 'iNaturalist' };
}

async function tryWiki(query) {
  const data = await safeFetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`
  );
  if (!data?.extract || data.type === 'disambiguation' || data.extract.length < 30) return null;
  const desc = (data.description ?? '').toLowerCase();
  const bad = ['city','town','county','region','river','mountain','lake','village','municipality','band','album','film','song'];
  if (bad.some(t => desc.includes(t))) return null;
  return { text: firstNSentences(data.extract, 2), source: 'Wikipedia' };
}

function templateFallback(name, sci, type, seasons, parkName) {
  const s = (seasons ?? []).filter(x => x !== 'year_round');
  const best = s.includes('summer') ? 'summer'
    : s.includes('spring') ? 'spring'
    : s.includes('fall') ? 'fall'
    : s[0] ?? 'summer';
  const t = type === 'bird' ? 'bird' : type === 'mammal' ? 'mammal'
    : type === 'reptile' ? 'reptile' : type === 'amphibian' ? 'amphibian'
    : type === 'fish' ? 'fish' : type === 'marine' ? 'marine animal' : 'animal';
  const sciPart = sci ? ` (${sci})` : '';
  return {
    text: `${name}${sciPart} is a ${t} found at ${parkName}. Best viewed during ${best}.`,
    source: 'Park Records',
  };
}

// ── Fetch descriptions for all unique species ─────────────────────────────────
const fetched = new Map(); // name → {text, source}
let fromCache = 0, fromInat = 0, fromWiki = 0, fromTemplate = 0;
let i = 0;

for (const [name, info] of uniqueSpecies) {
  i++;
  const pct = Math.round(i / uniqueSpecies.size * 100);
  process.stdout.write(`\r   ${i}/${uniqueSpecies.size} (${pct}%) — inat:${fromInat} wiki:${fromWiki} cache:${fromCache} tmpl:${fromTemplate}  `);

  // 1. Check existing description-cache.json (keyed by sci name or common name)
  const cacheKey = info.sci || name;
  if (descCache[cacheKey]) {
    fetched.set(name, { text: descCache[cacheKey].text, source: descCache[cacheKey].source });
    fromCache++;
    continue;
  }
  // Also try common name as cache key
  if (descCache[name]) {
    fetched.set(name, { text: descCache[name].text, source: descCache[name].source });
    fromCache++;
    continue;
  }

  // 2. iNaturalist
  let result = await tryInat(name, info.sci);
  if (result) { fromInat++; await sleep(DELAY); }

  // 3. Wikipedia by sci name
  if (!result && info.sci) {
    await sleep(DELAY);
    result = await tryWiki(info.sci);
    if (result) fromWiki++;
  }

  // 4. Wikipedia by common name
  if (!result) {
    await sleep(DELAY);
    result = await tryWiki(name);
    if (result) fromWiki++;
  }

  // 5. Template fallback
  if (!result) {
    result = templateFallback(name, info.sci, info.type, info.seasons, info.parkName);
    fromTemplate++;
  }

  fetched.set(name, result);

  // Save to description cache
  if (result.source !== 'Park Records') {
    descCache[cacheKey] = { text: result.text, source: result.source };
  }

  await sleep(100); // small gap even on cache hit paths
}

console.log(`\n\n✅  Fetched descriptions for ${fetched.size} species`);
console.log(`   From d-cache:  ${fromCache}`);
console.log(`   From iNat:     ${fromInat}`);
console.log(`   From Wikipedia: ${fromWiki}`);
console.log(`   From template: ${fromTemplate}\n`);

// ── Apply descriptions to wildlifeCache ───────────────────────────────────────
let applied = 0;
for (const [parkId, park] of Object.entries(WILDLIFE_CACHE)) {
  for (const animal of park.animals ?? []) {
    if (!animal.description || animal.description.trim() === '') {
      const result = fetched.get(animal.name);
      if (result?.text) {
        animal.description = result.text;
        animal.descriptionSource = result.source;
        applied++;
      }
    }
  }
}

console.log(`Applied descriptions to ${applied} animals`);

// ── Write updated cache ───────────────────────────────────────────────────────
const cacheStr = JSON.stringify(WILDLIFE_CACHE, null, 2)
  .replace(/^/, `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(WILDLIFE_CACHE_BUILT_AT)};\n\nexport const WILDLIFE_CACHE = `)
  .trimEnd() + ';\n\nexport default WILDLIFE_CACHE;\n';

// Actually rebuild properly like other scripts
const src = readFileSync(CACHE_PATH, 'utf8');
// Find the WILDLIFE_CACHE_BUILT_AT value
const builtAtMatch = src.match(/WILDLIFE_CACHE_BUILT_AT\s*=\s*"([^"]+)"/);
const builtAt = builtAtMatch ? builtAtMatch[1] : WILDLIFE_CACHE_BUILT_AT;

const newSrc = [
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
  ``,
  `export const WILDLIFE_CACHE = ${JSON.stringify(WILDLIFE_CACHE, null, 2)};`,
  ``,
  `export default WILDLIFE_CACHE;`,
  ``,
].join('\n');

writeFileSync(CACHE_PATH, newSrc, 'utf8');
writeFileSync(DESC_CACHE, JSON.stringify(descCache, null, 2), 'utf8');

// ── Final verification ────────────────────────────────────────────────────────
let remaining = 0;
for (const park of Object.values(WILDLIFE_CACHE)) {
  for (const a of park.animals ?? []) {
    if (!a.description || a.description.trim() === '') remaining++;
  }
}

console.log(`\n📊  Final counts:`);
console.log(`   Descriptions applied: ${applied}`);
console.log(`   Still null/empty:     ${remaining}`);
console.log(`\n📄  Written → src/data/wildlifeCache.js`);
console.log(`📄  Updated → scripts/description-cache.json\n`);
