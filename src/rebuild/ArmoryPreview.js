import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createWeaponMesh} from './WeaponModels.js';
const cache=new Map();
// Render the actual equipped geometry, once per weapon/tier. No extra gameplay renderer.
export function armoryPreviews(requests){
 const missing=requests.filter(([key,tier])=>!cache.has(`${key}:${tier}`));if(!missing.length)return cache;
 let renderer,environment;
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(400,180);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  const scene=new T.Scene();scene.environment=environment.texture;scene.environmentIntensity=.85;scene.add(new T.HemisphereLight(0xe8f4ef,0x303c36,2));const light=new T.DirectionalLight(0xffd6a0,3);light.position.set(-2,4,2);scene.add(light);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.01,30);camera.position.set(3,2.5,1.3);camera.lookAt(0,0,0);
  for(const [key,tier]of missing){const weapon=new T.Group(),primary=createWeaponMesh(key,{batch:()=>{}},tier);weapon.add(primary);if(key==='dual'){primary.position.x=-.09;primary.rotation.y=-.13;const second=createWeaponMesh(key,{batch:()=>{}},tier);second.position.set(.16,.06,.08);second.rotation.y=.18;weapon.add(second);}const bounds=new T.Box3().setFromObject(weapon),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());weapon.position.sub(center);scene.add(weapon);const extent=Math.max(size.z,size.x)*.64;camera.left=-extent;camera.right=extent;camera.top=extent*.45;camera.bottom=-extent*.45;camera.updateProjectionMatrix();renderer.render(scene,camera);cache.set(`${key}:${tier}`,renderer.domElement.toDataURL('image/png'));scene.remove(weapon);weapon.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}
 }catch{/* A low-memory device can still use the accessible weapon names and stats. */}
 finally{environment?.dispose();renderer?.dispose();renderer?.forceContextLoss();}
 return cache;
}
