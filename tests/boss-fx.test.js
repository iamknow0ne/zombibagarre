import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bossImpactPlan,bossImpactFX,stepBossEffect} from '../src/rebuild/BossFX.js';
import {bossContains,configureBoss,beginBossAttack} from '../src/rebuild/Bosses.js';
import {Simulation} from '../src/rebuild/Simulation.js';

test('boss impact centres respect rotated lanes and annular safe zones at every quality',()=>{
 for(const quality of ['low','balanced','high'])for(const e of [{x:0,z:0,radius:10,innerRadius:5},{x:3,z:-2,radius:3},{x:4,z:8,radius:2,shape:'lane',angle:1.7,length:19,width:2}]){
  const plan=bossImpactPlan(e,quality);assert.ok(plan.points.length<=12);for(const p of plan.points)assert.ok(bossContains(e,p),JSON.stringify(p));
 }
 assert.ok(bossImpactPlan({x:0,z:0,radius:4},'low').points.length<bossImpactPlan({x:0,z:0,radius:4}).points.length);
 assert.equal(bossImpactPlan({x:0,z:0,bossColor:0xd8e9ee}).theme,'ice');
});
test('boss impact events carry material identity and cancelled attacks never produce slams',()=>{
 for(let variant=0;variant<8;variant++){
  const s=new Simulation({layout:{cover:[]}});s.start();s.toSpawn=1;s.spawnTimer=999;const e=s.spawnEnemy('boss',0,-5);configureBoss(s,e,{variant});e.bossStarted=true;e.bossPhase=2;e.bossState='pursuit';beginBossAttack(s,e,e.bossProfile.moves.find(m=>m!=='rush'));
  assert.ok(s.hazards.every(h=>h.bossColor===e.bossProfile.color&&h.bossHeight===e.bossHeight&&h.bossMove===e.bossMove));
  s.events=[];e.phasePending=true;s.update(1/60,{auto:false});assert.ok(!s.events.some(e=>e.type==='slam'));assert.ok(s.events.some(e=>e.type==='boss-phase'&&e.kind));
 }
});
function renderer(quality='high',reducedMotion=false){
 const w={scene:new T.Scene(),layout:{},settings:{quality,reducedMotion},effects:[],random:()=>.5,shake:0,smokeTex:new T.Texture(),blastLights:[new T.PointLight()],ring:r=>new T.Mesh(new T.RingGeometry(r-.08,r,24),new T.MeshBasicMaterial({transparent:true}))};w.blastLights[0].userData.life=0;
 w.flame=(x,z,n)=>{for(let i=0;i<n;i++)w.effects.push({kind:'fire',mesh:new T.Object3D()});};w.waterLevel=()=>-.3;w.splash=(x,z)=>w.effects.push({kind:'water',mesh:new T.Object3D()});return w;
}
test('boss explosions include ground scars, ballistic material and family effects within a fixed budget',()=>{
 for(const kind of ['warden','bloom','dredger','cinder']){
  const w=renderer();bossImpactFX(w,{type:'slam',x:0,z:0,radius:6,bossKind:kind,bossHeight:12});
  assert.ok(w.effects.some(e=>e.kind==='boss-ground'));assert.ok(w.effects.some(e=>e.kind==='boss-wave'));assert.ok(w.effects.length<=140);
  assert.equal(w.effects.some(e=>e.kind==='fire'),kind==='cinder');assert.equal(w.effects.some(e=>e.kind==='water'),kind==='dredger');
  if(kind!=='dredger')assert.ok(w.effects.some(e=>e.kind==='material'&&e.vy>0));
  for(const e of w.effects.filter(e=>e.kind==='boss-ground'||e.kind==='boss-wave')){e.life=0;stepBossEffect(e,.1);assert.equal(e.mesh.material.opacity,0);}
 }
 const w=renderer('low',true);bossImpactFX(w,{type:'boss-phase',x:0,z:0,kind:'cinder',height:12});assert.ok(w.effects.length<=64);assert.equal(w.shake,0);
 w.effects=Array.from({length:360},()=>({}));bossImpactFX(w,{type:'slam',x:0,z:0,radius:6});assert.equal(w.effects.length,360);
});

test('furnace impacts in water produce spray without flames or ground fractures',()=>{
 const w=renderer();w.layout.water=[{x:0,z:0,w:40,d:40}];bossImpactFX(w,{type:'slam',x:0,z:0,radius:5,bossKind:'cinder'});
 assert.ok(w.effects.some(e=>e.kind==='water'));assert.ok(!w.effects.some(e=>e.kind==='fire'));
 assert.equal(w.effects.find(e=>e.kind==='boss-ground').mesh.geometry.attributes.position.count,0);
});
