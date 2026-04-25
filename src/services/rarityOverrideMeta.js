/**
 * rarityOverrideMeta.js — curation metadata for the rarity override tables.
 *
 * The RARITY_OVERRIDES tables in scripts/buildWildlifeCache.js and
 * src/services/apiService.js encode park-specific tier corrections that
 * bypass the data-driven pipeline. They're a feature when the data is
 * undersampled (iNat undercounts bison) but a bug when reality changes:
 *
 *   - 1994 wolf reintroduction at Yellowstone
 *   - 2010s Burmese python invasion at Everglades
 *   - White-nose-syndrome bat collapses across Appalachia
 *
 * Without forced curation, a 1994 override saying "0% wolves at Yellowstone"
 * would still be live in 2026, masking a real ecological change.
 *
 * The discipline:
 *   1. Bump OVERRIDES_REVIEWED_AT below whenever you do a curation pass on
 *      either RARITY_OVERRIDES table. Use today's date in YYYY-MM-DD form.
 *   2. The weekly-rebuild workflow runs `scripts/checkOverrideExpiry.js`
 *      before fetching — if review is older than OVERRIDES_EXPIRY_MONTHS,
 *      the build fails with a curation prompt.
 *   3. Per-park exemptions can be added to OVERRIDES_REVIEWED_AT_BY_PARK
 *      when a single park gets a partial review (e.g. you re-checked
 *      Yellowstone wolves but didn't touch the rest).
 *
 * To "renew" the global review date: review every entry in both
 * RARITY_OVERRIDES tables, fix anything stale, then bump the date.
 */

/** Date of the last full curation pass over RARITY_OVERRIDES (YYYY-MM-DD). */
export const OVERRIDES_REVIEWED_AT = '2026-04-24';

/** Maximum age before scripts/checkOverrideExpiry.js fails the build. */
export const OVERRIDES_EXPIRY_MONTHS = 24;

/**
 * Per-park overrides for OVERRIDES_REVIEWED_AT.
 *
 * Use this when you've re-reviewed a single park's overrides outside of a
 * full curation pass. Park IDs match the keys in RARITY_OVERRIDES.
 *
 * Example:
 *   yellowstone: '2027-06-01',  // re-checked wolf rarity after pack count update
 */
export const OVERRIDES_REVIEWED_AT_BY_PARK = {
  // (empty — use as needed)
};

/** Compute days between two YYYY-MM-DD dates. Negative if `b` is older. */
export function daysSince(date) {
  const then = new Date(date).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

/** Effective review date for a given park id, falling back to the global date. */
export function effectiveReviewedAt(parkId) {
  return OVERRIDES_REVIEWED_AT_BY_PARK[parkId] ?? OVERRIDES_REVIEWED_AT;
}

/** True if a park's overrides are past the expiry window. */
export function isExpired(parkId) {
  const reviewedAt = effectiveReviewedAt(parkId);
  const ageDays = daysSince(reviewedAt);
  const limitDays = OVERRIDES_EXPIRY_MONTHS * 30;  // approx — close enough for an annual gate
  return ageDays > limitDays;
}
