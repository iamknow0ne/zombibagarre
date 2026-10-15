import {spawnSync} from 'node:child_process';
import {readFile,mkdir,copyFile,writeFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const env={...process.env,VITE_ANDROID_QA:'1'};
// Prefer the caller's JDK/SDK. A downloaded local toolchain is a convenience,
// never a dependency copied into the repository or installed system-wide.
if(!env.JAVA_HOME){try{const entries=await readdir(path.join(root,'.cache/android'));const jdk=entries.find(x=>x.startsWith('jdk-17.'));if(jdk)env.JAVA_HOME=path.join(root,'.cache/android',jdk,'Contents/Home');}catch{}}
if(!env.ANDROID_HOME&&process.platform==='darwin')env.ANDROID_HOME=path.join(process.env.HOME,'Library/Android/sdk');
function run(command,args){const result=spawnSync(command,args,{cwd:root,env,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${command} failed (${result.status})`);}
run(process.platform==='win32'?'npm.cmd':'npm',['run','build']);
run(process.platform==='win32'?'android/gradlew.bat':'android/gradlew',['-p','android','assembleDebug','--no-daemon']);
const source=path.join(root,'android/app/build/outputs/apk/debug/app-debug.apk');await access(source);
run('python3',['scripts/verify-android-apk.py',source]);
const output=path.join(root,'release',pkg.version),name=`Zombie-Bagarre-${pkg.version}-Android-test.apk`;await mkdir(output,{recursive:true});
const apk=path.join(output,name);await copyFile(source,apk);
const digest=createHash('sha256').update(await readFile(apk)).digest('hex');await writeFile(apk+'.sha256',`${digest}  ${name}\n`);
console.log(`Android debug-signed test APK: ${apk}\nSHA-256: ${digest}`);
