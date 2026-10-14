import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {desktopTarget} from './desktop-target.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {platform,arch,name}=desktopTarget(process.argv.slice(2));
const app=path.join(root,'release',`${name}-${platform}-${arch}`);
const executable=platform==='darwin'?path.join(app,'Zombie Bagarre.app','Contents','MacOS','zombie-bagarre'):path.join(app,'zombie-bagarre');
const args=['--smoke-test','--windowed'];
// Hosted CI machines have no usable Metal device. This opt-in is a boot check,
// never a performance measurement or a flag baked into the delivered app.
if(process.argv.includes('--software'))args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(executable,args,{env,stdio:['ignore','pipe','pipe']});
let output='',expired=false;
for(const pipe of [child.stdout,child.stderr])pipe.on('data',data=>{output+=data.toString();process.stdout.write(data);});
const timer=setTimeout(()=>{expired=true;child.kill('SIGKILL');},150000);
const status=await new Promise(resolve=>{child.on('error',error=>{output+=error.stack;resolve(1);});child.on('close',code=>resolve(code??1));});
clearTimeout(timer);await mkdir(path.join(root,'release'),{recursive:true});
await writeFile(path.join(root,'release',`${platform}-${arch}-smoke.log`),output);
if(expired||status!==0||!output.includes('SMOKE PASS: offline world, shaders, menu and desktop bridge initialized')){
 console.error(`Packaged app smoke failed (exit ${status}${expired?', timed out':''}).`);process.exitCode=1;
}
