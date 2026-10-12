// Development-only input adapter. Uses real Input/menu/combat paths with a virtual pad.
export function installControllerQA(input,getSim){
 const pad={id:'DualSense (VIRTUAL TEST DEVICE)',index:99,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};let connected=true,busy=false;input.getGamepads=()=>connected?[pad]:[];
 const panel=document.createElement('aside');panel.id='controller-qa';panel.style.cssText='position:fixed;top:6px;right:8px;z-index:99999;background:#142125;color:#eee8d8;border:1px solid #f18147;padding:8px;font:10px monospace;max-width:310px';
 const report=document.createElement('output');report.id='controller-qa-report';report.style.display='block';
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const press=async(index,ms=140)=>{pad.buttons[index]={pressed:true,value:1};await wait(ms);pad.buttons[index]={pressed:false,value:0};await wait(220);};
 const scenarios={
 'QA Hide panel':async()=>{panel.hidden=true;},
 'QA Start':async()=>{document.getElementById('start').focus();await press(0);},
 'QA Left fire':async()=>{pad.axes[2]=.8;await press(input.settings.bindings.leftFire,650);pad.axes[2]=0;},
 'QA Right fire':async()=>{pad.axes[2]=.8;await press(input.settings.bindings.rightFire,650);pad.axes[2]=0;},
 'QA Enter vehicle':()=>press(input.settings.bindings.interact),
 'QA Accelerate':()=>press(7,1800),
 'QA Handbrake':()=>press(1,1400),
 'QA Reverse':()=>press(6,1000),
 'QA Steering':async()=>{pad.axes[0]=.45;await press(7,900);pad.axes[0]=0;},
 'QA Auto':()=>press(input.settings.bindings.auto),
 'QA Map cursor':async()=>{await press(input.settings.bindings.map);pad.axes[2]=.7;pad.axes[3]=.3;await wait(700);pad.axes[2]=pad.axes[3]=0;await press(0);},
 'QA Map center':()=>press(11),
 'QA Map clear':()=>press(2),
 'QA Down':()=>press(13),
 'QA Right':()=>press(15),
 'QA Confirm':()=>press(0),
 'QA Back':()=>press(1),
 'QA Pause':()=>press(input.settings.bindings.pause),
 'QA Arsenal':()=>press(input.settings.bindings.arsenal),
 'QA Disconnect':async()=>{connected=false;},
 'QA Reconnect':async()=>{connected=true;},
 'QA Touch mode':async()=>{connected=false;input.source='touch';},
 };
 for(const [name,fn]of Object.entries(scenarios)){const b=document.createElement('button');b.textContent=name;b.style.cssText='border:1px solid #879990;padding:5px;margin:2px;font:10px monospace';b.onpointerdown=e=>e.preventDefault();b.onclick=async()=>{if(busy)return;busy=true;await wait(300);try{await fn();}finally{busy=false;}};panel.append(b);}panel.append(report);document.body.append(panel);
 setInterval(()=>{const root=[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;if(panel.parentElement!==root)root.append(panel);const s=getSim();if(s.state==='playing')s.player.invulnerable=2;report.textContent='VIRTUAL PAD / INVULNERABLE TEST / NOT HARDWARE PROOF · '+JSON.stringify({state:s.state,auto:input.settings.autoFire,magazines:s.player.equipped.map((k,i)=>s.player.magazines[i&&s.player.equipped[0]===k?'offhand':k]),vehicle:s.props.filter(v=>v.id===s.player.vehicleId).map(v=>({type:v.vehicleType,speed:+v.speed.toFixed(2),angle:+v.angle.toFixed(2),x:+v.x.toFixed(2),z:+v.z.toFixed(2),health:v.health})),source:input.source,guard:input.padGuard,focus:document.activeElement?.id,waypoint:s.player.waypoint});},200);
}
