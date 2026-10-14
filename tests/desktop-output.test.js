import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {desktopOutputDir} from '../scripts/desktop-output.mjs';
const root=path.resolve('/workspace/Zombie Bagarre');
test('desktop output defaults remain release and versioned output keeps old app directory separate',()=>{
 assert.equal(desktopOutputDir(['--mac'],root),path.join(root,'release'));
 const chosen=desktopOutputDir(['--mac','--output-dir=release/4.43.0'],root);assert.equal(chosen,path.join(root,'release','4.43.0'));
 const bundle='Zombie Bagarre-darwin-arm64';assert.notEqual(path.join(chosen,bundle),path.join(root,'release',bundle));
});
test('build and smoke accept relative/absolute destinations with spaces and equals signs',()=>{
 const dir='/tmp/QA builds/mac=4.43.0';assert.equal(desktopOutputDir([`--output-dir=${dir}`],root),path.resolve(dir));
 assert.equal(desktopOutputDir(['--output-dir=release/QA builds/../4.43.0/'],root),path.join(root,'release','4.43.0'));
});
test('malformed or ambiguous output paths fail before packaging can overwrite a bundle',()=>{
 for(const args of [['--output-dir='],['--output-dir=   '],['--output-dir=bad\0path'],['--output-dir=a','--output-dir=b'],['--output-dir','release/new']])assert.throws(()=>desktopOutputDir(args,root),/output directory|filesystem path|output-dir/);
});
