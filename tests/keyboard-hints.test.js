import test from 'node:test';
import assert from 'node:assert/strict';
import {rebindKeyboard,normalizeKeyboardBindings} from '../src/rebuild/KeyboardBindings.js';
import {BINDINGS} from '../src/rebuild/ControllerConfig.js';
import {ControllerUI} from '../src/rebuild/ControllerUI.js';
import {InteriorUI} from '../src/rebuild/InteriorUI.js';
import {TraversalControlsUI} from '../src/rebuild/TraversalControlsUI.js';
import {PerspectiveUI} from '../src/rebuild/PerspectiveUI.js';
const node=()=>({innerHTML:'',dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){}});
const settings=()=>({bindings:{...BINDINGS},keyboardBindings:normalizeKeyboardBindings()});
test('HUD prompts follow replaced keyboard maps while controller labels remain independent',()=>{
 const ui=Object.create(ControllerUI.prototype);ui.settings=settings();ui.input={source:'keyboard'};
 assert.equal(ui.prompt('rightFire'),'<kbd>F</kbd>');
 for(const [action,code,prompt,label]of [['melee','KeyL','rightFire','L'],['interact','KeyH','interact','H'],['cycleRight','KeyU','nextWeapon','U'],['cycleLeft','KeyO','leftWeapon','O'],['reload','KeyK','reload','K']]){ui.settings.keyboardBindings=rebindKeyboard(ui.settings.keyboardBindings,action,code).bindings;assert.equal(ui.prompt(prompt),`<kbd>${label}</kbd>`);}
 ui.input={source:'gamepad',pad:{},family:'playstation'};assert.match(ui.prompt('interact'),/Triangle/);assert.doesNotMatch(ui.prompt('interact'),/<kbd>/);
 ui.input.source='keyboard';ui.settings.keyboardBindings=rebindKeyboard(ui.settings.keyboardBindings,'interact',null).bindings;assert.equal(ui.prompt('interact'),'<kbd>Unbound</kbd>');
});
test('indoor interaction hint follows current settings and does not expose keyboard prompts on touch',()=>{
 const ui=Object.create(InteriorUI.prototype);ui.input={source:'keyboard',settings:settings()};ui.input.settings.keyboardBindings=rebindKeyboard(ui.input.settings.keyboardBindings,'interact','KeyH').bindings;assert.equal(ui.binding(),'<kbd>H</kbd>');ui.input.source='touch';assert.equal(ui.binding(),'');ui.input.source='gamepad';ui.input.family='xbox';assert.match(ui.binding(),/>Y</);
});
test('jump and grapple hints update after remapping without changing their contextual availability',()=>{
 const old=globalThis.document;globalThis.document={body:{classList:{toggle(){}}}};
 try{const ui=Object.create(TraversalControlsUI.prototype);Object.assign(ui,{input:{source:'keyboard'},settings:settings(),group:node(),buttons:{jump:node(),grapple:node()}});ui.settings.keyboardBindings=rebindKeyboard(ui.settings.keyboardBindings,'jump','KeyH').bindings;ui.settings.keyboardBindings=rebindKeyboard(ui.settings.keyboardBindings,'grapple','KeyK').bindings;const sim={state:'playing',player:{traversal:'campaign'},traversalTarget:{available:true}};ui.update(sim,false);assert.match(ui.buttons.jump.innerHTML,/<kbd>H<\/kbd>/);assert.match(ui.buttons.grapple.innerHTML,/<kbd>K<\/kbd>/);assert.equal(ui.buttons.grapple.disabled,false);sim.traversalTarget.available=false;ui.update(sim,false);assert.equal(ui.buttons.grapple.disabled,true);sim.player.grapple={};ui.update(sim,false);assert.equal(ui.buttons.grapple.disabled,false);assert.match(ui.buttons.grapple.innerHTML,/RELEASE/);}finally{globalThis.document=old;}
});
test('perspective aim uses remapped precision hint while preserving gamepad symbol',()=>{
 const old=globalThis.document,button=node(),caption={};globalThis.document={getElementById:()=>button};
 try{const ui=Object.create(PerspectiveUI.prototype);Object.assign(ui,{input:{source:'keyboard'},settings:settings(),reticle:{...node(),querySelector:()=>caption}});ui.settings.keyboardBindings=rebindKeyboard(ui.settings.keyboardBindings,'toggleAim','KeyH').bindings;const sim={player:{weapon:'carbine',aiming:true}},world={viewRig:{active:true}};ui.update(sim,world);assert.match(button.innerHTML,/<kbd>H<\/kbd> AIM/);ui.input.source='gamepad';ui.input.family='playstation';ui.update(sim,world);assert.match(button.innerHTML,/pad-key/);assert.doesNotMatch(button.innerHTML,/<kbd>H/);}finally{globalThis.document=old;}
});
