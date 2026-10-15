import * as T from 'three';
import maleHead from '../../assets/characters/infected-head.json' with {type:'json'};
import castHeads from '../../assets/characters/survivor-heads.json' with {type:'json'};

// Clean anatomy only. Infected bruises, wounds and materials are never imported.
// Each actor owns a clone so face customization and disposal cannot leak between NPCs.
const sourceCache=new Map();
function sourceFor(identity){
 const source=castHeads.heads[identity]||maleHead;
 if(!sourceCache.has(source)){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(source.position,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(source.normal,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(source.uv,2));geometry.setIndex(source.index);
  geometry.computeBoundingBox();sourceCache.set(source,{geometry,width:Math.max(Math.abs(geometry.boundingBox.min.x),Math.abs(geometry.boundingBox.max.x)),eyes:source.eyes||[[-.056,.029,.101],[.056,.029,.101]]});
 }
 return sourceCache.get(source);
}
export function anatomicalSurvivorHead(identity,face){
 const source=sourceFor(identity),geometry=source.geometry.clone(),p=geometry.attributes.position;
 const width=face==='broad'?.185:face==='soft'?.159:.17,scale=width/source.width;
 const transform=(x,y,z)=>{
  const jaw=Math.exp(-(((y+.13)/.075)**2));
  const narrow=face==='angular'?.11:face==='soft'?.15:0;
  const neck=Math.max(0,Math.min(1,(-y-.16)/.07));
  return[x*scale*(1-narrow*jaw)*(1-neck*.43),y,(z<0?z*.88:z)*(1-neck*.25)];
 };
 for(let i=0;i<p.count;i++)p.setXYZ(i,...transform(p.getX(i),p.getY(i),p.getZ(i)));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.surfaceOwned=true;geometry.userData.anatomicalIdentity=identity;
 return{geometry,eyes:source.eyes.map(p=>transform(...p)),width};
}
// Projection runs only while constructing a cosmetic variant, never per frame.
export function survivorFaceProjector(geometry,material){
 const proxy=new T.Mesh(geometry,material),ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(0,0,-1);proxy.updateMatrixWorld(true);
 return(x,y,offset=.003)=>{origin.set(x,y,.6);ray.set(origin,direction);const hit=ray.intersectObject(proxy,false)[0];return[x,y,hit?hit.point.z+offset:.15];};
}
// Eye bones mark the globe centre, not its visible surface. Seat a round globe
// behind the actual eyelids; they mask it into an almond opening naturally.
export function survivorEyeFit(project,anchor){
 const [x,y,z]=anchor,rim=[project(x,y+.014,0)[2],project(x,y-.014,0)[2]];
 const front=Math.max(z+.018,Math.min(z+.039,(rim[0]+rim[1])/2-.001));
 return{x,y,centre:front-.03,front,width:.027,height:.024,depth:.03};
}
