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
const restVertices=vertices(),soleSamples={L:[],R:[]},soleFloor={L:Infinity,R:Infinity};
for(const skin of skins)for(let index=0;index<skin.geometry.attributes.position.count;index++){
 const p=skin.getVertexPosition(index,v()).applyMatrix4(skin.matrixWorld);
 if(p.y<.105&&Math.abs(p.x)>.10){const side=p.x>0?'L':'R';soleSamples[side].push({skin,index,zone:p.z<0?'heel':p.z>.15?'toe':'middle'});soleFloor[side]=Math.min(soleFloor[side],p.y);}
}
const actualSole=(side,zone=null)=>Math.min(...soleSamples[side].filter(p=>!zone||p.zone===zone).map(({skin,index})=>skin.getVertexPosition(index,v()).applyMatrix4(skin.matrixWorld).y));

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

test('walk rolls heel-to-toe on the actual skinned sole with flight clearance',()=>{
 for(let i=0;i<40;i++){
  const t=i/40;motion.pose('walk',t*1.12);
  for(const side of ['L','R']){
   const phase=(t+(side==='L'?0:.5))%1,foot=find('foot'+side).getWorldPosition(v());
   const c=motion.diagnostics().footContacts[side];
   assert.ok(Math.abs(c.soleHeight-c.floor-c.clearance)<.001,`foot ${side} ground error ${c.soleHeight-c.floor-c.clearance}`);
   assert.ok(Math.abs(actualSole(side)-soleFloor[side]-c.clearance)<.001,'actual skinned sole matches floor/flight');
   if(phase<.6)assert.equal(c.clearance,0);else assert.ok(c.clearance>=0);
   if(phase===0){assert.ok(c.pitch<-.1,'heel strike raises toes');assert.ok(actualSole(side,'toe')>actualSole(side,'heel')+.005,'rendered toe rises above heel at strike');}
   if(phase>.5&&phase<.6){assert.ok(c.pitch>.1,'toe-off raises heel');assert.ok(actualSole(side,'heel')>actualSole(side,'toe')+.005,'rendered heel rises above toe at push-off');}
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

test('rifle palms meet actual mesh landmarks and butt plate meets shoulder pocket',()=>{
 const palm=side=>find('finger2-1'+side).getWorldPosition(v()).add(find('finger5-1'+side).getWorldPosition(v())).multiplyScalar(.5).lerp(find('wrist'+side).getWorldPosition(v()),.48);
 for(let i=0;i<20;i++)for(const id of ['rifle','fire']){
  const diagnostics=motion.pose(id,i*.12),weapon=motion.getWeaponPose();
  const contact=xyz=>new T.Vector3(...xyz).multiply(weapon.scaleVector).applyQuaternion(weapon.quaternion).add(weapon.position);
  assert.ok(palm('R').distanceTo(contact([.054,-.06,0]))<.003,'palm must touch pistol-grip side');
  assert.ok(palm('L').distanceTo(contact([0,-.008,.335]))<.003,'palm must touch fore-end underside');
  assert.ok(diagnostics.palmContactError<.003);
  for(const side of ['L','R'])assert.ok(motion.getSocket(side==='L'?'left':'right').palmPosition.distanceTo(palm(side))<1e-6);
  for(const [side,tip]of [['R',[-.045,.005,.015]],['L',[.06,.06,.39]]])assert.ok(find('finger1-3'+side).getWorldPosition(v()).distanceTo(contact(tip))<.003,'opposed thumb meets grip landmark');
  const shoulder=find('shoulder01R').getWorldPosition(v()).add(new T.Vector3(-.02,-.035,.015));
  assert.ok(contact([0,.095,-.4175]).distanceTo(shoulder)<.008,'butt plate remains seated through recoil');
 }
 motion.reset();
});

test('all study poses remain invariant when the loaded model is translated and rotated',()=>{
 for(const mode of ROOK_MOTION_MODES){
  motion.pose(mode.id,1.1);const initial=bones.map(b=>b.getWorldPosition(v())),local=bones.map(b=>b.quaternion.clone());
  scene.position.set(4,2,-3);scene.rotation.y=.7;scene.updateMatrixWorld(true);motion.pose(mode.id,1.1);
  bones.forEach((b,i)=>{assert.ok(b.getWorldPosition(v()).distanceTo(scene.localToWorld(initial[i].clone()))<.0001,`${mode.id} ${b.name} position`);assert.ok(Math.abs(b.quaternion.dot(local[i]))>1-.0001,`${mode.id} ${b.name} orientation`);});
  scene.position.set(0,0,0);scene.rotation.set(0,0,0);motion.reset();
 }
});
