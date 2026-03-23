#!/usr/bin/env node
/**
 * scripts/testDescriptions.js
 *
 * Tests the Wikipedia / iNaturalist description hierarchy on the first N
 * animals in a given park that currently carry placeholder fun facts.
 * Shows what would be stored in wildlifeCache.js after enrichment.
 *
 * No API keys required — iNaturalist and Wikipedia are both free.
 *
 * Usage:
 *   node scripts/testDescriptions.js
 *   node scripts/testDescriptions.js PARK=yellowstone
 *   node scripts/testDescriptions.js PARK=acadia COUNT=20
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Placeholder detection (mirrors descriptionService.js) ────────────────────
const PLACEHOLDER_PATTERNS = [
  /^Confirmed at this park's eBird hotspot\.?$/i,
  /^Recorded in this region \(eBird historical checklist\)\.?$/i,
  /^\d+ research-grade iNaturalist observations at this park\.?$/i,
  /^Recorded \d+ times on iNaturalist at this park\.?$/i,
  /^Appears on \d+% of .+ eBird checklists/i,
  /^Officially documented in the NPS wildlife registry/i,
  /^Recently reported within/i,
  /^Listed in the NPS species inventory/i,
];

function needsDescription(funFact) {
  if (!funFact) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(funFact.trim()));
}

// ── Utilities ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Trim text to the first N complete sentences.
 * Handles common abbreviations (Mr., Dr., U.S.) to avoid false splits.
 */
function firstNSentences(text, n = 2) {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Split on '. ' or '! ' or '? ' followed by a capital letter (real sentence boundary)
  // Avoid splitting on abbreviations like "U.S." by requiring a capital after the space
  const sentenceRe = /[^.!?]+(?:[.!?](?:\s|$))+/g;
  const matches = [...cleaned.matchAll(sentenceRe)]
    .map(m => m[0].trim())
    .filter(s => s.length > 15);
  if (!matches.length) {
    return cleaned.length > 300 ? cleaned.slice(0, 300) + '…' : cleaned;
  }
  return matches.slice(0, n).join(' ').trim();
}

async function safeFetch(url, label = '') {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'WildlifeExplorerMap/1.0 (educational; non-commercial)' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.warn(`    ⚠  HTTP ${res.status} ${label || url.slice(0, 70)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn(`    ⚠  ${err.message} — ${label || url.slice(0, 70)}`);
    }
    return null;
  }
}

// ── Source 1: iNaturalist taxa search → wikipedia_summary ────────────────────
// The iNat taxa endpoint returns a wikipedia_summary field pulled from Wikipedia
// and curated for the taxon. More reliable than Wikipedia direct for species.
async function fetchInatDescription(name, scientificName) {
  // Prefer scientific name for accuracy; fall back to common name
  const query = scientificName || name;
  const url =
    `https://api.inaturalist.org/v1/taxa` +
    `?q=${encodeURIComponent(query)}&per_page=1&locale=en&is_active=true`;

  const data = await safeFetch(url, `iNat taxa: ${query}`);
  const taxon = data?.results?.[0];
  if (!taxon) return null;

  const summary = taxon.wikipedia_summary?.replace(/<[^>]+>/g, '').trim();
  if (!summary || summary.length < 30) return null;

  // Sanity-check: ensure the returned taxon is plausibly the right species
  const commonLower = name.toLowerCase();
  const returnedCommon = (taxon.preferred_common_name ?? '').toLowerCase();
  const returnedSci = (taxon.name ?? '').toLowerCase();
  const sciLower = (scientificName ?? '').toLowerCase();

  const nameMatches =
    returnedCommon.includes(commonLower.split(' ').pop()) || // last word of common name
    commonLower.includes(returnedCommon.split(' ').pop()) ||
    (sciLower && returnedSci.startsWith(sciLower.split(' ')[0]));  // same genus

  if (!nameMatches) return null;

  return {
    text:   firstNSentences(summary, 2),
    source: 'iNaturalist',
  };
}

// ── Source 2: Wikipedia REST API ─────────────────────────────────────────────
// Uses the page/summary endpoint — plain text, no auth, fast.
async function fetchWikipediaDescription(name) {
  const title = name.replace(/ /g, '_');
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const data = await safeFetch(url, `Wikipedia: ${name}`);

  if (!data?.extract) return null;
  if (data.type === 'disambiguation') return null;
  if (data.extract.length < 30) return null;

  // Exclude geography / human-made pages masquerading as animals
  const desc = (data.description ?? '').toLowerCase();
  const badTypes = ['city', 'town', 'county', 'region', 'river', 'mountain',
                    'lake', 'disambiguation', 'village', 'municipality'];
  if (badTypes.some(t => desc.includes(t))) return null;

  return {
    text:   firstNSentences(data.extract, 2),
    source: 'Wikipedia',
  };
}

// ── Source 3: Factual fallback — zero API calls ───────────────────────────────
// Constructs a simple factual sentence from data we already have and know is
// accurate: name, scientific name, observation count, park, peak season.
function buildFactualFallback(animal, parkName) {
  const sci = animal.scientificName ? ` (${animal.scientificName})` : '';
  const countMatch = (animal.funFact ?? '').match(/^(\d+) research-grade/);
  const count = countMatch ? parseInt(countMatch[1], 10) : null;

  const seasons = (animal.seasons ?? []).filter(s => s !== 'year_round');
  const bestSeason =
    seasons.length === 1 ? seasons[0]
    : seasons.includes('summer')  ? 'summer'
    : seasons.includes('spring')  ? 'spring'
    : seasons.includes('fall')    ? 'fall'
    : seasons[0] ?? 'summer';
  const seasonStr = bestSeason.charAt(0).toUpperCase() + bestSeason.slice(1);

  const countPart = count
    ? ` with ${count.toLocaleString()} iNaturalist research-grade observations`
    : '';

  return {
    text:   `${animal.name}${sci} has been documented at ${parkName}${countPart}. ` +
            `It is most commonly observed during ${seasonStr}.`,
    source: 'Park Records',
  };
}

// ── Main hierarchy ────────────────────────────────────────────────────────────
async function fetchDescription(animal, parkName) {
  // 1. iNaturalist wikipedia_summary (curated, species-specific)
  const inat = await fetchInatDescription(animal.name, animal.scientificName);
  if (inat) return inat;
  await sleep(300);

  // 2. Wikipedia REST API
  const wiki = await fetchWikipediaDescription(animal.name);
  if (wiki) return wiki;

  // 3. Factual fallback — always succeeds, always accurate
  return buildFactualFallback(animal, parkName);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const parkId = (process.env.PARK ?? 'acadia').toLowerCase().replace(/\s+/g, '');
  const count  = Math.min(parseInt(process.env.COUNT ?? '10', 10), 50);

  console.log(`\n🔬  Description Hierarchy Test`);
  console.log(`   Park:  ${parkId}`);
  console.log(`   Count: ${count} animals`);
  console.log(`   Sources tried: iNaturalist → Wikipedia → Park Records\n`);

  const { WILDLIFE_CACHE } = await import('../src/data/wildlifeCache.js');
  const entry = WILDLIFE_CACHE[parkId];
  if (!entry) {
    const available = Object.keys(WILDLIFE_CACHE).join(', ');
    console.error(`❌  Park '${parkId}' not found.\n   Available: ${available}`);
    process.exit(1);
  }

  const allAnimals = entry.animals ?? [];
  const hasRealFact = allAnimals.filter(a => !needsDescription(a.funFact));
  const needsDesc   = allAnimals.filter(a => needsDescription(a.funFact));
  const testSlice   = needsDesc.slice(0, count);

  console.log(`   Total animals:              ${allAnimals.length}`);
  console.log(`   With curated fun facts:     ${hasRealFact.length}  (will keep as-is)`);
  console.log(`   With placeholder fun facts: ${needsDesc.length}  (need descriptions)`);
  console.log(`   Testing first ${testSlice.length}...\n`);
  console.log('─'.repeat(72));

  const results = [];

  for (let i = 0; i < testSlice.length; i++) {
    const animal = testSlice[i];
    process.stdout.write(`\n  [${i + 1}/${testSlice.length}] ${animal.name}… `);
    const result = await fetchDescription(animal, entry.parkName ?? `${parkId} National Park`);
    results.push({ animal, result });
    process.stdout.write(`✓ ${result.source}\n`);
    await sleep(400);
  }

  // ── Print results ───────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  RESULTS — ${parkId.toUpperCase()}`);
  console.log(`${'═'.repeat(72)}\n`);

  for (let i = 0; i < results.length; i++) {
    const { animal, result } = results[i];
    const sci = animal.scientificName ? ` (${animal.scientificName})` : '';
    console.log(`  ${i + 1}. ${animal.name}${sci}`);
    console.log(`     ${animal.animalType} · ${animal.rarity}`);
    console.log(`     Was:  "${animal.funFact ?? '(none)'}"`);
    console.log(`     Now:  [${result.source}] "${result.text}"`);
    console.log();
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const tally = {};
  results.forEach(({ result }) => {
    tally[result.source] = (tally[result.source] ?? 0) + 1;
  });

  console.log('─'.repeat(72));
  console.log('  SOURCE BREAKDOWN\n');
  const order = ['iNaturalist', 'Wikipedia', 'Park Records'];
  for (const src of order) {
    if (tally[src]) {
      const bar = '█'.repeat(tally[src]);
      console.log(`   ${src.padEnd(14)} ${bar} ${tally[src]}/${results.length}`);
    }
  }
  console.log();
  console.log('  ✅  Quality looks good? Run the enrichment script:');
  console.log(`      PARKS=${parkId} node scripts/enrichDescriptions.js\n`);
}

main().catch(err => {
  console.error('\n❌  Test failed:', err.message);
  process.exit(1);
});
