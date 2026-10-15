import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import heads from '../assets/characters/survivor-heads.json' with {type:'json'};
import {anatomicalSurvivorHead,survivorFaceProjector,survivorEyeFit} from '../src/rebuild/SurvivorHead.js';
import {buildSurvivor} from '../src/rebuild/SurvivorVisuals.js';
import {rpgPlaceMesh} from '../src/rebuild/RPGVisuals.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
import {resolveAppearance} from '../src/rebuild/Customization.js';

const identities=['scout','medic','biker','ronin'];
test('fallback cast uses pinned clean anatomical data with distinct identities and face choices',()=>{
 assert.equal(heads.provenance.license,'CC0-1.0');
 assert.equal(heads.provenance.revision,'a8bc2d54ff0ac92e78ff71431b1023eda42bf482');
 const manifest=JSON.parse(readFileSync(new URL('../assets/source/cast/morphs/manifest.json',import.meta.url)));
 for(const row of manifest.files){const raw=readFileSync(new URL(`../assets/source/cast/morphs/${row.path}`,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256);}
 const signatures=new Set();
 for(const identity of identities)for(const face of ['angular','soft','broad']){
  const {geometry:g,eyes}=anatomicalSurvivorHead(identity,face),p=g.attributes.position;
  assert.ok(g.index.count/3>800&&g.index.count/3<1400);
  assert.ok([...p.array,...g.attributes.normal.array].every(Number.isFinite));
  assert.ok(g.boundingBox.min.y>-.25&&g.boundingBox.max.y<.25);
  assert.ok(g.boundingBox.min.z>-.25&&g.boundingBox.max.z<.26);
  for(const i of g.index.array)assert.ok(i<p.count);
  assert.equal(eyes.length,2);assert.ok(eyes[0][0]*eyes[1][0]<0);
  assert.ok(eyes.every(p=>p.every(Number.isFinite)&&Math.abs(p[0])<.09&&p[2]>.06&&p[2]<.15));
  signatures.add(createHash('sha256').update(new Uint8Array(p.array.buffer)).digest('hex'));g.dispose();
 }
 assert.equal(signatures.size,12,'identity and face choices must produce distinct geometry');
});
test('face markings follow anatomical skin and actor clones do not mutate their cached source',()=>{
 const mat=new T.MeshStandardMaterial();
 for(const identity of identities){
  const first=anatomicalSurvivorHead(identity,'angular'),second=anatomicalSurvivorHead(identity,'angular');
  const project=survivorFaceProjector(first.geometry,mat),proxy=new T.Mesh(first.geometry,mat);proxy.updateMatrixWorld(true);
  for(const [x,y] of [[0,-.08],[.07,.06],[-.07,-.06]]){
   const projected=project(x,y,.003),ray=new T.Raycaster(new T.Vector3(x,y,.6),new T.Vector3(0,0,-1)),hit=ray.intersectObject(proxy)[0];
   assert.ok(hit,`${identity}: expected face surface at ${x},${y}`);assert.ok(Math.abs(projected[2]-hit.point.z-.003)<1e-8);
  }
  const before=second.geometry.attributes.position.getX(0);first.geometry.attributes.position.setX(0,99);first.geometry.dispose();
  const third=anatomicalSurvivorHead(identity,'angular');assert.equal(second.geometry.attributes.position.getX(0),before);assert.equal(third.geometry.attributes.position.getX(0),before);
  second.geometry.dispose();third.geometry.dispose();
 }
 mat.dispose();
});
test('eye globes remain seated behind their anatomical eyelid rims for every face width',()=>{
 const material=new T.MeshStandardMaterial();
 for(const id of identities)for(const face of ['angular','soft','broad']){
  const {geometry,eyes}=anatomicalSurvivorHead(id,face),project=survivorFaceProjector(geometry,material);
  for(const anchor of eyes){const eye=survivorEyeFit(project,anchor),upper=project(eye.x,eye.y+.014,0)[2],lower=project(eye.x,eye.y-.014,0)[2];
   assert.ok(eye.centre<Math.min(upper,lower)-.015,`${id}: eye should sit inside socket`);
   assert.ok(eye.front<=Math.max(upper,lower)+.002,`${id}: sclera should not project beyond lids`);
   assert.ok(Math.abs(eye.front-(upper+lower)/2)<.003,`${id}: iris must remain close to socket opening`);
   assert.ok(eye.height/eye.depth>.7,'round globe, not a flattened pill pasted over skin');
  }geometry.dispose();
 }material.dispose();
});
test('custom faces preserve every saved choice, rig anchor and independent disposal',()=>{
 const custom={skin:'ebony',face:'soft',hair:'mohawk',hairColor:'copper',eyes:'blue',facialHair:'moustache',scar:'paint',coat:'trench',palette:'arctic',headwear:'none',accessory:'radio',hideHelmet:'yes'};
 for(const id of identities){
  const actor=buildSurvivor(id,custom);assert.deepEqual(actor.userData.custom,resolveAppearance(id,custom));assert.equal(actor.userData.anatomicalHead,true);
  let skin;actor.traverse(o=>{if(o.geometry?.userData.anatomicalIdentity===id)skin=o;});assert.ok(skin);assert.equal(skin.geometry.userData.surfaceOwned,true);
  assert.ok(skin.material.vertexColors);assert.equal(skin.material.userData.surfaceKind,'skin');assert.equal(skin.material.map,null);
  assert.equal(actor.userData.arms.length,2);assert.equal(actor.userData.legs.length,2);assert.ok(actor.userData.hair&&actor.userData.hat&&actor.userData.head);
  let disposed=0;skin.geometry.addEventListener('dispose',()=>disposed++);disposeObjectResources(actor);assert.equal(disposed,1);
 }
 assert.deepEqual(custom,{skin:'ebony',face:'soft',hair:'mohawk',hairColor:'copper',eyes:'blue',facialHair:'moustache',scar:'paint',coat:'trench',palette:'arctic',headwear:'none',accessory:'radio',hideHelmet:'yes'});
});
test('anatomical traders retain exactly four static surface batches without a face atlas',()=>{
 for(const id of ['medic','smith','broker']){
  const shop=rpgPlaceMesh({id,kind:'shop',color:0x8e9876,x:0,z:0,buildingId:'fixture'});let trader;shop.traverse(o=>{if(o.userData.staticTrader)trader=o;});
  assert.ok(trader);assert.equal(trader.children.length,4);assert.equal(new Set(trader.children.map(o=>o.material.userData.surfaceKind)).size,4);
  const skin=trader.children.find(o=>o.material.userData.surfaceKind==='skin');assert.equal(skin.material.map,null);assert.ok(skin.material.vertexColors);
  let triangles=0;trader.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.ok(triangles<26000);
  disposeObjectResources(shop);
 }
});
