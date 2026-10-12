import {generateTopology,rectangleInside,roadOverlaps,roadDistance,withinBoundary} from './CityTopology.js';
import {VEHICLES,vehiclePlan} from './Vehicles.js';
import {generateParcel} from './CityParcels.js';
import {seededRandom, pointBlocked} from './config.js';

export function buildingStyle(x,z,factory){
 if(factory)return 'foundry';
 if(x>55)return 'warehouse';
 if(x===16&&z===16)return 'civic';
 if(x===-16&&z===-16)return 'hotel';
 return ((x+80)/32+(z+80)/32)%3===0?'hotel':'tenement';
}
// One seeded plan drives street rendering, navigation, the atlas and placement.
export function generateCity(seed=73){
 const r=seededRandom(seed^0x7134ab),topology=generateTopology(seed),{boundary,bounds,roads,streetPoints,nodes}=topology;
 const overlap=(a,b,gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
 // A variable inland canal leaves routes around its ends as well as road bridges.
 let canal;
 for(let i=0;i<250&&!canal;i++){const candidate={x:(i%2?1:-1)*(32+r()*83),z:(r()-.5)*120,w:11+r()*3,d:80+r()*25};const crossings=roads.filter(s=>roadOverlaps(candidate,[s]));if(rectangleInside(boundary,candidate,8)&&crossings.length&&crossings.every(s=>Math.abs(s.b.x-s.a.x)>Math.abs(s.b.z-s.a.z)*.9))canal=candidate;}
 const water=canal?[canal]:[],bridges=[];
 if(canal){
  const intervals=[];
  for(const s of roads){if(!roadOverlaps(canal,[s]))continue;const dz=s.b.z-s.a.z,dx=s.b.x-s.a.x;
   const ts=[0,1];if(Math.abs(dx)>1e-6)for(const x of[canal.x-canal.w/2-2,canal.x+canal.w/2+2])ts.push(Math.max(0,Math.min(1,(x-s.a.x)/dx)));
   const zs=ts.filter(t=>Math.abs(s.a.x+dx*t-canal.x)<=canal.w/2+2.001).map(t=>s.a.z+dz*t);if(!zs.length)continue;
   const lo=Math.max(canal.z-canal.d/2,Math.min(...zs)-s.width/2-2),hi=Math.min(canal.z+canal.d/2,Math.max(...zs)+s.width/2+2);if(hi>lo)intervals.push([lo,hi]);
  }
  intervals.sort((a,b)=>a[0]-b[0]);const merged=[];for(const span of intervals){const prev=merged.at(-1);if(prev&&span[0]<=prev[1]+1)prev[1]=Math.max(prev[1],span[1]);else merged.push([...span]);}
  for(const [lo,hi]of merged)bridges.push({x:canal.x,z:(lo+hi)/2,w:canal.w+4,d:hi-lo});
 }
 const waterObstacles=[];if(canal){let start=canal.z-canal.d/2;for(const b of bridges){const lo=b.z-b.d/2;if(lo>start)waterObstacles.push({...canal,z:(start+lo)/2,d:lo-start});start=b.z+b.d/2;}const end=canal.z+canal.d/2;if(end>start)waterObstacles.push({...canal,z:(start+end)/2,d:end-start});}
 const buildings=[],cover=[],parcels=[];const target=24+Math.floor(r()*8);
 for(let attempt=0;attempt<2500&&parcels.length<target;attempt++){
  const x=bounds.minX+15+r()*(bounds.maxX-bounds.minX-30),z=bounds.minZ+15+r()*(bounds.maxZ-bounds.minZ-30),plot={x,z,w:24,d:24};
  if(!rectangleInside(boundary,plot,5)||roadOverlaps(plot,roads,1.8)||roadDistance(plot,roads)>27||Math.hypot(x,z)<27||water.some(w=>overlap(plot,w,4))||parcels.some(p=>overlap(plot,p,4)))continue;
  const index=parcels.length,park=index%8===6,factory=x>bounds.maxX*.38&&z<0,dock=canal&&Math.abs(x-canal.x)<35;
  parcels.push({...plot,park});
  if(park){for(const dx of[-7,7])for(const dz of[-7,7])cover.push({x:x+dx,z:z+dz,w:2,d:2,kind:'planter'});continue;}
  const parts=generateParcel(seed,x,z,buildings.filter(b=>b.primary).length,{factory,dock,civic:buildings.length===0});buildings.push(...parts);
  if(!['courtyard','paired'].includes(parts[0].shape))for(let i=0;i<8;i++){const o={x:x+(r()-.5)*19,z:z+(r()-.5)*19,w:.9,d:.9,kind:'barrel'};if(!pointBlocked(o.x,o.z,3.4,parts)&&!pointBlocked(o.x,o.z,4,cover)){cover.push(o);break;}}
 }
 // Smaller infill houses occupy wedge-shaped gaps between winding streets.
 for(let attempt=0,placed=0;attempt<1600&&placed<14;attempt++){
  const x=bounds.minX+10+r()*(bounds.maxX-bounds.minX-20),z=bounds.minZ+10+r()*(bounds.maxZ-bounds.minZ-20),plot={x,z,w:16,d:16,park:false,compact:true};
  if(!rectangleInside(boundary,plot,5)||roadOverlaps(plot,roads,1.8)||roadDistance(plot,roads)>20||Math.hypot(x,z)<23||water.some(w=>overlap(plot,w,4))||parcels.some(p=>overlap(plot,p,4)))continue;
  parcels.push(plot);const index=buildings.filter(b=>b.primary).length;buildings.push(...generateParcel(seed,x,z,index,{compact:true}));placed++;
 }
 const fleet=Object.keys(VEHICLES),cars=[{x:3,z:6,angle:0}],parking=streetPoints;
 for(let i=0;i<350&&cars.length<22;i++){const p=parking[Math.floor(r()*parking.length)],c={x:p.x+Math.cos(p.angle)*(p.width/2-1.4),z:p.z-Math.sin(p.angle)*(p.width/2-1.4),angle:p.angle};const v=vehiclePlan(fleet[cars.length%fleet.length],c.x,c.z,c.angle);
  if(!rectangleInside(boundary,v,3)||water.some(w=>overlap(v,w,3))||Math.hypot(c.x,c.z)<18||pointBlocked(c.x,c.z,4,buildings)||pointBlocked(c.x,c.z,4,cover)||cars.some(a=>Math.hypot(a.x-c.x,a.z-c.z)<10))continue;cars.push(c);
 }
 cars.forEach((c,i)=>cover.push(vehiclePlan(fleet[i%fleet.length],c.x,c.z,c.angle)));
 const partial={city:true,boundary,bounds,water,bridges};
 const spawnPoints=streetPoints.filter(p=>withinBoundary(boundary,p.x,p.z,2)&&![[0,0],[2,0],[-2,0],[0,2],[0,-2]].some(([dx,dz])=>waterAt(partial,p.x+dx,p.z+dz))&&!pointBlocked(p.x,p.z,2,cover)&&!pointBlocked(p.x,p.z,2,buildings)).map(({x,z})=>({x,z}));
 const landmarks=[{x:0,z:0,name:'SAINT-ROCH',type:'safehouse',color:'#dfb66c'}];
 const names=[['PORT DES CENDRES','dock','#80b9c4'],['LES SERRES','park','#9ab88c'],['LA FONDERIE','factory','#d89567'],['CANOPÉE NOIRE','jungle','#6eaa72'],['LES DENTS BLANCHES','mountain','#c5d4db'],['TERRES ROUGES','badlands','#cea377'],['MARAIS MORT','marsh','#78a295']];
 for(const [i,[name,type,color]]of names.entries()){const angle=i/7*Math.PI*2+r()*.3,target={x:Math.cos(angle)*(bounds.maxX-bounds.minX)*.32,z:Math.sin(angle)*(bounds.maxZ-bounds.minZ)*.32};const options=spawnPoints.filter(p=>landmarks.every(l=>Math.hypot(l.x-p.x,l.z-p.z)>24)).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));if(options[0])landmarks.push({...options[0],name,type,color});}
 return{...partial,seed,mapSeed:seed>>>0,district:0,roads,nodes,streetPoints,parcels,waterObstacles,buildings,cover,spawnPoints,landmarks,road:{x:0,z:0,width:13},facades:[],shape:topology.form};
}
export function waterAt(layout,x,z){
 if(layout.bridges?.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2))return false;
 if(layout.water?.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2))return true;
 if(!layout.city&&[1,7].includes(layout.district)&&layout.boundary){let inside=false;const p=layout.boundary;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i].z>z)!==(p[j].z>z)&&x<(p[j].x-p[i].x)*(z-p[i].z)/(p[j].z-p[i].z)+p[i].x)inside=!inside;return !inside;}
 return false;
}
