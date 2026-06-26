// Per-state county bird-LIST loader (presence floor for counties without a
// frequency floor). Lazy chunks, mirrors birdFreq/loader.js.
const LOADERS = {
  ak: () => import('./cbl_ak.js'),
  al: () => import('./cbl_al.js'),
  ar: () => import('./cbl_ar.js'),
  az: () => import('./cbl_az.js'),
  ca: () => import('./cbl_ca.js'),
  co: () => import('./cbl_co.js'),
  fl: () => import('./cbl_fl.js'),
  ga: () => import('./cbl_ga.js'),
  ia: () => import('./cbl_ia.js'),
  id: () => import('./cbl_id.js'),
  il: () => import('./cbl_il.js'),
  in: () => import('./cbl_in.js'),
  ks: () => import('./cbl_ks.js'),
  ky: () => import('./cbl_ky.js'),
  la: () => import('./cbl_la.js'),
  md: () => import('./cbl_md.js'),
  me: () => import('./cbl_me.js'),
  mi: () => import('./cbl_mi.js'),
  mn: () => import('./cbl_mn.js'),
  mo: () => import('./cbl_mo.js'),
  ms: () => import('./cbl_ms.js'),
  mt: () => import('./cbl_mt.js'),
  nc: () => import('./cbl_nc.js'),
  nd: () => import('./cbl_nd.js'),
  ne: () => import('./cbl_ne.js'),
  nj: () => import('./cbl_nj.js'),
  nv: () => import('./cbl_nv.js'),
  oh: () => import('./cbl_oh.js'),
  ok: () => import('./cbl_ok.js'),
  or: () => import('./cbl_or.js'),
  sc: () => import('./cbl_sc.js'),
  sd: () => import('./cbl_sd.js'),
  tn: () => import('./cbl_tn.js'),
  tx: () => import('./cbl_tx.js'),
  ut: () => import('./cbl_ut.js'),
  va: () => import('./cbl_va.js'),
  wa: () => import('./cbl_wa.js'),
  wi: () => import('./cbl_wi.js'),
  wv: () => import('./cbl_wv.js'),
  wy: () => import('./cbl_wy.js'),
};
const _cache = {};
export async function loadCountyBirdList(stateLower) {
  const k = (stateLower || '').toLowerCase();
  if (!LOADERS[k]) return null;
  if (!_cache[k]) _cache[k] = LOADERS[k]().then(m => m.COUNTY_BIRD_LIST).catch(() => null);
  return _cache[k];
}
