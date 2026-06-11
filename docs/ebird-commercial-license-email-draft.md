# eBird commercial-licensing inquiry — ready-to-send draft

**To:** Mary Guthrie <msg21@cornell.edu> (Cornell Lab of Ornithology — commercial use contact per the
[eBird API Terms of Use](https://www.birds.cornell.edu/home/ebird-api-terms-of-use/))
**Subject:** Commercial licensing inquiry — wildlifeexplorer.us (eBird API)

---

Hi Mary,

I run **US Wildlife Explorer** (https://wildlifeexplorer.us), a free web app that helps
wildlife watchers find what species they can see at over 4,700 US parks — the national
park system, all 50 states' state parks, and the National Wildlife Refuges — and the
best season to visit.

eBird data is central to the experience and is always credited to the Cornell Lab:

- Recent nearby observations via the eBird API 2.0 (`data/obs/geo/recent`), proxied
  server-side with our API key never exposed to browsers, and edge-cached to keep
  request volume low.
- Historical checklist sampling (county level) that we process into per-park
  seasonal frequency estimates.
- The notable-observations feed for a "rare birds near you" feature.

The site is currently free and non-commercial, consistent with the API Terms of Use.
I'm now exploring sustainability options — likely modest advertising and/or an optional
supporter tier — and I want to do this correctly, so I'm reaching out as the terms direct
to ask about a **written agreement for commercial use**.

Could you let me know:

1. Whether a commercial agreement is available for a small, single-developer site of
   this kind, and what terms/fees typically look like;
2. Whether any revenue models are viewed differently (display ads vs. donations vs. a
   paid tier that does not gate eBird-derived data);
3. Anything you'd want changed in how we present or attribute eBird data.

Happy to share traffic numbers, request volumes, or a walkthrough of exactly how the
data is used. Thank you for the work the Lab does — and for considering this.

Best regards,
Alexa
wildlifeexplorer.us

---

### Notes (not part of the email)
- Donations alone are widely treated as non-commercial — you can likely add a
  donation link now while this conversation happens.
- iNaturalist has separate commercial-use restrictions (and per-photo CC-BY-NC
  licenses); a paid tier should rely on eBird-licensed/own data unless iNat also
  clears commercial use.
- The CARTO basemap requires an Enterprise license for commercial use — swap to a
  commercial-friendly tile provider (e.g. MapTiler paid tier, self-hosted
  OpenStreetMap/Protomaps) before turning on ads.
