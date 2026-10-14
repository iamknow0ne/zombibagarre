// Export and attachment regressions, not a likeness or visual acceptance gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditRookV7Sling} from './rook-v7-sling-audit.mjs';
import {validateRookStructure} from './validate-rook.mjs';
const baselineBytes=await readFile(new URL('../../assets/characters/rook-prototype-v6.glb',import.meta.url));
const candidateBytes=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function decode(bytes){const length=bytes.readUInt32LE(12);return{json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};}
const a=decode(baselineBytes),b=decode(candidateBytes);
function accessor(data,index){const x=data.json.accessors[index],view=data.json.bufferViews[x.bufferView],bytes={5121:1,5123:2,5125:4,5126:4}[x.componentType],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[x.type],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[x.componentType];const values=[];for(let i=0;i<x.count;i++)for(let k=0;k<width;k++)values.push(data.bin[read]((view.byteOffset||0)+(x.byteOffset||0)+i*(view.byteStride||bytes*width)+k*bytes));return values;}
const sameNumbers=(x,y)=>{assert.equal(x.length,y.length);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i]-y[i])<1e-6,`Value ${i} changed: ${x[i]} versus ${y[i]}.`);};

test('v6 remains byte-identical and v7 sling stays within a 15 percent geometry increment',()=>{
 assert.equal(hash(baselineBytes),'9dbab4210b52f36f0d20e37ee13d318160dda42e910ce473b0bbfe17789792e8');
 const original=validateRookStructure(baselineBytes),candidate=validateRookStructure(candidateBytes);assert.ok(candidate.triangles<original.triangles*1.15);assert.equal(candidate.meshes,10);assert.equal(candidate.materials,10);assert.ok(candidateBytes.length<baselineBytes.length*1.1);
});
test('rig, inverse bind matrices and retained body and garment attributes are unchanged',()=>{
 assert.equal(a.json.skins.length,b.json.skins.length);
 for(let i=0;i<a.json.skins.length;i++){const x=a.json.skins[i],y=b.json.skins[i];assert.equal(x.joints.length,y.joints.length);for(let j=0;j<x.joints.length;j++){const left=a.json.nodes[x.joints[j]],right=b.json.nodes[y.joints[j]];assert.equal(left.name,right.name);for(const key of ['translation','rotation','scale','matrix'])sameNumbers(left[key]||[],right[key]||[]);}sameNumbers(accessor(a,x.inverseBindMatrices),accessor(b,y.inverseBindMatrices));}
 const primitives=data=>new Map(data.json.meshes.flatMap(m=>m.primitives.map(p=>[data.json.materials[p.material].name,p])));const pa=primitives(a),pb=primitives(b);
 for(const [name,x]of pa){if(['Leather / dark chestnut','Hardware / aged brass','Canvas / seam thread'].includes(name))continue;const y=pb.get(name);for(const key of ['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']){if(x.attributes[key]===undefined)assert.equal(y.attributes[key],undefined);else sameNumbers(accessor(a,x.attributes[key]),accessor(b,y.attributes[key]));}}
});
test('existing exported animation channels and sampled keys are retained',()=>{
 assert.equal(a.json.animations.length,b.json.animations.length);
 for(let i=0;i<a.json.animations.length;i++){const x=a.json.animations[i],y=b.json.animations[i];assert.equal(x.name,y.name);assert.equal(x.channels.length,y.channels.length);for(let j=0;j<x.channels.length;j++){const p=x.channels[j],q=y.channels[j];assert.equal(p.target.path,q.target.path);assert.equal(a.json.nodes[p.target.node].name,b.json.nodes[q.target.node].name);for(const key of ['input','output'])sameNumbers(accessor(a,x.samplers[p.sampler][key]),accessor(b,y.samplers[q.sampler][key]));}}
});

test('all v7 textures and portable material factors are reused from v6',()=>{
 const byName=new Map(a.json.materials.map(m=>[m.name,m]));for(const m of b.json.materials)assert.deepEqual(m.pbrMetallicRoughness.baseColorFactor,byName.get(m.name).pbrMetallicRoughness.baseColorFactor);
 const imageHashes=data=>data.json.images.map(image=>{const v=data.json.bufferViews[image.bufferView];return hash(data.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength));});const originals=new Set(imageHashes(a));assert.ok(imageHashes(b).every(h=>originals.has(h)));
});
test('continuous sling follows original coat support through combat and independent shoulder raises',async()=>{
 const report=await auditRookV7Sling();assert.equal(report.frames,120);assert.ok(report.vertices>1500);assert.ok(report.raisedWristHeights.every(y=>y>1.5));assert.ok(report.maxDrift<.006,`Sling attachment drift ${report.maxDrift}`);assert.ok(report.meanDrift<.0003);
 const regressed=await auditRookV7Sling({rigidSeams:true});assert.ok(regressed.maxDrift>.03,'Rigid spine-only seams must fail attachment regression.');
});
