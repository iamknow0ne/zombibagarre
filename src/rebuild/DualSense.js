// Protocol facts: nondebug/dualsense and Nielk1 trigger-effect documentation.
// Optional WebHID output only. No microphone, sensor or audio capture.
export function triggerEffect(weapon){
 const out=new Uint8Array(11);out[0]=5;if(!weapon)return out;
 const profile={carbine:[2,5,3],smg:[2,4,2],shotgun:[3,7,6],revolver:[3,6,5],marksman:[4,7,5],launcher:[4,8,6],flame:[2,0,2],arc:[3,0,3]}[weapon];if(!profile)return out;
 const [start,end,force]=profile;out[0]=end?0x25:0x21;
 let zones=0,strengths=0;if(end)zones=(1<<start)|(1<<end);else for(let i=start;i<10;i++){zones|=1<<i;strengths|=(force-1)<<(i*3);}
 new DataView(out.buffer).setUint16(1,zones,true);if(end)out[3]=force-1;else new DataView(out.buffer).setUint32(3,strengths,true);return out;
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
 constructor(settings){this.settings=settings;this.sequence=0;this.status=typeof navigator!=='undefined'&&navigator.hid?'Optional · connect for adaptive triggers and health lightbar.':'Advanced triggers need a browser with WebHID, such as desktop Chrome or Edge.';this.chain=Promise.resolve();
  if(typeof navigator!=='undefined')navigator.hid?.addEventListener('disconnect',e=>{if(e.device===this.device){this.device=null;this.status='DualSense disconnected · reconnect to restore trigger effects.';}});
 }
 async connect(){
  if(!navigator.hid)return;try{if(this.device)await this.disconnect();const [device]=await navigator.hid.requestDevice({filters:[{vendorId:0x054c,productId:0x0ce6,usagePage:1,usage:5},{vendorId:0x054c,productId:0x0df2,usagePage:1,usage:5}]});if(!device){this.status='Connection cancelled. Standard controller input still works.';return;}
   await device.open();const rs=reports(device.collections);this.bluetooth=rs.some(r=>r.reportId===0x31);if(!this.bluetooth&&!rs.some(r=>r.reportId===2)){await device.close();this.status='This device does not expose compatible DualSense output.';return;}
   this.device=device;this.settings.adaptiveTriggers=true;await this.send({});this.status=`DualSense ${this.bluetooth?'Bluetooth':'USB'} connected · experimental trigger effects`;
  }catch{this.status='Could not open DualSense. Try a USB cable in desktop Chrome / Edge.';}
 }
 send(state){const device=this.device;if(!device?.opened)return Promise.resolve();const report=dualSenseReport({...state,bluetooth:this.bluetooth,sequence:this.sequence++});this.chain=this.chain.catch(()=>{}).then(()=>device.opened?device.sendReport(report.id,report.data):null).catch(()=>{this.status='Trigger output failed · reconnect the controller.';this.device=null;});return this.chain;}
 update(sim,input,now){if(!this.device)return;const active=this.settings.adaptiveTriggers&&input.source==='gamepad'&&!document.hidden&&document.hasFocus()&&['playing','extracting'].includes(sim.state)&&!sim.player.vehicleId;
  const p=sim.player,b=this.settings.bindings,handFor=button=>b.rightFire===button?p.equipped[0]:b.leftFire===button?p.equipped[1]:null;
  const state=active?{left:handFor(6),right:handFor(7),color:p.health/p.maxHealth<.3?[180,24,8]:[24,95,66]}:{};const key=JSON.stringify(state);if(key===this.lastKey&&now-(this.lastSent||0)<1000)return;this.lastKey=key;this.lastSent=now;this.send(state);
 }
 stop(){this.lastKey=null;return this.send({});}
 async disconnect(){const device=this.device;await this.stop();this.device=null;if(device?.opened)await device.close();this.status='Advanced effects disconnected.';}
}
