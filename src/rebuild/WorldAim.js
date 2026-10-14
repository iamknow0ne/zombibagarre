import {boxHit3D,bodyHit3D} from './Ballistics.js';

// Pick collision volumes along the camera ray, not the ground point behind a
// roof. Movement clicks deliberately keep their separate ground projection.
export function worldRayTarget(origin,direction,sim,range=240){
 const end={x:origin.x+direction.x*range,y:origin.y+direction.y*range,z:origin.z+direction.z*range};let fraction=1,targetId=null,propId=null;
 for(const prop of sim.obstacles||sim.props||[]){if(prop.health<=0)continue;const t=boxHit3D(origin,end,prop);if(t!==null&&t<fraction){fraction=t;targetId=null;propId=prop.id;}}
 for(const enemy of sim.enemies||[]){if(enemy.health<=0)continue;const t=bodyHit3D(origin,end,enemy,.04);if(t!==null&&t<fraction){fraction=t;targetId=enemy.id;propId=null;}}
 if(direction.y<0){const ground=(origin.y-.08)/(origin.y-end.y);if(ground>=0&&ground<fraction){fraction=ground;targetId=propId=null;}}
 return{x:origin.x+(end.x-origin.x)*fraction,y:origin.y+(end.y-origin.y)*fraction,z:origin.z+(end.z-origin.z)*fraction,perspective:true,targetId,propId};
}
