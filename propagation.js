'use strict';
(()=>{
 const el=id=>document.getElementById(id),ref={lat:7.5868,lon:-80.769,depth:12.6,time:Date.parse('2026-10-09T17:56:06.036Z')};
 const locations={panama:{name:'Ciudad de Panamá',lat:8.9824,lon:-79.5199},gamboa:{name:'Gamboa',lat:9.119,lon:-79.7},colon:{name:'Colón',lat:9.359,lon:-79.901},david:{name:'David',lat:8.427,lon:-82.431},santiago:{name:'Santiago',lat:8.106,lon:-80.969},chitre:{name:'Chitré',lat:7.961,lon:-80.429},palma:{name:'La Palma',lat:8.406,lon:-78.14}};
 const whole=L.latLngBounds([[6.9,-83.2],[9.85,-77.05]]);
 const smap=L.map('propagationMap',{preferCanvas:true,scrollWheelZoom:false}).fitBounds(whole,{padding:[25,25]});
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(smap);
 smap.createPane('shaking');smap.getPane('shaking').style.zIndex=250;
 const shaking=L.imageOverlay('assets/shakemap-us6000u18k.png',[[6.7,-83.35],[10.05,-76.95]],{pane:'shaking',opacity:.48,interactive:false}).addTo(smap);
 const contours=L.layerGroup().addTo(smap);
 const waves=L.layerGroup().addTo(smap);
 const pWave=L.circle([ref.lat,ref.lon],{radius:0,color:'#147dba',weight:2.5,fill:false,interactive:false}).addTo(waves);
 const sWave=L.circle([ref.lat,ref.lon],{radius:0,color:'#986e1b',weight:3,dashArray:'6 4',fill:false,interactive:false}).addTo(waves);
 L.circleMarker([ref.lat,ref.lon],{radius:7,color:'#ffffff',weight:2,fillColor:'#b13b32',fillOpacity:1}).addTo(smap).bindTooltip('Epicentro · M 7,7',{permanent:true,direction:'top'});
 const capital=L.circleMarker([locations.panama.lat,locations.panama.lon],{radius:6,color:'#20324b',weight:2,fillColor:'#ffffff',fillOpacity:1}).addTo(smap).bindTooltip('Ciudad de Panamá',{permanent:true,direction:'right'});
 const selected=L.circleMarker([locations.panama.lat,locations.panama.lon],{radius:9,color:'#20324b',weight:2,fill:false}).addTo(smap);
 let grid=null,point=locations.panama,time=0,running=false,frame=0,previous=0;
 const format=new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 const number=(n,d=1)=>n.toLocaleString('es-PA',{minimumFractionDigits:d,maximumFractionDigits:d});
 function distance(a,b){const rad=Math.PI/180,dl=(b.lat-a.lat)*rad,dn=(b.lon-a.lon)*rad;return 12742.0176*Math.asin(Math.sqrt(Math.min(1,Math.sin(dl/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dn/2)**2)))}
 function sample(lat,lon){if(!grid)return null;const native=grid.nativePoints?.find(p=>Math.abs(p.lat-lat)<1e-8&&Math.abs(p.lon-lon)<1e-8);if(native)return native.values;const x=(lon-grid.west)/grid.dx,y=(grid.north-lat)/grid.dy;if(x<0||y<0||x>grid.cols-1||y>grid.rows-1)return null;const i=Math.min(grid.cols-2,Math.floor(x)),j=Math.min(grid.rows-2,Math.floor(y)),fx=x-i,fy=y-j;return [0,1,2].map(k=>(1-fy)*((1-fx)*grid.data[j*grid.cols+i][k]+fx*grid.data[j*grid.cols+i+1][k])+fy*((1-fx)*grid.data[(j+1)*grid.cols+i][k]+fx*grid.data[(j+1)*grid.cols+i+1][k]));}
 function arrival(){const range=distance(ref,point),path=Math.hypot(range,ref.depth);return{range,p:path/+el('pSpeed').value,s:path/+el('sSpeed').value};}
 function updatePoint(){const a=arrival();el('locationTitle').textContent=point.name;el('locationCoords').textContent=point.lat.toFixed(3)+', '+point.lon.toFixed(3)+' · '+number(a.range,0)+' km del epicentro';el('pArrival').textContent='≈ '+number(a.p,0)+' s';el('sArrival').textContent='≈ '+number(a.s,0)+' s';el('arrivalClocks').textContent='Llegadas aproximadas: P '+format.format(ref.time+a.p*1000)+' · S '+format.format(ref.time+a.s*1000)+' · Panamá';const values=sample(point.lat,point.lon);el('localMMI').textContent=values?number(values[0]):'—';el('localPGA').textContent=values?number(values[1],2)+' %g':'—';el('localPGV').textContent=values?number(values[2],2)+' cm/s':'—';const descriptions=['No perceptible','Débil','Débil','Ligera','Moderada','Fuerte','Muy fuerte','Severa','Violenta','Extrema'];el('feltDescription').textContent=values?'Sacudida '+descriptions[Math.min(9,Math.max(0,Math.round(values[0])-1))].toLowerCase()+' estimada · intensidad MMI':'Sin valor de ShakeMap en este punto.';selected.setLatLng([point.lat,point.lon]);updateTime();}
 function updateTime(){el('waveTime').value=String(time);el('waveClock').textContent=number(time,0)+' s desde el inicio';el('eventClock').textContent=format.format(ref.time+time*1000)+' · Panamá';for(const [wave,v] of [[pWave,+el('pSpeed').value],[sWave,+el('sSpeed').value]]){const travel=v*time;wave.setRadius(travel>=ref.depth?Math.sqrt(travel*travel-ref.depth*ref.depth)*1000:0);}const a=arrival();el('waveState').textContent=time<a.p?'Las ondas P y S aún no han llegado al punto seleccionado.':time<a.s?'La onda P ya llegó; la onda S aún está en tránsito.':'Las ondas P y S ya llegaron al punto seleccionado.';}
 function pause(){running=false;cancelAnimationFrame(frame);el('wavePlay').textContent=time>=240?'Reproducir de nuevo':'Reproducir propagación';el('wavePlay').setAttribute('aria-pressed','false');}
 function tick(now){if(!running)return;if(previous)time=Math.min(240,time+(now-previous)/1000*+el('playSpeed').value);previous=now;updateTime();if(time>=240)pause();else frame=requestAnimationFrame(tick);}
 el('wavePlay').addEventListener('click',()=>{if(running){pause();return}if(time>=240)time=0;running=true;previous=0;el('wavePlay').textContent='Pausar';el('wavePlay').setAttribute('aria-pressed','true');frame=requestAnimationFrame(tick);});
 el('waveReset').addEventListener('click',()=>{pause();time=0;updateTime();});
 el('waveTime').addEventListener('input',()=>{pause();time=+el('waveTime').value;updateTime();});
 for(const id of ['pSpeed','sSpeed'])el(id).addEventListener('change',()=>{if(!el('pSpeed').checkValidity()||!el('sSpeed').checkValidity()||!Number.isFinite(+el('pSpeed').value)||!Number.isFinite(+el('sSpeed').value)||+el('pSpeed').value<=+el('sSpeed').value){el('pSpeed').value='5.8';el('sSpeed').value='3.4';}pause();updatePoint();});
 el('placeSelect').addEventListener('change',()=>{if(locations[el('placeSelect').value]){point=locations[el('placeSelect').value];updatePoint();}});
 smap.on('click',e=>{point={name:'Punto seleccionado',lat:e.latlng.lat,lon:e.latlng.lng};el('placeSelect').value='custom';updatePoint();});
 el('wholePanama').addEventListener('click',()=>smap.fitBounds(whole,{padding:[25,25]}));
 el('showShaking').addEventListener('change',()=>{if(el('showShaking').checked){shaking.addTo(smap);contours.addTo(smap)}else{shaking.remove();contours.remove();}});
 el('showWaves').addEventListener('change',()=>{if(el('showWaves').checked)waves.addTo(smap);else waves.remove();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 new ResizeObserver(()=>smap.invalidateSize({pan:false})).observe(el('propagationMap'));
 updatePoint();
 fetch('data/shakemap-us6000u18k.json.gz').then(async r=>{if(!r.ok)throw Error('No se pudo cargar ShakeMap');if(typeof DecompressionStream==='undefined')throw Error('Este navegador no permite leer la malla comprimida.');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();}).then(data=>{grid=data;el('shakeSource').textContent='ShakeMap USGS · versión '+data.version+' · actualizado '+format.format(Date.parse(data.updated))+' (Panamá). '+data.stations+' estaciones sísmicas y '+data.intensityReports+' observaciones de intensidad en el producto. Localidades predefinidas: interpolación de la malla original ≈ 1,2 km. Otros puntos: malla reducida ≈ 4,7 km. La capa de color conserva la malla original. Copia fija de este evento.';updatePoint();}).catch(e=>{el('shakeSource').textContent=e.message+' La animación aproximada sigue disponible; consulta el ShakeMap original.';});
 fetch('data/shakemap-contours.json').then(r=>{if(!r.ok)throw Error('Contornos no disponibles');return r.json();}).then(data=>{L.geoJSON(data,{pane:'shaking',style:f=>({color:f.properties.color,weight:1.2,opacity:.85}),onEachFeature:(f,layer)=>layer.bindTooltip('Intensidad MMI '+f.properties.value)}).addTo(contours);}).catch(()=>{});
})();
