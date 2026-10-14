import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionController} from '../../dev/RookMotionController.js';
import {createRookLocomotion} from '../../dev/RookLocomotion.js';
const bytes=await readFile(process.env.ROOK_TEST_MODEL||new URL('../../assets/characters/rook-prototype-v4.glb',import.meta.url));
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{};
async function fixture(){const loader=new GLTFLoader();loader.register(p=>{p.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'NODE_PLACEHOLDER_IMAGES'};});const{scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const travelRoot=new T.Group();travelRoot.add(scene);const c=createRookMotionController(scene);return{scene,travelRoot,c,dispose(){c.dispose();const g=new Set(),m=new Set(),t=new Set(),s=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.skeleton)s.add(o.skeleton);for(const mat of [].concat(o.material||[])){m.add(mat);for(const v of Object.values(mat))if(v?.isTexture)t.add(v);}});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());t.forEach(x=>x.dispose());s.forEach(x=>x.dispose());}};}
function near(a,b,tol=1e-7){assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}, tolerance ${tol}`);}
test('travel integrates commanded speed, acceleration and stopping identically at30/120Hz',()=>{
 const a=createRookLocomotion(),b=createRookLocomotion();for(const input of [{x:0,z:1,speed:1.2},{x:1,z:0,speed:.8},{x:0,z:0,speed:0}]){a.set(input);b.set(input);for(let i=0;i<90;i++)a.update(1/30);for(let i=0;i<360;i++)b.update(1/120);const x=a.frame(),y=b.frame();near(x.position.x,y.position.x);near(x.position.z,y.position.z);near(x.phase,y.phase);for(const side of ['L','R']){near(x.feet[side].x,y.feet[side].x);near(x.feet[side].z,y.feet[side].z);}}
 const stopped=a.frame();assert.ok(stopped.speed<1e-5);assert.ok(stopped.feet.L.planted&&stopped.feet.R.planted);near(stopped.position.z,3.6,1e-5);near(stopped.position.x,2.4,1e-5);
});
test('planted travel-space foot anchors remain fixed during direction changes and stop',()=>{
 const p=createRookLocomotion();let previous=p.frame(),checks=0;for(const input of [{x:0,z:1,speed:1},{x:-1,z:0,speed:1},{x:0,z:-1,speed:.7},{x:0,z:0,speed:0}]){p.set(input);for(let i=0;i<120;i++){const now=p.update(1/60);for(const s of ['L','R'])if(previous.feet[s].planted&&now.feet[s].planted){near(now.position.x+now.feet[s].x,previous.position.x+previous.feet[s].x);near(now.position.z+now.feet[s].z,previous.position.z+previous.feet[s].z);checks++;}previous=now;}}assert.ok(checks>300);
});
test('actual v4 soles and ankle anchors hold through starts, strafes, backward travel and stops',async()=>{
 const f=await fixture();try{let checked=0;for(const input of [{x:0,z:1,speed:.8},{x:0,z:-1,speed:1.2},{x:1,z:0,speed:1.2},{x:-1,z:0,speed:3},{x:0,z:1,speed:3}]){
  f.c.reset();f.travelRoot.position.set(0,0,0);f.c.setLocomotion(input);f.c.select('locomotion');
  for(let i=0;i<150;i++){if(i===90)f.c.setLocomotion({x:0,z:0,speed:0});const d=f.c.update(1/30);f.travelRoot.position.copy(f.c.getTravelPose());f.travelRoot.updateMatrixWorld(true);for(const [side,foot]of Object.entries(d.footContacts)){assert.ok(foot.anchorError<.002,`${JSON.stringify(input)} ${side} frame${i} anchor drift${foot.anchorError}`);assert.ok(Math.abs(foot.soleHeight-foot.floor-foot.clearance)<.001,`${side} floor/clearance error`);if(foot.planted){const actual=f.scene.getObjectByName('foot'+side).getWorldPosition(new T.Vector3());near(actual.x,foot.anchorX,.002);near(actual.z,foot.anchorZ,.002);}checked++;}}
  assert.ok(f.c.diagnostics().locomotion.speed<.001);assert.ok(Object.values(f.c.diagnostics().locomotion.feet).every(p=>p.planted));
 }assert.ok(checked>=1500);}finally{f.dispose();}
});
test('locomotion seek replays current command deterministically and leaving mode clears travel',async()=>{
 const f=await fixture();try{f.c.setLocomotion({x:1,z:1,speed:1.4});f.c.select('locomotion');for(let i=0;i<120;i++)f.c.update(1/60);const travel=f.c.getTravelPose(),feet=f.c.diagnostics().footContacts;f.c.seek(2);near(f.c.getTravelPose().distanceTo(travel),0);for(const s of ['L','R'])near(f.c.diagnostics().footContacts[s].actualX,feet[s].actualX,1e-6);f.c.setLocomotion({x:0,z:0,speed:0});f.c.seek(2);near(f.c.getTravelPose().length(),0);f.c.select('rifle');near(f.c.getTravelPose().length(),0);f.c.seek(.8);assert.ok(f.c.diagnostics().palmContactError<.001);}finally{f.dispose();}
});
test('travel rejects invalid speeds/directions and its replay contract is explicit',()=>{const p=createRookLocomotion();for(const input of [{x:0,z:1,speed:4},{x:NaN,z:0,speed:1},{x:0,z:1,speed:-1}])assert.throws(()=>p.set(input),/finite/);assert.match(p.frame().scope,/seek replays the current input/);});
