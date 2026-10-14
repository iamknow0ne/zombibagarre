# Zombie Bagarre for macOS

The macOS test edition is an offline app for Apple Silicon Macs running macOS 13 or newer. It packages the complete game with Electron and renders through Chromium's hardware-accelerated WebGL pipeline. It needs no browser tab, local web server or online account. This is the same game in a desktop app, not a separate Metal engine rewrite.

## Try the local build

Open **Zombie Bagarre.app** inside `release/4.48.0/Zombie Bagarre-darwin-arm64`. You can copy the app to your Applications folder; the game and its assets travel together. The matching `Zombie-Bagarre-4.48.0-macOS-arm64.zip` includes the app and this guide.

This test app uses an **ad-hoc code signature**, which verifies its contents but does not establish an Apple-verified developer identity. It is **not notarized** and uses a local development signing profile without the distribution hardened runtime. A downloaded copy may be blocked by Gatekeeper; public distribution with a normal first-open experience remains pending Developer ID signing and Apple notarization. Do not disable Gatekeeper or remove quarantine attributes. The locally built app is the intended test route for now.

## Controls and graphics

Use keyboard and mouse or a connected controller. **Settings → Controls** shows and changes bindings. The macOS app menu supports **Command-Q** to quit, **Command-H** to hide and **Control-Command-F** to toggle fullscreen. Hide, focus loss and system sleep pause combat. The regular game pause menu also offers windowed/fullscreen mode and Quit.

**Settings → macOS / Offline edition** displays the graphics acceleration status, frame cap and render scale. Begin at native scale, then raise graphics detail if the measured frame rate stays comfortable. Retina supersampling and dense effects cost GPU time. Hardware acceleration is enabled without changing macOS power settings, overriding driver checks or disabling the renderer sandbox. Performance depends on the Mac and the battle; no universal frame-rate claim is made.

## Character saves and backups

The app keeps its own save under `~/Library/Application Support/zombie-bagarre/`, separate from Safari, Chrome and the website. Updating or moving the app preserves that folder.

Use **Settings → Your save → Export backup** in the website to transfer a character. At the app's title screen choose **Choose backup**, review the character summary, then **Restore & reload**. Exports use the normal macOS Save dialog. An expedition cannot be restored mid-combat; the file preserves permanent progression, equipment and settings, not the active expedition. Restore keeps a recovery copy of the previous local save.

## Build and verify

On a Mac with Node.js 22 and the repository dependencies installed:

```sh
npm ci
npm run desktop:mac
node scripts/smoke-desktop.mjs --mac
```

To preserve an older running build, pass `--output-dir=release/4.48.0` to both build and smoke scripts. The app, archive, checksum and smoke log then share that versioned directory.

The build uses the host's native architecture, creates the app icon, signs the complete bundle ad hoc, verifies nested signatures and creates a ZIP with a SHA-256 checksum. The smoke test launches that exact packaged app with temporary save storage, loads the offline world and shaders, checks the desktop bridge and quits. Its log appears in `release/darwin-arm64-smoke.log` on Apple Silicon. No live character data is touched.

An Intel build can be produced on macOS with `npm run desktop:mac -- --arch=x64`; it requires its own Intel runtime test before being described as supported. The GitHub **Build macOS test edition** workflow runs on demand and for relevant pull requests. It checks the unit suite, app signatures and archive checksum, then probes for a Metal device. When one is available, it also boots the app through its normal graphics backend. Without a Metal device, CI explicitly reports **packaging checked; runtime not tested**. The CI artifact alone is not approved for release: promotion requires a separate hardware smoke and gameplay check, recorded with the exact download checksum. Native packages are built at release checkpoints rather than on every gameplay commit.

The packaged macOS SwiftShader backend fails Vulkan initialization both locally and on the tested hosted runner, so it is not used as a fallback or presented as a successful graphics test. CI does not disable driver checks or the renderer sandbox. GitHub documents GPU acceleration on its [larger macOS runners](https://docs.github.com/en/actions/reference/runners/larger-runners); this project does not provision those paid runners automatically.

## If startup fails

The app records startup details at `~/Library/Application Support/zombie-bagarre/diagnostics/startup.log`. Include that file and your Mac model/macOS version in a report. Startup errors close the failed process and show the log location instead of leaving an invisible app running.

The public release prerequisite follows [Electron's code-signing guidance](https://www.electronjs.org/docs/latest/tutorial/code-signing) and [Apple's notarization requirements](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).
