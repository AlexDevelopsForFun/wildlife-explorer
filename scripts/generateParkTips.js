#!/usr/bin/env node
/**
 * scripts/generateParkTips.js
 *
 * Generates park-specific visitor tips for the top animals at each park
 * using the Anthropic API (claude-sonnet-4-20250514).
 *
 * For each of the 63 parks:
 *   1. Sort animals by rarity tier (highest first), then charisma score
 *   2. Take the top 15
 *   3. Skip any with a curated Park Naturalist description
 *   4. Call Anthropic to generate a 1-2 sentence park-specific visitor tip
 *   5. Store as `parkTip` field on the animal entry in wildlifeCache.js
 *
 * Progress is saved to scripts/parkTips-cache.json after each park so the
 * script is fully resumable.
 *
 * Usage:
 *   node scripts/generateParkTips.js                   # all parks
 *   PARKS=acadia node scripts/generateParkTips.js      # one park
 *   PARKS=acadia,yellowstone node scripts/generateParkTips.js
 *   DRY_RUN=1 node scripts/generateParkTips.js         # preview only
 *
 * Requires ANTHROPIC_API_KEY in .env or environment.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const TIPS_CACHE_PATH = path.join(__dirname, 'parkTips-cache.json');

const DRY_RUN = process.env.DRY_RUN === '1';

// ── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
      if (match) {
        const [, key, val] = match;
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY && !DRY_RUN) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in .env or environment.');
  console.error('Add it to your .env file:  ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

// ── Placeholder detection (mirrors descriptionService.js) ────────────────────
const PLACEHOLDER_PATTERNS = [
  /^Confirmed at this park's eBird hotspot\.?$/i,
  /^Recorded in this region \(eBird historical checklist\)\.?$/i,
  /^\d+ research-grade iNaturalist observations at this park\.?$/i,
  /^Recorded \d+ times on iNaturalist at this park\.?$/i,
  /^Appears on \d+% of .+ eBird checklists/i,
  /^Verified in \d+ iNaturalist research-grade observations/i,
  /^Officially documented in the NPS wildlife registry/i,
  /^Recently reported within/i,
  /^Listed in the NPS species inventory/i,
];

function isCurated(funFact) {
  if (!funFact) return false;
  return !PLACEHOLDER_PATTERNS.some(p => p.test(funFact.trim()));
}

// ── Charisma scoring (mirrors App.jsx getCharismaScore) ──────────────────────
function getCharismaScore(name, animalType) {
  const n = (name ?? '').toLowerCase();
  if (/\b(california condor|florida panther|gray wolf|grizzly bear|brown bear|wolverine)\b/.test(n)) return 11;
  if (/\b(bison|buffalo|grizzly|bear|wolf|wolves|alligator|crocodile|moose|elk|wapiti|mountain lion|puma|cougar|jaguar|panther|wolverine|manatee|california condor|javelina|peccary)\b/.test(n)) return 10;
  if (/\b(manatee|whale|dolphin|orca|shark|sea lion|walrus|sea otter|steller)\b/.test(n)) return 9;
  if (/\b(bald eagle|golden eagle|eagle|condor|peregrine|falcon|osprey|roadrunner)\b/.test(n)) return 9;
  if (/\b(hawk|owl|vulture|kite|harrier|merlin|kestrel|quail|gambel|gila woodpecker|cactus wren)\b/.test(n)) return 8;
  if (/\b(puffin|flamingo|spoonbill|whooping crane|sandhill crane|roseate|pelican|frigate|booby)\b/.test(n)) return 8;
  if (/\b(seal|harbor seal|grey seal|fur seal|sea turtle|leatherback|loggerhead)\b/.test(n)) return 8;
  if (/\b(fox|coyote|bobcat|lynx|otter|beaver|pronghorn|bighorn|mountain goat|caribou|muskox|bison|deer|elk|moose)\b/.test(n)) return 7;
  if (/\b(rattlesnake|boa|python|king snake|milk snake|gopher snake|coral snake)\b/.test(n)) return 7;
  if (/\b(heron|egret|ibis|stork|loon|puffin|cormorant|gannet|anhinga)\b/.test(n)) return 7;
  if (animalType === 'marine') return 7;
  if (animalType === 'mammal') return 6;
  if (animalType === 'reptile' || animalType === 'amphibian') return 6;
  if (animalType === 'bird') return 5;
  if (animalType === 'insect') return 3;
  return 4;
}

// ── Rarity helpers ───────────────────────────────────────────────────────────
const RARITY_ORDER = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
const RARITY_PCT = { guaranteed: 92, very_likely: 70, likely: 40, unlikely: 15, rare: 4, exceptional: 1 };
const RARITY_LABEL = { guaranteed: 'Guaranteed', very_likely: 'Very Likely', likely: 'Likely', unlikely: 'Unlikely', rare: 'Rare', exceptional: 'Exceptional' };

function animalSortFn(a, b) {
  // Primary: rarity tier (guaranteed first)
  const rd = (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5);
  if (rd !== 0) return rd;
  // Secondary: charisma score descending
  return getCharismaScore(b.name, b.animalType) - getCharismaScore(a.name, a.animalType);
}

// ── Tips cache (resume support) ──────────────────────────────────────────────
function loadTipsCache() {
  if (existsSync(TIPS_CACHE_PATH)) {
    try {
      return JSON.parse(readFileSync(TIPS_CACHE_PATH, 'utf8'));
    } catch { return {}; }
  }
  return {};
}

function saveTipsCache(cache) {
  writeFileSync(TIPS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

// ── Load wildlife cache ──────────────────────────────────────────────────────
async function loadWildlifeCache() {
  const mod = await import('../src/data/wildlifeCache.js');
  return mod.WILDLIFE_CACHE;
}

// ── Load location names from wildlifeData.js ─────────────────────────────────
async function loadLocationMap() {
  const mod = await import('../src/wildlifeData.js');
  const locations = mod.wildlifeLocations ?? mod.default?.wildlifeLocations ?? [];
  const map = {};
  for (const loc of locations) {
    map[loc.id] = { name: loc.name, state: loc.state };
  }
  return map;
}

// ── Anthropic API call ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a national park naturalist writing a 1-2 sentence visitor tip about seeing a specific animal at a specific park. Include: where in the park to look, what time of day is best, and any specific trails, roads, or areas. Be specific to THIS park — do not give generic advice. Write in present tense. Do not start with the animal name. Do not make up specific trail names or locations you are not confident about — instead reference general habitat areas like "along the main park road" or "near the visitor center meadows" or "at the shore near the lighthouse area."`;

async function generateTip(client, animal, parkName, state) {
  const seasons = (animal.seasons ?? []).join(', ') || 'year-round';
  const migration = animal.migrationStatus ?? 'unknown';
  const rarityLabel = RARITY_LABEL[animal.rarity] ?? animal.rarity;
  const pct = RARITY_PCT[animal.rarity] ?? '?';

  const userPrompt = `Animal: ${animal.name} (${animal.scientificName ?? 'unknown'}). Park: ${parkName}, ${state}. Rarity: ${rarityLabel} (${pct}% chance of seeing). Seasons present: ${seasons}. Migration status: ${migration}.`;

  if (DRY_RUN) {
    console.log(`    [DRY RUN] Would call API: ${animal.name}`);
    return `[DRY RUN TIP for ${animal.name} at ${parkName}]`;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content?.[0]?.text?.trim();
  return text || null;
}

// ── Write updated cache back to wildlifeCache.js ─────────────────────────────
function writeUpdatedCache(cache) {
  const parkIds = Object.keys(cache);
  const totalSpecies = Object.values(cache).reduce((s, v) => s + (v.animals?.length ?? 0), 0);

  const lines = [
    `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
    `// Built: ${new Date().toISOString()}`,
    `// Parks: ${parkIds.length} | Species bundled: ${totalSpecies}`,
    `// To regenerate: node scripts/buildWildlifeCache.js`,
    `// Bird rarity patched: 2026-04-05 via patchBirdRarity.js`,
    `// Park tips generated: ${new Date().toISOString().slice(0, 10)} via generateParkTips.js`,
    ``,
    `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(new Date().toISOString())};`,
    ``,
    `export const WILDLIFE_CACHE = {`,
  ];

  for (const [parkId, parkData] of Object.entries(cache)) {
    lines.push(`  ${JSON.stringify(parkId)}: {`);
    lines.push(`    builtAt: ${JSON.stringify(parkData.builtAt)},`);
    lines.push(`    animals: ${JSON.stringify(parkData.animals, null, 2).replace(/\n/g, '\n    ')},`);
    lines.push(`  },`);
  }

  lines.push(`};`);
  lines.push(``);

  writeFileSync(CACHE_PATH, lines.join('\n'), 'utf8');
  console.log(`\n  Wrote ${CACHE_PATH}`);
  console.log(`  Parks: ${parkIds.length} | Species: ${totalSpecies}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  === generateParkTips.js ===\n');

  const wildlifeCache = await loadWildlifeCache();
  const locationMap = await loadLocationMap();
  const tipsCache = loadTipsCache();

  const client = DRY_RUN ? null : new Anthropic({ apiKey: API_KEY });

  // Filter parks if PARKS env is set
  let parkIds = Object.keys(wildlifeCache);
  if (process.env.PARKS) {
    const wanted = new Set(process.env.PARKS.split(',').map(s => s.trim()));
    parkIds = parkIds.filter(id => wanted.has(id));
    console.log(`  Filtered to ${parkIds.length} parks: ${parkIds.join(', ')}`);
  }

  let totalGenerated = 0;
  let totalSkippedCurated = 0;
  let totalSkippedCached = 0;
  let totalErrors = 0;

  for (let pi = 0; pi < parkIds.length; pi++) {
    const parkId = parkIds[pi];
    const park = wildlifeCache[parkId];
    const locInfo = locationMap[parkId] ?? { name: parkId, state: 'US' };
    const animals = park.animals ?? [];

    console.log(`\n  [${pi + 1}/${parkIds.length}] ${locInfo.name} (${parkId}) — ${animals.length} animals`);

    // Sort by rarity tier then charisma, take top 15
    const sorted = [...animals].sort(animalSortFn);
    const top15 = sorted.slice(0, 15);

    let parkGenerated = 0;

    for (const animal of top15) {
      const cacheKey = `${parkId}::${animal.name}`;

      // Skip curated Park Naturalist entries
      if (isCurated(animal.funFact)) {
        totalSkippedCurated++;
        continue;
      }

      // Skip already cached tips
      if (tipsCache[cacheKey]) {
        totalSkippedCached++;
        // Apply cached tip to the animal entry
        const idx = animals.findIndex(a => a.name === animal.name);
        if (idx !== -1 && !animals[idx].parkTip) {
          animals[idx].parkTip = tipsCache[cacheKey];
        }
        continue;
      }

      // Generate tip
      try {
        const tip = await generateTip(client, animal, locInfo.name, locInfo.state);
        if (tip) {
          // Apply to cache entry
          const idx = animals.findIndex(a => a.name === animal.name);
          if (idx !== -1) {
            animals[idx].parkTip = tip;
          }

          // Save to resume cache
          tipsCache[cacheKey] = tip;
          totalGenerated++;
          parkGenerated++;
          console.log(`    ✅ ${animal.name} (${animal.rarity})`);
        } else {
          console.log(`    ⚠️  ${animal.name} — empty response`);
          totalErrors++;
        }
      } catch (err) {
        console.error(`    ❌ ${animal.name} — ${err.message}`);
        totalErrors++;
      }

      // 500ms delay between API calls
      if (!DRY_RUN) await new Promise(r => setTimeout(r, 500));
    }

    // Save tips cache after each park
    saveTipsCache(tipsCache);
    console.log(`    → ${parkGenerated} new tips generated for ${locInfo.name}`);
  }

  // Write updated wildlifeCache.js
  if (!DRY_RUN) {
    writeUpdatedCache(wildlifeCache);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n  ═══════════════════════════════════════════`);
  console.log(`  Total generated:       ${totalGenerated}`);
  console.log(`  Skipped (curated):     ${totalSkippedCurated}`);
  console.log(`  Skipped (cached):      ${totalSkippedCached}`);
  console.log(`  Errors:                ${totalErrors}`);
  console.log(`  Tips cache saved to:   ${TIPS_CACHE_PATH}`);
  console.log(`  ═══════════════════════════════════════════\n`);

  // ── Quality check: show 10 examples from 5 parks ──────────────────────
  console.log(`  ── QUALITY CHECK: 10 example tips ──\n`);
  const sampleParks = parkIds.slice(0, 5);
  let examples = 0;
  for (const pid of sampleParks) {
    const locInfo = locationMap[pid] ?? { name: pid };
    const park = wildlifeCache[pid];
    const tipped = (park.animals ?? []).filter(a => a.parkTip).slice(0, 2);
    for (const a of tipped) {
      examples++;
      const isGeneric = !a.parkTip.toLowerCase().includes(locInfo.name.toLowerCase().split(' ')[0]);
      const hasTrailName = /\b(trail|loop|path|point|overlook|junction)\b/i.test(a.parkTip) &&
                           !/\b(main park road|visitor center|general|along the|near the)\b/i.test(a.parkTip);
      console.log(`  ${examples}. [${locInfo.name}] ${a.name} (${a.rarity})`);
      console.log(`     "${a.parkTip}"`);
      if (isGeneric) console.log(`     ⚠️  FLAG: May be generic — doesn't mention park name`);
      if (hasTrailName) console.log(`     ⚠️  FLAG: May contain specific trail name (hallucination risk)`);
      console.log('');
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
