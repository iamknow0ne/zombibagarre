// Split geometric crossings into real junctions. Preserve the seeded street shapes.
export function connectStreets(roads){
 const cuts=roads.map(()=>[0,1]),cross=(ax,az,bx,bz)=>ax*bz-az*bx;
 for(let i=0;i<roads.length;i++)for(let j=i+1;j<roads.length;j++){
  const a=roads[i],b=roads[j],ux=a.b.x-a.a.x,uz=a.b.z-a.a.z,vx=b.b.x-b.a.x,vz=b.b.z-b.a.z,d=cross(ux,uz,vx,vz);if(Math.abs(d)<1e-6)continue;
  const x=b.a.x-a.a.x,z=b.a.z-a.a.z,t=cross(x,z,vx,vz)/d,u=cross(x,z,ux,uz)/d;
  if(t>=-1e-6&&t<=1.000001&&u>=-1e-6&&u<=1.000001){cuts[i].push(Math.max(0,Math.min(1,t)));cuts[j].push(Math.max(0,Math.min(1,u)));}
 }
 const nodes=[],segments=[],node=p=>{let n=nodes.find(n=>Math.hypot(n.x-p.x,n.z-p.z)<.02);if(!n){n={...p,arms:[]};nodes.push(n);}return n;};
 roads.forEach((s,i)=>{const ts=[...new Set(cuts[i].map(t=>+t.toFixed(7)))].sort((a,b)=>a-b);for(let k=1;k<ts.length;k++){
  const at=t=>({x:s.a.x+(s.b.x-s.a.x)*t,z:s.a.z+(s.b.z-s.a.z)*t}),a=node(at(ts[k-1])),b=node(at(ts[k]));if(Math.hypot(a.x-b.x,a.z-b.z)<.05)continue;
  const seg={...s,id:`road-${segments.length}`,a:{x:a.x,z:a.z},b:{x:b.x,z:b.z}};segments.push(seg);
  for(const [p,q]of [[a,b],[b,a]]){const angle=Math.atan2(q.x-p.x,q.z-p.z);if(!p.arms.some(v=>Math.cos(v.angle-angle)>.995))p.arms.push({angle,width:s.width,length:Math.hypot(q.x-p.x,q.z-p.z)});}
 }});
 return {roads:segments,nodes:nodes.filter(n=>n.arms.length).map(n=>({...n,junction:n.arms.length>=3}))};
}
export function junctionClearance(p,nodes){return nodes.some(n=>n.junction&&Math.hypot(n.x-p.x,n.z-p.z)<Math.max(...n.arms.map(a=>a.width))*.8+2);}
export function crossingApproaches(nodes){
 const result=[];for(const n of nodes.filter(n=>n.junction))for(const arm of n.arms){
  const offset=Math.max(...n.arms.map(a=>a.width))*.75+2;
  if(arm.length<offset*2+3)continue;
  // Avoid tiny triangular markings between two near-parallel branches.
  if(n.arms.some(other=>other!==arm&&Math.cos(other.angle-arm.angle)>.75))continue;
  const x=n.x+Math.sin(arm.angle)*offset,z=n.z+Math.cos(arm.angle)*offset;
  if(nodes.some(other=>other!==n&&other.junction&&Math.hypot(x-other.x,z-other.z)<offset))continue;
  result.push({x,z,angle:arm.angle,width:arm.width,node:n});
 }return result;
}
