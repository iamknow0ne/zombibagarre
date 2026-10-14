import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {desktopTarget} from './desktop-target.mjs';
import {desktopOutputDir} from './desktop-output.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=desktopOutputDir(process.argv.slice(2),root);
const {platform,arch,name}=desktopTarget(process.argv.slice(2));
if(process.argv.includes('--software'))throw new Error('Software graphics are not supported by this smoke runner. Use the default hardware backend; hosted macOS without Metal can verify packaging only.');
const app=path.join(outputDir,`${name}-${platform}-${arch}`);
const executable=platform==='darwin'?path.join(app,'Zombie Bagarre.app','Contents','MacOS','zombie-bagarre'):path.join(app,'zombie-bagarre');
const args=['--smoke-test','--windowed'];
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(executable,args,{env,stdio:['ignore','pipe','pipe']});
let output='',expired=false;
for(const pipe of [child.stdout,child.stderr])pipe.on('data',data=>{output+=data.toString();process.stdout.write(data);});
const timer=setTimeout(()=>{expired=true;child.kill('SIGKILL');},150000);
const status=await new Promise(resolve=>{child.on('error',error=>{output+=error.stack;resolve(1);});child.on('close',code=>resolve(code??1));});
clearTimeout(timer);await mkdir(outputDir,{recursive:true});
await writeFile(path.join(outputDir,`${platform}-${arch}-smoke.log`),output);
if(expired||status!==0||!output.includes('SMOKE PASS: offline world, shaders, menu and desktop bridge initialized')){
 console.error(`Packaged app smoke failed (exit ${status}${expired?', timed out':''}).`);process.exitCode=1;
}
