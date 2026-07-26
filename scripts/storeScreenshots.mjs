#!/usr/bin/env node
/**
 * scripts/storeScreenshots.mjs — regenerate the Google Play phone screenshots.
 *
 * Drives headless Chrome over the DevTools Protocol (CDP) at a real mobile
 * viewport and writes 4 PNGs at exactly 1080x1920 — 9:16 with both sides over
 * Play's 1080px "eligible for promotion" threshold.
 *
 * No dependencies: it talks to Chrome's debugger over the WebSocket that ships
 * with Node 22+, so there's no puppeteer install (~200MB Chromium) to maintain.
 *
 * Run:  node scripts/storeScreenshots.mjs [--out DIR] [--url ORIGIN]
 * Then: Play Console > Grow users > Store presence > Main store listing >
 *       Phone screenshots > Add assets.
 *
 * ── Gotchas this script exists to encode (all learned the hard way) ─────────
 * 1. `chrome --headless --screenshot --window-size=360,640 --force-device-scale
 *    -factor=3` does NOT work: window-size is DEVICE pixels, so the CSS layout
 *    viewport collapsed to 360/3 = 120px and every page rendered clipped and
 *    zoomed. Emulation.setDeviceMetricsOverride sets CSS px + DPR correctly.
 * 2. The first-run splash (gated on localStorage `wm_visited`) covers the app,
 *    so every shot would have been the splash. We set the flag and click the
 *    dismiss button before capturing.
 * 3. Setting `element.scrollTop` on a guessed selector silently did nothing —
 *    the real scroll container isn't the one you'd guess. Dispatching actual
 *    Input.dispatchMouseEvent wheel events scrolls whatever is under the
 *    cursor, which works regardless of DOM structure.
 * 4. "Near me" needs a location: we grant the permission and override
 *    geolocation (Denver) so the shot shows real nearby parks + rare birds.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const ORIGIN = arg('--url', 'https://wildlifeexplorer.us');
const OUT    = arg('--out', path.join(__dirname, '..', 'store-screenshots'));
const PORT   = 9339;

// Chrome on Windows / macOS / Linux.
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(p => existsSync(p));
if (!CHROME) { console.error('Chrome not found — edit the CHROME list.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--mute-audio', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(OUT, '.chrome-profile'), 'about:blank'], { stdio: 'ignore' });

let ws, id = 0; const pending = new Map();
const send = (method, params = {}, sessionId) => {
  const msg = { id: ++id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
  return new Promise(res => pending.set(msg.id, res));
};

async function main() {
  let info;
  for (let i = 0; i < 40 && !info; i++) {
    try { info = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()); }
    catch { await sleep(500); }
  }
  if (!info) throw new Error('Chrome debugger never came up');

  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, S);
  await send('Runtime.enable', {}, S);
  // 360x640 CSS px @ DPR 3 -> 1080x1920 output. See gotcha #1.
  await send('Emulation.setDeviceMetricsOverride',
    { width: 360, height: 640, deviceScaleFactor: 3, mobile: true }, S);
  // Gotcha #4 — Denver, so "Near me" has parks + rare birds to show.
  await send('Browser.grantPermissions', { origin: ORIGIN, permissions: ['geolocation'] });
  await send('Emulation.setGeolocationOverride',
    { latitude: 39.7392, longitude: -104.9903, accuracy: 50 }, S);

  // Navigate, mark as visited, dismiss the splash (gotcha #2), let data load.
  const open = async (url, wait = 10000) => {
    await send('Page.navigate', { url }, S);
    await sleep(2500);
    await send('Runtime.evaluate', { expression:
      `try{localStorage.setItem('wm_visited','1')}catch(e){};
       document.querySelector('.splash__btn')?.click(); true;` }, S);
    await sleep(wait);
  };
  // Real wheel events — gotcha #3.
  const wheel = async (times, y = 500) => {
    for (let i = 0; i < times; i++) {
      await send('Input.dispatchMouseEvent',
        { type: 'mouseWheel', x: 180, y, deltaX: 0, deltaY: 400, pointerType: 'mouse' }, S);
      await sleep(350);
    }
    await sleep(1000);
  };
  const shoot = async (file) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, S);
    writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
    console.log('  ✓', file);
  };

  console.log(`Capturing ${ORIGIN} -> ${OUT}`);

  // 1 — the map: header, species search, clustered park pins
  await open(`${ORIGIN}/`, 9000);
  await shoot('1-map.png');

  // 2 — a park: taxon counts, likelihood bar, first species card
  await open(`${ORIGIN}/state-park/ut/ut-dead-horse-point`, 11000);
  await shoot('2-park.png');

  // 3 — species depth: per-season odds, description, visitor tip
  await wheel(3);
  await shoot('3-species.png');

  // 4 — Near me + the rare-bird alerts (the most distinctive feature)
  await open(`${ORIGIN}/`, 9000);
  await send('Runtime.evaluate', { expression:
    `[...document.querySelectorAll('.hdr__about-btn')]
       .find(b=>/Near me/.test(b.textContent))?.click(); true;` }, S);
  await sleep(9000);
  await shoot('4-nearme.png');

  console.log('\nAll 4 written at 1080x1920 (9:16, promotion-eligible).');
  ws.close(); chrome.kill();
}

main().catch(e => { console.error('ERR', e.message); try { chrome.kill(); } catch {} process.exit(1); });
