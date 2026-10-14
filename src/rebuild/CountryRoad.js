import {seededRandom,pointBlocked,distance,lineBlocked} from './config.js';
import {connectStreets} from './StreetGraph.js';
import {rectangleInside,roadOverlaps} from './CityTopology.js';

const overlaps=(a,b,gap=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+gap&&Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
const rounded=n=>Math.round(n*100)/100;

// One plan serves outdoor rendering, collision, navigation and region encounters.
// `city` selects the outdoor renderer; `country` selects the regional director.
// This is deterministic layout data only: no quest claims, spawns or save writes.
export function generateCountryRoad(seed=73){
 const mapSeed=((seed>>>0)^0x524f4144)>>>0,r=seededRandom(mapSeed),bend=r()<.5?-1:1;
 const path=[{x:0,z:16},{x:0,z:-6}];
 for(let i=2;i<7;i++)path.push({x:rounded(bend*(Math.sin((i-1)*.88)*13+(r()-.5)*7)),z:rounded(-6-(i-1)*(23+r()*2))});
 // A monotonic longitudinal ribbon cannot self-intersect. Wider middle verges
 // hold the stop; changing both banks avoids a rectangular arena silhouette.
 const banks=path.map((p,i)=>({left:(i>=3&&i<=5?36:24)+r()*5,right:(i>=3&&i<=5?36:24)+r()*5}));
 const boundary=[...path.map((p,i)=>({x:rounded(p.x-banks[i].left),z:p.z})),...path.map((p,i)=>({x:rounded(p.x+banks[i].right),z:p.z})).reverse()];
 const bounds={minX:Math.min(...boundary.map(p=>p.x)),maxX:Math.max(...boundary.map(p=>p.x)),minZ:Math.min(...boundary.map(p=>p.z)),maxZ:Math.max(...boundary.map(p=>p.z))};
 const width=8+r()*1.2,{roads,nodes}=connectStreets(path.slice(1).map((b,i)=>({a:path[i],b,width,kind:'country'})));
 const streetPoints=[];for(const road of roads){const length=distance(road.a,road.b),angle=Math.atan2(road.b.x-road.a.x,road.b.z-road.a.z),steps=Math.ceil(length/4);for(let i=0;i<steps;i++){const t=(i+.5)/steps;streetPoints.push({x:road.a.x+(road.b.x-road.a.x)*t,z:road.a.z+(road.b.z-road.a.z)*t,angle,width:road.width,roadId:road.id});}}
 const gate={x:0,z:3,angle:Math.PI},supply={...path[4]},encounterSpawns=[
  {type:'walker',x:supply.x-3,z:supply.z-7},
  {type:'runner',x:supply.x+3,z:supply.z+8},
  {type:'walker',x:supply.x+6,z:supply.z-3},
  {type:'armored',x:supply.x-6,z:supply.z+3},
 ];
 const reserved=[{...gate,w:12,d:15},{...supply,w:7,d:7},...encounterSpawns.map(p=>({...p,w:5,d:5}))];
 const buildings=[],cover=[],parcels=[];
 const free=(o,gap=1.5)=>rectangleInside(boundary,o,3)&&!roadOverlaps(o,roads,1.7)&&!reserved.some(p=>overlaps(o,p,1.2))&&![...buildings,...cover].some(p=>overlaps(o,p,gap));
 const labels=['OLD MILL / STORES','ROADKEEPER / WORKSHOP','MILL HOUSE'];
 // Axis-aligned building masses match the existing renderer and destruction
 // colliders. Restrained heights keep this a rural stop, not another city block.
 const positions=[];for(const dz of [-17,17,-29,29])for(const dx of [19,-19,25,-25])positions.push({x:supply.x+dx,z:supply.z+dz});
 for(const position of positions){if(buildings.length===3)break;const i=buildings.length,w=7+r()*2,d=7+r()*3,h=i===2?6.1:3.5+r()*1.8,b={...position,w,d,h:rounded(h),id:`road-building-${i}`,parcelId:`road-parcel-${i}`,parcelX:position.x,parcelZ:position.z,primary:true,shape:'detached',rotation:0,floors:i===2?2:1,material:i===1?'brick':'wood',factory:false,style:i===1?'warehouse':'tenement',roof:i===1?'flat':'gable',color:[0x8f8b70,0x9b8870,0x7f8b7b][i],shop:labels[i]};if(!free(b,3))continue;buildings.push(b);parcels.push({x:b.x,z:b.z,w:b.w+3,d:b.d+3,park:false});}
 if(buildings.length<2)throw new Error('Country road could not place its supply-stop buildings.');
 const add=o=>{if(!free(o,1.2))return false;cover.push(o);return true;};
 // Actual breakable crates and volatile barrels flank the approach. They do not
 // occupy the protected road or the scripted encounter/reward positions.
 for(const dz of [-11,11,-23,23])for(const side of [-1,1]){
  add({x:supply.x+side*11,z:supply.z+dz,w:1.5,d:1.6,h:1.2,kind:'crate',material:'wood',maxHealth:100});
  add({x:supply.x+side*13.7,z:supply.z+dz+.7,w:.9,d:.9,h:1.1,kind:'barrel',material:'metal',maxHealth:70});
 }
 // Woodland is made of live, flammable props; no invisible collision-only wall.
 for(let attempt=0;attempt<1600&&cover.filter(p=>p.kind==='planter').length<90;attempt++){
  const o={x:rounded(bounds.minX+4+r()*(bounds.maxX-bounds.minX-8)),z:rounded(bounds.minZ+5+r()*(bounds.maxZ-bounds.minZ-10)),w:1.3,d:1.3,kind:'planter',wild:true,material:'wood',maxHealth:150};
  if(roadOverlaps(o,roads,4)||parcels.some(p=>overlaps(o,p,2))||cover.some(p=>overlaps(o,p,2.5)))continue;add(o);
 }
 const solids=[...buildings,...cover],spawnPoints=streetPoints.filter(p=>!pointBlocked(p.x,p.z,1.5,solids)).map(({x,z})=>({x,z}));
 // Verify the authored side positions can actually reach the supply centre;
 // fixed spawn metadata must not depend on a later fallback spawn algorithm.
 if(encounterSpawns.some(p=>pointBlocked(p.x,p.z,1.2,solids)||lineBlocked(p,supply,.65,solids)))throw new Error('Country encounter route was obstructed.');
 return{city:true,country:true,seed:seed>>>0,mapSeed,district:0,shape:'woodland ribbon',boundary,bounds,roads,nodes,streetPoints,parcels,buildings,cover,spawnPoints,spawn:{...gate},road:{x:0,z:0,width},facades:[],water:[],bridges:[],waterObstacles:[],landmarks:[],traversal:{anchors:[],reward:null},region:{id:'country-road',name:'Old Mill Road',gate,supply,encounterSpawns}};
}
