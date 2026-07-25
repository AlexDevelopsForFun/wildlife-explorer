// ── Supporters wall ─────────────────────────────────────────────────────────
// The people funding the hosting + map costs that keep US Wildlife Explorer
// free and ad-free. This backs the Buy Me a Coffee membership perks:
//   💚 "Your name on an in-app Supporters wall"
//   🌟 "Founding Supporter badge"
//   🔗 "Optional link by your name"
//
// There is no database (by design — no accounts, nothing to leak), so this list
// is hand-maintained. When someone joins on buymeacoffee.com/uswildlifeexplorer:
//
//   1. Add an entry below with the name they want shown.
//   2. `founding: true` for the first 25 members (earns the 🌟 badge).
//   3. `link` is OPTIONAL and only if they asked for it — never add someone's
//      site/socials without them requesting it. https:// URLs only.
//   4. Only ever list a display name they gave you. No emails, no full legal
//      names unless that's what they chose, no amounts.
//
// Order doesn't matter — the wall sorts founding members first, then A–Z.

export const SUPPORTERS = [
  // { name: 'Jane D.', founding: true, link: 'https://example.com' },
  // { name: 'Anonymous Hiker', founding: true },
];

// First N members get the Founding Supporter badge. Keep in sync with the
// perk copy on the Buy Me a Coffee page.
export const FOUNDING_LIMIT = 25;

export const SUPPORT_URL = 'https://buymeacoffee.com/uswildlifeexplorer';
