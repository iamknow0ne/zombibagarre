import * as T from 'three';
import {vehicleSpec} from './Vehicles.js';
export function buildVehicle(parent,o,{box,cylinder,contact,batch}){
 const s=vehicleSpec(o),type=o.vehicleType||'sedan',g=new T.Group();parent.add(g);g.position.set(o.x,0,o.z);g.rotation.y=o.rotation||0;
 const body=new T.Group();g.add(body);g.userData.body=body;g.userData.wheels=[];g.userData.tailLights=[];g.userData.beacons=[];
 const L=s.length,W=s.width,H=s.height,paint=o.color||s.color,glass=0x29444b,trim=0x283738;
 box(body,trim,0,.43,0,L*.92,.35,W*.94);box(body,paint,0,.77,0,L*.97,.5,W*.94);
 const tall=['van','ambulance','armored'].includes(type),pickup=type==='pickup',buggy=type==='buggy',roof=H-.04;
 const cabX=pickup?.4:tall?-.2:-.2,cabL=pickup?L*.38:tall?L*.75:L*.53;
 if(!buggy){
  box(body,glass,cabX,1.05+(H-1.05)/2,0,cabL,H-1.05,W*.87);
  box(body,paint,cabX,roof,0,cabL+.08,.13,W*.92);
  for(const x of [cabX-cabL/2,cabX,cabX+cabL/2])for(const z of [-1,1])box(body,paint,x,(roof+1.02)/2,z*W*.445,.1,roof-1,W*.04);
  if(tall){box(body,paint,-L*.19,(roof+1)/2,0,L*.55,roof-1,W*.91);for(const z of [-1,1]){box(body,glass,L*.15,roof-.35,z*W*.46,L*.18,.4,.025);box(body,trim,-L*.12,1.01,z*W*.49,L*.7,.08,.04);}}
 }else{
  box(body,0x37403b,-.05,1.02,0,1,.5,W*.7);
  for(const x of [-.7,.5])for(const z of [-.65,.65]){const bar=box(body,trim,x,1.28,z,.085,.85,.085);bar.rotation.z=x<0?-.15:.15;}
  for(const z of [-.65,.65])box(body,trim,-.1,1.72,z,1.4,.085,.085);
  for(const x of [-.7,.5])box(body,trim,x,1.7,0,.085,.085,1.4);
  box(body,glass,.58,1.4,0,.04,.45,1.15);
 }
 if(pickup){box(body,trim,-L*.3,1,0,L*.35,.08,W*.75);for(const z of [-1,1])box(body,paint,-L*.31,1.18,z*W*.44,L*.37,.45,.12);box(body,paint,-L*.49,1.15,0,.1,.4,W*.88);}
 if(type==='coupe'){for(const z of [-.58,.58])box(body,trim,-L*.4,1.3,z,.08,.4,.09);box(body,trim,-L*.4,1.5,0,.45,.09,W);for(const z of [-.2,.2])box(body,0xe4d5ad,L*.33,1.03,z,L*.24,.02,.17);}
 if(type==='armored'){for(const z of [-1,1]){box(body,0x39473e,0,.97,z*W*.5,L*.85,.38,.12);for(let i=0;i<5;i++)box(body,0x87917c,-L*.3+i*L*.15,1,z*W*.565,.08,.08,.02);}box(body,trim,L*.48,1.1,0,.15,.7,W);box(body,0x455346,-.1,roof+.16,0,.85,.2,.85);}
 if(type==='ambulance'){for(const z of [-1,1]){box(body,0xb15b36,-L*.2,1.45,z*W*.468,L*.5,.23,.025);box(body,0xb15b36,-L*.25,1.5,z*W*.475,.18,.7,.025);}}
 if(type==='patrol'){for(const z of [-1,1])box(body,0xc4c4ac,-.1,1.02,z*W*.475,L*.35,.43,.025);}
 if(['ambulance','patrol'].includes(type))for(const z of [-.32,.32]){const light=box(body,z<0?0xc65c39:0x6796ad,0,roof+.2,z,.55,.18,.5,{emissive:z<0?0xc65c39:0x6796ad,emissiveIntensity:.4});light.material=light.material.clone();light.material.userData.shared=false;light.userData.breakablePart=true;g.userData.beacons.push(light);}
 const wheelRadius=buggy?.46:pickup?.44:.39;
 for(const x of [-L*.31,L*.31])for(const z of [-1,1]){
  const pivot=new T.Group(),spin=new T.Group();pivot.position.set(x,wheelRadius,z*W*.48);pivot.add(spin);g.add(pivot);const tire=cylinder(spin,0x172326,0,0,0,wheelRadius,.23,wheelRadius,14);tire.rotation.x=Math.PI/2;const hub=cylinder(spin,0x8a938b,0,0,z*.13,wheelRadius*.52,.035,wheelRadius*.52,8);hub.rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const spoke=box(spin,0x374845,0,0,z*.153,wheelRadius*.9,.045,.02);spoke.rotation.z=i*Math.PI/4;}
  batch?.(spin,spin);g.userData.wheels.push({pivot,spin,front:x>0,radius:wheelRadius});
 }
 for(const side of [-1,1]){box(body,trim,side*L*.49,.62,0,.13,.22,W);for(const z of [-.32,.32]){const light=box(body,side>0?0xe5d6a3:0x9b3c29,side*L*.499,.86,z*W,.025,.18,W*.21,{emissive:side>0?0xe5d6a3:0xb93220,emissiveIntensity:side>0?.5:.15});if(side<0){light.material=light.material.clone();light.material.userData.shared=false;light.userData.breakablePart=true;g.userData.tailLights.push(light);}}}
 for(const z of [-1,1])box(body,paint,L*.15,1.22,z*W*.54,.26,.12,.2);
 batch?.(body,body);contact(g,0,0,L+.5,W+.5,.6);return g;
}
export function animateVehicle(g,v,dt,time){
 const data=g.userData;g.rotation.y=(v.angle||0)-Math.PI/2;
 for(const w of data.wheels||[]){w.pivot.rotation.y=w.front?v.steering||0:0;w.spin.rotation.z-=(v.speed||0)*dt/w.radius;}
 if(data.body){const a=1-Math.exp(-dt*8);data.body.rotation.x+=((v.yaw||0)*(v.speed||0)*.003-data.body.rotation.x)*a;data.body.rotation.z+=(Math.max(-.035,Math.min(.035,-(v.acceleration||0)*.003))-data.body.rotation.z)*a;}
 for(const lamp of data.tailLights||[])lamp.material.emissiveIntensity=v.braking?2:.15;
 for(const [i,lamp]of (data.beacons||[]).entries())lamp.material.emissiveIntensity=v.occupied?(Math.sin(time*7+i*Math.PI)>0?1.8:.15):.15;
}
