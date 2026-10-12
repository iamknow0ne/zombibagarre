import {clamp} from './config.js';
// Dimensions are metres; speed is m/s. Handling stays readable in the city camera.
export const VEHICLES={
 sedan:{name:'RAVEN SEDAN',width:1.9,length:4.3,height:1.55,speed:20,reverse:6,accel:9,brake:18,steer:.57,grip:9,health:340,mass:1,color:0x67867a},
 coupe:{name:'COMET GT',width:1.85,length:4.1,height:1.25,speed:28,reverse:7,accel:14,brake:23,steer:.55,grip:10,health:260,mass:.85,color:0xb66b3e},
 patrol:{name:'PATROL INTERCEPTOR',width:1.95,length:4.6,height:1.5,speed:25,reverse:7,accel:11,brake:22,steer:.55,grip:10,health:430,mass:1.15,color:0x405966},
 van:{name:'COURIER VAN',width:2,length:4.8,height:2.25,speed:17,reverse:5,accel:7,brake:17,steer:.54,grip:8,health:440,mass:1.4,color:0xc0aa79},
 pickup:{name:'BADLANDS PICKUP',width:2,length:4.7,height:1.85,speed:21,reverse:6,accel:9,brake:19,steer:.58,grip:8,health:480,mass:1.4,color:0x9d6145},
 ambulance:{name:'RESCUE AMBULANCE',width:2.05,length:5.15,height:2.4,speed:19,reverse:5,accel:8,brake:18,steer:.51,grip:8,health:510,mass:1.6,color:0xc1c1a8},
 armored:{name:'BASTION ARMOURED',width:2.15,length:5.1,height:2.05,speed:15,reverse:4.5,accel:6,brake:16,steer:.5,grip:10,health:850,mass:2.2,color:0x69715a},
 buggy:{name:'DUNE BUGGY',width:1.8,length:3.4,height:1.6,speed:24,reverse:7,accel:13,brake:21,steer:.68,grip:7,health:230,mass:.65,color:0xc49343}
};
export const vehicleSpec=v=>VEHICLES[v.vehicleType]||VEHICLES.sedan;
export function vehicleBounds(spec,angle){const s=Math.abs(Math.sin(angle)),c=Math.abs(Math.cos(angle));return{w:spec.width*c+spec.length*s,d:spec.width*s+spec.length*c};}
export function vehiclePlan(type,x,z,angle=0){const s=VEHICLES[type];return{x,z,...vehicleBounds(s,angle),kind:'car',driveable:true,vehicleType:type,vehicleName:s.name,angle,rotation:angle-Math.PI/2,color:s.color};}
// Four separating axes: oriented vehicle against the simulation's obstacle box.
export function vehicleOverlaps(v,o,x=v.x,z=v.z,angle=v.angle||0,padding=.04){
 const s=vehicleSpec(v),sn=Math.sin(angle),cs=Math.cos(angle),dx=o.x-x,dz=o.z-z,a=s.width/2+padding,b=s.length/2+padding,ow=o.w/2,od=o.d/2;
 return Math.abs(dx)<a*Math.abs(cs)+b*Math.abs(sn)+ow&&Math.abs(dz)<a*Math.abs(sn)+b*Math.abs(cs)+od&&Math.abs(dx*cs-dz*sn)<a+ow*Math.abs(cs)+od*Math.abs(sn)&&Math.abs(dx*sn+dz*cs)<b+ow*Math.abs(sn)+od*Math.abs(cs);
}
export function vehicleCorners(v,x=v.x,z=v.z,angle=v.angle||0){const s=vehicleSpec(v),sn=Math.sin(angle),cs=Math.cos(angle);return[-1,1].flatMap(a=>[-1,1].map(b=>({x:x+a*s.width/2*cs+b*s.length/2*sn,z:z-a*s.width/2*sn+b*s.length/2*cs})));}
export function assistedDrive(v,x,z,handbrake=false){const strength=Math.min(1,Math.hypot(x,z)),target=Math.atan2(x,z),delta=Math.atan2(Math.sin(target-v.angle),Math.cos(target-v.angle));return{assisted:true,heading:strength>.08?target:null,throttle:strength>.08?strength:0,brake:0,steer:strength>.08?clamp(delta*1.7,-1,1):0,handbrake:handbrake||strength<=.08};}
// Arcade point-to-drive: turn even at rest, shed speed before a tight corner,
// and remove sideways drift. Collision resolution remains in Driving.js.
function stepAssistedVehicle(v,control,dt){
 const s=vehicleSpec(v),old=v.speed||0,braking=!!control.handbrake,reverse=(control.brake||0)>.05;
 const delta=Number.isFinite(control.heading)?Math.atan2(Math.sin(control.heading-(v.angle||0)),Math.cos(control.heading-(v.angle||0))):0;
 const turnRate=clamp(2.8/Math.sqrt(s.mass),2.2,3.2);
 const turn=braking?0:clamp(delta*(1-Math.exp(-dt*9)),-turnRate*dt,turnRate*dt),angle=(v.angle||0)+turn;
 const alignment=Math.max(.12,Math.cos(Math.min(Math.PI/2,Math.abs(delta)))**2);
 const target=braking?0:reverse?-s.reverse*clamp(control.brake,0,1)*alignment:Math.min(18,s.speed*.85)*clamp(control.throttle||0,0,1)*alignment;
 const slowing=old*target<0||Math.abs(target)<Math.abs(old),rate=slowing?Math.max(28,s.brake*1.6):Math.max(10,s.accel);
 const speed=old+clamp(target-old,-rate*dt,rate*dt);
 v.speed=Math.abs(speed)<.015?0:speed;v.vx=Math.sin(angle)*v.speed;v.vz=Math.cos(angle)*v.speed;
 v.steering=(v.steering||0)+(clamp(delta,-1,1)*s.steer-(v.steering||0))*(1-Math.exp(-dt*12));
 v.braking=braking||slowing;v.handbrake=braking;v.reverseHold=0;v.acceleration=(v.speed-old)/dt;v.yaw=turn/dt;v.slip=0;
 return{angle,dx:v.vx*dt,dz:v.vz*dt};
}
export function stepVehicle(v,control,dt,sensitivity=1){
 if(control.assisted)return stepAssistedVehicle(v,control,dt);
 const s=vehicleSpec(v),old=v.speed||0,throttle=clamp(control.throttle||0,0,1),brake=clamp(control.brake||0,0,1),handbrake=!!control.handbrake;
 let speed=old;
 if(handbrake){speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-s.brake*.9*dt);v.reverseHold=0;}
 else if(brake>.05){
  if(speed>.12){speed=Math.max(0,speed-s.brake*brake*dt);v.reverseHold=0;}
  else{v.reverseHold=(v.reverseHold||0)+dt;speed=v.reverseHold>.22?Math.max(-s.reverse,speed-s.accel*.65*brake*dt):0;}
 }else if(throttle>.01){v.reverseHold=0;speed+=throttle*(speed<-.1?s.brake:s.accel*(1-.35*Math.max(0,speed)/s.speed))*dt;}
 else{v.reverseHold=0;speed=Math.sign(speed)*Math.max(0,Math.abs(speed)-(1.8+Math.abs(speed)*.045)*dt);}
 speed=clamp(speed,-s.reverse,s.speed);if(Math.abs(speed)<.015)speed=0;
 const target=clamp((control.steer||0)*sensitivity,-1,1)*s.steer/(1+Math.abs(speed)*.045);
 v.steering=(v.steering||0)+(target-(v.steering||0))*(1-Math.exp(-dt*10));
 const yaw=clamp(speed/(s.length*.64)*Math.tan(v.steering)*(handbrake?1.5:1),-1.65,1.65);
 const angle=(v.angle||0)+yaw*dt,grip=Math.abs(speed)<1?12:handbrake?3.2:s.grip;
 const lateral=((v.vx??Math.sin(v.angle||0)*old)*Math.cos(angle)-(v.vz??Math.cos(v.angle||0)*old)*Math.sin(angle))*Math.exp(-dt*grip);
 v.vx=Math.sin(angle)*speed+Math.cos(angle)*lateral;v.vz=Math.cos(angle)*speed-Math.sin(angle)*lateral;
 if(Math.abs(speed)<.04&&Math.hypot(v.vx,v.vz)<.12)v.vx=v.vz=0;
 v.speed=speed;v.braking=brake>.05&&old>0||handbrake;v.handbrake=handbrake;v.acceleration=(speed-old)/dt;v.yaw=yaw;
 v.slip=Math.abs(v.vx*Math.cos(angle)-v.vz*Math.sin(angle));return{angle,dx:v.vx*dt,dz:v.vz*dt};
}
