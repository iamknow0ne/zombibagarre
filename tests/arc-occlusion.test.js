import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {ViewRig} from '../src/rebuild/ViewRig.js';
import {bodyPoint,combatBlocked,muzzlePoint} from '../src/rebuild/CombatHeight.js';
import {weaponStats} from '../src/rebuild/config.js';
const enemy=(s,x,z,y=0)=>{const e=s.spawnEnemy('walker',x,z);Object.assign(e,{y,speed:0,health:1000,maxHealth:1000});return e;};
const clearGame=()=>{const s=new Simulation({layout:{bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50},cover:[],water:[],bridges:[],spawnPoints:[]}});s.start('arc');s.random=()=>.5;Object.assign(s.player,{x:0,z:0,y:0,angle:0});return s;};

test('seed73 FPS roof aim cannot arc through a parapet visible below the crosshair',()=>{
 const s=new Simulation({seed:73,mode:'city',profile:{}});s.start('arc');s.random=()=>.5;
 const roof=s.layout.traversal.roofs[0],wall=roof.parts.find(p=>p.role==='parapet'&&p.d>1&&p.x<roof.parts[0].x);
 Object.assign(s.player,{x:wall.x+.5,y:roof.top,z:wall.z,angle:-Math.PI/2,grounded:true,supportId:roof.anchor.supportId});
 const target=enemy(s,s.player.x-4,s.player.z),rig=new ViewRig();rig.setMode('first');rig.pitch=Math.atan2(s.player.y+1.55-bodyPoint(target).y,4);
 const aim=rig.aim(s.player,s);assert.equal(aim.targetId,target.id,'camera can see enemy above the parapet');assert.equal(combatBlocked(s,muzzlePoint(s.player),bodyPoint(target)),true,'actual weapon line is blocked');
 const ammo=s.player.magazines.arc;s.fireWeapon('arc',aim);assert.equal(s.player.magazines.arc,ammo-1);assert.equal(target.health,1000);assert.equal(s.events.filter(e=>e.type==='arc').length,0,'no false lightning beam through the roof wall');
 s.fireWeapon('carbine',aim);for(let i=0;i<90;i++)s.updateBullets(1/120);assert.equal(target.health,1000);assert.ok(s.events.some(e=>e.type==='impact'&&Math.abs(e.y-(roof.top+.65))<1e-6),'projectile control hits the same physical parapet');
});

test('clear elevated arc retains first hit, damage falloff and independent enemy-to-enemy chaining',()=>{
 const s=clearGame();s.player.y=4;const first=enemy(s,0,6),second=enemy(s,2,6),third=enemy(s,4,6),w=weaponStats(s.player,'arc');
 s.fireWeapon('arc',{...bodyPoint(first),perspective:true,targetId:first.id});
 for(const [i,e]of[first,second,third].entries())assert.ok(Math.abs(e.health-(1000-w.damage*Math.pow(.83,i)))<1e-9);
 const arcs=s.events.filter(e=>e.type==='arc');assert.equal(arcs.length,3);assert.equal(arcs[0].x,.2);assert.equal(arcs[0].z,0);assert.equal(arcs[0].y,5.1);assert.equal(arcs[1].x,first.x);assert.equal(arcs[1].z,first.z);
});

test('secondary chain respects its own cover without cancelling a legitimate first target',()=>{
 const s=clearGame(),first=enemy(s,0,6),second=enemy(s,2,6);s.props=s.obstacles=[{id:'divider',kind:'barrier',x:1,z:6,y:0,w:.2,d:3,h:3,health:100}];
 s.fireWeapon('arc',{...bodyPoint(first),perspective:true,targetId:first.id});assert.ok(first.health<1000);assert.equal(second.health,1000);assert.equal(s.events.filter(e=>e.type==='arc').length,1);
});
