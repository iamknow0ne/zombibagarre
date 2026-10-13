// Protocol facts: nondebug/dualsense and Nielk1 trigger-effect documentation.
// Optional WebHID output only. No microphone, sensor or audio capture.
import {WEAPON_HAPTICS} from './WeaponHaptics.js';
import {slotKey} from './Loadout.js';
export function triggerEffect(state){
 const out=new Uint8Array(11);out[0]=5;if(!state)return out;
 const {weapon,phase='idle',interval,combo=0,tier=0}=typeof state==='string'?{weapon:state}:state,p=WEAPON_HAPTICS[weapon];if(!p)return out;
 const [start,end,force]=p.trigger;
 const moving=['fire','impact','swing'].includes(phase);
 const amount=Math.max(1,Math.min(8,force+(phase==='impact'&&combo===2?1:0)+(tier>=2?1:0)-(phase==='swing'?2:0)));
 out[0]=moving?0x26:end?0x25:0x21;
 let zones=0,strengths=0;
 if(!moving&&end)zones=(1<<start)|(1<<end);
 else for(let i=start;i<10;i++){zones|=1<<i;strengths|=(amount-1)<<(i*3);}
 const view=new DataView(out.buffer);view.setUint16(1,zones,true);
 if(!moving&&end)out[3]=amount-1;else view.setUint32(3,strengths,true);
 if(moving)out[9]=Math.max(1,Math.min(60,Math.round(p.automatic&&interval>0?1/interval:p.frequency)));
 return out;
}
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function dualSenseReport({left=null,right=null,color=[0,0,0],bluetooth=false,sequence=0}={}){
 const data=new Uint8Array(bluetooth?77:47),offset=bluetooth?2:0;
 if(bluetooth){data[0]=(sequence%16)<<4;data[1]=0x10;}
 data[offset]=0x0c;data[offset+1]=0x14;data.set(triggerEffect(right),offset+10);data.set(triggerEffect(left),offset+21);
 data[offset+39]=2;data[offset+41]=2;data[offset+43]=color.some(Boolean)?4:0;data.set(color,offset+44);
 if(bluetooth){const bytes=new Uint8Array(75);bytes.set([0xa2,0x31]);bytes.set(data.subarray(0,73),2);new DataView(data.buffer).setUint32(73,crc32(bytes),true);}
 return {id:bluetooth?0x31:2,data};
}
function reports(collections){return collections.flatMap(c=>[...(c.outputReports||[]),...reports(c.children||[])]);}
export class DualSense{
 constructor(settings){this.settings=settings;this.sequence=0;this.status=typeof navigator!=='undefined'&&navigator.hid?'Optional · connect for adaptive triggers and health lightbar.':'Advanced triggers need a browser with WebHID, such as desktop Chrome or Edge.';this.chain=Promise.resolve();this.attacks=[null,null];this.pending=null;this.sending=false;
  if(typeof navigator!=='undefined')navigator.hid?.addEventListener('disconnect',e=>{if(e.device===this.device){this.device=null;this.status='DualSense disconnected · reconnect to restore trigger effects.';}});
 }
 async connect(){
  if(!navigator.hid)return;try{if(this.device)await this.disconnect();const [device]=await navigator.hid.requestDevice({filters:[{vendorId:0x054c,productId:0x0ce6,usagePage:1,usage:5},{vendorId:0x054c,productId:0x0df2,usagePage:1,usage:5}]});if(!device){this.status='Connection cancelled. Standard controller input still works.';return;}
   await device.open();const rs=reports(device.collections);this.bluetooth=rs.some(r=>r.reportId===0x31);if(!this.bluetooth&&!rs.some(r=>r.reportId===2)){await device.close();this.status='This device does not expose compatible DualSense output.';return;}
   this.device=device;this.settings.adaptiveTriggers=true;await this.send({});this.status=`DualSense ${this.bluetooth?'Bluetooth':'USB'} connected · experimental trigger effects`;
  }catch{this.status='Could not open DualSense. Try a USB cable in desktop Chrome / Edge.';}
 }
 // Coalesce unsent states so a slow HID connection never replays an old burst.
 send(state){const device=this.device;if(!device?.opened)return Promise.resolve();this.pending={device,state};if(this.sending)return this.chain;this.sending=true;
  this.chain=(async()=>{try{while(this.pending){const next=this.pending;this.pending=null;if(next.device!==this.device||!next.device.opened)continue;const report=dualSenseReport({...next.state,bluetooth:this.bluetooth,sequence:this.sequence++});await next.device.sendReport(report.id,report.data);}}catch{this.status='Trigger output failed · reconnect the controller.';if(this.device===device)this.device=null;this.pending=null;}finally{this.sending=false;}})();return this.chain;
 }
 event(e,now=performance.now()){
  const profile=WEAPON_HAPTICS[e.weapon];if(!profile||!['shoot','swing','slice'].includes(e.type))return;
  const hand=e.hand===1?1:0;
  if(e.type==='slice'&&!e.hits){this.attacks[hand]=null;return;}
  const phase=e.type==='shoot'?'fire':e.type==='slice'?'impact':'swing';
  const duration=profile.automatic?Math.max(35,Math.min(250,(e.interval||.075)*1150)):profile.continuous?100:phase==='swing'?70:profile.recoil[2];
  this.attacks[hand]={weapon:e.weapon,phase,interval:e.interval,combo:e.combo,tier:e.tier,until:now+duration};
 }
 update(sim,input,now){if(!this.device)return;const active=this.settings.adaptiveTriggers&&input.source==='gamepad'&&input.pad&&!input.padGuard&&!input.weaponWheelActive&&!document.hidden&&document.hasFocus()&&['playing','extracting'].includes(sim.state)&&!sim.player.vehicleId;
  const p=sim.player,b=this.settings.bindings;
  if(!active)this.attacks=[null,null];
  const handFor=button=>{
   let hand=b.rightFire===button?0:b.leftFire===button?1:-1;if(hand<0)return null;
   // Either attack binding can drive the exclusive melee stance.
   if(WEAPON_HAPTICS[p.equipped[0]]?.melee)hand=0;
   const weapon=p.equipped[hand];if(!weapon)return null;
   const slot=slotKey(p.equipped,weapon,hand);
   if(p.reloads?.[slot]>0||!WEAPON_HAPTICS[weapon]?.melee&&p.magazines?.[slot]<=0)return null;
   const attack=this.attacks[hand];return input.pad.buttons?.[button]&&attack?.weapon===weapon&&attack.until>now?attack:weapon;
  };
  const state=active?{left:handFor(6),right:handFor(7),color:p.health/p.maxHealth<.3?[180,24,8]:[24,95,66]}:{};
  // Encode before comparison: timestamps and combo bookkeeping are not output changes.
  const key=JSON.stringify([Array.from(triggerEffect(state.left)),Array.from(triggerEffect(state.right)),state.color]);
  if(key===this.lastKey&&now-(this.lastSent||0)<1000)return;this.lastKey=key;this.lastSent=now;this.send(state);
 }
 stop(){this.attacks=[null,null];this.lastKey=null;return this.send({});}
 async disconnect(){const device=this.device;await this.stop();this.device=null;if(device?.opened)await device.close();this.status='Advanced effects disconnected.';}
}
