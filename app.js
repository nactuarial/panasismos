'use strict';
const $=id=>document.getElementById(id);let catalog=[],visible=[],markers=new Map(),source='',floor=4;const map=L.map('map',{preferCanvas:true}).setView([8.15,-80.6],7);let tileFailures=0;const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:18}).addTo(map);tiles.on('tileerror',()=>{if(++tileFailures===3)$('status').textContent+=' El mapa base no está disponible; los epicentros siguen visibles.'});const layer=L.layerGroup().addTo(map);
map.createPane('seismicAxis');map.getPane('seismicAxis').style.zIndex='350';const axisLayer=L.layerGroup().addTo(map);let axisBounds=null,axisSignature='';
window.drawSeismicAxis=(axis,reference)=>{
 const signature=[axis.bearing,reference.lat,reference.lon].join(',');if(signature===axisSignature)return;axisSignature=signature;axisLayer.clearLayers();
 const destination=(bearing,km)=>{const rad=Math.PI/180,angle=km/6371.0088,a=reference.lat*rad,l=reference.lon*rad,b=bearing*rad;const lat=Math.asin(Math.sin(a)*Math.cos(angle)+Math.cos(a)*Math.sin(angle)*Math.cos(b));const lon=l+Math.atan2(Math.sin(b)*Math.sin(angle)*Math.cos(a),Math.cos(angle)-Math.sin(a)*Math.sin(lat));return[lat/rad,lon/rad]};
 const minus=destination(axis.bearing+180,150),plus=destination(axis.bearing,150),center=[reference.lat,reference.lon];axisBounds=L.latLngBounds([minus,plus]);
 L.polyline([minus,center,plus],{pane:'seismicAxis',color:'#20324b',weight:2.5,dashArray:'7 6',opacity:.75,interactive:false}).addTo(axisLayer);
 const direction=b=>['N','NE','E','SE','S','SO','O','NO'][Math.round(((b+360)%360)/45)%8];
 for(const [point,label] of [[minus,'−150 km · '+direction(axis.bearing+180)],[plus,'+150 km · '+direction(axis.bearing)]]){
  L.marker(point,{interactive:false,icon:L.divIcon({className:'axis-map-label',html:'<span>'+label+'</span>',iconSize:[112,28],iconAnchor:[56,14]})}).addTo(axisLayer);
 }
 L.circleMarker(center,{pane:'seismicAxis',radius:7,color:'#986e1b',weight:2,fill:false,interactive:false}).bindTooltip('0 km · Epicentro principal',{permanent:true,direction:'bottom',offset:[0,9],className:'axis-origin-label'}).addTo(axisLayer);
 $('axisFit').disabled=false;
};

let sourceDurations={},refreshToken=0,coverageWarning='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const num=v=>v===null||v===undefined||v===''?NaN:Number(v);const color=d=>d<30?'#ef6548':d<70?'#e5ad3b':'#546bbe';const dateFmt=new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function fromGeoJSON(data){if(!Array.isArray(data.features))throw Error('El archivo no contiene un catálogo GeoJSON.');return data.features.map((f,i)=>({id:f.id||String(i),time:num(f.properties?.time),mag:num(f.properties?.mag),lat:num(f.geometry?.coordinates?.[1]),lon:num(f.geometry?.coordinates?.[0]),depth:num(f.geometry?.coordinates?.[2]),place:f.properties?.place||'Sin descripción',url:f.properties?.url||'',magType:f.properties?.magType||'',source:f.properties?.source||'USGS',status:f.properties?.status||'',hasShakeMap:PanaSources.hasShakeMap(f.properties),usgsId:f.properties?.source?'':(f.id||''),usgsUrl:f.properties?.source?'':(f.properties?.url||'')})).filter(valid)}
function valid(e){return Number.isFinite(e.time)&&Number.isFinite(e.mag)&&Number.isFinite(e.lat)&&Number.isFinite(e.lon)&&Math.abs(e.lat)<=90&&Math.abs(e.lon)<=180}
function csvRows(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
function fromCSV(text){const rows=csvRows(text.replace(/^\uFEFF/,'')),head=rows.shift()?.map(x=>x.trim().toLowerCase());if(!head||!['time','latitude','longitude','mag'].every(x=>head.includes(x)))throw Error('Usa CSV USGS: time, latitude, longitude, depth, mag.');return rows.map((r,i)=>{const o=Object.fromEntries(head.map((h,j)=>[h,r[j]]));return{id:o.id||String(i),time:Date.parse(o.time),lat:num(o.latitude),lon:num(o.longitude),mag:num(o.mag),depth:num(o.depth),place:o.place||'Sin descripción',magType:o.magtype||'',url:o.url||(o.id?'https://earthquake.usgs.gov/earthquakes/eventpage/'+encodeURIComponent(o.id):'')}}).filter(valid)}
const sequenceStart=Date.parse('2026-10-09T16:56:06.036Z');
function bounds(){return PanaSources.periodBounds($('period').value)}
function reportURL(e){return /^https:\/\/(earthquake\.usgs\.gov|sismosgeociencias\.up\.ac\.pa)\//.test(e.url)?e.url:''}
function apply(){const {start,end}=bounds(),mag=+$('mag').value,depth=+$('depth').value,q=$('search').value.trim().toLowerCase();$('magLabel').textContent=mag.toFixed(1);$('depthLabel').textContent=depth===300?'Todas':depth+' km';visible=catalog.filter(e=>e.time>=start&&e.time<end&&e.mag>=mag&&(depth===300||e.depth<=depth)&&e.place.toLowerCase().includes(q)&&(!$('onlyShake').checked||e.hasShakeMap));layer.clearLayers();markers.clear();for(const e of visible){const marker=L.circleMarker([e.lat,e.lon],{radius:Math.max(3,2+(e.mag-2)*2),weight:1,color:'#ffffff',fillColor:color(e.depth),fillOpacity:.78}).addTo(layer);const url=reportURL(e);marker.bindPopup('<h3>M '+e.mag.toFixed(1)+'</h3><strong>'+esc(e.place)+'</strong><p>'+dateFmt.format(e.time)+' · Panamá</p><p>Profundidad: '+(Number.isFinite(e.depth)?e.depth.toFixed(1)+' km':'sin dato')+'<br>Coordenadas: '+e.lat.toFixed(3)+', '+e.lon.toFixed(3)+'<br>Tipo de magnitud: '+esc(e.magType||'sin dato')+'</p>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">Ver reporte '+esc(e.source||'USGS')+' ↗</a>':''));marker.on('click',()=>{if(e.hasShakeMap)window.PanaShakeViewer?.show(e);else window.PanaShakeViewer?.clear()});markers.set(e.id,marker)}$('count').textContent=visible.length.toLocaleString('es');const biggest=visible.reduce((a,e)=>!a||e.mag>a.mag?e:a,null);$('maxmag').textContent=biggest?biggest.mag.toFixed(1):'—';$('maxplace').textContent=biggest?biggest.place:'Sin eventos';const ds=visible.map(e=>e.depth).filter(Number.isFinite).sort((a,b)=>a-b);$('meddepth').textContent=ds.length?(ds.length%2?ds[Math.floor(ds.length/2)]:(ds[ds.length/2-1]+ds[ds.length/2])/2).toFixed(1):'—';renderTable();PanaCharts.render(visible,catalog);$('shakeCount').textContent=visible.filter(e=>e.hasShakeMap).length.toLocaleString('es')+' eventos con ShakeMap en los filtros actuales.';$('status').textContent=source+' · '+catalog.length.toLocaleString('es')+' registros cargados.'+(mag<floor?' El catálogo cargado no incluye todos los eventos por debajo de M '+floor.toFixed(1)+'. Pulsa Consultar para ese umbral.':'')+' '+coverageWarning;}
function durationCell(id){const d=sourceDurations[id];return d&&Number.isFinite(d.seconds)?'<span title="Función temporal de la fuente USGS · '+esc(d.magnitudeType||'tensor de momento')+'">'+d.seconds.toLocaleString('es-PA',{maximumFractionDigits:1})+' s</span>':'<span class="duration-missing">No disponible</span>';}
fetch('data/source-durations.json').then(r=>{if(!r.ok)throw Error('Duraciones no disponibles');return r.json();}).then(d=>{sourceDurations=d.events||{};renderTable();}).catch(()=>{});
function renderTable(){
 const mode=$('order').value,sorted=[...visible].sort((a,b)=>mode==='mag'?b.mag-a.mag:mode==='depth'?a.depth-b.depth:b.time-a.time);$('events').innerHTML='';
 for(const e of sorted.slice(0,300)){
  const tr=document.createElement('tr');tr.tabIndex=0;tr.setAttribute('aria-label','Ubicar sismo M '+e.mag+' '+e.place);
  const url=reportURL(e);
  tr.innerHTML='<td><span class="badge">'+e.mag.toFixed(1)+'</span></td><td>'+durationCell(e.usgsId||e.id)+'</td><td>'+dateFmt.format(e.time)+'</td><td>'+esc(e.place)+'</td><td>'+(Number.isFinite(e.depth)?e.depth.toFixed(1)+' km':'—')+'</td><td>'+(url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(e.source||'USGS')+' ↗</a>':'Archivo')+'<br><small>'+esc(e.status)+'</small></td><td>'+(e.hasShakeMap?'<button class="shake-button" title="'+esc(e.match?.method||'ShakeMap disponible en USGS')+'">Ver ShakeMap</button>':'No disponible / sin asociación')+'</td>';
  const select=()=>{map.setView([e.lat,e.lon],9);markers.get(e.id)?.openPopup();if(e.hasShakeMap)window.PanaShakeViewer?.show(e);else window.PanaShakeViewer?.clear()};
  tr.addEventListener('click',ev=>{if(!ev.target.closest('a'))select()});tr.addEventListener('keydown',ev=>{if(ev.target===tr&&ev.key==='Enter')select()});$('events').appendChild(tr);
 }
 $('tableNote').textContent=visible.length>300?'Tabla: primeros 300 eventos. Mapa y descarga: todos los eventos filtrados.':visible.length?'':'No hay eventos con estos filtros en el catálogo cargado. Revisa período, magnitud, localidad o el filtro ShakeMap.';
}
function fit(){if(visible.length)map.fitBounds(L.latLngBounds(visible.map(e=>[e.lat,e.lon])),{padding:[45,45],maxZoom:10});else map.setView([8.15,-80.6],7)}
function describeSelection(){
 const local=$('catalogSource').value==='igc';
 $('activeSourceLink').href=local?'https://sismosgeociencias.up.ac.pa/':'https://earthquake.usgs.gov/earthquakes/search/';$('activeSourceLink').textContent=local?'Fuente IGC–UP ↗':'Fuente USGS ↗';$('sourceDocs').href=local?'https://sismosgeociencias.up.ac.pa/':'https://earthquake.usgs.gov/fdsnws/event/1/';
 for(const option of $('period').options)option.disabled=local&&['30d','history'].includes(option.value);
 if(local&&['30d','history'].includes($('period').value))$('period').value='7d';
 $('sourceCoverage').textContent=local?'IGC–UP: boletín publicado de los últimos 7 días. Hora de origen UTC−5. Las asociaciones con USGS son automáticas y conservadoras.':'USGS: Panamá y alrededores, incluidos epicentros mar adentro (5–11° N; 85–76° O). ShakeMap también procede de USGS.';
 const label=$('period').selectedOptions[0].textContent;
 $('periodScope').textContent=label+' · '+(local?'Catálogo local IGC–UP (cobertura limitada a 7 días).':'Catálogo USGS.');
 $('refresh').textContent='Consultar '+(local?'IGC–UP':'USGS');
}
async function queryUSGS(start,end,minmag,onlyShake=false){
 const params=new URLSearchParams({format:'geojson',starttime:new Date(start).toISOString(),endtime:new Date(Math.min(end,Date.now())).toISOString(),minlatitude:5,maxlatitude:11,minlongitude:-85,maxlongitude:-76,minmagnitude:minmag,eventtype:'earthquake',orderby:'time-asc'});
 if(onlyShake)params.set('producttype','shakemap');
 const response=await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?'+params,{signal:AbortSignal.timeout(45000)});
 if(response.status===204)return [];
 if(!response.ok)throw Error(response.status===400?'USGS rechazó la consulta: reduce el período o aumenta la magnitud.':'USGS respondió '+response.status);
 return fromGeoJSON(await response.json());
}
async function localSnapshot(){
 // The raw copy updates even when a bot commit does not trigger GitHub Pages.
 for(const url of ['https://raw.githubusercontent.com/nactuarial/panasismos/main/data/igc-up.json','data/igc-up.json']){
  try{const r=await fetch(url+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)continue;const d=await r.json();if(!d.metadata?.generated||!d.features?.length)continue;return d}catch(e){/* try the bundled copy */}
 }
 throw Error('No se pudo descargar la copia IGC–UP.');
}
async function refresh({fitView=true}={}){
 const token=++refreshToken;describeSelection();const {start,end}=bounds(),local=$('catalogSource').value==='igc',only=$('onlyShake').checked,targetFloor=+$('mag').value;
 $('refresh').disabled=true;$('refresh').textContent='Consultando…';$('status').textContent='Consultando '+(local?'IGC–UP':'USGS')+'…';
 try{
  let next,label,warning='';
  if(local){
   const snapshot=await localSnapshot();next=fromGeoJSON(snapshot);const generated=Date.parse(snapshot.metadata.generated);
   label='IGC–UP · copia descargada '+dateFmt.format(generated);
   if(Date.now()-generated>60*60*1000)warning='Copia IGC–UP de más de una hora; puede faltar actividad reciente. ';
   warning+='IGC–UP cubre solo los últimos 7 días publicados. ';
   try{const oldest=Math.min(...next.map(e=>e.time));const maps=await queryUSGS(Math.max(start,oldest-90000),end,0,true);next=PanaSources.matchLocal(next,maps)}
   catch(e){if(only)throw Error('No se pudo verificar la disponibilidad de ShakeMap en USGS. '+e.message);warning+='No se pudo comprobar ShakeMap en USGS. ';}
  }else{
   next=await queryUSGS(start,end,targetFloor,only);label='USGS consultado '+dateFmt.format(Date.now());
   if(only)warning='Consulta limitada a eventos con ShakeMap. ';
  }
  if(token!==refreshToken)return;
  catalog=next;floor=local?0:targetFloor;source=label;coverageWarning=warning;apply();if(fitView)fit();
 }catch(e){if(token===refreshToken)$('status').textContent='No se pudo actualizar. '+(catalog.length?'Se conserva el catálogo anterior. ':'')+e.message}
 finally{if(token===refreshToken){$('refresh').disabled=false;describeSelection()}}
}
for(const id of ['catalogSource','period','onlyShake'])$(id).addEventListener('change',()=>{catalog=[];visible=[];floor=0;source='Cargando selección';coverageWarning='';describeSelection();window.PanaShakeViewer?.clear();apply();refresh()});
for(const id of ['mag','depth','search'])$(id).addEventListener('input',apply);$('order').addEventListener('change',renderTable);$('refresh').addEventListener('click',refresh);$('fit').addEventListener('click',fit);$('axisFit').addEventListener('click',()=>{if(axisBounds)map.fitBounds(axisBounds,{padding:[60,60],maxZoom:8})});$('file').addEventListener('change',async ev=>{const file=ev.target.files[0];if(!file)return;try{const text=await file.text();const next=/\.csv$/i.test(file.name)?fromCSV(text):fromGeoJSON(JSON.parse(text));if(!next.length)throw Error('No se encontraron eventos válidos.');refreshToken++;$('refresh').disabled=false;describeSelection();window.PanaShakeViewer?.clear();coverageWarning='';catalog=next;floor=Math.min(...next.map(e=>e.mag));source='Archivo '+file.name;apply();fit()}catch(e){$('status').textContent='No se pudo cargar el archivo: '+e.message}ev.target.value=''});$('export').addEventListener('click',()=>{const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='time,latitude,longitude,depth,mag,magType,id,place,url,source,status,usgsId,hasShakeMap\n'+visible.map(e=>[new Date(e.time).toISOString(),e.lat,e.lon,Number.isFinite(e.depth)?e.depth:'',e.mag,e.magType,e.id,e.place,e.url,e.source,e.status,e.usgsId,e.hasShakeMap].map(quote).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='panasismos-secuencia-2026-10-09.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
setInterval(()=>{if(document.visibilityState==='visible')refresh({fitView:false})},5*60*1000);
(async()=>{try{const r=await fetch('catalog.json');if(!r.ok)throw Error('Catálogo inicial no disponible');const data=await r.json();catalog=fromGeoJSON(data);source='Copia USGS · corte 10 oct. 2026, 06:54 Panamá · M ≥ 4';apply();fit()}catch(e){$('status').textContent=e.message+'. Consulta USGS o carga un CSV.'}describeSelection();await refresh({fitView:false})})();
