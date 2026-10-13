import * as T from 'three';

// View-space aperture: it follows the real camera, also while zooming/driving.
// A clear body-shaped core and broad transparency feather preserve the facade
// around the survivor. The support surface is never cut, including on rooftops.
export function applyCutaway(material,uniforms){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
 material.cutawayUniforms=uniforms;
 // The colour renderer already uses 4x MSAA, so sample coverage gives a clean
 // translucent feather without sorting whole buildings or drawing them twice.
 const coverage=!material.isMeshNormalMaterial;
 if(coverage&&!material.transparent)material.alphaToCoverage=true;
 material.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 cutawayView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ncutawayView=mvPosition.xyz;');
  shader.fragmentShader='varying vec3 cutawayView;\nuniform vec3 cutawayHero;\nuniform float cutawayRadius;\nuniform vec3 cutawayUp;\nuniform vec2 cutawayPixels;\nuniform float cutawayCoverage;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float cutawayOpacity=1.;
   // Project the feet-to-head segment into the view, instead of a small circle
   // around the chest. Include arms, weapons and the landing area in the core.
   vec3 feet=cutawayHero-cutawayUp*.8;
   vec3 head=cutawayHero+cutawayUp*.85;
   vec2 axis=head.xy-feet.xy;
   float along=clamp(dot(cutawayView.xy-feet.xy,axis)/max(dot(axis,axis),.0001),0.,1.);
   vec3 body=mix(feet,head,along);
   float distanceToHero=length(cutawayView.xy-body.xy);
   float heightAboveFeet=dot(cutawayView-cutawayHero,cutawayUp)+1.;
   if(cutawayRadius>0.&&distanceToHero<cutawayRadius&&heightAboveFeet>.12){
    float aperture=1.-smoothstep(cutawayRadius*.42,cutawayRadius,distanceToHero);
    // Only occluders in front of this part of the body. Preserve depth behind it.
    aperture*=smoothstep(.02,.22,cutawayView.z-body.z);
    aperture*=smoothstep(.12,.32,heightAboveFeet);
    // All facade layers share a screen-aligned pattern. Independent material
    // noise makes overlapping windows/walls opaque again. Use logical pixels so
    // the lower-resolution AO pass agrees with colour, even at high device DPR.
    vec2 grain=floor(cutawayView.xy*cutawayPixels);
    float threshold=fract(sin(dot(grain,vec2(12.9898,78.233)))*43758.5453);
    if(${coverage?'true':'false'}&&cutawayCoverage>.5){cutawayOpacity=1.-aperture;if(cutawayOpacity<.001)discard;}
    else if(aperture>threshold)discard;
   }
  `);
  if(coverage)shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.a*=cutawayOpacity;');
 };
 material.customProgramCacheKey=()=>`${key}/hero-aperture-v2`;
 material.needsUpdate=true;
}

export class BuildingCutaway{
 constructor(){this.uniforms={cutawayHero:{value:new T.Vector3()},cutawayRadius:{value:0},cutawayUp:{value:new T.Vector3(0,1,0)},cutawayPixels:{value:new T.Vector2(32,32)},cutawayCoverage:{value:1}};this.materials=new Map();}
 bind(root){root.traverse(m=>{if(!m.isMesh)return;
  const convert=source=>{if(source.cutawayUniforms===this.uniforms)return source;
   let result=this.materials.get(source);if(!result){result=source.clone();result.onBeforeCompile=source.onBeforeCompile;result.customProgramCacheKey=source.customProgramCacheKey.bind(source);result.userData.shared=true;applyCutaway(result,this.uniforms);this.materials.set(source,result);}return result;
  };
  m.material=Array.isArray(m.material)?m.material.map(convert):convert(m.material);
 });}
 setViewport(width,height,camera){
  if(camera.isOrthographicCamera)this.uniforms.cutawayPixels.value.set(width*camera.zoom/(camera.right-camera.left),height*camera.zoom/(camera.top-camera.bottom));
 }
 update(player,camera,dt,enabled=true,reducedMotion=false){
  const hero=this.uniforms.cutawayHero.value;hero.copy(player.position);hero.y+=1;hero.applyMatrix4(camera.matrixWorldInverse);
  this.uniforms.cutawayUp.value.set(0,1,0).transformDirection(camera.matrixWorldInverse);
  const radius=enabled?2.9:0,u=this.uniforms.cutawayRadius;
  // Start with readable cover on the very first frame, including paused renders.
  if(!this.ready){u.value=radius;this.ready=true;}
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
