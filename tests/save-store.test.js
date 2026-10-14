import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,SAVE_KEY,RECOVERY_KEY,LEGACY_KEYS,backupText,parseBackup,normalizeSave,MAX_BACKUP_BYTES} from '../src/rebuild/SaveStore.js';
import {readSavedSettings} from '../src/rebuild/Persistence.js';
import {sampleGamepad,validCalibration} from '../src/rebuild/Gamepad.js';
function memory(initial={}){
 const data=new Map(Object.entries(initial)),writes=[];
 return {data,writes,getItem:k=>data.get(k)??null,setItem(k,v){writes.push(k);data.set(k,v);}};
}
function store(device,options={}){let pending=null;const saves=new SaveStore(device,{schedule:fn=>{pending=fn;return 1;},cancel:()=>pending=null,...options});return {saves,flushTimer:()=>pending?.()};}
const hero=xp=>normalizeSave({profile:{xp},record:{scrap:250},settings:{volume:30,bindings:{leftFire:6},rawMapping:{buttons:[1,2]}}});
test('legacy records migrate together without discarding the original keys',()=>{
 const h=hero(900),device=memory(Object.fromEntries(Object.entries(LEGACY_KEYS).map(([field,key])=>[key,JSON.stringify(h[field])]))),{saves}=store(device);
 assert.deepEqual(saves.data,h);saves.set('profile',{...h.profile,xp:1000});assert.equal(device.writes.length,0);assert.ok(saves.flush());
 const next=new SaveStore(device);assert.equal(next.read('profile').xp,1000);assert.deepEqual(next.read('settings'),h.settings);assert.equal(device.data.get(LEGACY_KEYS.profile),JSON.stringify(h.profile));
});
test('many progression changes coalesce and explicit flush cancels the timer',()=>{
 const device=memory(),{saves,flushTimer}=store(device);for(let xp=1;xp<=20;xp++)saves.set('profile',{xp});
 flushTimer();assert.equal(device.writes.length,1);assert.equal(parseBackup(device.data.get(SAVE_KEY)).profile.xp,20);
 saves.set('record',{scrap:900});saves.flush();flushTimer();assert.equal(device.writes.length,2);
});
test('quota failures preserve the last complete save and allow an in-memory export and retry',()=>{
 const original=backupText(hero(90)),device=memory({[SAVE_KEY]:original}),{saves}=store(device),write=device.setItem;
 device.setItem=()=>{throw new Error('QuotaExceededError');};saves.set('profile',{xp:180});assert.equal(saves.flush(),false);assert.ok(saves.issue);assert.equal(device.data.get(SAVE_KEY),original);assert.equal(parseBackup(saves.export()).profile.xp,180);
 device.setItem=write;assert.equal(saves.flush(),true);assert.equal(saves.issue,'');assert.equal(parseBackup(device.data.get(SAVE_KEY)).profile.xp,180);
});
test('blocked or unreadable storage never overwrites potentially valid progress',()=>{
 const {saves}=store(()=>{throw new Error('SecurityError');});saves.set('profile',{xp:100});assert.equal(saves.flush(),false);assert.ok(saves.locked);assert.equal(parseBackup(saves.export()).profile.xp,100);
});
test('malformed and future canonical saves are protected until explicit restore',()=>{
 for(const original of ['null','{broken',JSON.stringify({format:'zombie-bagarre',version:2})]){
  const device=memory({[SAVE_KEY]:original}),{saves}=store(device);saves.set('profile',{xp:30});assert.equal(saves.flush(),false);assert.equal(device.data.get(SAVE_KEY),original);assert.equal(saves.original(),original);
  saves.restore(backupText(hero(700)));assert.equal(device.data.get(RECOVERY_KEY),original);assert.equal(saves.data.profile.xp,700);
 }
});
test('future legacy save survives restoration in the recovery copy',()=>{
 const raw=JSON.stringify({version:9,xp:8888}),device=memory({[LEGACY_KEYS.profile]:raw}),{saves}=store(device);
 assert.ok(saves.locked);saves.restore(backupText(hero(700)));assert.equal(JSON.parse(saves.recovery()).profile,raw);
});
test('restore retains latest session progress and rejects late writes from the outgoing world',()=>{
 const device=memory({[SAVE_KEY]:backupText(hero(90))}),{saves,flushTimer}=store(device);saves.set('profile',{xp:180});
 saves.restore(backupText(hero(700)));assert.equal(parseBackup(saves.recovery()).profile.xp,180);
 saves.set('profile',{xp:180});saves.flush();flushTimer();assert.equal(new SaveStore(device).data.profile.xp,700);
});
test('restore write failures cannot partially replace a character',()=>{
 for(const rejected of [RECOVERY_KEY,SAVE_KEY]){
  const original=backupText(hero(90)),device=memory({[SAVE_KEY]:original}),{saves}=store(device),write=device.setItem;
  device.setItem=function(k,v){if(k===rejected)throw new Error('Disk full');write.call(this,k,v);};
  assert.throws(()=>saves.restore(backupText(hero(700))));assert.equal(device.data.get(SAVE_KEY),original);assert.equal(saves.data.profile.xp,90);assert.equal(saves.restored,undefined);
 }
});
test('another tab changing or deleting the save prevents stale overwrites',()=>{
 for(const replacement of [backupText(hero(900)),null]){
  const device=memory({[SAVE_KEY]:backupText(hero(90))}),{saves}=store(device);saves.set('profile',{xp:100});
  if(replacement===null)device.data.delete(SAVE_KEY);else device.setItem(SAVE_KEY,replacement);
  assert.equal(saves.flush(),false);assert.ok(saves.locked);assert.equal(device.getItem(SAVE_KEY),replacement);assert.match(saves.issue,/Another game tab/);
 }
});
test('restore preserves another tabs newer disk record even before its storage event',()=>{
 const device=memory({[SAVE_KEY]:backupText(hero(90))}),{saves}=store(device),other=backupText(hero(500));device.setItem(SAVE_KEY,other);saves.restore(backupText(hero(700)));assert.equal(saves.recovery(),other);
});
test('invalid imports perform no writes; backups round-trip identity, gear and controller settings',()=>{
 const {saves}=store(memory()),before=saves.export();
 for(const bad of ['x','null','{}',' '.repeat(MAX_BACKUP_BYTES+1),JSON.stringify({format:'zombie-bagarre',version:1,data:{profile:{},record:{},settings:{}}})])assert.throws(()=>saves.restore(bad));
 assert.deepEqual(parseBackup(saves.export()),parseBackup(before));
 const h=hero(900);h.profile.appearance={hair:'mohawk'};h.profile.owned.push('warden-head-1');h.profile.equipment.head='warden-head-1';assert.deepEqual(parseBackup(backupText(h)),h);
});
test('malformed legacy scalars cannot poison numeric or appearance coercion',()=>{
 const device=memory({[LEGACY_KEYS.profile]:JSON.stringify({xp:{valueOf:null},attributes:{vigor:1e100},dye:{toString:null}}),[LEGACY_KEYS.record]:'null',[LEGACY_KEYS.settings]:'[]'}),{saves}=store(device);
 assert.equal(saves.data.profile.xp,0);assert.equal(saves.data.profile.dye,'olive');assert.ok(Number.isFinite(saves.data.record.scrap));assert.ok(saves.recovered);
});
test('QA sessions never touch personal storage',()=>{
 const {saves}=store(()=>assert.fail('QA accessed personal storage'),{ephemeral:true});saves.set('profile',{xp:90});assert.ok(saves.flush());assert.throws(()=>saves.restore(backupText(hero(900))),/test workshops/);
 assert.equal(parseBackup(saves.original()).profile.xp,90);assert.throws(()=>saves.recovery(),/test workshops/);
});
test('traversal shares migrated settings and ignores malformed setting objects',()=>{
 const device=memory({[LEGACY_KEYS.settings]:'{"goreLevel":2}',[SAVE_KEY]:backupText(hero(0))});assert.equal(readSavedSettings(device).volume,30);
 device.data.delete(SAVE_KEY);assert.equal(readSavedSettings(device).goreLevel,2);
 const text=JSON.stringify({format:'zombie-bagarre',version:1,data:{settings:{goreLevel:{valueOf:null},volume:20}}});device.data.set(SAVE_KEY,text);assert.deepEqual(readSavedSettings(device),{volume:20});
});
test('a compact import that expands past the storage limit is rejected before either write',()=>{
 const data=hero(900);data.settings=Object.fromEntries(Array.from({length:16000},(_,i)=>['setting'+i,1]));
 const compact=JSON.stringify({format:'zombie-bagarre',version:1,data});assert.ok(new TextEncoder().encode(compact).length<MAX_BACKUP_BYTES);
 const original=backupText(hero(90)),recovery=backupText(hero(20)),device=memory({[SAVE_KEY]:original,[RECOVERY_KEY]:recovery}),{saves}=store(device);
 assert.throws(()=>saves.restore(compact),/too much save data/);assert.deepEqual(device.writes,[]);assert.equal(device.getItem(SAVE_KEY),original);assert.equal(device.getItem(RECOVERY_KEY),recovery);
 assert.equal(new SaveStore(device).data.profile.xp,90);
});
test('malformed imported controller calibrations cannot crash a matching controller',()=>{
 const pad={id:'Test pad',mapping:'standard',buttons:Array.from({length:17},()=>({value:0})),axes:[0,0,0,0]};
 const valid={id:pad.id,buttons:Array.from({length:16},(_,index)=>({kind:'button',index})),axes:Array.from({length:4},(_,index)=>({kind:'axis',index,sign:1}))};
 const malformed=[{...valid,buttons:{length:16}},{...valid,axes:{length:4}},{...valid,axes:Array(4).fill({kind:'button',index:0})},{...valid,buttons:[{kind:'axis',index:0,sign:1,rest:{valueOf:null}},...valid.buttons.slice(1)]}];
 for(const rawMapping of malformed){
  assert.equal(validCalibration(rawMapping,pad.id),false);assert.doesNotThrow(()=>sampleGamepad(pad,[],{rawMapping}));
  const h=hero(900);h.settings.rawMapping=rawMapping;const imported=parseBackup(JSON.stringify({format:'zombie-bagarre',version:1,data:h}));assert.equal(imported.settings.rawMapping,undefined);assert.equal(sampleGamepad(pad,[],imported.settings).layout,'standard');
 }
 const h=hero(900);h.settings.rawMapping=valid;assert.deepEqual(parseBackup(backupText(h)).settings.rawMapping,valid);
});
test('unchanged saves do not schedule or rewrite the device record',()=>{
 const device=memory({[SAVE_KEY]:backupText(hero(900))}),{saves,flushTimer}=store(device);
 for(let i=0;i<10;i++)saves.set('profile',saves.read('profile'));
 flushTimer();assert.ok(saves.flush());assert.equal(saves.dirty,false);assert.deepEqual(device.writes,[]);
});
test('imported and legacy volume values are finite percentages or omitted for defaults',()=>{
 for(const [value,expected]of [['abc',undefined],['Infinity',undefined],['',undefined],['  ',undefined],[true,undefined],['35',35],['0',0],[-20,0],[120,100]]){
  const h=hero(900);h.settings.volume=value;
  const text=JSON.stringify({format:'zombie-bagarre',version:1,data:h});assert.equal(parseBackup(text).settings.volume,expected);
  const {saves}=store(memory({[LEGACY_KEYS.settings]:JSON.stringify({volume:value})}));assert.equal(saves.read('settings').volume,expected);
  assert.ok(Number.isFinite((saves.read('settings').volume??45)/100));
 }
});
