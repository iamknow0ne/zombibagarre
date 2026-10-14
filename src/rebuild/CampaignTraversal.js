import {feetHeight,propHeight} from './Ballistics.js';
import {insideMap} from './Map.js';
import {makeRPGWorld} from './RPG.js';
import {seededRandom,lineBlocked} from './config.js';

const overlaps=(a,b,gap=0)=>Math.abs(a.x-b.x)<(a.w+(b.w||0))/2+gap&&Math.abs(a.z-b.z)<(a.d+(b.d||0))/2+gap;
const serviceReservations=layout=>[...makeRPGWorld({...layout,cover:layout.cover||[],buildings:layout.buildings||[],spawnPoints:layout.spawnPoints||[]}),...(layout.services||[]),...(layout.places||[])];
// Reserve a small, reachable service-yard route without changing the seeded city
// geometry or moving existing scenery. Rendering and play consume this one plan.
export function prepareTraversalLayout(layout){
 if(!layout?.city||layout.traversal)return layout;
 const cover=[...(layout.cover||[])],solids=[...cover,...(layout.buildings||[])],spawn=layout.spawn||{x:0,z:3};
 const reserved=[...(layout.landmarks||[]),...serviceReservations(layout)].map(p=>({...p,w:p.w||5,d:p.d||5}));
 const random=seededRandom((layout.mapSeed??layout.seed??0)^0x37a911),offset=random()*Math.PI*2,candidates=[];
 for(const radius of [12,18,24,30])for(let i=0;i<48;i++){const a=offset+i/48*Math.PI*2;candidates.push({x:Math.round((spawn.x+Math.cos(a)*radius)*10)/10,z:Math.round((spawn.z+Math.sin(a)*radius)*10)/10});}
 const platforms=[];
 for(const point of candidates){
  const p={...point,kind:'platform',w:3.6,d:2.8,h:1.1,traversalSupport:true,maxHealth:600,material:'concrete'};
  if([...solids,...platforms].some(o=>overlaps(p,o,2))||reserved.some(o=>overlaps(p,o,2)))continue;
  // Conservatively reserve entire water bounds, including bridge approaches.
  if((layout.water||[]).some(w=>overlaps(p,w,1.5)))continue;
  if(![[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,z])=>insideMap(layout,p.x+x*p.w/2,p.z+z*p.d/2,1.5)))continue;
  const approach=platforms[0]||spawn;if(Math.hypot(p.x-approach.x,p.z-approach.z)>21||lineBlocked(approach,p,.5,solids))continue;
  const proposed={...layout,cover:[...cover,...platforms,p]};
  if(serviceReservations(proposed).some(q=>overlaps(p,{...q,w:q.w||5,d:q.d||5},2)))continue;
  platforms.push(p);if(platforms.length===2)break;
 }
 const anchors=platforms.map((p,i)=>({id:`service-anchor-${i}`,supportId:`prop-${cover.length+i}`,x:p.x,y:p.h+2.1,z:p.z,label:i?'SERVICE CACHE':'SERVICE GANTRY'}));
 const last=platforms.at(-1),reward=last?{x:last.x,y:last.h,z:last.z,supportId:anchors.at(-1).supportId,claimed:false}:null;
 return {...layout,cover:[...cover,...platforms],traversal:{anchors,reward}};
}
// All solid tops must catch falling actors, including unmarked cover: treating
// a solid roof as non-standable lets a descending actor fall through its volume.
// Only authored supports receive route anchors. Existing procedural prop heights
// remain collision approximations until their render geometry is reconciled.
const collisionViews=new WeakMap();
export function campaignTraversalBoxes(sim){
 const props=sim.props||[];let cache=collisionViews.get(sim);
 if(!cache||cache.source!==props){cache={source:props,boxes:[]};collisionViews.set(sim,cache);}
 const boxes=cache.boxes;boxes.length=props.length;
 for(let i=0;i<props.length;i++){
  const p=props[i],view=boxes[i]||(boxes[i]={});
  // Only physics fields belong in this view. Refresh every call: vehicles move,
  // props collapse and lists can replace/reorder entries without changing length.
  view.id=p.id;view.x=p.x;view.y=feetHeight(p);view.z=p.z;view.w=p.w;view.d=p.d;view.h=propHeight(p);view.health=p.health;view.standable=true;
 }
 return boxes;
}
