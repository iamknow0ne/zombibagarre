import {QUESTS,questObjective,questProgress} from './RPG.js';
import {insideMap,segmentInMap} from './Map.js';
import {waterAt} from './City.js';
import {distance,lineBlocked} from './config.js';
export function questGuide(sim,id=sim.rpg?.tracked){
 const quest=QUESTS.find(q=>q.id===id);if(!quest||!sim.rpg)return null;
 const objective=questObjective(sim,id),[done,total]=questProgress(sim,id),step=objective.state==='available'?0:objective.state==='ready'?2:objective.state==='complete'?3:1;
 return {quest,...objective,done,total,step,distance:objective.target?Math.round(distance(sim.interior?.pose||sim.player,objective.target)):null};
}
export function syncQuestNavigation(sim){
 const guide=questGuide(sim);if(!guide)return null;
 if(guide.state==='complete'||guide.state==='locked'){sim.rpg.tracked=null;if(sim.player.waypoint?.source==='quest')sim.player.waypoint=null;return guide;}
 if(sim.interior)return guide;
 if(sim.player.waypoint?.source!=='manual')sim.player.waypoint=guide.target?{x:guide.target.x,z:guide.target.z,source:'quest',questId:guide.quest.id,name:guide.target.name||guide.quest.name,regionId:guide.target.regionId}:null;
 return guide;
}
// A cached, conservative pedestrian grid. Occupied cells include a clearance
// margin; every returned segment is checked against actual scenery and water.
const grids=new WeakMap();
function gridFor(sim){
 const old=grids.get(sim.layout),revision=sim.geometryRevision||0;
 if(old&&old.obstacles===sim.obstacles&&old.revision===revision)return old;
 const b=sim.layout.bounds,step=3,cols=Math.ceil((b.maxX-b.minX)/step),rows=Math.ceil((b.maxZ-b.minZ)/step),blocked=new Uint8Array(cols*rows),point=i=>({x:b.minX+(i%cols+.5)*step,z:b.minZ+(Math.floor(i/cols)+.5)*step});
 for(let i=0;i<blocked.length;i++){const p=point(i);blocked[i]=!insideMap(sim.layout,p.x,p.z,.65)||!!waterAt(sim.layout,p.x,p.z);}
 for(const o of sim.obstacles){if(o.health<=0)continue;const margin=step*.5+.55,x0=Math.max(0,Math.floor((o.x-o.w/2-margin-b.minX)/step)),x1=Math.min(cols-1,Math.floor((o.x+o.w/2+margin-b.minX)/step)),z0=Math.max(0,Math.floor((o.z-o.d/2-margin-b.minZ)/step)),z1=Math.min(rows-1,Math.floor((o.z+o.d/2+margin-b.minZ)/step));for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)blocked[z*cols+x]=1;}
 const grid={b,step,cols,rows,blocked,point,revision,obstacles:sim.obstacles};grids.set(sim.layout,grid);return grid;
}
export function routeSegmentClear(sim,a,b){
 if(lineBlocked(a,b,.5,sim.obstacles.filter(o=>o.health===undefined||o.health>0))||!segmentInMap(sim.layout,a,b,.5))return false;
 const steps=Math.ceil(distance(a,b));for(let i=0;i<=steps;i++){const t=i/(steps||1);if(waterAt(sim.layout,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;
}
export function buildRoute(sim,target){
 const start={x:sim.player.x,z:sim.player.z},finish={x:target.x,z:target.z};if(!Number.isFinite(finish.x)||!Number.isFinite(finish.z))return [];
 if(routeSegmentClear(sim,start,finish))return [start,finish];
 const g=gridFor(sim),{cols,rows,blocked,point,b,step}=g;
 const attach=p=>{const cx=Math.floor((p.x-b.minX)/step),cz=Math.floor((p.z-b.minZ)/step),candidates=[];for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){const x=cx+dx,z=cz+dz,i=z*cols+x;if(x>=0&&x<cols&&z>=0&&z<rows&&!blocked[i])candidates.push({i,d:distance(p,point(i))});}return candidates.sort((a,b)=>a.d-b.d).find(v=>routeSegmentClear(sim,p,point(v.i)))?.i;};
 const from=attach(start),to=attach(finish);if(from===undefined||to===undefined)return [];
 const costs=new Float64Array(blocked.length).fill(Infinity),parent=new Int32Array(blocked.length).fill(-1),closed=new Uint8Array(blocked.length),heap=[];
 const push=(i,f)=>{heap.push({i,f});let n=heap.length-1;while(n>0){const p=(n-1)>>1;if(heap[p].f<=f)break;[heap[p],heap[n]]=[heap[n],heap[p]];n=p;}};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let n=0;while(true){let c=n*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[n].f<=heap[c].f)break;[heap[n],heap[c]]=[heap[c],heap[n]];n=c;}}return first.i;};
 costs[from]=0;push(from,0);while(heap.length){const i=pop();if(closed[i])continue;if(i===to)break;closed[i]=1;const x=i%cols,z=Math.floor(i/cols);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,nz=z+dz,n=nz*cols+nx;if(nx<0||nx>=cols||nz<0||nz>=rows||blocked[n]||closed[n]||dx&&dz&&(blocked[z*cols+nx]||blocked[nz*cols+x]))continue;const next=costs[i]+(dx&&dz?Math.SQRT2:1);if(next>=costs[n])continue;costs[n]=next;parent[n]=i;push(n,next+Math.hypot(nx-to%cols,nz-Math.floor(to/cols)));}}
 if(from!==to&&parent[to]<0)return [];
 const path=[finish];for(let i=to;i!==-1;i=parent[i]){path.push(point(i));if(i===from)break;}path.push(start);path.reverse();
 const smooth=[path[0]];let i=0;while(i<path.length-1){let j=Math.min(path.length-1,i+30);while(j>i&&!routeSegmentClear(sim,path[i],path[j]))j--;if(j===i)return [];smooth.push(path[j]);i=j;}return smooth;
}
export function navigationRoute(sim,target=sim.player.waypoint,cacheSlot='questRoute'){
 if(sim.interior||!target||target.regionId&&target.regionId!==(sim.activeRegionId||'city')){sim[cacheSlot]=null;return null;}
 const p=sim.player,old=sim[cacheSlot],key=`${target.x.toFixed(1)}:${target.z.toFixed(1)}:${target.source||'manual'}:${sim.activeRegionId||'city'}`,revision=sim.geometryRevision||0;
 if(old&&old.key===key&&old.revision===revision&&distance(old.origin,p)<8){old.status=distance(p,target)<3?'arrived':old.points.length?'route':'unavailable';return old;}
 const points=buildRoute(sim,target),length=points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);
 return sim[cacheSlot]={key,revision,origin:{x:p.x,z:p.z},points,length,source:target.source||'manual',status:distance(p,target)<3?'arrived':points.length?'route':'unavailable'};
}
