# eBird commercial-licensing inquiry — ready-to-send draft

**To:** ebird@cornell.edu
*(This is the exact address the eBird API Terms of Use, §2d, direct you to for
commercial-use permission. Don't substitute another contact — using the address
they name shows you read the terms.)*
**Subject:** Request for written permission — commercial use of the eBird API (wildlifeexplorer.us)

---

Hello,

I'm writing as directed in §2d of the eBird API Terms of Use to ask about written
permission for a limited commercial use of the eBird API — specifically, to help
cover the running costs of a free public resource, not to operate it for profit.

I run **US Wildlife Explorer** (https://wildlifeexplorer.us), a free web app that
helps wildlife watchers discover which species they can see at over 4,700 US parks
— the national park system, all 50 states' state parks, and the National Wildlife
Refuges — along with the best season to visit each. I'm a solo, hobbyist developer;
the site is free to everyone, with no paywall and no accounts.

**How the site uses the eBird API today**, in line with the current Terms:

- Recent nearby observations via the eBird API 2.0 (`data/obs/geo/recent` and the
  notable-observations feed), plus county-level historical checklist sampling that
  I process into per-park seasonal frequency estimates.
- My API key is held **server-side** and is never exposed to browsers or shared
  with any third party (§1b, §2e).
- Requests are edge-cached and rate-limited to keep volume low and avoid any
  adverse impact on eBird's servers (§2b).
- **eBird is attributed as the data source, with a link back to eBird.org, on
  every park view** where its data appears, and on the site's About page (§3).
- The site is currently **free and non-commercial**, which I understand the Terms
  permit for "websites, web-based platforms, [and] mobile applications" (§2a).

**What I'd like to do, and why I'm asking first:** the site's only costs are
hosting and map tiles, which grow as more people use it. To keep it online and
free, I'd like to offset those costs — primarily through reader donations, and
possibly modest, unobtrusive display advertising. My goal is cost-recovery and
sustainability, not profit. I understand that under §2d advertising counts as a
commercial purpose (revenue generation) and so needs your written permission
**before** I enable it — which is exactly why I haven't turned anything on, and
why I'm reaching out first.

Could you let me know:

1. Whether eBird offers written permission for this kind of limited, cost-recovery
   use by a free, hobbyist, single-developer site — and what terms or fees, if any,
   would apply;
2. Whether different models are viewed differently (e.g. reader donations, which I
   understand may be considered non-commercial, vs. modest display ads) so I can
   choose an approach the Lab is comfortable with;
3. Anything you'd like changed in how eBird data is presented or attributed.

I'd be glad to share traffic figures, exact request volumes, or a walkthrough of
how the data flows through the app. Thank you for eBird — it's the backbone of the
bird data on the site — and for considering this.

Best regards,
Alexa
wildlifeexplorer.us · contact@wildlifeexplorer.us

---

### Pre-send checklist — confirm each before you hit send

- [x] **Addressed to ebird@cornell.edu** (the address named in §2d — not a
      guessed contact). *If you separately know of Mary Guthrie / a licensing
      manager, you may CC them, but lead with ebird@cornell.edu.*
- [x] **Attribution is live and compliant (§3)** — every park panel now shows
      "eBird (Cornell Lab of Ornithology)" linked to https://ebird.org, and the
      About page credits eBird. (Shipped; verify on wildlifeexplorer.us before
      sending so your claim in the email is true.)
- [x] **Key is server-side only (§1b/§2e)** — held in the Vercel proxy, never in
      the browser bundle, never shared.
- [x] **No commercial use is active yet (§2d)** — ads are OFF; the AdSense tag on
      the site is verification-only and displays nothing.
- [ ] **Send from a stable address** — given the Google-account issue, send from an
      address you control long-term (your personal Gmail is fine; mention
      contact@wildlifeexplorer.us as the project contact, as the draft does).

### Notes (context, not part of the email)
- There is a **second linked document — the "eBird Data Access Terms of Use"** —
  that the API Terms say also applies. Skim it before launching ads; the API Terms
  are the ones that govern commercial *API* use and name ebird@cornell.edu.
- **Donations alone** are widely treated as non-commercial and don't gate eBird
  data — a "Buy Me a Coffee" link can go up now while this conversation happens.
  (Ads are the part that clearly triggers §2d.)
- **iNaturalist** has its own commercial-use restrictions and per-photo CC-BY-NC
  licenses — handle separately before any paid tier.
- **CARTO basemap** requires a commercial license — swap to MapTiler or
  self-hosted Protomaps before ads go live.
