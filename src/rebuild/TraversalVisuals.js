import {roofEncounter,roofCachePosition} from './RooftopEncounters.js';
import * as T from 'three';
import {alignSurvivorFeet} from './CharacterMotion.js';

// Keep the marker's mast beside the landing lane. The ring/cable stay at the
// authored endpoint; a straight post there occupies the landed hero and FPS eye.
function anchorMastPosition(anchor,owner,plan){
 const roof=plan?.roofs?.find(r=>r.anchor?.id===anchor.id),normal=roof?.approach;
 const directions=normal?[[-normal.nz,normal.nx],[normal.nz,-normal.nx]]:[[1,0],[-1,0],[0,1],[0,-1]];
 if(!Number.isFinite(owner.w)||!Number.isFinite(owner.d))return null;
 return directions.map(([x,z])=>({x:anchor.x+x*1.1,z:anchor.z+z*1.1})).find(p=>Math.abs(p.x-owner.x)<=owner.w/2-.12&&Math.abs(p.z-owner.z)<=owner.d/2-.12)||null;
}

// Fixed geometry: anchors are authored with the support plan; only the cable
// buffer and landing ring change each frame. No particle/mesh growth per jump.
export class TraversalVisuals{
 constructor(scene,plan,props=[]){
  this.root=new T.Group();this.root.name='campaign-traversal';scene.add(this.root);this.anchors=[];this.rewardPlan=plan?.reward;this.hand=new T.Vector3();
  const metal=this.metal=new T.MeshStandardMaterial({color:0x4c605c,roughness:.5,metalness:.65});
  for(const anchor of (plan?.anchors||[]).slice(0,16)){
   const owner=props.find(p=>p.id===anchor.supportId);if(!owner)continue;
   const group=new T.Group(),base=(owner.y||0)+owner.h,height=Math.max(.05,anchor.y-base);
   const mast=anchorMastPosition(anchor,owner,plan);
   if(mast){
    const post=new T.Mesh(new T.CylinderGeometry(.045,.065,height,8),metal);post.name='anchor-mast';post.position.set(mast.x,base+height/2,mast.z);group.add(post);
    const from=new T.Vector3(mast.x,anchor.y,mast.z),to=new T.Vector3(anchor.x,anchor.y,anchor.z),arm=new T.Mesh(new T.CylinderGeometry(.035,.035,from.distanceTo(to),8),metal);
    arm.name='anchor-overhead-arm';arm.position.copy(from).add(to).multiplyScalar(.5);arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());group.add(arm);
   }
   const material=new T.MeshStandardMaterial({color:0xc9ae79,emissive:0x8c5126,emissiveIntensity:.2,roughness:.35,metalness:.55});
   const ring=new T.Mesh(new T.TorusGeometry(.29,.055,7,24),material);ring.position.set(anchor.x,anchor.y,anchor.z);group.add(ring);this.root.add(group);this.anchors.push({anchor,group,ring});
  }
  this.roofCaches=[];
  for(const roof of (plan?.roofs||[]).filter(r=>r.parts?.length&&Number.isFinite(r.top))){
   const group=new T.Group(),point=roofCachePosition(roof),paint=new T.MeshStandardMaterial({color:0x416958,roughness:.65,metalness:.25}),trim=new T.MeshStandardMaterial({color:0xc6ad7e,roughness:.5,metalness:.55}),lamp=new T.MeshStandardMaterial({color:0xe1b474,emissive:0x9b591e,emissiveIntensity:.35});
   const block=(w,h,d,x,y,z,material)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
   block(.95,.5,.65,0,.25,0,paint);for(const x of [-.34,.34])block(.055,.51,.67,x,.26,0,trim);
   const hinge=new T.Group();hinge.position.set(0,.51,-.325);const lid=new T.Mesh(new T.BoxGeometry(.98,.08,.68),paint);lid.position.z=.325;hinge.add(lid);group.add(hinge);
   block(.14,.08,.025,0,.3,.34,lamp);block(.3,.16,.22,-.23,.62,-.08,metal);
   const antenna=new T.Mesh(new T.CylinderGeometry(.012,.018,.65,5),metal);antenna.position.set(-.32,.98,-.13);group.add(antenna);
   group.position.set(point.x,point.y,point.z);this.root.add(group);this.roofCaches.push({roof,group,hinge,lamp});
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
  for(const {roof,group,hinge,lamp} of this.roofCaches){
   const record=roofEncounter(sim,roof),alive=sim.props.some(o=>o.id===roof.buildingId&&o.health>0);group.visible=alive&&record.state!=='lost'&&Math.hypot(group.position.x-p.x,group.position.z-p.z)<50;
   hinge.rotation.x=record.state==='claimed'?-1.2:0;lamp.color.setHex(record.state==='cleared'?0x94d5b2:record.state==='claimed'?0x546a5a:0xe1b474);lamp.emissive.setHex(record.state==='cleared'?0x396c4c:0x593919);lamp.emissiveIntensity=record.state==='claimed'?0:.35;
  }
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
