import * as T from 'three';
import {createFirstPersonArms} from './FirstPersonArms.js';
import {perspectiveTarget,boxHit3D,propHeight} from './Ballistics.js';
import {perspectiveSettings} from './PerspectiveSettings.js';
import {collisionCandidates} from './SpatialIndex.js';
import {WEAPONS} from './config.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*Math.max(0,dt)));
export function cameraMovement(x,y,yaw){return{x:-x*Math.cos(yaw)-y*Math.sin(yaw),z:x*Math.sin(yaw)-y*Math.cos(yaw)};}
// Sweep a camera-sized volume in all three dimensions, including low cover,
// vehicles and vertical entries from steep camera angles.
export function cameraClearance(from,to,obstacles){let fraction=1;for(const b of obstacles){if(b.health<=0||!b.w||!b.d)continue;const padding=.24;const t=boxHit3D({...from,y:from.y+padding},{...to,y:to.y+padding},{...b,w:b.w+padding*2,d:b.d+padding*2,h:propHeight(b)+padding*2});if(t!==null)fraction=Math.min(fraction,Math.max(0,t-.025));}return fraction;}
export class ViewRig{
 constructor(){this.camera=new T.PerspectiveCamera(70,1,.06,180);this.yaw=Math.PI;this.pitch=.12;this.mode='diorama';this.active=false;this.origin=new T.Vector3();this.target=new T.Vector3();this.settings=perspectiveSettings();this.aimBlend=0;this.swayX=this.swayY=0;this.hitUntil=0;this.handsScene=new T.Scene();this.handsScene.add(new T.HemisphereLight(0xcadce5,0x494b3b,2));const key=new T.DirectionalLight(0xffe7c5,2);key.position.set(-3,5,3);this.handsScene.add(key);}
 configure(settings){this.settings={...perspectiveSettings(settings),reducedMotion:!!settings.reducedMotion};}
 setMode(mode){if(this.mode!==mode){this.mode=mode;this.ready=false;this.pendingYaw=0;this.aimBlend=0;this.swayX=this.swayY=0;}}
 look(dx,dy){const sensitivity=this.settings.lookSensitivity*(1-this.aimBlend*.45),x=clamp(dx,-150,150)*sensitivity,y=clamp(dy,-150,150)*sensitivity;const yawDelta=-x*.0025;this.yaw+=yawDelta;if(!this.ready)this.pendingYaw=(this.pendingYaw||0)+yawDelta;this.pitch=clamp(this.pitch+y*.002,-.95,1.15);this.swayX=clamp(this.swayX+x*.0003,-.045,.045);this.swayY=clamp(this.swayY+y*.0003,-.035,.035);}
 update(sim,aspect,dt){
  const p=sim.player,initial=!this.ready;if(initial){this.yaw=(Number.isFinite(p.angle)?p.angle:Math.PI)+(this.pendingYaw||0);this.pendingYaw=0;this.ready=true;this.clearance=1;}
  const vehicle=sim.props.find(v=>v.id===p.vehicleId),first=this.mode==='first'&&!vehicle,blade=!!WEAPONS[p.weapon]?.melee;
  this.aimBlend=damp(this.aimBlend,p.aiming&&!blade&&!vehicle?1:0,14,dt);this.swayX=damp(this.swayX,0,9,dt);this.swayY=damp(this.swayY,0,9,dt);
  this.camera.aspect=aspect;this.camera.fov=this.settings.viewFov*(1-this.aimBlend*(p.weapon==='marksman'?.32:first?.22:.16));this.camera.updateProjectionMatrix();
  const motion=this.settings.reducedMotion?0:this.settings.cameraMotion/100,phase=p.footTravel||sim.time*Math.min(9,Math.hypot(p.moveX||0,p.moveZ||0)),bob=first&&p.moving&&!p.dash?Math.sin(phase*4)*.018*motion*(1-this.aimBlend*.8):0;
  this.origin.set(p.x,(p.y||0)+(vehicle?2.4:1.55)+bob,p.z);const distance=first?0:vehicle?8:4.5-this.aimBlend*1.1;
  this.shoulder=damp(this.shoulder??(this.settings.shoulder==='left'?-1:1),this.settings.shoulder==='left'?-1:1,10,dt);
  const side=first?0:(.65-this.aimBlend*.15)*this.shoulder;
  // Orbit the boom along the viewing direction. Keeping the full horizontal
  // distance while raising it by sin(pitch) makes steep downward crosshairs
  // land behind the hero, turning shots back toward the chase camera.
  const horizontal=distance*Math.cos(this.pitch);
  this.target.set(this.origin.x-Math.sin(this.yaw)*horizontal-Math.cos(this.yaw)*side,this.origin.y+Math.sin(this.pitch)*distance+(first?0:.55),this.origin.z-Math.cos(this.yaw)*horizontal+Math.sin(this.yaw)*side);
  // The street is not a prop collider. Upward free look otherwise sends the
  // chase boom below it, especially behind vehicles with their longer boom.
  if(!first)this.target.y=Math.max(.28,this.target.y);
  const nearby=(a,b)=>(sim.obstacles?collisionCandidates(sim,a,b,.24):sim.props).filter(o=>!p.vehicleId||o.id!==p.vehicleId),clear=cameraClearance(this.origin,this.target,nearby(this.origin,this.target));
  // Retract immediately to avoid clipping; ease only the return out of cover.
  this.clearance=clear<this.clearance?clear:initial?clear:damp(this.clearance,clear,6,dt);
  this.target.lerpVectors(this.origin,this.target,this.clearance);this.camera.position.copy(this.target);this.distance=this.camera.position.distanceTo(this.origin);
  this.camera.lookAt(this.target.x+Math.sin(this.yaw)*10,this.target.y-Math.tan(this.pitch)*10,this.target.z+Math.cos(this.yaw)*10);this.camera.updateMatrixWorld();
  const forward={x:p.x+Math.sin(this.yaw)*1.5,y:(p.y||0)+1.2,z:p.z+Math.cos(this.yaw)*1.5};this.nearWall=1-cameraClearance({x:p.x,y:(p.y||0)+1.2,z:p.z},forward,nearby(p,forward));
 }
 fadeAvatar(player){const alpha=this.active&&this.mode==='third'?clamp((this.distance-.35)/1.1,0,1):1;if(alpha===1&&!player.userData.cameraFaded)return;player.userData.cameraFaded=alpha<1;
  player.traverse(o=>{if(!o.isMesh||o.userData.cameraOverlay)return;
   if(alpha===1){const list=o.userData.cameraMaterials;if(!list)return;o.material=o.userData.cameraMaterialArray?list.map(a=>a.original):list[0].original;for(const a of list)a.material.dispose();delete o.userData.cameraMaterials;delete o.userData.cameraMaterialArray;return;}
   if(!o.userData.cameraMaterials){const clone=m=>{const n=m.clone();n.userData={...n.userData,shared:false};return{original:m,material:n,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite};};const array=Array.isArray(o.material),list=(array?o.material:[o.material]).map(clone);o.userData.cameraMaterials=list;o.userData.cameraMaterialArray=array;o.material=array?list.map(a=>a.material):list[0].material;}
   for(const a of o.userData.cameraMaterials){a.material.opacity=a.opacity*alpha;a.material.transparent=true;a.material.depthWrite=a.depthWrite&&alpha>.98;}
  });
 }
 clearHands(){this.detailedArms?.dispose();this.detailedArms=null;this.detailedArmsSource=null;this.hands?.removeFromParent();this.hands=null;this.sources=null;this.pairs=[];}
 syncHands(player,sim,scene){const visible=this.active&&this.mode==='first'&&!sim.player.vehicleId&&sim.state!=='dead';if(!visible){if(this.hands)this.hands.visible=false;return;}const sources=[...(player.userData.arms||[]),...(player.userData.weaponRigs||[]).filter(Boolean)];
  if(!this.sources||sources.some((m,i)=>m!==this.sources[i])||sources.length!==this.sources.length){this.clearHands();this.sources=sources;this.hands=new T.Group();this.pairs=[];const arms=new Set(player.userData.arms||[]);const copy=(o,parent)=>{const n=o.isMesh?new T.Mesh(o.geometry,o.material):new T.Group();parent.add(n);this.pairs.push([o,n]);for(const c of o.children)if(!arms.has(o)||c===o.userData.elbow)copy(c,n);};for(const source of sources)copy(source,this.hands);this.handsScene.add(this.hands);}
  const detailed=player.userData.detailedContent||null;
  if(this.detailedArmsSource!==detailed){this.detailedArms?.dispose();this.detailedArms=createFirstPersonArms(player);this.detailedArmsSource=detailed;if(this.detailedArms)this.hands.add(this.detailedArms.root);}
  const armSources=player.userData.arms||[];
  for(const [o,n]of this.pairs){n.position.copy(o.position);n.quaternion.copy(o.quaternion);n.scale.copy(o.scale);n.visible=o.visible&&!o.userData.hideFirstPerson;if(this.detailedArms&&o.isMesh){for(let ancestor=o;ancestor;ancestor=ancestor.parent)if(armSources.includes(ancestor)){n.visible=false;break;}}if(o.isMesh)n.material=o.material;}
  this.detailedArms?.update();
  const p=sim.player,motion=this.settings.reducedMotion?0:this.settings.cameraMotion/100,phase=player.userData.gait||0,walk=player.userData.walk||0,aim=this.aimBlend,wall=this.nearWall||0;
  this.handsScene.environment=scene.environment;this.handsScene.environmentIntensity=scene.environmentIntensity;
  this.hands.visible=true;this.hands.position.copy(this.camera.position);this.hands.quaternion.copy(this.camera.quaternion);
  const dual=p.equipped?.length>1,portrait=clamp(this.camera.aspect/.9,.58,1),scale=(.83-aim*.06)*portrait;
  this.hands.translateX(((dual?0:.43)-aim*(dual?0:.13))*portrait+Math.sin(phase)*walk*.018*motion*(1-aim*.8)-this.swayX*motion);
  this.hands.translateY(-(1.23*scale+.34)+aim*.035-wall*.15+Math.sin(phase*2)*walk*.012*motion+this.swayY*motion);
  this.hands.translateZ(-.80+wall*.20);this.hands.rotateY(Math.PI);this.hands.rotateX(wall*.38);this.hands.scale.setScalar(scale);
 }
 renderHands(renderer){if(!this.hands?.visible)return;const auto=renderer.autoClear;renderer.autoClear=false;try{renderer.clearDepth();renderer.render(this.handsScene,this.camera);}finally{renderer.autoClear=auto;}}
 aim(player,sim){if(!sim)return{x:player.x+Math.sin(this.yaw)*20,z:player.z+Math.cos(this.yaw)*20};
  // Input changes look before the next render. Resolve the shoulder boom at the
  // current pose first, or the shot uses the previous frame's camera position after a turn.
  // Zero delta updates geometry/collision without advancing zoom, sway or easing.
  this.update(sim,this.camera.aspect,0);const aim=perspectiveTarget(this.camera.position,this.yaw,this.pitch,sim.obstacles||sim.props,sim.enemies);this.aimTarget=aim;return aim;}
}
