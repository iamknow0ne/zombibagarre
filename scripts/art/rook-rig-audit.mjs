#!/usr/bin/env node
// Reports measurable rig properties; it deliberately makes no visual-quality claim.
// Usage: node scripts/art/rook-rig-audit.mjs [model.glb] > report.json
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const rounded=v=>v.map(x=>Number(x.toFixed(6)));
const bonePattern=/^(root|pelvis|spine|neck|head|clavicle|shoulder|upperarm|lowerarm|wrist|upperleg|lowerleg|foot)/;
function boxJSON(box){return box.isEmpty()?null:{min:rounded(box.min.toArray()),max:rounded(box.max.toArray())};}
function rigidEnvelope(mesh,joint){
 const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex,box=new T.Box3();let count=0;
 for(let i=0;i<weights.count;i++){
  let hits=0,sole=-1;for(let k=0;k<4;k++)if(weights.getComponent(i,k)>1e-4){hits++;sole=indices.getComponent(i,k);}
  if(hits===1&&sole===joint){const p=new T.Vector3();mesh.getVertexPosition(i,p);box.expandByPoint(p.applyMatrix4(mesh.matrixWorld));count++;}
 }
 return{vertices:count,worldBounds:boxJSON(box)};
}
function positions(mesh){const result=[];for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=new T.Vector3();mesh.getVertexPosition(i,p);result.push(p.applyMatrix4(mesh.matrixWorld));}return result;}
function refresh(scene){scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
export async function auditRookRig(path=resolve(root,'assets/characters/rook-prototype-v3.glb')){
 const bytes=await readFile(path);
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{constructor(type,init={}){this.type=type;Object.assign(this,init);}};
 const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'AUDIT_PLACEHOLDER_IMAGES'};});
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=gltf.scene,meshes=[],bones=[];scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);if(o.isBone)bones.push(o);});refresh(scene);
 try{
  const restBones=bones.filter(b=>bonePattern.test(b.name)).map(b=>({name:b.name,parent:b.parent.name,position:rounded(b.getWorldPosition(new T.Vector3()).toArray()),localQuaternion:rounded(b.quaternion.toArray()),worldAxes:['x','y','z'].map((_,i)=>rounded(new T.Vector3(...[0,1,2].map(k=>k===i?1:0)).applyQuaternion(b.getWorldQuaternion(new T.Quaternion())).toArray()))}));
  const materials=meshes.map(mesh=>{
   const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex,influenceCounts=[0,0,0,0,0],jointWeights=new Map();
   for(let i=0;i<weights.count;i++){let n=0;for(let k=0;k<4;k++){const w=weights.getComponent(i,k);if(w>1e-4){n++;const j=indices.getComponent(i,k);jointWeights.set(j,(jointWeights.get(j)||0)+w);}}influenceCounts[n]++;}
   const dominantJoints=[...jointWeights].sort((a,b)=>b[1]-a[1]).map(([j,w])=>({bone:mesh.skeleton.bones[j].name,vertexWeightSum:Number(w.toFixed(3)),...rigidEnvelope(mesh,j)}));
   return{name:mesh.name,material:mesh.material.name,vertices:weights.count,verticesByInfluenceCount:influenceCounts,rigidVertexFraction:Number((influenceCounts[1]/weights.count).toFixed(4)),dominantJoints};
  });
  const rest=meshes.map(positions),probes=[];
  const seamIndex=meshes.findIndex(m=>/Canvas__seam_thread/.test(m.name)),canvasIndex=meshes.findIndex(m=>/Field_jacket__moss_canvas/.test(m.name));
  const attachments=seamIndex<0||canvasIndex<0?[]:rest[seamIndex].map(p=>{let nearest=-1,d=Infinity;for(const [i,q]of rest[canvasIndex].entries()){const candidate=p.distanceToSquared(q);if(candidate<d){d=candidate;nearest=i;}}return{nearest,restDistance:Math.sqrt(d)};});
  for(const [name,axis,angle] of [['upperarm01L',[0,0,1],-.6],['upperarm01R',[0,0,1],.6],['lowerarm01L',[1,0,0],-.5],['upperleg01L',[1,0,0],.4],['spine01',[0,1,0],.3]]){
   const bone=scene.getObjectByName(name);if(!bone)throw new Error(`Required audit bone missing: ${name}`);
   const before=bone.quaternion.clone(),parentQ=bone.parent.getWorldQuaternion(new T.Quaternion()),delta=new T.Quaternion().setFromAxisAngle(new T.Vector3(...axis),angle);
   bone.quaternion.copy(parentQ.clone().invert().multiply(delta).multiply(parentQ).multiply(before));refresh(scene);
   const posed=meshes.map(positions),deformation=meshes.map((mesh,m)=>{let displacedVertices=0,maxDisplacement=0,total=0;for(const [i,p]of posed[m].entries()){const d=p.distanceTo(rest[m][i]);if(d>1e-5)displacedVertices++;maxDisplacement=Math.max(maxDisplacement,d);total+=d;}return{name:mesh.name,displacedVertices,maxDisplacement:Number(maxDisplacement.toFixed(6)),meanDisplacement:Number((total/rest[m].length).toFixed(6))};});
   let maxDistanceChange=0,totalChange=0;for(const [i,a]of attachments.entries()){const change=Math.abs(posed[seamIndex][i].distanceTo(posed[canvasIndex][a.nearest])-a.restDistance);maxDistanceChange=Math.max(maxDistanceChange,change);totalChange+=change;}
   const seamTracking=attachments.length?{method:'Change in distance to nearest rest-pose canvas vertex; heuristic attachment drift, not surface intersection detection.',vertices:attachments.length,maxDistanceChange:Number(maxDistanceChange.toFixed(6)),meanDistanceChange:Number((totalChange/attachments.length).toFixed(6))}:null;
   probes.push({bone:name,worldAxis:axis,radians:angle,deformation,seamTracking});bone.quaternion.copy(before);refresh(scene);
  }
  return{file:relative(root,path),sha256:createHash('sha256').update(bytes).digest('hex'),scope:'Rest-pose coordinates, skin weights and isolated bone deformation. No raster decoding, intersection detection, correct pose assertion or production readiness claim.',coordinateConvention:'Y up; facial surface faces positive Z; anatomical left is positive X. Coordinates are imported scene meters.',skinMeshCount:meshes.length,boneCount:bones.length,restBones,materials,probes,reviewNotes:['Split upperarm01/02 and lowerarm01/02 chains: lowerarm01 is anatomical elbow; wrist is hand root.','Single-influence vertices are not inherently defects; rigid cap/hardware are expected. Spatial envelopes identify where rigid vertices need rendered inspection.','V3 additional seam-thread tubes are created after the build script weight-transfer pass; they inherit tube default spine02 binding. Inspect against canvas during chest/arm pose changes.','A-pose clips and finite bounds do not establish usable locomotion, weapon grips or cloth clearance.']};
 }finally{
  const geos=new Set(),mats=new Set(),textures=new Set(),skeletons=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const m of [].concat(o.material||[])){mats.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();for(const s of skeletons)s.dispose();
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await auditRookRig(process.argv[2]?resolve(process.argv[2]):undefined),null,2));
