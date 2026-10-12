import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {World} from '../src/rebuild/World.js';

test('batching preserves mixed indexed and unindexed burned character parts',()=>{
  const root=new T.Group(),material=new T.MeshStandardMaterial({color:0x30372e});
  const body=new T.Mesh(new T.BoxGeometry(1,1,1),material);
  const head=new T.Mesh(new T.IcosahedronGeometry(.3,1),material);head.position.y=1.2;
  root.add(body,head);root.updateMatrixWorld(true);
  const before=new T.Box3().setFromObject(root);
  World.prototype.batchStatic.call({static:root,scene:root},root,root);
  const after=new T.Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min)<1e-6);
  assert.ok(before.max.distanceTo(after.max)<1e-6);
  assert.equal(root.children.length,2);
});

test('city facade batching removes destroyed panels while retaining intact walls and glass',()=>{
 const world=Object.create(World.prototype),g=new T.Group(),wall=new T.MeshStandardMaterial(),glass=new T.MeshStandardMaterial({color:0x557788});wall.userData.shared=glass.userData.shared=true;
 const a=new T.Mesh(new T.BoxGeometry(2,2,.2),wall),b=a.clone(),pane=new T.Mesh(new T.BoxGeometry(1,1,.05),glass);a.position.x=-2;b.position.x=2;pane.position.z=.2;g.add(a,b,pane);g.position.set(30,0,20);g.userData.sections=[a,b];g.userData.glass=[pane];
 world.rebuildBuildingShell(g);assert.equal(g.userData.shell.children.length,2);assert.equal(g.userData.shell.children[0].geometry.attributes.position.count,48);assert.equal(a.layers.mask,2);
 const first=g.userData.shell;b.visible=false;pane.visible=false;world.rebuildBuildingShell(g);assert.equal(first.parent,null);assert.equal(g.userData.shell.children.length,1);assert.equal(g.userData.shell.children[0].geometry.attributes.position.count,24);assert.equal(a.visible,true);const bounds=new T.Box3().setFromObject(g.userData.shell);assert.ok(bounds.max.x<30);
 world.fadeBuilding(g,true);assert.equal(g.userData.shell.children[0].material.clippingPlanes[0].constant,.7);assert.equal(g.userData.shell.children[0].material.opacity,.45);world.rebuildBuildingShell(g);assert.equal(g.userData.shell.children[0].material.opacity,.45);world.fadeBuilding(g,false);assert.equal(g.userData.shell.children[0].material,wall);
 const roofGroup=new T.Group();g.add(roofGroup);roofGroup.add(a);roofGroup.visible=false;world.rebuildBuildingShell(g);assert.equal(g.userData.shell.children.length,0);
});

test('textured detail batching retains UVs and deliberate shadow exclusions',()=>{
 const root=new T.Group(),material=new T.MeshStandardMaterial({map:new T.Texture()});
 for(let i=0;i<3;i++){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);mesh.position.x=i*2;mesh.castShadow=i===2;root.add(mesh);}
 World.prototype.batchStatic.call({static:root,scene:root},root,root);
 assert.equal(root.children.length,2);const unshadowed=root.children.find(m=>!m.castShadow),shadowed=root.children.find(m=>m.castShadow);assert.equal(unshadowed.geometry.attributes.uv.count,48);assert.equal(shadowed.geometry.attributes.uv.count,24);assert.equal(unshadowed.material,material);
});
