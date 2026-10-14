#!/usr/bin/env node
// Explicit prototype-art check. Not part of the production game test suite.
// Usage: node scripts/art/validate-rook.mjs [path/to/model.glb]
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const defaultModel=resolve(root,'assets/characters/rook-prototype-v1.glb');
const componentSizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const componentReaders={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'};
const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const finiteArray=a=>Array.isArray(a)&&a.every(Number.isFinite);
const near=(a,b)=>Math.abs(a-b)<=Math.max(1e-5,Math.abs(a)*1e-5,Math.abs(b)*1e-5);
function requireThat(condition,message){if(!condition)throw new Error(message);}

function decodeGLB(bytes){
 requireThat(bytes.length>=28,'GLB is truncated.');requireThat(bytes.readUInt32LE(0)===0x46546c67,'Invalid GLB magic.');requireThat(bytes.readUInt32LE(4)===2,'GLB version must be 2.');requireThat(bytes.readUInt32LE(8)===bytes.length,'GLB declared length does not match file.');
 let json,bin;for(let offset=12;offset<bytes.length;){requireThat(offset+8<=bytes.length,'Incomplete GLB chunk header.');const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8;requireThat(length%4===0&&offset+length<=bytes.length,'Invalid GLB chunk bounds.');if(type===0x4e4f534a)json=JSON.parse(bytes.toString('utf8',offset,offset+length));if(type===0x004e4942)bin=bytes.subarray(offset,offset+length);offset+=length;}
 requireThat(json?.asset?.version==='2.0','Missing glTF 2.0 metadata.');requireThat(bin,'Missing embedded binary chunk.');requireThat(json.buffers?.length===1&&!json.buffers[0].uri,'Prototype must be a self-contained GLB buffer.');requireThat(json.buffers[0].byteLength<=bin.length&&bin.length-json.buffers[0].byteLength<4,'Embedded buffer length is invalid.');return{json,bin};
}
function accessorsFor(json,bin){
 const cache=new Map(),data=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
 for(const [index,v]of (json.bufferViews||[]).entries())requireThat(v.buffer===0&&Number.isInteger(v.byteLength)&&v.byteLength>0&&(v.byteOffset||0)>=0&&(v.byteOffset||0)+v.byteLength<=bin.length,`Buffer view ${index} exceeds binary bounds.`);
 return index=>{
  if(cache.has(index))return cache.get(index);const a=json.accessors?.[index];requireThat(a,`Missing accessor ${index}.`);requireThat(!a.sparse,`Accessor ${index} uses sparse data; add sparse validation before accepting a new exporter.`);
  const v=json.bufferViews[a.bufferView],size=componentSizes[a.componentType],width=widths[a.type];requireThat(v&&size&&width&&Number.isInteger(a.count)&&a.count>0,`Accessor ${index} has invalid type/count/buffer.`);
  requireThat(!/^MAT[23]$/.test(a.type)||size===4,`Accessor ${index} uses packed matrix alignment unsupported by this art check.`);
  const stride=v.byteStride||size*width,local=a.byteOffset||0,offset=(v.byteOffset||0)+local;requireThat(Number.isInteger(stride)&&stride>=size*width&&stride%size===0&&local>=0&&local%size===0,`Accessor ${index} has invalid alignment/stride.`);requireThat(local+(a.count-1)*stride+size*width<=v.byteLength,`Accessor ${index} exceeds its buffer view.`);
  const values=new Float64Array(a.count*width),min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
  for(let i=0;i<a.count;i++)for(let k=0;k<width;k++){const raw=data[componentReaders[a.componentType]](offset+i*stride+k*size,true);requireThat(Number.isFinite(raw),`Accessor ${index} has non-finite data.`);min[k]=Math.min(min[k],raw);max[k]=Math.max(max[k],raw);let n=raw;if(a.normalized)n=a.componentType===5120?Math.max(-1,n/127):a.componentType===5121?n/255:a.componentType===5122?Math.max(-1,n/32767):a.componentType===5123?n/65535:n;values[i*width+k]=n;}
  if(a.min||a.max){requireThat(finiteArray(a.min)&&finiteArray(a.max)&&a.min.length===width&&a.max.length===width,`Accessor ${index} has malformed min/max.`);for(let k=0;k<width;k++)requireThat(near(min[k],a.min[k])&&near(max[k],a.max[k]),`Accessor ${index} min/max does not match actual data.`);}
  cache.set(index,values);return values;
 };
}
function validateStructure(json,bin){
 const values=accessorsFor(json,bin);for(let i=0;i<(json.accessors||[]).length;i++)values(i);
 const nodes=json.nodes||[],meshes=json.meshes||[],skins=json.skins||[],meshNodes=nodes.filter(n=>n.mesh!==undefined);requireThat(meshes.length===50&&meshNodes.length===50,`Expected exactly 50 authored meshes and 50 mesh nodes, got ${meshes.length}/${meshNodes.length}.`);
 const parents=new Map();for(const [i,node]of nodes.entries()){for(const key of ['translation','rotation','scale','matrix'])if(node[key])requireThat(finiteArray(node[key]),`Node ${i} has non-finite ${key}.`);for(const child of node.children||[]){requireThat(nodes[child]&&!parents.has(child),`Node ${i} has missing/multiply-parented child ${child}.`);parents.set(child,i);}}
 for(let i=0;i<nodes.length;i++){const visited=new Set([i]);for(let p=parents.get(i);p!==undefined;p=parents.get(p)){requireThat(!visited.has(p),'Node hierarchy contains a cycle.');visited.add(p);}}
 for(const [i,skin]of skins.entries()){requireThat(skin.joints?.length&&new Set(skin.joints).size===skin.joints.length&&skin.joints.every(j=>nodes[j]),`Skin ${i} has invalid joints.`);const ibm=json.accessors[skin.inverseBindMatrices];requireThat(ibm?.type==='MAT4'&&ibm.count===skin.joints.length,`Skin ${i} inverse bind matrix count/type mismatch.`);}
 let vertices=0,triangles=0,primitives=0;
 for(const node of meshNodes){const skin=skins[node.skin],mesh=meshes[node.mesh];requireThat(skin,`Mesh '${node.name||node.mesh}' is not skinned.`);requireThat(mesh,`Node ${node.name} references a missing mesh.`);
  for(const p of mesh.primitives){primitives++;requireThat(p.mode===undefined||p.mode===4,`Mesh ${node.name} is not triangles.`);const pos=json.accessors[p.attributes.POSITION];requireThat(pos?.type==='VEC3',`Mesh ${node.name} has no VEC3 positions.`);vertices+=pos.count;for(const [key,index]of Object.entries(p.attributes))requireThat(json.accessors[index]?.count===pos.count,`Mesh ${node.name} ${key} count differs from positions.`);
   if(p.indices!==undefined){const indices=values(p.indices);requireThat(indices.length%3===0&&indices.every(i=>Number.isInteger(i)&&i>=0&&i<pos.count),`Mesh ${node.name} has invalid triangle indices.`);triangles+=indices.length/3;}else{requireThat(pos.count%3===0,`Mesh ${node.name} has incomplete triangles.`);triangles+=pos.count/3;}
   const sets=Object.keys(p.attributes).filter(k=>/^JOINTS_\d+$/.test(k));requireThat(sets.length>0,`Mesh ${node.name} has no joint attributes.`);const sums=new Float64Array(pos.count);
   for(const key of sets){const weightKey=key.replace('JOINTS','WEIGHTS'),ji=p.attributes[key],wi=p.attributes[weightKey];requireThat(json.accessors[ji]?.type==='VEC4'&&json.accessors[wi]?.type==='VEC4',`Mesh ${node.name} has missing/invalid weights.`);const joints=values(ji),weights=values(wi);requireThat(joints.every(j=>Number.isInteger(j)&&j>=0&&j<skin.joints.length),`Mesh ${node.name} has joint indices outside its skin.`);for(let i=0;i<weights.length;i++){requireThat(weights[i]>=0&&weights[i]<=1,`Mesh ${node.name} has weights outside [0,1].`);sums[Math.floor(i/4)]+=weights[i];}}
   requireThat(sums.every(s=>Math.abs(s-1)<.001),`Mesh ${node.name} has unnormalized skin weights.`);
  }
 }
 const animation=(json.animations||[]).map((clip,i)=>{requireThat(clip.channels?.length,`Animation ${i} has no channels.`);let duration=0;for(const channel of clip.channels){const sampler=clip.samplers[channel.sampler];requireThat(sampler&&nodes[channel.target.node],`Animation ${clip.name} has an invalid sampler/target.`);requireThat(['translation','rotation','scale','weights'].includes(channel.target.path),`Animation ${clip.name} has an invalid target path.`);const input=json.accessors[sampler.input],output=json.accessors[sampler.output],times=values(sampler.input);requireThat(input.type==='SCALAR'&&input.componentType===5126&&times.every((t,i)=>t>=0&&(!i||t>times[i-1])),`Animation ${clip.name} has invalid sample times.`);const multiplier=sampler.interpolation==='CUBICSPLINE'?3:1;requireThat(channel.target.path!=='weights'&&output.count===input.count*multiplier,`Animation ${clip.name} has an unsupported/mismatched output count.`);requireThat(output.type===(channel.target.path==='rotation'?'VEC4':'VEC3'),`Animation ${clip.name} has wrong output dimensions.`);duration=Math.max(duration,times.at(-1));}requireThat(duration>0,`Animation ${clip.name} has zero duration.`);return{name:clip.name||`Clip ${i+1}`,duration,channels:clip.channels.length};});
 requireThat(animation.length>=2&&animation.some(a=>/breath|idle/i.test(a.name))&&animation.some(a=>/walk/i.test(a.name)),'Expected imported breathing/idle and walk studies.');return{meshes:meshes.length,skinnedMeshes:meshNodes.length,primitives,vertices,triangles,skinJoints:skins.map(s=>s.joints.length),materials:json.materials?.length||0,textures:json.textures?.length||0,accessors:json.accessors.length,animations:animation};
}
async function validateDeformation(bytes){
 // GLTFLoader's fetch progress path expects this browser event in some Node versions.
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class ProgressEvent{constructor(type,init={}){this.type=type;Object.assign(this,init);}};
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),scene=gltf.scene,mixer=new T.AnimationMixer(scene);
 const bounds=()=>{scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});const b=new T.Box3().setFromObject(scene),size=b.getSize(new T.Vector3());requireThat(!b.isEmpty()&&[...b.min,...b.max,...size].every(Number.isFinite)&&size.y>0,'Three.js produced empty or non-finite deformed bounds.');return{min:b.min.toArray(),max:b.max.toArray(),size:size.toArray()};};
 try{
  let skinned=0,rigid=0;scene.traverse(o=>{if(o.isSkinnedMesh)skinned++;else if(o.isMesh)rigid++;});requireThat(skinned===50&&rigid===0,`Real GLTFLoader produced ${skinned} skinned and ${rigid} rigid meshes.`);const bind=bounds();requireThat(bind.size[1]>1&&bind.size[1]<2.5,`Authored height ${bind.size[1]}m is outside expected human scale.`);
  const animations=[];for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).reset().play();const samples=[];for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875,1]){mixer.setTime(clip.duration*fraction);const sample=bounds();requireThat(sample.size.every((v,i)=>v<Math.max(1,bind.size[i])*3),`Animation ${clip.name} has exploding deformed bounds.`);requireThat(sample.min.every(v=>Math.abs(v)<10)&&sample.max.every(v=>Math.abs(v)<10),`Animation ${clip.name} has escaped the origin.`);samples.push({fraction,...sample});}animations.push({name:clip.name,duration:clip.duration,samples});}return{bind,animations};
 }finally{mixer.stopAllAction();mixer.uncacheRoot(scene);const geo=new Set(),mat=new Set(),tex=new Set(),bones=new Set();scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);if(o.skeleton)bones.add(o.skeleton);for(const m of [].concat(o.material||[])){mat.add(m);for(const t of Object.values(m))if(t?.isTexture)tex.add(t);}});for(const g of geo)g.dispose();for(const m of mat)m.dispose();for(const t of tex)t.dispose();for(const s of bones)s.dispose();}
}
export async function validateRook(path=defaultModel){const bytes=await readFile(path),{json,bin}=decodeGLB(bytes),structure=validateStructure(json,bin),deformation=await validateDeformation(bytes);return{ok:true,file:relative(root,path),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...structure,deformation};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{requireThat(process.argv.length<=3,'Usage: node scripts/art/validate-rook.mjs [model.glb]');console.log(JSON.stringify(await validateRook(process.argv[2]?resolve(process.argv[2]):defaultModel),null,2));}
 catch(error){console.error(JSON.stringify({ok:false,error:error.message},null,2));process.exitCode=1;}
}
