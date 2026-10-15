import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readGLB,packRuntime} from './pack-rook-runtime.mjs';
const source=await readFile(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url));
const packed=packRuntime(source),a=readGLB(source),b=readGLB(packed);
const view=(glb,index)=>{const v=glb.json.bufferViews[index];return glb.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);};
test('runtime packing preserves every geometry, skin, animation and texture payload byte',()=>{
 assert.ok(packed.length<source.length-1_700_000);assert.equal(b.json.images.length,8);
 for(const key of ['nodes','meshes','skins','animations','materials','samplers','scenes','scene'])assert.deepEqual(b.json[key],a.json[key],key);
 assert.equal(a.json.accessors.length,b.json.accessors.length);
 a.json.accessors.forEach((original,i)=>{const mapped=b.json.accessors[i],{bufferView:av,...arest}=original,{bufferView:bv,...brest}=mapped;assert.deepEqual(arest,brest);if(av!==undefined)assert.deepEqual(view(a,av),view(b,bv));});
 a.json.textures.forEach((original,i)=>{const mapped=b.json.textures[i];assert.equal(original.sampler,mapped.sampler);assert.deepEqual(view(a,a.json.images[original.source].bufferView),view(b,b.json.images[mapped.source].bufferView));});
});
test('runtime packing is deterministic, aligned and idempotent',()=>{
 assert.deepEqual(packRuntime(source),packed);assert.deepEqual(packRuntime(packed),packed);
 for(const v of b.json.bufferViews){assert.equal(v.byteOffset%4,0);assert.ok(v.byteOffset+v.byteLength<=b.json.buffers[0].byteLength);}
});
