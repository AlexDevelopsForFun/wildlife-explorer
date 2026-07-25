// Privacy policy page (/privacy) — a STANDALONE static page, deliberately not
// the React app: it must render for anyone (Google Play reviewers, crawlers,
// JS-disabled browsers) without booting a 2MB SPA, and must never be replaced
// by the map after hydration.
//
// Everything below is verified against the code, not boilerplate:
//   • geolocation  → src/App.jsx navigator.geolocation.getCurrentPosition (Near me)
//   • on-device    → localStorage keys wm_seen_v1, wm_sightings_v1, wm_theme, …
//   • feedback     → api/feedback.js (category, park, message, optional email)
//   • error logs   → api/log-error.js (msg, stack, url, user-agent)
//   • analytics    → @vercel/analytics (aggregate, cookieless)
// If any of those change, update this file in the same commit.

export const PRIVACY_UPDATED = '24 July 2026';

const SECTIONS = [
  ['The short version', `
    <p>US Wildlife Explorer is a free wildlife map run by one person. There are
    <strong>no accounts, no sign-up, no passwords, and no advertising</strong>.
    We don't sell or share your personal information, and we don't build profiles
    about you.</p>
    <p>Your life list and preferences are stored <strong>on your own device</strong>,
    not on our servers.</p>`],

  ['What this policy covers', `
    <p>This policy applies to the website at
    <a href="https://wildlifeexplorer.us">wildlifeexplorer.us</a> and to the
    <strong>US Wildlife Explorer Android app</strong>, which displays that same
    website.</p>`],

  ['Information stored on your device', `
    <p>The app saves the following in your browser's local storage. It stays on
    your device and is <strong>never sent to us</strong>:</p>
    <ul>
      <li><strong>Your life list</strong> — the species you mark as seen.</li>
      <li><strong>Sightings you report</strong> for a park.</li>
      <li><strong>Preferences</strong> — light/dark theme, season and time-of-day
          settings, and whether park photos are shown.</li>
      <li><strong>Cached wildlife data</strong>, so the app keeps working offline
          in parks with no signal.</li>
    </ul>
    <p>You can erase all of it at any time by clearing your browser's site data
    (or clearing the app's storage on Android). Doing so also erases your life
    list, so you may want to export it first using the export button on the
    life-list screen.</p>`],

  ['Location', `
    <p>Location is used for <strong>one optional feature</strong>: the
    &ldquo;Near me&rdquo; button, which lists the parks closest to you.</p>
    <ul>
      <li>Your browser or phone will ask your permission first. If you decline,
          everything else in the app still works.</li>
      <li>Your coordinates are used <strong>in your browser</strong> to sort parks
          by distance. <strong>We never store your location</strong>, and it is
          never written to our servers or database.</li>
      <li>For the &ldquo;rare birds nearby&rdquo; list, your coordinate is
          <strong>rounded to roughly one kilometre</strong> before it is used to
          query the eBird API — enough to describe an area, not enough to
          identify where you are.</li>
    </ul>`],

  ['If you contact us', `
    <p>If you use the Feedback form, we receive what you type: the category, the
    park it relates to, your message, and — only if you choose to provide it —
    an email address so we can reply. It is relayed to our email inbox through
    Web3Forms and used solely to answer you or fix the problem you reported.
    We don't add you to any mailing list.</p>`],

  ['Error reports', `
    <p>If something in the app crashes, a technical error report is written to
    our server logs: the error message, a stack trace, the page address, and your
    browser type. This is used only to find and fix bugs, and is not linked to
    your identity.</p>`],

  ['Analytics', `
    <p>We use Vercel Web Analytics to count page views so we know which parks and
    features people use. It is <strong>cookieless and aggregated</strong> — it
    does not track you across other websites and does not build an individual
    profile of you.</p>`],

  ['Cookies', `
    <p>We don't use tracking or advertising cookies. The only data stored in your
    browser is the on-device information described above.</p>`],

  ['Other services we rely on', `
    <p>Wildlife information comes from public scientific databases, and the app is
    hosted and served by third parties. As with any website, these services
    receive your IP address as a normal part of delivering content:</p>
    <ul>
      <li><strong>eBird</strong> (Cornell Lab of Ornithology), <strong>iNaturalist</strong>,
          <strong>GBIF</strong>, and the <strong>National Park Service</strong> — species records.</li>
      <li><strong>Wikipedia / Wikimedia Commons</strong> — species and park photos.</li>
      <li><strong>OpenStreetMap</strong> and <strong>CARTO</strong> — map tiles.</li>
      <li><strong>Vercel</strong> — hosting and analytics.</li>
      <li><strong>Web3Forms</strong> — delivering feedback messages.</li>
      <li><strong>Buy Me a Coffee</strong> — if you choose to donate. Payments are
          handled entirely on their site under their own privacy policy; we never
          see your card details.</li>
    </ul>`],

  ['Children', `
    <p>US Wildlife Explorer is a general-audience nature app. It is not directed
    at children under 13, and we do not knowingly collect personal information
    from them.</p>`],

  ['Your choices and your data', `
    <ul>
      <li><strong>Location:</strong> decline the permission prompt, or turn it off
          in your browser or phone settings.</li>
      <li><strong>Your life list and preferences:</strong> export or clear them at
          any time from the app; clearing site data removes them completely.</li>
      <li><strong>Messages you sent us:</strong> email us and we'll delete them
          from our inbox.</li>
    </ul>`],

  ['Changes to this policy', `
    <p>If this policy changes, the date at the top of the page will change with
    it. Significant changes will be noted in the app's &ldquo;What's new&rdquo;
    section.</p>`],

  ['Contact', `
    <p>Questions about privacy, or a request about your data? Email
    <a href="mailto:contact@wildlifeexplorer.us">contact@wildlifeexplorer.us</a>.</p>`],
];

export function renderPrivacyHtml(origin = 'https://wildlifeexplorer.us') {
  const title = 'Privacy Policy | US Wildlife Explorer';
  const desc  = 'How US Wildlife Explorer handles your data: no accounts, no ads, no tracking. Your life list stays on your device and location is only used for the optional "Near me" feature.';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta name="theme-color" content="#0c3823" />
<link rel="canonical" href="${origin}/privacy" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${origin}/privacy" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<link rel="icon" type="image/png" href="/icon-192.png" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    background: #0a2417; color: rgba(255,255,255,0.82);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
    font-size: 16px; line-height: 1.7;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 22px 80px; }
  header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 22px; margin-bottom: 8px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: #86efac; font-weight: 700; font-size: 15px; }
  .brand img { width: 30px; height: 30px; border-radius: 7px; }
  h1 { color: #fff; font-size: 30px; line-height: 1.25; letter-spacing: -0.5px; margin: 22px 0 6px; }
  .updated { color: rgba(255,255,255,0.5); font-size: 13.5px; margin: 0; }
  h2 { color: #86efac; font-size: 18px; letter-spacing: -0.2px; margin: 34px 0 8px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 7px; }
  strong { color: #fff; font-weight: 650; }
  a { color: #86efac; }
  a:hover { color: #bbf7d0; }
  footer { margin-top: 46px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 14px; }
  @media (max-width: 560px) { .wrap { padding: 22px 16px 60px; } h1 { font-size: 25px; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <a class="brand" href="/"><img src="/icon-192.png" alt="" width="30" height="30" /> US Wildlife Explorer</a>
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: ${PRIVACY_UPDATED}</p>
  </header>
${SECTIONS.map(([h, body]) => `  <h2>${h}</h2>\n${body.trim()}`).join('\n')}
  <footer>
    <a href="/">&larr; Back to the wildlife map</a>
  </footer>
</div>
</body>
</html>
`;
}
