import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/rebuild/Simulation.js';
import {prepareTraversalLayout} from '../src/rebuild/CampaignTraversal.js';
import {generateCity,waterAt} from '../src/rebuild/City.js';
import {grappleAvailability} from '../src/rebuild/Traversal.js';
import {campaignTraversalBoxes} from '../src/rebuild/CampaignTraversal.js';
import {boxHit3D} from '../src/rebuild/Ballistics.js';
import {distance,pointBlocked,weaponStats} from '../src/rebuild/config.js';
const seeds=[0,1,2,3,7,19,31,73,140,2026];
const game=(seed=73)=>{const s=new Simulation({seed,mode:'city',profile:{}});s.start();s.toSpawn=999;s.spawnTimer=1e6;s.enemies=[];return s;};
function approach(s){const roof=s.layout.traversal.roofs?.[0];assert.ok(roof);Object.assign(s.player,{...roof.approach,y:0,grounded:true,supportId:null,grapple:null,grappleCooldown:0,vx:0,vz:0});return roof;}
function ascend(s){const roof=approach(s);s.update(1/120,{grapple:true,auto:false});assert.equal(s.player.grapple?.anchorId,roof.anchor.id);for(let i=0;i<900&&!(s.player.grounded&&s.player.supportId===roof.anchor.supportId);i++)s.update(1/120,{auto:false});assert.ok(Math.abs(s.player.y-roof.top)<1e-8);assert.equal(s.player.supportId,roof.anchor.supportId);assert.equal(s.player.grapple,null);return roof;}
test('curated roof plan is deterministic with an exact deck, gap, parapets and HVAC shared by live collision',()=>{
 for(const seed of seeds){const raw=generateCity(seed),l=prepareTraversalLayout(raw),roof=l.traversal.roofs?.[0];assert.ok(roof,`seed ${seed}`);assert.deepEqual(prepareTraversalLayout(raw),l);assert.ok(!raw.buildings.some(b=>b.serviceRoof));assert.equal(l.traversal.anchors.length,3);assert.deepEqual(l.traversal.anchors.slice(0,2).map(a=>a.id),['service-anchor-0','service-anchor-1']);assert.equal(l.traversal.reward.supportId,l.traversal.anchors[1].supportId);
  const host=l.buildings.find(b=>b.id===roof.buildingId);assert.equal(host.serviceRoof,true);assert.equal(roof.parts.length,7);assert.ok(Math.abs(roof.parts[0].y+roof.parts[0].h-roof.top)<1e-8);assert.ok(Math.abs(roof.top-host.h-.31)<1e-9);assert.equal(roof.parts.filter(p=>p.role==='parapet').length,5);assert.equal(roof.parts.filter(p=>p.role==='hvac').length,1);
  for(const part of roof.parts){assert.equal(part.ownerId,host.id);assert.equal(l.cover[Number(part.id.slice(5))],part);assert.equal(part.roofPart,true);}
  assert.equal(waterAt(l,roof.approach.x,roof.approach.z),false);assert.equal(pointBlocked(roof.approach.x,roof.approach.z,.5,[...l.cover,...l.buildings]),false);
 }
});
test('the actual pedestrian flowfield reaches service-roof approaches across city topologies',()=>{
 for(const seed of seeds){const s=game(seed),roof=s.layout.traversal.roofs[0],walker={x:0,z:3,radius:.4};let i=0;while(distance(walker,roof.approach)>1&&i++<2500){const aim=s.blocked(walker,roof.approach,.44)?s.navigate(walker,roof.approach):roof.approach;assert.ok(aim);const d=distance(walker,aim);if(d>1e-8)s.move(walker,(aim.x-walker.x)/d*Math.min(.3,d),(aim.z-walker.z)/d*Math.min(.3,d));}assert.ok(distance(walker,roof.approach)<1.1,`seed ${seed} stuck ${distance(walker,roof.approach)}`);}
});
test('normal campaign grapple ascends onto authored roof and walking through its access gap returns to street',()=>{
 for(const seed of seeds){const s=game(seed),roof=ascend(s);assert.equal(s.traversalRewardClaimed,false,'existing low-yard cache not awarded by roof');const h=s.player.health;
  s.pause();const y=s.player.y;s.update(.05,{jump:true,grapple:true});assert.equal(s.player.y,y);s.resume();
  for(let i=0;i<300;i++)s.update(1/120,{x:roof.approach.nx,z:roof.approach.nz,auto:false});assert.equal(s.player.y,0,`seed ${seed}`);assert.equal(s.player.supportId,null);assert.equal(s.player.health,h);
 }
});
test('roof parapets and HVAC are solid to actors and bullets; deck collision top equals visible floor',()=>{
 const s=game(),roof=ascend(s),wall=roof.parts.find(p=>p.role==='parapet'&&p.w>.3&&Math.abs(p.z-roof.gap.z)>1),hvac=roof.parts.find(p=>p.role==='hvac');assert.ok(wall);
 const a={x:wall.x,y:roof.top+.3,z:wall.z-1},b={...a,z:wall.z+1};assert.notEqual(boxHit3D(a,b,wall),null);assert.notEqual(boxHit3D({x:hvac.x-2,y:hvac.y+.5,z:hvac.z},{x:hvac.x+2,y:hvac.y+.5,z:hvac.z},hvac),null);
 const deck=s.props.find(p=>p.id===roof.anchor.supportId);assert.ok(Math.abs(deck.y+deck.h-roof.top)<1e-8);Object.assign(s.player,{x:wall.x,y:roof.top,z:wall.z+1,grounded:true,vx:0,vz:0,supportId:deck.id});for(let i=0;i<60;i++)s.update(1/120,{z:-1,auto:false});assert.ok(s.player.z>=wall.z+wall.d/2+s.player.radius-.002);
 Object.assign(s.player,{x:hvac.x+1.5,y:roof.top,z:hvac.z,grounded:true,vx:0,vz:0,supportId:deck.id});for(let i=0;i<40;i++)s.update(1/120,{x:-1,auto:false});assert.ok(s.player.x>=hvac.x+hvac.w/2+s.player.radius-.002);
});
test('roof colliders share structural health, explosions damage once, and collapse removes every support',()=>{
 const s=game(),roof=ascend(s),host=s.props.find(p=>p.id===roof.buildingId),deck=s.props.find(p=>p.id===roof.anchor.supportId),initial=host.health;
 s.damageProp(deck,40);assert.equal(host.health,initial-40);for(const p of s.props.filter(p=>p.ownerId===host.id))assert.equal(p.health,host.health);
 const before=host.health;s.blast(roof.anchor.x,roof.anchor.z,20,100,'explosion','grenade',null,0,roof.top);assert.equal(host.health,before-85,'one blast cannot multiply damage across seven parts');
 s.damageProp(host,1e9);for(const p of s.props.filter(p=>p.ownerId===host.id))assert.ok(p.health<=0);assert.match(grappleAvailability(s.player,roof.anchor,campaignTraversalBoxes(s)),/lost/);s.player.invulnerable=999;for(let i=0;i<300;i++)s.update(1/120,{auto:false});assert.equal(s.player.supportId,null);assert.equal(s.player.y,0);
});
test('ground enemies attack the building under a rooftop survivor instead of granting permanent immunity',()=>{
 const s=game(),roof=ascend(s),host=s.props.find(p=>p.id===roof.buildingId);host.health=90;s.syncRoofParts(host);s.player.invulnerable=999;
 const e=s.spawnEnemy('walker',roof.gap.x+roof.approach.nx*.95,roof.gap.z+roof.approach.nz*.95);e.speed=0;e.attack=0;
 for(let i=0;i<1500&&host.health>0;i++)s.update(1/120,{auto:false});assert.ok(host.health<=0,'reachable wall bashing eventually destroys support');assert.ok(s.events.some(e=>e.type==='destroy'&&e.id===host.id));for(let i=0;i<300;i++)s.update(1/120,{auto:false});assert.equal(s.player.y,0);
});


test('landing on a roof never advertises a remote blocked gantry, but nearby lost anchors retain explanations',()=>{
 const s=game(),roof=ascend(s);s.update(1/120,{auto:false});assert.equal(s.traversalTarget,null);
 const host=s.props.find(p=>p.id===roof.buildingId);s.damageProp(host,1e9);s.update(1/120,{auto:false});assert.equal(s.player.grounded,false,'destroyed support releases the hero before the next target scan');s.update(1/120,{auto:false});assert.equal(s.traversalTarget?.id,roof.anchor.id);assert.equal(s.traversalTarget.available,false);assert.match(s.traversalTarget.reason,/lost/);
});


test('a hammer sweeping two parapets at a roof corner damages its building only once',()=>{
 const s=game(),roof=ascend(s),host=s.props.find(p=>p.id===roof.buildingId),deck=roof.parts.find(p=>p.role==='deck');
 Object.assign(s.player,{x:deck.x-deck.w/2+1,z:deck.z-deck.d/2+1,y:roof.top,angle:-Math.PI*.75});
 const before=host.health;s.resolveSlice({weapon:'hammer',angle:s.player.angle,combo:0,variant:0});
 assert.ok(Math.abs(before-host.health-weaponStats(s.player,'hammer').damage*s.player.damage*1.2)<1e-8);
 assert.equal(s.events.filter(e=>e.type==='slice').at(-1).hits,1,'one structure is one impact even when both perpendicular parapets intersect the sweep');
});

test('piercing rounds hit a roof structure once and independent rounds retain their own damage',()=>{
 const s=game(),roof=ascend(s),host=s.props.find(p=>p.id===roof.buildingId),deck=roof.parts.find(p=>p.role==='deck'),before=host.health;
 const round=id=>({id,x:deck.x,y:roof.top+.3,z:deck.z-deck.d/2-2,vx:0,vy:0,vz:100,life:1,damage:17,pierce:10,hitIds:[],weapon:'marksman',tier:0});
 s.bullets=[round(9001)];s.updateBullets(.5);assert.equal(host.health,before-17);assert.equal(s.bullets.length,0);
 s.bullets=[round(9002),round(9003)];s.updateBullets(.5);assert.equal(host.health,before-51,'separate bullets each retain their structural impact');
});

test('concrete roof assemblies do not multiply facade fire damage or invent combustible surfaces',()=>{
 const full=game(),baseline=game(),roof=full.layout.traversal.roofs[0],host=full.props.find(p=>p.id===roof.buildingId),other=baseline.props.find(p=>p.id===roof.buildingId);
 baseline.props=baseline.props.filter(p=>!p.roofPart);baseline.obstacles=baseline.obstacles.filter(p=>!p.roofPart);full.weather=baseline.weather=null;
 const initial=host.health,c={x:host.x,z:host.z-host.d/2,y:.9};full.igniteProp(host,c.x,c.z,c.y,5);baseline.igniteProp(other,c.x,c.z,c.y,5);
 for(const part of full.props.filter(p=>p.roofPart))assert.equal(full.igniteProp(part,part.x,part.z,part.y+.1,5),false);
 for(let i=0;i<120;i++){full.updateFire(1/120);baseline.updateFire(1/120);}
 assert.ok(host.health<initial);assert.equal(host.health,other.health);for(const part of full.props.filter(p=>p.roofPart)){assert.equal(part.health,host.health);assert.ok(!(part.burning>0));}
});
