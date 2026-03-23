#!/usr/bin/env node
/**
 * scripts/patchThinParks.js
 *
 * Targeted re-fetch for parks that ended up with no birds + no mammals in the
 * static cache. Uses maximum search parameters (50 km, 365 days, 30 s timeout).
 * Merges results back into the existing wildlifeCache.js.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const out = {};
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = loadDotEnv();
const EBIRD_KEY = env.VITE_EBIRD_API_KEY ?? process.env.VITE_EBIRD_API_KEY ?? '';
const NPS_KEY   = env.VITE_NPS_API_KEY   ?? process.env.VITE_NPS_API_KEY   ?? '';

const { wildlifeLocations } = await import('../src/wildlifeData.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) }); // 30s timeout
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function rarityFromFreq(f) {
  return f >= 0.50 ? 'abundant' : f >= 0.20 ? 'common' : f >= 0.08 ? 'uncommon' : f >= 0.02 ? 'rare' : 'exceptional';
}
function rarityFromChecklist(f) {
  return f >= 0.70 ? 'abundant' : f >= 0.30 ? 'common' : f >= 0.10 ? 'uncommon' : f >= 0.02 ? 'rare' : 'exceptional';
}
function isTaxonomicJunk(name) {
  if (!name?.trim()) return true;
  const n = name.trim();
  if (/,\s*\d{4}/.test(n)) return true;
  if (/\b(Linnaeus|Gray|Cuvier|Say|Ord|Leach|Rafinesque|Wagler|Temminck|Swainson|Bonaparte|Schreber|Merriam|Kerr|Baird)\b/.test(n)) return true;
  if (/^[A-Z][a-z]+ [a-z]+(\s[a-z]+)?$/.test(n)) return true;
  return false;
}

const INAT_TAXON_IDS = {
  bird: 3, mammal: 40151, reptile: 26036, amphibian: 20978,
  insect: 47158, marine: 47178, bat: 49447, snake: 85553, lizard: 86258, frog: 20979,
};
const INAT_TYPE_MAP = {
  aves:          { type: 'bird',      emoji: '🐦' },
  mammalia:      { type: 'mammal',    emoji: '🦌' },
  reptilia:      { type: 'reptile',   emoji: '🐊' },
  amphibia:      { type: 'amphibian', emoji: '🐸' },
  insecta:       { type: 'insect',    emoji: '🦋' },
  actinopterygii:{ type: 'marine',    emoji: '🐟' },
  chondrichthyes:{ type: 'marine',    emoji: '🦈' },
  mollusca:      { type: 'marine',    emoji: '🐚' },
};
const NPS_TAXON_MAP = {
  'mammal':              { animalType: 'mammal',    emoji: '🦌' },
  'bird':                { animalType: 'bird',      emoji: '🐦' },
  'reptile':             { animalType: 'reptile',   emoji: '🦎' },
  'amphibian':           { animalType: 'amphibian', emoji: '🐸' },
  'insect':              { animalType: 'insect',    emoji: '🦋' },
  'spider/scorpion':     { animalType: 'insect',    emoji: '🕷️' },
  'fish':                { animalType: 'marine',    emoji: '🐟' },
  'marine invertebrate': { animalType: 'marine',    emoji: '🦑' },
};
const RARITY_RANK = { abundant: 0, common: 1, uncommon: 2, rare: 3, exceptional: 4 };
const TYPE_CAPS   = { bird: 12, mammal: 8, reptile: 6, amphibian: 5, insect: 4, marine: 6, other: 3 };

async function getEbirdObs(lat, lng, dist = 50) {
  if (!EBIRD_KEY) return [];
  // Try multiple back-windows: 90 days first, fall back to 365 if empty
  for (const back of [90, 365]) {
    const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${dist}&back=${back}&maxResults=500&includeProvisional=true`;
    const obs = await safeFetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
    if (!Array.isArray(obs) || obs.length === 0) continue;
    const now = Date.now();
    const results = obs
      .filter(o => o.comName && /^[a-z]{6}$/i.test(o.speciesCode ?? ''))
      .map(o => {
        const ageMs = o.obsDt ? now - new Date(o.obsDt).getTime() : 30 * 86400000;
        const ageDays = Math.max(0, ageMs / 86400000);
        const freq = ageDays < 5 ? 0.55 : ageDays < 12 ? 0.38 : ageDays < 21 ? 0.16 : 0.07;
        return {
          name: o.comName, scientificName: o.sciName ?? null,
          emoji: '🐦', animalType: 'bird',
          seasons: ['spring', 'summer', 'fall', 'winter'], bestSeason: 'spring',
          rarity: rarityFromChecklist(freq), frequency: freq,
          funFact: `Observed within ${dist} km (eBird, ${back}d window).`,
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
    if (results.length > 0) { console.log(`    eBird: ${results.length} birds (dist=${dist}, back=${back})`); return results; }
  }
  console.log(`    eBird: 0 results at dist=${dist}`);
  return [];
}

async function getInatSpecies(lat, lng, taxonKey) {
  const taxonId = INAT_TAXON_IDS[taxonKey];
  if (!taxonId) return [];
  const d1 = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const d2 = new Date().toISOString().slice(0, 10);
  const url =
    `https://api.inaturalist.org/v1/observations` +
    `?lat=${lat}&lng=${lng}&radius=50&per_page=50` +
    `&quality_grade=research&order_by=votes&order=desc&locale=en&preferred_place_id=1` +
    `&taxon_id=${taxonId}&d1=${d1}&d2=${d2}`;
  const data = await safeFetch(url);
  if (!data?.results?.length) return [];

  const specMap = {};
  data.results.forEach(obs => {
    const rank = obs.taxon?.rank;
    if (rank !== 'species' && rank !== 'subspecies') return;
    const name = obs.taxon?.preferred_common_name;
    if (!name) return;
    const iconic = (obs.taxon?.iconic_taxon_name ?? '').toLowerCase();
    const typeInfo = INAT_TYPE_MAP[iconic] ?? { type: 'other', emoji: '🐾' };
    const key = name.toLowerCase();
    if (!specMap[key]) specMap[key] = { count: 0, type: typeInfo.type, emoji: typeInfo.emoji, sciName: obs.taxon?.name ?? null, displayName: name };
    specMap[key].count++;
  });

  const total = data.results.length;
  return Object.entries(specMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 15)
    .map(([, info]) => ({
      name: info.displayName.charAt(0).toUpperCase() + info.displayName.slice(1),
      scientificName: info.sciName,
      emoji: info.emoji, animalType: info.type,
      seasons: ['spring', 'summer', 'fall', 'winter'], bestSeason: 'summer',
      rarity: rarityFromFreq(info.count / Math.max(1, total)),
      funFact: `Observed near this location (iNaturalist, 365d).`,
    }));
}

async function getNpsSpecies(parkCode) {
  if (!NPS_KEY || !parkCode) return [];
  // Try both /species and /species?limit=1000 to get full list
  const url = `https://developer.nps.gov/api/v1/species?parkCode=${parkCode}&limit=500&start=0`;
  const data = await safeFetch(url, { headers: { 'X-Api-Key': NPS_KEY } });
  if (!data?.data?.length) return [];
  const animals = [];
  for (const sp of data.data) {
    // NPS uses categoryName field (not taxonCode) for the English category name
    const catLower = (sp.categoryName ?? sp.taxonCode ?? '').toLowerCase();
    const typeInfo = Object.entries(NPS_TAXON_MAP).find(([k]) => catLower.includes(k))?.[1];
    if (!typeInfo) continue;
    const sciName = sp.sciName ?? null;
    if (!sciName || !/^[A-Z][a-z]+ [a-z]/.test(sciName)) continue;
    const commonName = (Array.isArray(sp.commonNames) ? sp.commonNames : [sp.commonNames])
      .find(n => n?.trim() && !isTaxonomicJunk(n)) ?? null;
    if (!commonName) continue;
    const abundanceLower = (sp.abundance ?? '').toLowerCase();
    let rarity = 'uncommon';
    if (abundanceLower === 'abundant') rarity = 'abundant';
    else if (abundanceLower === 'common') rarity = 'common';
    else if (abundanceLower === 'rare') rarity = 'rare';
    else if (abundanceLower === 'accidental' || abundanceLower === 'extirpated') rarity = 'exceptional';
    animals.push({
      name: commonName, scientificName: sciName,
      emoji: typeInfo.emoji, animalType: typeInfo.animalType,
      seasons: ['spring', 'summer', 'fall', 'winter'], bestSeason: 'summer',
      rarity, funFact: `Listed in the NPS species inventory for ${parkCode.toUpperCase()}.`,
    });
  }
  return animals;
}

function normSci(name) {
  if (!name?.trim()) return null;
  const parts = name.toLowerCase().trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0];
}

function dedup(animals) {
  const groups = new Map(), sciToKey = new Map();
  animals.forEach(a => {
    const nameKey = a.name.toLowerCase().trim();
    const sciKey  = normSci(a.scientificName);
    let gk = (sciKey && sciToKey.has(sciKey)) ? sciToKey.get(sciKey) : null;
    if (!gk && groups.has(nameKey)) gk = nameKey;
    if (!gk) gk = nameKey;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(a);
    if (sciKey && !sciToKey.has(sciKey)) sciToKey.set(sciKey, gk);
  });
  return [...groups.values()].map(g => g.reduce((b, a) => ((a.frequency ?? 0) > (b.frequency ?? 0) ? a : b)));
}

function balanceAndTop20(animals) {
  const counts = {};
  const kept = animals
    .sort((a, b) => (RARITY_RANK[a.rarity] ?? 2) - (RARITY_RANK[b.rarity] ?? 2))
    .filter(a => { const t = a.animalType ?? 'other'; counts[t] = (counts[t] ?? 0) + 1; return counts[t] <= (TYPE_CAPS[t] ?? 3); });
  return kept.slice(0, 20);
}

function slim(a) {
  return {
    name: a.name, emoji: a.emoji ?? '🐾', animalType: a.animalType ?? 'other',
    rarity: a.rarity ?? 'common', seasons: a.seasons ?? ['spring','summer','fall','winter'],
    scientificName: a.scientificName ?? null, funFact: a.funFact ?? null,
    photoUrl: a.photoUrl ?? null, source: 'static', sources: ['static'],
  };
}

async function patchPark(loc) {
  console.log(`\n  [${loc.id}] Patching with max parameters (50km, 365d, 30s timeout)…`);
  const pool = [];

  // eBird — primary bird source
  const birds = await getEbirdObs(loc.lat, loc.lng, 50);
  birds.forEach(a => pool.push({ ...a, _priority: 1 }));
  await sleep(500);

  // NPS — high-quality official list; try categoryName field
  if (loc.npsCode) {
    const nps = await getNpsSpecies(loc.npsCode);
    console.log(`    NPS (${loc.npsCode}): ${nps.length} species`);
    nps.forEach(a => pool.push({ ...a, _priority: 2 }));
    await sleep(600);
  }

  // iNat — all taxa with max radius + full year
  const taxaGroups = [['mammal', 'bird'], ['reptile', 'amphibian'], ['insect', 'marine'], ['bat', 'snake'], ['lizard', 'frog']];
  for (const pair of taxaGroups) {
    const results = await Promise.all(pair.map(t => getInatSpecies(loc.lat, loc.lng, t)));
    const flat = results.flat();
    flat.forEach(a => pool.push({ ...a, _priority: 3 }));
    if (flat.length) console.log(`    iNat [${pair.join('+')}]: ${flat.length} species`);
    await sleep(500);
  }

  const deduped = dedup(pool);
  const final = balanceAndTop20(deduped).map(slim);
  const birds2 = final.filter(a => a.animalType === 'bird').length;
  const mammals = final.filter(a => a.animalType === 'mammal').length;
  console.log(`  [${loc.id}] ✓ ${final.length} species (${birds2} birds, ${mammals} mammals) from pool of ${deduped.length}`);
  return final;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TARGET_IDS = [
  'mountrainier', 'yosemite', 'theodoreroosevelt', 'guadalupemountains',
  'haleakala', 'voyageurs', 'lakeclark',
];

console.log('\n🔧 Targeted patch for parks with no birds + no mammals');
console.log(`   Targets: ${TARGET_IDS.join(', ')}\n`);

// Read existing cache
const cachePath = path.join(ROOT, 'src', 'data', 'wildlifeCache.js');
const cacheContent = readFileSync(cachePath, 'utf8');

// Extract the builtAt from the file header
const builtAtMatch = cacheContent.match(/WILDLIFE_CACHE_BUILT_AT = "([^"]+)"/);
const builtAt = builtAtMatch?.[1] ?? new Date().toISOString();

// Parse all existing entries using regex to avoid eval issues
const allEntries = {};
const entryRegex = /"([^"]+)":\s*\{\s*builtAt:[^,]+,\s*animals:\s*(\[[\s\S]*?\]),\s*\},/g;
let m;
while ((m = entryRegex.exec(cacheContent)) !== null) {
  try { allEntries[m[1]] = JSON.parse(m[2]); } catch { allEntries[m[1]] = []; }
}
console.log(`Read ${Object.keys(allEntries).length} existing park entries from cache`);

// Patch each target park one at a time (sequential to avoid rate limits)
for (const locId of TARGET_IDS) {
  const loc = wildlifeLocations.find(l => l.id === locId);
  if (!loc) { console.warn(`  [${locId}] Not found in wildlifeLocations — skipping`); continue; }
  const newAnimals = await patchPark(loc);
  if (newAnimals.length > (allEntries[locId]?.length ?? 0)) {
    allEntries[locId] = newAnimals;
  } else {
    console.log(`  [${locId}] No improvement — keeping existing ${allEntries[locId]?.length ?? 0} species`);
  }
  await sleep(1500); // rest between parks
}

// Rebuild the cache file preserving all parks
const totalSpecies = Object.values(allEntries).reduce((s, v) => s + v.length, 0);
const lines = [
  `// Auto-generated by scripts/buildWildlifeCache.js — do not edit manually.`,
  `// Built: ${builtAt}`,
  `// Parks: ${Object.keys(allEntries).length} | Species bundled: ${totalSpecies}`,
  `// To regenerate: node scripts/buildWildlifeCache.js`,
  ``,
  `export const WILDLIFE_CACHE_BUILT_AT = ${JSON.stringify(builtAt)};`,
  ``,
  `export const WILDLIFE_CACHE = {`,
];
for (const [id, animals] of Object.entries(allEntries)) {
  lines.push(`  ${JSON.stringify(id)}: {`);
  lines.push(`    builtAt: ${JSON.stringify(builtAt)},`);
  lines.push(`    animals: ${JSON.stringify(animals, null, 2).replace(/\n/g, '\n    ')},`);
  lines.push(`  },`);
}
lines.push(`};`);
lines.push(``);

writeFileSync(cachePath, lines.join('\n'), 'utf8');
console.log(`\n✅ Patch complete: ${totalSpecies} total species across ${Object.keys(allEntries).length} parks`);
console.log(`   Written to ${cachePath}`);
