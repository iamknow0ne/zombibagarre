import test from 'node:test';
import assert from 'node:assert/strict';
import {usesTouchLayout,updateInputLayout,writeHUD} from '../src/rebuild/HUDPresentation.js';
test('touch layout yields to active gamepad and returns on touch or disconnect',()=>{
 for(const source of ['keyboard','touch','gamepad']){
  assert.equal(usesTouchLayout({source},{width:390,coarse:true}),source!=='gamepad');
  assert.equal(usesTouchLayout({source},{width:1280,coarse:false}),source==='touch');
 }
});
test('unchanged HUD does not rebuild nodes and source transitions invalidate old content',()=>{
 const old={document:globalThis.document,matchMedia:globalThis.matchMedia,innerWidth:globalThis.innerWidth};
 let writes=0,html='';const el={dataset:{iconContent:'pause'},classList:{remove(){}},set innerHTML(value){writes++;html=value;},get innerHTML(){return html;}};
 try{
  globalThis.document={body:{classList:{toggle(){}}}};globalThis.matchMedia=()=>({matches:false});globalThis.innerWidth=1200;
  const world={feedback:{}};updateInputLayout({source:'gamepad'},world);writeHUD(el,'PS / PAUSE');writeHUD(el,'PS / PAUSE');assert.equal(writes,1);
  updateInputLayout({source:'touch'},world);el.innerHTML='touch icon';assert.equal(world.touchView,true);
  updateInputLayout({source:'gamepad'},world);writeHUD(el,'PS / PAUSE');assert.equal(writes,3);assert.equal(html,'PS / PAUSE');assert.equal(el.dataset.iconContent,undefined);
  writeHUD(el,'XBOX / PAUSE');assert.equal(writes,4);
 }finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
