# First enterable interiors — 4.44

Implemented 14 October 2026. This is a two-room Open City slice: Mara’s workshop and an apartment recovery contract. It is not arbitrary building interiors, indoor combat or a resumable expedition save.

## Player flow

Approach Mara’s frontage on foot and use **V**, the bound controller interaction button, or the touch prompt. Walk to Mara’s workbench and interact to open Trade. Accept **Tools of the trade**, leave through the doorway, and follow the tracked objective to the apartment. Walk around its partition and recover the tool case beside the locker. Return to Mara for **90 crowns, 120 XP and a common Bastion helm** (one owned copy). The reward is claimable once per expedition.

Rooms use a cutaway diorama camera, with weapons stowed. Outside TPS/FPS settings are retained and resume on exit. Furniture has matching movement collision. On touch screens, combat HUD and buttons are replaced by the movement stick, contextual action and journal shortcut. The indoor pause screen explains that reloading starts a fresh expedition outside.

## Runtime boundaries

- `Interiors.js` creates at most two deterministic plans after RPG services are placed. IDs include city seed, plan revision, actual building ID and template. Plans carry bounds, furniture, spawn, exit, contact/case and doorway coordinates. Unsupported layouts leave the existing roadside service available and hide the apartment contract.
- `sim.interiorState` holds the manifest, visited IDs and collected object keys for this expedition. `sim.interior` stores the active room pose and exterior return context. `sim.player` remains the authoritative hero; its street coordinates are not overwritten to authorize indoor trade.
- `Simulation.update` dispatches room movement and returns before exterior physics. Weather, enemies, projectiles, wave counters and cooldowns stay frozen. Pause/Trade/Character retain the indoor return state. Catch-up physics consumes interaction edges only once.
- Entry rejects vehicles, airborne/grappling/dodging heroes and unresolved melee/throws. Exit validates current geometry, map/water and immediate hazards, samples nearby frontage alternatives, then uses recorded entry/refuge candidates. If none is safe, the hero stays in the room with a retry message.
- Destroyed apartment hosts expose a safe rubble-recovery interaction using the same collection key. Destroyed workshop hosts expose roadside Mara. Tracked quest destinations use the recovery position. Indoor merchants require the matching active room, actual nearby contact and clear reach; exterior live-workshop transactions cannot bypass entry.
- `InteriorView.js` uses the existing renderer with a small owned scene. Architecture is batched by material; hero/armor reuse the survivor visual implementation. Exterior scene and effect ageing stay untouched while indoors. Previous room resources are disposed on replacement and at world destruction.
- `InteriorUI.js` retains one context action and compact location/quest copy. `GameplayContext.js` shares the active state with input, frame dispatch and render cadence. Indoor input ignores combat, weapon wheel, jump and grapple; keyboard/controller menus remain available.
- `QuestNavigation.js` never passes room-local coordinates to the city routing grid. Inside, objectives direct the player to the case, Mara or exit. Outside, they direct to the actual doorway or recovery position.

## Save boundary

Hero XP, learned skills and owned equipment remain permanent through SaveStore. Crowns, contracts, case collection and room visits reset on a fresh expedition. Save v1 is unchanged; no room/expedition resume is promised after reload.

## Evidence and limits

The 4.44 suite passes 462 tests. New coverage includes 100 generated city seeds, entry gates, a real movement route around the apartment partition, exterior freeze, safe/blocked exits, host destruction, remote-transaction rejection, one-time loot/rewards, restart, fixed-step high-refresh input, intentional pointer release, repeated dossier opening and 50 room replacement/disposal cycles. Existing quest/weather fixtures now meet Mara indoors.

Browser QA used the real application with isolated local fixture placement, actual interactions and Trade buttons. Entry, accept, collect, claim, exit, nested menus and 390×844 / 844×390 layouts were inspected. This is not a full human expedition or physical mobile/controller certification. The 50-cycle resource test checks ownership/disposal, not a measured GPU-memory soak.

[Release evidence](RELEASE-4.44.md) · [Next milestones](NEXT-PASS.md)

## Still open

- Full indoor FPS/TPS camera/collision design; room combat and hostile interiors.
- More authored room layouts, optional readable lore objects, richer NPC animation and audio.
- Physical multitouch/controller verification and extended packaged Mac playthrough.
- Versioned region/expedition save boundaries before country, hangar and space travel.
