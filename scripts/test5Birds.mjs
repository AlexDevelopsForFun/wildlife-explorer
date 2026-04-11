/**
 * test5Birds.mjs — Quick S&T occurrence test for 5 Yellowstone birds.
 *
 * Tests: amerob, osprey, baleag, daejun, cangoo
 * Uses pre-downloaded 9km GeoTIFFs in scripts/geotiff-cache/
 * Yellowstone center: 44.4280, -110.5885
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fromArrayBuffer } from 'geotiff';
import proj4 from 'proj4';

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIFF_DIR = join(ROOT, 'scripts', 'geotiff-cache');

// Yellowstone center coordinates
const LAT = 44.4280;
const LNG = -110.5885;

const EQUAL_EARTH = '+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
const SEASON_NAMES = ['summer (breeding)', 'winter (non-breeding)', 'spring (pre-breeding mig)', 'fall (post-breeding mig)'];

const RARITY_RANK = { guaranteed: 0, very_likely: 1, likely: 2, unlikely: 3, rare: 4, exceptional: 5 };
const rarityFromProb = p => {
  if (p >= 0.90) return 'guaranteed';
  if (p >= 0.60) return 'very_likely';
  if (p >= 0.30) return 'likely';
  if (p >= 0.10) return 'unlikely';
  if (p >= 0.02) return 'rare';
  return 'exceptional';
};

async function extractOccurrence(tiffPath, lat, lng) {
  const buf   = readFileSync(tiffPath);
  const tiff  = await fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const image = await tiff.getImage();
  const bbox  = image.getBoundingBox();   // [minX, minY, maxX, maxY] in Equal Earth metres
  const w     = image.getWidth();
  const h     = image.getHeight();

  const [easting, northing] = proj4('EPSG:4326', EQUAL_EARTH, [lng, lat]);
  const cx = Math.round((easting  - bbox[0]) / (bbox[2] - bbox[0]) * w);
  const cy = Math.round((bbox[3] - northing) / (bbox[3] - bbox[1]) * h);

  // Read 4 bands separately, ±4 pixel radius = ±36km
  const RADIUS = 4;
  const x0 = Math.max(0, cx - RADIUS);
  const y0 = Math.max(0, cy - RADIUS);
  const x1 = Math.min(w - 1, cx + RADIUS);
  const y1 = Math.min(h - 1, cy + RADIUS);
  const pw  = x1 - x0 + 1;
  const ph  = y1 - y0 + 1;

  const rasters = await image.readRasters({ window: [x0, y0, x1 + 1, y1 + 1] });

  const result = {};
  const nonzero = {};
  for (let b = 0; b < 4; b++) {
    const season = ['summer', 'winter', 'spring', 'fall'][b];
    const vals = Array.from(rasters[b]).filter(v => isFinite(v) && v > 0 && v <= 1);
    nonzero[season] = vals.length;
    result[season]  = vals.length > 0 ? vals.reduce((a, x) => a + x, 0) / vals.length : 0;
  }
  return { occ: result, nonzero, bbox, cx, cy, pw, ph };
}

const TEST_SPECIES = [
  { code: 'amerob', name: 'American Robin',  existing: 'very_likely' },
  { code: 'osprey', name: 'Osprey',           existing: 'likely'      },
  { code: 'baleag', name: 'Bald Eagle',       existing: 'very_likely' },
  { code: 'daejun', name: 'Dark-eyed Junco',  existing: 'likely'      },
  { code: 'cangoo', name: 'Canada Goose',     existing: 'likely'      },
];

console.log('══════════════════════════════════════════════════════');
console.log('  eBird S&T 5-Bird Test — Yellowstone (±4px = ±36km)  ');
console.log(`  Lat: ${LAT}  Lng: ${LNG}`);
console.log('══════════════════════════════════════════════════════\n');

for (const sp of TEST_SPECIES) {
  const tiffPath = join(TIFF_DIR, `${sp.code}_seasonal_9km.tif`);
  if (!existsSync(tiffPath)) {
    console.log(`❌  ${sp.name} (${sp.code}) — file not found: ${tiffPath}`);
    continue;
  }

  const { occ, nonzero, cx, cy, pw, ph } = await extractOccurrence(tiffPath, LAT, LNG);
  const maxProb  = Math.max(...Object.values(occ));
  const newRarity = rarityFromProb(maxProb);
  const existingRank = RARITY_RANK[sp.existing] ?? 99;
  const newRank      = RARITY_RANK[newRarity]   ?? 99;
  const arrow = newRank < existingRank ? '⬆ UPGRADE' : newRank > existingRank ? '⬇ downgrade' : '= same';

  console.log(`${sp.name} (${sp.code})`);
  console.log(`  Grid pixel: (${cx}, ${cy})  Window: ${pw}×${ph}`);
  console.log(`  Non-zero pixels per band: summer=${nonzero.summer} winter=${nonzero.winter} spring=${nonzero.spring} fall=${nonzero.fall}`);
  console.log(`  Occurrence:  summer=${(occ.summer*100).toFixed(1)}%  winter=${(occ.winter*100).toFixed(1)}%  spring=${(occ.spring*100).toFixed(1)}%  fall=${(occ.fall*100).toFixed(1)}%`);
  console.log(`  Max season:  ${(maxProb*100).toFixed(1)}%  →  ${newRarity}`);
  console.log(`  Existing: ${sp.existing}  →  ${arrow}`);
  console.log();
}
