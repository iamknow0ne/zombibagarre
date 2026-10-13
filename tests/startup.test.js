import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadingFrame} from '../src/rebuild/LoadingFrame.js';
const {startupWatch,startupLog,graphicsSwitches}=createRequire(import.meta.url)('../desktop/startup.cjs');

function clock(){
 let next=0;const tasks=new Map();
 return {tasks,schedule:fn=>{tasks.set(++next,fn);return next;},cancel:id=>tasks.delete(id),tick(){const [id,fn]=tasks.entries().next().value;tasks.delete(id);fn();}};
}
test('loading continues when a hidden window receives no animation frames',async()=>{
 const frames=clock(),timers=clock();let resolved=false;
 const pending=loadingFrame({request:frames.schedule,cancel:frames.cancel,schedule:timers.schedule,unschedule:timers.cancel}).then(()=>resolved=true);
 assert.equal(resolved,false);timers.tick();await pending;
 assert.equal(resolved,true);assert.equal(frames.tasks.size,0);assert.equal(timers.tasks.size,0);
});
test('loading allows two paints and cancels its fallback without leaving pending work',async()=>{
 const frames=clock(),timers=clock();
 const pending=loadingFrame({request:frames.schedule,cancel:frames.cancel,schedule:timers.schedule,unschedule:timers.cancel});
 frames.tick();assert.equal(frames.tasks.size,1);frames.tick();await pending;
 assert.equal(timers.tasks.size,0);assert.equal(frames.tasks.size,0);
});
test('startup timeout reports its latest stage and cannot fail twice',()=>{
 const timer=clock(),failures=[],logs=[];
 const watch=startupWatch({log:(...a)=>logs.push(a),fail:why=>failures.push(why),schedule:timer.schedule,cancel:timer.cancel});
 watch.stage('warming shaders');timer.tick();watch.fail('another error');watch.ready();
 assert.deepEqual(failures,['Startup timed out while warming shaders.']);assert.equal(logs.at(-1)[0],'STARTUP FAILED');
});
test('ready and ordinary quit cancel startup watchdogs',()=>{
 for(const action of ['ready','stop']){
  const timer=clock();const watch=startupWatch({log:()=>{},fail:()=>assert.fail('unexpected startup failure'),schedule:timer.schedule,cancel:timer.cancel});
  watch[action]();watch.fail('late event');assert.equal(timer.tasks.size,0);
 }
});
test('three GPU startup crashes terminate the invisible retry loop with a useful diagnosis',()=>{
 const timer=clock(),failures=[];
 const watch=startupWatch({log:()=>{},fail:why=>failures.push(why),schedule:timer.schedule,cancel:timer.cancel});
 for(let i=0;i<4;i++)watch.gpuExit({type:'Utility',reason:'crashed',exitCode:139});
 watch.gpuExit({type:'GPU',reason:'clean-exit',exitCode:0});
 for(let i=0;i<2;i++)watch.gpuExit({type:'GPU',reason:'crashed',exitCode:139});
 assert.equal(failures.length,0);
 watch.gpuExit({type:'GPU',reason:'crashed',exitCode:139});
 assert.equal(failures.length,1);assert.match(failures[0],/139/);assert.match(failures[0],/OpenGL/);assert.equal(timer.tasks.size,0);
});
test('OpenGL compatibility is opt-in, Linux-only, and preserves GPU acceleration and sandboxing',()=>{
 assert.deepEqual(graphicsSwitches('linux','default'),[]);assert.deepEqual(graphicsSwitches('darwin',''),[]);
 const switches=new Map(graphicsSwitches('linux','opengl'));
 assert.equal(switches.get('use-angle'),'gl');assert.equal(switches.get('use-gl'),'angle');assert.ok(switches.has('disable-gpu-shader-disk-cache'));
 assert.equal(switches.size,3);
 assert.throws(()=>graphicsSwitches('darwin','opengl'));assert.throws(()=>graphicsSwitches('linux','unknown'));
});
test('native diagnostics persist even without the shell launcher',t=>{
 const root=mkdtempSync(path.join(tmpdir(),'bagarre-log-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const {log,file}=startupLog(path.join(root,'diagnostics'));log('TEST STAGE','graphics');
 assert.match(readFileSync(file,'utf8'),/TEST STAGE: graphics/);
});

function installation(t){
 const root=mkdtempSync(path.join(tmpdir(),'bagarre-launch-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const app=path.join(root,'Deck Test','Zombie Bagarre');mkdirSync(path.join(app,'resources'),{recursive:true});
 copyFileSync(new URL('../desktop/launch.sh',import.meta.url),path.join(app,'launch.sh'));
 writeFileSync(path.join(app,'resources','app.asar'),'fixture');
 writeFileSync(path.join(app,'zombie-bagarre'),'#!/usr/bin/env bash\nprintf "PID=%s NODE=%s\\n" "$$" "${ELECTRON_RUN_AS_NODE:-unset}"\nprintf "ARG=%s\\n" "$@"\nprintf "TEST LOADER ERROR\\n" >&2\nexit 23\n',{mode:0o755});
 const state=path.join(root,'state');
 const run=(stateDir=state)=>spawnSync('bash',[path.join(app,'launch.sh'),'--windowed','argument with spaces'],{encoding:'utf8',timeout:5000,env:{...process.env,XDG_STATE_HOME:stateDir,ELECTRON_RUN_AS_NODE:'1'}});
 return {root,app,state,run};
}
test('installed launcher keeps Steam process identity, arguments, errors and exit status',t=>{
 const {state,run}=installation(t);const result=run();
 assert.equal(result.status,23,result.stderr);
 const log=readFileSync(path.join(state,'zombie-bagarre','launch.log'),'utf8');
 assert.match(log,new RegExp(`PID=${result.pid} NODE=unset`));
 for(const text of ['ARG=--steam-deck','ARG=--enable-logging=stderr','ARG=--windowed','ARG=argument with spaces','TEST LOADER ERROR'])assert.ok(log.includes(text),log);
});
test('an unwritable log directory does not prevent launching',t=>{
 const {root,run}=installation(t);const blocked=path.join(root,'not-a-directory');writeFileSync(blocked,'fixture');
 const result=run(blocked);assert.equal(result.status,23);assert.match(result.stderr,/Cannot write a startup log/);
});
test('incomplete installation produces a useful error before executing',t=>{
 const {app,state,run}=installation(t);rmSync(path.join(app,'resources','app.asar'));
 const result=run();assert.equal(result.status,1);assert.match(readFileSync(path.join(state,'zombie-bagarre','launch.log'),'utf8'),/Incomplete installation/);
});
