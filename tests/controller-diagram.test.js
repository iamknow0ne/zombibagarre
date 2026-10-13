import test from 'node:test';
import assert from 'node:assert/strict';
import {diagramActions,diagramGeometry,controllerSVG} from '../src/rebuild/ControllerDiagram.js';
import {BINDINGS,rebind} from '../src/rebuild/ControllerConfig.js';
test('combat reference follows remapped actions without losing either hand or the stick controls',()=>{
 const settings={bindings:rebind(BINDINGS,'rightFire',7)},actions=diagramActions(settings);
 assert.equal(actions.find(a=>a.label==='Right weapon / melee').id,'7');assert.equal(actions.find(a=>a.label==='Left weapon').id,'6');assert.equal(actions.filter(a=>a.id==='move').length,1);assert.equal(actions.filter(a=>a.id==='aim').length,1);assert.equal(actions.length,16);
});
test('vehicle reference distinguishes easy driving from pedals and follows the exit binding',()=>{
 const settings={bindings:rebind(BINDINGS,'interact',2),drivingStyle:'assisted'},easy=diagramActions(settings,'driving');assert.equal(easy.some(a=>a.id==='7'),false);assert.ok(easy.some(a=>a.id==='6'&&a.label==='Hold to reverse'));assert.equal(easy.find(a=>a.label.startsWith('Exit')).id,'2');const racing=diagramActions({...settings,drivingStyle:'racing'},'driving');assert.ok(racing.some(a=>a.id==='7'&&a.label==='Accelerate'));assert.ok(racing.some(a=>a.id==='1'&&a.label==='Handbrake'));
});
test('fixed map and menu controls are not mislabelled after combat remapping',()=>{
 const settings={bindings:rebind(BINDINGS,'dash',2)};assert.equal(diagramActions(settings,'menus').find(a=>a.label==='Select / confirm').id,'0');const map=diagramActions(settings,'map');assert.equal(map.find(a=>a.label==='Clear route').id,'2');assert.equal(map.find(a=>a.label==='Centre on survivor').id,'11');assert.equal(map.find(a=>a.label==='Move marker cursor').id,'aim');
});
test('PlayStation and Xbox drawings place their physical sticks correctly and include all bindable buttons',()=>{
 const ps=diagramGeometry('playstation'),xb=diagramGeometry('xbox');assert.ok(ps.left[1]>ps.dpad[1]);assert.ok(xb.left[1]<xb.dpad[1]);assert.deepEqual(ps.right,xb.right);for(const family of ['playstation','xbox','generic']){const svg=controllerSVG(family);for(let i=0;i<16;i++)assert.equal(svg.split(`data-pad-button="${i}"`).length-1,1);assert.ok(svg.includes('role="img"'));assert.ok(svg.includes('Button actions are listed below'));}assert.ok(controllerSVG('playstation').includes('△'));assert.ok(controllerSVG('xbox').includes('>Y<'));for(const label of ['B4','B9','B10'])assert.ok(controllerSVG('generic').includes('>'+label+'<'));
});
