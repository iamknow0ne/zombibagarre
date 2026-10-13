import {weaponPulse,WEAPON_HAPTICS} from './WeaponHaptics.js';
export function feedbackPattern(event){
 const weapon=weaponPulse(event);if(weapon)return weapon;
 let spec=({hurt:[.85,.45,210],explosion:[1,.65,260],dash:[.1,.45,90],throw:[.2,.3,110],loaded:[.12,.3,65],powerup:[.2,.5,140],vehicle:[.3,.2,120]})[event.type];
 if(event.type==='vehicle-hit')spec=[Math.min(1,event.power/18),.4,150];if(event.type==='vehicle-skid')spec=[.07,Math.min(.35,event.power*.35),65];
 if(event.type==='progression')spec=[.15,.4,150];if(event.type==='ordnance-burst')spec=event.throwable==='shock'?[.2,.85,180]:[.45,.3,150];if(!spec)return null;return{strongMagnitude:spec[0],weakMagnitude:spec[1],duration:spec[2],startDelay:0};
}
export class Haptics{
 constructor(input,settings){this.input=input;this.settings=settings;this.last=-1000;this.priorityUntil=0;this.hands=[null,null];this.status='Connect a controller to check vibration.';}
 capability(){const p=this.input.rawPad,a=p?.vibrationActuator||p?.hapticActuators?.[0];return a;}
 event(e,now=performance.now()){
  if(!this.settings.vibration||this.input.source!=='gamepad'||document.hidden||!document.hasFocus())return;
  const pattern=feedbackPattern(e);if(!pattern)return;const major=['hurt','explosion'].includes(e.type);const combat=['shoot','swing','slice'].includes(e.type);if(!major&&(now<this.priorityUntil||!combat&&now-this.last<45))return;
  if(major)this.priorityUntil=now+180;this.last=now;
  const a=this.capability();if(!a){this.status='Vibration is unavailable in this browser / connection.';return;}
  const strength=this.settings.vibration/100;pattern.strongMagnitude*=strength;pattern.weakMagnitude*=strength;
  const trigger=a.effects?.includes('trigger-rumble');
  if(combat){const hand=e.hand===1?1:0;this.hands[hand]={...pattern,until:now+pattern.duration,button:this.settings.bindings?.[hand?'leftFire':'rightFire']};
   for(const other of this.hands)if(other?.until>now){pattern.strongMagnitude=Math.max(pattern.strongMagnitude,other.strongMagnitude);pattern.weakMagnitude=Math.max(pattern.weakMagnitude,other.weakMagnitude);pattern.duration=Math.max(pattern.duration,Math.ceil(other.until-now));}
  }else this.hands=[null,null];
  if(trigger){pattern.leftTrigger=0;pattern.rightTrigger=0;for(const h of this.hands)if(h?.until>now){const force=Math.max(h.strongMagnitude,h.weakMagnitude);if(h.button===6)pattern.leftTrigger=force;if(h.button===7)pattern.rightTrigger=force;if(WEAPON_HAPTICS[e.weapon]?.melee){for(const key of ['leftFire','rightFire']){const button=this.settings.bindings?.[key];if(this.input.pad?.buttons?.[button]){if(button===6)pattern.leftTrigger=force;if(button===7)pattern.rightTrigger=force;}}}}}

  try{const task=a.playEffect?a.playEffect(trigger?'trigger-rumble':'dual-rumble',pattern):a.pulse?.(Math.max(pattern.strongMagnitude,pattern.weakMagnitude),pattern.duration);Promise.resolve(task).then(result=>{this.status=result==='not-supported'?'Vibration is not supported by this controller.':'Vibration ready · weapon-specific recoil';}).catch(()=>{this.status='Vibration was denied by the browser.';});}catch{this.status='Vibration is unavailable in this browser.';}
 }
 stop(){try{Promise.resolve(this.capability()?.reset?.()).catch(()=>{});}catch{/* Disconnected. */}this.priorityUntil=0;this.last=-1000;this.hands=[null,null];}
}
