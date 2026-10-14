import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {buildServicePlatform} from '../src/rebuild/PlatformVisuals.js';
test('service deck detail stays within the physics bounds with an exact landing surface',()=>{
 const root=new T.Group(),p={x:12,z:-8,y:2,w:3.6,d:2.8,h:1.1};
 const box=(parent,color,x,y,z,w,h,d,extra={})=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,...extra}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const sign=(parent,text,x,y,z,w,h)=>{const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial());mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 buildServicePlatform(root,p,{box,sign,surfaces:{apply:mesh=>mesh}});root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
 const within=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);within(bounds.min.x,p.x-p.w/2);within(bounds.max.x,p.x+p.w/2);within(bounds.min.z,p.z-p.d/2);within(bounds.max.z,p.z+p.d/2);within(bounds.min.y,p.y);within(bounds.max.y,p.y+p.h);
 assert.ok(root.children.length>30);assert.ok(root.children.some(m=>m.material.polygonOffset));
});
