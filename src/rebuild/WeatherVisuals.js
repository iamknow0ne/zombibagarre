import * as T from 'three';
import {seededRandom} from './config.js';

// Local precipitation, two reusable draw calls, no per-drop meshes or textures.
export class WeatherVisuals{
 constructor(world){
  this.world=world;this.random=seededRandom(world.layout.mapSeed^941);this.capacity=900;this.clock=0;this.anchor=null;this.roofs=[];
  this.drops=Array.from({length:this.capacity},()=>({x:(this.random()-.5)*64,z:(this.random()-.5)*64,y:this.random()*30}));
  this.rainPositions=new Float32Array(this.capacity*6);this.snowPositions=new Float32Array(this.capacity*3);
  const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(this.rainPositions,3).setUsage(T.DynamicDrawUsage));
  this.rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xb2d5e2,transparent:true,opacity:.28,depthWrite:false}));this.rain.frustumCulled=false;
  const snowGeo=new T.BufferGeometry();snowGeo.setAttribute('position',new T.BufferAttribute(this.snowPositions,3).setUsage(T.DynamicDrawUsage));
  this.snow=new T.Points(snowGeo,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:0},pixelRatio:{value:1}},vertexShader:'uniform float pixelRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(160.0/max(12.0,-p.z),2.0,7.0)*pixelRatio;}',fragmentShader:'uniform float opacity;void main(){vec2 p=gl_PointCoord*2.0-1.0;float d=length(p);if(d>1.0)discard;float a=(1.0-smoothstep(.1,1.0,d))*opacity;gl_FragColor=vec4(.91,.96,1.,a);}' }));this.snow.frustumCulled=false;
  this.ripple=new T.InstancedMesh(new T.RingGeometry(.78,1,16),new T.MeshBasicMaterial({color:0xaccdd2,transparent:true,opacity:.22,depthWrite:false,side:T.DoubleSide}),48);this.ripple.frustumCulled=false;this.dummy=new T.Object3D();
  rainGeo.setDrawRange(0,0);snowGeo.setDrawRange(0,0);this.rain.visible=this.snow.visible=this.ripple.visible=false;world.scene.add(this.rain,this.snow,this.ripple);
  this.dayColor=new T.Color();this.nightColor=new T.Color();this.mix=new T.Color();this.white=new T.Color(0xdce6e8);
 }
 roofAt(x,z){let h=0;for(const p of this.roofs)if(p.health>0&&Math.abs(x-p.x)<p.w/2&&Math.abs(z-p.z)<p.d/2)h=Math.max(h,p.h||8);return h;}
 update(sim,dt){
  const s=sim.weather;if(!s)return;const w=this.world,p=sim.player,settings=w.settings,cyber=settings.worldTheme==='cyberpunk';this.clock+=dt;
  const day=s.daylight,cloud=Math.max(s.rain*.65,s.snow*.5,s.fog*.65),twilight=Math.max(0,1-Math.abs(day-.4)/.4);
  w.hemi.intensity=.6+day*.85-cloud*.18;w.hemi.color.setHex(cyber?0x9ac4dd:0xa9c6da);
  w.sun.intensity=(.5+day*2)*(1-cloud*.65);w.sun.color.setHex(twilight>.25?0xffb573:day>.5?0xffe2b1:0x8caad6);
  w.rim.intensity=.6+day*.5;w.rim.color.setHex(day>.4?0x9bbbc6:0x799bc3);
  w.scene.environmentIntensity=.16+day*.26;this.dayColor.setHex(cyber?0x738f9d:0x9eacae);this.nightColor.setHex(cyber?0x0b1829:0x101e32);
  w.scene.background.copy(this.nightColor).lerp(this.dayColor,day).lerp(this.mix.setHex(0x708791),cloud*.45);w.scene.fog.color.copy(w.scene.background);
  w.scene.fog.density=(w.overview?.0009:.007)+(!w.overview?s.fog*.02+cloud*.004:0);
  w.cityLights.forEach(l=>l.intensity=8+(1-day)*85);
  const angle=(s.hour-6)/24*Math.PI*2;w.sun.position.set(p.x+Math.cos(angle)*25,22+day*15,p.z+Math.sin(angle)*20);w.sun.target.position.set(p.x,0,p.z);w.sun.target.updateMatrixWorld();
  for(const m of w.surfaces.materials.values()){
   if(!['asphalt','paving','roof','slate'].includes(m.userData.surfaceKind))continue;
   if(m.userData.weatherArtKey!==m.userData.artKey||!m.userData.weatherBase){m.userData.weatherArtKey=m.userData.artKey;m.userData.weatherBase={color:m.color.clone(),roughness:m.roughness};}
   const base=m.userData.weatherBase;m.color.copy(base.color).multiplyScalar(1-s.wetness*.18).lerp(this.white,s.snowCover*.72);m.roughness=base.roughness*(1-s.wetness*.65)+s.snowCover*.1;
  }
  const enabled=settings.weatherEffects!=='off'&&!settings.reducedMotion&&!w.overview;
  const density=settings.weatherEffects==='subtle'?.35:1,limit=Math.round((settings.quality==='low'?180:settings.quality==='balanced'?420:900)*density);
  const rain=s.rain>.03&&enabled,snow=s.snow>.03&&enabled;this.rain.visible=rain;this.snow.visible=snow;this.ripple.visible=rain;
  w.ash.visible=!settings.reducedMotion&&settings.environmentDetail!=='minimal'&&Math.max(s.rain,s.snow)<.2;
  if(!rain&&!snow)return;
  if(!this.anchor||Math.hypot(p.x-this.anchor.x,p.z-this.anchor.z)>4||this.revision!==sim.geometryRevision){this.anchor={x:p.x,z:p.z};this.revision=sim.geometryRevision;this.roofs=sim.obstacles.filter(b=>b.kind==='building'&&b.health>0&&Math.hypot(b.x-p.x,b.z-p.z)<70);}
  const count=Math.round(limit*Math.max(s.rain,s.snow));this.rain.geometry.setDrawRange(0,count*2);this.snow.geometry.setDrawRange(0,count);
  this.rain.material.opacity=.33*s.rain;this.snow.material.uniforms.opacity.value=s.snow*.8;this.snow.material.uniforms.pixelRatio.value=w.renderer.getPixelRatio();
  let ripples=0;
  for(let i=0;i<count;i++){
   const d=this.drops[i],x=p.x+d.x,z=p.z+d.z,roof=this.roofAt(x,z);d.y-=dt*(snow?2.3:22);if(d.y<0)d.y+=30;
   const y=d.y+roof,wind=Math.sin(this.clock*.4+i)*.2;
   this.rainPositions.set([x,y,z,x+.12,y+.8,z+.07],i*6);
   this.snowPositions.set([x+Math.sin(this.clock+i)*.4,y,z+wind],i*3);
   if(rain&&i<48&&roof===0){const phase=(this.clock*1.9+i*.317)%1;this.dummy.position.set(x,.045,z);this.dummy.rotation.set(-Math.PI/2,0,0);this.dummy.scale.setScalar(.04+phase*.25);this.dummy.updateMatrix();this.ripple.setMatrixAt(ripples++,this.dummy.matrix);}
  }
  this.ripple.count=ripples;this.ripple.instanceMatrix.needsUpdate=true;this.rain.geometry.attributes.position.needsUpdate=true;this.snow.geometry.attributes.position.needsUpdate=true;
 }
 dispose(){for(const m of [this.rain,this.snow,this.ripple]){m.removeFromParent();m.geometry.dispose();m.material.dispose();m.dispose?.();}}
}
