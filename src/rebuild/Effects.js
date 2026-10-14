import * as T from 'three';
export const DEBRIS={
 brick:{colors:[0x8e6050,0xaa7860,0x74655a],roughness:.97,min:.035,max:.28,stretch:1.8,bounce:.18,dust:0x9c8e7a},
 concrete:{colors:[0x88897e,0xb0aca0,0x626961],roughness:1,min:.025,max:.34,stretch:1.2,bounce:.2,dust:0xa5a08e},
 metal:{colors:[0x56666b,0x7e8989,0x846b51],roughness:.45,metalness:.7,min:.025,max:.3,stretch:2.8,bounce:.4,dust:0x5a5c58},
 wood:{colors:[0xa38457,0x6c5134,0xc0a576],roughness:.93,min:.025,max:.2,stretch:4.2,bounce:.12,dust:0x9d865f},
 glass:{colors:[0xa4c9cb,0x638f99,0xcde0db],roughness:.08,metalness:.25,min:.02,max:.18,stretch:1.8,bounce:.3,dust:0x9cadad},
 earth:{colors:[0x585243,0x7b7358,0x454739],roughness:1,min:.025,max:.2,stretch:1.2,bounce:.08,dust:0x7f7966}
};
export const materialFor=kind=>({car:'metal',barrel:'metal',barrier:'concrete',planter:'wood',crate:'wood',rock:'concrete',building:'brick'}[kind]||'earth');
const materials=new Map(),geometryBank=new Map();
// Irregular closed prisms: jagged torn edges, warped sheets and broken splinters.
export function fragmentGeometry(kind,index=0){
 const key=kind+':'+(index%12);if(geometryBank.has(key))return geometryBank.get(key);
 let seed=(index+1)*7919+kind.length*1337;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const n=kind==='glass'?3+index%3:5+index%4,positions=[],indices=[],thin=['metal','glass'].includes(kind),thickness=thin?.08:.45;
 const edge=Array.from({length:n},(_,i)=>{const a=(i+r()*.3)/n*Math.PI*2,rad=.55+r()*.45;return [Math.cos(a)*rad,Math.sin(a)*rad];});
 for(const side of [-1,1])for(const [x,z]of edge)positions.push(x,side*thickness+(thin?(r()-.5)*.24:(r()-.5)*.18),z);
 for(let i=1;i<n-1;i++){indices.push(0,i+1,i,n,n+i,n+i+1);}for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+i,j,n+j,n+i);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);const flat=geo.toNonIndexed();geo.dispose();flat.computeVertexNormals();flat.userData.shared=true;geometryBank.set(key,flat);return flat;
}
function material(profile,color){const key=profile+color;if(!materials.has(key)){const p=DEBRIS[profile],m=new T.MeshStandardMaterial({color,roughness:p.roughness,metalness:p.metalness||0});m.userData.shared=true;materials.set(key,m);}return materials.get(key);}
export function debris(world,{x,z,y=.7,material:kind='concrete',count=18,power=7,scale=1,direction=null}){
 const p=DEBRIS[kind]||DEBRIS.concrete,r=world.random;
 for(let i=0;i<count;i++){
  const size=(p.min+Math.pow(r(),2.8)*p.max)*scale,m=new T.Mesh(fragmentGeometry(kind,Math.floor(r()*12)),material(kind in DEBRIS?kind:'concrete',p.colors[Math.floor(r()*p.colors.length)]));
  m.scale.set(size,size*(.6+r()*.8),size*p.stretch);m.position.set(x+(r()-.5)*.6,y+r()*.3,z+(r()-.5)*.6);m.rotation.set(r()*6,r()*6,r()*6);m.castShadow=size>.12;world.scene.add(m);
  const a=r()*Math.PI*2,speed=power*(.3+r()*.7),life=2+r()*3;
  world.effects.push({mesh:m,kind:'material',material:kind,vx:Math.sin(a)*speed+(direction?.x||0),vy:2+r()*power*.7,vz:Math.cos(a)*speed+(direction?.z||0),spin:(r()-.5)*18,life,max:life,bounce:p.bounce,drag:.7+size*2,gravity:16});
 }
}
// Seeded variation stays in the renderer: graphics never perturb combat randomness.
export function deathMotion(variant,twist=0){
 const poses=[{x:-1.55,z:.16,knee:1.1},{x:1.5,z:-.2,knee:.25},{x:-.3,z:1.52,knee:.8},{x:.3,z:-1.53,knee:1.2},{x:-1.4,z:.7,knee:.5},{x:1.15,z:-.9,knee:1.4}];
 return {...poses[variant%poses.length],twist};
}

export function grenadePosition(h){if(h.projectile)return {x:h.projectile.x,y:h.projectile.y,z:h.projectile.z};const age=h.duration-h.timer,u=Math.max(0,Math.min(1,age/h.flight));return {x:h.originX+(h.x-h.originX)*u,z:h.originZ+(h.z-h.originZ)*u,y:.16+1.2*(1-u)+5.5*u*(1-u)+(u===1?Math.abs(Math.sin((age-h.flight)*22))*.13:0)};}
