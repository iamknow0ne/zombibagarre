// Hand 0 is the right/main hand; hand 1 is the left/off hand.
export const BINDINGS={rightFire:11,leftFire:6,dash:0,reload:2,interact:3,grenade:4,nextWeapon:15,leftWeapon:14,arsenal:12,map:8,auto:10,pause:9,bulletTime:1,aim:13};
export const ACTION_NAMES={rightFire:'Right weapon / melee',leftFire:'Left weapon',dash:'Dodge',reload:'Reload both weapons',interact:'Enter / exit vehicle',grenade:'Throw ordnance',nextWeapon:'Right hand · tap cycle / hold wheel',leftWeapon:'Left hand · tap cycle / hold wheel',arsenal:'Open arsenal',map:'Open map',auto:'Toggle auto fire',pause:'Pause',bulletTime:'Toggle Focus / bullet time',aim:'Precision aim · TPS / FPS'};
export const CONTROL_DEFAULTS={bindings:{...BINDINGS},gamepadLayout:'auto',moveDeadzone:.2,aimDeadzone:.18,aimSensitivity:1,invertAim:false,aimAssist:true,vibration:70,promptStyle:'auto',autoFire:true,adaptiveTriggers:false,drivingStyle:'assisted',steerSensitivity:1};
export function controlSettings(value={}){
 const out={...CONTROL_DEFAULTS,...value,bindings:{...BINDINGS}};
 const used=new Set();for(const key of Object.keys(BINDINGS)){const v=value.bindings?.[key]??(key==='leftWeapon'?value.bindings?.prevWeapon:undefined)??(['bulletTime','aim'].includes(key)&&used.has(BINDINGS[key])?Array.from({length:16},(_,i)=>i).find(i=>!used.has(i)):BINDINGS[key]);if(!Number.isInteger(v)||v<0||v>15||used.has(v)){out.bindings={...BINDINGS};break;}out.bindings[key]=v;used.add(v);}
 for(const [key,min,max]of [['moveDeadzone',.05,.4],['aimDeadzone',.05,.4],['aimSensitivity',.4,2],['vibration',0,100],['steerSensitivity',.6,1.4]])out[key]=Number.isFinite(+out[key])?Math.max(min,Math.min(max,+out[key])):CONTROL_DEFAULTS[key];
 if(!['auto','standard'].includes(out.gamepadLayout))out.gamepadLayout='auto';
 if(!['racing','assisted'].includes(out.drivingStyle))out.drivingStyle=CONTROL_DEFAULTS.drivingStyle;
 if(!['auto','playstation','xbox','generic'].includes(out.promptStyle))out.promptStyle='auto';return out;
}
export function rebind(bindings,action,button){const next={...bindings};const other=Object.keys(next).find(k=>k!==action&&next[k]===button);if(other)next[other]=next[action];next[action]=button;return next;}
export function controllerFamily(id='',override='auto'){return override!=='auto'?override:/xbox|xinput|045e|steam|valve|28de/i.test(id)?'xbox':/dualsense|dualshock|playstation|054c|sony|wireless controller/i.test(id)?'playstation':'generic';}
const PS=['×','○','□','△','L1','R1','L2','R2','CREATE','OPTIONS','L3','R3','↑','↓','←','→','PS'];
const XB=['A','B','X','Y','LB','RB','LT','RT','VIEW','MENU','LS','RS','↑','↓','←','→','XBOX'];
export function buttonName(index,family='playstation'){return (family==='playstation'?PS:family==='xbox'?XB:null)?.[index]??`B${index+1}`;}
export function glyph(index,family='playstation'){const text=buttonName(index,family);return `<span class="pad-key ${index<4?'pad-face':''}" aria-label="${family==='playstation'?['Cross','Circle','Square','Triangle'][index]||text:text}">${text}</span>`;}
export function handInput(pad,bindings=BINDINGS){return [!!pad?.buttons[bindings.rightFire],!!pad?.buttons[bindings.leftFire]];}
export function stepRange(value,direction,{min=0,max=100,step=1}={}){return Math.max(+min,Math.min(+max,+(+value+direction*(+step||1)).toFixed(4)));}
export function enabledOptionIndex(options,index,direction,wrap=false){
 const step=Math.sign(direction);if(!step||!options.length)return index;
 for(let n=1;n<=options.length;n++){
  const candidate=index+n*step;if(!wrap&&(candidate<0||candidate>=options.length))break;
  const i=(candidate%options.length+options.length)%options.length,o=options[i];
  if(!o.disabled&&!o.hidden&&!(o.parentElement?.tagName==='OPTGROUP'&&o.parentElement.disabled))return i;
 }return index;
}
export function directionalControl(rects,index,x,y){
 const from=rects[index];if(!from)return 0;const cx=from.left+from.width/2,cy=from.top+from.height/2;
 const candidates=rects.map((r,i)=>({i,dx:r.left+r.width/2-cx,dy:r.top+r.height/2-cy})).filter(v=>v.i!==index&&(x?v.dx*x>4:v.dy*y>4));
 candidates.sort((a,b)=>{const score=v=>Math.abs(x?v.dx:v.dy)+Math.abs(x?v.dy:v.dx)*2.5;return score(a)-score(b);});
 return candidates[0]?.i??((index+(x||y)+rects.length)%rects.length);
}
