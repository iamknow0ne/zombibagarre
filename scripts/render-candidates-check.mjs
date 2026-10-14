// CPU-only comparison of selection work. Does not measure GPU cost or FPS.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Group,Object3D,Vector3} from 'three';
import {activeHealthBarCandidates,nearestVisiblePieces} from '../src/rebuild/RenderCandidates.js';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
function measure(name,baseline,optimized,details){
 assert.deepEqual(optimized(),baseline());for(let i=0;i<100;i++){baseline();optimized();}
 const a=[],b=[],frames=500,rounds=9,time=fn=>{const start=performance.now();for(let i=0;i<frames;i++)fn();return(performance.now()-start)/frames;};
 for(let i=0;i<rounds;i++){if(i%2){b.push(time(optimized));a.push(time(baseline));}else{a.push(time(baseline));b.push(time(optimized));}}
 const old=median(a),next=median(b);return{name,...details,matchingOrder:true,rounds,framesPerRound:frames,baselineMs:+old.toFixed(5),optimizedMs:+next.toFixed(5),speedup:+(old/next).toFixed(2)};
}
const results=[],root=new Group(),building=new Group(),face=new Group();root.add(building);building.add(face);building.position.set(6,2,12);building.rotation.y=.3;face.rotation.y=.8;
const pieces=Array.from({length:200},(_,i)=>{const m=new Object3D();m.position.set(i%10-5,Math.floor(i/10)*.8,Math.sin(i));face.add(m);return m;}),point=new Vector3(12,8,14);
results.push(measure('building impact piece ordering',()=>pieces.filter(m=>m.visible).sort((a,b)=>a.getWorldPosition(new Vector3()).distanceTo(point)-b.getWorldPosition(new Vector3()).distanceTo(point)),()=>nearestVisiblePieces(pieces,point),{pieces:pieces.length}));
const player={x:3,z:8};
for(const [count,active]of [[60,12],[60,60],[300,30],[600,60],[600,0]]){
 const enemies=Array.from({length:count},(_,i)=>({id:i,x:Math.sin(i*2.399)*Math.sqrt(i+1)*2,z:Math.cos(i*2.399)*Math.sqrt(i+1)*2,health:i<active?50:100,maxHealth:100})),bars=new Map(enemies.slice(0,active).map(e=>[e.id,{hitAt:10}]));
 const legacy=()=>{const ids=new Set(enemies.filter(e=>e.health>0).map(e=>e.id));for(const id of bars.keys())if(!ids.has(id))bars.delete(id);return [...enemies].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z)).filter(e=>e.health>0&&e.health<e.maxHealth&&bars.has(e.id)&&10-bars.get(e.id).hitAt<=4);};
 results.push(measure('health-bar candidates',legacy,()=>activeHealthBarCandidates(enemies,bars,player,10),{enemies:count,activeBars:active}));
}
console.log(JSON.stringify({kind:'CPU-only local microbenchmark; no FPS claim',results},null,2));
