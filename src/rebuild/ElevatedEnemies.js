import {actorHeight,actorSpan,feetHeight,propSpan,verticalGap} from './Ballistics.js';
import {initTraversal,stepTraversal,supportBelow} from './Traversal.js';
import {collisionCandidates} from './SpatialIndex.js';
import {insideMap} from './Map.js';
import {ARENA,lineBlocked,pointBlocked} from './config.js';

// Opt-in keeps the established street flow field and movement untouched. Keep
// elevated=true after a fall: roof enemies still need vertical collision below.
export function stepElevatedEnemy(sim,e,dt){
 if(!e.elevated||e.health<=0||!(dt>0))return;
 if(!e.traversal)initTraversal(e,{x:e.x,y:feetHeight(e),z:e.z});
 const boxes=collisionCandidates(sim,e,e,e.radius+.1);
 return stepTraversal(e,{},dt,boxes,[],sim.layout.bounds||ARENA,{desiredVelocity:{x:0,z:0},preserveFacing:true,bodyHeight:actorHeight(e)});
}

export const enemiesShareFloor=(a,b)=>a.health>0&&b.health>0&&verticalGap(actorSpan(a),actorSpan(b))===0;

// Loot uses feet coordinates too. Only existing raised drops opt in; a street
// pickup beneath a building must never snap up onto its roof.
export function stepElevatedPickup(sim,item,dt){
 if(!(dt>0)||(!(feetHeight(item)>.001)&&!item.fallVelocity))return;
 dt=Math.min(dt,.05);
 const old=feetHeight(item),boxes=collisionCandidates(sim,item,item,.05);
 const floor=supportBelow({...item,radius:.05},boxes,old+.025).y;
 const velocity=item.fallVelocity||0;
 item.y=Math.max(floor,old+velocity*dt-12*dt*dt);
 item.fallVelocity=item.y<=floor?0:velocity-24*dt;
}

const solidAt=(e,b)=>b.health>0&&feetHeight(e)<propSpan(b).max-.015&&feetHeight(e)+actorHeight(e)>feetHeight(b)+.001;
const floorAt=(e,boxes,x=e.x,z=e.z)=>supportBelow({...e,x,z},boxes,feetHeight(e)+.025);

// Sweep from the previous position instead of ejecting actors from a 2D box:
// their supporting building occupies the same X/Z rectangle beneath their feet.
export function moveElevatedEnemy(sim,e,dx,dz,{avoidEdges=false}={}){
 if(!e.elevated)return false;
 const boxes=collisionCandidates(sim,e,{x:e.x+dx,z:e.z+dz},e.radius+.1),bounds=sim.layout.bounds||ARENA;
 const y=feetHeight(e),r=e.radius,oldX=e.x,oldZ=e.z;
 for(const [axis,delta] of [['x',dx],['z',dz]]){
  if(!delta)continue;
  const other=axis==='x'?'z':'x',size=axis==='x'?'w':'d',cross=axis==='x'?'d':'w',old=e[axis];
  let next=Math.max(bounds[axis==='x'?'minX':'minZ']+r,Math.min(bounds[axis==='x'?'maxX':'maxZ']-r,old+delta));
  for(const b of boxes){
   if(!solidAt(e,b)||Math.abs(e[other]-b[other])>=b[cross]/2+r-.001)continue;
   const lo=b[axis]-b[size]/2-r,hi=b[axis]+b[size]/2+r;
   if(delta>0&&old<=lo+.001&&next>lo)next=Math.min(next,lo);
   else if(delta<0&&old>=hi-.001&&next<hi)next=Math.max(next,hi);
  }
  e[axis]=next;
  let unsupported=false;
  if(avoidEdges&&e.grounded&&y>.065){
   const steps=Math.ceil(Math.abs(next-old)/.15);
   for(let i=1;i<=steps;i++){
    const point={x:e.x,z:e.z,[axis]:old+(next-old)*i/steps};
    if(Math.abs(floorAt(e,boxes,point.x,point.z).y-y)>.065){unsupported=true;break;}
   }
  }
  if(!insideMap(sim.layout,e.x,e.z,r)||unsupported)e[axis]=old;
 }
 const floor=floorAt(e,boxes);
 if(e.grounded&&Math.abs(floor.y-y)>.065){e.grounded=false;e.supportId=null;}
 return Math.hypot(e.x-oldX,e.z-oldZ)>.00001;
}

// A small roof has only a handful of cover boxes. A local visibility graph
// routes around HVAC/parapets without allocating a city-sized street flow field.
// Every edge is supported at the current floor: voluntary pursuit never walks
// off the roof, while knockback/crowding may push an actor through the access gap.
export function elevatedWaypoint(sim,e,target){
 if(!e.elevated||!e.grounded||feetHeight(e)<.1)return null;
 const floor=supportBelow(e,collisionCandidates(sim,e,e,e.radius+.1));
 const support=sim.obstacles.find(b=>b.id===floor.id);
 if(!support)return null;
 const margin=e.radius+.06,end={x:Math.max(support.x-support.w/2+margin,Math.min(support.x+support.w/2-margin,target.x)),z:Math.max(support.z-support.d/2+margin,Math.min(support.z+support.d/2-margin,target.z))};
 const boxes=collisionCandidates(sim,{x:support.x-support.w/2,z:support.z-support.d/2},{x:support.x+support.w/2,z:support.z+support.d/2},e.radius+.1);
 const blockers=boxes.filter(b=>solidAt(e,b));
 const supported=p=>Math.abs(floorAt(e,boxes,p.x,p.z).y-feetHeight(e))<.065&&!pointBlocked(p.x,p.z,e.radius+.01,blockers);
 const clear=(a,b)=>{
  if(lineBlocked(a,b,e.radius+.01,blockers))return false;
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4);
  for(let i=1;i<=steps;i++)if(!supported({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps}))return false;
  return true;
 };
 if(supported(end)&&clear(e,end))return end;
 const nodes=[{x:e.x,z:e.z},end];
 for(const b of blockers)for(const x of [-1,1])for(const z of [-1,1]){
  const p={x:b.x+x*(b.w/2+margin),z:b.z+z*(b.d/2+margin)};
  if(supported(p)&&Math.abs(p.x-support.x)<support.w/2&&Math.abs(p.z-support.z)<support.d/2)nodes.push(p);
 }
 // A target inside cover cannot be reached; approach the nearest reachable
 // cover corner instead, which also gives ranged enemies another firing angle.
 let goal=1;if(!supported(end)){goal=-1;let best=Infinity;for(let i=2;i<nodes.length;i++){const d=Math.hypot(nodes[i].x-end.x,nodes[i].z-end.z);if(d<best){best=d;goal=i;}}if(goal<0)return null;}
 const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();costs[0]=0;
 for(let n=0;n<nodes.length;n++){
  let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;
  if(current<0||!Number.isFinite(costs[current]))break;
  if(current===goal){while(previous[current]>0)current=previous[current];return nodes[current];}
  visited.add(current);
  for(let i=1;i<nodes.length;i++)if(!visited.has(i)){
   const cost=costs[current]+Math.hypot(nodes[i].x-nodes[current].x,nodes[i].z-nodes[current].z);
   if(cost<costs[i]&&clear(nodes[current],nodes[i])){costs[i]=cost;previous[i]=current;}
  }
 }
 return null;
}
