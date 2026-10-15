import * as T from 'three';
import {resolveAppearance} from './Customization.js';

// These choices have separate retained source groups and independently removable
// authored geometry. Garments, face structure, scars and accessories do not yet.
export const DETAILED_GEOMETRY_KEYS=new Set(['hair','headwear']);
export function detailedAppearanceChanges(identity,custom){
 const selected=resolveAppearance(identity,custom),base=resolveAppearance(identity);
 return {hair:selected.hair!==base.hair,headwear:selected.headwear!==base.headwear};
}

function authoredHeadFit(hero,content){
 const head=hero.userData.head;if(!head)return null;
 const point=new T.Vector3(),origin=new T.Vector3(),inverseBind=new T.Matrix4(),bounds=new T.Box3();let samples=0;
 content.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||(mesh.userData.castLOD||0)!==0||!mesh.material?.name.startsWith('Skin /'))return;
  const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
  if(!indices||!weights)return;
  const headIndex=mesh.skeleton.bones.findIndex(bone=>bone.name==='head');if(headIndex<0)return;
  origin.setFromMatrixPosition(inverseBind.copy(mesh.skeleton.boneInverses[headIndex]).invert());
  const headBones=mesh.skeleton.bones.map(bone=>{for(let parent=bone;parent;parent=parent.parent)if(parent.isBone&&parent.name==='head')return true;return false;});
  for(let vertex=0;vertex<indices.count;vertex++){
   let weight=0;for(let channel=0;channel<indices.itemSize;channel++)if(headBones[indices.getComponent(vertex,channel)])weight+=weights.getComponent(vertex,channel);
   if(weight<.75)continue;point.fromBufferAttribute(mesh.geometry.attributes.position,vertex).applyMatrix4(mesh.bindMatrix).sub(origin).divide(head.scale);bounds.expandByPoint(point);samples++;
  }
 });
 if(samples<20||bounds.isEmpty())return null;
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),face=hero.userData.custom?.face,width=face==='broad'?.185:face==='soft'?.159:.17;
 // Immutable bind positions avoid head/neck blend deformation changing the fit
 // when an async model arrives during a turned or airborne pose.
 // Match the existing source skull envelope, not its hair bounds: braids, knots
 // and crests must retain their intended length above/below the scalp.
 const scale=new T.Vector3(size.x/(2*width),size.y/.436,size.z/.339);
 if(!scale.toArray().every(n=>Number.isFinite(n)&&n>.2&&n<2.5))return null;
 center.z-=.0075*scale.z;return {position:center,scale};
}

// Call after attaching the detailed model. update() runs after its normal LOD
// and helmet visibility pass. Dispose before restoring original source layers.
export function createDetailedAppearance(hero,content,identity=hero.userData.skin){
 const changed=detailedAppearanceChanges(identity,hero.userData.custom),groups=[],hidden=[];
 if(!changed.hair&&!changed.headwear)return null;
 const fit=authoredHeadFit(hero,content);
 for(const key of ['hair','headwear']){
  if(!changed[key])continue;const group=hero.userData[key==='headwear'?'hat':'hair'];if(!group)continue;
  const meshes=[];group.traverse(mesh=>{if(mesh.isMesh)meshes.push({mesh,mask:mesh.layers.mask});});
  groups.push({group,meshes,position:group.position.clone(),scale:group.scale.clone()});
  if(fit){group.position.copy(fit.position);group.scale.multiply(fit.scale);}
 }
 content.traverse(mesh=>{
  if(!mesh.isMesh)return;const name=mesh.material?.name||'';
  // Torque's Headwear batches contain his selected goggles, not a hat. Keep
  // those accessories when selecting an independent cap/beret/hood.
  if(changed.hair&&name.startsWith('Hair /')||changed.headwear&&identity!=='biker'&&name.startsWith('Headwear /'))hidden.push({mesh,visible:mesh.visible});
 });
 function update(){for(const {mesh}of hidden)mesh.visible=false;for(const {meshes}of groups)for(const {mesh,mask}of meshes)mesh.layers.mask=mask|1;}
 update();let disposed=false;
 return{changed,fit,hideAuthoredHat:changed.headwear&&identity!=='biker',update,dispose(){if(disposed)return;disposed=true;for(const {mesh,visible}of hidden)mesh.visible=visible;for(const {group,meshes,position,scale}of groups){group.position.copy(position);group.scale.copy(scale);for(const {mesh,mask}of meshes)mesh.layers.mask=mask;}}};
}
