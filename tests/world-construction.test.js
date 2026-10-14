import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/rebuild/World.js';
import {CombatOverlay} from '../src/rebuild/CombatOverlay.js';
function overlays(t){const old=globalThis.document,nodes=new Set();globalThis.document={createElement:()=>({style:{},setAttribute(){},getContext:()=>({}),remove(){nodes.delete(this);}})};t.after(()=>{if(old)globalThis.document=old;else delete globalThis.document;});return{nodes,game:{width:1280,height:720,style:{},setAttribute(){},addEventListener(){},removeEventListener(){},insertAdjacentElement(where,node){nodes.add(node);}}};}
test('failed WebGL construction removes its already inserted overlay and preserves the original error across retries',t=>{
 const {nodes,game}=overlays(t),failure=new Error('injected GPU context failure'),oldError=console.error;console.error=()=>{};t.after(()=>console.error=oldError);game.getContext=()=>{throw failure;};
 const listeners=new Set(),existing=()=>{};game.addEventListener=(type,callback)=>listeners.add(callback);game.removeEventListener=(type,callback)=>listeners.delete(callback);game.addEventListener('webglcontextlost',existing);const add=game.addEventListener;
 const oldOverlay=new CombatOverlay(game);assert.equal(nodes.size,1);
 for(let i=0;i<8;i++){assert.throws(()=>new World(game,{},0,{mapSeed:1}),error=>error===failure);assert.equal(nodes.size,1,'only the surviving world overlay remains');assert.deepEqual([...listeners],[existing],'failed Three context listeners must not remain on the shared canvas');assert.equal(game.addEventListener,add);}
 oldOverlay.destroy();assert.equal(nodes.size,0);
});
test('late construction failure releases scene resources, unfinished passes and overlays exactly once while retaining shared caches',t=>{
 const {nodes,game}=overlays(t),failure=new Error('injected late world initialization failure'),counts=new Map(),watch=(name,resource)=>{counts.set(name,0);resource.addEventListener('dispose',()=>counts.set(name,counts.get(name)+1));return resource;};
 const cached=watch('cached',new T.Texture());cached.userData.shared=true;let failed;
 class BrokenWorld extends World{initialize(canvas){
  failed=this;this.feedback=new CombatOverlay(canvas);this.scene=new T.Scene();const geometry=watch('geometry',new T.BoxGeometry()),owned=watch('owned',new T.Texture()),material=watch('material',new T.MeshStandardMaterial({map:cached,normalMap:owned}));this.scene.add(new T.Mesh(geometry,material),new T.Mesh(geometry,material));
  this.renderer={dispose(){counts.set('renderer',(counts.get('renderer')||0)+1);}};this.composer={passes:[],dispose(){counts.set('composer',(counts.get('composer')||0)+1);}};
  this.ao={dispose(){counts.set('ao',(counts.get('ao')||0)+1);}};this.composer.passes.push(this.ao);this.pixelArtPass={dispose(){counts.set('pixel',(counts.get('pixel')||0)+1);}};throw failure;
 }}
 assert.throws(()=>new BrokenWorld(game,{},0,{mapSeed:1}),error=>error===failure);failed.destroy();assert.equal(nodes.size,0);assert.equal(failed.destroyed,true);assert.deepEqual(failed.disposeErrors,[]);
 for(const key of ['geometry','owned','material','renderer','composer','ao','pixel'])assert.equal(counts.get(key),1,key);assert.equal(counts.get('cached'),0);
});
test('one failed cleanup does not prevent the remaining owners from being released or hide the startup error',()=>{
 const startup=new Error('startup failed'),cleanup=new Error('cleanup failed');let failed,rendererDisposed=0;
 class BrokenWorld extends World{initialize(){failed=this;this.ambience={dispose(){throw cleanup;}};this.renderer={dispose(){rendererDisposed++;}};throw startup;}}
 assert.throws(()=>new BrokenWorld(null,{},0,{mapSeed:1}),error=>error===startup);assert.deepEqual(failed.disposeErrors,[cleanup]);assert.equal(rendererDisposed,1);failed.destroy();assert.equal(rendererDisposed,1);
});
