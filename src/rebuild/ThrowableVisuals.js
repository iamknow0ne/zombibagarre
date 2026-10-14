import * as T from 'three';
import {THROWABLES} from './Throwables.js';
import {debris} from './Effects.js';
export function throwableMesh(key='frag'){
 const g=new T.Group(),w=THROWABLES[key]||THROWABLES.frag;
 const add=(geo,color,y,metal=.4)=>{const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,metalness:metal,roughness:.4}));m.position.y=y;g.add(m);return m;};
 if(key==='molotov'){add(new T.CylinderGeometry(.13,.16,.4,10),0x527b4d,0,.05);add(new T.CylinderGeometry(.055,.08,.18,10),0x688157,.28,.05);add(new T.BoxGeometry(.075,.18,.04),0xd6c6a4,.42,0);add(new T.CylinderGeometry(.163,.163,.15,10),0xc7b687,-.03,0);const ember=add(new T.SphereGeometry(.045,6,4),0xffa34c,.52);ember.material.emissive.setHex(0xff6a18);ember.material.emissiveIntensity=2;
 }else if(key==='frag'){add(new T.SphereGeometry(.22,10,8),0x7f8e52,0);add(new T.CylinderGeometry(.085,.085,.12,8),0xd1c7a0,.23);add(new T.BoxGeometry(.07,.055,.24),0x3f4840,.32);
 }else{add(new T.CylinderGeometry(.15,.15,.38,12),0x435254,0);for(const y of [-.15,.15])add(new T.CylinderGeometry(.18,.18,.06,12),w.color,y);for(let i=0;i<4;i++){const m=add(new T.BoxGeometry(.045,.2,.035),w.color,0);m.position.x=Math.sin(i*Math.PI/2)*.155;m.position.z=Math.cos(i*Math.PI/2)*.155;m.rotation.y=i*Math.PI/2;m.material.emissive.setHex(w.color);m.material.emissiveIntensity=.6;}}
 g.userData.throwable=key;return g;
}
export function ordnanceBurst(world,e){
 const fire=e.throwable==='molotov',frost=e.throwable==='frost',y=e.y||0;
 if(fire){debris(world,{x:e.x,z:e.z,y:y+.2,material:'glass',count:16,power:5,scale:.28});world.flame(e.x,e.z,12,y+.15,null,true);world.smoke(e.x,e.z,5,y+.2,0x766856);}
 else{world.smoke(e.x,e.z,frost?10:3,y+.15,frost?0xcce4e8:0x779ca5);if(frost)debris(world,{x:e.x,z:e.z,y:y+.2,material:'glass',count:18,power:5,scale:.24});else world.effect(e.x,e.z,e.color,24,5,'spark',y+.15);for(let i=0;i<(frost?0:7);i++){const a=i/7*Math.PI*2;world.lightning({x:e.x,z:e.z,toX:e.x+Math.sin(a)*e.radius,toZ:e.z+Math.cos(a)*e.radius,tier:1,y:y+.15,toY:y+.05});}}
 const ring=world.ring(e.radius,e.color,.035);ring.position.set(e.x,y+.05,e.z);world.scene.add(ring);world.effects.push({mesh:ring,life:.4,max:.4,ring:true});world.shake=Math.max(world.shake,fire?.12:.08);
}
