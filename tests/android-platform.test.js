import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelTopDialog,installAndroidPlatform} from '../src/rebuild/AndroidPlatform.js';

class Dialog extends EventTarget {
 constructor(id){super();this.id=id;this.open=true;this.closes=0;}
 close(){this.open=false;this.closes++;this.dispatchEvent(new Event('close'));}
}
function fixture(){
 const window=new EventTarget(),document=new EventTarget(),dialogs=[],calls=[];
 document.hidden=false;document.defaultView={Event};document.activeElement=null;
 document.querySelectorAll=()=>dialogs.filter(d=>d.open);
 const ctx={suspend:()=>{calls.push('audio suspend');return Promise.resolve();},resume:()=>{calls.push('audio resume');return Promise.resolve();}};
 let state='playing';
 const adapter=installAndroidPlatform({window,document,getAudio:()=>({ctx}),closeRetro:()=>calls.push('close retro'),onPause:()=>{state='paused';calls.push('pause');},onForeground:()=>calls.push('reset clock'),onBack:()=>{state=state==='playing'?'paused':'playing';calls.push('back');}});
 return {window,document,dialogs,calls,ctx,adapter,get state(){return state;},send:type=>window.dispatchEvent(new Event(`bagarre-android-${type}`))};
}
test('browser input does not change audio or pause without native lifecycle events',()=>{
 const f=fixture();f.document.dispatchEvent(new Event('pointerdown'));f.document.dispatchEvent(new Event('keydown'));
 assert.deepEqual(f.calls,[]);assert.equal(f.state,'playing');f.adapter.dispose();
});
test('background closes independent emulator before saving/pausing and suspending audio',()=>{
 const f=fixture();f.send('pause');assert.deepEqual(f.calls,['close retro','pause','audio suspend']);assert.equal(f.state,'paused');
 f.document.dispatchEvent(new Event('pointerdown'));f.send('back');assert.equal(f.calls.length,3);
 f.send('resume');assert.equal(f.state,'paused');assert.deepEqual(f.calls.slice(3),['reset clock']);
 f.document.dispatchEvent(new Event('pointerdown'));f.document.dispatchEvent(new Event('keydown'));
 assert.deepEqual(f.calls.slice(4),['audio resume']);assert.equal(f.state,'paused');f.adapter.dispose();
});
test('foreground visibility and explicit controller resume gate audio correctly',()=>{
 const f=fixture();f.send('pause');f.document.hidden=true;f.send('resume');f.adapter.resumeAudioOnGesture();
 assert.equal(f.calls.includes('audio resume'),false);f.document.hidden=false;f.adapter.resumeAudioOnGesture();assert.equal(f.calls.at(-1),'audio resume');
 f.send('pause');f.send('resume');f.adapter.resumeAudioOnGesture();assert.equal(f.calls.filter(x=>x==='audio resume').length,2);f.adapter.dispose();
});
test('Back follows focused dialog cancellation rather than resuming underneath a menu',()=>{
 const f=fixture(),guide=new Dialog('guide-dialog'),camp=new Dialog('camp-dialog');f.dialogs.push(guide,camp);
 f.document.activeElement={closest:()=>guide};f.send('back');assert.equal(guide.open,false);assert.equal(camp.open,true);assert.equal(f.state,'playing');
 f.document.activeElement=null;f.send('back');assert.equal(camp.open,false);f.send('back');assert.equal(f.state,'paused');f.adapter.dispose();
});
test('mandatory upgrade and result dialogs preserve their veto on Back',()=>{
 for(const id of ['upgrade-dialog','result-dialog']){
  const f=fixture(),d=new Dialog(id);d.addEventListener('cancel',e=>e.preventDefault());f.dialogs.push(d);f.send('back');assert.equal(d.open,true);assert.equal(d.closes,0);assert.deepEqual(f.calls,[]);f.adapter.dispose();
 }
});
test('pause/retro cancel handlers may own closing without double close or closing replacement dialog',()=>{
 const f=fixture(),d=new Dialog('retro-dialog'),replacement=new Dialog('pause-dialog');replacement.open=false;f.dialogs.push(d,replacement);
 d.addEventListener('cancel',e=>{e.preventDefault();d.close();replacement.open=true;});
 assert.equal(cancelTopDialog(f.document),true);assert.equal(d.closes,1);assert.equal(replacement.open,true);
 replacement.addEventListener('cancel',()=>replacement.close());f.send('back');assert.equal(replacement.closes,1);assert.equal(f.calls.length,0);f.adapter.dispose();
});
test('Back in traversal pauses, then closes pause using existing close state restoration',()=>{
 const f=fixture(),d=new Dialog('pause-dialog');d.open=false;f.dialogs.push(d);f.send('back');assert.equal(f.state,'paused');
 d.open=true;let restored=false;d.addEventListener('close',()=>{restored=true;});f.send('back');assert.equal(restored,true);assert.equal(d.closes,1);assert.equal(f.calls.filter(x=>x==='back').length,1);f.adapter.dispose();
});
test('teardown removes every listener and unavailable/closed audio is tolerated',()=>{
 const f=fixture();f.ctx.suspend=()=>{throw new Error('closed');};f.ctx.resume=()=>Promise.reject(new Error('closed'));
 assert.doesNotThrow(()=>f.send('pause'));f.send('resume');assert.doesNotThrow(()=>f.adapter.resumeAudioOnGesture());
 f.adapter.dispose();const before=f.calls.length;for(const event of ['pause','resume','back'])f.send(event);f.document.dispatchEvent(new Event('pointerdown'));f.adapter.resumeAudioOnGesture();assert.equal(f.calls.length,before);
});
