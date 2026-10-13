import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const materials=new Map();
// Merge rigid, untextured pieces using vertex colours. Animated joints and
// independently removable head/limb groups remain separate scene nodes.
export function batchRigid(parent){
 const groups=new Map();
 for(const m of parent.children){const a=m.material;if(!m.isMesh||!m.visible||!a?.isMeshStandardMaterial||a.map||a.transparent||a.vertexColors||m.children.length)continue;
  const key=[a.roughness,a.metalness,a.emissive.getHex(),a.emissiveIntensity,a.side,m.castShadow,m.receiveShadow].join(':');
  let group=groups.get(key);if(!group){group={source:a,pieces:[],shadow:m.castShadow,receive:m.receiveShadow};groups.set(key,group);}group.pieces.push(m);
 }
 for(const [key,b]of groups){if(b.pieces.length<2)continue;const geos=[];
  for(const m of b.pieces){m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=m.material.color.r;colors[i+1]=m.material.color.g;colors[i+2]=m.material.color.b;}g.setAttribute('color',new T.BufferAttribute(colors,3));for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));geos.push(g);}
  const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(!geometry)continue;
  let material=materials.get(key);if(!material){material=b.source.clone();material.color.setHex(0xffffff);material.vertexColors=true;material.userData.shared=true;materials.set(key,material);}
  const mesh=new T.Mesh(geometry,material);mesh.castShadow=b.shadow;mesh.receiveShadow=b.receive;parent.add(mesh);for(const m of b.pieces){m.removeFromParent();if(m.geometry.userData.surfaceOwned)m.geometry.dispose();}
 }
}
export function batchCharacter(root){
 const body=root.userData.body,head=new T.Group();head.position.y=1.65;body.add(head);
 for(const child of [...body.children])if(child!==head&&child.position.y>1.48){body.remove(child);child.position.y-=1.65;head.add(child);}
 // Body and each bone stay articulated. Nested fixed dress pieces are batched
 // locally so headshots and missing arms retain their existing visibility rules.
 const visit=node=>{for(const c of [...node.children])if(c.isGroup)visit(c);batchRigid(node);};visit(body);
}
// The colour pass already updates shadows and world matrices. Reuse them for AO.
export function reuseSceneForAO(ao,scene){
 const render=ao.render.bind(ao);ao.render=(renderer,...args)=>{const shadow=renderer.shadowMap.autoUpdate,matrices=scene.matrixWorldAutoUpdate;renderer.shadowMap.autoUpdate=false;scene.matrixWorldAutoUpdate=false;try{return render(renderer,...args);}finally{renderer.shadowMap.autoUpdate=shadow;scene.matrixWorldAutoUpdate=matrices;}};
}

// Live enemies share GPU draws across identical bones. Original articulated
// nodes remain available for animation and dismemberment; corpses stay separate.
export class CharacterInstances{
 constructor(scene){this.scene=scene;this.batches=new Map();this.actors=new Map();}
 update(characters){
  for(const b of this.batches.values())b.count=0;
  for(const [id,entry]of this.actors)if(characters.get(id)!==entry.root)this.actors.delete(id);
  for(const [id,root]of characters){if(root.userData.boss)continue;let entry=this.actors.get(id);
   if(!entry){const parts=[];let index=0;root.traverse(m=>{if(!m.isMesh||!m.material?.isMeshStandardMaterial||m.material.transparent)return;const key=`${root.userData.type}:${root.userData.variant}:${index++}`;let batch=this.batches.get(key);if(!batch){batch=new T.InstancedMesh(m.geometry.clone(),m.material,512);batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.castShadow=m.castShadow;batch.receiveShadow=m.receiveShadow;batch.frustumCulled=false;batch.count=0;this.scene.add(batch);this.batches.set(key,batch);}m.layers.disable(0);parts.push({mesh:m,batch});});entry={root,parts};this.actors.set(id,entry);}
   root.updateWorldMatrix(true,true);
   for(const {mesh,batch}of entry.parts){let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}if(!visible||batch.count>=512)continue;batch.setMatrixAt(batch.count++,mesh.matrixWorld);}
  }
  for(const b of this.batches.values()){b.visible=b.count>0;b.instanceMatrix.needsUpdate=true;}
 }
 dispose(){for(const {parts}of this.actors.values())for(const {mesh}of parts)mesh.layers.enable(0);for(const b of this.batches.values()){b.removeFromParent();b.geometry.dispose();b.dispose();}this.batches.clear();this.actors.clear();}
}

export function freezeLocalTransforms(root){root.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});}
export function visibleAOOnly(ao,scene){
 const hidden=[];
 ao.overrideVisibility=()=>{hidden.length=0;scene.traverseVisible(o=>{if(o.isSprite||o.isPoints||o.isLine||(o.isMesh&&(o.material?.transparent||o.material?.alphaTest>0))){hidden.push(o);o.visible=false;}});};
 ao.restoreVisibility=()=>{for(const o of hidden)o.visible=true;hidden.length=0;};
}
