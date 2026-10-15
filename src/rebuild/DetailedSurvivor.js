import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {resolveAppearance} from './Customization.js';
import {disposeObjectResources} from './ResourceDisposal.js';

const modelURL=new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url).href;
const DOWN=new T.Vector3(0,-1,0);
// This mesh depicts a specific person and outfit. Never overwrite the other
// identities or silently discard their selected face, hairstyle or costume.
export function detailedRookCompatible(skin,appearance){
 if(skin!=='scout')return false;
 const actual=resolveAppearance(skin,appearance),authored=resolveAppearance('scout');
 return Object.keys(authored).every(key=>key==='hideHelmet'||actual[key]===authored[key]);
}

function cosmeticMeshes(hero){
 const d=hero.userData,attachments=new Set([...(d.armourParts||[]),...(d.weaponRigs||[])]),meshes=[];
 d.body.traverse(o=>{if(!o.isMesh)return;for(let ancestor=o;ancestor&&ancestor!==d.body;ancestor=ancestor.parent)if(attachments.has(ancestor))return;meshes.push(o);});return meshes;
}
export function attachDetailedRook(hero,content,cosmetics=cosmeticMeshes(hero)){
 const d=hero.userData,bones=new Map(),rest=new Map(),hidden=[];
 content.updateMatrixWorld(true);
 content.traverse(o=>{if(o.isBone){bones.set(o.name,o);rest.set(o,{point:o.getWorldPosition(new T.Vector3()),q:o.getWorldQuaternion(new T.Quaternion())});}if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});
 const bone=name=>{const b=bones.get(name);if(!b)throw new Error(`Detailed survivor missing ${name}`);return b;};
 for(const name of ['root','head',...['L','R'].flatMap(side=>['upperarm01','lowerarm01','wrist','finger3-1','upperleg01','lowerleg01','foot'].map(name=>name+side))])bone(name);
 const point=name=>rest.get(bone(name)).point.clone();
 const bindings=[],fingers=[];
 for(const side of ['L','R']){
  const first=bones.get('finger2-1'+side),last=bones.get('finger5-1'+side),middle=bones.get('finger3-1'+side);if(!first||!last||!middle)continue;
  const normal=point(last.name).sub(point(first.name)).cross(point(middle.name).sub(point('wrist'+side))).normalize().multiplyScalar(side==='L'?1:-1);
  for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++){
   const b=bones.get(`finger${finger}-${joint}${side}`);if(!b)continue;const child=b.children.find(o=>o.isBone),segment=child?point(child.name).sub(point(b.name)).normalize():new T.Vector3(0,1,0).applyQuaternion(rest.get(b).q);
   fingers.push({bone:b,rest:b.quaternion.clone(),axis:segment.cross(normal).normalize().applyQuaternion(rest.get(b).q.clone().invert()),amount:[.62,.84,.46][joint-1]});
  }
 }
 const bind=(name,source,child=null)=>{
  const b=bone(name),r=rest.get(b),q=r.q.clone();
  if(child){const axis=point(child).sub(r.point).normalize();q.premultiply(new T.Quaternion().setFromUnitVectors(DOWN,axis).invert());}
  bindings.push({bone:b,source,correction:q});
 };
 // Keep the authored proportions while retaining the existing live controls,
 // weapon grips, armour parents, traversal poses and first-person overlay.
 for(const [index,side] of [[0,'R'],[1,'L']]){
  const arm=d.arms[index],leg=d.legs[index],upper=point('upperarm01'+side),elbow=point('lowerarm01'+side),wrist=point('wrist'+side);
  arm.position.copy(upper);arm.userData.upperLength=upper.distanceTo(elbow);arm.userData.lowerLength=elbow.distanceTo(wrist);
  arm.userData.elbow.position.set(0,-arm.userData.upperLength,0);arm.userData.wrist.position.set(0,-arm.userData.lowerLength,0);
  const hip=point('upperleg01'+side),knee=point('lowerleg01'+side),ankle=point('foot'+side);
  leg.position.copy(hip);leg.userData.knee.position.set(0,-hip.distanceTo(knee),0);leg.userData.ankle.position.set(0,-knee.distanceTo(ankle),0);
  bind('upperarm01'+side,arm,'lowerarm01'+side);bind('lowerarm01'+side,arm.userData.elbow,'wrist'+side);
  // Rest hand points diagonally outwards in the exported A-pose. Align the
  // palm's long axis to the existing glove's down axis before applying its grip.
  bind('wrist'+side,arm.userData.wrist,'finger3-1'+side);
  bind('upperleg01'+side,leg,'lowerleg01'+side);bind('lowerleg01'+side,leg.userData.knee,'foot'+side);bind('foot'+side,leg.userData.ankle);
 }
 d.head.position.copy(point('head'));bind('head',d.head);
 // Capture only original cosmetic meshes. Armour/weapon nodes attached later
 // stay visible. Layers hide the source skin without hiding its joint children;
 // FPS explicitly copies these meshes into its independent overlay scene.
 for(const mesh of cosmetics){hidden.push([mesh,mesh.layers.mask]);mesh.layers.set(2);}
 hero.add(content);d.detailedModel='rook-v7';d.weaponCarryOffset=new T.Vector3(0,.065,-.08);
 const root=bone('root'),r=rest.get(root),worldP=new T.Vector3(),worldQ=new T.Quaternion(),worldScale=new T.Vector3(),parentP=new T.Vector3(),parentScale=new T.Vector3(),inverseQ=new T.Quaternion(),inverseMatrix=new T.Matrix4();
 for(const finger of fingers){finger.armed=finger.rest.clone().multiply(new T.Quaternion().setFromAxisAngle(finger.axis,finger.amount));finger.relaxed=finger.rest.clone().multiply(new T.Quaternion().setFromAxisAngle(finger.axis,.12));}
 function worldTransform(b,p,q){
  // Only refresh this joint's ancestry. Updating its descendants here would
  // repeatedly traverse the 163-bone skeleton for every driven joint.
  b.parent.updateWorldMatrix(true,false);
  b.position.copy(p).applyMatrix4(inverseMatrix.copy(b.parent.matrixWorld).invert());
  b.parent.matrixWorld.decompose(parentP,inverseQ,parentScale);
  b.quaternion.copy(inverseQ.invert().multiply(q));
  b.updateMatrix();b.matrixWorld.multiplyMatrices(b.parent.matrixWorld,b.matrix);
 }
 function update(){
  hero.updateWorldMatrix(true,false);d.body.updateWorldMatrix(false,true);
  d.body.matrixWorld.decompose(worldP,worldQ,worldScale);
  worldP.copy(r.point).applyMatrix4(d.body.matrixWorld);worldQ.multiply(r.q);
  worldTransform(root,worldP,worldQ);
  for(const entry of bindings){entry.source.matrixWorld.decompose(worldP,worldQ,worldScale);worldQ.multiply(entry.correction);worldTransform(entry.bone,worldP,worldQ);}
  const armed=!!d.weaponRigs?.some(Boolean);for(const finger of fingers)finger.bone.quaternion.copy(armed?finger.armed:finger.relaxed);
  // One final propagation updates untouched twist, garment and finger bones.
  content.updateWorldMatrix(false,true);
 }
 update();
 return{content,update,dispose(){for(const [mesh,mask]of hidden)mesh.layers.mask=mask;delete d.detailedModel;content.removeFromParent();disposeObjectResources(content);}};
}

// One texture/geometry owner per world. Skinned instances own their skeletons
// and material copies, so camera fading and teardown never affect another view.
export class DetailedSurvivorLibrary{
 constructor({load=()=>new GLTFLoader().loadAsync(modelURL),onChange=()=>{}}={}){this.load=load;this.onChange=onChange;this.instances=new Map();this.pending=new Set();this.closed=false;}
 request(hero){
  if(this.closed||!detailedRookCompatible(hero.userData.skin,hero.userData.custom))return;
  const ticket={hero,cosmetics:cosmeticMeshes(hero)};this.pending.add(ticket);hero.userData.detailedStatus='loading';
  const install=()=>{
   if(this.closed||!this.pending.delete(ticket))return;
   const content=cloneSkeleton(this.template);content.traverse(o=>{if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>{const n=m.clone();n.userData.shared=false;return n;}):(()=>{const n=o.material.clone();n.userData.shared=false;return n;})();});
   try{const adapter=attachDetailedRook(hero,content,ticket.cosmetics);this.instances.set(hero,adapter);hero.userData.detailedStatus='ready';this.onChange();}
   catch(error){content.removeFromParent();disposeObjectResources(content);hero.userData.detailedStatus='fallback';}
  };
  if(this.template){install();return;}
  this.promise??=Promise.resolve().then(this.load).then(gltf=>{
   if(this.closed){disposeObjectResources(gltf.scene);return;}
   this.template=gltf.scene;this.template.traverse(o=>{if(o.geometry)o.geometry.userData.shared=true;for(const m of [].concat(o.material||[])){m.userData.shared=true;for(const value of Object.values(m))if(value?.isTexture)value.userData.shared=true;}});
  });
  this.promise.then(install,()=>{if(this.pending.delete(ticket))hero.userData.detailedStatus='fallback';});
 }
 update(hero){this.instances.get(hero)?.update();}
 release(hero){for(const ticket of this.pending)if(ticket.hero===hero)this.pending.delete(ticket);const adapter=this.instances.get(hero);if(adapter){adapter.dispose();this.instances.delete(hero);}}
 dispose(){if(this.closed)return;this.closed=true;this.pending.clear();for(const hero of [...this.instances.keys()])this.release(hero);if(this.template){this.template.traverse(o=>{if(o.geometry)o.geometry.userData.shared=false;for(const m of [].concat(o.material||[])){m.userData.shared=false;for(const value of Object.values(m))if(value?.isTexture)value.userData.shared=false;}});disposeObjectResources(this.template);this.template=null;}}
}
