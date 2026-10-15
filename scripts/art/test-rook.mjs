// Pin the actual candidate rig for the focused character regression suite.
// Keep browser material/animation inspection separate from these Node checks.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const suites=['rook-motion-study','rook-motion-controller','rook-locomotion','rook-combat-motion','rook-v7','rook-aim-layer','rook-rifle-travel'];
const result=spawnSync(process.execPath,['--test',...suites.map(name=>`scripts/art/${name}.test.mjs`)],{
 cwd:root,stdio:'inherit',env:{...process.env,ROOK_TEST_MODEL:fileURLToPath(new URL('../../assets/characters/rook-prototype-v7.glb',import.meta.url))}
});
if(result.error)console.error(result.error);
process.exitCode=result.status??1;
