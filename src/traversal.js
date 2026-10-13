import * as T from 'three';
import {World} from './rebuild/World.js';
import {placeAnchorLabel} from './rebuild/TraversalLabels.js';
import {Simulation} from './rebuild/Simulation.js';
import {Input} from './rebuild/Input.js';
import {generateMap} from './rebuild/Map.js';
import {CONTROL_DEFAULTS,BINDINGS,buttonName} from './rebuild/ControllerConfig.js';
import {bindTouchAction} from './rebuild/TouchControls.js';
import {toggleFullscreen} from './rebuild/Fullscreen.js';
import {coursePlan,initTraversal,stepTraversal,supportBelow,grappleAvailability,traversalDemo} from './rebuild/Traversal.js';
const $=id=>document.getElementById(id);
try{await boot();}catch(error){$('loading').hidden=false;$('loading').replaceChildren();const heading=document.createElement('strong');heading.textContent='TRAINING COULD NOT START';const note=document.createElement('span');note.textContent=error.message;const retry=document.createElement('button');retry.textContent='RETRY';retry.onclick=()=>location.reload();$('loading').append(heading,note,retry);console.error(error);}
async function boot(){
 const plan=coursePlan(),b=plan.bounds;let saved={};try{saved=JSON.parse(localStorage.getItem('zb-quarantine-settings')||'{}');}catch{}
 const settings={...CONTROL_DEFAULTS,...saved,bindings:{...BINDINGS},quality:saved.quality||'balanced',viewMode:'diorama',worldTheme:'quarantine',visualStyle:'classic',shaderStyle:'natural',foliageDetail:'standard',environmentDetail:'standard',lightingDetail:saved.lightingDetail||'standard',populationDetail:'off',weatherEffects:'off',reducedMotion:saved.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches,gore:false};
 const layout={...generateMap(73),cover:[],bounds:b,boundary:[{x:b.minX,z:b.minZ},{x:b.maxX,z:b.minZ},{x:b.maxX,z:b.maxZ},{x:b.minX,z:b.maxZ}],road:{x:15,z:13,width:6}};
 const sim=new Simulation({layout,environment:{dayCycle:'day',weatherMode:'clear'}});sim.start('carbine');initTraversal(sim.player,plan.spawn);sim.events=[];sim.enemies=[];sim.props=plan.boxes;sim.obstacles=plan.boxes;
 const world=new World($('game'),settings,0,layout);world.applySettings(settings);world.portrait=matchMedia('(max-width:600px)').matches?28:25;world.touchView=true;
 const scene=new T.Group();world.scene.add(scene);const geo=new T.BoxGeometry(1,1,1);
 function box(color,x,y,z,w,h,d,kind='plaster'){const m=new T.Mesh(geo,world.surfaces.material(kind,color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;scene.add(m);world.surfaces.apply(m,kind,color);return m;}
 function label(text,x,y,z,w=3.4,h=.65,ground=false){const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#22383b';ctx.fillRect(0,0,768,128);ctx.fillStyle='#ebd6ab';ctx.font='bold 52px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,64,720);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map,roughness:.9}));m.position.set(x,y,z);if(ground)m.rotation.x=-Math.PI/2;scene.add(m);return m;}
 // Texture and dimensions come from the same boxes used for collision.
 for(const [i,o]of plan.boxes.entries()){
  box(o.color,o.x,o.h/2,o.z,o.w,o.h,o.d,i?'brick':'cladding');
  box(0x64716b,o.x,o.h-.055,o.z,o.w+.08,.1,o.d+.08,'roof');
  for(const side of [-1,1]){box(0xc7b995,o.x+side*(o.w/2-.11),o.h+.02,o.z,.1,.025,o.d-.15,'metal');box(0xc7b995,o.x,o.h+.02,o.z+side*(o.d/2-.11),o.w-.15,.025,.1,'metal');}
  label(o.label,o.x,o.h-.42,o.z+o.d/2+.018,Math.min(4,o.w-.3),.55);
  if(!i){for(let x=-1.5;x<1.6;x+=.5)box(0xd5ac68,o.x+x,o.h+.025,o.z+.9,.23,.03,.5,'metal');}
  else{
   for(let y=1.1;y<o.h-1;y+=2.1)for(const side of [-1,1]){
    for(let x=-o.w/2+1;x<o.w/2-.5;x+=1.8){box(0x3e555a,o.x+x,y,o.z+side*(o.d/2+.025),1.1,1.25,.05,'metal');box(0xa7bab4,o.x+x,y,o.z+side*(o.d/2+.06),.05,1.25,.07,'metal');}
   }
   // Roof service markings stay flat and cannot create invisible collision.
   for(let j=0;j<3;j++)box(0xa5aea1,o.x-1+j*.65,o.h+.018,o.z-.9,.25,.025,1,'metal');
   label(`${o.h.toFixed(1)} M`,o.x,o.h+.038,o.z+.2,2.5,.65,true);
  }
 }
 // Custom course architecture must use the same visibility shader as city buildings.
 // Bind before adding ground signs, anchors and landing effects.
 world.cutaway.bind(scene);
 label('SAINT-ROCH / ROOFTOP ACCESS',-4,.035,10,8,1,true);
 label('01  ↑  JUMP',0,.038,5.6,3,.75,true);
 const anchorModels=plan.anchors.map(a=>{box(0x4b605e,a.x,(a.y+plan.boxes.find(b=>b.id===a.supportId).h)/2,a.z,.08,a.y-plan.boxes.find(b=>b.id===a.supportId).h,.08,'metal');const m=new T.Mesh(new T.TorusGeometry(.34,.07,7,24),new T.MeshStandardMaterial({color:0xf8b567,emissive:0x7b4116,emissiveIntensity:.4,roughness:.35,metalness:.55}));m.position.set(a.x,a.y,a.z);scene.add(m);return m;});
 const cable=new T.Line(new T.BufferGeometry().setFromPoints(Array.from({length:17},()=>new T.Vector3())),new T.LineBasicMaterial({color:0xffd598}));cable.frustumCulled=false;cable.visible=false;world.scene.add(cable);
 const landing=new T.Mesh(new T.RingGeometry(.45,.5,32),new T.MeshBasicMaterial({color:0xeac897,transparent:true,opacity:0,depthWrite:false}));landing.rotation.x=-Math.PI/2;scene.add(landing);let landTime=0;
 const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xa39d8a,roughness:1,transparent:true,opacity:.55}),24);dust.frustumCulled=false;scene.add(dust);dust.count=0;let dustParts=[];const dummy=new T.Object3D();
 const visited=new Set();let checkpoint={...plan.spawn},selected=0,noticeUntil=0,last=performance.now(),accumulator=0,hudAt=0,frameInput=null,demo=false,notifiedReady=false;
 const input=new Input($('game'),action=>{if(action==='pause')togglePause();if(action==='nextWeapon')select(1);if(action==='prevWeapon')select(-1);},settings);
 input.onWeaponWheel=event=>{if(event?.type==='cycle'||event?.type==='open')select(event.hand?-1:1);};
 const announce=(text)=>{$('notice').textContent=text;noticeUntil=performance.now()+3200;};
 function select(delta){if(sim.player.grapple){announce('RELEASE CABLE TO CHANGE ANCHOR');return;}selected=(selected+delta+plan.anchors.length)%plan.anchors.length;announce(`ANCHOR / ${plan.anchors[selected].label}`);}
 function reset(all=false){demo=false;frameInput=null;input.clear();if(all){visited.clear();checkpoint={...plan.spawn};selected=0;}initTraversal(sim.player,checkpoint);world.player.position.set(checkpoint.x,checkpoint.y,checkpoint.z);world.focus.set(checkpoint.x,checkpoint.y*.8,checkpoint.z);dustParts=[];dust.count=0;sim.events=[];announce(all?'COURSE RESET':'BACK AT CHECKPOINT');}
 function togglePause(){if($('pause-dialog').open){$('pause-dialog').close();return;}input.clear();sim.state='paused';$('pause-dialog').showModal();$('resume').focus();}
 $('pause-dialog').addEventListener('close',()=>{input.clear();sim.state='playing';accumulator=0;frameInput=null;last=performance.now();$('game').focus({preventScroll:true});});
 function startDemo(){if($('pause-dialog').open)$('pause-dialog').close();reset(true);demo=true;announce('DEMONSTRATION · MOVE TO TAKE OVER');$('game').focus({preventScroll:true});}
 $('demo').onclick=startDemo;$('demo-paused').onclick=startDemo;
 $('resume').onclick=()=>$('pause-dialog').close();$('restart').onclick=()=>{reset(true);$('pause-dialog').close();};$('exit').onclick=()=>{location.href='./';};$('pause').onclick=togglePause;
 $('fullscreen').onclick=async()=>{try{await toggleFullscreen();}catch(error){announce(error.message);}};
 for(const [id,action]of [['jump',()=>input.once.dash=true],['grapple',()=>input.once.grenade=true],['target',()=>select(1)],['return',()=>reset()]])bindTouchAction($(id),input,()=>{if(sim.state!=='playing')return;action();if(input.source!=='touch')$('game').focus({preventScroll:true});});
 // Course-only keys deliberately leave the expedition bindings untouched.
 addEventListener('keydown',e=>{if($('pause-dialog').open)return;if(e.code==='KeyT'&&!e.repeat)select(e.shiftKey?-1:1);if(e.code==='KeyG'&&!e.repeat)input.once.grenade=true;});
 addEventListener('keydown',e=>{if(document.activeElement?.tagName==='BUTTON'&&['Space','Enter'].includes(e.code))e.stopPropagation();},{capture:true});
 const suspend=()=>{if(sim.state==='playing')togglePause();};addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.bagarreDesktop?.onSuspend(suspend);
 addEventListener('resize',()=>{world.portrait=innerWidth<600?28:25;world.resize();});
 function rumble(strength,duration){const actuator=input.rawPad?.vibrationActuator;if(!actuator?.playEffect||settings.vibration===0)return;try{actuator.playEffect('dual-rumble',{duration,startDelay:0,strongMagnitude:strength*(settings.vibration??70)/100,weakMagnitude:strength*.5*(settings.vibration??70)/100})?.catch?.(()=>{});}catch{}}
 function feedback(events){for(const e of events){if(e.type==='blocked')announce(e.message);if(e.type==='attach')rumble(.22,65);if(e.type==='jump')rumble(.12,30);if(e.type==='land'){
  const p=sim.player;rumble(Math.min(.65,e.speed/25),85);landing.position.set(p.x,p.y+.045,p.z);landTime=.4;
  if(!settings.reducedMotion)dustParts=Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return{x:p.x,y:p.y+.08,z:p.z,floor:p.y,vx:Math.sin(a)*(1+i%3*.35),vz:Math.cos(a)*(1+i%3*.35),vy:.8+i%4*.3,size:.028+i%3*.014,life:.55};});
  const roof=plan.boxes.find(b=>b.id===e.supportId);if(roof&&!visited.has(roof.id)){visited.add(roof.id);checkpoint={x:roof.x,y:roof.h,z:roof.z};announce(visited.size===4?'ROOFTOP RUN COMPLETE · KEEP EXPLORING':`${roof.label} · CHECKPOINT`);const index=plan.boxes.indexOf(roof);selected=Math.min(index,plan.anchors.length-1);}
 }}}
 function projectTag(el,pos){
  const q=new T.Vector3(pos.x,pos.y,pos.z).project(world.camera);let point={x:(q.x*.5+.5)*innerWidth,y:(-q.y*.5+.5)*innerHeight};
  if(el.id==='anchor-tag'){const p=sim.player,hero=new T.Vector3(p.x,p.y+2.15,p.z).project(world.camera);point=placeAnchorLabel(point,{x:(hero.x*.5+.5)*innerWidth,y:(-hero.y*.5+.5)*innerHeight},innerWidth);}
  el.style.left=`${point.x}px`;el.style.top=`${point.y}px`;el.hidden=q.z>1||Math.abs(q.x)>1.1||Math.abs(q.y)>1.1;el.style.visibility=el.hidden?'hidden':'visible';
 }
 function updateHud(now){const p=sim.player,a=plan.anchors[selected],reason=grappleAvailability(p,a,plan.boxes),pad=input.source==='gamepad'&&input.pad,family=input.family;
  $('height').innerHTML=`${p.y.toFixed(1)} <small>m</small>`;$('motion').textContent=p.grapple?'REELING':p.grounded?'GROUNDED':p.vy>0?'RISING':'FALLING';$('progress').textContent=`${visited.size} / 4`;
  const next=plan.boxes.find(b=>!visited.has(b.id));$('objective').textContent=next?`${String(plan.boxes.indexOf(next)+1).padStart(2,'0')} / ${next.id==='step'?'JUMP ONTO THE CARGO':'REACH THE '+next.label.split(' / ')[1]}`:'COURSE COMPLETE';
  $('instruction').textContent=next?.id==='step'?'Move toward the striped crate and jump. Amber rings mark grapple anchors.':next?'Grapple to a marked anchor. Tap again to release; steer in the air to land.':'All four checkpoints reached. Try releasing the cable between rooftops.';
  [...$('steps').children].forEach((el,i)=>el.classList.toggle('done',visited.has(plan.boxes[i].id)));
  const labels=pad?[buttonName(0,family),buttonName(4,family),'← / →',buttonName(3,family)]:['SPACE','E','T','R'];['jump','grapple','target','return'].forEach((id,i)=>$(id).querySelector('kbd').textContent=labels[i]);
  $('input-help').textContent=pad?'LEFT STICK · MOVE / D-PAD ← → · ANCHOR':input.source==='touch'?'DRAG STICK · TAP JUMP / GRAPPLE':'WASD / ARROWS · MOVE';
  $('grapple').querySelector('span').textContent=p.grapple?'RELEASE':'GRAPPLE';$('grapple').setAttribute('aria-label',p.grapple?'Release grapple cable':'Grapple to selected anchor');
  $('anchor-tag').querySelector('span').textContent=`${a.label} · ${p.grapple?'ATTACHED':reason||'READY'}`;$('anchor-tag').classList.toggle('blocked',!!reason&&!p.grapple);
  if(now>noticeUntil)$('notice').textContent='';
 }
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;input.pollGamepad(sim,now);
  if(sim.state==='playing'){
   const controls=input.consume(world,false,sim,dt);if(controls.interact||controls.reload)reset();if(Math.hypot(controls.x,controls.z)>.1||controls.dash||controls.grenade)demo=false;
   // Retain edge-triggered actions on frames shorter than a simulation tick.
   frameInput={...controls,dash:!!(controls.dash||frameInput?.dash),grenade:!!(controls.grenade||frameInput?.grenade)};accumulator+=dt;
   while(accumulator>=1/120){const command=demo?traversalDemo(sim.player,visited,plan):{x:frameInput.x,z:frameInput.z,jump:frameInput.dash,grapple:frameInput.grenade,anchorId:plan.anchors[selected].id};feedback(stepTraversal(sim.player,command,1/120,plan.boxes,plan.anchors,plan.bounds));frameInput.dash=frameInput.grenade=false;sim.time+=1/120;accumulator-=1/120;}
  }else{frameInput=null;accumulator=0;}
  const p=sim.player,motionDt=sim.state==='playing'?dt:0;p.supportY=supportBelow(p,plan.boxes).y;
  cable.visible=!!p.grapple;const a=plan.anchors.find(a=>a.id===p.grapple?.anchorId);if(a){const points=cable.geometry.attributes.position;for(let i=0;i<17;i++){const t=i/16;points.setXYZ(i,p.x+(a.x-p.x)*t,p.y+1.2+(a.y-p.y-1.2)*t-Math.sin(t*Math.PI)*.1,p.z+(a.z-p.z)*t);}points.needsUpdate=true;}
  anchorModels.forEach((m,i)=>{m.material.emissiveIntensity=i===selected?.9:.15;m.scale.setScalar(i===selected?1.12:1);});
  landTime=Math.max(0,landTime-motionDt);landing.visible=landTime>0&&!settings.reducedMotion;landing.scale.setScalar(1+(1-landTime/.4)*2);landing.material.opacity=landTime/.4*.45;
  dustParts=dustParts.filter(d=>{d.life-=motionDt;d.x+=d.vx*motionDt;d.z+=d.vz*motionDt;d.y+=d.vy*motionDt;d.vy-=6*motionDt;if(d.y<d.floor+.025){d.y=d.floor+.025;d.vy=0;}return d.life>0;});dust.count=dustParts.length;dustParts.forEach((d,i)=>{dummy.position.set(d.x,d.y,d.z);dummy.scale.setScalar(d.size*d.life/.55);dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);});dust.instanceMatrix.needsUpdate=true;
  world.update(sim,motionDt);projectTag($('anchor-tag'),plan.anchors[selected]);projectTag($('hero-tag'),{x:p.x,y:p.y+2.15,z:p.z});
  if(now>hudAt){updateHud(now);hudAt=now+70;}
  $('loading').hidden=true;if(!notifiedReady){window.bagarreDesktop?.ready?.();notifiedReady=true;}requestAnimationFrame(frame);
 }
 // Local regression controls exercise the real course meshes at occlusion edges.
 // No test controls or teleportation are included in the public build.
 if(import.meta.env.DEV&&new URLSearchParams(location.search).has('visibilityQA')){
  const panel=document.createElement('div');panel.setAttribute('aria-label','Visibility test positions');Object.assign(panel.style,{position:'fixed',bottom:'100px',left:'12px',zIndex:20,display:'flex',gap:'6px',flexWrap:'wrap',maxWidth:'95vw'});
  const roof=plan.boxes[1];
  for(const [name,x,y,z]of [['Behind building',roof.x,0,roof.z-roof.d/2-.6],['Against corner',roof.x-roof.w/2-.5,0,roof.z-roof.d/2-.5],['On rooftop',roof.x,roof.h,roof.z],['Above rooftop',roof.x,roof.h+2,roof.z],['In front',roof.x,0,roof.z+roof.d/2+2]]){
   const button=document.createElement('button');button.textContent=name;button.onclick=()=>{demo=false;input.clear();initTraversal(sim.player,{x,y,z});sim.player.grounded=name!=='Above rooftop';sim.state='paused';world.player.position.set(x,y,z);world.focus.set(x,y*.8,z);announce(`VISIBILITY TEST / ${name.toUpperCase()}`);};panel.append(button);
  }
  document.body.append(panel);
 }
 $('game').focus({preventScroll:true});requestAnimationFrame(frame);
}
