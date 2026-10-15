#!/usr/bin/env python3
"""Verify the actual APK contains every fresh production asset, byte for byte."""
import argparse, hashlib, json, pathlib, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('apk', type=pathlib.Path)
args = parser.parse_args()
with zipfile.ZipFile(args.apk) as archive:
    bad = archive.testzip()
    if bad: raise SystemExit(f'Corrupt APK member: {bad}')
    if 'AndroidManifest.xml' not in archive.namelist() or 'classes.dex' not in archive.namelist():
        raise SystemExit('APK is missing its manifest or compiled application.')
    count = total = 0
    for source in sorted((root / 'dist').rglob('*')):
        if not source.is_file(): continue
        relative = source.relative_to(root / 'dist').as_posix()
        if relative.startswith('art/') and relative.endswith('.png'): continue
        data = source.read_bytes()
        try: bundled = archive.read('assets/game/' + relative + ('.asset' if relative.endswith('.gz') else ''))
        except KeyError: raise SystemExit(f'Missing bundled game file: {relative}')
        if hashlib.sha256(data).digest() != hashlib.sha256(bundled).digest():
            raise SystemExit(f'Stale or changed bundled game file: {relative}')
        count += 1; total += len(data)
    for required in ['index.html', 'traversal.html', 'retro/play.html', 'retro/zombie-bagarre.sfc']:
        if 'assets/game/' + required not in archive.namelist(): raise SystemExit(f'Missing route: {required}')
print(json.dumps({'apk': str(args.apk), 'verifiedAssets': count, 'assetBytes': total,
    'sha256': hashlib.sha256(args.apk.read_bytes()).hexdigest()}, indent=2))
