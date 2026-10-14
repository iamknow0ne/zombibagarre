import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BuildingCutaway,installCutawayAO} from '../src/rebuild/BuildingCutaway.js';
import {CityArt} from '../src/rebuild/CityArt.js';

test('building aperture follows the camera and interpolates consistently without changing shadows or depth',()=>{
 const camera=new T.OrthographicCamera(-20,20,15,-15,.1,160);camera.position.set(26,35,32);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const player=new T.Object3D();player.position.set(3,2,-5);const a=new BuildingCutaway(),b=new BuildingCutaway();
 a.update(player,camera,0,false,true);b.update(player,camera,0,false,true);
 for(let i=0;i<30;i++)a.update(player,camera,1/60);for(let i=0;i<15;i++)b.update(player,camera,1/30);
 assert.ok(Math.abs(a.uniforms.cutawayRadius.value-b.uniforms.cutawayRadius.value)<1e-8);
 const expected=new T.Vector3(3,3,-5).applyMatrix4(camera.matrixWorldInverse);assert.ok(expected.distanceTo(a.uniforms.cutawayHero.value)<1e-8);
 a.update(player,camera,0,false,true);assert.equal(a.uniforms.cutawayRadius.value,0);
 const source=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),source);mesh.castShadow=true;
 a.bind(mesh);const material=mesh.material;a.bind(mesh);assert.equal(mesh.material,material);assert.equal(a.materials.size,1);assert.equal(source.cutawayUniforms,undefined);assert.equal(material.alphaToCoverage,true);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.opacity,1);assert.equal(mesh.castShadow,true);
 let disposed=0;material.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,1);assert.equal(a.materials.size,0);
});

test('pixel and classic texture changes preserve the aperture on rebuilt building materials',()=>{
 const cutaway=new BuildingCutaway(),source=new T.MeshStandardMaterial();source.userData={surfaceKind:'brick',surfaceColor:0x123456};const scene=new T.Scene(),mesh=new T.Mesh(new T.BoxGeometry(),source);scene.add(mesh);cutaway.bind(mesh);
 const art=Object.create(CityArt.prototype);art.world={scene,surfaces:{materials:new Map([['wall',source]]),textures:()=>({albedo:new T.Texture()})}};art.atlas=new T.Texture();
 for(const style of ['pixel','classic','pixel']){art.style=style;art.applyMaterials();const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>\n#include <clipping_planes_fragment>'};mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.cutawayHero,cutaway.uniforms.cutawayHero);assert.equal(shader.fragmentShader.includes('fract(vMapUv'),style==='pixel');assert.equal(shader.fragmentShader.match(/uniform float cutawayRadius/g).length,1);assert.ok(shader.fragmentShader.includes('cutawayView.z-body.z'));assert.ok(shader.fragmentShader.includes('discard'));}
});

test('ambient occlusion uses the same aperture and restores materials even if rendering fails',()=>{
 const scene=new T.Scene(),cutaway=new BuildingCutaway(),wall=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),hero=wall.clone();scene.add(wall,hero);cutaway.bind(wall);const wallMat=wall.material,heroMat=hero.material;
 const ao={normalMaterial:new T.MeshNormalMaterial(),dispose(){},camera:new T.Camera()};installCutawayAO(ao,scene,cutaway);
 const renderer={autoClear:true,getClearColor:out=>out.set(0x123456),getClearAlpha:()=>.8,setRenderTarget(){},setClearColor(){},setClearAlpha(){},clear(){},render(){assert.equal(scene.overrideMaterial,null);assert.equal(wall.material.cutawayUniforms,cutaway.uniforms);assert.equal(wall.material.alphaToCoverage,false);assert.equal(hero.material,ao.normalMaterial);throw new Error('test context loss');}};
 assert.throws(()=>ao.renderOverride(renderer,ao.normalMaterial,{},0x7777ff,1),/test context loss/);assert.equal(wall.material,wallMat);assert.equal(hero.material,heroMat);assert.equal(renderer.autoClear,true);ao.dispose();
});


test('aperture keeps rooftop support intact and tracks elevated bodies in rotated cameras',()=>{
 const camera=new T.OrthographicCamera(-20,20,15,-15,.1,160);camera.position.set(-26,35,32);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const player=new T.Object3D();player.position.set(3,10.5,-5);const cutaway=new BuildingCutaway();
 cutaway.update(player,camera,0);assert.equal(cutaway.uniforms.cutawayRadius.value,2.9);
 const hero=cutaway.uniforms.cutawayHero.value,up=cutaway.uniforms.cutawayUp.value;
 for(const height of [0,.05,.2,1,1.85]){
  const point=player.position.clone().add(new T.Vector3(0,height,0)).applyMatrix4(camera.matrixWorldInverse);
  assert.ok(Math.abs(point.sub(hero).dot(up)+1-height)<1e-12);
 }
 // Screen grain is one logical pixel regardless of orthographic zoom/aspect.
 cutaway.setViewport(800,600,camera);assert.deepEqual(cutaway.uniforms.cutawayPixels.value.toArray(),[20,20]);
 camera.zoom=2;cutaway.setViewport(800,600,camera);assert.deepEqual(cutaway.uniforms.cutawayPixels.value.toArray(),[40,40]);
 // Turning the effect off fades instead of suddenly removing the entire facade.
 cutaway.update(player,camera,1/60,false);assert.ok(cutaway.uniforms.cutawayRadius.value<2.9&&cutaway.uniforms.cutawayRadius.value>0);
 for(let i=0;i<90;i++)cutaway.update(player,camera,1/60,false);assert.equal(cutaway.uniforms.cutawayRadius.value,0);
});


test('anchor labels leave the survivor clear and stay on a narrow screen',async()=>{
 const {placeAnchorLabel}=await import('../src/rebuild/TraversalLabels.js');
 for(const width of [320,390,1280]){
  const hero={x:width/2,y:380};
  for(const y of [355,380,440])assert.equal(placeAnchorLabel({x:hero.x,y},hero,width).y,350);
  const left=placeAnchorLabel({x:-20,y:200},hero,width);assert.ok(left.x>=140&&left.x<=width-140);assert.equal(left.y,200);
  const clear=placeAnchorLabel({x:hero.x,y:230},hero,width);assert.equal(clear.y,230);
 }
});

test('AO scratch survives nested passes, material arrays, removals and a failed render',()=>{
 const scene=new T.Scene(),cutaway=new BuildingCutaway(),geometry=new T.BoxGeometry();
 const plain=new T.MeshStandardMaterial(),facade=new T.MeshStandardMaterial();cutaway.bind(new T.Mesh(geometry,facade));
 const aperture=cutaway.materials.get(facade),mixed=[plain,aperture];
 const wall=new T.Mesh(geometry,mixed),hero=new T.Mesh(geometry,plain),hidden=new T.Mesh(geometry,plain);hidden.visible=false;scene.add(wall,hero,hidden);
 const originalOverride=new T.MeshBasicMaterial();scene.overrideMaterial=originalOverride;
 const ao={normalMaterial:new T.MeshNormalMaterial(),dispose(){},camera:new T.Camera()};installCutawayAO(ao,scene,cutaway);
 let color=new T.Color(0x123456),alpha=.8,nested=false,fail=false,renders=0;
 const renderer={autoClear:true,getClearColor:out=>out.copy(color),getClearAlpha:()=>alpha,setRenderTarget(){},setClearColor:value=>color.set(value),setClearAlpha:value=>{alpha=value;},clear(){},render(){
  renders++;assert.equal(scene.overrideMaterial,null);assert.equal(hero.material,hero.parent?ao.normalMaterial:plain);assert.equal(hidden.material,plain);
  if(!nested){
   const outerMaterial=wall.material;assert.equal(outerMaterial.cutawayUniforms,cutaway.uniforms);
   nested=true;ao.renderOverride(renderer,ao.normalMaterial,{},0xff0000,.2);nested=false;
   assert.equal(wall.material,outerMaterial,'nested pass restores outer aperture material');assert.equal(color.getHex(),0x00ff00);assert.equal(alpha,.5);
   if(fail)throw new Error('interrupted draw');
  }
 }};
 for(let frame=0;frame<40;frame++){
  // Repeated changing scene size must not restore removed meshes from old slots.
  if(frame===10)hero.removeFromParent();if(frame===20)scene.add(hero);
  fail=frame===25;
  const draw=()=>ao.renderOverride(renderer,ao.normalMaterial,{},0x00ff00,.5);
  if(fail)assert.throws(draw,/interrupted draw/);else draw();
  assert.equal(wall.material,mixed,'original material array identity survives');assert.equal(hero.material,plain);assert.equal(hidden.material,plain);
  assert.equal(scene.overrideMaterial,originalOverride);assert.equal(renderer.autoClear,true);assert.equal(color.getHex(),0x123456);assert.equal(alpha,.8);
 }
 assert.equal(renders,80);ao.dispose();cutaway.dispose();geometry.dispose();plain.dispose();originalOverride.dispose();ao.normalMaterial.dispose();
});
