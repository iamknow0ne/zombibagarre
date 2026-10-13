import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BuildingCutaway,installCutawayAO} from '../src/rebuild/BuildingCutaway.js';
import {CityArt} from '../src/rebuild/CityArt.js';

test('building aperture follows the camera and interpolates consistently without changing shadows or depth',()=>{
 const camera=new T.OrthographicCamera(-20,20,15,-15,.1,160);camera.position.set(26,35,32);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const player=new T.Object3D();player.position.set(3,2,-5);const a=new BuildingCutaway(),b=new BuildingCutaway();
 for(let i=0;i<30;i++)a.update(player,camera,1/60);for(let i=0;i<15;i++)b.update(player,camera,1/30);
 assert.ok(Math.abs(a.uniforms.cutawayRadius.value-b.uniforms.cutawayRadius.value)<1e-8);
 const expected=new T.Vector3(3,3,-5).applyMatrix4(camera.matrixWorldInverse);assert.ok(expected.distanceTo(a.uniforms.cutawayHero.value)<1e-8);
 a.update(player,camera,0,false,true);assert.equal(a.uniforms.cutawayRadius.value,0);
 const source=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),source);mesh.castShadow=true;
 a.bind(mesh);const material=mesh.material;a.bind(mesh);assert.equal(mesh.material,material);assert.equal(a.materials.size,1);assert.equal(source.cutawayUniforms,undefined);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.opacity,1);assert.equal(mesh.castShadow,true);
 let disposed=0;material.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,1);assert.equal(a.materials.size,0);
});

test('pixel and classic texture changes preserve the aperture on rebuilt building materials',()=>{
 const cutaway=new BuildingCutaway(),source=new T.MeshStandardMaterial();source.userData={surfaceKind:'brick',surfaceColor:0x123456};const scene=new T.Scene(),mesh=new T.Mesh(new T.BoxGeometry(),source);scene.add(mesh);cutaway.bind(mesh);
 const art=Object.create(CityArt.prototype);art.world={scene,surfaces:{materials:new Map([['wall',source]]),textures:()=>({albedo:new T.Texture()})}};art.atlas=new T.Texture();
 for(const style of ['pixel','classic','pixel']){art.style=style;art.applyMaterials();const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>\n#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.cutawayHero,cutaway.uniforms.cutawayHero);assert.equal(shader.fragmentShader.includes('fract(vMapUv'),style==='pixel');assert.equal(shader.fragmentShader.match(/uniform float cutawayRadius/g).length,1);assert.ok(shader.fragmentShader.includes('cutawayView.z-cutawayHero.z'));assert.ok(shader.fragmentShader.includes('discard'));}
});

test('ambient occlusion uses the same aperture and restores materials even if rendering fails',()=>{
 const scene=new T.Scene(),cutaway=new BuildingCutaway(),wall=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),hero=wall.clone();scene.add(wall,hero);cutaway.bind(wall);const wallMat=wall.material,heroMat=hero.material;
 const ao={normalMaterial:new T.MeshNormalMaterial(),dispose(){},camera:new T.Camera()};installCutawayAO(ao,scene,cutaway);
 const renderer={autoClear:true,getClearColor:out=>out.set(0x123456),getClearAlpha:()=>.8,setRenderTarget(){},setClearColor(){},setClearAlpha(){},clear(){},render(){assert.equal(scene.overrideMaterial,null);assert.equal(wall.material.cutawayUniforms,cutaway.uniforms);assert.equal(hero.material,ao.normalMaterial);throw new Error('test context loss');}};
 assert.throws(()=>ao.renderOverride(renderer,ao.normalMaterial,{},0x7777ff,1),/test context loss/);assert.equal(wall.material,wallMat);assert.equal(hero.material,heroMat);assert.equal(renderer.autoClear,true);ao.dispose();
});
