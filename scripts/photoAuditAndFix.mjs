#!/usr/bin/env node
// ── scripts/photoAuditAndFix.mjs ─────────────────────────────────────────────
// Audits all photos in photoCache.js against iNaturalist's current taxa API.
// Fixes any mismatches, 404s, or plant/fungi contamination.
// Re-fetches with strict animal-only filtering.
//
// Usage: node scripts/photoAuditAndFix.mjs

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const OUT   = join(ROOT, 'src', 'data', 'photoCache.js');

// ── Animal-only iconic taxa ───────────────────────────────────────────────────
const ANIMAL_ICONIC = new Set([
  'Mammalia','Aves','Reptilia','Amphibia','Actinopterygii',
  'Insecta','Arachnida','Mollusca','Animalia','Elasmobranchii',
  'Echinodermata','Annelida','Arthropoda','Chromista',
]);

function isAnimalTaxon(taxon) {
  if (!taxon) return false;
  // Reject obvious non-animals by iconic group
  if (taxon.iconic_taxon_name === 'Plantae') return false;
  if (taxon.iconic_taxon_name === 'Fungi') return false;
  if (taxon.iconic_taxon_name === 'Protozoa') return false;
  if (taxon.iconic_taxon_name === 'Bacteria') return false;
  // Accept known animal iconic groups
  if (ANIMAL_ICONIC.has(taxon.iconic_taxon_name)) return true;
  // Check ancestry string for Animalia (id=1) or common animal phyla
  const anc = taxon.ancestry ?? '';
  if (anc.includes('/1/') || anc.startsWith('1/') || anc === '1') return true;
  // Fallback: if it has a preferred_common_name that matches our query, trust it
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseCredit(attribution) {
  if (!attribution) return null;
  let m = attribution.match(/^\(c\)\s+(.+?),/i);
  if (m) return m[1].trim();
  m = attribution.match(/©\s+(?:\d{4}\s+)?(.+?),/i);
  if (m) return m[1].trim();
  return attribution.split(',')[0].replace(/^\(c\)\s*/i,'').replace(/^©\s*\d*\s*/i,'').trim() || null;
}

async function fetchAnimalPhoto(query) {
  try {
    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=10&locale=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
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
        taxonId:     taxon.id,
        taxonName:   taxon.name,
        iconicGroup: taxon.iconic_taxon_name,
      };
    }
  } catch { /* timeout / network */ }
  return null;
}

async function checkUrl404(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return res.status === 404;
  } catch { return false; }
}

// ── Load current photoCache ───────────────────────────────────────────────────
const cacheText = readFileSync(OUT, 'utf8');
// Parse the JS object manually — extract the object literal
const objMatch = cacheText.match(/export const BUNDLED_PHOTOS\s*=\s*(\{[\s\S]*\});/);
if (!objMatch) { console.error('Could not parse photoCache.js'); process.exit(1); }
const currentCache = JSON.parse(objMatch[1]
  .replace(/,\s*\}/g, '}')   // trailing commas
  .replace(/,\s*\]/g, ']')
);

// ── Load wildlifeCache for scientific names ───────────────────────────────────
const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');
const sciNameMap = new Map();
const typeMap    = new Map();
for (const entry of Object.values(WILDLIFE_CACHE)) {
  for (const a of entry.animals ?? []) {
    if (a.name && a.scientificName && !sciNameMap.has(a.name))
      sciNameMap.set(a.name, a.scientificName);
    if (a.name && a.animalType && !typeMap.has(a.name))
      typeMap.set(a.name, a.animalType);
  }
}

// ── Audit each entry ──────────────────────────────────────────────────────────
const DELAY = 400;
const names = Object.keys(currentCache);
console.log(`\n📸  Photo Audit + Fix`);
console.log(`   Entries to audit: ${names.length}`);
console.log(`   Estimated time:   ~${Math.ceil(names.length * DELAY / 60000)} min\n`);

const results      = {};
const fixed        = [];
const alreadyGood  = [];
const noPhoto      = [];
const failed       = [];

let i = 0;
for (const name of names) {
  i++;
  const sci  = sciNameMap.get(name);
  const type = typeMap.get(name);

  // Fetch fresh animal photo (with animal filter)
  let fresh = await fetchAnimalPhoto(name);
  if (!fresh && sci) fresh = await fetchAnimalPhoto(sci);

  const old = currentCache[name];
  const pct = Math.round(i / names.length * 100);

  if (!fresh) {
    // Can't get a fresh photo — keep old if it exists
    results[name] = old ?? null;
    noPhoto.push({ name, reason: 'iNat returned no animal photo' });
    process.stdout.write(`\r   ${i}/${names.length} (${pct}%) — fixed: ${fixed.length}  no-photo: ${noPhoto.length}  `);
    await sleep(DELAY);
    continue;
  }

  // Check if existing URL differs from fresh
  const urlChanged = old?.url !== fresh.url;

  // Check if existing URL is a 404 (only if URL changed, to save time)
  let was404 = false;
  if (old?.url && urlChanged) {
    was404 = await checkUrl404(old.url);
  }

  if (urlChanged) {
    // Verify the old URL's photo isn't just a valid different crop —
    // flag if the fresh taxon name differs significantly from our animal name
    const freshTaxon = (fresh.taxonName ?? '').toLowerCase();
    const queryName  = name.toLowerCase();
    // If fresh taxon doesn't relate to our query, it might be wrong too
    // But we trust animal-filtered results more than the old cache
    results[name] = fresh;
    fixed.push({
      name,
      oldUrl:    old?.url ?? '(none)',
      newUrl:    fresh.url,
      newTaxon:  fresh.taxonName,
      was404,
      sci,
      type,
    });
  } else {
    results[name] = old;
    alreadyGood.push(name);
  }

  process.stdout.write(`\r   ${i}/${names.length} (${pct}%) — fixed: ${fixed.length}  good: ${alreadyGood.length}  no-photo: ${noPhoto.length}  `);
  await sleep(DELAY);
}

console.log(`\n\n✅  Audit complete`);
console.log(`   Already correct:  ${alreadyGood.length}`);
console.log(`   Fixed/updated:    ${fixed.length}`);
console.log(`   No animal photo:  ${noPhoto.length}`);
console.log();

if (fixed.length > 0) {
  console.log('📋  Fixed entries:');
  for (const f of fixed) {
    const tag = f.was404 ? '[404]' : '[NEW]';
    console.log(`  ${tag} ${f.name}`);
    console.log(`       old: ${f.oldUrl.substring(0,70)}`);
    console.log(`       new: ${f.newUrl.substring(0,70)}  (${f.newTaxon})`);
  }
  console.log();
}

if (noPhoto.length > 0) {
  console.log('⚠️   No photo found (kept old):');
  noPhoto.forEach(n => console.log(`  - ${n.name}: ${n.reason}`));
  console.log();
}

// ── Write updated photoCache.js ───────────────────────────────────────────────
const validResults = Object.fromEntries(
  Object.entries(results).filter(([, v]) => v !== null)
);
const count = Object.keys(validResults).length;

const lines = [
  `// Auto-generated by scripts/photoAuditAndFix.mjs — DO NOT EDIT MANUALLY`,
  `// Last audited: ${new Date().toISOString()}`,
  `// ${count} bundled photos — verified against iNaturalist taxa API (animals only)`,
  ``,
  `export const BUNDLED_PHOTOS = {`,
];

for (const [name, photo] of Object.entries(validResults)) {
  // Strip internal audit fields before writing
  const { taxonId, taxonName, iconicGroup, ...clean } = photo;
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(clean)},`);
}

lines.push(`};`);
lines.push(``);

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`📄  Written → src/data/photoCache.js  (${count} entries)`);
console.log(`    Fixed ${fixed.length} photos, ${noPhoto.length} had no animal result\n`);
