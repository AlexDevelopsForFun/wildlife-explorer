/**
 * basemap — the map tile source, in ONE place.
 *
 * 2026-08-31: CARTO began stamping "API KEY REQUIRED — carto.com/basemaps/apikey"
 * across every unauthenticated tile. It is not an outage (tiles still return
 * HTTP 200) which is why nothing alerted — the watermark is baked into the
 * image, so the map simply looked broken to every visitor.
 *
 * Swapped to Esri's Canvas basemaps, which serve clean tiles anonymously and
 * come in the dark/light pair this app needs. Visually near-identical to
 * CARTO's dark_all / voyager, so no restyling was required.
 *
 * NOTE the URL shape differs from CARTO's:
 *   • path order is {z}/{y}/{x}, not {z}/{x}/{y}
 *   • no {s} subdomain rotation and no {r} retina suffix — including either
 *     yields 404s on every tile
 *
 * THIS IS A STOPGAP. It removes the watermark today; it does not settle the
 * basemap licensing question (MapTiler vs self-hosted Protomaps vs a paid
 * CARTO key), which still needs an owner decision. Esri asks for attribution,
 * which is honoured below.
 */

export const BASEMAP_DARK =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const BASEMAP_LIGHT =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin';

export const basemapUrl = (dark) => (dark ? BASEMAP_DARK : BASEMAP_LIGHT);
