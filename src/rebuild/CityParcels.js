import {seededRandom} from './config.js';
const colours=[0x9c9882,0xa59178,0x7c8b86,0x917969,0xb0a68c,0x89947e,0xa18b80];
const shops=['PHARMACIE','LE DERNIER VERRE','ÉPICERIE','HÔTEL','ATELIER','CAFÉ'];
export const PARCEL_SHAPES=['detached','paired','corner','courtyard','stepped'];
// Axis-aligned wings describe both the visible massing and its real collision.
// The 22m envelope preserves the sidewalks and the entire connected road grid.
export function generateParcel(seed,x,z,index,{factory=false,dock=false,civic=false,compact=false}={}){
 const r=seededRandom((seed^Math.imul(index+1,0x45d9f3b))>>>0),pick=a=>a[Math.floor(r()*a.length)];
 const order=[...PARCEL_SHAPES],shuffle=seededRandom((seed^Math.imul(Math.floor(index/5)+1,0x71a3c5))>>>0);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const shape=compact?'detached':order[index%order.length],rotation=Math.floor(r()*4);
 const W=18+r()*3,D=16+r()*5,T=Math.min(6.3+r()*1.2,(W-5.2)/2),gap=3.2+r()*1.4;
 const floors=factory?1+Math.floor(r()*3):dock?2+Math.floor(r()*2):2+Math.floor(r()*5);
 const style=civic?'civic':factory?'foundry':dock?'warehouse':pick(['hotel','tenement','tenement']);
 const roof=factory||dock?pick(['flat','gable']):civic?'flat':pick(['hip','gable','flat','terrace']);
 const colour=pick(colours),parts=[];
 const add=(px,pz,w,d,storeys=floors)=>parts.push({x:px,z:pz,w,d,h:Math.round((storeys*2.8+.3)*10)/10,floors:storeys});
 if(shape==='detached')add(0,0,compact?6+r()*4:10+r()*6,compact?7+r()*4:10+r()*8,compact?2+Math.floor(r()*3):floors);
 if(shape==='paired'){
  const w=(W-gap)/2;add(-(w+gap)/2,0,w,D);add((w+gap)/2,(r()-.5)*2,w,D-2,Math.max(1,floors+(r()<.5?-1:1)));
 }
 if(shape==='corner'){add(0,-(D-T)/2,W,T);add(-(W-T)/2,T/2,T,D-T,Math.max(1,floors-1));}
 if(shape==='courtyard'){add(0,-(D-T)/2,W,T);add(-(W-T)/2,T/2,T,D-T,Math.max(1,floors-1));add((W-T)/2,T/2,T,D-T,Math.max(1,floors-2));}
 if(shape==='stepped'){const w=W*.58;add(-(W-w)/2,0,w,D);add(w/2,(D-D*.62)/2,W-w,D*.62,Math.max(1,floors-2));}
 // Rotate whole plans by quarter turns, not just their decorative facades.
 for(const p of parts)for(let i=0;i<rotation;i++){const px=p.x;p.x=-p.z;p.z=px;[p.w,p.d]=[p.d,p.w];}
 const minX=Math.min(...parts.map(p=>p.x-p.w/2)),maxX=Math.max(...parts.map(p=>p.x+p.w/2)),minZ=Math.min(...parts.map(p=>p.z-p.d/2)),maxZ=Math.max(...parts.map(p=>p.z+p.d/2));
 const envelope=compact?14:22,half=envelope/2,offsetX=-half-minX+r()*(envelope-(maxX-minX)),offsetZ=-half-minZ+r()*(envelope-(maxZ-minZ));
 return parts.map((p,i)=>({...p,id:`building-${index}-${i}`,parcelId:`parcel-${index}`,parcelX:x,parcelZ:z,shape,rotation,x:x+p.x+offsetX,z:z+p.z+offsetZ,color:i?pick([colour,colour,0x929383]):colour,material:factory?'metal':'brick',factory,style:civic&&i?'tenement':style,roof:i&&shape!=='paired'?'flat':roof,primary:i===0,shop:pick(shops)}));
}
