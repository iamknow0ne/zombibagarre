// Service loading decks stay entirely inside the shared collision rectangle.
// Flush panel overlays use polygon offset rather than sitting above the surface.
export function buildServicePlatform(parent,o,{box,surfaces,sign}){
 const y=o.y||0,top=y+o.h,flush={polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};
 box(parent,0x3a4846,o.x,y+o.h/2,o.z,o.w,o.h,o.d);
 const columns=Math.max(2,Math.round(o.w/1.15)),rows=Math.max(2,Math.round(o.d/1.2)),pw=(o.w-.28)/columns,pd=(o.d-.28)/rows;
 for(let x=0;x<columns;x++)for(let z=0;z<rows;z++){
  const tile=box(parent,(x+z)%2?0x899087:0x7c857e,o.x-o.w/2+.14+pw*(x+.5),top-.009,o.z-o.d/2+.14+pd*(z+.5),pw-.025,.018,pd-.025);
  surfaces.apply(tile,'paving',(x+z)%2?0x899087:0x7c857e);tile.material=tile.material.clone();tile.material.userData.shared=false;Object.assign(tile.material,flush);
 }
 for(const side of [-1,1]){
  // Perimeter rail, bolted corner shoes and a recessed side conduit.
  box(parent,0x56645d,o.x+side*(o.w/2-.055),y+o.h/2,o.z,.11,o.h,o.d,flush);
  box(parent,0x53635e,o.x,top-.065,o.z+side*(o.d/2-.035),o.w,.13,.07,flush);
  box(parent,0x778679,o.x,y+o.h*.36,o.z+side*(o.d/2-.018),o.w-.3,.055,.036,flush);
  for(const end of [-1,1]){
   box(parent,0x394946,o.x+side*(o.w/2-.12),top-.012,o.z+end*(o.d/2-.12),.24,.024,.24,flush);
   box(parent,0xb1b5a3,o.x+side*(o.w/2-.1),top-.008,o.z+end*(o.d/2-.1),.045,.016,.045,{...flush,polygonOffsetFactor:-2});
  }
  const count=Math.max(2,Math.floor((o.w-.6)/.32)),pitch=(o.w-.6)/count;
  for(let i=0;i<count;i++){
   const stripe=box(parent,i%2?0x313e3b:0xc6ad73,o.x-o.w/2+.3+pitch*(i+.5),top-.006,o.z+side*(o.d/2-.13),pitch-.025,.012,.12,{...flush,polygonOffsetFactor:-2});stripe.rotation.y=-.22;
  }
 }
 const label=sign(parent,'SERVICE / 02',o.x,y+o.h*.64,o.z+o.d/2,Math.min(1.15,o.w*.45),.21,'#394743','#d1c3a0');
 label.material=label.material.clone();label.material.userData.shared=false;Object.assign(label.material,flush);
}
