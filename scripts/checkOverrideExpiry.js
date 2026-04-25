#!/usr/bin/env node
/**
 * scripts/checkOverrideExpiry.js
 *
 * CI guard: fails (exit 1) if the rarity-override curation date in
 * src/services/rarityOverrideMeta.js is older than OVERRIDES_EXPIRY_MONTHS.
 *
 * Why: the RARITY_OVERRIDES tables in scripts/buildWildlifeCache.js and
 * src/services/apiService.js encode hand-curated park-specific rarity tiers
 * that bypass the data-driven pipeline. Without forced periodic review, a
 * stale override silently masks real ecological change (the canonical
 * example: a 1994 override saying "0% wolves at Yellowstone" persisting
 * past the 1995 reintroduction).
 *
 * Wired into the weekly rebuild workflow as a pre-rebuild step so a stale
 * curation surfaces as a failed build, not as silently-bad pill estimates.
 *
 * Usage:
 *   node scripts/checkOverrideExpiry.js
 *
 * Exit codes:
 *   0  — review is fresh
 *   1  — review is past expiry (or any per-park override is stale)
 *
 * To "renew" the global review date: review every entry in both
 * RARITY_OVERRIDES tables (build script + apiService), fix anything stale,
 * then bump OVERRIDES_REVIEWED_AT to today's date.
 */

import {
  OVERRIDES_REVIEWED_AT,
  OVERRIDES_EXPIRY_MONTHS,
  OVERRIDES_REVIEWED_AT_BY_PARK,
  daysSince,
  effectiveReviewedAt,
  isExpired,
} from '../src/services/rarityOverrideMeta.js';

const limitDays = OVERRIDES_EXPIRY_MONTHS * 30;
const globalAgeDays = daysSince(OVERRIDES_REVIEWED_AT);
const globalExpired = globalAgeDays > limitDays;

console.log(`🩺 Rarity override curation check`);
console.log(`   Global reviewed:    ${OVERRIDES_REVIEWED_AT}`);
console.log(`   Global age:         ${globalAgeDays} days`);
console.log(`   Expiry threshold:   ${OVERRIDES_EXPIRY_MONTHS} months (${limitDays} days)`);

const expiredParks = Object.keys(OVERRIDES_REVIEWED_AT_BY_PARK).filter(p => isExpired(p));

if (Object.keys(OVERRIDES_REVIEWED_AT_BY_PARK).length > 0) {
  console.log(`\n   Per-park overrides:`);
  for (const parkId of Object.keys(OVERRIDES_REVIEWED_AT_BY_PARK).sort()) {
    const reviewedAt = effectiveReviewedAt(parkId);
    const age = daysSince(reviewedAt);
    const flag = isExpired(parkId) ? '⚠️ EXPIRED' : '✓ ok';
    console.log(`     ${parkId.padEnd(24)} ${reviewedAt}   (${age}d)  ${flag}`);
  }
}

if (globalExpired || expiredParks.length > 0) {
  console.error(`\n❌ Override curation is stale.`);
  if (globalExpired) {
    console.error(`   The global review date (${OVERRIDES_REVIEWED_AT}) is ${globalAgeDays - limitDays} days past expiry.`);
  }
  if (expiredParks.length > 0) {
    console.error(`   Expired per-park overrides: ${expiredParks.join(', ')}`);
  }
  console.error(`\n   To unblock:`);
  console.error(`     1. Review the RARITY_OVERRIDES tables in:`);
  console.error(`          • scripts/buildWildlifeCache.js`);
  console.error(`          • src/services/apiService.js`);
  console.error(`     2. Update or remove any entries that no longer match current ecology`);
  console.error(`        (recent reintroductions, invasions, die-offs, range shifts).`);
  console.error(`     3. Bump OVERRIDES_REVIEWED_AT in src/services/rarityOverrideMeta.js`);
  console.error(`        to today's date.\n`);
  process.exit(1);
}

console.log(`\n✅ Override curation is fresh.\n`);
