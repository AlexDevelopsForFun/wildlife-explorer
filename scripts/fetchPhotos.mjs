#!/usr/bin/env node
/**
 * fetchPhotos.mjs — Fetch photos from iNaturalist for top animals missing from BUNDLED_PHOTOS
 *
 * Strategy: Focus on the top 25 animals per park (by rarity tier), targeting unique species
 * not already covered by BUNDLED_PHOTOS. Writes results back into wildlifeCache.js photoUrl fields.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_FILE = path.join(__dirname, 'photoFetch-cache.json');

// Resume support
let fetchCache = {};
if (existsSync(CACHE_FILE)) {
  fetchCache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  console.log(`Resuming with ${Object.keys(fetchCache).length} cached photo lookups`);
}

function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(fetchCache, null, 2), 'utf8');
}

const mod = await import('../src/data/wildlifeCache.js');
const photoMod = await import('../src/data/photoCache.js');
const BUNDLED = new Set(Object.keys(photoMod.BUNDLED_PHOTOS));
const cache = JSON.parse(JSON.stringify(mod.WILDLIFE_CACHE));

// Rarity tier order for sorting
const RARITY_ORDER = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };

// Collect unique species names across top 25 animals per park
const targetNames = new Set();
for (const [parkId, park] of Object.entries(cache)) {
  const sorted = [...park.animals].sort((a, b) => {
    const ra = RARITY_ORDER[a.rarity] ?? 6;
    const rb = RARITY_ORDER[b.rarity] ?? 6;
    return ra - rb;
  });
  for (const a of sorted.slice(0, 25)) {
    if (!BUNDLED.has(a.name) && !a.photoUrl) {
      targetNames.add(a.name);
    }
  }
}

console.log(`\nTarget: ${targetNames.size} unique species need photos (top 25/park, not in BUNDLED_PHOTOS)`);

// Build lookup: name → scientificName (from any park)
const sciNameLookup = {};
for (const park of Object.values(cache)) {
  for (const a of park.animals) {
    if (a.scientificName && !sciNameLookup[a.name]) {
      sciNameLookup[a.name] = a.scientificName;
    }
  }
}

// Fetch from iNaturalist
async function fetchInat(name, scientificName) {
  const cacheKey = `inat:${name}`;
  if (fetchCache[cacheKey] !== undefined) return fetchCache[cacheKey];

  const query = scientificName || name;
  const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&locale=en&per_page=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) { fetchCache[cacheKey] = null; return null; }
    const data = await res.json();

    // Find the best match
    for (const result of (data.results || [])) {
      if (result.default_photo?.medium_url) {
        const photoUrl = result.default_photo.medium_url;
        fetchCache[cacheKey] = photoUrl;
        return photoUrl;
      }
    }
    fetchCache[cacheKey] = null;
    return null;
  } catch (e) {
    fetchCache[cacheKey] = null;
    return null;
  }
}

// Fetch from Wikipedia
async function fetchWiki(name) {
  const cacheKey = `wiki:${name}`;
  if (fetchCache[cacheKey] !== undefined) return fetchCache[cacheKey];

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { fetchCache[cacheKey] = null; return null; }
    const data = await res.json();
    if (data.thumbnail?.source) {
      fetchCache[cacheKey] = data.thumbnail.source;
      return data.thumbnail.source;
    }
    fetchCache[cacheKey] = null;
    return null;
  } catch (e) {
    fetchCache[cacheKey] = null;
    return null;
  }
}

// Process in batches
const names = [...targetNames];
let recovered = 0, stillMissing = 0;
const photoResults = {}; // name → url

const BATCH_SIZE = 30;
for (let i = 0; i < names.length; i += BATCH_SIZE) {
  const batch = names.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(names.length / BATCH_SIZE);
  process.stdout.write(`\rBatch ${batchNum}/${totalBatches} (${i}/${names.length} species)...`);

  const promises = batch.map(async (name) => {
    // Try iNat first with scientific name
    let url = await fetchInat(name, sciNameLookup[name]);

    // Fallback: iNat with common name
    if (!url && sciNameLookup[name]) {
      url = await fetchInat(name, null);
    }

    // Fallback: Wikipedia
    if (!url) {
      url = await fetchWiki(name);
    }

    if (url) {
      photoResults[name] = url;
      recovered++;
    } else {
      stillMissing++;
    }
  });

  await Promise.all(promises);
  saveCache();

  // Rate limit
  if (i + BATCH_SIZE < names.length) {
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\n\nPhoto fetch complete:`);
console.log(`  Recovered: ${recovered}`);
console.log(`  Still missing: ${stillMissing}`);

// Apply photos to the cache
let applied = 0;
for (const [parkId, park] of Object.entries(cache)) {
  for (const animal of park.animals) {
    if (!animal.photoUrl && photoResults[animal.name]) {
      animal.photoUrl = photoResults[animal.name];
      applied++;
    }
  }
}
console.log(`  Applied to cache entries: ${applied}`);

// Write back the cache
const builtAt = new Date().toISOString().split('T')[0];
const totalSpecies = Object.values(cache).reduce((s, v) => s + v.animals.length, 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Patched: ${builtAt} by fetchPhotos.mjs`,
  `// Parks: ${Object.keys(cache).length} | Species bundled: ${totalSpecies}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
  ``,
  `export const WILDLIFE_CACHE = {`,
];

for (const [id, val] of Object.entries(cache)) {
  lines.push(`  ${JSON.stringify(id)}: {`);
  lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
  lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
  lines.push(`  },`);
}
lines.push(`};`);
lines.push(``);

const outPath = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Written to: ${outPath}`);
