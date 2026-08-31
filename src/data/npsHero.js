/**
 * npsHero — hero-image selection and payload slimming for NPS park records.
 *
 * Extracted from useNpsParks so the SERVERLESS PROXY can apply the identical
 * scoring before sending data to the browser. Duplicating it would let the two
 * drift, and a drifted copy shows up as a park quietly changing its photo.
 *
 * Why the proxy slims at all: /parks?limit=500 returns 3.67 MB (950 KB gzipped)
 * for 474 units, and the app reads TEN fields plus four image sub-fields. The
 * rest — operatingHours, activities, topics, addresses, contacts, fees — is
 * downloaded and JSON.parsed on every cold visit purely to be discarded, which
 * on a phone is main-thread time nobody gets back. Slimming server-side takes
 * it to 0.42 MB / 132 KB gzipped, an 86% cut, with identical rendering.
 *
 * Deliberately dependency-free so both a React hook and a node/edge function
 * can import it.
 */

// NPS gives an ordered `images` array, but images[0] is frequently a wildlife
// close-up (e.g. Wind Cave's lead photo is a bison, not the park). Prefer a
// landscape/scenery shot: reward scenery words, penalise animal close-ups, and
// fall back to NPS's own ordering on ties.
export const HERO_ANIMAL  = /\b(bison|buffalo|elk|deer|moose|bear|wolf|coyote|fox|bobcat|cougar|lynx|bird|eagle|hawk|falcon|owl|duck|goose|heron|crane|pelican|gull|snake|lizard|turtle|tortoise|frog|toad|fish|salmon|trout|insect|butterfly|dragonfly|bee|beetle|bug|bat|prairie dog|ferret|sheep|goat|pronghorn|antelope|elephant seal|seal|otter|squirrel|chipmunk|rabbit|marmot|portrait|close-?up|wildlife|critter|mammal|reptile|amphibian)\b/i;
export const HERO_SCENERY = /\b(landscape|scenic|scenery|vista|overlook|panorama|sunset|sunrise|skyline|canyon|valley|mountain|peak|ridge|cliff|butte|mesa|prairie|grassland|meadow|forest|woods|river|creek|lake|pond|waterfall|falls|gorge|shore|coast|coastline|beach|dune|desert|cave|cavern|formation|boxwork|rock|badland|hill|view|trail|aerial|night sky|stars|milky way|wetland|marsh|spring|geyser)\b/i;

export function pickHeroImage(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  let best = images[0], bestScore = -Infinity;
  images.forEach((img, i) => {
    const hay = `${img.title || ''} ${img.altText || ''} ${img.caption || ''}`.toLowerCase();
    // Scenery wins outright (a landscape word means it's a place shot, even if a
    // place NAME like "Eagle Peak" also trips the animal list). Only penalise an
    // animal word when there's NO scenery context — that's the tight-portrait case.
    let score = HERO_SCENERY.test(hay) ? 3 : (HERO_ANIMAL.test(hay) ? -3 : 0);
    score -= i * 0.01;                 // gentle tiebreak toward NPS's own order
    if (score > bestScore) { bestScore = score; best = img; }
  });
  return best;
}

// Every field the app actually reads from a bulk /parks response.
export const NPS_KEEP_FIELDS = [
  'parkCode', 'fullName', 'name', 'designation',
  'latitude', 'longitude', 'states', 'url', 'description',
];

/**
 * Reduce one raw NPS park to what the app uses, resolving the hero image so
 * the whole `images` array (915 KB across the response) never crosses the wire.
 */
export function slimNpsPark(park) {
  const out = {};
  for (const k of NPS_KEEP_FIELDS) if (park[k] !== undefined) out[k] = park[k];
  const hero = pickHeroImage(park.images);
  out.heroImage = hero
    ? { url: hero.url, altText: hero.altText, caption: hero.caption, title: hero.title }
    : null;
  return out;
}
