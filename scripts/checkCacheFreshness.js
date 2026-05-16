#!/usr/bin/env node
/**
 * checkCacheFreshness.js — make a silently-broken rebuild pipeline visible.
 *
 * The weekly rebuild can fail in ways that don't surface anywhere (a shard
 * erroring, the merge job's PR fallback going unmerged, the cron getting
 * disabled by GitHub after repo inactivity). When that happens the cache
 * just quietly rots — no error, stale sighting odds, until someone notices
 * months later. This guard turns "stale" into a CI signal.
 *
 * Source of truth: WILDLIFE_CACHE_BUILT_AT, emitted by splitCache into the
 * generated wildlifeCachePrimary.js and re-exported by the loader. (It used
 * to be a hardcoded constant frozen at 2026-03-31 — so a freshness check
 * reading it would itself have been broken; that bug was fixed alongside
 * this script.)
 *
 * Bands (weekly cadence + generous slack):
 *   ≤ 21 days  → fresh, exit 0
 *   22–45 days → WARN (one or two rebuilds missed; surfaced, non-blocking)
 *   > 45 days  → FAIL exit 1 (pipeline is genuinely broken — investigate)
 *
 * Override the hard cap with CACHE_MAX_AGE_DAYS for one-off backfills.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const WARN_DAYS = 21;
const FAIL_DAYS = Number(process.env.CACHE_MAX_AGE_DAYS) || 45;

function main() {
  const primaryPath = path.join(ROOT, 'src', 'data', 'wildlifeCachePrimary.js');
  let builtAt = null;
  try {
    const src = readFileSync(primaryPath, 'utf8');
    const m = src.match(/export const WILDLIFE_CACHE_BUILT_AT = "([^"]+)";/);
    builtAt = m?.[1] ?? null;
  } catch (e) {
    console.error(`❌ Cannot read ${primaryPath}: ${e.message}`);
    process.exit(1);
  }

  if (!builtAt) {
    console.error('❌ WILDLIFE_CACHE_BUILT_AT not found in wildlifeCachePrimary.js — '
      + 'splitCache may not have run, or the export was removed.');
    process.exit(1);
  }

  const builtMs = Date.parse(builtAt);
  if (Number.isNaN(builtMs)) {
    console.error(`❌ WILDLIFE_CACHE_BUILT_AT is not a valid date: "${builtAt}"`);
    process.exit(1);
  }

  const ageDays = Math.floor((Date.now() - builtMs) / 86400000);
  const line = `Cache built ${builtAt} — ${ageDays} day(s) old `
    + `(warn > ${WARN_DAYS}, fail > ${FAIL_DAYS}).`;

  if (ageDays > FAIL_DAYS) {
    console.error(`❌ STALE CACHE: ${line}`);
    console.error('::error::Wildlife cache is badly out of date — the weekly '
      + 'rebuild pipeline is likely broken (failed shards, unmerged PR '
      + 'fallback, or a disabled cron). Investigate weekly-rebuild.yml.');
    process.exit(1);
  }
  if (ageDays > WARN_DAYS) {
    console.warn(`⚠  ${line}`);
    console.warn('::warning::Wildlife cache is older than a normal weekly '
      + 'cycle — one or more rebuilds may have been missed.');
    process.exit(0);
  }
  console.log(`✓ ${line}`);
  process.exit(0);
}

main();
