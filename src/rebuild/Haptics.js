export function feedbackPattern(event){
 const shot={carbine:[.18,.55,65],smg:[.08,.4,40],shotgun:[.85,.5,160],revolver:[.55,.65,110],marksman:[.7,.4,140],launcher:[1,.65,210],flame:[.14,.22,90],arc:[.12,.85,80]};
 let spec=event.type==='shoot'?shot[event.weapon]||[.25,.4,70]:({hurt:[.85,.45,210],explosion:[1,.65,260],dash:[.1,.45,90],slice:[.3,.7,100],throw:[.2,.3,110],loaded:[.12,.3,65],powerup:[.2,.5,140],vehicle:[.3,.2,120]})[event.type];
 if(!spec)return null;return{strongMagnitude:spec[0],weakMagnitude:spec[1],duration:spec[2],startDelay:0};
}
export class Haptics{
 constructor(input,settings){this.input=input;this.settings=settings;this.last=-1000;this.priorityUntil=0;this.status='Connect a controller to check vibration.';}
 capability(){const p=this.input.rawPad,a=p?.vibrationActuator||p?.hapticActuators?.[0];return a;}
 event(e,now=performance.now()){
  if(!this.settings.vibration||this.input.source!=='gamepad'||document.hidden||!document.hasFocus())return;
  const pattern=feedbackPattern(e);if(!pattern)return;const major=['hurt','explosion'].includes(e.type);if(!major&&(now<this.priorityUntil||now-this.last<45))return;
  if(major)this.priorityUntil=now+180;this.last=now;
  const a=this.capability();if(!a){this.status='Vibration is unavailable in this browser / connection.';return;}
  const strength=this.settings.vibration/100;pattern.strongMagnitude*=strength;pattern.weakMagnitude*=strength;
  const trigger=a.effects?.includes('trigger-rumble');if(trigger){pattern.leftTrigger=e.hand===1?.4*strength:0;pattern.rightTrigger=e.hand===0?.4*strength:0;}
  try{const task=a.playEffect?a.playEffect(trigger?'trigger-rumble':'dual-rumble',pattern):a.pulse?.(Math.max(pattern.strongMagnitude,pattern.weakMagnitude),pattern.duration);Promise.resolve(task).then(result=>{this.status=result==='not-supported'?'Vibration is not supported by this controller.':'Vibration ready · weapon-specific recoil';}).catch(()=>{this.status='Vibration was denied by the browser.';});}catch{this.status='Vibration is unavailable in this browser.';}
 }
 stop(){try{Promise.resolve(this.capability()?.reset?.()).catch(()=>{});}catch{/* Disconnected. */}this.priorityUntil=0;}
}
