import {seededRandom,segmentBoxTime} from './config.js';
export const CITY_FORMS=['old town','river port','valley town','hill districts'];
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function withinBoundary(boundary,x,z,margin=0){let inside=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;if(margin&&segmentDistance({x,z},a,b)<margin)return false;}return inside;}
export function rectangleInside(boundary,o,margin=0){return[-1,1].every(x=>[-1,1].every(z=>withinBoundary(boundary,o.x+x*o.w/2,o.z+z*o.d/2,margin)));}
export function roadDistance(p,roads){return Math.min(...roads.map(s=>segmentDistance(p,s.a,s.b)-s.width/2));}
export function roadOverlaps(rect,roads,margin=0){return roads.some(s=>segmentBoxTime(s.a,s.b,{...rect,w:rect.w+s.width+margin*2,d:rect.d+s.width+margin*2})!==null);}
export function generateTopology(seed){
 const r=seededRandom(seed^0x16ab53),form=(seed>>>0)%CITY_FORMS.length,phase=(r()-.5)*.55,sx=form===1?1.25:form===2?.78:1,sz=form===2?1.4:form===1?.84:1,size=175+r()*20;
 const boundary=Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2;let radius=size*(.92+r()*.12);if(form===1&&Math.cos(a)>.25&&Math.sin(a)<-.1)radius*=.64;if(form===3)radius*=.83+.22*Math.cos(3*(a-Math.PI/2));return{x:Math.cos(a)*radius*sx,z:Math.sin(a)*radius*sz};});
 const bounds={minX:Math.floor(Math.min(...boundary.map(p=>p.x))),maxX:Math.ceil(Math.max(...boundary.map(p=>p.x))),minZ:Math.floor(Math.min(...boundary.map(p=>p.z))),maxZ:Math.ceil(Math.max(...boundary.map(p=>p.z)))};
 const roads=[],nodes=[];let id=0;
 const transform=([x,z])=>{if(x||z){const j=seededRandom((seed^Math.imul(Math.round(x*100),739)^Math.imul(Math.round(z*100),193))>>>0);x+=(j()-.5)*9;z+=(j()-.5)*9;}return{x:(x*Math.cos(phase)-z*Math.sin(phase))*sx*1.45,z:(x*Math.sin(phase)+z*Math.cos(phase))*sz*1.45};};
 function add(points,width=11,raw=false){const p=raw?points:points.map(transform);for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<2)continue;let fits=true;for(let t=0;t<=1;t+=.05)if(!withinBoundary(boundary,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,width/2+3))fits=false;if(!fits)continue;roads.push({id:`road-${id++}`,a,b,width});for(const v of[a,b])if(!nodes.some(n=>Math.hypot(n.x-v.x,n.z-v.z)<1))nodes.push({...v});}}
 // A short clear arrival street anchors existing spawn/extraction and vehicle access.
 add([{x:0,z:-20},{x:0,z:30}],13,true);add([{x:-18,z:0},{x:20,z:0}],12,true);
 if(form===0){
  const n=6+Math.floor(r()*3),angles=Array.from({length:n},(_,i)=>i/n*Math.PI*2+(r()-.5)*.15),ring=rad=>angles.map(a=>[Math.cos(a)*(rad+(r()-.5)*8),Math.sin(a)*(rad+(r()-.5)*8)]),inner=ring(42),outer=ring(87);
  add([...inner,inner[0]],10);add([...outer,outer[0]],12);for(let i=0;i<n;i++){if(i%2===0)add([[0,0],inner[i],outer[i]],12);else add([inner[i],outer[i]],9);}
 }else if(form===1){
  const spine=[[-88,8],[-57,-10],[-22,-6],[0,0],[33,12],[64,22],[92,10]];add(spine,14);
  add([spine[0],[-78,52],[-42,70],[2,67],[38,54],spine[5]],10);
  add([spine[1],[-52,-60],[-12,-79],[17,-52],spine[4]],11);
  add([spine[2],[-25,30],[-42,70]],9);add([spine[4],[18,33],[2,67]],9);
 }else if(form===2){
  const spine=[[12,-95],[-8,-64],[13,-28],[0,0],[-15,36],[4,67],[-12,95]];add(spine,14);
  add([spine[1],[-59,-58],[-73,-22],[-51,7],[0,0]],10);add([spine[2],[63,-35],[75,8],[45,34],spine[4]],11);
  add([spine[4],[-56,44],[-49,76],spine[5]],9);add([spine[5],[46,77],[58,49],[45,34]],9);
 }else{
  for(const [j,c]of [[-58,-35],[58,-35],[0,65]].entries()){
   const radius=25+r()*7,n=5+Math.floor(r()*3),ring=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2+j*.3;return[c[0]+Math.cos(a)*radius,c[1]+Math.sin(a)*radius];});add([...ring,ring[0]],11);add([[0,0],[c[0]*.52+(r()-.5)*10,c[1]*.5],c,ring[j]],13);add([ring[(j+3)%n],c],9);
  }
 }
 // Sample the actual centre lines: these points also drive encounters and parking.
 const streetPoints=[];for(const s of roads){const n=Math.ceil(Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z)/5);for(let i=0;i<=n;i++){const t=i/n,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t;if(!streetPoints.some(p=>Math.hypot(p.x-x,p.z-z)<2.5))streetPoints.push({x,z,angle:Math.atan2(s.b.x-s.a.x,s.b.z-s.a.z),width:s.width});}}
 return{form:CITY_FORMS[form],boundary,bounds,roads,nodes,streetPoints};
}
export function boundarySegmentClear(boundary,a,b,radius=0){
 const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 for(let i=0;i<boundary.length;i++){const c=boundary[i],d=boundary[(i+1)%boundary.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;
  if(radius&&Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b))<radius)return false;
 }return true;
}
