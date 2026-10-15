import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture,Raycaster,Vector3} from 'three';
import {BOSS_PROFILES} from '../src/rebuild/Bosses.js';
import {buildBossModel,animateBossModel} from '../src/rebuild/BossVisuals.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
test('all boss surfaces retain their weathering after UV projection and rigid merging within a bounded geometry budget',()=>{
 const albedo=new Texture(),relief=new Texture();albedo.userData.shared=relief.userData.shared=true;
 const surfaces={textures:()=>({albedo,relief})};
 for(const profile of BOSS_PROFILES){
  const state={bossProfile:profile,bossKind:profile.kind,bossPhase:2,bossState:'telegraph',bossTimer:.5,bossDuration:1},root=buildBossModel(state,surfaces);let triangles=0,meshes=0;
  animateBossModel(root,state,1);
  root.traverse(m=>{if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;
   const p=m.geometry.attributes.position,c=m.geometry.attributes.color;assert.equal(c.count,p.count);assert.ok([...c.array].every(v=>Number.isFinite(v)&&v>0&&v<=1.1));
   assert.equal(m.material.vertexColors,true);if(m.material!==root.userData.mats.glow){assert.equal(m.material.map,albedo);assert.equal(m.material.bumpMap,relief);}
  });
  assert.ok(triangles<=12000,`${profile.name}: ${triangles}`);assert.ok(meshes<=40,`${profile.name}: ${meshes}`);disposeObjectResources(root);
 }
 albedo.dispose();relief.dispose();
});


test('the captive face is visible between cage bars in both phases, ahead of its shroud',()=>{
 const ray=new Raycaster();
 for(const profile of BOSS_PROFILES.filter(p=>p.kind==='dredger'))for(const phase of [1,2]){
  const state={bossProfile:profile,bossKind:profile.kind,bossPhase:phase,bossState:'pursuit',bossTimer:.5,bossDuration:1},root=buildBossModel(state),cage=root.userData.arms[0];
  animateBossModel(root,state,1);root.updateMatrixWorld(true);
  // Probe exposed cheeks, deliberately between the center and diagonal bars.
  // This checks final batched production meshes rather than source metadata.
  for(const side of [-1,1]){
   const origin=cage.localToWorld(new Vector3(side*.14,-.39,3));
   const direction=new Vector3(0,0,-1).transformDirection(cage.matrixWorld);ray.set(origin,direction);
   const first=ray.intersectObject(cage,true)[0];
   assert.ok(first,`${profile.name}: captive cheek must have a visible surface`);
   assert.equal(first.object.material,root.userData.mats.bone,`${profile.name}: the shroud must not bury the face`);
   const hit=cage.worldToLocal(first.point.clone());assert.ok(hit.z>.15&&hit.z<.45,'hit anatomical cheek ahead of shroud, behind the bars');
  }
  disposeObjectResources(root);
 }
});
