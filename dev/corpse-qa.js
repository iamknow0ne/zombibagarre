import * as T from 'three';
import {buildEnemy} from '../src/rebuild/EnemyVisuals.js';
import {World} from '../src/rebuild/World.js';
import {disposeObjectResources} from '../src/rebuild/ResourceDisposal.js';
if(!import.meta.env.DEV)throw new Error('Local QA fixture only');
const renderer=new T.WebGLRenderer({canvas:document.querySelector('#view'),antialias:true}),scene=new T.Scene(),camera=new T.PerspectiveCamera(42,innerWidth/innerHeight,.1,50);
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=T.ACESFilmicToneMapping;scene.background=new T.Color(0x263032);scene.add(new T.HemisphereLight(0xe4e9df,0x333d35,3));
camera.position.set(5,5,12);camera.lookAt(0,.8,0);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x626a65,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.05;scene.add(floor);
const types=['walker','runner','brute','armored','spitter','volatile'],button=document.querySelector('#run'),output=document.querySelector('#report');let actors=[],running=false,cycle=0,phase=0,baseline=0,peak=0,checkpoints=[];
const render=()=>renderer.render(scene,camera);
render();
button.onclick=()=>{if(running)return;cycle=phase=0;checkpoints=[];baseline=renderer.info.memory.geometries;peak=baseline;running=true;button.disabled=true;};
function cleanup(){for(const actor of actors){actor.removeFromParent();disposeObjectResources(actor);}actors=[];}
function frame(){requestAnimationFrame(frame);if(!running)return;try{
 if(phase===0){actors=types.map((type,i)=>{const actor=buildEnemy(type,cycle%6);actor.position.set((i-2.5)*1.5,0,0);scene.add(actor);return actor;});}
 else if(phase===1){for(const actor of actors){actor.userData.body.rotation.x=1.4;World.prototype.batchStatic.call({},actor,actor);}}
 else cleanup();
 render();const count=renderer.info.memory.geometries;peak=Math.max(peak,count);
 if(phase===2){cycle++;checkpoints.push(count);}
 output.textContent=JSON.stringify({cycles:cycle,total:30,phase:['live','settled','removed'][phase],baselineGeometries:baseline,currentGeometries:count,peakGeometries:peak,postRemoval:checkpoints,pass:cycle===30?checkpoints.every(n=>n===baseline):null},null,2);
 phase=(phase+1)%3;if(cycle===30){running=false;button.disabled=false;}
 }catch(error){running=false;button.disabled=false;cleanup();output.textContent=String(error.stack||error);}}
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{running=false;cleanup();disposeObjectResources(scene);renderer.dispose();renderer.forceContextLoss();});
