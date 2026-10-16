'use strict';
(()=>{
 let request=0,overlay=null,selectedMarker=null;
 map.createPane('catalogShakemap');map.getPane('catalogShakemap').style.zIndex='300';
 const safeURL=u=>/^https:\/\/earthquake\.usgs\.gov\//.test(u||'');
 function clear(){request++;overlay?.remove();selectedMarker?.remove();overlay=null;selectedMarker=null;$('selectedShake').hidden=true;}
 async function show(event){
  clear();const token=request,id=event.usgsId||event.id;
  $('selectedShake').hidden=false;$('selectedShakeTitle').textContent='Cargando ShakeMap USGS…';
  const original='https://earthquake.usgs.gov/earthquakes/eventpage/'+encodeURIComponent(id)+'/shakemap';
  $('selectedShakeLink').href=original;$('selectedShakeMeta').textContent='';
  try{
   const r=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/'+encodeURIComponent(id)+'.geojson',{signal:AbortSignal.timeout(30000)});
   if(!r.ok)throw Error('USGS respondió '+r.status);
   const data=await r.json();if(token!==request)return;
   const product=(data.properties.products?.shakemap||[]).filter(p=>p.status!=='DELETE').sort((a,b)=>(+b.preferredWeight||0)-(+a.preferredWeight||0)||b.updateTime-a.updateTime)[0];
   if(!product)throw Error('Este evento ya no tiene un ShakeMap disponible.');
   const png=product.contents?.['download/intensity_overlay.png']?.url,world=product.contents?.['download/intensity_overlay.pngw']?.url;
   if(!safeURL(png)||!safeURL(world))throw Error('USGS no ofrece una capa georreferenciada para este producto. Abre el ShakeMap original.');
   const [wr,img]=await Promise.all([fetch(world,{signal:AbortSignal.timeout(30000)}),new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('No se pudo descargar la imagen ShakeMap.'));i.src=png;})]);
   if(!wr.ok)throw Error('No se pudo cargar la georreferencia.');
   const [a,d,b,e,c,f]=(await wr.text()).trim().split(/\s+/).map(Number);
   if(![a,d,b,e,c,f].every(Number.isFinite)||d!==0||b!==0||a<=0||e>=0)throw Error('Georreferencia ShakeMap no compatible.');
   if(token!==request)return;
   const west=c-a/2,north=f-e/2,east=west+a*img.naturalWidth,south=north+e*img.naturalHeight;
   if(![west,north,east,south].every(Number.isFinite)||south>=north||west>=east||south< -90||north>90||west< -180||east>180)throw Error('Extensión ShakeMap no válida.');
   overlay=L.imageOverlay(png,[[south,west],[north,east]],{pane:'catalogShakemap',opacity:.6,interactive:false}).addTo(map);
   const coords=data.geometry.coordinates;
   selectedMarker=L.circleMarker([coords[1],coords[0]],{radius:8,color:'#20324b',weight:3,fillColor:'#fff',fillOpacity:1}).addTo(map).bindTooltip('Epicentro USGS del ShakeMap',{permanent:true,direction:'top'});
   $('selectedShakeTitle').textContent='ShakeMap USGS · M '+data.properties.mag+' · '+dateFmt.format(data.properties.time);
   $('selectedShakeMeta').textContent='Intensidad máxima MMI · versión '+(product.properties.version||'—')+' · actualizado '+dateFmt.format(product.updateTime)+(event.match?' · '+event.match.method+'; Δt '+event.match.seconds.toFixed(1)+' s, distancia '+event.match.km.toFixed(1)+' km. Epicentro y sacudida de USGS.':'');
   map.fitBounds([[south,west],[north,east]],{padding:[30,30],maxZoom:9});
  }catch(e){if(token!==request)return;$('selectedShakeTitle').textContent='No se pudo cargar la capa ShakeMap';$('selectedShakeMeta').textContent=e.message+' Consulta el producto original USGS.';}
 }
 $('clearShake').addEventListener('click',clear);window.PanaShakeViewer={show,clear};
})();
