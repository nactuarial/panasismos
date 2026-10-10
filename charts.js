'use strict';
window.PanaCharts=(()=>{
 const ink='#20324b',blue='#4574c6',gold='#986e1b';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const median=a=>{const s=[...a].sort((a,b)=>a-b);return s.length%2?s[s.length>>1]:(s[s.length/2-1]+s[s.length/2])/2};
 let fixedAxis=null;
 const fmt=new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 function medianFit(events){
  if(events.length<2)return null;
  const first=events[0].time,span=events.at(-1).time-first;if(!span)return null;
  const xs=events.map(e=>(e.time-first)/span),ys=events.map(e=>e.mag);
  const at=b=>{const a=median(ys.map((y,i)=>y-b*xs[i]));return{a,b,cost:ys.reduce((s,y,i)=>s+Math.abs(y-a-b*xs[i]),0)}};
  let extent=Math.max(1,Math.max(...ys)-Math.min(...ys)),lo=-extent,hi=extent;
  let best=Math.min(at(lo).cost,at(hi).cost,at(0).cost);
  for(let i=0;i<40;i++){const next=extent*2,cost=Math.min(at(-next).cost,at(next).cost);lo=-next;hi=next;if(cost>=best)break;best=cost;extent=next}
  const ratio=(Math.sqrt(5)-1)/2;let l=hi-ratio*(hi-lo),r=lo+ratio*(hi-lo),fl=at(l),fr=at(r);
  for(let i=0;i<65;i++){if(fl.cost<=fr.cost){hi=r;r=l;fr=fl;l=hi-ratio*(hi-lo);fl=at(l)}else{lo=l;l=r;fl=fr;r=lo+ratio*(hi-lo);fr=at(r)}}
  const fit=at((lo+hi)/2);return[{time:first,value:fit.a},{time:first+span,value:fit.a+fit.b}];
 }
 function distance(e,ref){const rad=Math.PI/180,lat1=ref.lat*rad,lat2=e.lat*rad,dlat=lat2-lat1,dlon=(e.lon-ref.lon)*rad;return 12742.0176*Math.asin(Math.sqrt(Math.min(1,Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2)))}

 function offset(e,ref){
  const rad=Math.PI/180,a=ref.lat*rad,b=e.lat*rad,d=(e.lon-ref.lon)*rad;
  const bearing=Math.atan2(Math.sin(d)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(d)),km=distance(e,ref);
  return{east:km*Math.sin(bearing),north:km*Math.cos(bearing)};
 }
 function principalAxis(catalog,ref){
  const points=catalog.filter(e=>e.time>=ref.time&&e.mag>=4&&distance(e,ref)<=150).map(e=>offset(e,ref));
  if(points.length<3)return{east:1,north:0,bearing:90,n:points.length};
  const me=points.reduce((a,p)=>a+p.east,0)/points.length,mn=points.reduce((a,p)=>a+p.north,0)/points.length;
  let ee=0,nn=0,en=0;for(const p of points){const e=p.east-me,n=p.north-mn;ee+=e*e;nn+=n*n;en+=e*n}
  const angle=.5*Math.atan2(2*en,ee-nn);let east=Math.cos(angle),north=Math.sin(angle);
  if(east<0||(Math.abs(east)<1e-10&&north<0)){east=-east;north=-north}
  return{east,north,bearing:(Math.atan2(east,north)*180/Math.PI+360)%360,n:points.length};
 }
 const direction=b=>['N','NE','E','SE','S','SO','O','NO'][Math.round(b/45)%8];
 function render(visible,catalog){
  const events=[...visible].sort((a,b)=>a.time-b.time),note=document.getElementById('chartNote');
  if(!events.length){for(const id of ['magnitudeChart','distanceChart'])document.getElementById(id).innerHTML='<p class="chart-empty">No hay sismos con estos filtros.</p>';note.textContent='Los gráficos siguen los filtros del mapa.';return}
  const reference=catalog.find(e=>e.id==='us6000u18k')||{lat:7.5868,lon:-80.769,time:Date.parse('2026-10-09T17:56:06.036Z')};
  const axis=fixedAxis||(fixedAxis=principalAxis(catalog,reference));
  document.getElementById('distanceAxisNote').textContent='0 = epicentro del sismo principal. + hacia '+direction(axis.bearing)+'; − hacia '+direction((axis.bearing+180)%360)+'. Eje estimado al abrir con '+axis.n+' eventos M ≥ 4 dentro de 150 km desde el 9 oct.; azimut '+axis.bearing.toFixed(0)+'°. Se mantiene fijo al filtrar. La proyección no mide apertura de falla.';
  const first=events[0].time,last=events.at(-1).time,start=first-3600000,end=Math.max(last,first+3600000),W=960,H=310,L=65,R=22,T=20,B=62;
  const x=t=>L+(t-start)/(end-start)*(W-L-R);
  function plot(id,values,label,ymin,ymax,extra){
   const y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-B-T);let parts=[];
   parts.push('<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+escape(label)+'"><title>'+escape(label)+'</title>');
   for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yy=y(v);parts.push('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e6ebf4"/><text x="'+(L-10)+'" y="'+(yy+4)+'" text-anchor="end">'+((id==='distanceChart'&&v>0?'+':'')+v.toFixed(ymax<=10?1:0))+'</text>')}
   for(let i=0;i<5;i++){const t=start+(end-start)*i/4,xx=x(t),s=fmt.format(t).split(',');parts.push('<text x="'+xx+'" y="'+(H-B+24)+'" text-anchor="middle">'+escape(s[0])+'<tspan x="'+xx+'" dy="16">'+escape(s[1]||'')+'</tspan></text>')}
   parts.push('<text transform="translate(17 '+((T+H-B)/2)+') rotate(-90)" text-anchor="middle">'+escape(label)+'</text>');
   if(id==='distanceChart')parts.push('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0)+'" y2="'+y(0)+'" stroke="#986e1b" stroke-width="1.3"/>');
   if(reference.time>=start&&reference.time<=end)parts.push('<line x1="'+x(reference.time)+'" x2="'+x(reference.time)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="'+gold+'" stroke-dasharray="5 5"/>');
   values.forEach(({e,value})=>{const tooltip='M '+e.mag.toFixed(1)+' · '+fmt.format(e.time)+' · '+e.place+(id==='distanceChart'?' · '+(value>0?'+':'')+value.toFixed(1)+' km sobre el eje':'');parts.push('<circle cx="'+x(e.time)+'" cy="'+y(value)+'" r="'+(id==='distanceChart'?Math.max(3,3+(e.mag-4)*1.5):3.5)+'" fill="'+blue+'" fill-opacity=".8" stroke="white" stroke-width=".6"><title>'+escape(tooltip)+'</title></circle>')});
   if(extra)parts.push(extra(y));parts.push('</svg>');document.getElementById(id).innerHTML=parts.join('');
  }
  const candidates=[];let max=-Infinity;for(let i=events.length-1;i>=0;i--)if(events[i].mag>max){candidates.push(i);max=events[i].mag}candidates.reverse();
  const prominence=i=>{let left=events[i].mag,right=events[i].mag;for(let j=i-1;j>=0;j--){if(events[j].mag>events[i].mag)break;left=Math.min(left,events[j].mag)}for(let j=i+1;j<events.length;j++){if(events[j].mag>events[i].mag)break;right=Math.min(right,events[j].mag)}return events[i].mag-Math.max(left,right)};
  const peaks=candidates.filter((i,k)=>k===0||(i>0&&i<events.length-1&&events[i].mag>=events[i-1].mag&&events[i].mag>=events[i+1].mag&&prominence(i)>=1)).map(i=>events[i]);
  const selected=events.find(e=>e.id==='us6000u1e5');if(selected&&!peaks.some(e=>e.id===selected.id)){peaks.push(selected);peaks.sort((a,b)=>a.time-b.time)}
  const fit=medianFit(events),mags=events.map(e=>e.mag),low=Math.floor(Math.min(...mags)*2)/2-.2,high=Math.ceil(Math.max(...mags)*2)/2+.3;
  const line=(pts,y,color,dashed=false)=>'<polyline points="'+pts.map(p=>x(p.time)+','+y(p.value)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.4"'+(dashed?' stroke-dasharray="6 5"':'')+'/>';
  let extension=[];
  if(peaks.length>=2){const a=peaks.at(-2),b=peaks.at(-1);if(b.time>a.time&&last>b.time){let stop=last,value=b.mag+(b.mag-a.mag)*(last-b.time)/(b.time-a.time);if(value<low){stop=b.time+(low-b.mag)*(b.time-a.time)/(b.mag-a.mag);value=low}extension=[{time:b.time,value:b.mag},{time:stop,value}]}}
  plot('magnitudeChart',events.map(e=>({e,value:e.mag})),'Magnitud (M)',low,high,y=>line(peaks.map(e=>({time:e.time,value:e.mag})),y,gold)+(extension.length?line(extension,y,gold,true):'')+(fit?line(fit,y,ink):''));
  const positions=events.map(e=>{const p=offset(e,reference);return{e,value:p.east*axis.east+p.north*axis.north}}),extent=Math.max(20,Math.ceil(Math.max(...positions.map(p=>Math.abs(p.value)))/20)*20);plot('distanceChart',positions,'Posición sobre el eje (km)',-extent,extent);
  note.textContent=events.length+' eventos filtrados · Horas de Panamá (UTC−5). Eje temporal desde una hora antes del primer evento visible. MaxTrend une picos dominantes con prominencia ≥ 1 M y el evento M 4,8 del 10 oct., 05:35, seleccionado como referencia cuando está visible; trazo continuo hasta el último pico confirmado y prolongación punteada de su último tramo hasta el final visible (o el límite del eje). La prolongación es visual, no un pronóstico. Selección retrospectiva, descendente por construcción. MedianTrend ajusta la mediana de todo el período (cuantil 0,5), sin extrapolar.';
 }
 return{render};
})();
