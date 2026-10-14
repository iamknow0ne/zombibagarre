import {feetHeight,propHeight} from './Ballistics.js';
import {insideMap,segmentInMap} from './Map.js';
import {waterAt} from './City.js';
import {grappleAvailability} from './Traversal.js';
import {makeRPGWorld} from './RPG.js';
import {seededRandom,lineBlocked,pointBlocked,distance} from './config.js';

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
 return prepareServiceRoof({...layout,cover:[...cover,...platforms],traversal:{anchors,reward}});
}
// One curated roof, not a blanket claim that every decorative roof is walkable.
// These world-space boxes are both the visible parts and the combat colliders.
function prepareServiceRoof(layout){
 if(layout.country)return layout;
 const props=[...layout.cover,...(layout.buildings||[]).map(b=>({...b,kind:'building'}))],spawn=layout.spawn||{x:0,z:3};
 const occupied=new Set(serviceReservations(layout).map(p=>p.buildingId).filter(Boolean));
 const buildings=(layout.buildings||[]).filter(b=>['flat','terrace'].includes(b.roof)&&b.style!=='civic'&&b.h>=3&&b.h<=8.7&&Math.min(b.w,b.d)>=6&&!occupied.has(b.id)).sort((a,b)=>distance(a,spawn)-distance(b,spawn)||a.id.localeCompare(b.id));
 for(const b of buildings)for(const [nx,nz]of [[0,1],[1,0],[0,-1],[-1,0]]){
  const edge={x:b.x+nx*b.w/2,z:b.z+nz*b.d/2},approach={x:edge.x+nx*4,z:edge.z+nz*4,nx,nz};
  if(!insideMap(layout,approach.x,approach.z,1)||waterAt(layout,approach.x,approach.z)||pointBlocked(approach.x,approach.z,1,props))continue;
  if(!(layout.spawnPoints||[]).some(p=>distance(p,approach)<24&&segmentInMap(layout,p,approach,.5)&&!lineBlocked(p,approach,.5,props)))continue;
  const top=b.h+.31,parts=[],part=(role,x,y,z,w,h,d)=>parts.push({id:`prop-${layout.cover.length+parts.length}`,kind:'platform',roofPart:true,ownerId:b.id,role,x,y,z,w,h,d,maxHealth:600,material:role==='hvac'?'metal':'concrete',traversalSupport:true});
  part('deck',b.x,b.h-.01,b.z,b.w+.3,.32,b.d+.3);
  for(const [dx,dz]of [[0,1],[1,0],[0,-1],[-1,0]]){
   const length=dx?b.d:b.w,x=b.x+dx*b.w/2,z=b.z+dz*b.d/2;
   if(dx===nx&&dz===nz){const section=(length-2)/2;for(const side of [-1,1]){const offset=side*(1+section/2);part('parapet',x-dz*offset,top,z+dx*offset,dx?.18:section,.65,dz?.18:section);}}
   else part('parapet',x,top,z,dx?.18:length,.65,dz?.18:length);
  }
  part('hvac',b.x-(nx||1)*b.w*.25,top,b.z-(nz||1)*b.d*.25,1.6,.9,1.2);
  // Do not put the overhanging slab through an adjacent wing or outside the map.
  if((layout.buildings||[]).some(other=>other.id!==b.id&&overlaps(parts[0],other,.05)))continue;
  if(![[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,z])=>insideMap(layout,b.x+x*(b.w/2+.15),b.z+z*(b.d/2+.15),.4)))continue;
  const anchor={id:'service-roof-anchor',supportId:parts[0].id,x:edge.x-nx*1.5,y:top+3.3,z:edge.z-nz*1.5,label:'MAINTENANCE ROOF'};
  const boxes=[...layout.cover.map((p,i)=>({...p,id:`prop-${i}`})),...(layout.buildings||[]),...parts].map(p=>({...p,health:100}));
  if(grappleAvailability({...approach,y:0},anchor,boxes))continue;
  const roof={id:`service-roof:${b.id}`,buildingId:b.id,parts,approach,anchor,top,gap:{...edge,nx,nz,width:2}};
  return {...layout,buildings:layout.buildings.map(p=>p.id===b.id?{...p,serviceRoof:true}:p),cover:[...layout.cover,...parts],traversal:{...layout.traversal,anchors:[...layout.traversal.anchors,anchor],roofs:[roof]}};
 }
 return layout;
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
