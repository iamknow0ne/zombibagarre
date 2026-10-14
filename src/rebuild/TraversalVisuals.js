import * as T from 'three';
import {alignSurvivorFeet} from './CharacterMotion.js';

// Fixed geometry: anchors are authored with the support plan; only the cable
// buffer and landing ring change each frame. No particle/mesh growth per jump.
export class TraversalVisuals{
 constructor(scene,plan,props=[]){
  this.root=new T.Group();this.root.name='campaign-traversal';scene.add(this.root);this.anchors=[];this.rewardPlan=plan?.reward;this.hand=new T.Vector3();
  const metal=this.metal=new T.MeshStandardMaterial({color:0x4c605c,roughness:.5,metalness:.65});
  for(const anchor of (plan?.anchors||[]).slice(0,16)){
   const owner=props.find(p=>p.id===anchor.supportId);if(!owner)continue;
   const group=new T.Group(),base=(owner.y||0)+owner.h,height=Math.max(.05,anchor.y-base);
   const post=new T.Mesh(new T.CylinderGeometry(.045,.065,height,8),metal);post.position.set(anchor.x,base+height/2,anchor.z);group.add(post);
   const material=new T.MeshStandardMaterial({color:0xc9ae79,emissive:0x8c5126,emissiveIntensity:.2,roughness:.35,metalness:.55});
   const ring=new T.Mesh(new T.TorusGeometry(.29,.055,7,24),material);ring.position.set(anchor.x,anchor.y,anchor.z);group.add(ring);this.root.add(group);this.anchors.push({anchor,group,ring});
  }
  this.cable=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(17*3),3)),new T.LineBasicMaterial({color:0xe8c48a}));this.cable.frustumCulled=false;this.cable.visible=false;this.root.add(this.cable);
  this.landing=new T.Mesh(new T.RingGeometry(.42,.47,32),new T.MeshBasicMaterial({color:0xd7c5a0,transparent:true,opacity:0,depthWrite:false}));this.landing.rotation.x=-Math.PI/2;this.landing.visible=false;this.root.add(this.landing);this.landLife=0;
  if(this.rewardPlan){const reward=this.reward=new T.Group(),body=new T.Mesh(new T.BoxGeometry(.85,.46,.58),metal);body.position.y=.23;reward.add(body);const trim=new T.MeshStandardMaterial({color:0xc5ab76,roughness:.6,emissive:0x49351c,emissiveIntensity:.2});for(const x of [-.27,.27]){const band=new T.Mesh(new T.BoxGeometry(.07,.48,.6),trim);band.position.set(x,.24,0);reward.add(band);}const latch=new T.Mesh(new T.BoxGeometry(.18,.14,.035),trim);latch.position.set(0,.24,.31);reward.add(latch);this.root.add(reward);}
 }
 event(e){if(e.type!=='traversal-land')return;this.landing.position.set(e.x,(e.y||0)+.035,e.z);this.landLife=.34;}
 update(sim,dt,camera,reducedMotion=false,character=null){
  const p=sim.player;this.root.visible=p.traversal==='campaign';if(!this.root.visible)return;
  const selected=sim.traversalTarget;
  if(this.reward){const r=this.rewardPlan,owner=sim.props.find(o=>o.id===r.supportId);this.reward.visible=!sim.traversalRewardClaimed&&Math.hypot(r.x-p.x,r.z-p.z)<50;this.reward.position.set(r.x,owner?.health>0?r.y:0,r.z);}
  for(const entry of this.anchors){const {anchor,group,ring}=entry,owner=sim.props.find(o=>o.id===anchor.supportId);group.visible=!!owner&&owner.health>0&&Math.hypot(anchor.x-p.x,anchor.z-p.z)<50;if(!group.visible)continue;
   const active=selected?.id===anchor.id||p.grapple?.anchorId===anchor.id,ready=active&&(selected?.available||!!p.grapple);
   ring.quaternion.copy(camera.quaternion);ring.material.color.setHex(ready?0xf3c782:0x8c9689);ring.material.emissiveIntensity=ready?.65:.08;ring.scale.setScalar(active?1.18:1);
  }
  const attached=this.anchors.find(a=>a.anchor.id===p.grapple?.anchorId);this.cable.visible=!!attached&&attached.group.visible;
  if(this.cable.visible){const a=attached.anchor,points=this.cable.geometry.attributes.position;this.hand.set(p.x,(p.y||0)+1.5,p.z);const wrist=character?.userData.arms?.[0]?.userData.wrist;if(wrist)wrist.getWorldPosition(this.hand);for(let i=0;i<17;i++){const t=i/16;points.setXYZ(i,this.hand.x+(a.x-this.hand.x)*t,this.hand.y+(a.y-this.hand.y)*t-Math.sin(t*Math.PI)*.08,this.hand.z+(a.z-this.hand.z)*t);}points.needsUpdate=true;}
  this.landLife=Math.max(0,this.landLife-dt);this.landing.visible=this.landLife>0&&!reducedMotion;this.landing.material.opacity=this.landLife/.34*.4;this.landing.scale.setScalar(1+(1-this.landLife/.34)*1.6);
 }
 clear(){this.cable.visible=this.landing.visible=false;this.landLife=0;}
 dispose(){const geometries=new Set(),materials=new Set([this.metal]);this.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.root.removeFromParent();}
}

// Weapon IK has already posed campaign arms. Jumping adds only a lower-body
// pose; the trainer retains its unarmed pose. Attached cables stow the rigs.
export function applyTraversalPose(character,p){
 const d=character.userData,air=!p.grounded,landing=p.landing||0;character.position.y=p.y||0;d.body.position.y-=landing*.25;
 if(air)d.body.rotation.x=p.grapple?-.16:.1;
 d.legs.forEach((leg,i)=>{if(air){leg.rotation.x=i?-.25:.45;leg.userData.knee.rotation.x=i?.8:1.1;}else leg.userData.knee.rotation.x+=landing;});
 if(p.traversal!=='campaign'||p.grapple)d.arms.forEach((arm,i)=>{arm.rotation.x=p.grapple?-2.6:air?-.9:-.2;arm.rotation.z=(i?1:-1)*(air?.35:.08);arm.userData.elbow.rotation.x=p.grapple?-.25:-.7;});
 if(p.grapple)for(const rig of d.weaponRigs||[])if(rig)rig.visible=false;
 alignSurvivorFeet(character,air);
}
