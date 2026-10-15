# Android test edition

The Android edition bundles the production game, artwork and SNES room in an
APK. It runs through the phone's installed Android System WebView with hardware
WebGL, rather than opening a browser tab or downloading the game at launch.
It is not a separate Vulkan engine rewrite.

## Build and install

Requirements: Node.js 22+, Python 3, JDK 17, Android SDK platform 34/build tools
34, and the SDK licenses already accepted by the developer. Set `JAVA_HOME` and
`ANDROID_HOME` for your toolchain. Gradle 8.9 and Android Gradle Plugin 8.5.2 are
pinned. The wrapper verifies the distribution checksum.

```sh
npm ci
npm run android:build
adb devices
adb -s YOUR_DEVICE_SERIAL install -r release/4.51.0/Zombie-Bagarre-4.51.0-Android-test.apk
adb -s YOUR_DEVICE_SERIAL shell am start -n games.zombibagarre.quarantine/.MainActivity
```

The build always creates fresh web output, synchronizes bundled assets, builds a
debug-signed APK, verifies every packaged asset against that web output, and emits
a versioned APK and SHA-256 file. The GitHub **Build Android test APK** workflow
provides build artifacts; it does not claim physical-device testing.

This initial sideload edition targets Android API 34, supports Android 8+ with
OpenGL ES 3 and a sufficiently current WebView, and is **not a Play Store release**.
Only the devices recorded in the QA report have actual runtime evidence. Keep the
same signing key for updates: `adb install -r` preserves the app's data when the
signature matches. A separately built CI APK has a different debug key and is not
an update to a locally signed install. Do not uninstall to work around that error
without exporting the character first. A production keystore and store submission
are separate release work.

## Phone behavior

- Landscape in either orientation, immersive fullscreen, screen kept awake while open.
- Existing touch movement/aim sticks and compact action buttons; controller input
  remains the game's normal browser gamepad path, not hardware-certified here.
- Android Back closes the current dismissible menu or pauses gameplay. Mandatory
  upgrade/result screens retain their existing rules. Back at the title offers
  an exit confirmation. Rooftop training has its own pause/return path.
- Backgrounding pauses and saves character progress, clears held input, suspends
  audio/timers and closes any active cartridge session. Returning stays paused.
- The app has no Internet permission. Assets use a local HTTPS origin through
  AndroidX WebViewAssetLoader, with external navigation and requests blocked.
- No file-system access is exposed to JavaScript. Backup export is a bounded,
  origin-restricted message from the bundled main page to Android's document
  picker; import uses the system file chooser. The player selects the file.

Character saves are separate from mobile Chrome and desktop saves. Use **Settings
→ Your save** to export/import a character. Existing saves are retained on APK
updates. Current expeditions still reset after the game process closes; this
edition does not introduce expedition suspend/resume.

## QA and diagnostics

This debug test APK logs `ANDROID_QA_GPU` and `ANDROID_QA_FRAME` samples for device
validation. They describe actual rendered game frames, not a promised FPS target.
No save contents or account information are included. WebView debugging is enabled
only in debug builds. Production browser builds omit these samples.

```sh
adb -s YOUR_DEVICE_SERIAL logcat -d -s ZombieBagarre
python3 scripts/verify-android-apk.py android/app/build/outputs/apk/debug/app-debug.apk
```

Check launch, assets, actual combat, movement/aim/action buttons, Back menus,
background/resume, save export/import, restart and graphics under load. Record the
installed WebView, GPU, scene, settings and sample duration. Phone thermals and
manual multi-finger ergonomics need longer hands-on testing than a launch check.

Packaging preserves original `.gz` source archives under an internal `.asset`
suffix to prevent Android's asset packager from inflating/renaming them. The local
loader maps their original URLs back to these bytes. The source/license files
shipped with the SNES emulator are retained and verified.

Architecture follows Android's [local WebView content guidance](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)
and [lifecycle API](https://developer.android.com/reference/android/webkit/WebView#onPause()).
