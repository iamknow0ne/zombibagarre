import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {desktopDefaults,DECK_PROFILES,renderPixelRatio,frameLimit} from '../src/rebuild/DesktopProfile.js';
import {controlSettings} from '../src/rebuild/ControllerConfig.js';
import {RenderSchedule} from '../src/rebuild/RenderSchedule.js';
const {assetPath,trustedURL,trustedSender}=createRequire(import.meta.url)('../desktop/policy.cjs');
test('desktop origin cannot access files outside the shipped game',()=>{
 assert.equal(assetPath('bagarre://game/','/app/dist'),'/app/dist/index.html');
 assert.equal(assetPath('bagarre://game/assets/main.js','/app/dist'),'/app/dist/assets/main.js');
 for(const url of ['https://game/index.html','file:///etc/passwd','bagarre://elsewhere/a','bagarre://game/%2e%2e%2fsecret','bagarre://game/%00','bagarre://game/%5csecret','bagarre://game/%zz','bagarre://user:pass@game/a'])assert.equal(assetPath(url,'/app/dist'),null,url);
 assert.equal(trustedURL('bagarre://game.evil/'),false);
});
test('native IPC accepts only the own top-level game frame',()=>{
 const frame={url:'bagarre://game/'},contents={mainFrame:frame};
 assert.ok(trustedSender({sender:contents,senderFrame:frame},contents));
 assert.equal(trustedSender({sender:contents,senderFrame:{url:frame.url}},contents),false);
 frame.url='https://example.org/';assert.equal(trustedSender({sender:contents,senderFrame:frame},contents),false);
});
test('Deck starts with independent triggers without changing browser defaults or saved bindings',()=>{
 assert.deepEqual(desktopDefaults(undefined),{});
 const d=desktopDefaults({steamDeck:true}),controls=controlSettings(d);
 assert.equal(controls.bindings.leftFire,6);assert.equal(controls.bindings.rightFire,7);
 assert.equal(new Set(Object.values(controls.bindings)).size,Object.keys(controls.bindings).length);
 const stored={quality:'high',bindings:{...controls.bindings,rightFire:11}};
 assert.equal(controlSettings({...d,...stored}).bindings.rightFire,11);
 assert.equal({...d,...stored}.quality,'high');
});
test('graphics profiles preserve native resolution and gameplay rules',()=>{
 assert.equal(renderPixelRatio(DECK_PROFILES.balanced,1),1);
 assert.equal(renderPixelRatio(DECK_PROFILES.battery,1),.85);
 assert.equal(renderPixelRatio({quality:'high',resolutionScale:99},1),1);
 assert.equal(renderPixelRatio({quality:'high'},3),2);
 for(const profile of Object.values(DECK_PROFILES))for(const key of ['difficulty','bindings','gore','progression','weatherMode','dayCycle'])assert.equal(profile[key],undefined);
});
test('render cap limits drawing without changing independent simulation ticks',()=>{
 const r=new RenderSchedule();let rendered=0;
 for(let now=0;now<1000;now+=1000/120)if(r.next(now,'playing',false,false,30)!==null)rendered++;
 assert.ok(rendered>=29&&rendered<=31,rendered);
 assert.equal(frameLimit(NaN),0);assert.equal(frameLimit(40),40);
 assert.equal(r.next(1100,'playing',true,false,60),null);
 assert.notEqual(r.next(1110,'playing',false,true,60),null);
});
