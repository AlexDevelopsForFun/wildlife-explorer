/**
 * wildlifeCacheLoader.js — Tiered cache loading for performance
 *
 * Three tiers:
 *   Primary   (15 most-visited parks)       — sync load, on critical path.
 *   Tier 2    (next 15 parks)                — async load on first idle callback.
 *   Tier 3    (remaining ~33 parks)          — async load on second idle or first search.
 *
 * Consumers still import { WILDLIFE_CACHE, isSecondaryLoaded, onSecondaryLoaded,
 * loadSecondaryCache } — the API is unchanged. "Secondary loaded" now means
 * BOTH tier-2 and tier-3 have finished.
 */

import { WILDLIFE_CACHE_PRIMARY } from './wildlifeCachePrimary.js';
import { ZONE_OVERRIDES } from './zoneOverrides.js';
import { MISSING_SPECIES_PATCHES } from './missingSpeciesPatches.js';

// The merged cache starts with primary parks only and grows as tiers arrive.
export const WILDLIFE_CACHE = { ...WILDLIFE_CACHE_PRIMARY };

export const WILDLIFE_CACHE_BUILT_AT = "2026-03-31T23:14:51.921Z";

// ── Cross-park scientificName lookup ────────────────────────────────────────
// Some iconic curated entries (e.g. American Bison at Yellowstone) are missing
// `scientificName`, which blocks the iNat histogram fetch and leaves cards on
// permanent `~est`. We rebuild a name → sciName map from every other cache
// entry that DOES have one, then backfill missing entries at load time.
const _sciNameByName = new Map();
function _indexSciNames(parks) {
  for (const val of Object.values(parks)) {
    for (const a of val?.animals ?? []) {
      if (a?.name && a?.scientificName && !_sciNameByName.has(a.name)) {
        _sciNameByName.set(a.name, a.scientificName);
      }
    }
  }
}

// Curated common-name → scientific-name aliases. Used to bridge naming
// conflicts between sources (NPS uses generic "Mountain Lion"; iNat uses
// the subspecies "Florida Panther" with sci "Puma concolor coryi"). Without
// this, the same animal appears twice in the panel for parks where multiple
// sources contributed it. Names compared case-insensitively.
const SPECIES_NAME_ALIASES = {
  // Big cats — Puma concolor and its subspecies all collapse to one entry
  'mountain lion':        'Puma concolor',
  'cougar':               'Puma concolor',
  'puma':                 'Puma concolor',
  'panther':              'Puma concolor',
  // Bison
  'buffalo':              'Bison bison',
  'american buffalo':     'Bison bison',
  // Alligators / crocodiles
  'american alligator':   'Alligator mississippiensis',
  'american crocodile':   'Crocodylus acutus',
  // Manatee
  'manatee':              'Trichechus manatus',
  'west indian manatee':  'Trichechus manatus',
  'florida manatee':      'Trichechus manatus',
  // Marine mammals — common naming variants
  'sea otter':            'Enhydra lutris',
  'killer whale':         'Orcinus orca',
  'orca':                 'Orcinus orca',
  // Sea turtles
  'green sea turtle':     'Chelonia mydas',
  'loggerhead sea turtle':'Caretta caretta',
  'leatherback sea turtle':'Dermochelys coriacea',
  // Other commonly cross-named
  'caribou':              'Rangifer tarandus',
  'reindeer':             'Rangifer tarandus',
  'wapiti':               'Cervus canadensis',
  'american elk':         'Cervus canadensis',
  'roosevelt elk':        'Cervus canadensis',
};

function _backfillSciNames(parks) {
  for (const val of Object.values(parks)) {
    for (const a of val?.animals ?? []) {
      if (a && a.name && !a.scientificName) {
        const lower = a.name.toLowerCase().trim();
        const sci = _sciNameByName.get(a.name) ?? SPECIES_NAME_ALIASES[lower];
        if (sci) a.scientificName = sci;
      }
    }
  }
}

// Normalize a scientific name to genus + species (drops subspecies). Mirrors
// scripts/buildWildlifeCache.js → normSci so runtime dedupe agrees with the
// build-time grouping.
function _normSci(name) {
  if (!name?.trim()) return null;
  const parts = name.toLowerCase().trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
}

// Score an entry's "richness" so dedupe keeps the better of two duplicates.
// Curated overrides + iconic subspecies + photo data win.
function _entryScore(a) {
  let s = 0;
  if (a.raritySource === 'override') s += 100;
  if (a.raritySource === 'override_curated') s += 100;
  if (a.funFact && !/documented in this park through|species documented in this park/i.test(a.funFact)) s += 30;
  if (a.parkTip) s += 10;
  if (a.photoUrl) s += 5;
  if (a.scientificName?.split(/\s+/).length >= 3) s += 8; // subspecies-level wins over genus+species
  return s;
}

// Collapse animals within a single park that share a normalized scientific
// name. Keeps the higher-scored entry but unions its `sources` array so we
// don't lose provenance. Runs after sci-name backfill so alias-derived sci
// names participate in grouping.
// Inject flagship species the build pipeline keeps dropping. See
// src/data/missingSpeciesPatches.js for full rationale + curated list.
// Idempotent: only adds an entry when no existing animal at that park
// shares the same name OR scientific name.
function _patchMissingFlagshipSpecies(parks) {
  for (const patch of MISSING_SPECIES_PATCHES) {
    const parkData = parks[patch.parkId];
    if (!parkData?.animals) continue;
    const nameLower = patch.name.toLowerCase().trim();
    const sciLower = patch.scientificName?.toLowerCase().trim();
    const exists = parkData.animals.some(a => {
      const an = a.name?.toLowerCase().trim();
      const asci = a.scientificName?.toLowerCase().trim();
      return an === nameLower || (sciLower && asci === sciLower);
    });
    if (exists) continue;
    parkData.animals.push({
      name:           patch.name,
      scientificName: patch.scientificName,
      animalType:     patch.animalType,
      rarity:         patch.rarity,
      frequency:      patch.frequency,
      funFact:        patch.funFact,
      seasons:        patch.seasons,
      activityPeriod: patch.activityPeriod,
      raritySource:   'curated_patch',
      source:         'curated',
    });
  }
}

// Merge zone-specific rarity into animal entries from src/data/zoneOverrides.js.
// Zones are runtime-applied (not baked into the static cache) so curators can
// add/edit hotspot data without re-running the 3-hour rebuild. AnimalCard
// already consumes animal.zones[zoneId] when the popup zone selector is set.
function _applyZoneOverrides(parks) {
  for (const [parkId, parkData] of Object.entries(parks)) {
    const overrides = ZONE_OVERRIDES[parkId];
    if (!overrides || !Array.isArray(parkData?.animals)) continue;
    for (const animal of parkData.animals) {
      const zonesForSpecies = overrides[animal.name];
      if (!zonesForSpecies) continue;
      // Merge into existing zones rather than replace — defensive in case the
      // build script ever populates zones directly from API data.
      animal.zones = { ...(animal.zones ?? {}), ...zonesForSpecies };
    }
  }
}

// Runtime rarity patches — same shape as RARITY_OVERRIDES (parkId →
// speciesName → tier). Applied at cache-load so a tier correction takes
// effect immediately without waiting for the weekly rebuild. Use sparingly:
// the canonical override tables live in scripts/buildWildlifeCache.js and
// src/services/apiService.js. This is for cases where:
//   1. A calibration miss has been root-caused to a stale or wrong override
//   2. The build/runtime tables have already been corrected
//   3. We don't want to wait until next Sunday's rebuild for the fix to ship
//
// Each entry should be removed once the next rebuild has propagated the
// canonical correction. Bump the date when modifying.
const RUNTIME_RARITY_PATCHES_REVIEWED_AT = '2026-04-25';
const RUNTIME_RARITY_PATCHES = {
  shenandoah: {
    'Black Bear':          'unlikely',  // anchor calibration: park-level rate ~25%, was incorrectly cached as 'likely'
    'American Black Bear': 'unlikely',
  },
  yosemite: {
    'American Black Bear': 'unlikely',  // override targeted 'Black Bear' but iNat stores under sub-species name
  },
};

function _applyRuntimeRarityPatches(parks) {
  for (const [parkId, patches] of Object.entries(RUNTIME_RARITY_PATCHES)) {
    const parkData = parks[parkId];
    if (!parkData?.animals) continue;
    for (const animal of parkData.animals) {
      const newTier = patches[animal.name];
      if (newTier && animal.rarity !== newTier) {
        animal.rarity = newTier;
        animal.raritySource = 'runtime_patch';
      }
    }
  }
}

function _dedupeWithinPark(parks) {
  for (const val of Object.values(parks)) {
    if (!Array.isArray(val?.animals)) continue;
    const groups = new Map(); // sciKey → entries[]
    const ungrouped = [];
    for (const a of val.animals) {
      const key = _normSci(a.scientificName);
      if (!key) { ungrouped.push(a); continue; }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    const merged = [];
    for (const group of groups.values()) {
      if (group.length === 1) { merged.push(group[0]); continue; }
      // Pick winner; union sources arrays
      const winner = group.reduce((best, cur) =>
        _entryScore(cur) > _entryScore(best) ? cur : best
      );
      const allSources = [...new Set(
        group.flatMap(a => a.sources ?? (a.source ? [a.source] : [])).filter(Boolean)
      )];
      merged.push({ ...winner, sources: allSources.length ? allSources : winner.sources });
    }
    val.animals = [...merged, ...ungrouped];
  }
}

_indexSciNames(WILDLIFE_CACHE);
_backfillSciNames(WILDLIFE_CACHE);
_dedupeWithinPark(WILDLIFE_CACHE);
_patchMissingFlagshipSpecies(WILDLIFE_CACHE);
_applyZoneOverrides(WILDLIFE_CACHE);
_applyRuntimeRarityPatches(WILDLIFE_CACHE);

// Tracks tier load state
let _tier2Loaded = false;
let _tier3Loaded = false;
let _tier2Promise = null;
let _tier3Promise = null;
const _listeners = new Set();

function _notify() {
  for (const cb of _listeners) {
    try { cb(); } catch { /* swallow callback errors */ }
  }
}

// "Secondary loaded" means BOTH tiers are in. Preserves public API.
export function isSecondaryLoaded() {
  return _tier2Loaded && _tier3Loaded;
}

export function isTier2Loaded() { return _tier2Loaded; }
export function isTier3Loaded() { return _tier3Loaded; }

export function onSecondaryLoaded(callback) {
  if (isSecondaryLoaded()) { callback(); return () => {}; }
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

// ── Tier 2: next 15 most-visited parks (popular long tail) ──────────────────
export function loadTier2() {
  if (_tier2Promise) return _tier2Promise;
  _tier2Promise = import('./wildlifeCacheTier2.js').then(mod => {
    const data = mod.WILDLIFE_CACHE_TIER2;
    for (const [id, val] of Object.entries(data)) {
      WILDLIFE_CACHE[id] = val;
    }
    _indexSciNames(data);
    _backfillSciNames(WILDLIFE_CACHE);
    _dedupeWithinPark(WILDLIFE_CACHE);
    _patchMissingFlagshipSpecies(WILDLIFE_CACHE);
    _applyZoneOverrides(WILDLIFE_CACHE);
    _applyRuntimeRarityPatches(WILDLIFE_CACHE);
    _tier2Loaded = true;
    _notify();
    return data;
  });
  return _tier2Promise;
}

// ── Tier 3: remaining parks (long tail) ──────────────────────────────────────
export function loadTier3() {
  if (_tier3Promise) return _tier3Promise;
  _tier3Promise = import('./wildlifeCacheTier3.js').then(mod => {
    const data = mod.WILDLIFE_CACHE_TIER3;
    for (const [id, val] of Object.entries(data)) {
      WILDLIFE_CACHE[id] = val;
    }
    _indexSciNames(data);
    _backfillSciNames(WILDLIFE_CACHE);
    _dedupeWithinPark(WILDLIFE_CACHE);
    _patchMissingFlagshipSpecies(WILDLIFE_CACHE);
    _applyZoneOverrides(WILDLIFE_CACHE);
    _applyRuntimeRarityPatches(WILDLIFE_CACHE);
    _tier3Loaded = true;
    _notify();
    if (isSecondaryLoaded()) _listeners.clear();
    return data;
  });
  return _tier3Promise;
}

// Public API preserved — triggers both tiers. Tier 3 is chained off tier 2 so
// the network pipe isn't saturated during first paint.
export function loadSecondaryCache() {
  const t2 = loadTier2();
  // Kick off tier-3 only once tier-2 settles — keeps the network idle-friendly.
  t2.then(() => loadTier3(), () => loadTier3());
  return t2;
}
