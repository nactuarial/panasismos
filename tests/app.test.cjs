const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{value:'',checked:false,disabled:false,textContent:'',innerHTML:'',children:[],options:[],listeners:{},addEventListener(t,f){this.listeners[t]=f},appendChild(c){this.children.push(c)},setAttribute(){},get selectedOptions(){return [{textContent:this.value}]}});return elements.get(id)}
for(const [id,value] of Object.entries({mag:'4',depth:'300',order:'time',catalogSource:'usgs',period:'sequence'}))element(id).value=value;
element('period').options=['sequence','today','7d','30d','history'].map(value=>({value}));
const layer=()=>({addTo(){return this},on(){return this},bindPopup(){return this},bindTooltip(){return this},clearLayers(){},setView(){return this},fitBounds(){return this},createPane(){},getPane(){return {style:{}}},remove(){}});
const when=Date.now()-60000;
const geo=(id,source,types='')=>({type:'Feature',id,geometry:{coordinates:[-80.7,7.5,10]},properties:{time:when,mag:4.5,place:'Tonosí',source,types,status:'REVISADO',url:source?'https://sismosgeociencias.up.ac.pa/ultimosismo.html?x=1':'https://earthquake.usgs.gov/earthquakes/eventpage/'+id}});
const usgs={features:[geo('us1',null,',shakemap,'),{...geo('us2',null),properties:{...geo('us2',null).properties,time:when-500000}}]};
const local={metadata:{generated:new Date().toISOString()},features:[geo('igc1','IGC–UP')]};
const queries=[];
const context=vm.createContext({console,Intl,Date,URLSearchParams,AbortSignal,setInterval(){},setTimeout(){},PanaSources:require('../catalog-sources.js'),PanaCharts:{render(){}},L:{map:layer,tileLayer:layer,layerGroup:layer,circleMarker:layer,latLngBounds:layer},document:{getElementById:element,createElement:()=>element('tr'+Math.random()),visibilityState:'visible'},fetch:async url=>{queries.push(String(url));return {ok:true,status:200,json:async()=>url==='data/source-durations.json'?{}:String(url).includes('igc-up')?local:String(url).includes('producttype=shakemap')?{features:[usgs.features[0]]}:usgs}}});context.window=context;
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 vm.runInContext(fs.readFileSync('app.js','utf8'),context);await flush();await flush();assert.equal(element('count').textContent,'2');
 element('onlyShake').checked=true;element('onlyShake').listeners.change();await flush();assert.equal(element('count').textContent,'1');assert(queries.some(u=>u.includes('producttype=shakemap')));
 element('catalogSource').value='igc';element('catalogSource').listeners.change();await flush();await flush();assert.equal(element('count').textContent,'1');assert(element('status').textContent.includes('IGC–UP'));assert(element('events').children.at(-1).innerHTML.includes('Ver ShakeMap'));
 element('period').value='history';element('period').listeners.change();await flush();assert.equal(element('period').value,'7d');
 element('onlyShake').checked=false;element('onlyShake').listeners.change();await flush();assert.equal(element('count').textContent,'1');
 console.log('App: selector de fuente, filtro ShakeMap, catálogo local y período limitado OK');
})().catch(e=>{console.error(e);process.exitCode=1});
