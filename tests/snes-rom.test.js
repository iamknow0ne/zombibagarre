import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const file=p=>readFileSync(new URL('../'+p,import.meta.url));
test('original SNES cartridge has valid LoROM header, vectors and checksum',()=>{
 const rom=file('public/retro/zombie-bagarre.sfc');
 assert.equal(rom.length,256*1024);
 assert.equal(rom.subarray(0x7fc0,0x7fd3).toString('ascii'),'ZOMBIE BAGARRE SNES');
 assert.equal(rom[0x7fd5],0x20); // LoROM, no enhancement coprocessor.
 assert.equal(rom[0x7fd7],8);
 assert.equal(rom[0x7fd8],0); // No save RAM claimed.
 const checksum=rom.readUInt16LE(0x7fde), complement=rom.readUInt16LE(0x7fdc);
 assert.equal(checksum^complement,65535);
 assert.equal(rom.reduce((a,b)=>(a+b)&65535,0),checksum);
 assert.ok(rom.readUInt16LE(0x7ffc)>=0x8000,'reset vector must enter cartridge ROM');
 assert.ok(rom.readUInt16LE(0x7ffa)>=0x8000,'NMI vector must enter cartridge ROM');
});
test('SNES manifest identifies the built artifact and does not claim hardware QA',()=>{
 const rom=file('public/retro/zombie-bagarre.sfc');
 const info=JSON.parse(file('public/retro/zombie-bagarre.json'));
 assert.equal(info.sha256,createHash('sha256').update(rom).digest('hex'));
 assert.equal(info.bytes,rom.length);assert.equal(info.hardwareTested,false);
 assert.equal(info.toolchain,'PVSnesLib 4.6.0');
});
test('SNES tile assets and maps stay within non-overlapping VRAM budgets',()=>{
 const world=file('demakes/snes/assets/world.pic'),font=file('demakes/snes/assets/font.pic'),actors=file('demakes/snes/assets/actors.pic');
 assert.equal(world.length%32,0);assert.ok(world.length<=0x4000);
 assert.equal(font.length,4096);assert.ok(actors.length<=0x4000);
 const map=file('demakes/snes/assets/world.map');assert.equal(map.length,2048);
 for(let i=0;i<map.length;i+=2)assert.ok((map.readUInt16LE(i)&1023)<world.length/32);
 for(const name of ['world','font','actors'])assert.equal(file(`demakes/snes/assets/${name}.pal`).length,32);
 const sound=file('demakes/snes/assets/shot.brr');assert.equal(sound.length%9,0);
 assert.equal(sound[sound.length-9]&1,1,'last BRR block must end playback');
});
