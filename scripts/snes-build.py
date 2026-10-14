#!/usr/bin/env python3
"""Build the original SNES cartridge. Pinned SDK, checked downloads, no game ROM inputs."""
import hashlib, json, os, platform, shutil, subprocess, tempfile, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
VERSION = '4.6.0'
ARCHIVES = {
    'Darwin': ('darwin', '18654ba0761a7b8ba738807c622cd2b82395ee687ba60c85ccabc39feef0052d'),
    'Linux': ('linux', 'db08f2f95400125f8ae0cc62e87c3c350fa46a3eadb3174dd3161606ee49c84c'),
}
system=platform.system()
if system not in ARCHIVES:
    raise SystemExit('Use macOS Apple Silicon or Linux x86_64 for this pinned builder.')
host, digest=ARCHIVES[system]
if (system=='Darwin' and platform.machine()!='arm64') or (system=='Linux' and platform.machine() not in ('x86_64','AMD64')):
    raise SystemExit('The pinned archive supports macOS arm64 / Linux x86_64; use the Linux CI job on other hosts.')
cache=Path(os.environ.get('SNES_SDK_CACHE',Path(tempfile.gettempdir())/'zb-pvsneslib-4.6.0'))
cache.mkdir(parents=True,exist_ok=True)
def checked_archive(host, digest):
    archive=cache/f'pvsneslib_460_64b_{host}_release.zip'
    if not archive.exists():
        url=f'https://github.com/alekmaul/pvsneslib/releases/download/{VERSION}/{archive.name}'
        print('Downloading pinned PVSnesLib 4.6.0:',url,flush=True)
        partial=archive.with_suffix('.download')
        with urllib.request.urlopen(url,timeout=90) as response, partial.open('wb') as output:shutil.copyfileobj(response,output)
        partial.replace(archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=digest:raise SystemExit(f'Compiler archive checksum mismatch: {archive}')
    return archive
archive=checked_archive(host,digest)
sdk=cache/'pvsneslib'
if not sdk.exists():
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            dest=(cache/entry.filename).resolve()
            if not dest.is_relative_to(cache.resolve()):raise SystemExit('Unsafe SDK archive entry')
            z.extract(entry,cache)
            if not entry.is_dir():dest.chmod((entry.external_attr>>16)&0o777 or 0o644)
# The upstream host releases contain different precompiled libc.obj files.
# SNES object code is host-independent: use the tested Darwin release's target
# libraries on both hosts, retaining each host's native compiler executables.
# Never silently accept a different cartridge just because it has a valid header.
if system=='Linux':
    with zipfile.ZipFile(checked_archive(*ARCHIVES['Darwin'])) as z:
        for name in ('crt0_snes.obj','libc.obj','libm.obj','libtcc.obj'):
            entry=f'pvsneslib/pvsneslib/lib/LoROM_SlowROM/{name}'
            (cache/entry).write_bytes(z.read(entry))
make='/Library/Developer/CommandLineTools/usr/bin/make' if system=='Darwin' else shutil.which('make')
if not make:raise SystemExit('GNU make is required')
env={**os.environ,'PVSNESLIB_HOME':str(sdk)}
subprocess.run(['python3',str(ROOT/'demakes/snes/generate_assets.py')],check=True)
subprocess.run([make,'-C',str(ROOT/'demakes/snes'),'cleanBuildRes','cleanRom'],env=env,check=True)
subprocess.run([make,'-C',str(ROOT/'demakes/snes')],env=env,check=True)
rom=ROOT/'demakes/snes/zombie-bagarre.sfc'
public=ROOT/'public/retro';public.mkdir(parents=True,exist_ok=True)
shutil.copy2(rom,public/rom.name)
manifest={'title':'Zombie Bagarre: Night Shift','edition':'snes','version':'0.1.0','format':'LoROM .sfc','bytes':rom.stat().st_size,'sha256':hashlib.sha256(rom.read_bytes()).hexdigest(),'toolchain':f'PVSnesLib {VERSION}','source':'demakes/snes','originalAssets':True,'hardwareTested':False}
(public/'zombie-bagarre.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Built',public/rom.name,manifest['sha256'])
