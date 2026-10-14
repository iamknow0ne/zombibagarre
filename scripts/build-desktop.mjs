import {packager} from '@electron/packager';
import {cp,mkdir,readFile,readdir,writeFile,chmod,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {desktopTarget} from './desktop-target.mjs';
import {desktopOutputDir} from './desktop-output.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=desktopOutputDir(process.argv.slice(2),root);
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const {platform,arch,name,executableName}=desktopTarget(process.argv.slice(2));
const stage=path.join(root,'.desktop-build',platform+'-'+arch,'app');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
await cp(path.join(root,'dist'),path.join(stage,'dist'),{recursive:true});
// Original source PNGs are not runtime dependencies; the game uses WebP.
for(const name of await readdir(path.join(stage,'dist','art')))if(name.endsWith('.png'))await rm(path.join(stage,'dist','art',name));
await mkdir(path.join(stage,'desktop'));
for(const name of ['main.cjs','preload.cjs','policy.cjs','startup.cjs','icon.png'])await cp(path.join(root,'desktop',name),path.join(stage,'desktop',name));
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'zombie-bagarre',productName:'Zombie Bagarre',version:pkg.version,description:pkg.description,main:'desktop/main.cjs',author:'iamknow0ne',private:true},null,2));
const macOptions={};
if(platform==='darwin'){
 const iconset=path.join(path.dirname(stage),'icon.iconset');await mkdir(iconset,{recursive:true});
 // Use the existing game mark, with real 1x/2x icon entries instead of Electron's icon.
 for(const size of [16,32,128,256,512])for(const scale of [1,2]){
  const pixels=size*scale;
  execFileSync('/usr/bin/sips',['-z',String(pixels),String(pixels),path.join(root,'desktop','icon.png'),'--out',path.join(iconset,`icon_${size}x${size}${scale===2?'@2x':''}.png`)],{stdio:'ignore'});
 }
 const icon=path.join(path.dirname(stage),'icon.icns');execFileSync('/usr/bin/iconutil',['-c','icns',iconset,'-o',icon]);
 Object.assign(macOptions,{icon,appCategoryType:'public.app-category.action-games',extendInfo:{NSHighResolutionCapable:true},
  // Ad-hoc signatures provide local integrity only. Public distribution still
  // needs Developer ID signing and Apple notarization; never disable Gatekeeper.
  osxSign:{identity:'-',identityValidation:false,preAutoEntitlements:false,preEmbedProvisioningProfile:false,continueOnError:false,
   // Local ad-hoc signatures have no Apple Team ID for hardened-runtime
   // library validation. Developer ID distribution must enable that runtime
   // when a real signing identity and notarization are configured.
   optionsForFile:()=>({entitlements:['com.apple.security.cs.allow-jit'],hardenedRuntime:false})}});
}
const [output]=await packager({dir:stage,out:outputDir,name,executableName,platform,arch,
  electronVersion:pkg.devDependencies.electron,asar:true,overwrite:true,prune:false,appBundleId:'games.zombibagarre.quarantine',appVersion:pkg.version,...macOptions});
if(platform==='linux'){
 await cp(path.join(root,'desktop','launch.sh'),path.join(output,'launch.sh'));
 await cp(path.join(root,'desktop','launch-opengl.sh'),path.join(output,'Launch OpenGL.sh'));
 await cp(path.join(root,'desktop','install.sh'),path.join(output,'Install Zombie Bagarre.sh'));
 await mkdir(path.join(output,'desktop'),{recursive:true});await cp(path.join(root,'desktop','icon.png'),path.join(output,'desktop','icon.png'));
 await cp(path.join(root,'docs','STEAM-DECK.md'),path.join(output,'START-HERE.md'));
 await chmod(path.join(output,'launch.sh'),0o755);await chmod(path.join(output,'Install Zombie Bagarre.sh'),0o755);
 await chmod(path.join(output,'Launch OpenGL.sh'),0o755);
 const name=`Zombie-Bagarre-${pkg.version}-SteamDeck-x86_64.tar.gz`,archive=path.join(outputDir,name);
 execFileSync('tar',['-czf',archive,'-C',path.dirname(output),path.basename(output)],{stdio:'inherit'});
 const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
 await writeFile(path.join(outputDir,name+'.sha256'),`${digest}  ${name}\n`);
 console.log(`Steam Deck download: ${archive}`);
}
if(platform==='darwin'){
 const app=path.join(output,'Zombie Bagarre.app');
 execFileSync('/usr/bin/codesign',['--verify','--deep','--strict','--verbose=2',app],{stdio:'inherit'});
 await cp(path.join(root,'docs','MACOS.md'),path.join(output,'START-HERE.md'));
 const archiveName=`Zombie-Bagarre-${pkg.version}-macOS-${arch}.zip`,archive=path.join(outputDir,archiveName);
 // ditto preserves macOS app symlinks and resource metadata.
 await rm(archive,{force:true});execFileSync('/usr/bin/ditto',['-c','-k','--sequesterRsrc','--keepParent',output,archive],{stdio:'inherit'});
 const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
 await writeFile(archive+'.sha256',`${digest}  ${archiveName}\n`);
 console.log(`macOS local test download (ad-hoc signed, not notarized): ${archive}`);
}
console.log(`Packaged application: ${output}`);
