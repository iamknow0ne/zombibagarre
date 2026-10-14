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
 let json,bin;for(let offset=12;offset<bytes.length;){requireThat(offset+8<=bytes.length,'Incomplete GLB chunk header.');const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8;requireThat(length%4===0&&offset+length<=bytes.length,'Invalid GLB chunk bounds.');if(type===0x4e4f534a){requireThat(!json&&offset===20,'GLB JSON must be the first and only JSON chunk.');json=JSON.parse(bytes.toString('utf8',offset,offset+length));}if(type===0x004e4942){requireThat(!bin,'Duplicate GLB binary chunk.');bin=bytes.subarray(offset,offset+length);}offset+=length;}
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
// Container/header validation only: this does not decompress raster pixels.
function imageMetadata(bytes,mime,index){
 const fail=message=>requireThat(false,`Image ${index}: ${message}`);
 if(mime==='image/png'){
  requireThat(bytes.length>=45&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`Image ${index}: invalid PNG signature/length.`);
  let width=0,height=0,ended=false,hasData=false;
  for(let offset=8;offset<bytes.length;){
   requireThat(offset+12<=bytes.length,`Image ${index}: truncated PNG chunk.`);const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);requireThat(offset+length+12<=bytes.length,`Image ${index}: PNG chunk exceeds bounds.`);
   let crc=0xffffffff;for(const value of bytes.subarray(offset+4,offset+8+length)){crc^=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}requireThat(((crc^0xffffffff)>>>0)===bytes.readUInt32BE(offset+8+length),`Image ${index}: PNG chunk CRC mismatch.`);
   if(offset===8){requireThat(kind==='IHDR'&&length===13,`Image ${index}: missing PNG IHDR.`);width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);}
   else requireThat(kind!=='IHDR',`Image ${index}: duplicate PNG IHDR.`);
   if(kind==='IDAT')hasData ||= length>0;
   offset+=length+12;if(kind==='IEND'){requireThat(length===0&&offset===bytes.length,`Image ${index}: invalid PNG end.`);ended=true;break;}
  }
  requireThat(ended&&hasData,`Image ${index}: missing PNG data/end.`);requireThat(width>0&&height>0&&width<=8192&&height<=8192,`Image ${index}: invalid/unbounded PNG dimensions.`);return{mime,width,height,bytes:bytes.length};
 }
 if(mime==='image/jpeg'){
  requireThat(bytes.length>=12&&bytes.readUInt16BE(0)===0xffd8&&bytes.readUInt16BE(bytes.length-2)===0xffd9,`Image ${index}: invalid JPEG signature/end.`);
  for(let offset=2;offset<bytes.length-2;){requireThat(bytes[offset]===255,`Image ${index}: invalid JPEG marker.`);while(bytes[offset]===255)offset++;const marker=bytes[offset++];if(marker===0xda)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;requireThat(offset+2<=bytes.length,`Image ${index}: truncated JPEG segment.`);const length=bytes.readUInt16BE(offset);requireThat(length>=2&&offset+length<=bytes.length,`Image ${index}: JPEG segment exceeds bounds.`);if([0xc0,0xc1,0xc2].includes(marker)){requireThat(length>=8,`Image ${index}: invalid JPEG frame.`);const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);requireThat(width>0&&height>0&&width<=8192&&height<=8192,`Image ${index}: invalid JPEG dimensions.`);return{mime,width,height,bytes:bytes.length};}offset+=length;}
  fail('missing supported JPEG frame.');
 }
 fail('unsupported embedded image MIME type; validate it before accepting.');
}
function validateTextures(json,bin){
 const images=(json.images||[]).map((image,i)=>{requireThat(!image.uri&&Number.isInteger(image.bufferView)&&json.bufferViews[image.bufferView],`Image ${i} must use an existing embedded buffer view.`);const view=json.bufferViews[image.bufferView];requireThat(!view.byteStride&&!view.target,`Image ${i} uses a vertex/index buffer view.`);return imageMetadata(bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength),image.mimeType,i);});
 for(const [i,texture]of(json.textures||[]).entries()){requireThat(Number.isInteger(texture.source)&&images[texture.source],`Texture ${i} references a missing image.`);if(texture.sampler!==undefined)requireThat(Number.isInteger(texture.sampler)&&json.samplers?.[texture.sampler],`Texture ${i} references a missing sampler.`);requireThat(!texture.extensions||Object.keys(texture.extensions).length===0,`Texture ${i} uses an unsupported image extension.`);}
 const materialTextures=(json.materials||[]).map((material,i)=>{
  const refs=[];const visit=value=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if(/Texture$/.test(key)){requireThat(child&&Number.isInteger(child.index)&&json.textures?.[child.index],`Material ${i} ${key} references a missing texture.`);const uv=child.extensions?.KHR_texture_transform?.texCoord??child.texCoord??0;requireThat(Number.isInteger(uv)&&uv>=0&&uv<=3,`Material ${i} ${key} has invalid UV set.`);refs.push({slot:key,index:child.index,uv});}else visit(child);}};visit(material);return refs;
 });
 return{images,materialTextures};
}
function validateStructure(json,bin){
 const values=accessorsFor(json,bin);for(let i=0;i<(json.accessors||[]).length;i++)values(i);
 const textureInfo=validateTextures(json,bin);const nodes=json.nodes||[],meshes=json.meshes||[],skins=json.skins||[],meshNodes=nodes.filter(n=>n.mesh!==undefined);requireThat(meshes.length>=1&&meshes.length<=256&&meshNodes.length>=1&&meshNodes.length<=256,`Expected 1–256 authored meshes and mesh nodes, got ${meshes.length}/${meshNodes.length}.`);requireThat(new Set(meshNodes.map(n=>n.mesh)).size===meshes.length,'Every authored mesh must be referenced by a node.');requireThat(skins.length>=1&&skins.length<=16,'Expected 1–16 skin records.');
 const parents=new Map();for(const [i,node]of nodes.entries()){for(const key of ['translation','rotation','scale','matrix'])if(node[key])requireThat(finiteArray(node[key]),`Node ${i} has non-finite ${key}.`);for(const child of node.children||[]){requireThat(nodes[child]&&!parents.has(child),`Node ${i} has missing/multiply-parented child ${child}.`);parents.set(child,i);}}
 for(let i=0;i<nodes.length;i++){const visited=new Set([i]);for(let p=parents.get(i);p!==undefined;p=parents.get(p)){requireThat(!visited.has(p),'Node hierarchy contains a cycle.');visited.add(p);}}
 for(const [i,skin]of skins.entries()){requireThat(skin.joints?.length>0&&skin.joints.length<=256&&new Set(skin.joints).size===skin.joints.length&&skin.joints.every(j=>Number.isInteger(j)&&nodes[j]),`Skin ${i} has invalid joints.`);const ibm=json.accessors[skin.inverseBindMatrices];requireThat(ibm?.type==='MAT4'&&ibm.componentType===5126&&ibm.count===skin.joints.length,`Skin ${i} inverse bind matrix count/type mismatch.`);}
 let vertices=0,triangles=0,primitives=0,texturedPrimitives=0,uvVertices=0;
 for(const node of meshNodes){const skin=skins[node.skin],mesh=meshes[node.mesh];requireThat(Number.isInteger(node.skin)&&skin,`Mesh '${node.name||node.mesh}' is not skinned.`);requireThat(Number.isInteger(node.mesh)&&mesh,`Node ${node.name} references a missing mesh.`);
  requireThat(mesh.primitives?.length>0,`Mesh ${node.name} has no primitives.`);for(const p of mesh.primitives){primitives++;requireThat(p.mode===undefined||p.mode===4,`Mesh ${node.name} is not triangles.`);const pos=json.accessors[p.attributes?.POSITION];requireThat(pos?.type==='VEC3'&&pos.componentType===5126,`Mesh ${node.name} has no VEC3 positions.`);vertices+=pos.count;for(const [key,index]of Object.entries(p.attributes))requireThat(json.accessors[index]?.count===pos.count,`Mesh ${node.name} ${key} count differs from positions.`);
   if(p.indices!==undefined){const ia=json.accessors[p.indices];requireThat(ia?.type==='SCALAR'&&[5121,5123,5125].includes(ia.componentType)&&!ia.normalized,`Mesh ${node.name} has invalid index accessor type.`);const indices=values(p.indices);requireThat(indices.length%3===0&&indices.every(i=>Number.isInteger(i)&&i>=0&&i<pos.count),`Mesh ${node.name} has invalid triangle indices.`);triangles+=indices.length/3;}else{requireThat(pos.count%3===0,`Mesh ${node.name} has incomplete triangles.`);triangles+=pos.count/3;}
   requireThat(p.material===undefined||Number.isInteger(p.material)&&json.materials?.[p.material],`Mesh ${node.name} references a missing material.`);
   const refs=textureInfo.materialTextures[p.material]||[];if(refs.length){texturedPrimitives++;uvVertices+=pos.count;}
   for(const uvSet of new Set(refs.map(ref=>ref.uv))){const ui=p.attributes[`TEXCOORD_${uvSet}`],ua=json.accessors[ui];requireThat(ua?.type==='VEC2'&&ua.count===pos.count&&(ua.componentType===5126||[5121,5123].includes(ua.componentType)&&ua.normalized),`Mesh ${node.name} has missing/invalid texture UV coverage.`);const uv=values(ui);let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;for(let i=0;i<uv.length;i+=2){minU=Math.min(minU,uv[i]);maxU=Math.max(maxU,uv[i]);minV=Math.min(minV,uv[i+1]);maxV=Math.max(maxV,uv[i+1]);}requireThat(maxU-minU>1e-6&&maxV-minV>1e-6,`Mesh ${node.name} has collapsed UV coverage.`);}
   const sets=Object.keys(p.attributes).filter(k=>/^JOINTS_\d+$/.test(k));requireThat(sets.length>0,`Mesh ${node.name} has no joint attributes.`);const sums=new Float64Array(pos.count);
   for(const key of sets){const weightKey=key.replace('JOINTS','WEIGHTS'),ji=p.attributes[key],wi=p.attributes[weightKey];requireThat(json.accessors[ji]?.type==='VEC4'&&[5121,5123].includes(json.accessors[ji].componentType)&&!json.accessors[ji].normalized&&json.accessors[wi]?.type==='VEC4'&&(json.accessors[wi].componentType===5126||[5121,5123].includes(json.accessors[wi].componentType)&&json.accessors[wi].normalized),`Mesh ${node.name} has missing/invalid weights.`);const joints=values(ji),weights=values(wi);requireThat(joints.every(j=>Number.isInteger(j)&&j>=0&&j<skin.joints.length),`Mesh ${node.name} has joint indices outside its skin.`);for(let i=0;i<weights.length;i++){requireThat(weights[i]>=0&&weights[i]<=1,`Mesh ${node.name} has weights outside [0,1].`);sums[Math.floor(i/4)]+=weights[i];}}
   requireThat(sums.every(s=>Math.abs(s-1)<.001),`Mesh ${node.name} has unnormalized skin weights.`);
  }
 }
 requireThat(vertices<=300000&&triangles<=500000,'Prototype exceeds the bounded 300k vertex / 500k triangle art budget.');
 const animation=(json.animations||[]).map((clip,i)=>{requireThat(clip.channels?.length,`Animation ${i} has no channels.`);let duration=0;for(const channel of clip.channels){const sampler=clip.samplers[channel.sampler];requireThat(sampler&&nodes[channel.target.node],`Animation ${clip.name} has an invalid sampler/target.`);requireThat(['translation','rotation','scale','weights'].includes(channel.target.path),`Animation ${clip.name} has an invalid target path.`);const input=json.accessors[sampler.input],output=json.accessors[sampler.output],times=values(sampler.input);requireThat(input.type==='SCALAR'&&input.componentType===5126&&times.every((t,i)=>t>=0&&(!i||t>times[i-1])),`Animation ${clip.name} has invalid sample times.`);const multiplier=sampler.interpolation==='CUBICSPLINE'?3:1;requireThat(channel.target.path!=='weights'&&output.count===input.count*multiplier,`Animation ${clip.name} has an unsupported/mismatched output count.`);requireThat(output.type===(channel.target.path==='rotation'?'VEC4':'VEC3'),`Animation ${clip.name} has wrong output dimensions.`);duration=Math.max(duration,times.at(-1));}requireThat(duration>0,`Animation ${clip.name} has zero duration.`);return{name:clip.name||`Clip ${i+1}`,duration,channels:clip.channels.length};});
 requireThat(animation.length>=2&&animation.some(a=>/breath|idle/i.test(a.name))&&animation.some(a=>/walk/i.test(a.name)),'Expected imported breathing/idle and walk studies.');return{meshes:meshes.length,skinnedMeshes:meshNodes.length,primitives,vertices,triangles,skinJoints:skins.map(s=>s.joints.length),materials:json.materials?.length||0,textures:json.textures?.length||0,images:textureInfo.images,texturedPrimitives,uvVertices,materialTextureSlots:textureInfo.materialTextures,accessors:json.accessors.length,animations:animation};
}
async function validateDeformation(bytes,expected){
 // GLTFLoader's fetch progress path expects this browser event in some Node versions.
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class ProgressEvent{constructor(type,init={}){this.type=type;Object.assign(this,init);}};
 // Node has no browser raster decoder. Only substitute the image loading stage;
 // GLTFLoader still constructs real geometry/materials/skins/animation clips.
 const imageLoading={mode:expected.images.length?'node-placeholder':'not-needed',rasterDecodeValidated:false,loadedImageSources:[]};
 const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async sourceIndex=>{requireThat(expected.images[sourceIndex],`Loader requested unexpected image ${sourceIndex}.`);imageLoading.loadedImageSources.push(sourceIndex);return new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);};return{name:'ROOK_NODE_IMAGE_PLACEHOLDER'};});
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),scene=gltf.scene,mixer=new T.AnimationMixer(scene);
 const bounds=()=>{scene.updateMatrixWorld(true);scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});const b=new T.Box3().setFromObject(scene),size=b.getSize(new T.Vector3());requireThat(!b.isEmpty()&&[...b.min,...b.max,...size].every(Number.isFinite)&&size.y>0,'Three.js produced empty or non-finite deformed bounds.');return{min:b.min.toArray(),max:b.max.toArray(),size:size.toArray()};};
 try{
  let skinned=0,rigid=0,texturedMeshes=0;scene.traverse(o=>{if(o.isSkinnedMesh)skinned++;else if(o.isMesh)rigid++;if(o.isMesh&&[].concat(o.material||[]).some(m=>Object.values(m).some(v=>v?.isTexture)))texturedMeshes++;});requireThat(texturedMeshes===expected.texturedPrimitives,`Real GLTFLoader produced ${texturedMeshes} textured meshes, expected ${expected.texturedPrimitives}.`);requireThat(skinned===expected.primitives&&rigid===0,`Real GLTFLoader produced ${skinned} skinned and ${rigid} rigid meshes.`);const slotNames={baseColorTexture:['map'],metallicRoughnessTexture:['metalnessMap','roughnessMap'],normalTexture:['normalMap'],occlusionTexture:['aoMap'],emissiveTexture:['emissiveMap']};scene.traverse(o=>{if(!o.isMesh)return;for(const material of [].concat(o.material||[])){const index=gltf.parser.associations.get(material)?.materials;for(const ref of expected.materialTextureSlots[index]||[]){requireThat(slotNames[ref.slot],`Add loader-slot validation for material texture ${ref.slot}.`);for(const key of slotNames[ref.slot])requireThat(material[key]?.isTexture,`Real GLTFLoader dropped ${ref.slot} from material ${index}.`);}}});const bind=bounds();requireThat(bind.size[1]>1&&bind.size[1]<2.5,`Authored height ${bind.size[1]}m is outside expected human scale.`);
  const sampledVertices=()=>{const result=[];scene.traverse(o=>{if(o.isSkinnedMesh){for(let i=0,n=o.geometry.attributes.position.count;i<n;i+=Math.max(1,Math.floor(n/64))){const p=new T.Vector3();o.getVertexPosition(i,p);result.push(p);}}});return result;};
  const animations=[];for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).reset().play();const samples=[];let originalVertices,maxVertexDisplacement=0;for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875,1]){mixer.setTime(clip.duration*fraction);const sample=bounds(),vertices=sampledVertices();if(!originalVertices)originalVertices=vertices;else for(let i=0;i<vertices.length;i++)maxVertexDisplacement=Math.max(maxVertexDisplacement,vertices[i].distanceTo(originalVertices[i]));requireThat(sample.size.every((v,i)=>v<Math.max(1,bind.size[i])*3),`Animation ${clip.name} has exploding deformed bounds.`);requireThat(sample.min.every(v=>Math.abs(v)<10)&&sample.max.every(v=>Math.abs(v)<10),`Animation ${clip.name} has escaped the origin.`);samples.push({fraction,...sample});}requireThat(maxVertexDisplacement>1e-6,`Animation ${clip.name} does not deform sampled skinned vertices.`);animations.push({name:clip.name,duration:clip.duration,maxVertexDisplacement,samples});}return{bind,animations,texturedMeshes,imageLoading};
 }finally{mixer.stopAllAction();mixer.uncacheRoot(scene);const geo=new Set(),mat=new Set(),tex=new Set(),bones=new Set();scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);if(o.skeleton)bones.add(o.skeleton);for(const m of [].concat(o.material||[])){mat.add(m);for(const t of Object.values(m))if(t?.isTexture)tex.add(t);}});for(const g of geo)g.dispose();for(const m of mat)m.dispose();for(const t of tex)t.dispose();for(const s of bones)s.dispose();}
}
export function validateRookStructure(bytes){const {json,bin}=decodeGLB(bytes);return validateStructure(json,bin);}
export async function validateRook(path=defaultModel){const bytes=await readFile(path),structure=validateRookStructure(bytes),deformation=await validateDeformation(bytes,structure);return{ok:true,file:relative(root,path),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...structure,deformation};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{requireThat(process.argv.length<=3,'Usage: node scripts/art/validate-rook.mjs [model.glb]');console.log(JSON.stringify(await validateRook(process.argv[2]?resolve(process.argv[2]):defaultModel),null,2));}
 catch(error){console.error(JSON.stringify({ok:false,error:error.message},null,2));process.exitCode=1;}
}
