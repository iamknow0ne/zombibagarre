import test from 'node:test';
import assert from 'node:assert/strict';
import {usesCompactHUD,usesTouchLayout,updateInputLayout,writeHUD} from '../src/rebuild/HUDPresentation.js';
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

test('phone density is independent of controller ownership, and follows rotation/resizing',()=>{
 for(const [width,height,expected] of [[844,390,true],[1280,550,true],[390,844,true],[320,568,true],[1280,720,false],[1920,1080,false]]){
  assert.equal(usesCompactHUD({width,height}),expected,`${width}x${height}`);
  assert.equal(usesTouchLayout({source:'gamepad'},{width,coarse:true}),false);
 }
 const old={document:globalThis.document,matchMedia:globalThis.matchMedia,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
 try{
  const classes=new Map();globalThis.document={body:{classList:{toggle:(key,on)=>classes.set(key,on)}}};
  globalThis.matchMedia=()=>({matches:true});globalThis.innerWidth=844;globalThis.innerHeight=390;
  const world={feedback:{}};updateInputLayout({source:'gamepad'},world);
  assert.equal(classes.get('compact-hud'),true);assert.equal(classes.get('touch-layout'),false);assert.equal(world.touchView,false);assert.equal(world.feedback.mobile,true);
  updateInputLayout({source:'touch'},world);assert.equal(classes.get('compact-hud'),true);assert.equal(classes.get('touch-layout'),true);
  globalThis.innerWidth=1280;globalThis.innerHeight=720;updateInputLayout({source:'gamepad'},world);assert.equal(classes.get('compact-hud'),false);assert.equal(world.feedback.mobile,false);
 }finally{for(const [key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
