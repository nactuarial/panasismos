'use strict';
window.PanaCharts=(()=>{
 const ink='#20324b',blue='#4574c6',gold='#986e1b';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const median=a=>{const s=[...a].sort((a,b)=>a-b);return s.length%2?s[s.length>>1]:(s[s.length/2-1]+s[s.length/2])/2};
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
 function render(visible,catalog){
  const events=[...visible].sort((a,b)=>a.time-b.time),note=document.getElementById('chartNote');
  if(!events.length){for(const id of ['magnitudeChart','distanceChart'])document.getElementById(id).innerHTML='<p class="chart-empty">No hay sismos con estos filtros.</p>';note.textContent='Los gráficos siguen los filtros del mapa.';return}
  const reference=catalog.find(e=>e.id==='us6000u18k')||{lat:7.5868,lon:-80.769};
  const first=events[0].time,last=events.at(-1).time,start=first-3600000,end=Math.max(last,first+3600000),W=960,H=310,L=65,R=22,T=20,B=62;
  const x=t=>L+(t-start)/(end-start)*(W-L-R);
  function plot(id,values,label,ymin,ymax,extra){
   const y=v=>H-B-(v-ymin)/(ymax-ymin)*(H-B-T);let parts=[];
   parts.push('<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+escape(label)+'"><title>'+escape(label)+'</title>');
   for(let i=0;i<=4;i++){const v=ymin+(ymax-ymin)*i/4,yy=y(v);parts.push('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e6ebf4"/><text x="'+(L-10)+'" y="'+(yy+4)+'" text-anchor="end">'+v.toFixed(ymax<=10?1:0)+'</text>')}
   for(let i=0;i<5;i++){const t=start+(end-start)*i/4,xx=x(t),s=fmt.format(t).split(',');parts.push('<text x="'+xx+'" y="'+(H-B+24)+'" text-anchor="middle">'+escape(s[0])+'<tspan x="'+xx+'" dy="16">'+escape(s[1]||'')+'</tspan></text>')}
   parts.push('<text transform="translate(17 '+((T+H-B)/2)+') rotate(-90)" text-anchor="middle">'+escape(label)+'</text>');
   if(reference.time>=start&&reference.time<=end)parts.push('<line x1="'+x(reference.time)+'" x2="'+x(reference.time)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="'+gold+'" stroke-dasharray="5 5"/>');
   values.forEach(({e,value})=>{const tooltip='M '+e.mag.toFixed(1)+' · '+fmt.format(e.time)+' · '+e.place+(id==='distanceChart'?' · '+value.toFixed(1)+' km':'');parts.push('<circle cx="'+x(e.time)+'" cy="'+y(value)+'" r="'+(id==='distanceChart'?Math.max(3,3+(e.mag-4)*1.5):3.5)+'" fill="'+blue+'" fill-opacity=".8" stroke="white" stroke-width=".6"><title>'+escape(tooltip)+'</title></circle>')});
   if(extra)parts.push(extra(y));parts.push('</svg>');document.getElementById(id).innerHTML=parts.join('');
  }
  const peaks=[];let max=-Infinity;for(let i=events.length-1;i>=0;i--)if(events[i].mag>max){peaks.push(events[i]);max=events[i].mag}peaks.reverse();
  const fit=medianFit(events),mags=events.map(e=>e.mag),low=Math.floor(Math.min(...mags)*2)/2-.2,high=Math.ceil(Math.max(...mags)*2)/2+.3;
  const line=(pts,y,color)=>'<polyline points="'+pts.map(p=>x(p.time)+','+y(p.value)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.4"/>';
  plot('magnitudeChart',events.map(e=>({e,value:e.mag})),'Magnitud (M)',low,high,y=>line(peaks.map(e=>({time:e.time,value:e.mag})),y,gold)+(fit?line(fit,y,ink):''));
  const distances=events.map(e=>({e,value:distance(e,reference)}));plot('distanceChart',distances,'Distancia epicentral (km)',0,Math.max(20,Math.ceil(Math.max(...distances.map(p=>p.value))/20)*20));
  note.textContent=events.length+' eventos filtrados · Horas de Panamá (UTC−5). Eje temporal desde una hora antes del primer evento visible. MaxTrend une máximos superiores a todos los eventos posteriores; es descendente por construcción. MedianTrend ajusta la mediana de todo el período (cuantil 0,5), sin extrapolar.';
 }
 return{render};
})();
