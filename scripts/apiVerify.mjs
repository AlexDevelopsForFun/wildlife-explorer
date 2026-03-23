#!/usr/bin/env node
/**
 * Comprehensive live API verification for Wildlife Interactive Map
 * Tests: eBird · iNaturalist · NPS · GBIF · Photo APIs · End-to-End pipelines
 * Run: node scripts/apiVerify.mjs
 */

// Keys are loaded from .env — never hardcoded in source files.
// Run: node --env-file=.env scripts/apiVerify.mjs  (Node 20+)
// Or:  npx dotenv -e .env node scripts/apiVerify.mjs
const EBIRD_KEY = process.env.VITE_EBIRD_API_KEY ?? process.env.REACT_APP_EBIRD_API_KEY ?? '';
const NPS_KEY   = process.env.VITE_NPS_API_KEY   ?? process.env.REACT_APP_NPS_API_KEY   ?? '';
if (!EBIRD_KEY || !NPS_KEY) {
  console.error('❌  Missing API keys — ensure .env has VITE_EBIRD_API_KEY and VITE_NPS_API_KEY');
  process.exit(1);
}

const PARKS = {
  yellowstone:  { lat: 44.4279, lng: -110.5885, npsCode: 'yell', name: 'Yellowstone' },
  congaree:     { lat: 33.7948, lng:  -80.7826, npsCode: 'cong', name: 'Congaree' },
  rainier:      { lat: 46.8523, lng: -121.7603, npsCode: 'mora', name: 'Mount Rainier' },
  grandcanyon:  { lat: 36.1069, lng: -112.1129, npsCode: 'grca', name: 'Grand Canyon' },
  everglades:   { lat: 25.2866, lng:  -80.8987, npsCode: 'ever', name: 'Everglades' },
  zion:         { lat: 37.2982, lng: -113.0263, npsCode: 'zion', name: 'Zion' },
  acadia:       { lat: 44.3386, lng:  -68.2733, npsCode: 'acad', name: 'Acadia' },
  glacier:      { lat: 48.7596, lng: -113.7870, npsCode: 'glac', name: 'Glacier' },
  olympic:      { lat: 47.8021, lng: -123.6044, npsCode: 'olym', name: 'Olympic' },
  shenandoah:   { lat: 38.2928, lng:  -78.6796, npsCode: 'shen', name: 'Shenandoah' },
};

// ── Colour helpers ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
};
const ok   = (s) => `${C.green}✓${C.reset} ${s}`;
const fail = (s) => `${C.red}✗${C.reset} ${s}`;
const warn = (s) => `${C.yellow}⚠${C.reset} ${s}`;
const hdr  = (s) => `\n${C.bold}${C.cyan}── ${s} ${'─'.repeat(Math.max(0,60-s.length))}${C.reset}`;
const sub  = (s) => `  ${C.blue}▸${C.reset} ${s}`;

// ── Timing wrapper ────────────────────────────────────────────────────────────
async function timed(fn) {
  const t0 = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - t0 };
}

// ── Summary accumulator ───────────────────────────────────────────────────────
const summary = [];  // { api, endpoint, status, ms, note }
function record(api, endpoint, status, ms, note = '') {
  summary.push({ api, endpoint, status, ms, note });
}

// =============================================================================
// 1. eBird
// =============================================================================
async function testEbird() {
  console.log(hdr('1 · eBird'));

  // 1a. Hotspot geo lookup (nearest hotspot per park) for 5 parks
  const hotspotParks = ['yellowstone', 'congaree', 'rainier', 'grandcanyon', 'everglades'];
  const hotspotResults = {};

  console.log(sub('1a — Hotspot geo lookup (5 parks, dist=25 km)'));
  for (const id of hotspotParks) {
    const p = PARKS[id];
    const url = `https://api.ebird.org/v2/ref/hotspot/geo?lat=${p.lat}&lng=${p.lng}&dist=25&fmt=json`;
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } })
    );
    if (!res.ok) {
      console.log(`    ${fail(`${p.name}: HTTP ${res.status}`)} (${ms} ms)`);
      record('eBird', 'ref/hotspot/geo', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    const locId = data?.[0]?.locId ?? null;
    hotspotResults[id] = locId;
    console.log(`    ${ok(`${p.name}: ${locId ?? 'no hotspot found'} (${ms} ms)`)}`);
    record('eBird', 'ref/hotspot/geo', 'OK', ms, locId ?? 'no hotspot');
  }

  // 1b. Species list (spplist) for hotspots found
  console.log(sub('1b — Hotspot spplist (all-time species count)'));
  for (const [id, locId] of Object.entries(hotspotResults)) {
    if (!locId) { console.log(`    ${warn(`${PARKS[id].name}: skipped — no hotspot code`)}`); continue; }
    const url = `https://api.ebird.org/v2/product/spplist/${locId}`;
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } })
    );
    if (!res.ok) {
      console.log(`    ${fail(`${PARKS[id].name} (${locId}): HTTP ${res.status}`)} (${ms} ms)`);
      record('eBird', 'product/spplist', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const codes = await res.json();
    const count = Array.isArray(codes) ? codes.length : '?';
    console.log(`    ${ok(`${PARKS[id].name} (${locId}): ${count} all-time species (${ms} ms)`)}`);
    record('eBird', 'product/spplist', 'OK', ms, `${count} spp`);
  }

  // 1c. Bar chart frequency data for 3 hotspots
  console.log(sub('1c — Bar chart frequency data (3 parks)'));
  const barChartParks = ['yellowstone', 'congaree', 'everglades']
    .filter(id => hotspotResults[id]);
  for (const id of barChartParks) {
    const locId = hotspotResults[id];
    const url = `https://api.ebird.org/v2/product/barChart?r=${locId}&bYear=2014&eYear=2024&bMonth=1&eMonth=12`;
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } })
    );
    if (!res.ok) {
      console.log(`    ${fail(`${PARKS[id].name}: HTTP ${res.status}`)} (${ms} ms)`);
      record('eBird', 'product/barChart', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const text = await res.text();
    // Count data rows (lines with 48+ tab-separated values)
    const dataRows = text.split('\n').filter(l => l.split('\t').length >= 10);
    console.log(`    ${ok(`${PARKS[id].name} (${locId}): ${dataRows.length} species rows in CSV (${ms} ms)`)}`);
    record('eBird', 'product/barChart', 'OK', ms, `${dataRows.length} spp rows`);
    // Show first 3 species as a sample
    const samples = dataRows.slice(0, 3)
      .map(l => l.split('\t')[0].trim().replace(/\s*\([^)]+\)$/, ''));
    console.log(`      ${C.gray}Sample: ${samples.join(', ')}${C.reset}`);
  }

  // 1d. geo/recent with back=45 (verify HTTP 200, no 400 from invalid param)
  console.log(sub('1d — geo/recent back=45 (confirm HTTP 200, not 400)'));
  for (const id of ['yellowstone', 'congaree', 'rainier']) {
    const p = PARKS[id];
    const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${p.lat}&lng=${p.lng}&dist=25&back=45&maxResults=500&includeProvisional=true`;
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-eBirdApiToken': EBIRD_KEY } })
    );
    if (!res.ok) {
      console.log(`    ${fail(`${p.name}: HTTP ${res.status} — ${res.statusText}`)} (${ms} ms)`);
      record('eBird', 'data/obs/geo/recent', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const obs = await res.json();
    console.log(`    ${ok(`${p.name}: ${obs.length} recent observations (${ms} ms)`)}`);
    record('eBird', 'data/obs/geo/recent', 'OK', ms, `${obs.length} obs`);
    if (obs.length > 0) {
      console.log(`      ${C.gray}Most recent: ${obs[0].comName} (${obs[0].obsDt})${C.reset}`);
    }
  }
}

// =============================================================================
// 2. iNaturalist
// =============================================================================
async function testINat() {
  console.log(hdr('2 · iNaturalist'));

  const ICONIC_TAXA = [
    { key: 'bird',      inat: 'Aves'          },
    { key: 'mammal',    inat: 'Mammalia'       },
    { key: 'reptile',   inat: 'Reptilia'       },
    { key: 'amphibian', inat: 'Amphibia'       },
    { key: 'insect',    inat: 'Insecta'        },
    { key: 'marine',    inat: 'Actinopterygii' },
  ];

  const testParks = ['yellowstone', 'congaree', 'rainier', 'grandcanyon', 'everglades'];

  // 2a. species_counts endpoint per park × taxon
  console.log(sub('2a — species_counts (5 parks × 6 iconic taxa)'));
  const now = new Date();
  const d2 = now.toISOString().slice(0, 10);
  const d1 = new Date(now - 90 * 86400000).toISOString().slice(0, 10);

  for (const id of testParks) {
    const p = PARKS[id];
    const counts = {};
    let totalMs = 0;
    for (const { key, inat } of ICONIC_TAXA) {
      const url =
        `https://api.inaturalist.org/v1/observations/species_counts` +
        `?lat=${p.lat}&lng=${p.lng}&radius=20&per_page=200` +
        `&quality_grade=research&order_by=observations_count&order=desc&locale=en&preferred_place_id=1` +
        `&iconic_taxa[]=${inat}`;
      const { result: res, ms } = await timed(() => fetch(url));
      totalMs += ms;
      if (!res.ok) {
        counts[key] = `ERR ${res.status}`;
        record('iNaturalist', 'species_counts', 'FAIL', ms, `HTTP ${res.status}`);
        continue;
      }
      const { results } = await res.json();
      counts[key] = results?.length ?? 0;
      record('iNaturalist', 'species_counts', 'OK', ms, `${counts[key]} spp`);
    }
    const line = Object.entries(counts)
      .map(([k, v]) => `${k}:${v}`)
      .join('  ');
    console.log(`    ${ok(`${p.name} (${totalMs} ms total)`)}\n      ${C.gray}${line}${C.reset}`);
  }

  // 2b. Confirm quality_grade=research and locale=en headers/params work
  console.log(sub('2b — Verify quality_grade=research and locale=en work (single call)'));
  {
    const p = PARKS.yellowstone;
    const url =
      `https://api.inaturalist.org/v1/observations/species_counts` +
      `?lat=${p.lat}&lng=${p.lng}&radius=20&per_page=5` +
      `&quality_grade=research&locale=en&preferred_place_id=1&iconic_taxa[]=Mammalia`;
    const { result: res, ms } = await timed(() => fetch(url));
    if (!res.ok) {
      console.log(`    ${fail(`HTTP ${res.status}`)} (${ms} ms)`);
    } else {
      const { results } = await res.json();
      const names = (results ?? []).map(r => r.taxon?.preferred_common_name ?? r.taxon?.name).filter(Boolean);
      const hasEnglish = names.every(n => /^[A-Za-z\s'-]+$/.test(n));
      console.log(`    ${ok(`HTTP 200, ${names.length} results (${ms} ms)`)}`);
      console.log(`    ${hasEnglish ? ok('All preferred_common_name values are English') : warn('Some names may not be English')}`);
      console.log(`      ${C.gray}Sample: ${names.slice(0, 4).join(', ')}${C.reset}`);
    }
  }
}

// =============================================================================
// 3. NPS
// =============================================================================
async function testNPS() {
  console.log(hdr('3 · NPS Data API'));

  // 3a. /parks?fields=topics for 10 parks
  console.log(sub('3a — /parks?fields=topics (10 parks)'));
  const allParkIds = Object.keys(PARKS);
  const topicsPerPark = {};

  for (const id of allParkIds) {
    const p = PARKS[id];
    const url = `https://developer.nps.gov/api/v1/parks?parkCode=${p.npsCode}&fields=topics`;
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-Api-Key': NPS_KEY } })
    );
    if (!res.ok) {
      console.log(`    ${fail(`${p.name} (${p.npsCode}): HTTP ${res.status}`)} (${ms} ms)`);
      record('NPS', 'parks?fields=topics', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    const topicNames = (json.data?.[0]?.topics ?? []).map(t => t.name);
    topicsPerPark[id] = topicNames;
    record('NPS', 'parks?fields=topics', 'OK', ms, `${topicNames.length} topics`);
    console.log(`    ${ok(`${p.name} (${p.npsCode}): ${topicNames.length} topics (${ms} ms)`)}`);
  }

  // 3b. Wildlife topics found — highlight NPS_WILDLIFE_TOPICS matches
  const NPS_WILDLIFE_TOPICS = [
    'Bison', 'Elk', 'Horses (wild)', 'Wolves', 'Cats (wild)',
    'Whales', 'Alligators or Crocodiles', 'Tortoises and Turtles',
  ];
  console.log(sub('3b — Wildlife topic tag hits per park'));
  for (const [id, topics] of Object.entries(topicsPerPark)) {
    const hits = topics.filter(t => NPS_WILDLIFE_TOPICS.includes(t));
    if (hits.length) {
      console.log(`    ${ok(`${PARKS[id].name}: ${hits.join(', ')}`)}`);
    }
  }

  // 3c. Mountain Lion check at Yellowstone, Grand Canyon, Zion
  console.log(sub("3c — 'Cats (wild)' (→ Mountain Lion) at Yellowstone, Grand Canyon, Zion"));
  for (const id of ['yellowstone', 'grandcanyon', 'zion']) {
    if (!topicsPerPark[id]) {
      console.log(`    ${warn(`${PARKS[id].name}: not fetched above`)}`);
      continue;
    }
    const has = topicsPerPark[id].includes('Cats (wild)');
    console.log(`    ${has ? ok(`${PARKS[id].name}: ✓ 'Cats (wild)' present`) : fail(`${PARKS[id].name}: 'Cats (wild)' NOT found`)}`);
  }

  // 3d. Verify new API key works (not 403)
  console.log(sub('3d — API key validity (must return 200, not 403)'));
  {
    const url = 'https://developer.nps.gov/api/v1/parks?parkCode=yell&fields=fullName';
    const { result: res, ms } = await timed(() =>
      fetch(url, { headers: { 'X-Api-Key': NPS_KEY } })
    );
    if (res.status === 403) {
      console.log(`    ${fail(`Key rejected — HTTP 403`)} (${ms} ms)`);
    } else if (!res.ok) {
      console.log(`    ${warn(`HTTP ${res.status}`)} (${ms} ms)`);
    } else {
      const json = await res.json();
      const name = json.data?.[0]?.fullName ?? 'unknown';
      console.log(`    ${ok(`Key valid — returned "${name}" (${ms} ms)`)}`);
    }
  }
}

// =============================================================================
// 4. GBIF
// =============================================================================
async function testGBIF() {
  console.log(hdr('4 · GBIF'));

  const TEST_SPECIES = [
    { name: 'Ursus americanus', expected: 'American Black Bear'   },
    { name: 'Aquila chrysaetos', expected: 'Golden Eagle'          },
    { name: 'Alces alces',       expected: 'Moose'                 },
    { name: 'Puma concolor',     expected: 'Cougar'                },
    { name: 'Chelonia mydas',    expected: 'Green Sea Turtle'      },
  ];

  // 4a. GBIF occurrence search with bounding box around Yellowstone
  console.log(sub('4a — Occurrence search (bbox around Yellowstone)'));
  {
    const { lat, lng } = PARKS.yellowstone;
    const d = 0.5; // ~55 km half-side
    const url =
      `https://api.gbif.org/v1/occurrence/search` +
      `?decimalLatitude=${lat - d},${lat + d}` +
      `&decimalLongitude=${lng - d},${lng + d}` +
      `&kingdom=Animalia&limit=20&hasCoordinate=true`;
    const { result: res, ms } = await timed(() => fetch(url));
    if (!res.ok) {
      console.log(`    ${fail(`HTTP ${res.status}`)} (${ms} ms)`);
      record('GBIF', 'occurrence/search', 'FAIL', ms, `HTTP ${res.status}`);
    } else {
      const { results, count } = await res.json();
      console.log(`    ${ok(`${count.toLocaleString()} total hits; returned ${results?.length} (${ms} ms)`)}`);
      const sample = (results ?? []).slice(0, 3).map(r => r.species ?? r.genericName).filter(Boolean);
      console.log(`      ${C.gray}Sample species: ${sample.join(', ')}${C.reset}`);
      record('GBIF', 'occurrence/search', 'OK', ms, `${count} total`);
    }
  }

  // 4b. Species vernacular name lookups
  console.log(sub('4b — Vernacular name lookups (5 species)'));
  for (const { name, expected } of TEST_SPECIES) {
    // Step 1: species match to get usageKey
    const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}&kingdom=Animalia`;
    const { result: matchRes, ms: ms1 } = await timed(() => fetch(matchUrl));
    if (!matchRes.ok) {
      console.log(`    ${fail(`${name}: species/match HTTP ${matchRes.status}`)}`);
      record('GBIF', 'species/match', 'FAIL', ms1, name);
      continue;
    }
    const matchData = await matchRes.json();
    const usageKey = matchData.usageKey;
    if (!usageKey) {
      console.log(`    ${warn(`${name}: no usageKey returned`)}`);
      continue;
    }

    // Step 2: vernacular names
    const vnUrl = `https://api.gbif.org/v1/species/${usageKey}/vernacularNames?limit=20`;
    const { result: vnRes, ms: ms2 } = await timed(() => fetch(vnUrl));
    const totalMs = ms1 + ms2;
    if (!vnRes.ok) {
      console.log(`    ${fail(`${name}: vernacularNames HTTP ${vnRes.status}`)} (${totalMs} ms)`);
      record('GBIF', 'species/vernacularNames', 'FAIL', ms2, name);
      continue;
    }
    const { results: vns } = await vnRes.json();
    const eng = vns?.find(v => ['eng','en','english','en-us','en-gb'].includes(v.language?.toLowerCase()));
    const found = eng?.vernacularName ?? null;
    const check = found ? ok : warn;
    console.log(`    ${check(`${name} → "${found ?? 'NOT FOUND'}" (expected ~"${expected}") (${totalMs} ms)`)}`);
    record('GBIF', 'species/vernacularNames', found ? 'OK' : 'WARN', totalMs, `"${found}" vs "${expected}"`);
  }
}

// =============================================================================
// 5. Photo APIs
// =============================================================================
async function testPhotoAPIs() {
  console.log(hdr('5 · Photo APIs'));

  const TEST_ANIMALS = [
    'Bald Eagle', 'American Bison', 'Gray Wolf', 'Grizzly Bear',
    'Mountain Lion', 'American Alligator', 'Humpback Whale',
    'Osprey', 'White-tailed Deer', 'Peregrine Falcon',
  ];
  const WIKI_FALLBACK = ['Ocelot', 'Wolverine', 'Black-footed Ferret'];

  // 5a. iNaturalist taxa/autocomplete — photo URL
  console.log(sub('5a — iNat taxa/autocomplete (photo URL) for 10 animals'));
  let inatOk = 0, inatFail = 0;
  for (const name of TEST_ANIMALS) {
    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&locale=en&preferred_place_id=1`;
    const { result: res, ms } = await timed(() => fetch(url));
    if (!res.ok) {
      console.log(`    ${fail(`${name}: HTTP ${res.status}`)} (${ms} ms)`);
      inatFail++;
      record('Photo/iNat', 'taxa/autocomplete', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const { results } = await res.json();
    const match = results?.find(t =>
      t.preferred_common_name?.toLowerCase() === name.toLowerCase() ||
      t.name?.toLowerCase().includes(name.split(' ')[0].toLowerCase())
    ) ?? results?.[0];
    const photoUrl = match?.default_photo?.medium_url ?? null;
    const engName  = match?.preferred_common_name ?? match?.name ?? '?';
    if (photoUrl) {
      console.log(`    ${ok(`${name} → "${engName}" — photo ✓ (${ms} ms)`)}`);
      console.log(`      ${C.gray}${photoUrl.substring(0, 80)}...${C.reset}`);
      inatOk++;
      record('Photo/iNat', 'taxa/autocomplete', 'OK', ms, 'photo found');
    } else {
      console.log(`    ${warn(`${name}: matched "${engName}" but no photo URL (${ms} ms)`)}`);
      inatFail++;
      record('Photo/iNat', 'taxa/autocomplete', 'WARN', ms, 'no photo');
    }
  }
  console.log(`    ${C.gray}iNat photo result: ${inatOk} with photo, ${inatFail} missing${C.reset}`);

  // 5b. Wikipedia thumbnail fallback
  console.log(sub('5b — Wikipedia thumbnail fallback (3 animals)'));
  for (const name of WIKI_FALLBACK) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const { result: res, ms } = await timed(() => fetch(url));
    if (!res.ok) {
      console.log(`    ${fail(`${name}: HTTP ${res.status}`)} (${ms} ms)`);
      record('Photo/Wiki', 'page/summary', 'FAIL', ms, `HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    const thumb = data?.thumbnail?.source ?? null;
    if (thumb) {
      console.log(`    ${ok(`${name}: thumbnail found (${ms} ms)`)}`);
      console.log(`      ${C.gray}${thumb.substring(0, 80)}...${C.reset}`);
      record('Photo/Wiki', 'page/summary', 'OK', ms, 'thumb found');
    } else {
      console.log(`    ${warn(`${name}: no thumbnail in summary (${ms} ms)`)}`);
      record('Photo/Wiki', 'page/summary', 'WARN', ms, 'no thumb');
    }
  }
}

// =============================================================================
// 6. End-to-End Pipeline (3 parks)
// =============================================================================
async function testEndToEnd() {
  console.log(hdr('6 · End-to-End Pipeline (Yellowstone · Congaree · Mount Rainier)'));

  const INAT_TAXA_KEYS = [
    { key: 'bird',      inat: 'Aves'          },
    { key: 'mammal',    inat: 'Mammalia'       },
    { key: 'reptile',   inat: 'Reptilia'       },
    { key: 'amphibian', inat: 'Amphibia'       },
    { key: 'insect',    inat: 'Insecta'        },
    { key: 'marine',    inat: 'Actinopterygii' },
  ];

  function rarityFromObsCount(n) {
    if (n >= 100) return 'abundant';
    if (n >= 20)  return 'common';
    if (n >= 5)   return 'uncommon';
    if (n >= 2)   return 'rare';
    return 'exceptional';
  }
  function rarityFromChecklist(freq) {
    if (freq >= 0.70) return 'abundant';
    if (freq >= 0.30) return 'common';
    if (freq >= 0.10) return 'uncommon';
    if (freq >= 0.02) return 'rare';
    return 'exceptional';
  }

  const e2ePipeline = async (id) => {
    const p = PARKS[id];
    console.log(`\n  ${C.bold}${p.name}${C.reset}`);
    const t0 = Date.now();

    const allAnimals = [];
    const sources = [];

    // Step 1: NPS topics
    const npsUrl = `https://developer.nps.gov/api/v1/parks?parkCode=${p.npsCode}&fields=topics`;
    const npsRes = await fetch(npsUrl, { headers: { 'X-Api-Key': NPS_KEY } });
    const NPS_WT = {
      'Bison': { name:'American Bison',emoji:'🦬',animalType:'mammal',rarity:'abundant' },
      'Elk': { name:'Elk',emoji:'🦌',animalType:'mammal',rarity:'common' },
      'Horses (wild)': { name:'Wild Horse',emoji:'🐴',animalType:'mammal',rarity:'uncommon' },
      'Wolves': { name:'Gray Wolf',emoji:'🐺',animalType:'mammal',rarity:'uncommon' },
      'Cats (wild)': { name:'Mountain Lion',emoji:'🐆',animalType:'mammal',rarity:'rare' },
      'Whales': { name:'Humpback Whale',emoji:'🐋',animalType:'marine',rarity:'uncommon' },
      'Alligators or Crocodiles': { name:'American Alligator',emoji:'🐊',animalType:'reptile',rarity:'abundant' },
      'Tortoises and Turtles': { name:'Desert Tortoise',emoji:'🐢',animalType:'reptile',rarity:'uncommon' },
    };
    if (npsRes.ok) {
      const npsJson = await npsRes.json();
      const topicNames = new Set((npsJson.data?.[0]?.topics ?? []).map(t => t.name));
      const npsAnimals = Object.entries(NPS_WT)
        .filter(([topic]) => topicNames.has(topic))
        .map(([, info]) => ({ ...info, source: 'nps' }));
      if (npsAnimals.length) { allAnimals.push(...npsAnimals); sources.push('nps'); }
      console.log(`    NPS topics: ${npsAnimals.length} animals (${[...topicNames].filter(t => NPS_WT[t]).map(t => NPS_WT[t].name).join(', ') || 'none'})`);
    }

    // Step 2: eBird geo/recent
    const ebirdUrl =
      `https://api.ebird.org/v2/data/obs/geo/recent` +
      `?lat=${p.lat}&lng=${p.lng}&dist=25&back=45&maxResults=500&includeProvisional=true`;
    const ebirdRes = await fetch(ebirdUrl, { headers: { 'X-eBirdApiToken': EBIRD_KEY } });
    let ebirdCount = 0;
    if (ebirdRes.ok) {
      const obs = await ebirdRes.json();
      const valid = (obs ?? []).filter(o => /^[a-z]{6}$/i.test(o.speciesCode ?? ''));
      valid.forEach(o => allAnimals.push({ name: o.comName, animalType: 'bird', rarity: rarityFromChecklist(0.3), source: 'ebird' }));
      ebirdCount = valid.length;
      if (ebirdCount) sources.push('ebird');
      console.log(`    eBird geo/recent: ${ebirdCount} valid species`);
    }

    // Step 3: iNat (all 6 groups)
    let inatTotal = 0;
    const inatBreakdown = {};
    for (const { key, inat } of INAT_TAXA_KEYS) {
      const url =
        `https://api.inaturalist.org/v1/observations/species_counts` +
        `?lat=${p.lat}&lng=${p.lng}&radius=20&per_page=200` +
        `&quality_grade=research&order_by=observations_count&order=desc&locale=en&preferred_place_id=1` +
        `&iconic_taxa[]=${inat}`;
      const res = await fetch(url);
      if (!res.ok) { inatBreakdown[key] = 0; continue; }
      const { results } = await res.json();
      const valid = (results ?? []).filter(r =>
        (r.taxon?.rank === 'species' || r.taxon?.rank === 'subspecies') &&
        r.taxon?.preferred_common_name
      );
      valid.forEach(r => allAnimals.push({
        name: r.taxon.preferred_common_name,
        animalType: key,
        rarity: rarityFromObsCount(r.count),
        source: 'inaturalist',
      }));
      inatBreakdown[key] = valid.length;
      inatTotal += valid.length;
    }
    if (inatTotal) sources.push('inaturalist');
    console.log(`    iNat total: ${inatTotal} species  |  breakdown: ${Object.entries(inatBreakdown).map(([k,v]) => `${k}:${v}`).join('  ')}`);

    // Dedup by lowercase name
    const seen = new Set();
    const deduped = allAnimals.filter(a => {
      const key = a.name?.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Breakdown by type
    const byType = {};
    const byRarity = {};
    deduped.forEach(a => {
      byType[a.animalType]   = (byType[a.animalType]   ?? 0) + 1;
      byRarity[a.rarity]    = (byRarity[a.rarity]    ?? 0) + 1;
    });

    const elapsed = Date.now() - t0;
    console.log(`    ${C.bold}Total deduped species: ${deduped.length}  |  Sources: ${sources.join(', ')}  (${elapsed} ms)${C.reset}`);
    console.log(`    By type:   ${Object.entries(byType).map(([k,v]) => `${k}:${v}`).join('  ')}`);
    console.log(`    By rarity: ${['abundant','common','uncommon','rare','exceptional'].map(r => `${r}:${byRarity[r]??0}`).join('  ')}`);

    record('E2E', `pipeline/${id}`, 'OK', elapsed, `${deduped.length} species, ${sources.join('+')}`);
    return { id, name: p.name, total: deduped.length, byType, byRarity, sources, ms: elapsed };
  };

  const results = [];
  for (const id of ['yellowstone', 'congaree', 'rainier']) {
    try {
      const r = await e2ePipeline(id);
      results.push(r);
    } catch (err) {
      console.log(`  ${fail(`${PARKS[id].name}: pipeline error — ${err.message}`)}`);
    }
  }
  return results;
}

// =============================================================================
// 7. Health Summary Table
// =============================================================================
function printSummary() {
  console.log(hdr('7 · API Health Summary'));

  // Aggregate by API
  const byApi = {};
  for (const r of summary) {
    if (!byApi[r.api]) byApi[r.api] = { ok: 0, warn: 0, fail: 0, ms: [] };
    if (r.status === 'OK')   byApi[r.api].ok++;
    if (r.status === 'WARN') byApi[r.api].warn++;
    if (r.status === 'FAIL') byApi[r.api].fail++;
    byApi[r.api].ms.push(r.ms);
  }

  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);

  console.log(`\n  ${C.bold}${pad('API', 18)} ${pad('Calls', 7)} ${pad('OK', 5)} ${pad('WARN', 6)} ${pad('FAIL', 6)} ${pad('Avg ms', 8)} ${pad('Max ms', 8)}${C.reset}`);
  console.log(`  ${'─'.repeat(66)}`);

  for (const [api, stats] of Object.entries(byApi)) {
    const total = stats.ok + stats.warn + stats.fail;
    const avg = Math.round(stats.ms.reduce((a,b) => a+b, 0) / stats.ms.length);
    const max = Math.max(...stats.ms);
    const statusColor = stats.fail > 0 ? C.red : stats.warn > 0 ? C.yellow : C.green;
    console.log(
      `  ${pad(api, 18)} ${lpad(total, 5)}   ` +
      `${C.green}${lpad(stats.ok, 3)}${C.reset}   ` +
      `${stats.warn > 0 ? C.yellow : C.gray}${lpad(stats.warn, 4)}${C.reset}   ` +
      `${stats.fail > 0 ? C.red : C.gray}${lpad(stats.fail, 4)}${C.reset}   ` +
      `${lpad(avg, 6)}   ${lpad(max, 6)}`
    );
  }

  // Overall status
  const totalFails = summary.filter(r => r.status === 'FAIL').length;
  const totalWarns = summary.filter(r => r.status === 'WARN').length;
  const totalOk    = summary.filter(r => r.status === 'OK').length;
  console.log(`\n  ${C.bold}Overall: ${totalOk} passed, ${totalWarns} warnings, ${totalFails} failed${C.reset}`);

  if (totalFails === 0 && totalWarns === 0) {
    console.log(`  ${C.green}${C.bold}All APIs healthy ✓${C.reset}`);
  } else if (totalFails === 0) {
    console.log(`  ${C.yellow}All APIs functional, minor warnings noted${C.reset}`);
  } else {
    console.log(`  ${C.red}${totalFails} failures require attention${C.reset}`);
    console.log('\n  Failed calls:');
    for (const r of summary.filter(s => s.status === 'FAIL')) {
      console.log(`    ${C.red}✗${C.reset} ${r.api} › ${r.endpoint} — ${r.note}`);
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================
(async () => {
  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════════╗`);
  console.log(`║     Wildlife Interactive Map — Live API Verification       ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.gray}${new Date().toISOString()}${C.reset}`);

  try { await testEbird();      } catch (e) { console.log(fail(`eBird section crashed: ${e.message}`)); }
  try { await testINat();       } catch (e) { console.log(fail(`iNat section crashed: ${e.message}`)); }
  try { await testNPS();        } catch (e) { console.log(fail(`NPS section crashed: ${e.message}`)); }
  try { await testGBIF();       } catch (e) { console.log(fail(`GBIF section crashed: ${e.message}`)); }
  try { await testPhotoAPIs();  } catch (e) { console.log(fail(`Photo section crashed: ${e.message}`)); }
  try { await testEndToEnd();   } catch (e) { console.log(fail(`E2E section crashed: ${e.message}`)); }

  printSummary();
  console.log('');
})();
