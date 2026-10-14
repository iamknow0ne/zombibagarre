// First contact along the swept segment, independent of enemy array order.
export function circleContact(a,b,o,radius){const dx=b.x-a.x,dz=b.z-a.z,ox=a.x-o.x,oz=a.z-o.z,A=dx*dx+dz*dz,C=ox*ox+oz*oz-radius*radius;if(C<=0)return 0;if(A<1e-12)return null;const B=2*(ox*dx+oz*dz),D=B*B-4*A*C;if(D<0)return null;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:null;}
export function boxNormal(point,box){const x=Math.abs(Math.abs(point.x-box.x)-box.w/2),z=Math.abs(Math.abs(point.z-box.z)-box.d/2);return x<z?{x:Math.sign(point.x-box.x)||1,z:0}:{x:0,z:Math.sign(point.z-box.z)||1};}
export function reflectVelocity(v,n,retention=.7){const dot=v.vx*n.x+v.vz*n.z;return{vx:(v.vx-2*dot*n.x)*retention,vz:(v.vz-2*dot*n.z)*retention};}
// Exact ballistic integration between collisions; restitution and friction act once on contact.
export function stepFragment(e,dt,ground=.065){
 const p=e.mesh.position,gravity=e.gravity??14,drag=e.drag??.6,decay=Math.exp(-drag*dt),travel=drag>0?(1-decay)/drag:dt;
 p.x+=e.vx*travel;p.z+=e.vz*travel;p.y+=e.vy*dt-gravity*dt*dt*.5;e.vx*=decay;e.vz*=decay;e.vy-=gravity*dt;
 if(p.y<ground&&e.vy<0){p.y=ground;e.vy=Math.abs(e.vy)*(e.bounce??.2);e.vx*=.68;e.vz*=.68;e.spin=(e.spin||0)*.55;if(e.vy<.5)e.vy=0;if(Math.hypot(e.vx,e.vz)<.12)e.vx=e.vz=0;return true;}return false;
}

// Swept volumes keep fast rounds from tunnelling through cover or bodies.
export const actorHeight=e=>e.bossHeight||(e.crawling?.65:e.type==='brute'?2.5:1.85);
export const propHeight=o=>o.h||({car:1.8,barrier:1.1,barrel:1.3,crate:1.5,rock:2.2,tree:6,planter:4,building:12}[o.kind]||1.5);
// Actor coordinates describe their feet; prop coordinates describe the bottom
// of their collision box. Missing height remains the original ground plane.
export const feetHeight=e=>Number.isFinite(e?.y)?e.y:0;
export const actorSpan=e=>({min:feetHeight(e),max:feetHeight(e)+actorHeight(e)});
export const propSpan=o=>({min:feetHeight(o),max:feetHeight(o)+propHeight(o)});
export const verticalGap=(a,b)=>Math.max(0,a.min-b.max,b.min-a.max);
export const heightGap=(y,span)=>Math.max(0,span.min-y,y-span.max);

function interval(a,d,min,max){if(Math.abs(d)<1e-9)return a>=min&&a<=max?[-Infinity,Infinity]:null;const t1=(min-a)/d,t2=(max-a)/d;return[Math.min(t1,t2),Math.max(t1,t2)];}
function overlap(ranges){if(ranges.some(r=>!r))return null;const enter=Math.max(0,...ranges.map(r=>r[0])),exit=Math.min(1,...ranges.map(r=>r[1]));return enter<=exit?enter:null;}
export function boxHit3D(a,b,o){const span=propSpan(o);return overlap([interval(a.x,b.x-a.x,o.x-o.w/2,o.x+o.w/2),interval(a.z,b.z-a.z,o.z-o.d/2,o.z+o.d/2),interval(a.y,b.y-a.y,span.min,span.max)]);}
export function bodyHit3D(a,b,e,padding=0){const span=actorSpan(e),dx=b.x-a.x,dz=b.z-a.z,x=a.x-e.x,z=a.z-e.z,r=e.radius+padding,A=dx*dx+dz*dz,B=2*(x*dx+z*dz),C=x*x+z*z-r*r;let horizontal;if(A<1e-12)horizontal=C<=0?[-Infinity,Infinity]:null;else{const disc=B*B-4*A*C;if(disc<0)return null;const root=Math.sqrt(disc);horizontal=[(-B-root)/(2*A),(-B+root)/(2*A)];}return overlap([horizontal,interval(a.y,b.y-a.y,span.min,span.max)]);}
export function perspectiveTarget(origin,yaw,pitch,props=[],enemies=[],range=90){const end={x:origin.x+Math.sin(yaw)*Math.cos(pitch)*range,y:origin.y-Math.sin(pitch)*range,z:origin.z+Math.cos(yaw)*Math.cos(pitch)*range};let t=1,targetId=null;
 for(const o of props){if(o.health<=0)continue;const hit=boxHit3D(origin,end,o);if(hit!==null&&hit<t){t=hit;targetId=null;}}
 for(const e of enemies){if(e.health<=0)continue;const hit=bodyHit3D(origin,end,e,.04);if(hit!==null&&hit<t){t=hit;targetId=e.id;}}
 if(end.y<.08){const ground=(origin.y-.08)/(origin.y-end.y);if(ground>=0&&ground<t){t=ground;targetId=null;}}
 return{x:origin.x+(end.x-origin.x)*t,y:origin.y+(end.y-origin.y)*t,z:origin.z+(end.z-origin.z)*t,perspective:true,targetId};
}
