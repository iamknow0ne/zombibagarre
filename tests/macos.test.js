import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {desktopTarget} from '../scripts/desktop-target.mjs';
const {startupWatch}=createRequire(import.meta.url)('../desktop/startup.cjs');

test('macOS builds use the native architecture and reject unverified cross-platform signing',()=>{
 assert.deepEqual(desktopTarget(['--mac'],{platform:'darwin',arch:'arm64'}),{platform:'darwin',arch:'arm64',name:'Zombie Bagarre',executableName:'zombie-bagarre'});
 assert.equal(desktopTarget(['--mac','--arch=x64'],{platform:'darwin',arch:'arm64'}).arch,'x64');
 assert.throws(()=>desktopTarget(['--mac'],{platform:'linux',arch:'x64'}),/on a Mac/);
 assert.throws(()=>desktopTarget(['--mac','--arch=universal'],{platform:'darwin',arch:'arm64'}),/Unsupported/);
 assert.equal(desktopTarget([],{platform:'darwin',arch:'arm64'}).arch,'x64');
 assert.throws(()=>desktopTarget(['--arch=arm64'],{platform:'linux',arch:'x64'}),/Unsupported/);
});
test('macOS GPU failures request diagnostics without suggesting an absent Linux launcher',()=>{
 const failures=[];
 const watch=startupWatch({log:()=>{},fail:why=>failures.push(why),schedule:()=>1,cancel:()=>{},platform:'darwin'});
 for(let i=0;i<3;i++)watch.gpuExit({type:'GPU',reason:'crashed',exitCode:139});
 assert.equal(failures.length,1);assert.match(failures[0],/139/);assert.match(failures[0],/startup log/);assert.doesNotMatch(failures[0],/OpenGL.sh/);
});
