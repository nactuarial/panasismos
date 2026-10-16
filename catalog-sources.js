'use strict';
(function(root){
 const hasShakeMap=p=>String(p?.types||'').split(',').includes('shakemap')||!!p?.products?.shakemap?.some(x=>x.status!=='DELETE');
 function distance(a,b){const r=Math.PI/180;return 12742.0176*Math.asin(Math.sqrt(Math.min(1,Math.sin((a.lat-b.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((a.lon-b.lon)*r/2)**2)))}
 // A unique reciprocal candidate is required. Ambiguous pairs remain unassociated.
 function matchLocal(local,usgs){
  const candidates=local.map(e=>usgs.filter(u=>Math.abs(e.time-u.time)<=90000&&Math.abs(e.mag-u.mag)<=1&&distance(e,u)<=30));
  const uses=new Map();for(const cs of candidates)for(const u of cs)uses.set(u.id,(uses.get(u.id)||0)+1);
  return local.map((e,i)=>{const u=candidates[i].length===1&&uses.get(candidates[i][0].id)===1?candidates[i][0]:null;return {...e,hasShakeMap:!!u,usgsId:u?.id||'',usgsUrl:u?.url||'',match:u?{seconds:Math.abs(e.time-u.time)/1000,km:distance(e,u),method:'Coincidencia automática única: ≤90 s, ≤30 km y diferencia de magnitud ≤1'}:null}});
 }
 function periodBounds(period,now=Date.now()){
  const end=now+1;let start=Date.parse('2026-10-09T16:56:06.036Z');
  if(period==='today'){const local=new Date(now-5*3600000).toISOString().slice(0,10);start=Date.parse(local+'T00:00:00-05:00')}
  if(period==='7d')start=now-7*86400000;
  if(period==='30d')start=now-30*86400000;
  if(period==='history')start=Date.parse('2000-01-01T00:00:00Z');
  return {start,end};
 }
 const api={hasShakeMap,distance,matchLocal,periodBounds};root.PanaSources=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
