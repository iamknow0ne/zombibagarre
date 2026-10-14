import {actorHeight,feetHeight,actorSpan,propSpan,verticalGap,heightGap,boxHit3D} from './Ballistics.js';
import {collisionCandidates} from './SpatialIndex.js';

// Navigation remains planar. Combat uses world-space points and vertical spans.
export const bodyPoint=(actor,fraction=.6)=>({x:actor.x,y:feetHeight(actor)+actorHeight(actor)*fraction,z:actor.z});
export const aimHeight=(aim,fallback)=>aim.perspective?aim.y:aim.id!==undefined?bodyPoint(aim).y:Number.isFinite(aim.y)?aim.y:fallback;
export const muzzlePoint=actor=>({x:actor.x,y:feetHeight(actor)+1.1,z:actor.z});
export const bodyDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,verticalGap(actorSpan(a),actorSpan(b)));
export const blastDistance=(point,actor)=>Math.hypot(point.x-actor.x,point.z-actor.z,heightGap(point.y||0,actorSpan(actor)));
export const meleeSpan=actor=>({min:feetHeight(actor)+.25,max:feetHeight(actor)+1.7});
export const meleeReaches=(actor,target)=>verticalGap(meleeSpan(actor),actorSpan(target))===0;
export const nearGround=(actor,tolerance=.35)=>Math.abs(feetHeight(actor))<=tolerance;
export function combatBlocked(sim,from,to,ignoreId=null){
 return collisionCandidates(sim,from,to).some(o=>o.health>0&&o.id!==ignoreId&&boxHit3D(from,to,o)!==null);
}
export function propBlastPoint(point,prop){const span=propSpan(prop);return{x:Math.max(prop.x-prop.w/2,Math.min(prop.x+prop.w/2,point.x)),y:Math.max(span.min,Math.min(span.max,point.y||0)),z:Math.max(prop.z-prop.d/2,Math.min(prop.z+prop.d/2,point.z))};}
