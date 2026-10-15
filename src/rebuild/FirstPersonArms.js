import * as T from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {shareInstanceSkeletons} from './SkinnedResources.js';

const forearmBone=name=>/^(lowerarm|wrist|metacarpal|finger)/i.test(name.replaceAll('.',''));
// Compact only the sleeve/hand triangles. Separate vertex buffers mean disposing
// an FPS view cannot invalidate GPU buffers still used by the world character.
export function firstPersonArmGeometry(mesh){
 const source=mesh.geometry,index=source.index,skin=source.attributes.skinIndex,weights=source.attributes.skinWeight;
 if(!index||!skin||!weights||!mesh.skeleton)return null;
 const allowed=mesh.skeleton.bones.map(bone=>forearmBone(bone.name)),eligible=new Uint8Array(skin.count);
 for(let vertex=0;vertex<skin.count;vertex++){let weight=0;for(let component=0;component<skin.itemSize;component++)if(allowed[skin.getComponent(vertex,component)])weight+=weights.getComponent(vertex,component);eligible[vertex]=+(weight>=.35);}
 const remap=new Map(),originalIndices=[],indices=[];
 for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(!eligible[a]||!eligible[b]||!eligible[c])continue;for(const vertex of [a,b,c]){if(!remap.has(vertex)){remap.set(vertex,originalIndices.length);originalIndices.push(vertex);}indices.push(remap.get(vertex));}}
 if(!indices.length)return null;
 const geometry=new T.BufferGeometry();
 for(const[name,attribute]of Object.entries(source.attributes)){
  const values=new attribute.array.constructor(originalIndices.length*attribute.itemSize),copy=new T.BufferAttribute(values,attribute.itemSize,attribute.normalized);
  for(let vertex=0;vertex<originalIndices.length;vertex++)for(let component=0;component<attribute.itemSize;component++)copy.setComponent(vertex,component,attribute.getComponent(originalIndices[vertex],component));
  geometry.setAttribute(name,copy);
 }
 // The view sleeve has no upper arm: blended shoulder weights would leave
 // isolated vertices behind when its proximal end is reframed below camera.
 // Renormalize only those cut sleeve vertices onto their existing forearm
 // influences. Pure wrist/finger vertices retain their authored weights.
 const viewSkin=geometry.attributes.skinIndex,viewWeights=geometry.attributes.skinWeight;
 for(let vertex=0;vertex<originalIndices.length;vertex++){let retained=0,removed=0;for(let channel=0;channel<viewSkin.itemSize;channel++){const weight=viewWeights.getComponent(vertex,channel);if(allowed[viewSkin.getComponent(vertex,channel)])retained+=weight;else removed+=weight;}if(removed>1e-6)for(let channel=0;channel<viewSkin.itemSize;channel++)viewWeights.setComponent(vertex,channel,allowed[viewSkin.getComponent(vertex,channel)]?viewWeights.getComponent(vertex,channel)/retained:0);}
 geometry.setIndex(indices);geometry.userData.sourceVertices=originalIndices;geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

export function createFirstPersonArms(player){
 const source=player.userData.detailedContent;if(!source)return null;
 const root=cloneSkeleton(source),pairs=[],geometries=new Set(),skeletons=new Set(),nodes=[];shareInstanceSkeletons(root);
 const pair=(a,b)=>{nodes.push([a,b]);for(let i=0;i<a.children.length;i++)pair(a.children[i],b.children[i]);};pair(source,root);
 let triangles=0;
 for(const[a,b]of nodes){
  if(b.isSkinnedMesh){skeletons.add(b.skeleton);if((a.userData.castLOD??(/^LOD1 /.test(a.name)?1:0))===1){b.removeFromParent();continue;}const geometry=firstPersonArmGeometry(a);if(!geometry){b.removeFromParent();continue;}b.geometry=geometry;b.castShadow=b.receiveShadow=false;b.frustumCulled=false;geometries.add(geometry);triangles+=geometry.index.count/3;pairs.push([a,b]);}
  else if(b.isMesh)b.removeFromParent();else b.visible=true;
 }
 if(!pairs.length){for(const skeleton of skeletons)skeleton.dispose();return null;}
 const bonePairs=nodes.filter(([a])=>a.isBone),inverseBody=new T.Matrix4(),parentInverse=new T.Matrix4(),desired=new Map();root.matrixAutoUpdate=false;root.name='Detailed first-person sleeves';
 const armFrames=['L','R'].map(side=>{const find=name=>bonePairs.find(([bone])=>bone.name.replaceAll('.','')===name+side)?.[0],wrist=find('wrist'),elbow=find('lowerarm01');return wrist&&elbow?{side,wrist,elbow,world:new T.Matrix4(),bones:bonePairs.filter(([bone])=>bone.name.replaceAll('.','').startsWith('lowerarm')&&bone.name.endsWith(side)).map(([bone])=>bone)}:null;}).filter(Boolean);
 for(const frame of armFrames)for(const bone of frame.bones)desired.set(bone,new T.Matrix4());
 for(const[,bone]of bonePairs)bone.matrixAutoUpdate=false;
 const wristPoint=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),turn=new T.Quaternion(),along=new T.Matrix4(),rotate=new T.Matrix4(),translate=new T.Matrix4();
 function update(){
  // Weapons already use body-local coordinates in the existing camera overlay.
  // Removing the body's world transform keeps detailed fingers on those grips,
  // including recoil, independent dual hands, melee and airborne torso lean.
  player.userData.body.updateWorldMatrix(true,false);source.updateWorldMatrix(true,false);
  root.matrix.multiplyMatrices(inverseBody.copy(player.userData.body.matrixWorld).invert(),source.matrixWorld);root.matrixWorldNeedsUpdate=true;
  // The world elbow sits next to the chest. In a camera view its open sleeve
  // would float mid-screen. Extend the sleeve back below the camera, keeping
  // the wrist/finger world matrices exact so every weapon grip remains intact.
  for(const frame of armFrames){
   wristPoint.setFromMatrixPosition(frame.wrist.matrixWorld).applyMatrix4(inverseBody);
   from.setFromMatrixPosition(frame.elbow.matrixWorld).applyMatrix4(inverseBody).sub(wristPoint);const length=from.length();from.normalize();
   to.set(frame.side==='L'?.38:-.38,.72,-.18).sub(wristPoint);const stretch=to.length()/Math.max(.001,length);to.normalize();turn.setFromUnitVectors(from,to);
   const k=stretch-1,x=from.x,y=from.y,z=from.z;
   along.set(1+k*x*x,k*x*y,k*x*z,0,k*x*y,1+k*y*y,k*y*z,0,k*x*z,k*y*z,1+k*z*z,0,0,0,0,1);
   frame.world.copy(player.userData.body.matrixWorld).multiply(translate.makeTranslation(wristPoint.x,wristPoint.y,wristPoint.z)).multiply(rotate.makeRotationFromQuaternion(turn)).multiply(along).multiply(translate.makeTranslation(-wristPoint.x,-wristPoint.y,-wristPoint.z)).multiply(inverseBody);
   for(const bone of frame.bones)desired.get(bone).multiplyMatrices(frame.world,bone.matrixWorld);
  }
  for(const[a,b]of bonePairs){b.matrix.multiplyMatrices(parentInverse.copy(desired.get(a.parent)||a.parent.matrixWorld).invert(),desired.get(a)||a.matrixWorld);b.matrixWorldNeedsUpdate=true;}
  for(const[a,b]of pairs){b.material=a.material;b.visible=true;}
 }
 update();let disposed=false;
 return{root,source,pairs,triangles,update,dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const skeleton of skeletons)skeleton.dispose();}};
}
