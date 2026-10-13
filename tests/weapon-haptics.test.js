import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/rebuild/config.js';
import {WEAPON_HAPTICS} from '../src/rebuild/WeaponHaptics.js';
import {feedbackPattern,Haptics} from '../src/rebuild/Haptics.js';
import {DualSense,triggerEffect} from '../src/rebuild/DualSense.js';
const focused=async fn=>{const previous=globalThis.document;globalThis.document={hidden:false,hasFocus:()=>true};try{await fn();}finally{globalThis.document=previous;}};
const setup=()=>{
 const settings={adaptiveTriggers:true,vibration:100,bindings:{rightFire:7,leftFire:6}},d=new DualSense(settings),writes=[];
 d.device={opened:true,sendReport:async(id,data)=>writes.push([...data])};
 const sim={state:'playing',player:{equipped:['smg','shotgun'],health:100,maxHealth:100,reloads:{},magazines:{smg:40,shotgun:7}}};
 const input={source:'gamepad',pad:{buttons:Array(16).fill(false)}};
 return {d,writes,sim,input,settings};
};
test('all 13 weapons have unique, bounded hit feedback including every melee family',()=>{
 const signatures=new Set();assert.deepEqual(Object.keys(WEAPON_HAPTICS).sort(),Object.keys(WEAPONS).sort());
 for(const [weapon,w]of Object.entries(WEAPONS)){
  const p=feedbackPattern({type:w.melee?'slice':'shoot',weapon,hits:1,interval:w.interval});signatures.add(JSON.stringify(p));
  assert.ok(p.duration>=10&&p.duration<=300);assert.ok(p.strongMagnitude>=0&&p.strongMagnitude<=1);assert.ok(p.weakMagnitude>=0&&p.weakMagnitude<=1);
  assert.notEqual(triggerEffect(weapon)[0],5);
 }assert.equal(signatures.size,13);
});
test('each blade distinguishes windup, miss, contact and finisher; twin blades alternate balance',()=>{
 for(const weapon of Object.keys(WEAPONS).filter(k=>WEAPONS[k].melee)){
  const hit=feedbackPattern({type:'slice',weapon,hits:1,combo:0}),finish=feedbackPattern({type:'slice',weapon,hits:1,combo:2}),miss=feedbackPattern({type:'slice',weapon,hits:0}),swing=feedbackPattern({type:'swing',weapon});
  assert.ok(hit.strongMagnitude>miss.strongMagnitude);assert.ok(finish.duration>hit.duration);assert.ok(swing.duration<hit.duration);
 }assert.notDeepEqual(feedbackPattern({type:'slice',weapon:'dual',hits:1,combo:0}),feedbackPattern({type:'slice',weapon:'dual',hits:1,combo:1}));
});
test('SMG firmware cadence follows real rate upgrades; idle is not a continuous firing effect',()=>{
 const ordinary=triggerEffect({weapon:'smg',phase:'fire',interval:.075}),boost=triggerEffect({weapon:'smg',phase:'fire',interval:.0375});
 assert.equal(ordinary[0],0x26);assert.equal(ordinary[9],13);assert.equal(boost[9],27);assert.equal(triggerEffect('smg')[0],0x25);
 assert.ok(feedbackPattern({type:'shoot',weapon:'smg',interval:.0375}).duration<37.5);
});
test('trigger output follows the correct hand and stops pulsing on release, reload, empty, menus and wheel',()=>focused(async()=>{
 const {d,writes,sim,input}=setup();input.pad.buttons[7]=true;d.event({type:'shoot',weapon:'smg',hand:0,interval:.075},100);d.update(sim,input,101);await d.chain;
 assert.equal(writes.at(-1)[10],0x26);assert.equal(writes.at(-1)[19],13);assert.equal(writes.at(-1)[21],0x25);
 input.pad.buttons[7]=false;d.update(sim,input,110);await d.chain;assert.equal(writes.at(-1)[10],0x25);
 input.pad.buttons[7]=true;sim.player.reloads.smg=1;d.update(sim,input,115);await d.chain;assert.equal(writes.at(-1)[10],5);
 sim.player.reloads.smg=0;sim.player.magazines.smg=0;d.update(sim,input,120);await d.chain;assert.equal(writes.at(-1)[10],5);
 sim.player.magazines.smg=40;input.weaponWheelActive=true;d.update(sim,input,125);await d.chain;assert.equal(writes.at(-1)[10],5);assert.equal(writes.at(-1)[21],5);
 input.weaponWheelActive=false;sim.state='paused';d.update(sim,input,130);await d.chain;assert.equal(writes.at(-1)[10],5);
}));
test('L2 melee works with default R3 main binding; R3 does not invent a physical adaptive trigger',()=>focused(async()=>{
 const {d,writes,sim,input,settings}=setup();settings.bindings.rightFire=11;sim.player.equipped=['katana'];input.pad.buttons[6]=true;
 d.event({type:'slice',weapon:'katana',hits:1,combo:2},100);d.update(sim,input,101);await d.chain;
 assert.equal(writes.at(-1)[21],0x26);assert.equal(writes.at(-1)[10],5);
 input.pad.buttons[6]=false;input.pad.buttons[11]=true;d.update(sim,input,110);await d.chain;assert.equal(writes.at(-1)[21],0x25);
}));
test('misses, switching weapons and stale attacks do not sustain recoil',()=>focused(async()=>{
 const {d,writes,sim,input}=setup();input.pad.buttons[7]=true;d.event({type:'shoot',weapon:'smg',hand:0,interval:.075},100);d.update(sim,input,300);await d.chain;assert.equal(writes.at(-1)[10],0x25);
 sim.player.equipped=['katana'];d.event({type:'slice',weapon:'katana',hits:1},310);d.event({type:'slice',weapon:'katana',hits:0},320);d.update(sim,input,321);await d.chain;assert.equal(writes.at(-1)[10],0x25);
}));
test('rapid shots are not discarded by the old 45ms throttle and dual hands mix motor strengths',()=>focused(async()=>{
 const calls=[],input={source:'gamepad',rawPad:{vibrationActuator:{effects:['trigger-rumble'],playEffect:async(type,p)=>calls.push({...p})}}},h=new Haptics(input,{vibration:100,bindings:{rightFire:7,leftFire:6}});
 for(let i=0;i<5;i++)h.event({type:'shoot',weapon:'smg',hand:0,interval:.0375},100+i*37.5);assert.equal(calls.length,5);
 h.event({type:'shoot',weapon:'shotgun',hand:1},255);assert.ok(calls.at(-1).leftTrigger>0);assert.ok(calls.at(-1).rightTrigger>0);
 h.event({type:'shoot',weapon:'smg',hand:0,interval:.0375},260);assert.ok(calls.at(-1).duration>=165,'short SMG pulse must not cut off the other hand’s heavy recoil');
 h.stop();assert.deepEqual(h.hands,[null,null]);
}));
test('a slow HID connection coalesces pending shots and flushes reset without delayed recoil',async()=>{
 const {d}=setup(),writes=[];let release;
 d.device.sendReport=async(id,data)=>{writes.push([...data]);if(writes.length===1)await new Promise(r=>release=r);};
 const pending=d.send({right:'shotgun'});for(let i=0;i<50;i++)d.send({right:{weapon:'smg',phase:'fire',interval:.075}});const stopped=d.stop();release();await pending;await stopped;
 assert.equal(writes.length,2);assert.equal(writes.at(-1)[10],5);assert.equal(writes.at(-1)[21],5);
});
test('the real firing event carries boosted cadence, so trigger frequency follows gameplay',async()=>{
 const {Simulation}=await import('../src/rebuild/Simulation.js');const s=new Simulation({seed:31});s.start();s.setLoadout(['smg']);s.player.fireMultiplier=.8;s.player.overdrive=1;s.events=[];s.fireWeapon('smg',{x:1,z:10});
 const shot=s.events.find(e=>e.type==='shoot');assert.ok(Math.abs(shot.interval-.03)<1e-8);assert.equal(triggerEffect({...shot,phase:'fire'})[9],33);assert.ok(feedbackPattern(shot).duration<30);
});
