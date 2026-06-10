#!/usr/bin/env node
/**
 * scripts/lookupInatPlacesBulk.mjs — like lookupInatPlaces.mjs but across ALL
 * states at once, for the catalog-expansion units. It looks up only parks NOT
 * already in INAT_PLACE_IDS, verifies each iNat place by name + great-circle
 * distance (≤ ACCEPT_KM), and APPENDS the accepted ids into the INAT_PLACE_IDS
 * object in stateParksNJ.js (existing entries untouched).
 *
 * Usage:  node scripts/lookupInatPlacesBulk.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { STATE_PARKS_BY_STATE, INAT_PLACE_IDS } from '../src/data/stateParksNJ.js';

const ACCEPT_KM = 8;
const CONCURRENCY = 3;
const PACE_MS = 1100;
const UA = { 'User-Agent': 'wildlife-explorer place lookup (+https://wildlifeexplorer.us)' };
const SUFFIX = /\b(State Park Preserve|State Park|State Forest|State Beach|State Reservation|Wildlife Management Area|Public Reserved Land|Wilderness Area|Wild Forest|State Recreation Area|State Recreation Site|Recreation Area|Natural Area|State Park Reserve|Preserve|Management Area|State Wildlife Area|State Natural Area)\b/gi;

const haversine = (a,b,c,d)=>{const R=6371,t=x=>x*Math.PI/180,dLat=t(c-a),dLng=t(d-b),h=Math.sin(dLat/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const norm = s => s.toLowerCase().replace(/[^a-z]/g,'');
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function fetchCands(q){
  for(let a=0;a<3;a++){
    try{ const res=await fetch(`https://api.inaturalist.org/v1/places/autocomplete?q=${encodeURIComponent(q)}`,{headers:UA});
      if(res.status===429||res.status>=500){await sleep(1500*(a+1));continue;}
      return (await res.json()).results ?? [];
    }catch{await sleep(800*(a+1));}
  }
  return [];
}
function bestOf(results, park, keyword){
  const cands = results.map(r=>{let clat=null,clng=null; if(typeof r.location==='string'&&r.location.includes(',')) [clat,clng]=r.location.split(',').map(Number); const dist=(clat!=null&&clng!=null)?haversine(park.lat,park.lng,clat,clng):null; return {id:r.id,name:r.display_name,dist};});
  const named = cands.filter(c=>{const n=norm(c.name); return keyword.length>=4 && (n.includes(keyword.slice(0,6))||keyword.includes(n.slice(0,6)));});
  return (named.length?named:cands).filter(c=>c.dist!=null).sort((a,b)=>a.dist-b.dist)[0];
}
async function lookupOne(park){
  const keyword = norm(park.name).replace('statepark','').replace('stateforest','').replace('statebeach','').replace('recreationarea','').replace('recreationsite','').replace('statepreserve','').replace('wildlifemanagementarea','').replace('naturalarea','');
  let best = bestOf(await fetchCands(park.name), park, keyword);
  await sleep(PACE_MS);
  if(!(best&&best.dist<=ACCEPT_KM)){
    const short = park.name.replace(SUFFIX,'').replace(/\s+/g,' ').trim();
    if(short && norm(short)!==norm(park.name)){
      const b2 = bestOf(await fetchCands(short), park, keyword);
      await sleep(PACE_MS);
      if(b2 && (!best||b2.dist<best.dist)) best=b2;
    }
  }
  if(best && best.dist<=ACCEPT_KM) return {park:park.id, id:best.id};
  return null;
}
async function pMap(items, fn, c){
  const out=new Array(items.length); let idx=0;
  const worker=async()=>{while(idx<items.length){const i=idx++; out[i]=await fn(items[i]); if(i%100===0)console.error(`  …${i}/${items.length}`);}};
  await Promise.all(Array.from({length:Math.min(c,items.length)},worker));
  return out;
}

// gather units missing a place_id
const todo = [];
for (const [st, arr] of Object.entries(STATE_PARKS_BY_STATE))
  for (const p of arr) if (!(p.id in INAT_PLACE_IDS)) todo.push(p);
console.error(`Units missing a place_id: ${todo.length} (of ${Object.values(STATE_PARKS_BY_STATE).reduce((n,a)=>n+a.length,0)})`);

const res = await pMap(todo, lookupOne, CONCURRENCY);
const accepted = {};
for (const r of res) if (r) accepted[r.park] = r.id;
console.error(`Verified ${Object.keys(accepted).length}/${todo.length} new place_ids.`);

// append accepted ids into the INAT_PLACE_IDS block of stateParksNJ.js
const fileUrl = new URL('../src/data/stateParksNJ.js', import.meta.url);
let src = readFileSync(fileUrl, 'utf8');
const re = /(export const INAT_PLACE_IDS = \{[\s\S]*?)\n\};/;
if (!re.test(src)) { console.error('Could not locate INAT_PLACE_IDS block'); process.exit(1); }
const lines = Object.entries(accepted).map(([k,v]) => `  ${JSON.stringify(k)}: ${v},`);
const inject = `\n  // ── catalog-expansion units (auto-verified by lookupInatPlacesBulk.mjs) ──\n${lines.join('\n')}\n};`;
src = src.replace(re, `$1${inject}`);
writeFileSync(fileUrl, src);
console.error(`Appended ${lines.length} place_ids into stateParksNJ.js`);
console.log(JSON.stringify(accepted, null, 0));
