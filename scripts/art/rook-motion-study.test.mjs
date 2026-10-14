import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionStudy,ROOK_MOTION_MODES} from '../../dev/RookMotionStudy.js';

// Real GLB geometry, skeletons and skins; no Node raster decoding claims.
if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{constructor(type,init){Object.assign(this,{type},init);}};
const bytes=await readFile(new URL('../../assets/characters/rook-prototype-v4.glb',import.meta.url));
const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'ROOK_MOTION_NODE_IMAGE_PLACEHOLDER'};});
const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const bones=[],skins=[];scene.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)skins.push(o);});
const motion=createRookMotionStudy(scene),v=()=>new T.Vector3(),find=name=>bones.find(b=>b.name===name);
const original=bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()}));
const bindings=skins.map(s=>[s.bindMatrix.toArray(),s.bindMatrixInverse.toArray(),s.skeleton.boneInverses.map(m=>m.toArray())]);
function vertices(){scene.updateMatrixWorld(true);const result=[];for(const skin of skins){skin.skeleton.update();const p=skin.geometry.attributes.position;for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/240)))result.push(skin.getVertexPosition(i,v()).applyMatrix4(skin.matrixWorld));}return result;}
const restVertices=vertices();

test('all study modes deform actual loaded skins, stay finite and preserve bind matrices',()=>{
 assert.equal(bones.length,163);assert.equal(skins.length,10);
 for(const mode of ROOK_MOTION_MODES){
  let deformation=0;
  for(let frame=0;frame<=24;frame++){
   const report=motion.pose(mode.id,mode.duration*frame/24);assert.ok(report.maxReachError<.003,`${mode.id} reach error ${report.maxReachError}`);
   for(const bone of bones){assert.ok([...bone.position,...bone.quaternion,...bone.scale].every(Number.isFinite));assert.ok(Math.abs(bone.quaternion.length()-1)<1e-6,`${bone.name}: ${bone.quaternion.length()}`);}
   const points=vertices();for(let i=0;i<points.length;i++){assert.ok(points[i].toArray().every(Number.isFinite));deformation=Math.max(deformation,points[i].distanceTo(restVertices[i]));}
   const bounds=new T.Box3().setFromPoints(points),size=bounds.getSize(v());assert.ok(size.y>1.6&&size.y<2.05,`${mode.id} deformed height ${size.y}`);assert.ok(size.x<1.2&&size.z<1.2,`${mode.id} exploding bounds`);
  }
  assert.ok(deformation>.15,`${mode.id} must visibly remove the A-pose`);
 }
 assert.deepEqual(skins.map(s=>[s.bindMatrix.toArray(),s.bindMatrixInverse.toArray(),s.skeleton.boneInverses.map(m=>m.toArray())]),bindings);
 motion.reset();
});

test('samples are order-independent, reset restores every transform and loops have no seam',()=>{
 for(const spec of ROOK_MOTION_MODES){
  motion.pose(spec.id,.231);const expected=bones.map(b=>[...b.position,...b.quaternion,...b.scale]);
  motion.pose('reload',1.7);motion.pose(spec.id,.231);assert.deepEqual(bones.map(b=>[...b.position,...b.quaternion,...b.scale]),expected);
  motion.pose(spec.id,0);const start=vertices();motion.pose(spec.id,spec.duration);const end=vertices();assert.ok(start.every((p,i)=>p.distanceTo(end[i])<1e-8));
  motion.pose(spec.id,spec.duration-1e-5);const before=vertices();motion.pose(spec.id,1e-5);const after=vertices();assert.ok(before.every((p,i)=>p.distanceTo(after[i])<.0001),`${spec.id} discontinuous wrap`);
 }
 motion.reset();assert.deepEqual(bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray(),s:b.scale.toArray()})),original);
 assert.throws(()=>motion.pose('unknown',0),RangeError);assert.throws(()=>motion.pose('walk',NaN),TypeError);
});

test('walk has planted ankle stance, opposite foot clearance, flexed knees and lower arms',()=>{
 const restY=find('footL').getWorldPosition(v()).y;
 for(let i=0;i<40;i++){
  const t=i/40;motion.pose('walk',t*1.12);
  for(const side of ['L','R']){
   const phase=(t+(side==='L'?0:.5))%1,foot=find('foot'+side).getWorldPosition(v());
   if(phase<.6)assert.ok(Math.abs(foot.y-restY)<.001,`foot ${side} stance ${phase} y ${foot.y}`);
   else assert.ok(foot.y>=restY-.001);
   assert.ok(Math.abs(find('wrist'+side).getWorldPosition(v()).x)<.3,'arm no longer sticks out in A-pose');
   const hip=find('upperleg01'+side).getWorldPosition(v()),knee=find('lowerleg01'+side).getWorldPosition(v());
   assert.ok(knee.z>hip.z+.015,'knee flexes forward, not backwards');
  }
 }
 motion.reset();
});

test('relaxed ready is asymmetric with elbows close to the torso',()=>{
 motion.pose('ready',0);
 const left=find('lowerarm01L').getWorldPosition(v()),right=find('lowerarm01R').getWorldPosition(v());
 assert.ok(Math.abs(left.x)<.30&&Math.abs(right.x)<.30,`flared elbows ${left.x}/${right.x}`);
 const leftHand=motion.getSocket('left').position,rightHand=motion.getSocket('right').position;
 assert.ok(Math.abs(leftHand.y-rightHand.y)>.025,'relaxed hands must not mirror exactly');
 assert.ok(Math.abs(find('footL').getWorldPosition(v()).z-find('footR').getWorldPosition(v()).z)>.04,'subtle staggered stance');
 motion.pose('rifle',0);assert.equal(Math.abs(motion.getWeaponPose().scaleVector.x),.62);
 motion.reset();
});

test('rifle hands track the actual scaled carbine support and samples respect a placed model',()=>{
 for(let i=0;i<20;i++)for(const id of ['rifle','fire']){
  motion.pose(id,i*.12);const weapon=motion.getWeaponPose(),left=motion.getSocket('left'),right=motion.getSocket('right');
  const grip=right.position.clone().add(new T.Vector3(0,0,.035).applyQuaternion(weapon.quaternion));assert.ok(grip.distanceTo(weapon.position)<1e-6);
  const support=new T.Vector3(-.14,-.025,.23).multiply(weapon.scaleVector).applyQuaternion(weapon.quaternion).add(weapon.position),leftPalm=left.position.clone().add(new T.Vector3(0,0,.035).applyQuaternion(weapon.quaternion));
  assert.ok(support.distanceTo(leftPalm)<.003,`support mismatch ${support.distanceTo(leftPalm)}`);
 }
 motion.pose('rifle',.3);const wrist=motion.getSocket('right').position.clone();
 scene.position.set(2,1,-3);scene.rotation.y=.7;scene.updateMatrixWorld(true);motion.pose('rifle',.3);assert.ok(motion.getSocket('right').position.distanceTo(scene.localToWorld(wrist))<1e-5);
 scene.position.set(0,0,0);scene.rotation.set(0,0,0);motion.reset();
});
