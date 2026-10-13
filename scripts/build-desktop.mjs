import {packager} from '@electron/packager';
import {cp,mkdir,readFile,readdir,writeFile,chmod,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const platform=process.argv.includes('--mac')?'darwin':'linux';
const arch=platform==='linux'?'x64':process.arch;
const stage=path.join(root,'.desktop-build',platform+'-'+arch,'app');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
await cp(path.join(root,'dist'),path.join(stage,'dist'),{recursive:true});
// Original source PNGs are not runtime dependencies; the game uses WebP.
for(const name of await readdir(path.join(stage,'dist','art')))if(name.endsWith('.png'))await rm(path.join(stage,'dist','art',name));
await mkdir(path.join(stage,'desktop'));
for(const name of ['main.cjs','preload.cjs','policy.cjs','startup.cjs','icon.png'])await cp(path.join(root,'desktop',name),path.join(stage,'desktop',name));
await writeFile(path.join(stage,'package.json'),JSON.stringify({name:'zombie-bagarre',productName:'Zombie Bagarre',version:pkg.version,description:pkg.description,main:'desktop/main.cjs',author:'iamknow0ne',private:true},null,2));
const [output]=await packager({dir:stage,out:path.join(root,'release'),name:'zombie-bagarre',executableName:'zombie-bagarre',platform,arch,
  electronVersion:pkg.devDependencies.electron,asar:true,overwrite:true,prune:false,appBundleId:'games.zombibagarre.quarantine',appVersion:pkg.version});
if(platform==='linux'){
 await cp(path.join(root,'desktop','launch.sh'),path.join(output,'launch.sh'));
 await cp(path.join(root,'desktop','install.sh'),path.join(output,'Install Zombie Bagarre.sh'));
 await mkdir(path.join(output,'desktop'),{recursive:true});await cp(path.join(root,'desktop','icon.png'),path.join(output,'desktop','icon.png'));
 await cp(path.join(root,'docs','STEAM-DECK.md'),path.join(output,'START-HERE.md'));
 await chmod(path.join(output,'launch.sh'),0o755);await chmod(path.join(output,'Install Zombie Bagarre.sh'),0o755);
 const name=`Zombie-Bagarre-${pkg.version}-SteamDeck-x86_64.tar.gz`,archive=path.join(root,'release',name);
 execFileSync('tar',['-czf',archive,'-C',path.dirname(output),path.basename(output)],{stdio:'inherit'});
 const digest=createHash('sha256').update(await readFile(archive)).digest('hex');
 await writeFile(path.join(root,'release',name+'.sha256'),`${digest}  ${name}\n`);
 console.log(`Steam Deck download: ${archive}`);
}
console.log(`Packaged application: ${output}`);
