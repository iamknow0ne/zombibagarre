# Weapon feedback — 4.34

All thirteen weapons have individual motor balance, recoil duration and adaptive-trigger profiles:

| Weapon | Intended feel |
| --- | --- |
| AR-26 | Firm, separated automatic recoil |
| VX-9 | Short, fast pulses with space between rounds |
| M12 | Heavy broad kick |
| Judgement | Sharp cylinder snap |
| Longshot | Deep, precise recoil |
| Thumper | Slow, weighty thump |
| Cinder | Low sustained motor texture / 32 Hz trigger vibration |
| Volta | Strong high-frequency electrical snap / 60 Hz trigger vibration |
| Ronin | Light windup, sharp cutting contact |
| Gemini | Fast alternating motor balance |
| Hatchet | Weighty cleave |
| Pilgrim | Brief, precise thrust |
| Gravemaker | Long bass-heavy impact |

Melee distinguishes swing, miss, contact and third-strike finisher. Evolution adds a small, bounded intensity increase. Automatic recoil uses the real shoot event interval, including fire-rate upgrades and Overdrive. Native trigger vibration uses the rounded current shots-per-second frequency (capped at 60 Hz); it stops on release, inactivity, reload, empty magazine, weapon wheel, pause or loss of focus. The previous 45 ms ordinary-rumble throttle no longer drops rapid weapon shots. Simultaneous hand feedback combines motor strength instead of immediately replacing the other hand's kick.

Advanced effects still require an optional direct DualSense WebHID connection from Settings. Only physical L2/R2 support adaptive resistance: use the L2 + R2 preset for two adaptive firing triggers. A weapon bound to R3 retains weapon-specific body vibration. The exclusive melee stance responds to either configured attack trigger. Standard Gamepad vibration remains the fallback; actual capability depends on the browser, controller and connection.

Output packets use the existing USB/Bluetooth layout and CRC. Native vibration encoding was checked against [Nielk1's trigger-effect generator](https://gist.github.com/Nielk1/6d54cc2c00d2201ccb8c2720ad7538db): effect 0x26, zone/strength masks and frequency byte 9. Only the latest unsent HID state is kept, preventing delayed recoil after a slow output write; reset replaces pending effects.

Validation: automated coverage for all weapon identities, melee phases, real boosted shoot-event cadence, independent hand mapping, R3/L2 melee behaviour, release/reload/empty/menu/wheel clearing, stale events and slow-output reset. Existing USB/Bluetooth packet and CRC checks retained. Physical controller feel was not tested; this verifies the software output, not a hands-on DualSense sensation test. The complete suite passes 258 tests and the production build succeeds.
