import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {readGLB} from './pack-rook-runtime.mjs';
const root=new URL('../../',import.meta.url),names=['saint','torque','vesper'];
function load(name){const bytes=fs.readFileSync(new URL(`assets/characters/${name}-v1.glb`,root));return{...readGLB(bytes),bytes};}
function acc(a,i){const x=a.json.accessors[i],v=a.json.bufferViews[x.bufferView];const sizes={5121:1,5123:2,5125:4,5126:4},width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[x.type],size=sizes[x.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[x.componentType];return Array.from({length:x.count},(_,j)=>Array.from({length:width},(_,k)=>a.bin[read]((v.byteOffset||0)+(x.byteOffset||0)+j*(v.byteStride||size*width)+k*size)));}
for(const name of names){test(`${name}: shared named skeleton, separate headwear, skinned full and distance geometry`,()=>{
 const a=load(name);assert.ok(a.bytes.length<18_000_000);const skins=a.json.skins;assert.ok(skins.length);for(const skin of skins){assert.equal(skin.joints.length,163);const bones=skin.joints.map(i=>a.json.nodes[i].name);for(const expected of ['head','root','upperarm01.L','wrist.R'])assert.ok(bones.includes(expected));}
 const nodes=a.json.nodes.filter(n=>n.mesh!==undefined),high=nodes.filter(n=>n.name.startsWith('LOD0 /')),low=nodes.filter(n=>n.name.startsWith('LOD1 /'));assert.equal(high.length,low.length);assert.ok(high.length<=13);assert.ok(high.some(n=>n.name.includes('Headwear /')));assert.ok(high.some(n=>n.name.includes('Hair /')));
 let ht=0,lt=0;
 for(const n of nodes){assert.notEqual(n.skin,undefined);assert.equal(n.extras.castLOD,n.name.startsWith('LOD1')?1:0);const other=nodes.find(o=>o.name===n.name.replace('LOD0','LOD1'));if(n.name.startsWith('LOD0'))assert.ok(other);for(const p of a.json.meshes[n.mesh].primitives){assert.ok(p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined);for(const values of acc(a,p.attributes.WEIGHTS_0))assert.ok(Math.abs(values.reduce((x,y)=>x+y,0)-1)<1e-4);const count=a.json.accessors[p.indices].count/3;if(n.name.startsWith('LOD0'))ht+=count;else lt+=count;}}
 assert.ok(lt<ht*.55,`${lt}/${ht} triangles`);assert.ok(ht<60000);assert.ok(a.json.materials.some(m=>m.name.startsWith('Skin /')));console.log(name,{bytes:a.bytes.length,highTriangles:ht,lowTriangles:lt,draws:high.length,images:a.json.images.length});
});}
test('all three adult identities have different body morphology and source hashes',()=>{const shapes=names.map(name=>{const a=load(name);const n=a.json.nodes.find(n=>n.name.startsWith('LOD0 / Skin /'));const p=a.json.meshes[n.mesh].primitives[0];return createHash('sha256').update(JSON.stringify(acc(a,p.attributes.POSITION))).digest('hex');});assert.equal(new Set(shapes).size,3);const manifest=JSON.parse(fs.readFileSync(new URL('assets/source/cast/morphs/manifest.json',root)));assert.equal(manifest.license,'CC0-1.0');for(const f of manifest.files){assert.equal(createHash('sha256').update(fs.readFileSync(new URL('assets/source/cast/morphs/'+f.path,root))).digest('hex'),f.sha256);}});

test('embedded texture payloads are unchanged reviewed originals, shared across LOD levels',()=>{
 const files=['assets/source/rook/system-assets/eyes/materials/brownlight_eye.png','assets/source/rook/system-assets/skins/young_caucasian_male/young_lightskinned_male_diffuse.png','assets/source/rook/textures/v3/rook-wool-normal-v3.png','assets/source/rook/textures/v3/rook-leather-albedo-v3.png','assets/source/rook/textures/v3/rook-trousers-albedo-v3.png'];
 const hash=b=>createHash('sha256').update(b).digest('hex');const originals=new Set(files.map(p=>hash(fs.readFileSync(new URL(p,root)))));
 for(const name of names){const a=load(name);assert.equal(a.json.images.length,5);for(const im of a.json.images){const v=a.json.bufferViews[im.bufferView];assert.ok(originals.has(hash(a.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength))));}}
});
