import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOK_COMBAT_MODES,sampleRookCombat} from '../../dev/RookCombatMotion.js';
const numbers=value=>typeof value==='number'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(numbers):[];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('combat samples are bounded deterministic one-shots with explicit anticipation, strike and recovery',()=>{
 assert.deepEqual(ROOK_COMBAT_MODES.map(m=>m.id),['slash','reverse','thrust','combo','dodge']);
 for(const spec of ROOK_COMBAT_MODES){
  const expected=sampleRookCombat(spec.id,.37);sampleRookCombat('dodge',.95);assert.deepEqual(sampleRookCombat(spec.id,.37),expected);
  assert.deepEqual(sampleRookCombat(spec.id,-2),sampleRookCombat(spec.id,0));
  assert.deepEqual(sampleRookCombat(spec.id,100),sampleRookCombat(spec.id,spec.duration));
  for(let i=0;i<=240;i++){
   const frame=sampleRookCombat(spec.id,spec.duration*i/240,{contact:true});assert.ok(numbers(frame).every(Number.isFinite));
   assert.ok(frame.rootOffset.y>=-.20&&frame.rootOffset.y<=-.05);assert.ok(Math.abs(frame.travel.x)<=.52000001);
   for(const hand of Object.values(frame.hands)){assert.ok(Math.abs(hand.x)<=.32&&hand.y>=1.09&&hand.y<=1.45&&hand.z>=.17&&hand.z<=.51);}
   for(const foot of Object.values(frame.feet)){assert.ok(Math.abs(foot.x)<.58);assert.ok(foot.clearance>=0&&foot.clearance<=.076);if(foot.planted)assert.ok(foot.clearance<1e-12);}
  }
 }
 assert.equal(sampleRookCombat('slash',.2).phase,'anticipation');assert.equal(sampleRookCombat('slash',.4).phase,'strike');assert.equal(sampleRookCombat('slash',.55).phase,'follow-through');assert.equal(sampleRookCombat('slash',.8).phase,'recovery');
 assert.equal(sampleRookCombat('slash',1.15).complete,true);assert.equal(sampleRookCombat('dodge',1.1).phase,'settled');
});

test('contact recoil begins at blade crossing, remains bounded, and completely recovers',()=>{
 for(const t of [0,.2,.415,.65,1.15])assert.deepEqual(sampleRookCombat('slash',t,{contact:true}),sampleRookCombat('slash',t));
 let max=0;for(let i=0;i<=120;i++){
  const t=.415+i/120*(.64-.415),hit=sampleRookCombat('slash',t,{contact:true}),free=sampleRookCombat('slash',t);
  max=Math.max(max,distance(hit.hands.R,free.hands.R));assert.ok(distance(hit.hands.R,free.hands.R)<=.031);assert.ok(Math.abs(hit.weapon.yaw-free.weapon.yaw)<=.0650001);
  assert.deepEqual(hit.feet,free.feet);assert.deepEqual(hit.travel,free.travel);assert.equal(hit.phase,free.phase);
 }
 assert.ok(max>.025,'contact must have a visible finite reaction');
});

test('dodge support feet stay planted in world space and land at the translated destination',()=>{
 for(const direction of [-1,1])for(const side of ['L','R']){
  const lead=(side==='L')===(direction===1),lift=lead?.16:.30,land=lead?.55:.78,base=side==='L'?.23:-.23;
  for(let i=0;i<=100;i++){
   const t=1.1*i/100,f=sampleRookCombat('dodge',t,{direction}),foot=f.feet[side];
   if(t<=lift)assert.ok(Math.abs(foot.x+f.travel.x-base)<1e-10,'support does not slide during anticipation/push');
   if(t>=land)assert.ok(Math.abs(foot.x+f.travel.x-(base+direction*.52))<1e-10,'landed foot stays planted during recovery');
  }
 }
 const end=sampleRookCombat('dodge',1.1);assert.equal(end.rootOffset.y,-.055);assert.ok(Math.abs(end.torso.roll)<1e-12);assert.equal(end.weapon.visible,false);
});

test('authored keys and contact pulses have continuous pose and zero-velocity one-shot endpoints',()=>{
 for(const mode of ['slash','reverse','thrust','combo','dodge'])for(const contact of [false,true]){
  const spec=ROOK_COMBAT_MODES.find(s=>s.id===mode),h=1e-5;
  for(const t of [0,.16,.18,.28,.39,.415,.45,.49,.55,.60,.62,.64,.85,.95,spec.duration]){
   const a=sampleRookCombat(mode,t-h,{contact}),b=sampleRookCombat(mode,t+h,{contact});
   assert.ok(distance(a.hands.R,b.hands.R)<.0002);assert.ok(distance(a.rootOffset,b.rootOffset)<.0002);assert.ok(Math.abs(a.weapon.yaw-b.weapon.yaw)<.0004);
  }
  for(const t of [0,spec.duration]){const a=sampleRookCombat(mode,t,{contact}),b=sampleRookCombat(mode,t===0?h:t-h,{contact});assert.ok(distance(a.hands.R,b.hands.R)/h<.001);assert.ok(distance(a.travel,b.travel)/h<.001);}
 }
});

test('invalid mode/time/options fail explicitly without introducing NaN into the rig',()=>{
 assert.throws(()=>sampleRookCombat('unknown',0),RangeError);
 for(const time of [NaN,Infinity,-Infinity])assert.throws(()=>sampleRookCombat('slash',time),TypeError);
 for(const direction of [0,2,NaN])assert.throws(()=>sampleRookCombat('dodge',0,{direction}),TypeError);
 assert.throws(()=>sampleRookCombat('slash',0,{contact:'yes'}),TypeError);
});

// The following checks load actual v4 mesh and skeleton data. Node substitutes
// a 1x1 texture solely to avoid browser image decoding; raster rendering and
// contact appearance still need the separate browser study review.
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionController} from '../../dev/RookMotionController.js';
async function fixture(){
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{constructor(type,init){Object.assign(this,{type},init);}};
 const bytes=await readFile(process.env.ROOK_TEST_MODEL||new URL('../../assets/characters/rook-prototype-v4.glb',import.meta.url)),loader=new GLTFLoader();
 loader.register(p=>{p.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'NODE_COMBAT_IMAGE_PLACEHOLDER'};});
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const bones=[],skins=[];scene.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
 return{scene,bones,skins,controller:createRookMotionController(scene),dispose(){this.controller.dispose();const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of [].concat(o.material||[])){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});for(const group of[geometries,materials,textures,skeletons])for(const resource of group)resource.dispose();}};
}
test('actual skinned Rook solves blade and dodge targets, keeps soles grounded and preserves bind matrices',async()=>{
 const f=await fixture(),c=f.controller,inverses=f.skins.map(s=>s.skeleton.boneInverses.map(m=>m.toArray()));
 try{for(const mode of ['slash','reverse','thrust','combo','dodge'])for(const contact of [false,true]){
  c.select(mode);c.setCombat({contact});
  for(let i=0;i<=60;i++){
   const d=c.seek(dDuration(mode)*i/60);assert.ok(d.maxReachError<.003,`${mode} target reach ${d.maxReachError}`);
   for(const side of ['L','R']){const foot=d.footContacts[side];assert.ok(Math.abs(foot.soleHeight-foot.floor-foot.clearance)<.001);assert.ok(foot.anchorError<.003);}
   for(const bone of f.bones)assert.ok([...bone.position,...bone.quaternion,...bone.scale].every(Number.isFinite));
   const weapon=c.getWeaponPose();assert.equal(weapon.weapon,'katana');assert.equal(weapon.visible,mode!=='dodge');
   if(weapon.visible){const grip=new T.Vector3(-.045,.015,0).multiply(weapon.scaleVector).applyQuaternion(weapon.quaternion).add(weapon.position);assert.ok(grip.distanceTo(c.getSocket('right').palmPosition)<.003,'mesh grip follows actual solved palm');}
  }
 }
 assert.deepEqual(f.skins.map(s=>s.skeleton.boneInverses.map(m=>m.toArray())),inverses);
 }finally{f.dispose();}
});
const dDuration=mode=>ROOK_COMBAT_MODES.find(m=>m.id===mode).duration;

test('controller clamps once modes and swaps rifle/blade only while hidden, with fixed nonzero scale',async()=>{
 const f=await fixture(),c=f.controller;
 try{
  c.select('rifle');c.seek(.3);let previous=c.getWeaponPose();assert.equal(previous.weapon,'carbine');assert.equal(previous.visible,true);
  for(const mode of ['slash','rifle','dodge','slash']){
   c.select(mode);
   for(let i=0;i<50;i++){c.update(.01);const w=c.getWeaponPose();assert.ok(Math.abs(Math.abs(w.scaleVector.x)-.62)<1e-10);if(w.weapon!==previous.weapon){assert.equal(w.visible,false);assert.equal(previous.visible,false);}previous=w;}
  }
  for(const mode of ['slash','reverse','thrust','combo','dodge']){c.select(mode);c.update(999);const done=c.diagnostics(),snapshot=f.bones.map(b=>[...b.position,...b.quaternion]);assert.equal(done.time,dDuration(mode));assert.equal(done.poseTime,dDuration(mode));c.update(999);assert.deepEqual(f.bones.map(b=>[...b.position,...b.quaternion]),snapshot);assert.equal(c.diagnostics().time,dDuration(mode));}
  assert.throws(()=>c.setCombat({direction:0}),TypeError);assert.throws(()=>c.setCombat({contact:1}),TypeError);
 }finally{f.dispose();}
});

function segmentDistance(a,b,c,d){
 const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),den=aa*cc-bb*bb,clamp=x=>Math.max(0,Math.min(1,x));
 let s=den>1e-10?clamp((bb*ee-cc*dd)/den):0,t=clamp((bb*s+ee)/cc);s=clamp((bb*t-dd)/aa);t=clamp((bb*s+ee)/cc);
 return a.clone().addScaledVector(u,s).distanceTo(c.clone().addScaledVector(v,t));
}
test('blade guard forearm stays clear of the striking forearm through crossing and contact recoil',async()=>{
 const f=await fixture(),c=f.controller,point=name=>f.bones.find(b=>b.name===name).getWorldPosition(new T.Vector3());
 try{for(const mode of ['slash','reverse','thrust','combo']){c.select(mode);for(const contact of [false,true]){c.setCombat({contact});for(let i=0;i<=80;i++){const t=dDuration(mode)*i/80;c.seek(t);const clearance=segmentDistance(point('lowerarm01L'),point('wristL'),point('lowerarm01R'),point('wristR'));assert.ok(clearance>.065,`${mode} forearms at ${t.toFixed(3)} contact=${contact}: ${clearance}`);for(const side of ['L','R']){const torsoClearance=segmentDistance(point('lowerarm01'+side),point('wrist'+side),point('spine05'),point('head'));assert.ok(torsoClearance>.12,`${mode} ${side} forearm enters torso core at ${t.toFixed(3)}: ${torsoClearance}`);}}}}}finally{f.dispose();}
});

test('both dodge directions preserve actual world sole heights and planted ankles after viewer translation',async()=>{
 const f=await fixture(),c=f.controller,samples={L:[],R:[]},floor={L:Infinity,R:Infinity},vec=()=>new T.Vector3();
 try{
  f.scene.updateMatrixWorld(true);for(const skin of f.skins)for(let index=0;index<skin.geometry.attributes.position.count;index++){const p=skin.getVertexPosition(index,vec()).applyMatrix4(skin.matrixWorld);if(p.y<.105&&Math.abs(p.x)>.10){const side=p.x>0?'L':'R';samples[side].push({skin,index});floor[side]=Math.min(floor[side],p.y);}}
  for(const direction of [-1,1]){
   c.setCombat({direction});c.select('dodge');f.scene.position.set(0,0,0);c.seek(0);const starts=Object.fromEntries(['L','R'].map(side=>[side,f.bones.find(b=>b.name==='foot'+side).getWorldPosition(vec()).x]));
   for(let i=0;i<=70;i++){
    const t=1.1*i/70,d=c.seek(t);f.scene.position.copy(c.getTravelPose());f.scene.updateMatrixWorld(true);
    for(const side of ['L','R']){
     const sole=Math.min(...samples[side].map(({skin,index})=>skin.getVertexPosition(index,vec()).applyMatrix4(skin.matrixWorld).y));assert.ok(Math.abs(sole-floor[side]-d.combat.feet[side].clearance)<.001,`world sole ${side} at ${t}`);
     const lead=(side==='L')===(direction===1),a=lead?.16:.30,b=lead?.55:.78,ankle=f.bones.find(b=>b.name==='foot'+side).getWorldPosition(vec());
     if(t<=a)assert.ok(Math.abs(ankle.x-starts[side])<.003,`world planted takeoff ${side}`);
     if(t>=b)assert.ok(Math.abs(ankle.x-starts[side]-direction*.52)<.003,`world planted recovery ${side}`);
    }
   }
  }
 }finally{f.dispose();}
});

test('combo selects three genuinely different strikes and joins their recovered guard poses continuously',()=>{
 const sequence=[['slash',0,1.15],['reverse',1.15,1.1],['thrust',2.25,1.25]];
 for(const [index,[id,start,duration]] of sequence.entries())for(const local of [0,.2,.45,duration-.01]){
  const combo=sampleRookCombat('combo',start+local,{contact:true}),single=sampleRookCombat(id,local,{contact:true});assert.equal(combo.attackId,id);assert.equal(combo.comboIndex,index+1);assert.equal(combo.comboCount,3);assert.equal(combo.mode,'combo');assert.ok(distance(combo.hands.R,single.hands.R)<1e-10);assert.ok(Math.abs(combo.weapon.yaw-single.weapon.yaw)<1e-10);
 }
 for(const at of [1.15,2.25]){const a=sampleRookCombat('combo',at-1e-6),b=sampleRookCombat('combo',at+1e-6);assert.ok(distance(a.hands.R,b.hands.R)<1e-8);assert.ok(distance(a.rootOffset,b.rootOffset)<1e-8);assert.ok(Math.abs(a.weapon.yaw-b.weapon.yaw)<1e-8);assert.ok(Math.abs(a.head.yaw-b.head.yaw)<1e-8);}
 const slashA=sampleRookCombat('slash',.28),slashB=sampleRookCombat('slash',.49),reverseA=sampleRookCombat('reverse',.25),reverseB=sampleRookCombat('reverse',.46),thrustA=sampleRookCombat('thrust',.36),thrustB=sampleRookCombat('thrust',.55);
 assert.ok(slashB.hands.R.x-slashA.hands.R.x>.5);assert.ok(reverseB.hands.R.x-reverseA.hands.R.x<-.49);assert.ok(reverseB.hands.R.y-reverseA.hands.R.y>.28);
 assert.ok(thrustB.hands.R.z-thrustA.hands.R.z>.31);assert.ok(Math.abs(thrustB.hands.R.y-thrustA.hands.R.y)<.001);assert.ok(Math.abs(thrustB.weapon.pitch)<.03);
 assert.equal(sampleRookCombat('combo',999).complete,true);assert.equal(sampleRookCombat('combo',999).attackId,'thrust');
 for(const mode of ROOK_COMBAT_MODES){assert.equal(mode.once,true);assert.equal(mode.combat,true);}
});
