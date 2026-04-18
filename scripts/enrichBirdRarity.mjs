/**
 * enrichBirdRarity.mjs — eBird Status & Trends rarity enrichment
 *
 * Uses the eBird S&T API (seasonal occurrence GeoTIFFs, 9km resolution) to
 * replace the flat eBird binary-fallback rarity (40% → likely, 15% → unlikely)
 * with real per-season occurrence probabilities for every bird in the cache.
 *
 * Strategy: UPGRADES ONLY by default (--allow-downgrades to enable both).
 * S&T can underestimate species concentrated near specific in-park habitats
 * (e.g. Ospreys at Yellowstone Lake vs. the park's center coordinates), so
 * we never reduce rarity below what the existing cache already has — unless
 * explicitly enabled.
 *
 * Usage:
 *   node scripts/enrichBirdRarity.mjs                  # upgrades only
 *   node scripts/enrichBirdRarity.mjs --allow-downgrades
 *   node scripts/enrichBirdRarity.mjs --dry-run         # no writes
 *   node scripts/enrichBirdRarity.mjs --park=yellowstone  # one park only
 *   node scripts/enrichBirdRarity.mjs --limit=5         # first N species only
 *
 * Files cached to: scripts/geotiff-cache/{code}_seasonal_9km.tif
 * API key read from: .env  (VITE_EBIRD_ST_KEY, VITE_EBIRD_API_KEY)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';
import { PARK_ZONES } from '../src/data/parkZones.js';

// ── CLI flags ──────────────────────────────────────────────────────────────
const ARGS            = process.argv.slice(2);
const DRY_RUN         = ARGS.includes('--dry-run');
const ALLOW_DOWNGRADES = ARGS.includes('--allow-downgrades');
const PARK_FILTER     = (ARGS.find(a => a.startsWith('--park=')) ?? '').replace('--park=', '') || null;
const LIMIT           = parseInt((ARGS.find(a => a.startsWith('--limit=')) ?? '').replace('--limit=', '')) || Infinity;

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT      = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_IN  = join(ROOT, 'src', 'data', 'wildlifeCache.js');
const TIFF_DIR  = join(ROOT, 'scripts', 'geotiff-cache');
const ENV_FILE  = join(ROOT, '.env');

// ── Load .env manually (no dotenv dependency needed) ──────────────────────
function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const ENV     = loadEnv(ENV_FILE);
const ST_KEY  = ENV.VITE_EBIRD_ST_KEY;
const OB_KEY  = ENV.VITE_EBIRD_API_KEY;  // regular eBird key for taxonomy

if (!ST_KEY) { console.error('❌  VITE_EBIRD_ST_KEY not found in .env'); process.exit(1); }
if (!OB_KEY) { console.error('❌  VITE_EBIRD_API_KEY not found in .env'); process.exit(1); }

mkdirSync(TIFF_DIR, { recursive: true });

// ── Projection ─────────────────────────────────────────────────────────────
const EQUAL_EARTH = '+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';

// ── Rarity helpers ─────────────────────────────────────────────────────────
const RARITY_RANK  = { guaranteed:0, very_likely:1, likely:2, unlikely:3, rare:4, exceptional:5 };
const rarityFromProb = p => {
  if (p >= 0.90) return 'guaranteed';
  if (p >= 0.60) return 'very_likely';
  if (p >= 0.30) return 'likely';
  if (p >= 0.10) return 'unlikely';
  if (p >= 0.02) return 'rare';
  return 'exceptional';
};
const SEASON_KEYS  = ['summer', 'winter', 'spring', 'fall'];
// S&T band order: 0=breeding(summer), 1=nonbreeding(winter), 2=pre-brd-mig(spring), 3=post-brd-mig(fall)
const BAND_SEASON  = ['summer', 'winter', 'spring', 'fall'];

// ── HTTP helpers ───────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function safeFetch(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WildlifeMap/1.0' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      return res;
    } catch {
      if (attempt < retries - 1) { await sleep(2000 * (attempt + 1)); continue; }
      return null;
    }
  }
  return null;
}

// ── eBird taxonomy → speciesCode lookup ───────────────────────────────────
// Build map: lowerCase(scientificName) → speciesCode
// Also: lowerCase(commonName) → speciesCode  (fallback)
async function buildTaxonomy() {
  console.log('\nFetching eBird taxonomy…');
  const res = await safeFetch(`https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&key=${OB_KEY}`);
  if (!res) { console.error('❌  Could not fetch taxonomy'); process.exit(1); }
  const taxa = await res.json();
  const bySci  = new Map();
  const byComm = new Map();
  for (const t of taxa) {
    if (t.sciName)     bySci.set(t.sciName.toLowerCase(),  t.speciesCode);
    if (t.comName)     byComm.set(t.comName.toLowerCase(), t.speciesCode);
  }
  console.log(`   Loaded ${taxa.length} taxa (${bySci.size} scientific names)`);
  return { bySci, byComm };
}

// ── Download S&T GeoTIFF (9km seasonal mean) ──────────────────────────────
async function downloadTiff(speciesCode) {
  const dest = join(TIFF_DIR, `${speciesCode}_seasonal_9km.tif`);
  if (existsSync(dest)) return dest;    // cached

  const objKey = `2023/${speciesCode}/seasonal/${speciesCode}_occurrence_seasonal_mean_9km_2023.tif`;
  const url    = `https://st-download.ebird.org/v1/fetch?objKey=${encodeURIComponent(objKey)}&key=${ST_KEY}`;
  const res    = await safeFetch(url);
  if (!res) return null;

  const buf = await res.arrayBuffer();
  if (buf.byteLength < 1000) return null;  // empty / error body
  writeFileSync(dest, Buffer.from(buf));
  return dest;
}

// ── Extract occurrence probabilities from a GeoTIFF ───────────────────────
// Returns { summer, winter, spring, fall } floats in [0,1] or null on error
// Uses a ±2 pixel radius (= ±18km at 9km/px) and takes mean of non-zero pixels
const tiffCache = new Map();   // path → geotiff image (avoid re-opening)

async function extractOccurrence(tiffPath, lat, lng) {
  let image = tiffCache.get(tiffPath);
  if (!image) {
    const buf  = readFileSync(tiffPath).buffer;
    const tiff = await fromArrayBuffer(buf);
    image = await tiff.getImage();
    tiffCache.set(tiffPath, image);
  }
  const bbox = image.getBoundingBox();
  const w    = image.getWidth();
  const h    = image.getHeight();
  const samples = image.getSamplesPerPixel();

  const [easting, northing] = proj4('EPSG:4326', EQUAL_EARTH, [lng, lat]);
  const px = Math.round((easting  - bbox[0]) / (bbox[2] - bbox[0]) * w);
  const py = Math.round((bbox[3] - northing) / (bbox[3] - bbox[1]) * h);

  // ±2 pixel radius at 9km = ±18km coverage — good for large national parks
  const RADIUS = 2;
  const win = [
    Math.max(0, px - RADIUS), Math.max(0, py - RADIUS),
    Math.min(w, px + RADIUS + 1), Math.min(h, py + RADIUS + 1),
  ];
  const data = await image.readRasters({ window: win });

  // S&T seasonal TIFFs can be 4-band (per-season) or 1-band (annual mean for
  // residents like Common Raven where S&T publishes only a single surface).
  // Normalize both to a 4-season object.
  if (samples >= 4 && Array.isArray(data) && data.length >= 4) {
    const result = {};
    for (let b = 0; b < 4; b++) {
      const season = BAND_SEASON[b];
      const vals   = Array.from(data[b]).filter(v => isFinite(v) && v > 0 && v <= 1);
      result[season] = vals.length > 0 ? vals.reduce((a, x) => a + x, 0) / vals.length : 0;
    }
    return result;
  }

  // 1-band (resident) path — use the single surface as a year-round estimate.
  const band0 = Array.isArray(data) ? data[0] : data;
  const vals = Array.from(band0).filter(v => isFinite(v) && v > 0 && v <= 1);
  const mean = vals.length > 0 ? vals.reduce((a, x) => a + x, 0) / vals.length : 0;
  return { summer: mean, winter: mean, spring: mean, fall: mean };
}

// ── Park coordinates (lat/lng of geographic center) ───────────────────────
// Same coords used throughout buildWildlifeCache.js
const PARK_COORDS = {
  yellowstone:72645,  // placeholder — real coords below
};
// Real coords sourced from wildlifeData.js (lat/lng fields)
// We read them directly from the cache file below.

// ── Load wildlifeCache.js ─────────────────────────────────────────────────
console.log('Loading wildlife cache…');
const src = readFileSync(CACHE_IN, 'utf8');
const builtAtMatch = src.match(/Built:\s*(\S+)/);
const originalBuiltAt = builtAtMatch?.[1] ?? 'unknown';
const match = src.match(/export const WILDLIFE_CACHE\s*=\s*(\{[\s\S]*\});/);
if (!match) { console.error('❌  Cannot parse WILDLIFE_CACHE'); process.exit(1); }
const cache = new Function(`return ${match[1]}`)();
const allParkIds = Object.keys(cache);
console.log(`   ${allParkIds.length} parks, ${allParkIds.reduce((s,id)=>s+cache[id].animals.length,0)} animals`);

// ── Read park lat/lng from wildlifeData.js ────────────────────────────────
const wdSrc = readFileSync(join(ROOT, 'src', 'wildlifeData.js'), 'utf8');
const parkCoords = {};
// Extract: id: '...', lat: N, lng: N
for (const m of wdSrc.matchAll(/id:\s*'([^']+)'[^}]*?lat:\s*([-\d.]+)[^}]*?lng:\s*([-\d.]+)/gs)) {
  parkCoords[m[1]] = { lat: parseFloat(m[2]), lng: parseFloat(m[3]) };
}
console.log(`   Found coordinates for ${Object.keys(parkCoords).length} parks`);

// ── Collect unique birds from cache ───────────────────────────────────────
const parks = (PARK_FILTER ? [PARK_FILTER] : allParkIds).filter(id => cache[id]);

const speciesSet = new Set();
for (const parkId of parks) {
  for (const a of cache[parkId].animals) {
    if (a.animalType === 'bird' && a.scientificName) {
      speciesSet.add(a.scientificName);
    }
  }
}
const allSpecies = [...speciesSet].slice(0, LIMIT);
console.log(`   ${allSpecies.length} unique bird species to process (${PARK_FILTER ? `park: ${PARK_FILTER}` : 'all parks'})`);

// ── Build eBird taxonomy lookup ────────────────────────────────────────────
const { bySci, byComm } = await buildTaxonomy();

// ── Download GeoTIFFs and extract per-species occurrence ──────────────────
// Maps: scientificName → { summer, winter, spring, fall }  or null
console.log('\nDownloading S&T GeoTIFFs (9km, cached)…');
const speciesOccurrence = new Map();
let downloadCount = 0, cacheHit = 0, missing = 0;

for (const sciName of allSpecies) {
  const code = bySci.get(sciName.toLowerCase());
  if (!code) {
    // Try common name fallback if available
    speciesOccurrence.set(sciName, null);
    missing++;
    continue;
  }

  const dest = join(TIFF_DIR, `${code}_seasonal_9km.tif`);
  const already = existsSync(dest);
  if (!already) {
    process.stdout.write(`  ↓ ${code} (${sciName})… `);
    const path = await downloadTiff(code);
    if (!path) {
      process.stdout.write('no file\n');
      speciesOccurrence.set(sciName, null);
      missing++;
      await sleep(300);
      continue;
    }
    const mb = (readFileSync(dest).length / 1024 / 1024).toFixed(1);
    process.stdout.write(`${mb} MB ✓\n`);
    downloadCount++;
    await sleep(400);  // be polite to the S&T server
  } else {
    cacheHit++;
  }

  // Will extract per-park below — just mark as "has file" for now
  speciesOccurrence.set(sciName, code);  // store code, extract on demand
}

console.log(`\n   Downloads: ${downloadCount} new, ${cacheHit} cached, ${missing} not in S&T`);

// ── Apply updates to cache ─────────────────────────────────────────────────
console.log('\nApplying S&T rarity updates to cache…');

let totalUpgrades = 0, totalDowngrades = 0, totalSeasonUpdates = 0;
let totalSeasonFreqs = 0, totalZoneFreqs = 0;
const parkReports = [];

// Round seasonal frequencies to 4 decimals to keep the bundled cache readable.
const roundFreq = (v) => v == null ? null : Number(v.toFixed(4));

for (const parkId of parks) {
  const coords = parkCoords[parkId];
  if (!coords) {
    console.log(`  ⚠ No coordinates for ${parkId} — skip`);
    continue;
  }

  let upgrades = 0, downgrades = 0, seasonChanges = 0, seasonFreqWrites = 0, zoneFreqWrites = 0;
  const zoneList = PARK_ZONES[parkId] ?? null;

  cache[parkId].animals = await Promise.all(cache[parkId].animals.map(async (animal) => {
    if (animal.animalType !== 'bird' || !animal.scientificName) return animal;

    const codeOrNull = speciesOccurrence.get(animal.scientificName);
    if (!codeOrNull || typeof codeOrNull !== 'string') return animal;

    const tiffPath = join(TIFF_DIR, `${codeOrNull}_seasonal_9km.tif`);
    if (!existsSync(tiffPath)) return animal;

    let occ;
    try {
      occ = await extractOccurrence(tiffPath, coords.lat, coords.lng);
    } catch {
      return animal;
    }

    // ── Seasons update ────────────────────────────────────────────────────
    // A season is "active" if occurrence > 2% (rare threshold)
    const activeSeasonsNew = SEASON_KEYS.filter(s => occ[s] >= 0.02);
    // Best season = highest probability
    const bestSeasonNew = SEASON_KEYS.reduce((best, s) => occ[s] > occ[best] ? s : best, SEASON_KEYS[0]);

    // ── Rarity update ─────────────────────────────────────────────────────
    // Use maximum occurrence across all active seasons
    const maxProb = Math.max(...SEASON_KEYS.map(s => occ[s]));
    const newRarity = rarityFromProb(maxProb);
    const oldRank   = RARITY_RANK[animal.rarity]   ?? 5;
    const newRank   = RARITY_RANK[newRarity]        ?? 5;

    let updatedAnimal = { ...animal };
    let changed = false;

    // Apply rarity change
    if (newRank !== oldRank) {
      if (newRank < oldRank) {
        // Upgrade
        updatedAnimal = { ...updatedAnimal, rarity: newRarity };
        upgrades++;
        changed = true;
      } else if (ALLOW_DOWNGRADES) {
        // Downgrade only if flag set
        updatedAnimal = { ...updatedAnimal, rarity: newRarity };
        downgrades++;
        changed = true;
      }
      // else: downgrade suppressed — keep existing rarity
    }

    // Apply seasons update (always update if S&T has data and seasons changed)
    if (activeSeasonsNew.length > 0) {
      const oldSeasons = (animal.seasons ?? []).sort().join(',');
      const newSeasons = [...activeSeasonsNew].sort().join(',');
      if (oldSeasons !== newSeasons || animal.bestSeason !== bestSeasonNew) {
        updatedAnimal = { ...updatedAnimal, seasons: activeSeasonsNew, bestSeason: bestSeasonNew };
        seasonChanges++;
      }
    }

    // ── Per-season frequency (gap K) ──────────────────────────────────────
    // S&T occurrence is a true encounter probability per checklist — store
    // all 4 bands so the UI can render rarity per season without a runtime
    // iNat fetch.
    const seasonFrequencies = {
      spring: roundFreq(occ.spring),
      summer: roundFreq(occ.summer),
      fall:   roundFreq(occ.fall),
      winter: roundFreq(occ.winter),
    };
    updatedAnimal = {
      ...updatedAnimal,
      seasonFrequencies,
      seasonFrequenciesSource: 'ebird_st',
    };
    seasonFreqWrites++;

    // ── Per-zone frequency (gap A extension) ──────────────────────────────
    // For zoned mega-parks, sample the raster at each zone centroid and
    // store zone-specific bird rarity. This replaces the bbox-iNat zone
    // path for birds, which is far less accurate at zone granularity.
    if (zoneList) {
      const zones = { ...(updatedAnimal.zones ?? {}) };
      for (const zone of zoneList) {
        try {
          const zoneOcc = await extractOccurrence(tiffPath, zone.lat, zone.lng);
          const zoneMax = Math.max(...SEASON_KEYS.map(s => zoneOcc[s]));
          if (zoneMax >= 0.005) {
            zones[zone.id] = {
              rarity:    rarityFromProb(zoneMax),
              frequency: roundFreq(zoneMax),
              seasonFrequencies: {
                spring: roundFreq(zoneOcc.spring),
                summer: roundFreq(zoneOcc.summer),
                fall:   roundFreq(zoneOcc.fall),
                winter: roundFreq(zoneOcc.winter),
              },
              source: 'ebird_st',
            };
            zoneFreqWrites++;
          }
        } catch {
          // skip this zone — coords may fall outside raster
        }
      }
      if (Object.keys(zones).length > 0) {
        updatedAnimal = { ...updatedAnimal, zones };
      }
    }

    return updatedAnimal;
  }));

  totalUpgrades   += upgrades;
  totalDowngrades += downgrades;
  totalSeasonUpdates += seasonChanges;
  totalSeasonFreqs += seasonFreqWrites;
  totalZoneFreqs   += zoneFreqWrites;

  if (upgrades + downgrades + seasonChanges + seasonFreqWrites > 0) {
    parkReports.push({ parkId, upgrades, downgrades, seasonChanges, seasonFreqWrites, zoneFreqWrites });
    const zoneNote = zoneList ? `, 📍${zoneFreqWrites} zone freqs` : '';
    console.log(`  ${parkId}: ⬆${upgrades} upgraded, ⬇${downgrades} downgraded, 📅${seasonChanges} season updates, 📊${seasonFreqWrites} season freqs${zoneNote}`);
  }
}

// ── Final stats ────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Total upgrades:        ${totalUpgrades}`);
console.log(`Total downgrades:      ${totalDowngrades} (${ALLOW_DOWNGRADES ? 'enabled' : 'suppressed — use --allow-downgrades'})`);
console.log(`Total season updates:  ${totalSeasonUpdates}`);
console.log(`Seasonal freq writes:  ${totalSeasonFreqs}`);
console.log(`Zone freq writes:      ${totalZoneFreqs}`);
console.log(`${'─'.repeat(60)}`);

const zeroGuar = allParkIds.filter(id => !cache[id].animals.some(a => a.rarity === 'guaranteed'));
console.log(`Parks with 0 Guaranteed: ${zeroGuar.length}`);

// ── Write updated cache ────────────────────────────────────────────────────
const patchedAt    = new Date().toISOString();
const totalSpecies = allParkIds.reduce((s, id) => s + cache[id].animals.length, 0);

const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Built: ${originalBuiltAt}`,
  `// Patched: ${patchedAt} (enrichBirdRarity.mjs — eBird S&T seasonal occurrence)`,
  `// Parks: ${allParkIds.length} | Species bundled: ${totalSpecies}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(originalBuiltAt)};`,
  ``,
  `export const WILDLIFE_CACHE = {`,
];
for (const [id, val] of Object.entries(cache)) {
  lines.push(`  ${JSON.stringify(id)}: {`);
  lines.push(`    builtAt: ${JSON.stringify(val.builtAt)},`);
  lines.push(`    animals: ${JSON.stringify(val.animals, null, 2).replace(/\n/g, '\n    ')},`);
  lines.push(`  },`);
}
lines.push(`};`);
lines.push(``);

if (!DRY_RUN) {
  writeFileSync(CACHE_IN, lines.join('\n'), 'utf8');
  console.log(`\n✅  Updated cache written → ${CACHE_IN}`);
} else {
  console.log('\n🔵  DRY RUN — no files written');
}
console.log(`   ${allParkIds.length} parks | ${totalSpecies} species | Done ✅`);
