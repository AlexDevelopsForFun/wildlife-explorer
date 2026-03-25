#!/usr/bin/env node
/**
 * scripts/improveDescriptions.js
 *
 * Targeted second-pass improvement for all animals that received the
 * "Park Records" fallback description ("officially documented in the
 * species inventory for…").
 *
 * Strategy (per animal, in priority order):
 *   1. Wikipedia by scientificName  ← new; enrichDescriptions never tried this
 *   2. Wikipedia by common name
 *   3. Factual template built from verified cache data — always 100% accurate
 *
 * Results are cached in scripts/improve-cache.json (keyed by scientificName)
 * so the script is resumable and reuse descriptions across parks.
 *
 * Usage:
 *   node scripts/improveDescriptions.js           # all 3,896 Park Records animals
 *   DRY_RUN=1 node scripts/improveDescriptions.js # preview without writing
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT           = path.resolve(__dirname, '..');
const CACHE_PATH     = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const IMPROVE_CACHE  = path.join(__dirname, 'improve-cache.json');

const DRY_RUN = process.env.DRY_RUN === '1';
const sleep   = ms => new Promise(r => setTimeout(r, ms));

// ── Wikipedia fetch ────────────────────────────────────────────────────────────
function firstNSentences(text, n = 2) {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentenceRe = /[^.!?]+(?:[.!?](?:\s|$))+/g;
  const matches = [...cleaned.matchAll(sentenceRe)]
    .map(m => m[0].trim())
    .filter(s => s.length > 15);
  if (!matches.length) return cleaned.length > 300 ? cleaned.slice(0, 300) + '…' : cleaned;
  return matches.slice(0, n).join(' ').trim();
}

async function fetchWikipedia(name) {
  if (!name?.trim()) return null;
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildlifeExplorerMap/1.0 (educational; non-commercial)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.extract || data.type === 'disambiguation' || data.extract.length < 30) return null;
    const desc = (data.description ?? '').toLowerCase();
    const badTypes = ['city', 'town', 'county', 'region', 'river', 'mountain',
                      'lake', 'disambiguation', 'village', 'municipality',
                      'album', 'film', 'song', 'novel', 'television', 'game'];
    if (badTypes.some(t => desc.includes(t))) return null;
    const text = firstNSentences(data.extract, 2);
    if (!text) return null;
    return text;
  } catch { return null; }
}

// ── Factual template ──────────────────────────────────────────────────────────
const RARITY_PHRASES = {
  guaranteed:   'guaranteed to be encountered',
  very_likely:  'very likely to be seen',
  likely:       'likely to be seen',
  unlikely:     'occasionally seen',
  rare:         'rarely seen',
  exceptional:  'exceptionally rarely seen',
};

const MIGRATION_SENTENCES = {
  partial:       'It is a summer breeder that migrates south for winter.',
  winter_visitor:'It is a winter visitor that arrives from the north in fall.',
  migratory:     'It passes through during spring and fall migration.',
};

function seasonPhrase(seasons) {
  if (!seasons?.length) return 'year round';
  const s = seasons.filter(x => x !== 'year_round');
  if (!s.length || seasons.includes('year_round')) return 'year round';
  const labels = { spring: 'spring', summer: 'summer', fall: 'fall', winter: 'winter' };
  const ordered = ['spring', 'summer', 'fall', 'winter'].filter(x => s.includes(x)).map(x => labels[x]);
  if (ordered.length === 1) return ordered[0];
  if (ordered.length === 2) return ordered.join(' and ');
  if (ordered[0] === 'spring' && ordered[ordered.length - 1] === 'fall' && !s.includes('winter'))
    return 'spring through fall';
  return ordered.slice(0, -1).join(', ') + ', and ' + ordered[ordered.length - 1];
}

// Parks with genuine ocean/saltwater access — "marine species" is valid here
const COASTAL_PARKS = new Set([
  'acadia','biscayne','drytortugas','channelislands','redwood','olympic',
  'everglades','kenaifjords','glacierbay','katmai','wrangellstelias',
  'lakeclark','gatesofthearctic','kobukvalley','haleakala','hawaiivolcanoes',
  'americansamoa','virginislands','canaveral','cuyahoga','paddlefish',
  'pointreyes','cabrillo','assateague','capecodseashore','firestoneisland',
]);

const TYPE_LABELS = {
  bird: 'bird', mammal: 'mammal', reptile: 'reptile',
  amphibian: 'amphibian', insect: 'insect',
  // marine: resolved dynamically in buildFactualTemplate
};

function buildFactualTemplate(animal, parkName, parkId) {
  let typeLabel;
  if (animal.animalType === 'marine') {
    typeLabel = COASTAL_PARKS.has(parkId) ? 'marine species' : 'aquatic species';
  } else {
    typeLabel = TYPE_LABELS[animal.animalType] ?? 'species';
  }
  const article = /^[aeiou]/i.test(typeLabel) ? 'an' : 'a';
  const rarityPhrase = RARITY_PHRASES[animal.rarity] ?? 'recorded';
  const season = seasonPhrase(animal.seasons);
  const sciPart = animal.scientificName ? ` (${animal.scientificName})` : '';
  const migSentence = (animal.animalType === 'bird' && MIGRATION_SENTENCES[animal.migrationStatus]) || '';

  let text = `The ${animal.name}${sciPart} is ${article} ${typeLabel} found at ${parkName}.`;
  text += season === 'year round'
    ? ` It is ${rarityPhrase} here year round.`
    : ` It is ${rarityPhrase} here, most commonly during ${season}.`;
  if (migSentence) text += ' ' + migSentence;
  return text;
}

// ── Cache helpers ──────────────────────────────────────────────────────────────
function loadCache() {
  if (!existsSync(IMPROVE_CACHE)) return {};
  try { return JSON.parse(readFileSync(IMPROVE_CACHE, 'utf8')); } catch { return {}; }
}
function saveCache(cache) {
  writeFileSync(IMPROVE_CACHE, JSON.stringify(cache, null, 2), 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔧  Description Improvement Script');
  console.log(`   Target:  animals with "Park Records" descriptions`);
  console.log(`   Dry run: ${DRY_RUN ? 'YES — no files will be written' : 'no'}\n`);

  const { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } = await import('../src/data/wildlifeCache.js');
  const { wildlifeLocations } = await import('../src/wildlifeData.js');
  const parkNames = Object.fromEntries(wildlifeLocations.map(l => [l.id, l.name]));
  const improveCache = loadCache();

  // Collect all Park Records animals (before modifying)
  let totalBefore = 0, totalWiki = 0, totalTemplate = 0, totalCacheHit = 0;
  const wikiExamples   = [];  // up to 5 animals that got Wikipedia
  const tmplExamples   = [];  // up to 5 animals that got factual template

  let fetchCount = 0;

  for (const [parkId, entry] of Object.entries(WILDLIFE_CACHE)) {
    const animals = entry?.animals ?? [];
    const parkName = parkNames[parkId] ?? `${parkId.charAt(0).toUpperCase() + parkId.slice(1)} National Park`;
    const toImprove = animals.filter(a => a.descriptionSource === 'Park Records');

    if (toImprove.length === 0) continue;

    process.stdout.write(`  [${parkId}] ${toImprove.length} to improve…`);
    let parkWiki = 0, parkTemplate = 0, parkCacheHit = 0;

    for (const animal of toImprove) {
      totalBefore++;
      const cacheKey = animal.scientificName || animal.name;
      const beforeDesc = animal.description;

      // Cache hit — same species already resolved this run
      if (improveCache[cacheKey]) {
        const cached = improveCache[cacheKey];
        animal.description = cached.source === 'factual_template'
          ? buildFactualTemplate(animal, parkName, parkId)  // regenerate with correct park
          : cached.text;
        animal.descriptionSource = cached.source === 'factual_template' ? 'Park Records' : 'Wikipedia';
        if (cached.source !== 'factual_template') { totalWiki++; parkCacheHit++; }
        else { totalTemplate++; }
        totalCacheHit++;
        continue;
      }

      // Try Wikipedia by scientificName first
      let wikiText = null;
      if (animal.scientificName) {
        wikiText = await fetchWikipedia(animal.scientificName);
        if (wikiText) await sleep(300);
      }

      // Try Wikipedia by common name
      if (!wikiText) {
        await sleep(300);
        wikiText = await fetchWikipedia(animal.name);
      }

      fetchCount++;

      if (wikiText) {
        animal.description = wikiText;
        animal.descriptionSource = 'Wikipedia';
        improveCache[cacheKey] = { text: wikiText, source: 'Wikipedia' };
        totalWiki++; parkWiki++;
        if (wikiExamples.length < 5)
          wikiExamples.push({ park: parkId, name: animal.name, before: beforeDesc, after: wikiText });
      } else {
        // Factual template
        const text = buildFactualTemplate(animal, parkName, parkId);
        animal.description = text;
        animal.descriptionSource = 'Park Records';
        improveCache[cacheKey] = { source: 'factual_template' };
        totalTemplate++; parkTemplate++;
        if (tmplExamples.length < 5)
          tmplExamples.push({ park: parkId, name: animal.name, before: beforeDesc, after: text });
      }

      // Save cache every 25 new fetches
      if (!DRY_RUN && fetchCount % 25 === 0) saveCache(improveCache);
      if (fetchCount % 25 === 0) await sleep(100); // brief pause every 25
    }

    console.log(` ✓ wiki:${parkWiki + parkCacheHit} template:${parkTemplate}`);
  }

  if (!DRY_RUN) saveCache(improveCache);

  // ── Write updated cache ──────────────────────────────────────────────────────
  const totalSpecies = Object.values(WILDLIFE_CACHE)
    .reduce((s, v) => s + (v.animals?.length ?? 0), 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${WILDLIFE_CACHE_BUILT_AT}`,
    `// Descriptions enriched: ${new Date().toISOString()}`,
    `// Parks: ${Object.keys(WILDLIFE_CACHE).length} | Species bundled: ${totalSpecies}`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(WILDLIFE_CACHE_BUILT_AT)};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];
  for (const [id, val] of Object.entries(WILDLIFE_CACHE)) {
    lines.push(`  ${JSON.stringify(id)}: {`);
    lines.push(`    "builtAt": ${JSON.stringify(val.builtAt)},`);
    lines.push(`    "animals": ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }
  lines.push(`};`);
  lines.push(``);

  console.log(`\n📊  Summary`);
  console.log(`   Park Records before:    ${totalBefore}`);
  console.log(`   → Wikipedia (new):      ${totalWiki - totalCacheHit + Math.floor(totalCacheHit * (totalWiki / (totalWiki + totalTemplate) || 0))} (est.)`);
  console.log(`   → Wikipedia total:      ${totalWiki}`);
  console.log(`   → Factual template:     ${totalTemplate}`);
  console.log(`   Cache hits (reused):    ${totalCacheHit}`);
  console.log(`   New fetches made:       ${fetchCount}`);

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no files written\n');
  } else {
    writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
    console.log(`\n✅  Written to ${CACHE_PATH}\n`);
  }

  // ── Show before/after examples ─────────────────────────────────────────────
  console.log(`\n📝  Wikipedia upgrades (${wikiExamples.length} shown):`);
  wikiExamples.forEach((e, i) => {
    console.log(`\n  ${i+1}. [${e.park}] ${e.name}`);
    console.log(`     BEFORE: ${e.before}`);
    console.log(`     AFTER:  ${e.after}`);
  });
  console.log(`\n📝  Factual template examples (${tmplExamples.length} shown):`);
  tmplExamples.forEach((e, i) => {
    console.log(`\n  ${i+1}. [${e.park}] ${e.name}`);
    console.log(`     BEFORE: ${e.before}`);
    console.log(`     AFTER:  ${e.after}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
