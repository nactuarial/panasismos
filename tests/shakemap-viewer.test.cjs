const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const els=new Map(),layers=[];let fail=false,deleted=false;
const $=id=>{if(!els.has(id))els.set(id,{hidden:true,textContent:'',addEventListener(){}});return els.get(id)};
const map={createPane(){},getPane(){return{style:{}}},fitBounds(b){this.bounds=b}};
const product={status:'UPDATE',preferredWeight:100,updateTime:Date.now(),properties:{version:10},contents:{'download/intensity_overlay.png':{url:'https://earthquake.usgs.gov/image.png'},'download/intensity_overlay.pngw':{url:'https://earthquake.usgs.gov/world.pngw'}}};
const ctx=vm.createContext({console,Map,Promise,Number,AbortSignal,$,map,dateFmt:{format:()=> 'fecha'},Image:class{naturalWidth=100;naturalHeight=200;set src(u){queueMicrotask(()=>this.onload())}},L:{imageOverlay(url,bounds){const o={bounds,removed:false,addTo(){return this},remove(){this.removed=true}};layers.push(o);return o},circleMarker(){return{addTo(){return this},bindTooltip(){return this},remove(){}}}},fetch:async url=>{if(fail)throw Error('Sin red');return{ok:true,json:async()=>({geometry:{coordinates:[-80,8]},properties:{mag:5,time:Date.now(),products:{shakemap:[{...product,status:'DELETE',preferredWeight:1000},...(deleted?[]:[product])]}}}),text:async()=> '0.01\n0\n0\n-0.01\n-81\n9'}}});ctx.window=ctx;
vm.runInContext(fs.readFileSync('shakemap-viewer.js','utf8'),ctx);
(async()=>{
 await ctx.PanaShakeViewer.show({id:'us1'});assert.equal(layers.length,1);assert.deepEqual(JSON.parse(JSON.stringify(layers[0].bounds)),[[7.005000000000001,-81.005],[9.005,-80.005]]);assert($('selectedShakeMeta').textContent.includes('versión 10'));
 fail=true;await ctx.PanaShakeViewer.show({id:'us2'});assert(layers[0].removed);assert($('selectedShakeTitle').textContent.includes('No se pudo'));assert($('selectedShakeLink').href.includes('us2'));
 fail=false;deleted=true;await ctx.PanaShakeViewer.show({id:'us3'});assert.equal(layers.length,1);assert($('selectedShakeMeta').textContent.includes('ya no tiene'));
 ctx.PanaShakeViewer.clear();assert($('selectedShake').hidden);
 console.log('ShakeMap: georreferencia, producto vigente, limpieza y error de descarga OK');
})().catch(e=>{console.error(e);process.exitCode=1});
