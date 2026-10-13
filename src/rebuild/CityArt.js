import {applyCutaway} from './BuildingCutaway.js';
import * as T from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {seededRandom,pointBlocked} from './config.js';
import {roadDistance,withinBoundary} from './CityTopology.js';
import {DENSITY} from './DisplaySettings.js';
import {waterAt} from './City.js';
const assets=new Map();
export function cityAsset(name){if(!assets.has(name))assets.set(name,new T.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}art/${name}`).then(t=>{t.colorSpace=T.SRGBColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.userData.shared=true;return t;}).catch(error=>{assets.delete(name);throw error;}));return assets.get(name);}
const cells={plaster:[0,.5],brick:[.5,.5],slate:[0,0],roof:[0,0],paving:[.5,0]};
export function cityArtPlan(layout){
 if(!layout.city)return [];const r=seededRandom(layout.mapSeed^0x526fa),out=[];
 const add=(x,z,tile,h,y=0,owner=null)=>out.push({x,z,tile,h,y,owner});
 for(let i=0;i<layout.streetPoints.length;i++){const p=layout.streetPoints[i],side=r()<.5?-1:1,d=p.width/2+1.6+r()*1.4,x=p.x+Math.cos(p.angle)*d*side,z=p.z-Math.sin(p.angle)*d*side;
  if(!withinBoundary(layout.boundary,x,z,2)||roadDistance({x,z},layout.roads)<.7||waterAt(layout,x,z)||pointBlocked(x,z,1.2,[...layout.buildings,...layout.cover]))continue;
  add(x,z,[0,1,6,7][Math.floor(r()*4)],2.1+r()*1.6);if(out.length>=360)break;
 }
 for(const b of layout.buildings){if(b.primary===false)continue;
  for(let i=0;i<2;i++){const bays=Math.max(2,Math.floor(b.w/2.7)),bay=b.w/bays,x=b.x-b.w/2+bay*(i?bays-1.5:1.5),z=b.z+b.d/2+.85;add(x,z,3,3.1,Math.min(b.h-1,i&&b.h>8?5.3:2.5),b.id);}
  if(b.h>7)add(b.x-b.w*.35,b.z+b.d/2+.38,2,4.1,b.h-4,b.id);
  const x=b.x+b.w*.35,z=b.z+b.d/2+1.1;if(roadDistance({x,z},layout.roads)>.7&&!pointBlocked(x,z,.5,layout.buildings))add(x,z,r()<.65?4:5,2.3,.12,b.id);
 }
 return out;
}
export function pixelPass(){return new ShaderPass({uniforms:{tDiffuse:{value:null},screen:{value:new T.Vector2(1280,720)},pixelSize:{value:1},grade:{value:0},retro:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 screen;uniform float pixelSize,grade,retro;varying vec2 vUv;
 void main(){vec2 cells=screen/max(1.,pixelSize);vec2 uv=retro>.5?(floor(vUv*cells)+.5)/cells:vUv;vec3 c=texture2D(tDiffuse,uv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
 if(retro>.5){c=mix(vec3(l),c,1.08);vec3 p=sqrt(max(c,vec3(0.)));c=pow(floor(p*42.+.5)/42.,vec3(2.));}
 if(grade>.5&&grade<1.5){c=mix(vec3(l),c,.83);c=c*vec3(1.06,1.01,.92)+vec3(.003,.009,.012)*(1.-min(l,1.));}
 if(grade>1.5){vec2 d=1./screen;vec3 a=texture2D(tDiffuse,uv+vec2(d.x,0.)).rgb,b=texture2D(tDiffuse,uv+vec2(0.,d.y)).rgb;float edge=length(c-a)+length(c-b);c*=1.-smoothstep(.05,.35,edge)*.62;c=floor(c*18.+.5)/18.;}
 gl_FragColor=vec4(max(c,vec3(0.)),1.);}`});}
export class CityArt{
 constructor(world){this.world=world;this.groups=[];this.plan=cityArtPlan(world.layout);this.clock={value:0};this.alive=true;this.lastUpdate=-1;
  if(world.layout.city)cityAsset('saint-roch-sprites-v1.webp').then(t=>{if(this.alive){this.buildSprites(t);world.requestRender=true;}}).catch(()=>{if(this.alive)this.failed=true;});
 }
 setStyle(style,theme='quarantine',clarity='sharp'){const signature=[style,theme,clarity].join(':');if(this.signature===signature)return;this.signature=signature;this.style=style;this.theme=theme;this.clarity=clarity;
  const name=theme==='cyberpunk'?'blackout-materials-v1.webp':style==='pixel'?'saint-roch-materials-v1.webp':null;this.atlas=null;this.applyMaterials();if(name)cityAsset(name).then(t=>{if(this.alive&&this.signature===signature){this.atlas=t;this.applyMaterials();this.world.requestRender=true;}}).catch(()=>{if(this.alive)this.failed=true;});
 }
 applyMaterials(){const w=this.world,enabled=!!this.atlas&&(this.style==='pixel'||this.theme==='cyberpunk'),materials=new Set(w.surfaces.materials.values());w.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});
  for(const m of materials){const kind=m.userData.surfaceKind,cell=cells[kind];if(!cell)continue;const key=[this.signature,this.style,this.clarity,enabled].join(':');if(m.userData.artKey===key)continue;m.userData.artKey=key;m.userData.pixelArt=enabled;
   m.map=enabled?this.atlas:w.surfaces.textures(kind).albedo;m.color.setHex(enabled?(this.theme==='cyberpunk'?0xc4ccd1:kind==='paving'?0xb6b3a4:kind==='brick'?0xc4b19c:0xd6d2bc):m.userData.surfaceColor);m.bumpScale=enabled?.018:(m.userData.surfaceBump||.03);
   const retro=this.clarity==='retro'&&this.style==='pixel';m.onBeforeCompile=shader=>{if(!enabled)return;const scale=kind==='brick'?.55:.65,uv=retro?`(floor(fract(vMapUv*${scale})*128.)+.5)/128.`:`fract(vMapUv*${scale})`;const code=T.ShaderChunk.map_fragment.replace('vMapUv',`((${uv})*vec2(.492)+vec2(${cell[0]+.004},${cell[1]+.004}))`);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',code);};m.customProgramCacheKey=()=>`city-art-${kind}-${key}`;if(m.cutawayUniforms)applyCutaway(m,m.cutawayUniforms);m.needsUpdate=true;
  }
 }
 buildSprites(atlas){this.lastUpdate=-1;const w=this.world;for(let tile=0;tile<8;tile++){
   const items=this.plan.filter(p=>p.tile===tile);if(!items.length)continue;const map=atlas.clone();map.repeat.set(.25,.5);map.offset.set((tile%4)*.25,tile<4?.5:0);map.needsUpdate=true;map.userData.shared=false;
   const material=new T.MeshStandardMaterial({map,alphaTest:.35,transparent:false,side:T.DoubleSide,roughness:1,color:0xffffff});material.onBeforeCompile=shader=>{shader.uniforms.cityWind=this.clock;shader.vertexShader='uniform float cityWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x+=sin(cityWind*1.3+instanceMatrix[3].x*.7)*.025*uv.y;');};material.customProgramCacheKey=()=> 'city-foliage-wind-v1';if([2,3,4,5].includes(tile))applyCutaway(material,w.cutaway.uniforms);
   const geo=new T.PlaneGeometry(1,1);geo.translate(0,.5,0);const mesh=new T.InstancedMesh(geo,material,items.length);mesh.frustumCulled=false;mesh.receiveShadow=true;w.scene.add(mesh);this.groups.push({mesh,items});
  }this.wallRotation=new T.Quaternion();this.matrix=new T.Matrix4();this.position=new T.Vector3();this.scale=new T.Vector3();
 }
 update(dt,player,camera,time){this.clock.value+=this.world.settings.reducedMotion?0:dt;if(time-this.lastUpdate<.1&&this.lastUpdate>=0)return;this.lastUpdate=time;
  for(const {mesh,items}of this.groups){items.forEach((p,i)=>{const density=DENSITY[this.world.settings.foliageDetail]??.65,owner=p.owner&&this.world.buildingMeshes.get(p.owner),visible=(i%20)/20<density&&Math.hypot(p.x-player.x,p.z-player.z)<62&&(!owner||(!owner.userData.collapsed));this.position.set(p.x,p.y-p.h*.09,p.z);this.scale.set(visible?p.h*.5:0,visible?p.h:0,1);this.matrix.compose(this.position,p.owner&&[2,3].includes(p.tile)?this.wallRotation:camera.quaternion,this.scale);mesh.setMatrixAt(i,this.matrix);});mesh.instanceMatrix.needsUpdate=true;}
 }
 dispose(){this.alive=false;for(const {mesh}of this.groups){mesh.removeFromParent();mesh.geometry.dispose();mesh.dispose();mesh.material.map.dispose();mesh.material.dispose();}this.groups=[];}
}
