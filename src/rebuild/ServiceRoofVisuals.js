// Authored roof solids and their render meshes use exactly the same plan.
// Decoration stays within each solid; no invisible vents or pass-through rails.
export function buildServiceRoof(parent,building,roof,{box,surfaces}){
 const flush={polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};
 const meshes=[];
 for(const part of roof.parts){
  const x=part.x-building.x,z=part.z-building.z,y=part.y||0,top=y+part.h;
  const color=part.role==='hvac'?0x738481:part.role==='deck'?0x57635e:0xb1ad97;
  const mesh=box(parent,color,x,y+part.h/2,z,part.w,part.h,part.d);mesh.name=`service-roof-${part.role}`;mesh.userData.roofPart=part;mesh.castShadow=mesh.receiveShadow=true;meshes.push(mesh);
  if(part.role==='deck'){
   surfaces.apply(mesh,'roof',color);
   // Flush expansion joints and a painted maintenance hatch; never raised steps.
   for(let dx=-part.w/2+2;dx<part.w/2-.4;dx+=2)box(parent,0x414d49,x+dx,top-.003,z,.025,.006,part.d-.2,flush);
   for(let dz=-part.d/2+2;dz<part.d/2-.4;dz+=2)box(parent,0x414d49,x,top-.003,z+dz,part.w-.2,.006,.025,flush);
  }else if(part.role==='parapet'){
   box(parent,0xc5bea6,x,top-.045,z,part.w,.09,part.d,flush);
   const longX=part.w>part.d,length=longX?part.w:part.d;
   for(let offset=-length/2+.55;offset<length/2;offset+=1.1)box(parent,0x8c9284,x+(longX?offset:0),top-.008,z+(longX?0:offset),longX?.025:part.w,.016,longX?part.d:.025,{...flush,polygonOffsetFactor:-2});
  }else if(part.role==='hvac'){
   // Recessed louvres sit on the front panel, entirely inside its collision box.
   for(let dy=.12;dy<part.h-.1;dy+=.14)box(parent,0x344b4c,x,y+dy,z+part.d/2-.008,part.w-.12,.035,.016,flush);
   for(const side of [-1,1])box(parent,0x9ba599,x+side*(part.w/2-.055),y+part.h/2,z,.11,part.h,part.d,flush);
   box(parent,0x465956,x,top-.035,z,part.w-.2,.07,part.d-.2,flush);
  }
 }
 const deck=roof.parts.find(p=>p.role==='deck');
 if(deck&&roof.anchor){
  const x=roof.anchor.x-building.x,z=roof.anchor.z-building.z,top=deck.y+deck.h;
  for(const side of [-1,1])box(parent,0xc3a466,x+side*.65,top-.004,z,.09,.008,1.3,{...flush,polygonOffsetFactor:-2});
  for(const side of [-1,1])box(parent,0xc3a466,x,top-.004,z+side*.65,1.3,.008,.09,{...flush,polygonOffsetFactor:-2});
 }
 return meshes;
}
