// Canonical browser layout. Nonstandard devices can be taught without guessing OS indices.
const finite=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
export function deadZone(x=0,y=0,zone=.2){
 x=finite(x);y=finite(y);const length=Math.hypot(x,y);
 if(length<=zone)return {x:0,y:0};const strength=Math.min(1,(length-zone)/(1-zone));return {x:x/length*strength,y:y/length*strength};
}
export function validCalibration(map,id){return !!map&&map.id===id&&map.buttons?.length===16&&map.axes?.length===4&&[...map.buttons,...map.axes].every(v=>v&&['button','axis'].includes(v.kind)&&Number.isInteger(v.index)&&v.index>=0&&v.index<64&&(v.kind==='button'||[1,-1].includes(v.sign)));}
export function mappedValue(pad,entry){if(!entry)return 0;if(entry.kind==='button')return Math.max(0,Math.min(1,Number(pad.buttons?.[entry.index]?.value)||(pad.buttons?.[entry.index]?.pressed?1:0)));const value=finite(pad.axes?.[entry.index]);return Math.max(0,Math.min(1,(value-(entry.rest||0))*entry.sign/(entry.range||1)));}
export function sampleGamepad(pad,previous=[],settings={}){
 if(!pad||pad.connected===false)return null;
 const custom=settings.gamepadLayout!=='standard'&&validCalibration(settings.rawMapping,pad.id),standard=pad.mapping==='standard'||settings.gamepadLayout==='standard';
 if(!custom&&!standard)return null;
 const values=custom?settings.rawMapping.buttons.map(e=>mappedValue(pad,e)):Array.from({length:Math.max(17,pad.buttons.length)},(_,i)=>mappedValue(pad,{kind:'button',index:i}));
 const axes=custom?settings.rawMapping.axes.map(e=>finite(pad.axes?.[e.index])*e.sign):pad.axes;
 const buttons=values.map(v=>v>.35);
 return {id:pad.id,index:pad.index,buttons,pressed:buttons.map((b,i)=>b&&!previous[i]),move:deadZone(axes[0],axes[1],settings.moveDeadzone??.2),aim:deadZone(axes[2],axes[3],settings.aimDeadzone??.18),triggers:[6,7].map(i=>values[i]||0),fire:buttons[7],brake:buttons[6],layout:custom?'calibrated':pad.mapping==='standard'?'standard':'manual'};
}
export function selectGamepad(pads,current,settings={}){
 const connected=pads.filter(p=>p&&p.connected!==false),old=connected.find(p=>p.index===current?.index&&p.id===current?.id);
 // Keep the active device stable. Otherwise prefer a usable pad over a raw auxiliary device.
 return (old&&sampleGamepad(old,[],settings)?old:null)||connected.find(p=>sampleGamepad(p,[],settings))||old||connected[0];
}
export function captureControl(pad,baseline,axisOnly=false){
 if(!axisOnly){const index=pad.buttons.findIndex((b,i)=>(b.pressed||b.value>.65)&&!(baseline.buttons[i]?.pressed||baseline.buttons[i]?.value>.35));if(index>=0)return {kind:'button',index};}
 let best=null,magnitude=.65;for(let index=0;index<pad.axes.length;index++){const delta=finite(pad.axes[index])-finite(baseline.axes[index]);if(Math.abs(delta)>magnitude){magnitude=Math.abs(delta);best={kind:'axis',index,sign:Math.sign(delta),rest:finite(baseline.axes[index]),range:Math.abs(finite(baseline.axes[index]))>.5?2:1};}}return best;
}
export function worldStick(stick){return {x:stick.x*.776+stick.y*.63,z:-stick.x*.63+stick.y*.776};}
