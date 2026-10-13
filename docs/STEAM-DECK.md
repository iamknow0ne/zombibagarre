# Zombie Bagarre · Steam Deck edition

An offline Linux x86_64 edition for Steam Deck LCD and OLED, packaged with Electron. The same Three.js game renders through Chromium's GPU-accelerated WebGL, with no browser tabs, local server, account or Proton installation required.

## Install on your Deck

1. Download **Zombie-Bagarre-4.37.0-SteamDeck-x86_64.tar.gz** from the [v4.37.0 release](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.37.0).
2. On the Deck, choose **Steam → Power → Switch to Desktop**.
3. Open the downloaded archive in Ark and **extract the entire folder**. Open the extracted `zombie-bagarre-linux-x64` folder.
4. Run **Install Zombie Bagarre.sh**. If Dolphin offers a choice, select **Execute** / **Run in Konsole**. You can also open Konsole in that folder and enter:

   ```sh
   bash "Install Zombie Bagarre.sh"
   ```

5. In Steam, choose **Games → Add a Non-Steam Game to My Library**, tick **Zombie Bagarre**, then **Add Selected Programs**. If it is not listed, use **Browse** and select `/home/deck/Games/Zombie Bagarre/launch.sh`.
6. Open the shortcut's **Controller settings** and choose **Gamepad With Joystick Trackpad**. Leave **Force the use of a specific Steam Play compatibility tool** unchecked: this is a Linux application.
7. Return to **Gaming Mode → Library → Non-Steam → Zombie Bagarre**.

The installer writes only to your home directory. It creates an application-menu entry and icon, preserves character saves, and retains the previous installation as a timestamped backup when updating. It does not modify Steam's library database. Steam's Add a Non-Steam Game step is the one-time library registration.

**Portable alternative:** run `launch.sh` from the extracted folder and add that file to Steam. Keep the whole folder together and do not move it after adding the shortcut.

## LCD graphics & controls

First launch uses **Deck · Balanced**, native render scale and a **60 FPS cap**. This is a starting configuration for the LCD's 1280 × 800 display, not a measured 60 FPS guarantee.

| Preset | Rendering | Frame cap |
| --- | --- | --- |
| Deck · Balanced | Native resolution, balanced shadows, standard dressing and lights | 60 |
| Deck · Rich detail | Native resolution, full lighting/AO, lush foliage, rich street detail, more ambient survivors | 60 |
| Deck · Battery saver | 85% render scale, basic lighting, sparse dressing, subtle weather | 30 |

**Settings → Steam Deck / Desktop edition** also offers 75–150% render scale, 30/40/60/90 FPS or display refresh, a real rendered-frame counter, and GPU acceleration status. Supersampling costs performance; try Rich at 100% before raising it. A 40 FPS cap should be paired with 40 Hz in Steam's Performance menu on LCD for even pacing. No TDP, GPU clock or operating-system settings are changed by the game.

| Action | Default Deck controls |
| --- | --- |
| Move / aim | Left / right stick |
| Fire each hand | LT left / RT right |
| Dodge / Focus bullet time | A / B |
| Reload / interact or enter car | X / Y |
| Throw ordnance | LB |
| Cycle left / right weapon | D-pad Left / Right; hold for that hand's wheel |
| Auto fire / arsenal | Left stick click / D-pad Up |
| Map / pause | View / Menu |
| Menus | D-pad or left stick, A confirm, B back |

Bindings remain remappable. Easy driving is the default: point the stick to drive, release to stop, LT to reverse. Native fullscreen and Quit Game work from menus with a controller. Suspending or losing focus clears held controls and pauses combat; resuming does not advance world time.

**Steam Input:** the Deck must expose a gamepad, rather than only mouse/keyboard emulation. Gyro can be configured as mouse look for FPS/TPS, and back buttons can duplicate keyboard or gamepad actions in Steam's shortcut layout. The game does not read Deck gyro, trackpad force, back buttons or HD haptic waveforms directly through a native Steamworks API. Weapon rumble uses the Gamepad actuator when Steam/Chromium expose one; availability must be checked on the device. Deck triggers have no DualSense-style adaptive resistance. Direct WebHID DualSense extras remain a browser-only experimental feature; the offline edition does not grant HID access.

## Saves, updates & troubleshooting

- Permanent progress lives in `~/.config/zombie-bagarre/`. Do not remove this directory when updating. Web-browser saves and native saves are separate; there is no cloud sync or mid-expedition resume.
- To update, close the game, extract the new release, and run its installer. The Steam shortcut retains the same launch path.
- To uninstall, remove `~/Games/Zombie Bagarre`, its optional backup folders, `~/.local/share/applications/zombie-bagarre.desktop`, and `~/.local/share/icons/hicolor/256x256/apps/zombie-bagarre.png`. Remove the non-Steam shortcut in Steam. Keep the save directory if you want your character later.
- No controls: launch through Steam with a Gamepad template, press a button, then inspect the live controller diagram in Settings. The raw-layout calibration remains available.
- Low FPS: use Balanced or Battery saver, keep native/85% rendering, and enable the performance readout. Steam's own performance overlay can show device load and frame pacing.
- Black window or startup failure: launch `launch.sh --windowed` from Konsole and include the output in a bug report. The package retains Chromium's sandbox and driver checks. Do not add `--no-sandbox` or disable the SteamOS read-only filesystem.
- Verify a download: place the `.sha256` file beside the archive and run `sha256sum -c Zombie-Bagarre-4.37.0-SteamDeck-x86_64.tar.gz.sha256`.

## Build & verification

```sh
npm ci
npm test
npm run desktop:linux
```

Output: `release/Zombie-Bagarre-4.37.0-SteamDeck-x86_64.tar.gz` plus SHA-256 checksum. Packaging downloads the pinned official Linux Electron runtime; the resulting game is fully offline. Node 22.12+ is required. `npm run desktop:mac` creates a local unsigned macOS test build, and `npm run desktop:dev` launches the installed host Electron runtime after building the game.

The desktop workflow builds on Linux and boots the packaged application under Xvfb/software rendering, waiting for the actual world, shaders, UI and desktop bridge to initialize. Unit tests cover protocol isolation, settings preservation, graphics presets and frame scheduling. This verifies packaging and startup, **not Steam Deck hardware performance or Steam Input output**.

Before calling this Deck-validated, test on the LCD device: install and add the shortcut; launch offline in Gaming Mode; move/aim/fire both hands; hold both weapon wheels; navigate upgrades/map/character menus; drive; test rumble; suspend/resume; quit/relaunch and check character persistence; measure crowded combat and boss encounters with Balanced and Rich.

## Implementation & sources

The desktop UI reuses the game's field-equipment layout: charcoal/bone/amber palette, existing display/monospace typography, square controls, labelled settings rows and visible focus rings. No extra decorative motion. SteamOS receives the bundled Anton display-font fallback (SIL Open Font License, see `public/fonts/OFL.txt`), so headings do not fall back to a wide system sans serif. Browser and mobile builds keep their defaults and do not display native-only controls.

- [Valve: installing desktop applications as non-Steam games](https://help.steampowered.com/en/faqs/view/671a-4453-e8d2-323c)
- [Valve: Steam hardware compatibility guidance](https://partner.steamgames.com/doc/steamhardware/compat)
- [Electron distribution](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron custom protocols](https://www.electronjs.org/docs/latest/api/protocol)
- [Electron suspend/resume events](https://www.electronjs.org/docs/latest/api/power-monitor)

The app loads only its packaged assets using a private secure origin, with a sandboxed renderer, isolated preload, no renderer Node access, restricted IPC, blocked external navigation and a content security policy. Normal GPU acceleration is enabled; no unsupported Vulkan/HDR or hardware-access claims are made. This remains the existing 2.5D rendering engine, not a native engine rewrite.
