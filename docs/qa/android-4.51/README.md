# Android test edition — 15 October 2026

## Device and artifact

- Connected physical device: OnePlus 7 Pro, model GM1913, Android 11.
- Installed Android System WebView: 150.0.7871.46.
- Display reports 1440×3120, density 600.
- APK: `Zombie-Bagarre-4.51.0-Android-test.apk`.
- SHA-256: `ec2ef1a1c8e2f07aab9cf0908bfa82ebd3e040e56fc7b9004fa184436d3841d7`.
- Package: `games.zombibagarre.quarantine`, debug signed, API 26 minimum / target 34.

## Confirmed

- Fresh production build and Android assembly passed.
- All 48 bundled production files verified byte-for-byte (59,184,316 uncompressed
  bytes), including detailed character assets, training, cartridge, emulator and
  retained source archives. The source archives retain their original bytes via
  the documented `.gz.asset` packaging mapping.
- APK signature verified (v2). The package declares no Android permissions,
  including no Internet permission.
- Install and subsequent data-preserving update both returned `Success` on the
  physical phone. Initial activity start returned `Status: ok`, cold activity
  launch 1,596 ms. This measures activity startup, **not** game loading time.
- All 630 gameplay regressions passed, including 8 new Android lifecycle/Back
  checks. Android lint passed with no errors. Landscape-only orientation is an
  intentional test-edition constraint; larger foldable/tablet layouts remain untested.

## Pending physical-device QA

The phone was locked: keyguard was showing and the captured display was black.
The user has been asked to unlock it. No game-rendering, touch, FPS, audio,
backup-picker, background/resume or endurance result is claimed yet.

Pending checks after unlock: visible title and complete character load; gameplay
movement/aim/dodge/throw/reload; compact landscape HUD; native Back and fullscreen;
Home/resume with audio stopped and game remaining paused; backup export/import;
training return; restart and short combat performance samples. A physical
controller and human multi-finger ergonomics remain separate evidence gates.
