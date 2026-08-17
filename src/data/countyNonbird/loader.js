// Per-state county non-bird floor loader (lazy chunks). Mirrors birdFreq/loader.js.
const LOADERS = {
  ak: () => import('./nb_ak.js'),
  al: () => import('./nb_al.js'),
  ar: () => import('./nb_ar.js'),
  az: () => import('./nb_az.js'),
  bcn: () => import('./nb_bcn.js'),
  ca: () => import('./nb_ca.js'),
  co: () => import('./nb_co.js'),
  ct: () => import('./nb_ct.js'),
  de: () => import('./nb_de.js'),
  fl: () => import('./nb_fl.js'),
  ga: () => import('./nb_ga.js'),
  hi: () => import('./nb_hi.js'),
  ia: () => import('./nb_ia.js'),
  id: () => import('./nb_id.js'),
  il: () => import('./nb_il.js'),
  in: () => import('./nb_in.js'),
  ks: () => import('./nb_ks.js'),
  ky: () => import('./nb_ky.js'),
  la: () => import('./nb_la.js'),
  ma: () => import('./nb_ma.js'),
  md: () => import('./nb_md.js'),
  me: () => import('./nb_me.js'),
  mi: () => import('./nb_mi.js'),
  mn: () => import('./nb_mn.js'),
  mo: () => import('./nb_mo.js'),
  ms: () => import('./nb_ms.js'),
  mt: () => import('./nb_mt.js'),
  nc: () => import('./nb_nc.js'),
  nd: () => import('./nb_nd.js'),
  ne: () => import('./nb_ne.js'),
  nh: () => import('./nb_nh.js'),
  nj: () => import('./nb_nj.js'),
  nm: () => import('./nb_nm.js'),
  nv: () => import('./nb_nv.js'),
  ny: () => import('./nb_ny.js'),
  oh: () => import('./nb_oh.js'),
  ok: () => import('./nb_ok.js'),
  on: () => import('./nb_on.js'),
  or: () => import('./nb_or.js'),
  pa: () => import('./nb_pa.js'),
  pr: () => import('./nb_pr.js'),
  qc: () => import('./nb_qc.js'),
  ri: () => import('./nb_ri.js'),
  sc: () => import('./nb_sc.js'),
  sd: () => import('./nb_sd.js'),
  tn: () => import('./nb_tn.js'),
  tx: () => import('./nb_tx.js'),
  ut: () => import('./nb_ut.js'),
  va: () => import('./nb_va.js'),
  vt: () => import('./nb_vt.js'),
  wa: () => import('./nb_wa.js'),
  wi: () => import('./nb_wi.js'),
  wv: () => import('./nb_wv.js'),
  wy: () => import('./nb_wy.js'),
};
// Every chunk key — the species search needs all of them to answer "which
// parks have a Black Bear?", the same way bird search needs all bird chunks.
export const NONBIRD_STATE_KEYS = Object.keys(LOADERS);

const _cache = {};
export async function loadCountyNonbird(stateLower) {
  const k = (stateLower || '').toLowerCase();
  if (!LOADERS[k]) return null;
  if (!_cache[k]) _cache[k] = LOADERS[k]().then(m => m.COUNTY_NONBIRD).catch(() => null);
  return _cache[k];
}
