# Living world / 4.31

## Player-facing rules

- An expedition starts at 16:30. One complete day takes ten minutes of active play. Night runs from 19:00 to 06:00. Pausing, upgrading and shopping stop the clock, weather and snow physics.
- Regional forecasts change every 95 active seconds after an initial 35-second clear period. Transitions blend over several seconds. Mountain expeditions favour snow and fog; jungles and marshes favour rain; badlands stay dry. Open City can experience all four conditions.
- Settings → Living World offers a moving clock or fixed day/night, dynamic or fixed clear/rain/snow/fog, and full/subtle/off precipitation. Fixed time and weather affect gameplay. Particle density and reduced motion do not change the rules.
- Rain takes time to soak exterior surfaces. It cools burning window bays, trees, props and enemies, emits steam at the correct height and shortens ground fires. Char and fuel already consumed remain. Intact roofs shelter what is beneath them; collapsed roofs stop providing shelter. Rain does not repair buildings or apply splash damage.
- Wet enemies take 25% extra arc-projector damage. Existing shock grenades retain their 50% wet-target bonus. The burning-target arc bonus remains 40%; bonuses do not stack.
- Snow builds up gradually. Running has bounded acceleration and a short coast; dodges still immediately follow the requested direction. Rain and daylight melt accumulated snow. Dry movement retains its immediate response. Vehicle handling is unchanged to preserve the assisted mobile controls.
- Night adds 25% reinforcements (15% on relaxed), bounded to 3–12 extra enemies, once per non-boss wave. Spawn cadence is 15% shorter after dark. Boss waves do not receive this extra wave budget. Dawn never removes enemies already spawned.
- Street lights brighten after dusk, the sky and sunlight change, fog limits distant visibility, wet roads become darker and glossier, and settled snow lightens roads and roofs. Fewer decorative pedestrians remain outside at night. Rain has a quiet sound bed that follows the volume and pause controls.

## Three night contracts

Unaccepted contracts appear on the appropriate board and in the journal only at night. Accepted contracts remain in the journal at dawn; unfinished objectives wait for night, while completed contracts can be claimed at any time. Each reward can be claimed once per expedition.

| Contract | Contact | Objective after acceptance | Reward |
| --- | --- | --- | --- |
| Until the lamps go out | Lenoir | Defeat 18 enemies at night | 200 crowns, 260 XP |
| Medicine after midnight | Mara | Visit Lenoir on foot after dark, then return to Mara | 160 crowns, 220 XP |
| Where the streetlights end | Nocturne | Visit three distinct city districts at night | 240 crowns, 300 XP |

The existing journal, street map and discreet guidance select the next destination, explain dawn waiting and direct the player back to the contact for payment. The total contract catalogue is now 20.

## Performance and implementation

Weather simulation uses its own seeded forecast and does not consume combat randomness. Precipitation physics runs four times per active second. Building shelter checks use a cached spatial grid. The weather renderer reuses position buffers: at most 900 drops at high quality, 420 balanced or 180 low, with a further density reduction for Subtle. Rain uses one line batch and at most 48 instanced ripples; snow uses one point batch. No per-drop scene objects or downloaded weather textures. Reduced motion and Off hide precipitation while retaining lighting and gameplay.

The renderer follows Three.js [BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry), [Points](https://threejs.org/docs/#api/en/objects/Points) and [ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial) APIs, using the project's installed Three.js release.

This is a game weather model: it has no fluid simulation, snow depth meshes or navigable building interiors. Rain addresses the exterior combustible bays already modelled by the destruction system. Snow changes character traction; vehicle steering stays familiar.

## Verification

- 70 targeted simulation, environment, vehicle and RPG tests passed before the final renderer-budget test was added. The focused weather suite also checks deterministic forecasts, clock pause/wrap, finite night budgets, roof shelter, facade-height steam, fuel preservation, snow melting, collision-safe sliding, directional dodges, quest visibility, acceptance, guidance and one-time payment.
- A wall-contact precision bug found by snow tests is fixed: floating-point contact on one axis no longer spuriously pushes the character along the other axis.
- The release build passes. The existing bundle-size advisory remains.
- Daylight was visually inspected in the real renderer. Local browser automation then repeatedly timed out, including session recovery; night/snow/rain visual approval and a fresh mobile settings check remain unverified. Do not interpret automated simulation tests as visual or physical-controller proof.
- `dev/weather-qa.html` exposes real simulation/renderer controls and readouts for fire, steam, snow, wetness, draw calls, pause and particles. Append `?scene=rain`, `snow`, `night` or `fog` for a staged five-second preview that freezes for inspection. `dev/rpg-qa.html` has time/weather controls alongside the existing contact/journal tests. Both are developer fixtures and do not write player progress.

## UI direction

The settings extend the existing field-equipment layout, bone/coal/amber palette and native selects. The existing wave header gets one compact time/weather line; pause includes the same conditions. No extra mobile action buttons, cards or decorative motion. Automated behaviour checks are complete; the visual design gate for new weather scenes remains open until browser rendering can be inspected reliably.
