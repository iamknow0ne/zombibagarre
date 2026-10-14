import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const $=id=>document.getElementById(id),models={v1:new URL('../assets/characters/rook-prototype-v1.glb',import.meta.url),v2:new URL('../assets/characters/rook-prototype-v2.glb',import.meta.url)},motion=matchMedia('(prefers-reduced-motion: reduce)');
let renderer,controls,mixer,content,action,clips=[],playing=false,turning=false,disposed=false,contextLost=false,loadRevision=0,raf=0,last=0,lastReport=0,height=1.8,width=.8,direction='front',normalMaterial;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.02,100),pivot=new T.Group(),originalMaterials=new Map();scene.background=new T.Color(0x243332);scene.add(pivot);
const floorGeometry=new T.PlaneGeometry(40,40),floorMaterial=new T.MeshStandardMaterial({color:0x293a38,roughness:1}),floor=new T.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.012;scene.add(floor);
const hemi=new T.HemisphereLight(0xe4e9df,0x333d35,1.6),key=new T.DirectionalLight(0xffe7c9,3),fill=new T.DirectionalLight(0xbad1d7,1.1);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-1,near:.1,far:15});key.shadow.bias=-.0001;key.shadow.normalBias=.015;fill.position.set(3,3,-3);scene.add(hemi,key,fill);
const listeners=[];
function listen(target,name,handler,options){target.addEventListener(name,handler,options);listeners.push(()=>target.removeEventListener(name,handler,options));}
function status(text){$('load-state').textContent=text;}
function showError(message){$('error-text').textContent=message;$('error-panel').hidden=false;status('MODEL NOT LOADED');}
function syncButtons(){
 $('turntable').setAttribute('aria-pressed',String(turning));$('play').setAttribute('aria-pressed',String(playing));$('play').textContent=playing?'Pause':'Play';$('play').disabled=!action;
 for(const button of document.querySelectorAll('[data-direction]'))button.setAttribute('aria-pressed',String(!turning&&button.dataset.direction===direction));
}
function frameCamera(){
 if(!controls)return;const framing=$('framing').value,face=framing==='face',gameplay=framing==='gameplay',targetY=height*(face?.9:.51),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));
 const top=document.querySelector('header').getBoundingClientRect().bottom+12,bottom=innerHeight-document.querySelector('footer').getBoundingClientRect().top+12,usable=Math.max(innerHeight*.3,innerHeight-top-bottom);camera.setViewOffset(innerWidth,innerHeight,0,-(top-bottom)/2,innerWidth,innerHeight);
 let distance=face?height*.21/tan:Math.max(height*.61/tan*(innerHeight/usable),width*.7/(tan*camera.aspect));if(gameplay)distance=Math.max(distance,height*7.7);
 const yaw=direction==='back'?Math.PI:direction==='profile'?Math.PI/2:0,elevation=gameplay?.76:face?.025:.075;
 controls.target.set(0,targetY,0);camera.position.set(Math.sin(yaw)*distance, targetY+distance*elevation,Math.cos(yaw)*distance);controls.minDistance=height*.12;controls.maxDistance=height*30;camera.near=Math.max(.005,height*.006);camera.far=Math.max(100,height*60);camera.updateProjectionMatrix();controls.update();
}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;renderer.setSize(innerWidth,innerHeight);frameCamera();}
function disposeModel(root){if(!root)return;const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)skeletons.add(o.skeleton);for(const material of [].concat(originalMaterials.get(o)||o.material||[])){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();for(const material of materials)if(material!==normalMaterial)material.dispose();for(const skeleton of skeletons)skeleton.dispose();root.removeFromParent();}
function clearModel(){if(mixer){mixer.stopAllAction();if(content)mixer.uncacheRoot(content);}mixer=null;action=null;disposeModel(content);content=null;originalMaterials.clear();clips=[];pivot.clear();playing=false;turning=false;syncButtons();}
function surfaceMode(){if(!content)return;const normal=$('surface').value==='normal';normalMaterial??=new T.MeshNormalMaterial();content.traverse(o=>{if(o.isMesh){if(!originalMaterials.has(o))originalMaterials.set(o,o.material);o.material=normal?normalMaterial:originalMaterials.get(o);}});}
function selectClip(){if(!mixer)return;const clip=$('clip').value===''?null:clips[Number($('clip').value)];mixer.stopAllAction();action=clip?mixer.clipAction(clip):null;if(action){action.reset();action.play();}playing=!!action&&!motion.matches;mixer.update(0);syncButtons();}
async function loadModel(){
 const revision=++loadRevision,modelURL=models[$('study').value]||models.v2;clearModel();$('error-panel').hidden=true;$('clip').disabled=true;$('clip').replaceChildren(new Option('Loading clips…',''));status('LOADING ROOK PROTOTYPE');
 try{
  const gltf=await new GLTFLoader().loadAsync(modelURL.href,event=>{if(revision!==loadRevision||disposed)return;if(event.total>0)status(`LOADING MODEL · ${Math.round(event.loaded/event.total*100)}%`);});
  if(disposed||revision!==loadRevision){disposeModel(gltf.scene);return;}
  content=gltf.scene;content.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(content),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());if(bounds.isEmpty()||!Number.isFinite(size.y)||size.y<=0)throw new Error('The GLB has no measurable visible geometry.');height=size.y;width=Math.max(size.x,size.z);
  const placement=new T.Group();placement.position.set(-center.x,-bounds.min.y,-center.z);placement.add(content);pivot.add(placement);pivot.rotation.set(0,0,0);
  let meshes=0,bones=0;content.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false;meshes++;}if(o.isBone)bones++;});
  clips=gltf.animations||[];mixer=new T.AnimationMixer(content);$('clip').replaceChildren(new Option('Bind pose',''));clips.forEach((clip,i)=>$('clip').append(new Option(clip.name||`Clip ${i+1}`,String(i))));$('clip').disabled=false;const idle=clips.findIndex(clip=>/idle/i.test(clip.name));$('clip').value=idle>=0?String(idle):'';
  if(idle>=0)selectClip();else{action=null;playing=false;syncButtons();}surfaceMode();frameCamera();status(`${meshes} meshes · ${bones} bones · ${clips.length} imported clips · ${height.toFixed(2)}m authored height`);
 }catch(error){if(disposed||revision!==loadRevision)return;clearModel();$('clip').replaceChildren(new Option('No model loaded',''));showError(`Could not load ${modelURL.pathname.split('/').at(-1)}. ${error.message} If export is still running, retry once the file is ready.`);}
}
function destroy(){if(disposed)return;disposed=true;loadRevision++;cancelAnimationFrame(raf);listeners.splice(0).forEach(remove=>remove());controls?.dispose();clearModel();normalMaterial?.dispose();floorGeometry.dispose();floorMaterial.dispose();key.shadow.map?.dispose();key.shadow.mapPass?.dispose();renderer?.renderLists.dispose();renderer?.dispose();renderer?.forceContextLoss();}
function tick(now){if(disposed)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!document.hidden){if(playing&&mixer)mixer.update(dt);if(turning)pivot.rotation.y+=dt*.3;controls.update();renderer.render(scene,camera);if(now-lastReport>350){const info=renderer.info;$('render-stats').textContent=`${info.render.calls.toLocaleString()} draw calls · ${info.render.triangles.toLocaleString()} triangles / frame · ${info.memory.geometries} geometries · ${info.memory.textures} textures`;lastReport=now;}}raf=requestAnimationFrame(tick);}
try{
 renderer=new T.WebGLRenderer({canvas:$('view'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 controls=new OrbitControls(camera,$('view'));controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.49;
 listen(controls,'start',()=>{turning=false;direction='custom';syncButtons();});
 for(const button of document.querySelectorAll('[data-direction]'))listen(button,'click',()=>{direction=button.dataset.direction;turning=false;pivot.rotation.y=0;frameCamera();syncButtons();});
 listen($('turntable'),'click',()=>{turning=!turning;syncButtons();});listen($('framing'),'change',frameCamera);listen($('clip'),'change',selectClip);listen($('play'),'click',()=>{if(action)playing=!playing;syncButtons();});listen($('surface'),'change',surfaceMode);
 listen($('reference-toggle'),'click',()=>{const visible=$('reference').hidden;$('reference').hidden=!visible;$('reference-toggle').setAttribute('aria-pressed',String(visible));});
 listen($('study'),'change',loadModel);listen($('retry'),'click',()=>contextLost?location.reload():loadModel());listen(window,'resize',resize);listen(window,'pagehide',destroy);listen(document,'visibilitychange',()=>{last=performance.now();});listen(motion,'change',()=>{if(motion.matches){playing=turning=false;syncButtons();}});
 listen($('view'),'webglcontextlost',event=>{event.preventDefault();contextLost=true;playing=turning=false;syncButtons();showError('The graphics context was lost. Reload this viewer to restore it.');$('retry').textContent='Reload viewer';});
 resize();last=performance.now();raf=requestAnimationFrame(tick);await loadModel();
}catch(error){showError(`The 3D viewer could not start. ${error.message}`);$('retry').textContent='Reload viewer';$('retry').onclick=()=>location.reload();}
