import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveStore,normalizeSave,parseBackup,backupText} from '../src/rebuild/SaveStore.js';
import {normalizeKeyboardBindings,rebindKeyboard,resolveKeyboardActions} from '../src/rebuild/KeyboardBindings.js';

test('custom keyboard mappings survive canonical saving and backup restore, including unbound keys',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=new SaveStore(storage,{schedule:()=>0,cancel:()=>{}});
 let bindings=rebindKeyboard(normalizeKeyboardBindings(),'interact','KeyH').bindings;
 bindings=rebindKeyboard(bindings,'reload',null).bindings;
 store.set('settings',{volume:27,keyboardBindings:bindings});assert.ok(store.flush());
 const reopened=new SaveStore(storage);assert.deepEqual(reopened.read('settings').keyboardBindings,bindings);
 const exported=parseBackup(reopened.export());assert.deepEqual(exported.settings.keyboardBindings.reload,[]);
 const restored=new SaveStore({getItem:()=>null,setItem:()=>{}});restored.restore(backupText(exported));
 assert.deepEqual(resolveKeyboardActions(restored.read('settings').keyboardBindings,'KeyH'),['interact']);
 assert.deepEqual(resolveKeyboardActions(restored.read('settings').keyboardBindings,'KeyV'),[]);
});
test('ephemeral QA can remap without writing to real progress storage',()=>{
 let writes=0;const store=new SaveStore({getItem:()=>null,setItem:()=>writes++},{ephemeral:true,schedule:()=>0,cancel:()=>{}});
 store.set('settings',{keyboardBindings:rebindKeyboard(normalizeKeyboardBindings(),'dash','KeyK').bindings});store.flush();assert.equal(writes,0);assert.deepEqual(store.read('settings').keyboardBindings.dash,['KeyK']);
});
test('malformed keyboard records cannot preserve arbitrary nested save objects',()=>{
 const saved=normalizeSave({settings:{keyboardBindings:{dash:['KeyK'],unknown:['KeyL'],bad:{nested:true}},unexpected:{x:1}}}).settings;
 const normalized=normalizeKeyboardBindings(saved.keyboardBindings);assert.deepEqual(normalized.dash,['KeyK']);assert.equal(normalized.unknown,undefined);assert.equal(normalized.bad,undefined);assert.equal(saved.unexpected,undefined);
});
