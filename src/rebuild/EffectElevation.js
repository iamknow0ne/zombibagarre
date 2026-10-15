import {supportBelow} from './Traversal.js';
import {collisionCandidates} from './SpatialIndex.js';

// Cosmetic fragments share the live support geometry, without affecting combat
// randomness or retaining a destroyed roof as an invisible floor.
export function effectFloor(sim,point,ceiling=point.y){
 if(!(ceiling>.08))return 0;
 const nearby=collisionCandidates(sim,point,point);
 return supportBelow({...point,radius:0},nearby,ceiling+.025).y;
}
export function fragmentFloor(sim,e,dt){
 const p=e.mesh.position,drag=e.drag??.6,travel=drag>0?(1-Math.exp(-drag*dt))/drag:dt;
 return effectFloor(sim,{x:p.x+e.vx*travel,y:p.y,z:p.z+e.vz*travel},p.y);
}
export function stepRemainsElevation(corpse,sim,dt){
 const old=corpse.baseY||0;if(!old&&!corpse.fallVelocity)return;
 const floor=effectFloor(sim,corpse.mesh.position,old);
 if(old>floor+.025){corpse.fallVelocity=(corpse.fallVelocity||0)-24*dt;corpse.baseY=Math.max(floor,old+corpse.fallVelocity*dt);}
 else corpse.baseY=floor;
 if(corpse.baseY<=floor+.001)corpse.fallVelocity=0;
 corpse.mesh.position.y+=corpse.baseY-old;
}
