import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {interactPlace,interactRoom,acceptQuest,claimQuest,purchase,questObjective,questProgress,nearbyPlace,QUESTS,questVisible} from '../src/rebuild/RPG.js';
import {beginInterior,endInterior,interiorInteraction,collectInteriorCase} from '../src/rebuild/Interiors.js';
import {syncQuestNavigation,navigationRoute} from '../src/rebuild/QuestNavigation.js';
import {advanceFixedStep} from '../src/rebuild/FixedStepInput.js';
import {Input} from '../src/rebuild/Input.js';
const game=()=>{const s=new Simulation({seed:31,mode:'city',profile:{}});s.start();s.events=[];return s;};
const plan=(s,template)=>s.interiorState.manifest.find(p=>p.template===template+'-v1');
const enter=(s,template)=>{const room=plan(s,template);assert.ok(room);Object.assign(s.player,{x:room.door.x,z:room.door.z});assert.equal(interactPlace(s),true);assert.equal(s.state,'interior');return room;};
const approach=(s,id)=>{const o=s.interior.plan.objects.find(o=>o.id===id);Object.assign(s.interior.pose,{x:o.x,z:o.z});assert.equal(interiorInteraction(s)?.id,id);};
const leave=s=>{if(s.state==='paused')s.resume();approach(s,'exit');assert.equal(interactRoom(s),true);assert.equal(s.interior,null);};
test('workshop contract uses real indoor contact and pays exactly once',()=>{
 const s=game();enter(s,'workshop');assert.equal(acceptQuest(s,'workshop-tools','smith'),false);approach(s,'mara');assert.equal(interactRoom(s),true);assert.equal(s.state,'paused');assert.equal(s.previousState,'interior');assert.equal(acceptQuest(s,'workshop-tools','smith'),true);assert.equal(acceptQuest(s,'workshop-tools','smith'),false);leave(s);
 enter(s,'apartment');assert.equal(collectInteriorCase(s),false);approach(s,'tool-case');assert.equal(interactRoom(s),true);assert.deepEqual(questProgress(s,'workshop-tools'),[1,1]);assert.equal(collectInteriorCase(s),false);leave(s);
 enter(s,'workshop');approach(s,'mara');interactRoom(s);const coins=s.rpg.coins,xp=s.profile.xp;assert.equal(claimQuest(s,'workshop-tools','smith'),true);assert.equal(claimQuest(s,'workshop-tools','smith'),false);assert.equal(s.rpg.coins,coins+90);assert.equal(s.profile.xp,xp+120);assert.ok(s.profile.owned.includes('warden-head-0'));
 leave(s);enter(s,'apartment');assert.equal(collectInteriorCase(s),false);s.start();assert.deepEqual(s.interiorState.collected,[]);assert.ok(s.profile.owned.includes('warden-head-0'));assert.equal(s.profile.xp,xp+120);
});
test('indoor merchant authorization validates room, contact, proximity and paused trade context',()=>{
 const s=game();s.rpg.coins=999;enter(s,'workshop');assert.equal(purchase(s,'warden-head-0','smith'),false);approach(s,'mara');interactRoom(s);assert.equal(nearbyPlace(s).id,'smith');assert.equal(purchase(s,'warden-head-0','smith'),true);assert.equal(purchase(s,'scout-head-0','medic'),false);leave(s);enter(s,'apartment');assert.equal(nearbyPlace(s),null);assert.equal(purchase(s,'warden-legs-0','smith'),false);
});
test('quest navigation never feeds room coordinates into the exterior street grid',()=>{
 const s=game();enter(s,'workshop');approach(s,'mara');acceptQuest(s,'workshop-tools','smith');let o=questObjective(s,'workshop-tools');assert.equal(o.target.id,'exit');assert.equal(o.target.location,s.interior.plan.id);const before=s.player.waypoint;syncQuestNavigation(s);assert.equal(s.player.waypoint,before);assert.equal(navigationRoute(s),null);leave(s);o=questObjective(s,'workshop-tools');assert.equal(o.target.location,'exterior');assert.equal(o.target.x,plan(s,'apartment').door.x);enter(s,'apartment');assert.equal(questObjective(s,'workshop-tools').target.id,'tool-case');
});
test('unavailable apartment contract is hidden and never accepts',()=>{
 const s=game();s.interiorState.manifest=s.interiorState.manifest.filter(p=>p.template==='workshop-v1');enter(s,'workshop');approach(s,'mara');const q=QUESTS.find(q=>q.id==='workshop-tools');assert.equal(questVisible(s,q),false);assert.equal(acceptQuest(s,q.id,'smith'),false);assert.equal(questObjective(s,q.id).state,'locked');
});
test('indoor input preserves movement and one interaction at 240Hz while suppressing combat and perspective look',()=>{
 const s=game();enter(s,'workshop');const i=Object.create(Input.prototype);Object.assign(i,{keys:new Set(['KeyD']),stick:{x:0,y:0},once:{interact:true,grenade:true,jump:true,grapple:true,dash:true},source:'keyboard',pointer:{active:true}});let acc=0;s.events=[];
 for(let n=0;n<4;n++){const frame=i.consume({viewRig:{active:true},aim(){throw Error('No indoor combat aim');}},true,s,1/240);assert.equal(frame.firing,false);assert.equal(frame.grenade,undefined);acc=advanceFixedStep(s,acc+1/240,frame,i.once);}
 assert.equal(s.events.filter(e=>e.type==='interior-interact').length,1);assert.ok(s.interior.pose.x>0);assert.equal(i.perspective,false);
});
test('intentional pointer release clears its escape-pause latch',()=>{
 const input=Object.create(Input.prototype);Object.assign(input,{wasLocked:true,keys:new Set(),stick:{},once:{}});input.clear();assert.equal(input.wasLocked,false);
});
test('reopening the dossier preserves the original room return context',async()=>{
 const {RPGUI}=await import('../src/rebuild/RPGUI.js');const ui=Object.create(RPGUI.prototype);Object.assign(ui,{dialog:{open:true},returnState:'interior',getSim(){throw Error('Should not re-enter open');}});ui.open();assert.equal(ui.returnState,'interior');
});
