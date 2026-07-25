// ── "What's new" changelog ──────────────────────────────────────────────────
// Visitor-facing release notes, shown in the ☕ Support modal. This backs the
// Buy Me a Coffee membership perk 📝 "What's new changelog".
//
// Written for HIKERS, not developers: say what changed for the person using the
// app, not which function was refactored. Newest entry first. `date` is a
// display string (month-level is fine — avoids implying a precise ship date).

export const CHANGELOG = [
  {
    date: 'June 2026',
    title: 'A bigger, clearer park view',
    items: [
      'Park popups now use the full width of your screen, showing three species at a time instead of two.',
      'Trimmed the filters and header so you see more animals before scrolling.',
      'Fixed a layout glitch that left an empty gap beside the first species.',
    ],
  },
  {
    date: 'June 2026',
    title: 'Every park now shows its full wildlife list',
    items: [
      'Fixed parks that showed only a handful of species — some remote parks displayed as little as one animal despite hundreds being documented nearby.',
      'Added mammals, reptiles, amphibians and fish to ~570 parks that previously showed birds only.',
      'Puerto Rico refuges and Alaska’s Wrangell–St. Elias now show their real species lists.',
      'Every one of the 4,700+ parks now has a complete list across every animal group.',
    ],
  },
  {
    date: 'June 2026',
    title: 'Better sorting and a smoother map',
    items: [
      '“Most Iconic” now puts bears, foxes and eagles at the top instead of burying them under obscure species.',
      'Switching states recenters the map properly.',
      'Bigger tap targets on phones, and the header buttons no longer run off-screen.',
    ],
  },
  {
    date: 'June 2026',
    title: 'Trails, tips and install-to-phone',
    items: [
      'New 🥾 Trails button on every park, alongside Directions.',
      'New ✨ Tips guide covering the features most people miss.',
      'The app can now be installed to your phone’s home screen and works offline.',
    ],
  },
  {
    date: 'June 2026',
    title: '4,000+ state parks and refuges',
    items: [
      'Expanded from national parks to all 50 states’ state parks plus 543 National Wildlife Refuges.',
      'Added 📍 Near me to find the closest parks to you.',
      'Added rare-bird alerts and a personal life list you can build as you go.',
    ],
  },
];
