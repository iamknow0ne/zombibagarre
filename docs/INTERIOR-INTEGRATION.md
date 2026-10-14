# First enterable interiors — implementation plan

**Status: unimplemented proposal.** Prepared against the 4.43 working tree on 14 October 2026. This document adds no playable interiors, save format changes, artwork, or runtime behavior. Every implementation item and acceptance test below remains open.

The next slice is one useful workshop and one apartment, connected by a short recovery contract. Keep the existing permanent hero / fresh expedition model. Freeze the exterior while indoors, preserve its exact simulation, and return through a validated safe exit. This is a bounded interior feature, not a second city generator.

## Player experience to implement

1. Approach Mara's existing workshop frontage. The contextual interaction changes to **Enter workshop**, with the current device's interaction glyph. Enter only on foot and on the ground; no entry during a grapple, dodge, or unresolved attack.
2. Walk inside a small authored workshop: doorway, workbench, armour display, Mara, and a clearly marked exit. Talking to Mara opens the existing Trade / Journal / Inventory interface. Closing it returns to the room.
3. Accept **Tools of the trade** (`workshop-tools`). Mara asks for a precision-tool case from a nearby apartment. The quest guide points to its exterior door, then to the case while inside. The apartment has one short L-shaped route, a readable locker, and a small piece of environmental storytelling; no combat or platforming in this slice.
4. Collect the case once, return to Mara, and claim once per expedition. Proposed initial reward: 90 crowns, 120 XP, and existing `warden-head-0` armour if not already owned. These are balance proposals, not shipped values. The case is a quest flag, not a new generic inventory system.
5. Leave through the room exit. Exterior positions, enemies, projectiles, fires, weather clock, wave counters and cooldowns resume where they stopped. Do not simulate elapsed wall-clock time on return.

If a suitable apartment cannot be placed, leave this contract unavailable and keep the existing workshop trading interaction. Never place a door in water or inside impassable geometry to force content onto a seed.

## Existing seams and constraints verified in code

| Current file / function | Verified behavior | Required extension, not implemented |
| --- | --- | --- |
| `src/rebuild/RPG.js`: `makeRPGWorld` | Shops prefer valid primary-building fronts, carry `buildingId`, and can fall back to a street point. Service IDs such as `smith` are semantic and stable. | Attach a workshop interior only to a valid host; explicitly preserve fallback roadside trading. Reserve an apartment host and doorway without moving existing services. |
| `src/rebuild/CityParcels.js`: `generateParcel` | Building IDs are `building-${index}-${part}` within a deterministic city plan. They are not an invariant across generator revisions. | Store a binding to the actual generated host, qualified by seed and plan revision; never use a mesh UUID or array position as a persistent interior ID. |
| `src/rebuild/RPG.js`: `nearbyPlace`, `interactPlace` | Ground-level proximity and line of sight gate services. Shop interaction currently emits `rpg-shop` and pauses immediately. | Route a workshop door to interior entry; retain merchant validation for an actual nearby indoor NPC and retain exterior fallback. |
| `src/rebuild/RPG.js`: `QUESTS`, `acceptQuest`, `questProgress`, `questObjective`, `claimQuest` | Contracts, crowns and claim flags live in `sim.rpg`; rewards can update permanent profile XP/gear. | Add the apartment contract and objective state; validate collection and claim through the active location. |
| `src/rebuild/Simulation.js`: `update`, `pause`, `resume`, `start` | Only `playing` and `extracting` advance exterior physics. Restart creates a new hero; normal app restart creates a new Simulation. | Introduce an explicit indoor location state and a separate indoor tick. Exterior `update` must remain stopped. Reset the interior session on a fresh expedition. |
| `src/main.js`: `loop`, `processEvents`, `togglePause`, `resume`, `focusLost` | Fixed-step updates, event delivery, menus, audio and input clearing are centralized. | Dispatch the active location, route indoor events, clear fixed-step/input carryover at transitions, and preserve nested menu return context. |
| `src/rebuild/RPGUI.js`: `open`, dialog `close` handler | Return states are limited to menu/paused/playing/extracting; closing Trade can resume the exterior. | Add an explicit return-to-interior path. A trade menu must not call exterior resume while a room is active. |
| `src/rebuild/World.js`: constructor, `update`, `onEvent`, `destroy` | World owns the renderer, scene, compositor, effects and resources. Service facades hide when their host dies; this does not remove the logical service. | Retain the exterior instance; add a lightweight room view using its renderer under an explicit ownership contract. Do not destroy/rebuild the city for each visit. |
| `src/rebuild/QuestNavigation.js`: `questGuide`, `syncQuestNavigation`, `navigationRoute` | Routes assume exterior coordinates and use cached exterior obstacle grids. | Tag objectives with location; outside, route to the door, never to local room coordinates. Inside, show a room target/exit rather than reuse the city grid. |
| `src/rebuild/Input.js`, `TouchUI.js`, `ControllerUI.js`, `RenderSchedule.js` | Several paths treat only playing/extracting as active gameplay; controller dialogs already support focus navigation. | Teach the active-location paths about a playable room. Otherwise controller input can silently return and rendering can drop to the paused 10 Hz cadence. |
| `src/rebuild/SaveStore.js`: `normalizeSave`, `backupText`, `parseBackup` | Save v1 contains only normalized `profile`, `record`, `settings`; no expedition snapshot. Backups are bounded and newer formats rejected. | Keep this slice inside existing save semantics. Do not imply that room location, expedition loot or quest progress survives app reload. |

## Proposed implementation boundaries — all open

### 1. Pure room plans and identifiers

Add `src/rebuild/Interiors.js` for deterministic planning and location operations, without Three.js or DOM dependencies.

Proposed interfaces: `prepareInteriorPlan(layout, places)`, `canEnterInterior(sim, id)`, `beginInterior(sim, id)`, `stepInterior(sim, input, dt)`, `interactInterior(sim)`, `resolveExteriorExit(sim, session)`, `endInterior(sim)`.

Use fixed template IDs `workshop-v1` and `apartment-v1`. Logical object IDs are scoped to an interior instance: `mara`, `exit`, `tool-case`. An instance key is `city:<mapSeed>:<interiorPlanRevision>:<hostBuildingId>:<templateId>`. The manifest retains the exact host, door position, outward normal, room spawn, collision rectangles and interaction rectangles. Reopening reuses that manifest, not a new random pick. Seed-qualified IDs are expedition identifiers; do not add them to the permanent profile.

Build the manifest after `makeRPGWorld` has chosen services. The apartment candidate must be a distinct primary building with a valid frontage, a dry reachable route from the workshop, and clear door clearance. Validate with existing `insideMap`, `waterAt`, `pointBlocked` and `routeSegmentClear`/`buildRoute`. Keep selection deterministic. If entry requires a reserved standalone workshop shell for street-fallback seeds, defer that shell rather than silently generating mismatched room/building geometry.

Store bounded expedition state separately, for example `sim.interiorState = {manifest, visited:[], collected:[]}`. Collection keys include the interior instance and object ID. Keep arrays deduplicated and limited to the two planned rooms. Do not store scene objects, functions or renderer IDs.

### 2. Location transaction and paused exterior

Use `sim.state = 'interior'` while a room is active, with a session recording the exterior return state (`playing` or `extracting`), exterior door, host ID, preferred exit point, and a previously verified emergency return point. Keep `sim.player` as the authoritative hero for health, equipment and combat progression. Store room coordinates and animation pose separately in `session.pose`; rendering can project the current hero appearance onto that pose. Do not overwrite the hero's exterior coordinates to trick shop proximity checks.

Entering is atomic: validate host/door and available exit, finish or reject incompatible combat/traversal actions, stop focus/haptic loops, clear input and both fixed-step accumulators, record return context, then activate the room. Failure leaves the exterior entirely unchanged. Pause existing hazards and weather; do not discard them or replenish health, ammunition, cooldowns or focus. The first slice disables weapon attacks, throwables, dodge and grapple indoors; show movement, interact, journal and exit controls only.

`src/main.js` dispatches either `sim.update` or `stepInterior`, never both. An explicit capability object for the active location should drive input, HUD, render scheduling and audio; avoid scattering ad hoc `state === 'interior'` exceptions. Opening Trade/Inventory/Settings pauses room movement. Closing a nested dialog returns to the previous room/dialog, not the street. Window blur or controller disconnect pauses the active room. Resume clears held edges so entry, purchase and exit cannot repeat on catch-up ticks.

### 3. Safe exit and destroyed-host recovery

At entry, record an outward doorway return point already verified for a player-sized body. At exit, revalidate against **current** live obstacles, rubble, water, map boundary, and immediate hazards. Try in order: recorded doorway apron, bounded deterministic samples along the same frontage/outward direction, then an already validated emergency point connected to the outside route. Require a dry free endpoint and a clear final walking segment where relevant; never restore to a cached coordinate inside a newly blocked wall or a surviving vehicle.

The exterior is paused, so ordinary fire/destruction cannot progress while inside. Nevertheless, exit must handle a host removed by an explicit action, a test, or later systems. If the host is gone, dispose its entrance marker and return through safe exterior recovery; do not recreate its health or mesh. Do not require a path through the destroyed building's former interior. If all candidates fail, keep the player safely in the room with a Retry exit action; never drop them into water or an invalid coordinate. Entry should have validated an emergency point to make this exceptional.

If the apartment is destroyed before collection, convert its one quest case to a reachable rubble-search interaction, retaining the **same collection key**, or mark the contract unavailable before acceptance. Once accepted, do not silently strand its objective. If the workshop host is destroyed, Mara's existing service becomes a marked roadside fallback at a validated nearby point so the accepted quest can still be claimed. These fallback rules need explicit tests and UI copy; hiding a facade alone is insufficient.

### 4. Room rendering and assets

Add `src/rebuild/InteriorView.js`: one room scene, orthographic camera, simple authored walls/collision-matched furniture, warm workbench light and a restrained doorway light. Reuse `SurfaceMaterials`, `buildSurvivor`, armour dressing and character motion where their interfaces permit. Define ownership of shared versus room-only materials and textures before adding disposal calls. Keep the exterior scene and renderer alive; suspend exterior update/effect ageing while drawing the room through a dedicated render path. Restore viewport, render target, camera and compositor state on exit.

The workshop should read as Mara's trade: tools, unfinished armour, repair bench, coat rack and a visible person. The apartment uses different materials and layout, a work bag near the exit, and the identifiable tool case. Existing procedural materials and reusable meshes are enough for the functional slice. Any new wall art/toolcase sprite is a subsequent asset task, not a dependency on ungenerated placeholders. Authored art, collision and interaction footprints must share the room plan.

Scope the first room camera to diorama. If the player entered from TPS/FPS, preserve their setting, label the indoor camera transition, and restore their view on exit. Full indoor FPS/TPS collision/aiming is a separate acceptance milestone rather than an untested promise.

### 5. Quest, merchant and input UI

Add a location-aware interaction resolver that returns a validated semantic contact, then let `purchase`, `acceptQuest` and `claimQuest` consume it. Do not make `nearbyPlace` return every indoor merchant regardless of distance. Indoor NPC checks must verify current interior ID, matching merchant ID and room-space reach. Exterior services keep current proximity, ground and obstruction checks.

Extend `questObjective` to distinguish `location:'exterior'` door targets from an interior instance/object target. `Tools of the trade` states are accept → enter apartment → search locker → return to Mara → claim. The journal shows the next action in one sentence. Tracking a city objective from inside points to the room exit first; tracking the case outside points to its apartment door.

Use the existing interaction binding and `glyph` for controller prompts; no new mandatory gamepad button. Keep real DOM buttons for Talk, Search, Leave and menu actions so `Input.navigateMenu` can navigate them. A controller Back closes the current dialog; it must not also exit the room or resume the exterior. After closing, focus returns to the relevant NPC/door prompt or game canvas. Require button release between context changes.

On phones, keep the movement stick and one contextual action with at least a 44 px target; hide combat HUD and unused combat buttons. Keep a compact room title and optional one-line quest instruction. Place longer lore in a dismissible panel. Test portrait and landscape, browser safe-area insets, two-finger move/interact, and a held movement finger during menu opening.

### 6. Save and lifecycle boundary

Permanent XP/owned armour still changes through `gainXP` and existing profile events; persist through `SaveStore`, including flush on pause/pagehide. Crowns, the tool case, room visits and quest claims remain expedition-only, consistent with `initRPG`. Reopening an interior in the same run must retain collected/claimed flags. New expedition clears them. Reloading the app retains the hero but starts a fresh expedition outside; disclose this in the room/pause help.

No save-v1 schema change is required for this slice. A future resumable expedition would need a separately versioned snapshot with seed/generator revision, destruction and exact room manifest; that is explicitly deferred. Existing backup import/export and corrupt-save protection must continue unchanged.

## Acceptance tests to add — none run or implemented yet

- **Plan:** at least 100 seeds; deterministic host/door/room IDs, no overlap with services, valid dry approaches, distinct hosts; dense or malformed fixtures produce safe unavailability.
- **Entry gates:** vehicle, airborne, grapple, distant door, occluded door and destroyed host cannot enter; repeat interaction produces one session only.
- **Exterior freeze:** snapshot enemy positions, bullets, timers, fires, collapse chunks, wave/spawn counters, weather and health; walk and trade indoors for 60 seconds; all exterior simulation fields remain unchanged except explicit profile/quest transactions.
- **Return:** entry pose is never lost; valid exit restores intended play/extraction state. Surviving car, new rubble, destroyed host, water and blocked doorway fixtures choose a safe alternative or remain safely inside. Do not clear unrelated world objects.
- **Quest idempotence:** searching twice, leaving/reentering, opening/closing menus and repeated controller confirmation grant one case; claim twice grants one payout. Apartment/workshop destruction before and after collection remains completable through fallback interactions.
- **Merchant authorization:** remote or mismatched-room purchase/claim fails; normal exterior traders still work; indoor purchase updates appearance and stats immediately with no copied-profile divergence.
- **Progression lifecycle:** same-run revisits retain flags, new expedition clears flags, reload retains permanent hero changes only. Save export/import and locked/corrupt storage behavior remain covered.
- **Input timing:** real fixed-step path with two or more catch-up ticks and 120/240 Hz no-tick frames; entry/search/purchase/exit occur once. Holding interaction across a transition cannot collect, purchase or leave immediately.
- **Menus:** controller focus and Back through room → Trade → Inventory → room; disconnect/blur pause the room; no exterior tick or accidental exit. Physical controller verification remains separate from synthetic input coverage.
- **Visual QA:** actual entry, room movement, armour change, case collection, exit and destroyed-host fallback at desktop plus portrait/landscape phone viewports. Inspect shadows, wall cutaway, readable prompts and camera restoration.
- **Resource budget:** repeat the full workshop/apartment loop 50 times; stable renderer count, listener count and bounded texture/geometry allocation; no increasing frame time or duplicated audio. Compare to the 4.43 city baseline on the same device/settings.

## Suggested delivery order and stop conditions

- [ ] Pure manifest + state/exit resolver with deterministic tests.
- [ ] Workshop enter/walk/talk/exit using the existing merchant UI, exterior-freeze assertions and nested menu fixes.
- [ ] Apartment case + contract + destruction fallback, with idempotent reward tests.
- [ ] Shared-renderer room visuals, compact touch controls and controller focus verification.
- [ ] Browser and macOS packaged smoke checks, regression suite and campaign checks, then publish as a separate release.

Keep each change reviewable. Do not ship the slice with a quest that can become impossible, an exit that can trap the character, or a dialog that resumes the exterior behind the player. Most implementation risk lies in location/menu ownership and safe return validation; additional room decoration comes after those invariants work.
