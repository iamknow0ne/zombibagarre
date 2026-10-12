import {vehicleSpec,vehicleBounds,vehicleCorners,vehicleOverlaps,assistedDrive,stepVehicle} from './Vehicles.js';
import {insideMap} from './Map.js';
import {waterAt} from './City.js';
export function driveVehicle(sim,dt,mx,mz,input){
 const p=sim.player,v=sim.props.find(v=>v.id===p.vehicleId);if(!v||v.health<=0){p.vehicleId=null;p.radius=.4;return;}
 const spec=vehicleSpec(v),control=input.drive||assistedDrive(v,mx,mz,input.brake),oldSpeed=Math.abs(v.speed||0),old={x:v.x,z:v.z};
 const motion=stepVehicle(v,control,dt,input.steerSensitivity||1),obstacles=sim.obstacles.filter(o=>o!==v);
 const clear=(x,z,a)=>vehicleCorners(v,x,z,a).every(c=>insideMap(sim.layout,c.x,c.z,.06))&&!obstacles.some(o=>vehicleOverlaps(v,o,x,z,a));
 // Sweep in short steps and reject obstructed rotation; no teleporting through corners.
 const steps=Math.max(1,Math.ceil(Math.hypot(motion.dx,motion.dz)/.25));let hit=false;
 for(let i=0;i<steps;i++){
  const a=v.angle+(motion.angle-v.angle)/(steps-i),x=v.x+motion.dx/steps,z=v.z+motion.dz/steps;
  if(vehicleCorners(v,x,z,a).some(c=>[[0,0],[.08,0],[-.08,0],[0,.08],[0,-.08]].some(([dx,dz])=>waterAt(sim.layout,c.x+dx,c.z+dz)))){
   sim.emit('splash',{x,z,power:7});v.sunk=true;sim.damageProp(v,v.health+1);p.x=v.lastDry?.x??old.x;p.z=v.lastDry?.z??old.z;p.vehicleId=null;p.radius=.4;sim.emit('vehicle',{message:'VEHICLE SUBMERGED'});return;
  }
  if(clear(v.x,v.z,a))v.angle=a;
  if(clear(x,z,v.angle)){v.x=x;v.z=z;}else{hit=true;break;}
 }
 if(hit){const impact=Math.max(oldSpeed,Math.hypot(v.vx,v.vz));v.speed*=.12;v.vx=v.vz=0;if(impact>2.5&&sim.time>(v.impactAfter||0)){v.impactAfter=sim.time+.3;sim.damageProp(v,impact*1.5);sim.emit('vehicle-hit',{x:v.x,z:v.z,power:impact});}}
 Object.assign(v,vehicleBounds(spec,v.angle));p.x=v.x;p.z=v.z;p.angle=v.angle;
 if(!v.navPosition||Math.hypot(v.x-v.navPosition.x,v.z-v.navPosition.z)>1){sim.navigation.clear();v.navPosition={x:v.x,z:v.z};sim.geometryRevision++;}
 // Retain an on-foot safe location for emergency ejection at the canal.
 if(insideMap(sim.layout,p.x,p.z,.5))v.lastDry={x:p.x,z:p.z};
 const speed=Math.abs(v.speed);for(const e of sim.enemies)if(e.health>0&&vehicleOverlaps(v,{x:e.x,z:e.z,w:e.radius*2,d:e.radius*2},v.x,v.z,v.angle,.08)&&sim.time>(e.ramAfter||0)&&speed>3){e.ramAfter=sim.time+.5;sim.damageEnemy(e,speed*14*spec.mass,v.vx,v.vz,{kind:'explosion'});v.speed*=.95;}
 if(v.slip>1.6&&speed>5&&sim.time>(v.skidAfter||0)){v.skidAfter=sim.time+.16;sim.emit('vehicle-skid',{x:v.x,z:v.z,angle:v.angle,power:Math.min(1,v.slip/6)});}
 p.moving=speed>.1;
}
