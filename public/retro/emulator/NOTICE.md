# Bundled SNES emulator

EmulatorJS 4.2.3, commit e150dc0491ae747028919fb82d6598954976ede6.
Source: https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3
Runtime files: https://cdn.emulatorjs.org/4.2.3/data/
GPL-3.0 notice is retained in LICENSE-EmulatorJS.txt.

Local modification: emulator.min.js checks emulator/data/version.json instead
of the upstream online version endpoint. No gameplay or emulation changes.
The player does not offer netplay or accept arbitrary external cartridge URLs.

SNES9x core: bundled build 2.0.2, report timestamp 2025-06-14T17:58:11Z,
from EmulatorJS 4.2.3. Both regular and legacy WebGL variants are included.
Exact core notice is extracted from the archive as LICENSE-Snes9x.txt.
Core source repository: https://github.com/EmulatorJS/snes9x
Build system: https://github.com/EmulatorJS/build
Snes9x includes non-commercial restrictions. This free prototype bundle must
not be repackaged as a paid release without replacing/reviewing that component.
No commercial SNES ROMs, Nintendo artwork, firmware or BIOS are included.

The archive decoder uses JavaScript string evaluation. Only the local emulator
frame allows this and WebAssembly/blob scripts; the native game's main frame
retains its stricter script policy and native IPC rejects subframes.
Network access remains self-only in the packaged app and player frame.

Source archives are shipped in source/. EmulatorJS is the exact tagged revision.
The Snes9x fork and builder archives are their latest commits preceding the
published core build timestamp; the binary report does not encode commit IDs,
so these are source snapshots, not a claim of byte-for-byte core reproducibility.
The original binary core archives remain intact and include their own licenses.
