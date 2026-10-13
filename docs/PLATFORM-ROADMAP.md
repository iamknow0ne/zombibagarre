# Zombie Bagarre · Platform roadmap

Research and repository audit: **13 October 2026**. Baseline: **4.39.1 / `2fc25b6`**. This is a proposed implementation roadmap; none of the proposed ports or performance targets below is claimed as shipped or hardware-validated. Three parallel reviews covered modern platforms, retro editions and the release pipeline.

## Recommended direction

Keep the browser game playable while establishing installable Mac and mobile test editions. In parallel, prove one small native-engine scene on Mac, iPhone and Apple TV before committing to a full engine migration. Build one retro experiment after the modern release foundation works. Treat the demakes as distinct games with the same identity, rather than requiring nine platforms to ship identical features together.

An Electron Mac app can use the GPU today, but it still runs the existing JavaScript/WebGL renderer. Packaging alone does not deliver Metal-specific rendering, faster simulation or better art. Apple TV makes the architectural decision unavoidable: Apple does not support web views on tvOS, so the iPhone web-wrapper route cannot simply be exported to television. [Apple web-view support](https://developer.apple.com/design/human-interface-guidelines/web-views?changes=_1)

**Provisional long-term choice: Unity 6 LTS with URP**, subject to a measured vertical slice and licensing review. It supplies a supported native route across the requested modern platforms; URP supports Metal on Mac, iOS and tvOS. HDRP would fragment that mobile/TV route. Godot is a credible open-source alternative for desktop and mobile, but its documented platform list does not provide an equivalent official tvOS export route. A community port would need its own maintenance and device proof. [Unity Metal compatibility](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/cross-platform-features/graphics-apis/metal/requirements-and-compatibility), [Godot platform features](https://docs.godotengine.org/en/stable/about/list_of_features.html)

This is a migration proposal, not a recommendation to discard the current work. Keep its gameplay, tuning, lore, content definitions and visual references. Budget explicitly for porting the simulation, procedural geometry, shaders, menus and animation systems.

## What exists today

| Area | Audited state | Next gap |
| --- | --- | --- |
| Browser | Vite/Three.js, WebGL, custom shaders and post-processing; main game and Rooftop Training | Repeatable device benchmarks and release channels |
| Steam Deck | Offline Linux x64 Electron package, installer, checksum, controller menus and suspend handling | Real LCD validation; published download is **4.37.0**, behind source 4.39.1 |
| Mac | `desktop:mac` produces an unsigned local app for the host architecture | Architecture matrix, signing, notarization, installer and Mac-specific UI |
| Android / Apple mobile / TV | No native platform projects in the current repository | Platform adapters, packaging and hardware tests |
| Saves | Local browser storage; desktop has a separate origin/profile | Explicit migration, backup and import/export; no cloud sync or mid-run resume |
| Haptics | Gamepad feedback plus experimental browser WebHID DualSense support; desktop denies direct HID | Native capability adapters and device verification |
| CI | Web tests/build on PRs and automatic Pages publishing on main; separate desktop build and artifact promotion | Broader desktop change detection, mobile/Mac matrix and physical-device release gates |

Evidence: [package scripts](../package.json), [desktop implementation](../desktop/), [workflows](../.github/workflows/), [Deck scope and installation](STEAM-DECK.md). The [published 4.37.0 prerelease](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.37.0) was confirmed through GitHub during this audit. CI's software-rendered desktop boot is packaging evidence, not a Deck performance result.

## Modern platform releases

| Platform | First useful delivery | Long-term direction / release gate |
| --- | --- | --- |
| Steam Deck LCD | Refresh the current offline Linux package | Sustained combat test in Gaming Mode, Steam Input, sleep/resume and save upgrade; retain the existing non-Steam shortcut installation |
| macOS | Apple Silicon Electron `.app`, signed/notarized DMG and ZIP; add Intel only with a tested build | Native Metal engine if the slice meets the quality/performance gate; keyboard, mouse, DualSense and fullscreen support |
| Android | Capacitor with bundled local game assets; signed APK for testing, AAB for Play | Real-device thermal, touch, lifecycle and storage tests; migrate to the native engine if selected |
| iPhone / iPad | Capacitor/WKWebView universal app through TestFlight | Safe areas, tablet layouts, audio interruptions, memory pressure, save durability and controller plugins; native-engine route if selected |
| Apple TV | Native-engine prototype, then TestFlight | Controller-first combat, remote-friendly entry/menu flow, large readable TV UI; minimum Apple TV hardware established by profiling |

Capacitor preserves the current web game and allows native plugins on Android/iOS. Pin stable versions rather than following a `next` documentation channel; the researched stable line is Capacitor 8. This is a useful delivery experiment, not proof that the full game meets mobile budgets. [Capacitor environment](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS](https://capacitorjs.com/docs/ios), [Android](https://capacitorjs.com/docs/android)

Use Apple's Game Controller/Core Haptics interfaces where supported instead of assuming WebHID exists in a wrapper. DualSense adaptive-trigger APIs offer weapon, resistance and vibration effects; query capabilities, provide fallbacks and test USB/Bluetooth on the intended host. Do not promise these on every device. [Apple adaptive triggers](https://developer.apple.com/documentation/gamecontroller/gcdualsenseadaptivetrigger?changes=_4)

Mac direct distribution requires signing and notarization for a polished installation experience. Apple mobile/TV betas should use TestFlight; arbitrary unsigned app downloads are not the general installation route. Store submissions also need age ratings, privacy information, screenshots and review-ready controls. A substantial bundled game can be reviewed as an app; wrapping it does not guarantee acceptance. [Electron signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [App Review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Android app bundles](https://developer.android.com/guide/app-bundle/faq?hl=en)

## Rendering and performance decision

Build the same benchmark district in the existing renderer and the candidate native engine: a dense street, two weapon effects, a boss, a collapsing building and rain/fire interaction. Use matching camera paths, encounter counts and visual targets. Record CPU/GPU frame time, median/p95/p99 frame time, memory, loading time and sustained thermal behavior. Compare equivalent quality settings rather than an empty native scene against the complete browser game.

Proposed targets are 60 FPS quality mode where hardware supports it, with a stable 30 FPS battery/low-power mode. These are goals, not current measurements. Test at least a Deck LCD, an Apple Silicon Mac, a mid-range Android, an older supported iPhone/iPad and the chosen minimum Apple TV. Mobile testing should include 20–30 minutes of demanding play. [Android game power guidance](https://developer.android.com/games/optimize/power?hl=en)

Prioritize draw-call batching, spatial culling, instancing, bounded effects, texture compression, animation LOD, shader warm-up and dynamic resolution according to the measured bottleneck. More native access does not fix expensive game logic automatically. Preserve silhouettes, lighting composition and readable effects before increasing particle counts.

Three.js WebGPU is a possible alternative renderer experiment, but the current custom materials, `onBeforeCompile` changes and `EffectComposer` effects need migration to the new material/post-processing system. The guide also cautions that WebGL can still outperform WebGPU in some cases. Do not simultaneously fund a full WebGPU conversion and a full Unity conversion: use small comparisons to choose the main investment. [Three.js migration guide](https://threejs.org/manual/pages/webgpurenderer)

Custom C++/SDL3/Metal is another technically viable route, but would require us to build much more engine/editor tooling. SDL provides platform and GPU access rather than a complete production game engine. It is a fallback for a specific measured need, not the default modern rewrite. [SDL GPU](https://wiki.libsdl.org/SDL3/CategoryGPU), [SDL iOS/tvOS](https://wiki.libsdl.org/SDL3/README-ios)

## Shared code, data and assets

Introduce a small platform interface around the existing game before adding wrappers:

- **Lifecycle:** background/resume, focus loss, audio interruptions and memory pressure; clear held controls and stop haptics when suspended.
- **Storage:** schema-versioned saves, atomic native writes, backups, migrations and explicit import/export. Cloud sync comes later, with conflict handling.
- **Input and feedback:** action bindings independent of DOM events; touch, gamepad and native capabilities; per-hand weapon feedback with graceful fallbacks.
- **Display:** fullscreen, safe areas, orientation, render scale, frame cap and thermal quality changes.
- **System:** version/build/content identity, diagnostics, external links and update channel.

Export stable weapon/enemy/quest IDs, damage types, progression tables and lore from game logic into validated content files. Keep renderer and platform objects out of those files. A future engine can consume the same definitions while maintaining its own implementation. Use deterministic scenario fixtures to compare gameplay; do not assume bit-identical physics across engines.

Preserve master artwork and record provenance/licenses. Export native meshes/materials and target-specific textures offline. Existing geometry created procedurally in JavaScript must be exported or reimplemented; it is not automatically a collection of reusable model files. Retro outputs need deliberately authored silhouettes, palettes, tiles, animation sets and audio mixes, with automated size reports and manual art review.

## Release pipeline

**Build continuously; publish deliberately.** Publishing every gameplay commit to every store would multiply signing, review and regression work without helping players.

| Trigger | Automated work | Public delivery |
| --- | --- | --- |
| Every PR | Core tests, production web build, content/license checks, save migration tests, rendering/input smoke and affected platform builds | Preview only |
| Main changes | Web deployment and immutable artifacts identified by commit | Browser latest; clearly labelled separately from stable native builds |
| Nightly, only if changed, or manual candidate | Full active-platform matrix, packaged boot tests, signing in protected candidate jobs, short artifact retention | Internal/beta channels only |
| Stable tag, typically weekly/fortnightly when ready | Device checklist, checksum/provenance and promotion of the tested signed artifacts without rebuilding or re-signing | GitHub downloads and staged store release from tested beta builds |
| Critical hotfix | Focused regression plus affected-device checks | Expedited patch using the same gates |

Extend the existing exact-commit desktop artifact promotion rather than rebuilding at publication time. For store deliveries, upload the tested signed package and promote that tested store build where the platform permits. Apple signing needs macOS runners; Android and desktop Linux can use Linux builders. Cache by lockfile/toolchain version; pin SDKs and container digests. Document-only changes should not trigger the entire native matrix.

Maintain one modern semantic version, a monotonic platform build number, content revision, save-schema version and source commit. Show a platform download table so browser 4.39.1 is never confused with desktop 4.37.0. Keep beta/stable channels distinct. Retro editions get independent versions and compatibility manifests.

Every modern release candidate must boot both the main game and Rooftop Training from the packaged/offline build without missing assets or shader errors. Include corrupt-save and full-storage recovery, and verify that suspension/disconnection clears held inputs and stops haptics before resuming. A passing browser build alone does not satisfy these package gates.

Use protected release environments, ephemeral signing keychains and least-privilege store credentials; never expose signing secrets to fork PRs. Keep previous installers and save backups. Rehearse upgrade and rollback, because rolling back a binary may otherwise strand a newer save. [GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)

## Retro editions: one identity, different games

The shared identity should be **dual-weapon combinations, chain reactions and spectacular phased bosses**. Preserve Saint-Roch and Blackout lore, recognizable survivors and enemy silhouettes. Adapt level scale, destruction and UI to each machine. These are original homebrew games, not conversions of the Three.js runtime.

| Target | Toolchain / deliverable | Proposed art and gameplay direction |
| --- | --- | --- |
| **GBA** | [Butano](https://github.com/GValiente/butano), C++; `.gba` | **Pocket Bagarre:** crisp overhead districts, short missions, auto aim/hold-to-strafe, compact progression and multi-part sprite bosses. Recommended first cartridge proof of concept. |
| **PS1** | [PSn00bSDK](https://github.com/Lameguy64/PSn00bSDK), C/C++; BIN/CUE disc image | **Saint-Roch '98:** fixed high-angle cameras, low-poly streets, fog, baked lighting, expressive sprite debris and staged building destruction. Strongest flagship demake aesthetic. |
| **PSP** | [PSPDEV/PSPSDK](https://github.com/pspdev/pspsdk); `EBOOT.PBP` | Sector-based low-poly city, vehicles and bosses. Single-stick controls need aim assistance/lock-on. Target the original memory budget first. |
| **PS Vita** | [VitaSDK](https://vitasdk.org/vitasdk-web/downloads.html), optional [vitaGL](https://github.com/Rinnegatamante/vitaGL); `.vpk` | Dual-stick portable edition, richer materials and larger encounters. Share compact C/C++ gameplay with PSP where useful; use separate graphics/input backends. |
| **Genesis** | [SGDK](https://github.com/Stephane-D/SGDK), C/assembly; `.bin` | **Bagarre Arcade:** bold silhouettes, explosive scrolling neighborhoods, restrained palettes and an original FM soundtrack. |
| **SNES** | [PVSnesLib](https://github.com/alekmaul/pvsneslib), C/assembly; `.sfc` | **Saint-Roch Chronicles:** layered pixel backgrounds, weather palettes, compact RPG hubs, readable telegraphs and expressive boss sprites. |

These names are working concepts. Do not promise identical maps or save compatibility. Replace arbitrary building fracture with authored damage states, dense physics debris with capped sprite pools, and large streamed cities with small connected sectors or authored procedural chunks. FPS/TPS, full dynamic lighting and the entire modern inventory are outside the first retro slice.

The first slice should be one complete ten-minute district: one hero, three weapons, three enemies, one shop, a two-phase boss, save/reload and damage-state scenery. Validate on an emulator and real hardware before expanding. GBA is the recommended low-scope experiment; PS1 is the next choice if the visual identity is the priority. Avoid starting six unfinished ports at once.

PSP/Vita can share a compact native simulation, but a C++ runtime designed around Vita should not become a dependency for SNES. Share content exports, design rules and scenario tests across all editions; allow machine-specific implementations. Budget sprite/scanline use, palettes, VRAM, ROM, audio and actor pools automatically.

PS1 is a disc image, PSP a PBP and Vita a VPK; only the cartridge targets produce conventional cartridge ROMs. Real-console play requires an appropriate homebrew-capable setup. Distribute our own assets/code and license notices, with platform prerequisites documented separately; do not bundle commercial game data, BIOS files or proprietary SDK components. vitaGL's documented device-side shader prerequisites require particular attention.

## Recent developments worth using

Research distinguishes genuinely recent releases from older tools and prototype claims.

| Date | Verified development | Meaning for this project |
| --- | --- | --- |
| **24 Sep 2026** | PPSSPP maintainer reports AI-assisted, hardware-validated VFPU reconstruction reducing megabytes of correction data to roughly 10 KB of coefficients. [Technical post](https://www.ppsspp.org/news/vfpu-math-re/) | Better emulator/reference work; no extra computing power on an original PSP. |
| **2 Oct 2026** | PPSSPP GPU investigation reports 170+ hardware experiments and 125/132 captured frames matching exactly. [Technical post](https://www.ppsspp.org/news/ge-bit-exact/) | Strong model for automated experiments against real hardware. These are the author's reported results, not our benchmark. |
| **1 Oct 2026** | PSPDEV `v20261001` includes SDK/build fixes, font support and updated packages. [Release](https://github.com/pspdev/pspdev/releases/tag/v20261001) | Useful, reproducible toolchain improvements for a new PSP game. |
| **1 / 3 Oct 2026** | MediEvilRecomp first and second betas; second adds rendering/interpolation improvements. [Release history](https://github.com/BlackLabelHQ/MediEvilRecomp/releases) | Impressive PS1-to-modern work, but the direction is the reverse of making our game run on PS1. |
| **24 Sep 2026** | Butano 21.9.0 published; its documentation labels 21.10.0 as next, not shipped. [Release](https://github.com/GValiente/butano/releases/tag/21.9.0), [changelog](https://gvaliente.github.io/butano/changelog.html) | An actively maintained foundation for the GBA experiment. |
| **WWDC26 / current toolkit** | Apple Game Porting Toolkit 4, agent-oriented examples and Metal capture/debug tooling. [Toolkit](https://developer.apple.com/games/game-porting-toolkit/), [session](https://developer.apple.com/videos/play/wwdc2026/357/), [samples](https://github.com/apple/game-porting-toolkit) | Valuable native-port/debugging resources. June news, not a discovery from the last few weeks; does not convert our JavaScript engine into Metal. |

Static recompilation translates an existing console program for another host; emulation runs that program through a compatibility implementation. We already own source and want new console binaries, so our route is source adaptation plus native homebrew development. [N64Recomp explains its direction](https://github.com/N64Recomp/N64Recomp). New research repositories also need status checks: for example, [psprecomp](https://github.com/sp00nznet/psprecomp#status) currently documents incomplete graphics, rather than a production porting shortcut.

## Delivery milestones and acceptance gates

| Order | Deliverable | Gate before expanding |
| --- | --- | --- |
| **1 · Foundation** | Platform interface, content IDs, save export/migrations, benchmark scenarios, version manifest and CI matrix | Existing browser game passes regression; repeatable performance baseline and save round-trip |
| **2 · Desktop** | Current Deck candidate and signed Apple Silicon Mac download | Fresh install/update/offline/controller/suspend/save tests on actual Deck and Mac |
| **3 · Feasibility** | Android APK and native-engine district on Mac/iPhone/Apple TV | Mobile thermal/input viability; native art parity, frame-time and maintenance comparison. Choose the main renderer before expanding ports. |
| **4 · Mobile beta** | Android internal track and iPhone/iPad TestFlight, using the selected route | Touch/controller menus, interruptions, long sessions, older-device quality preset and save upgrade |
| **5 · TV and stable releases** | Complete native tvOS edition; native migration of other targets if approved by the slice results | Controller-only full expedition, TV legibility, storage recovery and release/rollback rehearsal |
| **6 · First demake** | GBA ten-minute slice; optional PS1 visual prototype after the gate | Hardware frame pacing, readable combat, sound, saves and a complete boss encounter |
| **7 · Retro expansion** | PS1 flagship, then PSP/Vita; Genesis/SNES after proven scope | Each edition has its own art/performance budget, device QA and independent release cadence |

Small, focused prototypes should be timeboxed in weeks. A polished native-engine migration or a full demake is a multi-month development effort per engine family; these are planning ranges, not delivery commitments. Re-estimate after the first slice. Platform account access, signing identities, selected minimum devices and available test hardware are implementation prerequisites to resolve when those milestones begin.

The current Mac also reports an unaccepted Xcode license when invoking affected developer tools. The machine owner must complete that setup before local Apple-platform builds; no license agreement was accepted during this planning pass.

The first implementation batch should deliver **platform/save foundations, a refreshed Deck candidate, a distributable Mac beta and an Android test APK**, with the Apple TV/native-engine experiment started early enough to prevent investment in a dead-end mobile architecture. The roadmap intentionally leaves full retro production behind a working modern release process.
