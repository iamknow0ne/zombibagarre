// V5 is a bounded art candidate. These are export/preservation checks, not a
// test that can decide portrait likeness or approve the rendered art direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateRookStructure} from './validate-rook.mjs';
const v4=await readFile(new URL('../../assets/characters/rook-prototype-v4.glb',import.meta.url));
const v5=await readFile(new URL('../../assets/characters/rook-prototype-v5.glb',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function decode(bytes){const length=bytes.readUInt32LE(12);return{json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};}
const a=decode(v4),b=decode(v5);
function accessor(data,index){const x=data.json.accessors[index],view=data.json.bufferViews[x.bufferView],bytes={5121:1,5123:2,5125:4,5126:4}[x.componentType],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[x.type],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[x.componentType];const values=[];for(let i=0;i<x.count;i++)for(let k=0;k<width;k++)values.push(data.bin[read]((view.byteOffset||0)+(x.byteOffset||0)+i*(view.byteStride||bytes*width)+k*bytes));return values;}
const sameNumbers=(x,y)=>{assert.equal(x.length,y.length);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i]-y[i])<1e-6,`Value ${i} changed: ${x[i]} versus ${y[i]}.`);};
test('v4 remains byte-identical and v5 keeps its bounded topology',()=>{
 assert.equal(hash(v4),'8c704e461e9fa8591bc2e7ff25a3ce8916f6959df88a09ff416f4419fd8e53ef');
 const original=validateRookStructure(v4),candidate=validateRookStructure(v5);assert.equal(candidate.vertices,original.vertices);assert.equal(candidate.triangles,original.triangles);assert.equal(candidate.meshes,10);assert.equal(candidate.materials,10);assert.ok(v5.length<v4.length);
});
test('all rest bones, inverse bind matrices and existing vertex skin weights are preserved',()=>{
 assert.equal(a.json.skins.length,b.json.skins.length);
 for(let i=0;i<a.json.skins.length;i++){const x=a.json.skins[i],y=b.json.skins[i];assert.equal(x.joints.length,y.joints.length);for(let j=0;j<x.joints.length;j++){const left=a.json.nodes[x.joints[j]],right=b.json.nodes[y.joints[j]];assert.equal(left.name,right.name);for(const key of ['translation','rotation','scale','matrix'])sameNumbers(left[key]||[],right[key]||[]);}sameNumbers(accessor(a,x.inverseBindMatrices),accessor(b,y.inverseBindMatrices));}
 for(let i=0;i<a.json.meshes.length;i++){const x=a.json.meshes[i],y=b.json.meshes[i];assert.equal(x.primitives.length,y.primitives.length);for(let j=0;j<x.primitives.length;j++)for(const key of ['JOINTS_0','WEIGHTS_0'])sameNumbers(accessor(a,x.primitives[j].attributes[key]),accessor(b,y.primitives[j].attributes[key]));}
});
test('existing exported animation channels and sampled keys are retained',()=>{
 assert.equal(a.json.animations.length,b.json.animations.length);
 for(let i=0;i<a.json.animations.length;i++){const x=a.json.animations[i],y=b.json.animations[i];assert.equal(x.name,y.name);assert.equal(x.channels.length,y.channels.length);for(let j=0;j<x.channels.length;j++){const p=x.channels[j],q=y.channels[j];assert.equal(p.target.path,q.target.path);assert.equal(a.json.nodes[p.target.node].name,b.json.nodes[q.target.node].name);for(const key of ['input','output'])sameNumbers(accessor(a,x.samplers[p.sampler][key]),accessor(b,y.samplers[q.sampler][key]));}}
});
test('portable PBR factors preserve the intended material tint and only existing raster images are reused',()=>{
 const byName=new Map(b.json.materials.map(m=>[m.name,m]));
 assert.deepEqual(byName.get('Field jacket / moss canvas').pbrMetallicRoughness.baseColorFactor,[.4,.37,.27,1]);assert.deepEqual(byName.get('Skin / warm matte').pbrMetallicRoughness.baseColorFactor,[.83,.72,.62,1]);
 for(const name of ['Scarf / rust wool','Leather / dark chestnut','Trousers / charcoal olive'])assert.equal(byName.get(name).pbrMetallicRoughness.baseColorTexture,undefined,'Remove visible checker-like albedo, retaining portable roughness/normal maps.');
 const imageHashes=data=>data.json.images.map(image=>{const v=data.json.bufferViews[image.bufferView];return hash(data.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));});const originals=new Set(imageHashes(a));assert.ok(imageHashes(b).every(h=>originals.has(h)),'V5 must reuse previously licensed/generated image data.');
});
