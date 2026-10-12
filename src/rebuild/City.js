import {seededRandom, pointBlocked} from './config.js';

// A single connected street network: districts are places, not successive rooms.
export function generateCity(seed=73){
 const r=seededRandom(seed^0x7134ab),bounds={minX:-116,maxX:116,minZ:-116,maxZ:116};
 const boundary=[{x:-116,z:-116},{x:105,z:-116},{x:116,z:-92},{x:116,z:100},{x:90,z:116},{x:-105,z:116},{x:-116,z:90}];
 const roads=[-96,-64,-32,0,32,64,96],water=[{x:48,z:0,w:14,d:232}],bridges=[-96,-32,32,96].map(z=>({x:48,z,w:18,d:12}));
 const waterObstacles=[];let bankZ=-116;for(const bridge of bridges){const edge=bridge.z-bridge.d/2;waterObstacles.push({x:48,z:(bankZ+edge)/2,w:14,d:edge-bankZ});bankZ=bridge.z+bridge.d/2;}waterObstacles.push({x:48,z:(bankZ+116)/2,w:14,d:116-bankZ});
 const buildings=[],cover=[],landmarks=[
  {x:0,z:0,name:'SAINT-ROCH',type:'safehouse',color:'#dfb66c'},
  {x:96,z:32,name:'PORT DES CENDRES',type:'dock',color:'#80b9c4'},
  {x:-64,z:-64,name:'LES SERRES',type:'park',color:'#9ab88c'},
  {x:96,z:-64,name:'LA FONDERIE',type:'factory',color:'#d89567'},
  {x:-96,z:64,name:'CANOPÉE NOIRE',type:'jungle',color:'#6eaa72'},
  {x:-96,z:-96,name:'LES DENTS BLANCHES',type:'mountain',color:'#c5d4db'},
  {x:0,z:96,name:'TERRES ROUGES',type:'badlands',color:'#cea377'},
  {x:96,z:96,name:'MARAIS MORT',type:'marsh',color:'#78a295'}
 ];
 const colours=[0x9c9882,0xa59178,0x7c8b86,0x917969,0xb0a68c];
 for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){
  const x=-80+ix*32,z=-80+iz*32;if(ix===4)continue; // The canal occupies this column.
  const park=(ix<2&&iz>3)||(ix<2&&iz<2);
  if(park){for(let i=0;i<4;i++)cover.push({x:x+(r()-.5)*20,z:z+(r()-.5)*20,w:2,d:2,kind:'planter'});continue;}
  const factory=ix===5&&iz<3,w=18+r()*3,d=18+r()*3;
  buildings.push({id:`building-${buildings.length}`,x,z,w,d,h:factory?7:6+Math.floor(r()*4)*2.6,color:colours[Math.floor(r()*colours.length)],material:factory?'metal':'brick',factory,shop:['PHARMACIE','LE DERNIER VERRE','ÉPICERIE','HÔTEL','ATELIER','CAFÉ'][Math.floor(r()*6)]});
  if(r()>.4)cover.push({x:x-w/2-2.5,z:z-4,w:.9,d:.9,kind:'barrel'});
  cover.push({x:x+w/2+2,z:z+5,w:1.5,d:2,kind:'crate'});
 }
 // Keep several approachable vehicles near the start; all parked cars can be used.
 const cars=[{x:3,z:6},{x:-6,z:26},{x:30,z:-6},{x:-32,z:4}];
 for(let i=0;i<22;i++){const x=roads[Math.floor(r()*roads.length)]+4,z=roads[Math.floor(r()*roads.length)]+12;if(Math.abs(x-48)<10)continue;if(!cars.some(c=>Math.hypot(c.x-x,c.z-z)<7))cars.push({x,z});}
 for(const [i,c]of cars.entries())cover.push({...c,w:2,d:4.3,kind:'car',driveable:true,rotation:Math.PI/2,color:[0x67867a,0xa65e44,0x486581,0xc0aa79][i%4],vehicleName:['RAVEN SEDAN','COURIER VAN','PATROL WAGON','RALLY COUPE'][i%4]});
 const spawnPoints=[];
 for(const x of roads)for(let z=-106;z<=106;z+=6)if(!pointBlocked(x,z,2,cover)&&!pointBlocked(x,z,2,buildings))spawnPoints.push({x,z});
 for(const z of roads)for(let x=-106;x<=106;x+=6)if(!(x>40&&x<56&&!bridges.some(b=>Math.abs(z-b.z)<5))&&!pointBlocked(x,z,2,cover)&&!pointBlocked(x,z,2,buildings))spawnPoints.push({x,z});
 return {city:true,seed,mapSeed:seed>>>0,district:0,bounds,boundary,roads,water,waterObstacles,bridges,buildings,cover,spawnPoints,landmarks,road:{x:0,z:0,width:10},facades:[],shape:'open city'};
}
export function waterAt(layout,x,z){
 if(layout.bridges?.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2))return false;
 if(layout.water?.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2))return true;
 if(!layout.city&&[1,7].includes(layout.district)&&layout.boundary){let inside=false;const p=layout.boundary;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i].z>z)!==(p[j].z>z)&&x<(p[j].x-p[i].x)*(z-p[i].z)/(p[j].z-p[i].z)+p[i].x)inside=!inside;return !inside;}
 return false;
}
