// Export and attachment regressions, not a likeness or visual acceptance gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditRookV6Garment} from './rook-v6-garment-audit.mjs';
import {validateRookStructure} from './validate-rook.mjs';
const baselineBytes=await readFile(new URL('../../assets/characters/rook-prototype-v5.glb',import.meta.url));
const candidateBytes=await readFile(new URL('../../assets/characters/rook-prototype-v6.glb',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function decode(bytes){const length=bytes.readUInt32LE(12);return{json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};}
const a=decode(baselineBytes),b=decode(candidateBytes);
function accessor(data,index){const x=data.json.accessors[index],view=data.json.bufferViews[x.bufferView],bytes={5121:1,5123:2,5125:4,5126:4}[x.componentType],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[x.type],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[x.componentType];const values=[];for(let i=0;i<x.count;i++)for(let k=0;k<width;k++)values.push(data.bin[read]((view.byteOffset||0)+(x.byteOffset||0)+i*(view.byteStride||bytes*width)+k*bytes));return values;}
const sameNumbers=(x,y)=>{assert.equal(x.length,y.length);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i]-y[i])<1e-6,`Value ${i} changed: ${x[i]} versus ${y[i]}.`);};

test('v5 remains byte-identical and reconstructed v6 garments reduce the triangle budget',()=>{
 assert.equal(hash(baselineBytes),'abf92e6a9e25b3667e00eb01ad2e279dc2f51429c4786c1e92596a75d4c7b575');
 const original=validateRookStructure(baselineBytes),candidate=validateRookStructure(candidateBytes);assert.ok(candidate.triangles<original.triangles);assert.equal(candidate.meshes,10);assert.equal(candidate.materials,10);assert.ok(candidateBytes.length<baselineBytes.length);
});
test('rig, inverse bind matrices and retained non-garment weights are unchanged',()=>{
 assert.equal(a.json.skins.length,b.json.skins.length);
 for(let i=0;i<a.json.skins.length;i++){const x=a.json.skins[i],y=b.json.skins[i];assert.equal(x.joints.length,y.joints.length);for(let j=0;j<x.joints.length;j++){const left=a.json.nodes[x.joints[j]],right=b.json.nodes[y.joints[j]];assert.equal(left.name,right.name);for(const key of ['translation','rotation','scale','matrix'])sameNumbers(left[key]||[],right[key]||[]);}sameNumbers(accessor(a,x.inverseBindMatrices),accessor(b,y.inverseBindMatrices));}
 const primitives=data=>new Map(data.json.meshes.flatMap(m=>m.primitives.map(p=>[data.json.materials[p.material].name,p])));const pa=primitives(a),pb=primitives(b);
 for(const [name,x]of pa){if(['Field jacket / moss canvas','Canvas / seam thread'].includes(name))continue;const y=pb.get(name);for(const key of ['JOINTS_0','WEIGHTS_0'])sameNumbers(accessor(a,x.attributes[key]),accessor(b,y.attributes[key]));}
});
test('existing exported animation channels and sampled keys are retained',()=>{
 assert.equal(a.json.animations.length,b.json.animations.length);
 for(let i=0;i<a.json.animations.length;i++){const x=a.json.animations[i],y=b.json.animations[i];assert.equal(x.name,y.name);assert.equal(x.channels.length,y.channels.length);for(let j=0;j<x.channels.length;j++){const p=x.channels[j],q=y.channels[j];assert.equal(p.target.path,q.target.path);assert.equal(a.json.nodes[p.target.node].name,b.json.nodes[q.target.node].name);for(const key of ['input','output'])sameNumbers(accessor(a,x.samplers[p.sampler][key]),accessor(b,y.samplers[q.sampler][key]));}}
});

test('all v6 textures and portable material factors are reused from v5',()=>{
 const byName=new Map(a.json.materials.map(m=>[m.name,m]));for(const m of b.json.materials)assert.deepEqual(m.pbrMetallicRoughness.baseColorFactor,byName.get(m.name).pbrMetallicRoughness.baseColorFactor);
 const imageHashes=data=>data.json.images.map(image=>{const v=data.json.bufferViews[image.bufferView];return hash(data.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));});const originals=new Set(imageHashes(a));assert.ok(imageHashes(b).every(h=>originals.has(h)));
});
test('new garment surfaces follow original coat support through actual v6 combat and independent shoulder raises',async()=>{
 const report=await auditRookV6Garment();assert.equal(report.vertices,2492);assert.equal(report.frames,120);assert.ok(report.raisedWristHeights.every(y=>y>1.5));for(const p of report.outerNormals){assert.ok(p.meanOutwardDot>.5,`${p.part}: inverted outer normals`);assert.ok(p.minOutwardDot>-.05,`${p.part}: inverted outer edge`);}assert.ok(report.maxDrift<.008);assert.ok(report.meanDrift<.0004);
 for(const part of report.parts){if(/pocket body/.test(part.part))assert.ok(part.maxDrift<.0015);if(/collar|flap/.test(part.part))assert.ok(part.maxDrift<.004);if(/overlap/.test(part.part))assert.ok(part.maxDrift<.0006);}
 const regressed=await auditRookV6Garment({rigidSeams:true});assert.ok(regressed.maxDrift>.03,'Replacing seam weights with the old rigid spine attachment must be detected.');
});
