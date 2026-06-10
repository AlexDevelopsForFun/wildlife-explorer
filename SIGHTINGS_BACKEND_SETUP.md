# Community Sightings Backend — one-time setup

The "👍 Saw it / 👎 Didn't" votes are now aggregated **across all visitors** so
the per-(park, species, season) seen-rate becomes real ground truth. The code
(`api/sightings.js` + `src/services/sightingsService.js`) ships ready, but needs
a small Redis datastore to persist votes.

**Until you connect the store, everything keeps working** — votes fall back to
localStorage-only (the previous behavior) and the function returns a graceful
no-op. Connect the store whenever you're ready; it lights up automatically.

## Steps (≈3 minutes, free tier)

1. **Vercel Dashboard → your project → Storage → Create / Connect Store.**
2. Choose **Upstash Redis** (via the Vercel Marketplace integration). Pick the
   **free** plan.
3. **Connect it to this project** for Production + Preview. Vercel auto-injects
   the connection env vars — the function reads either naming scheme:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`, **or**
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
4. **Redeploy** (env vars are baked in at deploy time, so a new deployment is
   required — a fresh push or "Redeploy" in the dashboard).

That's it. The next park you open will start recording + showing community
counts.

## Verify it's live
- Open a state park, vote on a species, reload — the "🧭 N of M visitors saw
  this here" line should reflect your vote.
- Or hit `GET /api/sightings?parkId=nj-rancocas` — `configured` should be `true`.

## Cost
- Reads are **edge-cached 6h** and writes are tiny, so traffic stays well inside
  the free tier. Beyond it, pricing is usage-based pennies — it scales with
  popularity, no fixed subscription.

## Privacy & abuse
- **No PII stored.** Only `{ parkId, species, season, verdict }`. IP is used
  transiently for per-minute rate-limiting (30 votes/min) and never persisted.
- CORS is locked to the site's own origins.

## What's next (not yet enabled)
Today the community data is **display-only**. Once buckets accumulate enough
votes, a **bounded rarity nudge** (±1 tier, min-sample gated, blended with the
eBird/iNaturalist model) can be switched on so real sightings refine the
displayed odds without thin data ever moving a tier prematurely.
