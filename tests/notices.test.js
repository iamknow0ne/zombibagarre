import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {Notices} from '../src/rebuild/Notices.js';
import {spendPoint,interactPlace,claimQuest} from '../src/rebuild/RPG.js';
const game=()=>{const s=new Simulation({seed:31,mode:'city',profile:{}});s.start();return s;};
test('skill reminder remains after reading and disappears only when points are spent',()=>{
 const s=game(),n=new Notices();n.sync(s);assert.match(n.items()[0].title,/3 skill points/);n.acknowledge();assert.equal(n.count(),1);
 for(let i=0;i<3;i++)spendPoint(s,'vigor');n.sync(s);assert.equal(n.count(),0);
});
test('automatic weapon evolution is deduplicated, acknowledged and reset each expedition',()=>{
 const s=game(),n=new Notices();n.sync(s);s.player.mastery.carbine=1000;n.sync(s);n.sync(s);assert.equal(n.history.length,1);assert.match(n.history[0].detail,/automatically/);assert.equal(n.count(),2);n.acknowledge();assert.equal(n.count(),1);
 s.player.mastery.carbine=8000;n.sync(s);assert.equal(n.history.length,2);assert.equal(n.count(),2);n.sync(game());assert.equal(n.history.length,0);
});
test('new armour is announced once, existing gear is not presented as a new discovery',()=>{
 const s=game(),n=new Notices();n.sync(s);assert.equal(n.history.length,0);s.profile.owned.push('warden-head-1');n.sync(s);assert.equal(n.history[0].item,'warden-head-1');n.sync(s);assert.equal(n.history.length,1);
});
test('quest reward reminder requires an accepted, completed objective and clears on claim',()=>{
 const s=game(),n=new Notices();assert.ok(!n.sync(s).some(n=>n.quest==='salvage'));s.rpg.accepted.push('salvage');
 for(const id of ['case-a','case-b']){const p=s.places.find(p=>p.id===id);s.player.x=p.x;s.player.z=p.z;interactPlace(s);}
 assert.ok(n.sync(s).some(n=>n.quest==='salvage'));
 const smith=s.places.find(p=>p.id==='smith');s.player.x=smith.x;s.player.z=smith.z;assert.equal(claimQuest(s,'salvage','smith'),true);assert.ok(!n.sync(s).some(n=>n.quest==='salvage'));
});
