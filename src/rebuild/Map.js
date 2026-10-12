import {boundarySegmentClear} from './CityTopology.js';
import {waterAt} from './City.js';
import { ARENA, seededRandom, pointBlocked, lineBlocked } from './config.js';

// Gameplay and rendering consume this same immutable plan. Independent RNG streams
// prevent combat, graphics settings or frame rate from changing a district layout.
export function generateMap(seed = 73, district = 0) {
  const mapSeed = ((seed >>> 0) ^ Math.imul(district + 1, 0x9e3779b9)) >>> 0;
  const random = seededRandom(mapSeed), pick = a => a[Math.floor(random() * a.length)];
  const width=26+Math.floor(random()*11),depth=22+Math.floor(random()*8);
  const outlines=[
    {name:'broken block',points:[[-1,-1],[1,-1],[1,.28],[.35,.28],[.35,1],[-1,1]]},
    {name:'crossroads',points:[[-.48,-1],[.48,-1],[.48,-.46],[1,-.46],[1,.48],[.48,.48],[.48,1],[-.48,1],[-.48,.48],[-1,.48],[-1,-.46],[-.48,-.46]]},
    {name:'highland basin',points:[[-.6,-1],[.58,-1],[1,-.55],[.92,.62],[.5,1],[-.63,.92],[-1,.4],[-.94,-.58]]},
    {name:'river bend',points:[[-1,-1],[.55,-1],[.55,-.42],[1,-.42],[1,1],[-.45,1],[-.45,.4],[-1,.4]]},
  ];
  const outline=outlines[Math.floor(random()*outlines.length)],boundary=outline.points.map(([x,z])=>({x:x*width,z:z*depth}));
  const bounds={minX:-width,maxX:width,minZ:-depth,maxZ:depth};
  const road = { x: Math.round(random() * 10 - 5), z: Math.round(random() * 8 - 4), width: 6 };
  const cover = [];
  const reserved = [{x:0,z:3,w:9,d:9},{x:0,z:-10,w:8,d:10},{x:0,z:-13,w:8,d:6}];
  const intersects = (a,b,gap=0) => Math.abs(a.x-b.x)<(a.w+b.w)/2+gap && Math.abs(a.z-b.z)<(a.d+b.d)/2+gap;
  function place(o, gap=1.4) {
    if(![[-1,-1],[-1,1],[1,-1],[1,1]].every(([x,z])=>insideMap({boundary},o.x+x*o.w/2,o.z+z*o.d/2,3)))return false;
    if(reserved.some(r=>intersects(o,r,.7)) || cover.some(p=>intersects(o,p,gap))) return false;
    // A clear crossroad plus an open perimeter guarantees several escape routes.
    if(Math.abs(o.x-road.x)<o.w/2+road.width/2 || Math.abs(o.z-road.z)<o.d/2+road.width/2) return false;
    if(!isConnected([...cover,o],1.1,{boundary,bounds}))return false;
    cover.push(o);return true;
  }
  const palette=[0x536f69,0x9b684e,0x748177,0x8b8c76,0x546577];
  const kinds=[2,4,7].includes(district)?['planter','planter','planter','crate','rock','rock']:[5,6].includes(district)?['rock','rock','rock','crate','barrel']:district===1?['crate','crate','car','barrier','planter']:['car','barrier','planter','crate'];
  // Clustered volatile fuel makes intentional chain reactions possible in every map.
  for(let attempt=0,clusters=0;attempt<180&&clusters<3;attempt++){
    const x=random()*(width*2-8)-width+4,z=random()*(depth*2-8)-depth+4,axis=random()>.5;
    const first={x,z,w:.9,d:.9,kind:'barrel'};
    if(!place(first,1))continue;
    clusters++;
    place({...first,x:x+(axis?2.5:0),z:z+(axis?0:2.5)},.5);
  }
  for(let attempts=0;attempts<600 && cover.filter(p=>p.kind!=='barrel').length<18;attempts++){
    const kind=attempts<5?['car','planter','crate','barrier','planter'][attempts]:pick(kinds), vertical=random()>.5;
    const size=kind==='car'?(vertical?[2,4.3]:[4.3,2]):kind==='barrier'?(vertical?[1.1,4]:[4,1.1]):kind==='crate'?[1.5,2.6]:kind==='rock'?[2.6,2.6]:[2,2];
    place({x:Math.round((random()*(width*2-8)-width+4)*2)/2,z:Math.round((random()*(depth*2-8)-depth+4)*2)/2,w:size[0],d:size[1],kind,rotation:vertical?Math.PI/2:0,color:pick(palette)});
  }
  // Validate at the largest enemy radius. Reject any piece that partitions free space.
  while(!isConnected(cover,1.1,{boundary,bounds}) && cover.length) cover.pop();
  const facades=[],shops=['PHARMACIE','LE DERNIER VERRE','BOULANGERIE','HÔTEL SAINT-ROCH','ÉPICERIE','CINÉMA REX','CAFÉ DE LA GARE'];
  for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),normal={x:dz/len,z:-dx/len};
    if(normal.z>.35||len<7||(a.z+b.z)/2>depth*.6)continue;
    let cursor=.8+random()*1.4;
    while(cursor<len-6){const w=Math.min(6.5+random()*6.5,len-cursor-.6);if(w<5.5)break;const t=(cursor+w/2)/len,setback=4.3+random()*1.3;
      facades.push({x:a.x+dx*t+normal.x*setback,z:a.z+dz*t+normal.z*setback,w,h:4.8+Math.floor(random()*5)*2.45,angle:Math.atan2(-normal.x,-normal.z),color:pick([0xaaa58d,0x9b8f78,0x87938b,0xb3a38b]),shop:pick(shops),trim:pick([0x315f52,0x763f31,0x344d58,0x41544f])});cursor+=w+.7+random()*2.2;
    }
  }
  const spawnPoints=[];
  for(let x=-width+2;x<width-1;x+=2)for(let z=-depth+2;z<depth-1;z+=2)if(insideMap({boundary},x,z,1.5)&&!insideMap({boundary},x,z,4)&&!pointBlocked(x,z,1.3,cover))spawnPoints.push({x,z});
  return {seed:seed>>>0,mapSeed,district,road,cover,facades,boundary,bounds,shape:outline.name,spawnPoints};
}

const masks=new WeakMap();
export function insideMap(layout,x,z,radius=0){
  if(layout?.city&&[[-radius,0],[radius,0],[0,-radius],[0,radius]].some(([dx,dz])=>waterAt(layout,x+dx,z+dz)))return false;
  if(!layout?.boundary){const b=layout?.bounds||ARENA;return x>=b.minX+radius&&x<=b.maxX-radius&&z>=b.minZ+radius&&z<=b.maxZ-radius;}
  const polygon=layout.boundary;let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    if(radius){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<radius)return false;}
  }return inside;
}
export function segmentInMap(layout,a,b,radius=0){
  // Check the whole route against concave coastlines and canal gaps.
  if(layout.city&&layout.waterObstacles)return insideMap(layout,a.x,a.z,radius)&&insideMap(layout,b.x,b.z,radius)&&boundarySegmentClear(layout.boundary,a,b,radius)&&!lineBlocked(a,b,radius,layout.waterObstacles);
  const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*2));
  for(let i=0;i<=steps;i++){const t=i/steps;if(!insideMap(layout,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,radius))return false;}return true;
}
export function isConnected(cover,radius=.45,layout={}) {
  const bounds=layout.bounds||ARENA,cols=Math.ceil(bounds.maxX-bounds.minX),rows=Math.ceil(bounds.maxZ-bounds.minZ),free=new Uint8Array(cols*rows),queue=[];
  let mask=layout.boundary&&masks.get(layout.boundary)?.[radius];
  if(!mask){mask=Uint8Array.from({length:cols*rows},(_,i)=>insideMap(layout,i%cols+bounds.minX+.5,Math.floor(i/cols)+bounds.minZ+.5,radius));if(layout.boundary)masks.set(layout.boundary,{...masks.get(layout.boundary),[radius]:mask});}
  for(let i=0;i<free.length;i++)free[i]=mask[i]&&!pointBlocked(i%cols+bounds.minX+.5,Math.floor(i/cols)+bounds.minZ+.5,radius,cover);
  const start=free.findIndex(Boolean);if(start<0)return false;queue.push(start);free[start]=2;
  for(let n=0;n<queue.length;n++){
    const i=queue[n],x=i%cols,z=Math.floor(i/cols);
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,j=nz*cols+nx;if(nx<0||nx>=cols||nz<0||nz>=rows||free[j]!==1)continue;free[j]=2;queue.push(j);}
  }return !free.includes(1);
}
