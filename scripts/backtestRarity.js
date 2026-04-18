#!/usr/bin/env node
/**
 * scripts/backtestRarity.js
 *
 * Backtest the current rarity predictions against reality. Pulls the last 90
 * days of iNaturalist research-grade observations per park, buckets them by
 * our predicted rarity tier, and measures how well each tier's claim matches
 * what visitors actually sighted.
 *
 * For every park + tier we report:
 *   expected_hit_rate  — midpoint of the tier's probability band
 *                        (guaranteed=95%, very_likely=75%, likely=45%, etc.)
 *   observed_hit_rate  — fraction of (species at that tier) that were actually
 *                        logged by any visitor in the last 90 days
 *   miscalibration     — observed - expected (positive = we underrate, negative = overrate)
 *
 * Parks with lots of iNat activity (Yosemite, Yellowstone, Great Smokies) give
 * the most signal. Low-traffic parks return noisy baselines; skip parks with
 * fewer than 200 total obs in the window.
 *
 * Usage:
 *   node scripts/backtestRarity.js
 *   PARKS=yosemite,yellowstone node scripts/backtestRarity.js
 *   DAYS=30 node scripts/backtestRarity.js
 *
 * Writes scripts/backtestRarity-results.json for downstream analysis.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(__dirname, 'backtestRarity-results.json');

const DAYS = Number(process.env.DAYS ?? 90);
const PARK_FILTER = process.env.PARKS ? new Set(process.env.PARKS.split(',').map(s => s.trim())) : null;
const MIN_OBS_FOR_SIGNAL = 200;

// Tier midpoint probabilities (mirrors thresholds in speciesMetadata.js).
const TIER_MIDPOINT = {
  guaranteed:  0.95,
  very_likely: 0.75,
  likely:      0.45,
  unlikely:    0.20,
  rare:        0.06,
  exceptional: 0.01,
};

// iNat place IDs — reuse the mapping from buildWildlifeCache.js
const INAT_PLACE_IDS_PATH = path.join(ROOT, 'scripts', 'buildWildlifeCache.js');

async function loadInatPlaceIds() {
  const src = await import(`file://${INAT_PLACE_IDS_PATH.replace(/\\/g, '/')}`).catch(() => null);
  // Build script doesn't export INAT_PLACE_IDS — fall back to scraping with a regex.
  const fs = await import('fs');
  const text = fs.readFileSync(INAT_PLACE_IDS_PATH, 'utf8');
  const match = text.match(/const INAT_PLACE_IDS = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('Could not locate INAT_PLACE_IDS in buildWildlifeCache.js');
  // Parse as JSON by stripping JS comments and trailing commas.
  const clean = match[1]
    .replace(/\/\/[^\n]*/g, '')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([a-zA-Z0-9_-]+)(\s*:)/g, '"$1"$2');
  return JSON.parse(clean);
}

async function fetchRecentObs(placeId, days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  const since = d.toISOString().slice(0, 10);
  const all = new Set();
  let page = 1;
  for (;;) {
    const url =
      `https://api.inaturalist.org/v1/observations?` +
      `place_id=${placeId}&quality_grade=research&iconic_taxa=Aves,Mammalia,Reptilia,Amphibia,Actinopterygii,Insecta` +
      `&d1=${since}&per_page=200&page=${page}&order=desc&order_by=observed_on`;
    const res = await fetch(url, { headers: { 'User-Agent': 'wildlife-map-backtest/1.0' } });
    if (!res.ok) break;
    const data = await res.json();
    const results = data?.results ?? [];
    if (!results.length) break;
    for (const o of results) {
      const name = o?.taxon?.preferred_common_name ?? o?.taxon?.name;
      if (name) all.add(name);
    }
    if (results.length < 200 || page >= 10) break;
    page++;
    await new Promise(r => setTimeout(r, 250));
  }
  return all;
}

async function main() {
  const cacheMod = await import('../src/data/wildlifeCache.js');
  const cache = cacheMod.WILDLIFE_CACHE;
  const placeIds = await loadInatPlaceIds();

  const parkIds = Object.keys(cache)
    .filter(id => placeIds[id])
    .filter(id => !PARK_FILTER || PARK_FILTER.has(id));

  console.log(`🔬 Backtesting ${parkIds.length} parks over last ${DAYS} days…\n`);

  const parkResults = {};
  const globalByTier = {};

  for (const parkId of parkIds) {
    const animals = cache[parkId].animals;
    console.log(`  [${parkId}] ${animals.length} animals — fetching recent iNat obs…`);

    let observed;
    try {
      observed = await fetchRecentObs(placeIds[parkId], DAYS);
    } catch (err) {
      console.log(`    ⚠  fetch failed: ${err.message}`);
      continue;
    }

    if (observed.size < MIN_OBS_FOR_SIGNAL / 5) {
      console.log(`    • skipping (only ${observed.size} unique species observed — too thin)`);
      continue;
    }

    const byTier = {};
    for (const a of animals) {
      const tier = a.rarity;
      if (!byTier[tier]) byTier[tier] = { total: 0, observed: 0 };
      byTier[tier].total++;
      if (observed.has(a.name)) byTier[tier].observed++;
    }

    const tierStats = {};
    for (const [tier, v] of Object.entries(byTier)) {
      const observedRate = v.total ? v.observed / v.total : 0;
      const expected = TIER_MIDPOINT[tier] ?? 0;
      tierStats[tier] = {
        total: v.total,
        observed: v.observed,
        observed_rate: Number(observedRate.toFixed(3)),
        expected_rate: expected,
        miscalibration: Number((observedRate - expected).toFixed(3)),
      };

      if (!globalByTier[tier]) globalByTier[tier] = { total: 0, observed: 0 };
      globalByTier[tier].total    += v.total;
      globalByTier[tier].observed += v.observed;
    }

    parkResults[parkId] = {
      inat_species_observed: observed.size,
      tiers: tierStats,
    };

    console.log(`    ✓ ${observed.size} species observed → computed tier stats`);
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n📈 GLOBAL miscalibration per tier');
  console.log('   (negative = we overrate | positive = we underrate)\n');
  console.log('   tier           total   obs   observed%   expected%   delta');
  const tierOrder = ['guaranteed', 'very_likely', 'likely', 'unlikely', 'rare', 'exceptional'];
  const globalSummary = {};
  for (const tier of tierOrder) {
    const v = globalByTier[tier];
    if (!v) continue;
    const observedRate = v.total ? v.observed / v.total : 0;
    const expected = TIER_MIDPOINT[tier];
    const delta = observedRate - expected;
    globalSummary[tier] = {
      total: v.total,
      observed: v.observed,
      observed_rate: Number(observedRate.toFixed(3)),
      expected_rate: expected,
      miscalibration: Number(delta.toFixed(3)),
    };
    console.log(
      `   ${tier.padEnd(12)} ${String(v.total).padStart(6)}  ${String(v.observed).padStart(5)}  ` +
      `${(observedRate * 100).toFixed(1).padStart(7)}%   ${(expected * 100).toFixed(0).padStart(6)}%   ` +
      `${(delta * 100).toFixed(1).padStart(6)}%`
    );
  }

  writeFileSync(OUT_PATH, JSON.stringify({
    built: new Date().toISOString(),
    window_days: DAYS,
    parks: parkResults,
    global: globalSummary,
  }, null, 2), 'utf8');

  console.log(`\n✅ Wrote ${OUT_PATH}`);
  console.log('   Use this to recalibrate tier thresholds in speciesMetadata.js.');
}

main().catch(err => { console.error(err); process.exit(1); });
