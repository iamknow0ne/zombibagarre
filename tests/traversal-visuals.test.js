import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {TraversalVisuals,applyTraversalPose} from '../src/rebuild/TraversalVisuals.js';
import {worldRayTarget} from '../src/rebuild/WorldAim.js';
import {ejectCasing,weaponShot} from '../src/rebuild/WeaponFX.js';
import {Input} from '../src/rebuild/Input.js';

test('orthographic targeting resolves elevated bodies, nearer walls and exposed platform tops',()=>{
 const origin={x:0,y:12,z:12},direction={x:0,y:-Math.SQRT1_2,z:-Math.SQRT1_2},enemy={id:1,x:0,y:3,z:3,radius:.6,health:10},platform={id:'p',x:0,z:3,w:4,d:4,h:3,health:10};
 const sim={props:[platform],enemies:[enemy]};let aim=worldRayTarget(origin,direction,sim);assert.equal(aim.targetId,1);assert.ok(aim.y>3&&aim.y<4.85);assert.equal(aim.perspective,true);
 sim.enemies=[];aim=worldRayTarget(origin,direction,sim);assert.equal(aim.propId,'p');assert.equal(aim.y,3);assert.equal(aim.targetId,null);
 sim.props.push({id:'wall',x:0,z:7,w:5,d:1,h:9,health:10});sim.enemies=[enemy];aim=worldRayTarget(origin,direction,sim);assert.equal(aim.propId,'wall');assert.equal(aim.targetId,null);
 sim.props.forEach(p=>p.health=0);sim.enemies=[];aim=worldRayTarget(origin,direction,sim);assert.ok(Math.abs(aim.y-.08)<1e-8);
});
test('camera pointer passes simulation to height-aware aiming but move click stays planar',()=>{
 const input=Object.create(Input.prototype);Object.assign(input,{keys:new Set(),stick:{x:0,y:0},once:{},source:'keyboard',pointer:{active:true,x:.6,y:.4},moveRequest:{x:.2,y:.3},settings:{}});
 const sim={player:{},props:[]},calls=[],world={aim(...args){calls.push(args);return{x:0,y:2,z:4};}};input.consume(world,false,sim);assert.equal(calls[0].length,2);assert.equal(calls[1][2],sim);
});
test('campaign jump keeps weapon arms while grapple stows and release restores guns',()=>{
 const character=new T.Group(),body=new T.Group(),limb=()=>{const g=new T.Group();g.userData.knee=new T.Group();g.userData.elbow=new T.Group();return g;};character.userData={body,legs:[limb(),limb()],arms:[limb(),limb()],weaponRigs:[new T.Group()]};character.userData.arms[0].rotation.x=.71;
 const p={traversal:'campaign',grounded:false,y:2};applyTraversalPose(character,p);assert.equal(character.position.y,2);assert.equal(character.userData.arms[0].rotation.x,.71);assert.equal(character.userData.weaponRigs[0].visible,true);
 p.grapple={anchorId:'a'};applyTraversalPose(character,p);assert.equal(character.userData.arms[0].rotation.x,-2.6);assert.equal(character.userData.weaponRigs[0].visible,false);p.grapple=null;character.userData.weaponRigs[0].visible=true;applyTraversalPose(character,p);assert.equal(character.userData.weaponRigs[0].visible,true);character.userData.weaponRigs[0].visible=false;applyTraversalPose(character,p);assert.equal(character.userData.weaponRigs[0].visible,false,'throw animation must retain its stowed weapon');
});
test('anchor/cable visuals follow live support and own a bounded disposable scene',()=>{
 const scene=new T.Scene(),prop={id:'p',x:0,z:0,h:1.2,health:100},anchor={id:'a',supportId:'p',x:0,y:3.3,z:0},visuals=new TraversalVisuals(scene,{anchors:[anchor],reward:{x:0,y:1.2,z:0,supportId:'p'}},[prop]);
 const sim={player:{traversal:'campaign',x:2,y:1,z:2,grapple:{anchorId:'a'}},props:[prop],traversalTarget:{id:'a',available:true}},camera=new T.Camera();visuals.update(sim,.016,camera);assert.equal(visuals.cable.visible,true);assert.equal(visuals.cable.geometry.attributes.position.count,17);const count=visuals.root.children.length;
 for(let i=0;i<300;i++){visuals.event({type:'traversal-land',x:0,y:1.2,z:0});visuals.update(sim,.016,camera);}assert.equal(visuals.root.children.length,count);assert.ok(Math.abs(visuals.landing.position.y-1.235)<1e-8);
 prop.health=0;visuals.update(sim,.016,camera);assert.equal(visuals.anchors[0].group.visible,false);assert.equal(visuals.cable.visible,false);assert.equal(visuals.reward.position.y,0);sim.traversalRewardClaimed=true;visuals.update(sim,.016,camera);assert.equal(visuals.reward.visible,false);
 let geometryDisposed=0,materialDisposed=0;visuals.cable.geometry.addEventListener('dispose',()=>geometryDisposed++);visuals.cable.material.addEventListener('dispose',()=>materialDisposed++);visuals.dispose();assert.equal(scene.children.length,0);assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);
});
test('elevated fire emits muzzle flashes and cartridge cases at shooter height',()=>{
 const world={scene:new T.Scene(),effects:[],random:()=>.5,shake:0,muzzleLight:new T.PointLight(),smoke(){},smokeTex:new T.Texture()};ejectCasing(world,{x:0,y:5.1,z:0,weapon:'carbine'});assert.equal(world.effects[0].mesh.position.y,5.25);
 weaponShot(world,{x:0,y:5.1,z:0,weapon:'carbine',angle:0,variant:1});assert.ok(world.muzzleLight.position.y>5);assert.ok(world.effects.every(e=>e.mesh.position.y>5));
});

test('grapple marker mast stays beside the roof landing lane while ring and cable retain the authored endpoint',()=>{
 for(const [nx,nz] of [[0,1],[1,0],[0,-1],[-1,0]]){
  const owner={id:'roof',x:0,y:3,z:0,w:8,d:8,h:.3,health:100},anchor={id:'roof-anchor',supportId:'roof',x:nx*2.5,y:6.6,z:nz*2.5};
  const scene=new T.Scene(),visuals=new TraversalVisuals(scene,{anchors:[anchor],roofs:[{anchor,approach:{nx,nz}}]},[owner]);
  const group=visuals.anchors[0].group,mast=group.getObjectByName('anchor-mast'),arm=group.getObjectByName('anchor-overhead-arm');
  assert.ok(mast&&arm);assert.ok(Math.abs(Math.hypot(mast.position.x-anchor.x,mast.position.z-anchor.z)-1.1)<1e-9);
  assert.ok(Math.abs((mast.position.x-anchor.x)*nx+(mast.position.z-anchor.z)*nz)<1e-9,'mast sits beside, not in front of, the arrival lane');
  assert.ok(Math.abs(mast.position.x-owner.x)<owner.w/2&&Math.abs(mast.position.z-owner.z)<owner.d/2,'mast has roof support');
  assert.deepEqual(visuals.anchors[0].ring.position.toArray(),[anchor.x,anchor.y,anchor.z]);
  visuals.update({player:{traversal:'campaign',x:anchor.x,y:3.3,z:anchor.z,grapple:{anchorId:anchor.id}},props:[owner]},0,new T.Camera());
  const points=visuals.cable.geometry.attributes.position;assert.ok(Math.abs(points.getX(16)-anchor.x)<1e-6&&Math.abs(points.getY(16)-anchor.y)<1e-6&&Math.abs(points.getZ(16)-anchor.z)<1e-6);
  assert.ok(arm.position.y>3.3+1.75,'horizontal support stays above the landed hero');visuals.dispose();assert.equal(scene.children.length,0);
 }
 const owner={id:'tiny',x:0,z:0,w:.6,d:.6,h:1,health:100},anchor={id:'tiny-anchor',supportId:'tiny',x:0,y:3.1,z:0},visuals=new TraversalVisuals(new T.Scene(),{anchors:[anchor]},[owner]);
 assert.equal(visuals.anchors[0].group.getObjectByName('anchor-mast'),undefined,'a narrow support never puts a pole back inside the landing body');assert.ok(visuals.anchors[0].ring);visuals.dispose();
});
