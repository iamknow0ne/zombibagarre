import * as T from 'three';
import {perspectiveTarget} from './Ballistics.js';
import {segmentBoxTime} from './config.js';
export function cameraMovement(x,y,yaw){return{x:-x*Math.cos(yaw)-y*Math.sin(yaw),z:x*Math.sin(yaw)-y*Math.cos(yaw)};}
export function cameraClearance(from,to,obstacles){let fraction=1;for(const b of obstacles){if(b.health<=0||b.kind!=='building'&&b.kind!=='crate'&&b.kind!=='tree')continue;const t=segmentBoxTime(from,to,b,.3);if(t!==null&&from.y+(to.y-from.y)*t<(b.h||(b.kind==='building'?20:2))+.3)fraction=Math.min(fraction,Math.max(0,t-.04));}return fraction;}
export class ViewRig{
 constructor(){this.camera=new T.PerspectiveCamera(65,1,.08,150);this.yaw=Math.PI;this.pitch=.12;this.mode='diorama';this.active=false;this.origin=new T.Vector3();this.target=new T.Vector3();}
 setMode(mode){if(this.mode!==mode){this.mode=mode;this.ready=false;}}
 look(dx,dy){this.yaw-=Math.max(-150,Math.min(150,dx))*.0025;this.pitch=Math.max(-.65,Math.min(.85,this.pitch+Math.max(-150,Math.min(150,dy))*.002));}
 update(sim,aspect,dt){const p=sim.player;if(!this.ready){this.yaw=p.angle||Math.PI;this.ready=true;}this.camera.aspect=aspect;this.camera.updateProjectionMatrix();const vehicle=sim.props.find(v=>v.id===p.vehicleId),first=this.mode==='first'&&!vehicle;
  this.origin.set(p.x,vehicle?2.4:1.55,p.z);const distance=first?0:vehicle?8:4.8,side=first?0:.65;
  this.target.set(this.origin.x-Math.sin(this.yaw)*distance-Math.cos(this.yaw)*side,this.origin.y+Math.sin(this.pitch)*distance+(first?0:.7),this.origin.z-Math.cos(this.yaw)*distance+Math.sin(this.yaw)*side);
  const t=cameraClearance(this.origin,this.target,sim.props);this.target.lerpVectors(this.origin,this.target,t);this.camera.position.copy(this.target);this.camera.lookAt(this.target.x+Math.sin(this.yaw)*10,this.target.y-Math.tan(this.pitch)*10,this.target.z+Math.cos(this.yaw)*10);this.camera.updateMatrixWorld();
 }
 syncHands(player,sim,scene){const visible=this.active&&this.mode==='first'&&!sim.player.vehicleId&&sim.state!=='dead';if(!visible){if(this.hands)this.hands.visible=false;return;}const sources=[...(player.userData.arms||[]),...(player.userData.weaponRigs||[]).filter(Boolean)];
  if(!this.sources||sources.some((m,i)=>m!==this.sources[i])||sources.length!==this.sources.length){this.hands?.removeFromParent();this.sources=sources;this.hands=new T.Group();this.pairs=[];const arms=new Set(player.userData.arms||[]);const copy=(o,parent)=>{const n=o.isMesh?new T.Mesh(o.geometry,o.material):new T.Group();parent.add(n);this.pairs.push([o,n]);for(const c of o.children)if(!arms.has(o)||!c.isMesh)copy(c,n);};for(const source of sources)copy(source,this.hands);scene.add(this.hands);}
  for(const [o,n]of this.pairs){n.position.copy(o.position);n.quaternion.copy(o.quaternion);n.scale.copy(o.scale);n.visible=o.visible;}this.hands.visible=true;this.hands.position.copy(this.camera.position);this.hands.quaternion.copy(this.camera.quaternion);this.hands.translateY(-1.5);this.hands.translateZ(-.75);this.hands.rotateY(Math.PI);this.hands.scale.setScalar(.9);
 }
 aim(player,sim){if(!sim)return{x:player.x+Math.sin(this.yaw)*20,z:player.z+Math.cos(this.yaw)*20};const origin=this.ready?this.camera.position:{x:player.x,y:1.55,z:player.z};return perspectiveTarget(origin,this.yaw,this.pitch,sim.obstacles||sim.props,sim.enemies);}
}
