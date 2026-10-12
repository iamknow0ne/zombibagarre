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
