import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import head from '../assets/characters/infected-head.json' with {type:'json'};

test('the shipped infected head is a bounded UV-preserving anatomical asset with pinned provenance',()=>{
 assert.equal(head.provenance.license,'CC0-1.0');
 assert.equal(head.provenance.revision,'a8bc2d54ff0ac92e78ff71431b1023eda42bf482');
 assert.match(head.provenance.baseSHA256,/^[a-f0-9]{64}$/);
 assert.ok(readFileSync(new URL('../assets/characters/infected-head.json',import.meta.url)).byteLength<80000);
 assert.equal(head.position.length,head.normal.length);assert.equal(head.uv.length,head.position.length/3*2);
 assert.ok(head.index.length/3>=700&&head.index.length/3<=1000);
 assert.ok([...head.position,...head.normal,...head.uv].every(Number.isFinite));
 assert.ok(head.index.every(i=>Number.isInteger(i)&&i>=0&&i<head.position.length/3));
 assert.ok(new Set(head.uv).size>150,'original UV seams and coordinates retained');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(head.position,3));g.setIndex(head.index);
 const mesh=new T.Mesh(g,new T.MeshBasicMaterial()),ray=new T.Raycaster();mesh.updateMatrixWorld(true);
 const front=(x,y)=>{ray.set(new T.Vector3(x,y,1),new T.Vector3(0,0,-1));return ray.intersectObject(mesh)[0]?.point.z;};
 assert.ok(front(0,-.04)>front(.06,-.04)+.025,'nose projects continuously from cheek surface');
 assert.ok(front(0,-.13)>.12,'chin remains part of the same mesh');
 g.computeBoundingBox();assert.ok(g.boundingBox.max.x>.15&&g.boundingBox.min.x<-.15,'ear silhouettes retained');
 mesh.material.dispose();g.dispose();
});

test('infected face atlas is the unchanged pinned CC0 source bitmap',()=>{
 const bytes=readFileSync(new URL('../assets/characters/infected-skin.png',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'862a26e335e958b70534cb5f0d7c47ef30ab148a56c42b3e9da969cf76f12963');
 assert.ok(bytes.byteLength<4_000_000);
});
