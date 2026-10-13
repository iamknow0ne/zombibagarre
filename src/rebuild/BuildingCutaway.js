import * as T from 'three';

// View-space aperture: it follows the real camera, also while zooming/driving.
// Only surfaces in front of the hero are removed; no building-wide opacity or
// height clipping. A spatial feather opens gradually as a wall crosses the rim.
export function applyCutaway(material,uniforms){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
 material.cutawayUniforms=uniforms;
 material.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 cutawayView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ncutawayView=mvPosition.xyz;');
  shader.fragmentShader='varying vec3 cutawayView;\nuniform vec3 cutawayHero;\nuniform float cutawayRadius;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   vec2 delta=(cutawayView.xy-cutawayHero.xy)/vec2(1.,1.12);
   float distanceToHero=length(delta);
   if(cutawayRadius>0.&&distanceToHero<cutawayRadius&&cutawayView.z>cutawayHero.z+.15){
   float aperture=1.-smoothstep(max(0.,cutawayRadius-.45),cutawayRadius,distanceToHero);
   // Keep the hero's depth plane and everything behind it completely intact.
   aperture*=smoothstep(.15,.65,cutawayView.z-cutawayHero.z);
   vec2 grain=floor(cutawayView.xy*70.);
   float threshold=fract(sin(dot(grain,vec2(12.9898,78.233)))*43758.5453);
   if(aperture>threshold)discard;
   }
  `);
 };
 material.customProgramCacheKey=()=>`${key}/hero-aperture-v1`;
 material.needsUpdate=true;
}

export class BuildingCutaway{
 constructor(){this.uniforms={cutawayHero:{value:new T.Vector3()},cutawayRadius:{value:0}};this.materials=new Map();}
 bind(root){root.traverse(m=>{if(!m.isMesh)return;
  const convert=source=>{if(source.cutawayUniforms===this.uniforms)return source;
   let result=this.materials.get(source);if(!result){result=source.clone();result.onBeforeCompile=source.onBeforeCompile;result.customProgramCacheKey=source.customProgramCacheKey.bind(source);result.userData.shared=true;applyCutaway(result,this.uniforms);this.materials.set(source,result);}return result;
  };
  m.material=Array.isArray(m.material)?m.material.map(convert):convert(m.material);
 });}
 update(player,camera,dt,enabled=true,reducedMotion=false){
  const hero=this.uniforms.cutawayHero.value;hero.copy(player.position);hero.y+=1;hero.applyMatrix4(camera.matrixWorldInverse);
  const radius=enabled?2.25:0,u=this.uniforms.cutawayRadius;
  u.value+= (radius-u.value)*(reducedMotion?1:1-Math.exp(-Math.max(0,dt)*14));
  if(Math.abs(u.value-radius)<.001)u.value=radius;
 }
 dispose(){for(const [source,m]of this.materials){m.dispose();if(!source.userData.shared){if(source.map&&!source.map.userData.shared)source.map.dispose();source.dispose();}}this.materials.clear();}
}

// SSAO's normal/depth pass must see the same aperture as the colour pass.
// Retain its single scene draw, using two normal materials instead of the
// pass-wide override (which otherwise paints a dark ghost over the opening).
export function installCutawayAO(ao,scene,cutaway){
 const normal=ao.normalMaterial.clone();applyCutaway(normal,cutaway.uniforms);
 ao.renderOverride=function(renderer,override,target,color,alpha){
  const clear=renderer.getClearColor(new T.Color()).clone(),clearAlpha=renderer.getClearAlpha(),auto=renderer.autoClear,oldOverride=scene.overrideMaterial,originals=[];
  try{
   scene.traverseVisible(o=>{if(!o.isMesh)return;originals.push([o,o.material]);const materials=Array.isArray(o.material)?o.material:[o.material];o.material=materials.some(m=>m.cutawayUniforms)?normal:override;});
   scene.overrideMaterial=null;renderer.setRenderTarget(target);renderer.autoClear=false;renderer.setClearColor(color);renderer.setClearAlpha(alpha);renderer.clear();renderer.render(scene,this.camera);
  }finally{for(const [o,m]of originals)o.material=m;scene.overrideMaterial=oldOverride;renderer.autoClear=auto;renderer.setClearColor(clear);renderer.setClearAlpha(clearAlpha);}
 };
 const dispose=ao.dispose.bind(ao);ao.dispose=()=>{normal.dispose();dispose();};
}
