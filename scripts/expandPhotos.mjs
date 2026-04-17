#!/usr/bin/env node
/**
 * expandPhotos.mjs — Expand BUNDLED_PHOTOS from ~349 to 800+ entries.
 *
 * Strategy:
 *  1. Find all unique animals appearing at 3+ parks without a bundled photo.
 *  2. Prioritise: vertebrates (birds, mammals, reptiles, amphibians, marine)
 *     then top insects. Sort by park-count descending.
 *  3. Fetch from iNaturalist taxa/autocomplete with strict animal filtering.
 *  4. HEAD-verify every URL.
 *  5. Merge into src/data/photoCache.js — never overwrites existing entries.
 *  6. Progress report every 50 animals.
 *
 * Usage:  node scripts/expandPhotos.mjs
 * Resume: re-run — skips anything already in the resume cache.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'src', 'data', 'photoCache.js');
const RESUME_CACHE = join(__dir, 'expandPhotos-resume.json');

// ── Animal-only iconic taxa ──────────────────────────────────────────────────
const ANIMAL_ICONIC = new Set([
  'Mammalia','Aves','Reptilia','Amphibia','Actinopterygii',
  'Insecta','Arachnida','Mollusca','Animalia','Elasmobranchii',
  'Echinodermata','Annelida','Arthropoda','Chromista',
]);

function isAnimalTaxon(taxon) {
  if (!taxon) return false;
  const icon = taxon.iconic_taxon_name;
  if (icon === 'Plantae' || icon === 'Fungi' || icon === 'Protozoa' || icon === 'Bacteria') return false;
  if (ANIMAL_ICONIC.has(icon)) return true;
  const anc = taxon.ancestry ?? '';
  return anc.includes('/1/') || anc.startsWith('1/') || anc === '1';
}

function parseCredit(attribution) {
  if (!attribution) return null;
  let m = attribution.match(/^\(c\)\s+(.+?),/i);
  if (m) return m[1].trim();
  m = attribution.match(/©\s*(?:\d{4}\s+)?(.+?),/i);
  if (m) return m[1].trim();
  return attribution.split(',')[0].replace(/^\(c\)\s*/i,'').replace(/^©\s*\d*\s*/i,'').trim() || null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Fetch iNaturalist photo (animal-only) ────────────────────────────────────
async function fetchInatPhoto(query) {
  try {
    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=10&locale=en`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const { results } = await res.json();
    for (const taxon of results ?? []) {
      if (!isAnimalTaxon(taxon)) continue;
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

// ── HEAD-verify a URL returns a real image ───────────────────────────────────
async function verifyImageUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    return ct.startsWith('image/') && !ct.includes('svg');
  } catch { return false; }
}

// ── Load existing photoCache.js ───────────────────────────────────────────────
console.log('Loading existing photoCache.js…');
const cacheText = readFileSync(OUT, 'utf8');
const objMatch  = cacheText.match(/export const BUNDLED_PHOTOS\s*=\s*(\{[\s\S]*?\});?\s*$/m)
                ?? cacheText.match(/export const BUNDLED_PHOTOS\s*=\s*(\{[\s\S]*\});/);
if (!objMatch) { console.error('❌  Could not parse photoCache.js'); process.exit(1); }

// Strip trailing commas before parsing as JSON
const jsonStr = objMatch[1]
  .replace(/,(\s*[}\]])/g, '$1')    // trailing commas
  .replace(/\/\/.*/g, '')           // single-line comments
  .trim();
let existingPhotos;
try {
  existingPhotos = JSON.parse(jsonStr);
} catch(e) {
  // Fall back to Function eval for non-strict JS objects
  existingPhotos = new Function(`return ${objMatch[1]}`)();
}
console.log(`   Existing entries: ${Object.keys(existingPhotos).length}`);

// ── Load wildlifeCache ────────────────────────────────────────────────────────
console.log('Loading wildlife cache…');
const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');

// Build: name → { parkCount, type, sciName }
const animalStats = new Map();
for (const [parkId, data] of Object.entries(WILDLIFE_CACHE)) {
  for (const a of data.animals ?? []) {
    if (!a.name) continue;
    if (!animalStats.has(a.name)) {
      animalStats.set(a.name, { parks: new Set(), type: a.animalType, sci: a.scientificName ?? null });
    }
    animalStats.get(a.name).parks.add(parkId);
  }
}

// Filter: 3+ parks, no existing bundled photo
const TYPE_PRIORITY = { mammal: 0, bird: 1, marine: 2, reptile: 3, amphibian: 4, insect: 5, other: 6 };

const targets = [...animalStats.entries()]
  .filter(([name, v]) => v.parks.size >= 3 && !existingPhotos[name])
  .map(([name, v]) => ({
    name,
    parkCount: v.parks.size,
    type:      v.type,
    sci:       v.sci,
    typePri:   TYPE_PRIORITY[v.type] ?? 7,
  }))
  // Sort: vertebrates first (by type priority), then by park count desc
  .sort((a, b) => a.typePri - b.typePri || b.parkCount - a.parkCount);

// Cap at top 600 (enough to clear 800+ total with ~25% failure rate expected)
const todo = targets.slice(0, 600);
console.log(`\nTargets: ${targets.length} animals at 3+ parks without photos`);
console.log(`Processing top: ${todo.length}`);
const typeBreakdown = {};
for (const t of todo) typeBreakdown[t.type] = (typeBreakdown[t.type] || 0) + 1;
console.log(`By type:`, typeBreakdown);

// ── Resume cache ─────────────────────────────────────────────────────────────
let resume = {};
if (existsSync(RESUME_CACHE)) {
  resume = JSON.parse(readFileSync(RESUME_CACHE, 'utf8'));
  console.log(`\nResuming: ${Object.keys(resume).length} already attempted`);
}

function saveResume() {
  writeFileSync(RESUME_CACHE, JSON.stringify(resume, null, 2), 'utf8');
}

// ── Main fetch loop ───────────────────────────────────────────────────────────
const DELAY     = 260;
const BATCH_SIZE = 50;

const newPhotos  = {};   // name → photo object (verified only)
let fetched = 0, verified = 0, skipped = 0, failed = 0;

console.log(`\n${'─'.repeat(60)}`);

for (let i = 0; i < todo.length; i++) {
  const { name, type, sci, parkCount } = todo[i];

  // Already resolved in a prior run?
  if (resume[name] !== undefined) {
    if (resume[name]) {
      newPhotos[name] = resume[name];
      verified++;
    } else {
      skipped++;
    }
    // Progress tick without delay since we're reading from cache
    if ((i + 1) % BATCH_SIZE === 0 || i === todo.length - 1) {
      const batchNum = Math.ceil((i + 1) / BATCH_SIZE);
      const total = todo.length;
      const pct = Math.round((i + 1) / total * 100);
      console.log(`Batch ${batchNum} (${i + 1}/${total}, ${pct}%) | +new: ${Object.keys(newPhotos).length} | skipped: ${skipped} | [from resume cache]`);
    }
    continue;
  }

  // Try iNat with common name first
  let photo = await fetchInatPhoto(name);
  fetched++;
  await sleep(DELAY);

  // Fallback: try scientific name
  if (!photo && sci) {
    photo = await fetchInatPhoto(sci);
    fetched++;
    await sleep(DELAY);
  }

  if (!photo) {
    resume[name] = null;
    failed++;
    if ((i + 1) % BATCH_SIZE === 0 || i === todo.length - 1) {
      saveResume();
      const pct = Math.round((i + 1) / todo.length * 100);
      console.log(`Batch ${Math.ceil((i + 1) / BATCH_SIZE)} (${i + 1}/${todo.length}, ${pct}%) | +new: ${Object.keys(newPhotos).length} | failed: ${failed} | skipped: ${skipped}`);
    }
    continue;
  }

  // HEAD-verify the URL
  const ok = await verifyImageUrl(photo.url);
  await sleep(100);

  if (!ok) {
    resume[name] = null;
    failed++;
  } else {
    resume[name] = photo;
    newPhotos[name] = photo;
    verified++;
  }

  // Batch progress
  if ((i + 1) % BATCH_SIZE === 0 || i === todo.length - 1) {
    saveResume();
    const pct = Math.round((i + 1) / todo.length * 100);
    const batchNum = Math.ceil((i + 1) / BATCH_SIZE);
    const lastBatchNames = todo
      .slice(Math.max(0, i - BATCH_SIZE + 1), i + 1)
      .filter(t => newPhotos[t.name])
      .slice(0, 5)
      .map(t => t.name);
    console.log(`Batch ${batchNum} (${i + 1}/${todo.length}, ${pct}%) | +new: ${Object.keys(newPhotos).length} | verified: ${verified} | failed: ${failed}`);
    console.log(`  Sample: ${lastBatchNames.join(', ')}`);
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Fetch complete.`);
console.log(`  API calls made:  ${fetched}`);
console.log(`  Verified good:   ${verified}`);
console.log(`  Failed/no photo: ${failed}`);
console.log(`  From resume:     ${skipped}`);

// ── Merge and write photoCache.js ─────────────────────────────────────────────
const merged = { ...existingPhotos, ...newPhotos };
const oldCount = Object.keys(existingPhotos).length;
const newCount = Object.keys(merged).length;

const lines = [
  `// Auto-generated by scripts/expandPhotos.mjs — DO NOT EDIT MANUALLY`,
  `// Last expanded: ${new Date().toISOString()}`,
  `// ${newCount} bundled photos — verified against iNaturalist taxa API (animals only)`,
  ``,
  `export const BUNDLED_PHOTOS = {`,
];

for (const [name, photo] of Object.entries(merged)) {
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(photo)},`);
}
lines.push(`};`);
lines.push(``);

writeFileSync(OUT, lines.join('\n'), 'utf8');

console.log(`\n✅  photoCache.js updated`);
console.log(`   Old count: ${oldCount}`);
console.log(`   New count: ${newCount}`);
console.log(`   Added:     +${newCount - oldCount}`);
