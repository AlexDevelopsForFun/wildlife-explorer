#!/usr/bin/env node
/**
 * scripts/testSeenList.js
 *
 * Headless regression suite for the personal life-list engine
 * (src/services/seenList.js). Installs an in-memory localStorage shim
 * before importing the module, so the storage logic is fully testable
 * without a browser — same plain-Node harness/exit contract as the other
 * suites. Covers identity keying, idempotent first-sighting, toggle,
 * per-park progress (incl. de-dupe so pct can't exceed 100%), and storage
 * failure resilience (must never throw into a render).
 */

// ── in-memory localStorage shim (must exist before the module import) ──────
let store = {};
let failMode = false;
globalThis.localStorage = {
  getItem: (k) => { if (failMode) throw new Error('blocked'); return k in store ? store[k] : null; },
  setItem: (k, v) => { if (failMode) throw new Error('quota'); store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const m = await import('../src/services/seenList.js');

let passed = 0, failed = 0;
const failures = [];
function assertEqual(actual, expected, label) {
  if (actual === expected) passed++;
  else { failed++; failures.push({ label, detail: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` }); }
}
function reset() { store = {}; failMode = false; }

console.log(`\n🧪 Life-list (seenList) regression suite\n`);

// ── 1. speciesKey identity ────────────────────────────────────────────────
assertEqual(m.speciesKey({ name: 'Bison', scientificName: 'Bison bison' }), 'bison bison',
  'speciesKey: scientificName wins, lowercased');
assertEqual(m.speciesKey({ name: 'Coyote' }), 'coyote',
  'speciesKey: falls back to common name when no scientificName');
assertEqual(m.speciesKey('Elk'), 'elk', 'speciesKey: bare string');
assertEqual(m.speciesKey(null), '', 'speciesKey: null → empty (no crash)');
assertEqual(m.speciesKey({ name: '', scientificName: '  ' }), '',
  'speciesKey: blank fields → empty');

// ── 2. mark / is / unmark ─────────────────────────────────────────────────
reset();
const bison = { name: 'Bison', scientificName: 'Bison bison' };
assertEqual(m.isSeen(bison), false, 'isSeen: false before marking');
assertEqual(m.markSeen(bison, { parkId: 'yellowstone', parkName: 'Yellowstone' }), true, 'markSeen: persists');
assertEqual(m.isSeen(bison), true, 'isSeen: true after marking');
assertEqual(m.getSeenCount(), 1, 'getSeenCount: 1');
assertEqual(m.markUnseen(bison), true, 'markUnseen: persists');
assertEqual(m.isSeen(bison), false, 'isSeen: false after unmarking');
assertEqual(m.getSeenCount(), 0, 'getSeenCount: back to 0');

// ── 3. idempotent markSeen keeps the FIRST sighting ──────────────────────
reset();
m.markSeen(bison, { parkId: 'yellowstone', parkName: 'Yellowstone' });
m.markSeen(bison, { parkId: 'grandteton', parkName: 'Grand Teton' }); // 2nd ignored
const ll = m.getLifeList();
assertEqual(ll.length, 1, 'idempotent: still one entry after re-mark');
assertEqual(ll[0].firstParkId, 'yellowstone', 'idempotent: first park preserved');

// ── 4. toggle ─────────────────────────────────────────────────────────────
reset();
assertEqual(m.toggleSeen(bison, { parkId: 'zion' }), true, 'toggle: off→on returns true');
assertEqual(m.isSeen(bison), true, 'toggle: now seen');
assertEqual(m.toggleSeen(bison), false, 'toggle: on→off returns false');
assertEqual(m.isSeen(bison), false, 'toggle: now unseen');

// ── 5. parkProgress (incl. de-dupe + empty) ──────────────────────────────
reset();
assertEqual(m.parkProgress([]).pct, 0, 'parkProgress: empty park → 0%');
assertEqual(m.parkProgress(null).total, 0, 'parkProgress: null → total 0 (no crash)');
const parkAnimals = [
  { name: 'Bison', scientificName: 'Bison bison' },
  { name: 'Elk', scientificName: 'Cervus canadensis' },
  { name: 'Elk', scientificName: 'Cervus canadensis' }, // dupe — must not double-count
  { name: 'Gray Wolf', scientificName: 'Canis lupus' },
];
m.markSeen(parkAnimals[0]);
m.markSeen(parkAnimals[1]);
const prog = m.parkProgress(parkAnimals);
assertEqual(prog.total, 3, 'parkProgress: de-duped total = 3 (Elk once)');
assertEqual(prog.seen, 2, 'parkProgress: seen = 2');
assertEqual(prog.pct, 67, 'parkProgress: pct rounded = 67');

// ── 6. clearAll ───────────────────────────────────────────────────────────
reset();
m.markSeen(bison); m.markSeen({ name: 'Moose' });
assertEqual(m.getSeenCount(), 2, 'pre-clear count = 2');
assertEqual(m.clearAll(), true, 'clearAll persists');
assertEqual(m.getSeenCount(), 0, 'post-clear count = 0');

// ── 7. storage-failure resilience (must never throw) ─────────────────────
reset();
failMode = true;
let threw = false;
try {
  assertEqual(m.markSeen(bison), false, 'markSeen under storage failure → false');
  assertEqual(m.isSeen(bison), false, 'isSeen under storage failure → false');
  assertEqual(m.getSeenCount(), 0, 'getSeenCount under storage failure → 0');
  assertEqual(m.parkProgress(parkAnimals).seen, 0, 'parkProgress under storage failure → 0 seen');
} catch { threw = true; }
assertEqual(threw, false, 'no function throws when storage is unavailable');

// ── 8. getMilestone — counting-up goal ladder ────────────────────────────
{
  const m0 = m.getMilestone(0);
  assertEqual(m0.current, null, 'milestone: 0 → no current tier');
  assertEqual(m0.next?.at, 1, 'milestone: 0 → next is First Sighting (1)');
  assertEqual(m0.toNext, 1, 'milestone: 0 → 1 to next');

  const m1 = m.getMilestone(1);
  assertEqual(m1.current?.label, 'First Sighting', 'milestone: 1 → First Sighting');
  assertEqual(m1.next?.at, 5, 'milestone: 1 → next Spotter (5)');
  assertEqual(m1.toNext, 4, 'milestone: 1 → 4 to Spotter');

  const m12 = m.getMilestone(12);
  assertEqual(m12.current?.label, 'Tracker', 'milestone: 12 → Tracker (10)');
  assertEqual(m12.next?.at, 25, 'milestone: 12 → next Naturalist (25)');
  assertEqual(m12.toNext, 13, 'milestone: 12 → 13 to Naturalist');

  const mMax = m.getMilestone(500);
  assertEqual(mMax.current?.label, 'Master Naturalist', 'milestone: 500 → top tier');
  assertEqual(mMax.next, null, 'milestone: past top → no next');
  assertEqual(mMax.toNext, null, 'milestone: past top → toNext null');

  assertEqual(m.MILESTONES.length, 7, 'milestone: 7 tiers defined');
}

// ── 9. import + share-token round-trip (no-backend portability) ──────────
{
  reset();
  m.markSeen({ name: 'Bison', scientificName: 'Bison bison' }, { parkId: 'yellowstone', parkName: 'Yellowstone' });
  m.markSeen({ name: 'Elk', scientificName: 'Cervus canadensis' }, { parkId: 'rmnp', parkName: 'Rocky Mountain' });
  const tok = m.encodeShareToken();
  assertEqual(typeof tok === 'string' && tok.length > 0 && tok[0] === '1', true,
    'share token: non-empty, versioned');

  // Decode → entries; wipe; re-import → identical set restored.
  const entries = m.decodeShareToken(tok);
  assertEqual(Array.isArray(entries) && entries.length === 2, true,
    'decodeShareToken: 2 entries');
  reset();
  assertEqual(m.getSeenCount(), 0, 'pre-restore empty');
  const r = m.importLifeList(entries);
  assertEqual(r && r.imported, 2, 'importLifeList: 2 restored');
  assertEqual(m.isSeen({ scientificName: 'Bison bison' }), true, 'restored: Bison seen');
  assertEqual(m.isSeen({ scientificName: 'Cervus canadensis' }), true, 'restored: Elk seen');

  // Import accepts the export payload shape too.
  reset();
  const r2 = m.importLifeList({ schema: 'wm_seen_v1', species: entries });
  assertEqual(r2 && r2.imported, 2, 'importLifeList: accepts {species:[…]} payload');

  // First-sighting wins: a later-ts import must not overwrite an earlier ts.
  reset();
  m.markSeen({ name: 'Moose', scientificName: 'Alces alces' }, { parkId: 'isleroyale', parkName: 'Isle Royale' });
  const early = m.getLifeList()[0].ts;
  m.importLifeList([{ key: 'alces alces', name: 'Moose', firstParkName: 'Wrong', ts: '2099-01-01T00:00:00Z' }]);
  assertEqual(m.getLifeList()[0].ts, early, 'import: later ts does not clobber earlier sighting');

  assertEqual(m.decodeShareToken('garbage'), null, 'decodeShareToken: malformed → null');
  reset();
  assertEqual(m.encodeShareToken(), '', 'encodeShareToken: empty list → empty string');
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`📊 Results`);
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
if (failed > 0) {
  console.log(`\n❌ Failures:`);
  for (const f of failures.slice(0, 8)) {
    console.log(`   • ${f.label}`);
    if (f.detail) console.log(`     ${f.detail}`);
  }
  if (failures.length > 8) console.log(`   … and ${failures.length - 8} more`);
  process.exit(1);
}
console.log(`\n✅ All ${passed} assertions passed.\n`);
