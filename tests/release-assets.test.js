import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {DOSSIERS,PORTRAIT_ATLASES,BOSS_DOSSIERS,SURVIVOR_HOOKS} from '../src/rebuild/Lore.js';
test('every dossier image and city atlas is packaged, compressed and backed by its original',async()=>{
 const entries=JSON.parse(await readFile(new URL('../docs/art/compression.json',import.meta.url),'utf8'));
 const requested=new Set([...Object.values(DOSSIERS),...Object.values(PORTRAIT_ATLASES)].map(x=>'public/art/'+x.art));
 for(const file of ['CityArt.js','WorldAmbience.js']){const source=await readFile(new URL('../src/rebuild/'+file,import.meta.url),'utf8');for(const m of source.matchAll(/'([a-z-]+-v1\.webp)'/g))requested.add('public/art/'+m[1]);}
 for(const path of requested){const entry=entries.find(e=>e.runtime===path);assert.ok(entry,path);const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.length,entry.runtimeBytes);assert.equal((await stat(new URL('../'+entry.source,import.meta.url))).size,entry.originalBytes);assert.ok(entry.runtimeBytes<entry.originalBytes*.4);}
 assert.equal(requested.size,8);assert.equal(SURVIVOR_HOOKS.length,4);assert.equal(BOSS_DOSSIERS.length,5);
});
