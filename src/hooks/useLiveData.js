import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchEbirdHotspot, fetchEbird, fetchINat, fetchNps, fetchGbif,
  deduplicateAnimals, getCorrectionFactor, getMonthlyFrequency, rarityFromChecklist,
  locationCacheGet, locationCacheSet,
} from '../services/apiService';
import { WILDLIFE_CACHE, WILDLIFE_CACHE_BUILT_AT } from '../data/wildlifeCacheLoader.js';

// ── Weekly stale-bundle eviction ──────────────────────────────────────────────
// If the static bundle is older than 7 days, all loc_v1_* localStorage entries
// are cleared once per session so Parks re-fetch fresh API data in the background.
// This mirrors the 7-day CACHE_TTL in apiService.js and ensures that users on
// long-running sessions never silently show stale data indefinitely.
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const _bundleAge = Date.now() - new Date(WILDLIFE_CACHE_BUILT_AT).getTime();
const _bundleBuiltAtMs = new Date(WILDLIFE_CACHE_BUILT_AT).getTime();

// 1. If the bundle itself is >7 days old, evict all per-location localStorage entries.
if (_bundleAge > SEVEN_DAYS) {
  try {
    const staleCacheKeys = Object.keys(localStorage).filter(k => k.startsWith('wm_loc_v1_'));
    staleCacheKeys.forEach(k => localStorage.removeItem(k));
    if (staleCacheKeys.length) {
      console.log(`[useLiveData] Static bundle is ${Math.round(_bundleAge / 86400000)}d old — evicted ${staleCacheKeys.length} stale cache entries. Background refresh will run.`);
    }
  } catch { /* localStorage unavailable */ }
}

// 2. Evict individual localStorage entries cached BEFORE this bundle was built.
//    A fresh rebuild always has more complete data than prior API results — never
//    let a stale API cache from an earlier session override the new static bundle.
try {
  const allLocKeys = Object.keys(localStorage).filter(k => k.startsWith('wm_loc_v1_'));
  let preBundleEvicted = 0;
  allLocKeys.forEach(k => {
    try {
      const { ts } = JSON.parse(localStorage.getItem(k) ?? '{}');
      if (!ts || ts < _bundleBuiltAtMs) { localStorage.removeItem(k); preBundleEvicted++; }
    } catch { localStorage.removeItem(k); preBundleEvicted++; }
  });
  if (preBundleEvicted) console.log(`[useLiveData] Evicted ${preBundleEvicted} pre-bundle cache entries — static bundle is now primary.`);
} catch { /* localStorage unavailable */ }

/**
 * Fetches live wildlife data + eBird bar chart frequency data for all locations.
 *
 * Strategy per location:
 *   0. Resolve eBird hotspot code (geo lookup) + fetch bar chart frequency data.
 *      The bar chart is the gold-standard "encounter probability" for birds and
 *      is used in LocationPopup to compute seasonally-accurate, corrected rarity.
 *   1. NPS species list API — national parks only.
 *   2. eBird — recent observations via hotspot endpoint (checklist-frequency rarity).
 *   3. iNat — taxon groups throttled to max 2 concurrent (order_by=votes, radius=20 km).
 *   4. GBIF — fallback / mammal supplement.
 *
 * Returns:
 *   liveData        — { [locationId]: { animals, sources, stats, barChart } }
 *   loading         — Set<locationId>
 *   loadingProgress — { [locationId]: { birds, mammals, reptiles, amphibians, insects, marine } }
 *   refreshLocation — (locId) => void
 */

// 15 most-visited US national parks — pre-warmed in background on every page load.
// Staggered 3 s apart so APIs are not hammered; by the time a user clicks one of
// these the data is already cached.
const PRIORITY_PARK_IDS = [
  'yellowstone', 'grandcanyon', 'yosemite', 'greatsmokymountains', 'zion',
  'rockymountain', 'acadia', 'olympic', 'glacier', 'grandteton',
  'everglades', 'brycecanyon', 'arches', 'canyonlands', 'joshuatree',
];

const INAT_TAXA = [
  'bird', 'mammal', 'reptile', 'amphibian', 'insect', 'marine',
  // Targeted supplements — these taxon groups are often underrepresented
  // in the base mammal/reptile/amphibian queries:
  'bat',    // Chiroptera (49447) — bats skew to nocturnal, missed by mammal general query
  'snake',  // Serpentes  (85553) — snakes underreported; targeted query surfaces them
  'lizard', // Lacertilia (86258) — lizards underreported in arid parks
  'frog',   // Anura      (20979) — frogs & toads supplement for wetland/forest parks
];

const TAXON_TO_GROUP = {
  bird: 'birds', bat: 'birds',
  mammal: 'mammals',
  reptile: 'reptiles', snake: 'reptiles', lizard: 'reptiles',
  amphibian: 'amphibians', frog: 'amphibians',
  insect: 'insects',
  marine: 'marine',
};

export const PROGRESS_GROUPS = ['birds', 'mammals', 'reptiles', 'amphibians', 'insects', 'marine'];

// Species whose bar chart data we specifically log for sanity-checking.
const SANITY_CHECK_SPECIES = ['Bald Eagle', 'Great Blue Heron', 'Great Egret', 'Osprey'];

/**
 * Copy migrationStatus + authoritative seasons from the static bundle to any
 * animals in `list` that are missing them.
 * - seasons: the bundle is the patched source of truth (patchGlobalSeasons ran on
 *   it); old localStorage entries may have stale seasons (e.g. Barn Swallow with
 *   winter included). Always prefer bundle seasons to avoid stale badge derivation.
 * - migrationStatus: explicit value takes priority; bundle value is the fallback.
 * Called in Pass 2 (localStorage restore), emitPartial, and final merge.
 */
function applyBundleEnrichment(list, bundledAnimals) {
  if (!bundledAnimals?.length) return list;
  const byName = new Map(bundledAnimals.map(a => [a.name?.toLowerCase(), a]));
  return list.map(a => {
    const b = byName.get(a.name?.toLowerCase());
    if (!b) return a;
    return {
      ...a,
      // Use bundle seasons (patched/authoritative) so old cache stale seasons
      // don't produce the wrong migration badge derivation.
      seasons:         b.seasons ?? a.seasons,
      migrationStatus: a.migrationStatus ?? b.migrationStatus ?? null,
      // Always restore curated descriptions from the static bundle — live API
      // data (e.g. "Verified in X iNaturalist observations") must never overwrite
      // a Wikipedia or Park Naturalist description that was built at enrichment time.
      description:       b.description       ?? a.description,
      descriptionSource: b.descriptionSource ?? a.descriptionSource,
      funFact:           b.funFact           ?? a.funFact,
      parkTip:           b.parkTip           ?? a.parkTip,
    };
  });
}

export function useLiveData(locations) {
  const [liveData,        setLiveData]  = useState({});
  const [loading,         setLoading]   = useState(new Set());
  const [loadingProgress, setProgress]  = useState({});  // NEW
  const fetchedRef = useRef(new Set());
  const fetchFnRef = useRef(null);  // NEW — holds fetchLocation for refreshLocation

  useEffect(() => {
    if (!locations?.length) return;

    // ── SYNC: build instant initial state — zero network wait ──────────────
    // Two-pass approach:
    //   Pass 1 — static bundle (wildlifeCache.js): always available; parks with
    //             hardcoded flagship species show their animals immediately on
    //             every cold start before any API call fires.
    //   Pass 2 — localStorage cache (loc_v1_*): overrides the static bundle for
    //             parks that were fetched in a previous session. These parks are
    //             marked in fetchedRef so the background API dispatch skips them
    //             (fresh cache < 7 days old means no re-fetch needed).
    const initialData = {};

    // Pass 1: static bundle — instant display, no API needed
    locations.forEach(loc => {
      const bundled = WILDLIFE_CACHE[loc.id];
      if (bundled?.animals?.length) {
        initialData[loc.id] = {
          animals:  bundled.animals,
          sources:  ['static'],
          stats:    { ebirdChecklists: null, ebirdHistoricalSpecies: null, inatObservations: 0, speciesCounts: {} },
          barChart: null,
          // No _fromStaticCache flag needed — API results will replace this entry.
        };
      }
    });

    // Pass 2: localStorage — only use if it has at least as many animals as the static bundle.
    // Live API results are stored after merging with the bundle, so a valid cache entry will
    // always have >= bundle count. A cache with fewer animals means it's from a pre-merge
    // session (live API ran, got a small result, stored it without bundle supplement) — in
    // that case, re-run the API so the merged result gets stored for next session.
    // Also run applyBundleEnrichment so that cache entries from before migrationStatus was
    // added to the bundle still show migration badges immediately without a re-fetch.
    locations.forEach(loc => {
      const cached = locationCacheGet(loc.id);
      const bundledAnimals = WILDLIFE_CACHE[loc.id]?.animals ?? [];
      const bundleCount    = bundledAnimals.length;
      if (cached && (cached.animals?.length ?? 0) >= Math.max(bundleCount, 1)) {
        const enrichedAnimals = applyBundleEnrichment(cached.animals ?? [], bundledAnimals);
        initialData[loc.id] = { ...cached, animals: enrichedAnimals };
        fetchedRef.current.add(loc.id);  // rich cache → skip background API fetch
      }
    });

    if (Object.keys(initialData).length) setLiveData(initialData);

    // ── ASYNC: per-location fetch ──────────────────────────────────────────
    const fetchLocation = async (loc) => {
      if (fetchedRef.current.has(loc.id)) return;
      fetchedRef.current.add(loc.id);

      setLoading(prev => new Set([...prev, loc.id]));
      setProgress(prev => ({
        ...prev,
        [loc.id]: Object.fromEntries(PROGRESS_GROUPS.map(g => [g, 'pending'])),
      }));

      const sources = [];
      let livePool = [], ebirdChecklists = null, ebirdHistoricalSpecies = null,
          inatObservations = 0;

      // Static bundle for this location — used in emitPartial + final merge.
      const bundledAnimals = WILDLIFE_CACHE[loc.id]?.animals ?? [];

      // Emit intermediate update so animals appear progressively.
      // _partial: true prevents locationCacheSet from writing these to localStorage.
      const emitPartial = () => {
        const raw     = deduplicateAnimals([...livePool]);
        const animals = applyBundleEnrichment(raw, bundledAnimals);
        setLiveData(prev => ({
          ...prev,
          [loc.id]: {
            animals, sources: [...sources],
            stats: { ebirdChecklists, ebirdHistoricalSpecies, inatObservations, speciesCounts: {} },
            _partial: true,
          },
        }));
      };

      try {
        // ── 0. eBird hotspot code ────────────────────────────────────────────
        const hotspotCode = await fetchEbirdHotspot(loc.lat, loc.lng);

        // ── 1. NPS species list (national parks only) ───────────────────────
        if (loc.npsCode) {
          const npsResult = await fetchNps(loc.npsCode, loc.id);
          if (npsResult?.animals?.length) {
            livePool.push(...npsResult.animals);
            sources.push('nps');
          }
        }

        // ── 2. eBird (birds first) ──────────────────────────────────────────
        setProgress(prev => ({ ...prev, [loc.id]: { ...prev[loc.id], birds: 'loading' } }));
        const ebirdResult = await fetchEbird(loc.lat, loc.lng, loc.id, hotspotCode);
        if (ebirdResult?.animals?.length) {
          livePool.push(...ebirdResult.animals);
          ebirdChecklists        = ebirdResult._stats?.recentChecklistCount ?? null;
          ebirdHistoricalSpecies = ebirdResult._stats?.historicalSpeciesCount ?? null;
          sources.push('ebird');

          // ── Sanity-check log: top 10 birds with corrected frequency ─────────
          if (ebirdResult.animals.length >= 5) {
            const birds = [...ebirdResult.animals]
              .map(a => {
                const factor    = getCorrectionFactor(a.name);
                const corrected = Math.min(1, a.frequency * factor);
                return { name: a.name, raw: a.frequency, corrected, rarity: rarityFromChecklist(corrected) };
              })
              .sort((a, b) => b.corrected - a.corrected);

            const speciesSeen = ebirdResult._stats?.recentObsCount ?? ebirdResult.animals.length;
            console.log(`\n[eBird Geo] ${loc.name} — ${speciesSeen} species seen (15km, 30d, date-based freq)`);
            console.log('  Top 10 birds (corrected):');
            birds.slice(0, 10).forEach(({ name, raw, corrected, rarity }, i) => {
              const note = Math.abs(corrected - raw) > 0.005
                ? ` → ${(corrected * 100).toFixed(0)}% corrected`
                : '';
              console.log(`    ${i + 1}. [${rarity.padEnd(8)}] ${name}: ${(raw * 100).toFixed(1)}%${note}`);
            });

            const found = [], missing = [];
            SANITY_CHECK_SPECIES.forEach(name => {
              const entry = birds.find(b => b.name === name);
              if (entry) found.push(entry); else missing.push(name);
            });
            if (found.length || missing.length) {
              console.log('  Sanity-check species:');
              found.forEach(({ name, raw, corrected, rarity }) => {
                const factor = getCorrectionFactor(name);
                const note   = factor !== 1 ? ` (raw ${(raw * 100).toFixed(1)}%, ×${factor.toFixed(2)} → ${(corrected * 100).toFixed(1)}%)` : '';
                console.log(`    ✓ ${name}: ${rarity}${note}`);
              });
              missing.forEach(n => console.log(`    ✗ ${n}: not in 30-day eBird data for ${loc.name}`));
            }
          }
        }
        setProgress(prev => ({ ...prev, [loc.id]: { ...prev[loc.id], birds: 'done' } }));
        if (sources.length) emitPartial();

        // ── 3. iNat — max 2 concurrent ──────────────────────────────────────
        // wideNet locations (very remote, sparse coverage) use a 50 km radius
        // and a 365-day window to cast a wider net for observations.
        let running = 0;
        const queue = [];
        const runNext = () => {
          while (running < 2 && queue.length) {
            const task = queue.shift();
            running++;
            task().finally(() => { running--; runNext(); });
          }
        };

        const inatOptions = loc.wideNet ? { radius: 50, days: 365 } : undefined;

        await new Promise(resolve => {
          let remaining = INAT_TAXA.length;
          INAT_TAXA.forEach(taxon => {
            const group = TAXON_TO_GROUP[taxon] ?? null;
            queue.push(async () => {
              if (group) {
                setProgress(prev => {
                  const cur = prev[loc.id]?.[group];
                  return cur === 'pending'
                    ? { ...prev, [loc.id]: { ...prev[loc.id], [group]: 'loading' } }
                    : prev;
                });
              }

              const result = await fetchINat(loc.lat, loc.lng, loc.id, taxon, inatOptions ?? {});
              if (result?.animals?.length) {
                livePool.push(...result.animals);
                inatObservations += result._stats?.totalObsCount ?? 0;
                if (!sources.includes('inaturalist')) sources.push('inaturalist');
              }

              if (group) {
                setProgress(prev => ({
                  ...prev, [loc.id]: { ...prev[loc.id], [group]: 'done' },
                }));
              }
              emitPartial();
              if (--remaining === 0) resolve();
            });
          });
          runNext();
        });

        // ── 4. GBIF — fallback / mammal supplement / wide-net ────────────────
        const hasFrequencySource = sources.includes('ebird') || sources.includes('inaturalist');
        const mammalCount = livePool.filter(a => a.animalType === 'mammal').length;
        if (!hasFrequencySource) {
          const gbifData = await fetchGbif(loc.lat, loc.lng, loc.id);
          if (gbifData?.length) { livePool.push(...gbifData); sources.push('gbif'); }
        } else if (mammalCount < 2) {
          const gbifMammals = await fetchGbif(loc.lat, loc.lng, `${loc.id}_mm`, 732);
          if (gbifMammals?.length) {
            livePool.push(...gbifMammals);
            if (!sources.includes('gbif')) sources.push('gbif');
          }
        }
        // wideNet parks (remote/sparse): also run GBIF with a large bounding box
        // (~90 km) to supplement iNat observations that are scarce in these areas.
        if (loc.wideNet) {
          const gbifWide = await fetchGbif(loc.lat, loc.lng, `${loc.id}_wide`, null, { d: 0.9 });
          if (gbifWide?.length) {
            livePool.push(...gbifWide);
            if (!sources.includes('gbif')) sources.push('gbif');
          }
        }

      } catch (err) {
        console.warn(`[useLiveData] ${loc.id}:`, err.message);
      }

      if (sources.length) {
        // Merge live API results into the static bundle rather than replacing it.
        // Live data (frequency, recent photos, bar chart) takes priority; the static
        // bundle fills in all species that the live APIs missed. This ensures the popup
        // always shows the full comprehensive species list from the cache build.
        const fullPool = [...livePool, ...bundledAnimals];
        const deduped  = deduplicateAnimals(fullPool);
        // Enrich with bundle-only fields (migrationStatus) that live APIs don't return.
        const animals  = applyBundleEnrichment(deduped, bundledAnimals);
        const speciesCounts = {};
        animals.forEach(a => {
          const t = a.animalType ?? 'other';
          speciesCounts[t] = (speciesCounts[t] ?? 0) + 1;
        });

        const breakdown = Object.entries(speciesCounts).map(([k, v]) => `${k}:${v}`).join(' ');
        console.log(
          `[Wildlife] ${loc.name}: ${animals.length} species | ${breakdown}` +
          ` | eBird: ${ebirdChecklists ?? 'n/a'} checklists` +
          ` | iNat: ${inatObservations} obs` +
          ` | sources: ${sources.join(', ')}`
        );

        const finalResult = {
          animals, sources,
          stats: { ebirdChecklists, ebirdHistoricalSpecies, inatObservations, speciesCounts },
          // No _partial flag — this is the final committed result
        };
        setLiveData(prev => ({ ...prev, [loc.id]: finalResult }));
        locationCacheSet(loc.id, finalResult);  // persists to aggregate cache
      }

      setProgress(prev => ({
        ...prev,
        [loc.id]: Object.fromEntries(PROGRESS_GROUPS.map(g => [g, 'done'])),
      }));
      setLoading(prev => { const n = new Set(prev); n.delete(loc.id); return n; });
    };

    fetchFnRef.current = fetchLocation;

    // ── Staggered dispatch ────────────────────────────────────────────────
    // Priority parks: 400 ms apart. Non-priority: 2 000 ms apart after the
    // priority group. fetchLocation's fetchedRef guard skips cached locations.
    const prioritySet     = new Set(PRIORITY_PARK_IDS);
    const priorityLocs    = locations.filter(l => PRIORITY_PARK_IDS.includes(l.id));
    const nonPriorityLocs = locations.filter(l => !prioritySet.has(l.id));

    const PRIORITY_GAP_MS = 3000; // 3 s between priority parks — avoids API hammering
    const priorityMs      = priorityLocs.length * PRIORITY_GAP_MS;
    priorityLocs.forEach(   (loc, i) => setTimeout(() => fetchLocation(loc), i * PRIORITY_GAP_MS));
    nonPriorityLocs.forEach((loc, i) => setTimeout(() => fetchLocation(loc), priorityMs + 2000 + i * 1000));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLocation = useCallback((locId) => {
    try { localStorage.removeItem(`wm_loc_v1_${locId}`); } catch {}
    fetchedRef.current.delete(locId);
    const loc = locations?.find(l => l.id === locId);
    if (loc && fetchFnRef.current) fetchFnRef.current(loc);
  }, [locations]);

  return { liveData, loading, loadingProgress, refreshLocation };
}
