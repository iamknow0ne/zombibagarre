# Regional travel: first integration design

Status: **unimplemented**. Read-only foundation audit, 14 October 2026. This document describes proposed behavior, not a shipped feature or a separate demonstration. Character art remains the current implementation priority.

## Bounded playable slice

Connect the existing Open City to one seeded country-road region, with a reciprocal exit, one guarded supply stop and one delivery objective. Use the real Simulation, World, combat, destruction and quest systems. Keep inactive regions frozen. Defer vehicle transport, hidden hangar, spacecraft, planets and expedition suspend/resume until this roundtrip passes the gates below.

Persistence is **session-only for the current expedition**. Death/restart/reload begins a fresh expedition; permanent character XP, skills, discovered equipment, records and settings retain their existing save behavior. Explain this in travel/save UI: “Your character is saved. Cities, loot and regional progress last until this expedition ends or the game closes.”

## Existing integration constraints

- `Simulation.start()` recreates and heals the hero, resets upgrades and calls `initRPG()`. `main.js` start/reshuffle create a new Simulation. None is a travel operation.
- `initRPG()` resets expedition currency, accepted/claimed quests, places and interior state. Do not call it on return.
- `nextWave()` regenerates noncity layouts at district changes; the update loop advances upgrades/extraction whenever all enemies are gone. Country encounters need an explicit director mode, separate from city waves. Renaming a generated arena is insufficient.
- Building damage/destruction is event-driven in World. Rebuilding pristine layout with damaged simulation props does not restore all visual damage. Hydration must be idempotent and must not replay gameplay damage/rewards.
- Quest progress reads active places, discoveries, street events and interior state. Queries must resolve their owning region while the player is elsewhere.
- Interior movement deliberately freezes the exterior. Permit travel only outside; preserve interior collected/visited flags in their region. Use the existing safe-exit validation approach for arrivals.

## State ownership and serializable boundary

Use one live Simulation and explicit regional bundles; retain the same hero and expedition ledger through activation.

| Ownership | State |
| --- | --- |
| Permanent save | Existing normalized profile, record and settings only |
| Global expedition | Player (health/ammo/equipment/cooldowns/mastery/upgrades), profile reference, RPG coins/accepted/claimed/global kill counters, score/kills, upgrade choices/rerolls, unique entity counter, monotonic simulation clock, weather/day clock, focus resource |
| Regional bundle | ID/seed/layout generator version and layout; props including damage/fire/vehicles; enemies/bullets/hazards/pickups/fires; structures/rubble/wet ground; street events/guards; local service/cache/secret states; discovery IDs; traversal reward flag; interior manifest/visited/collected; safe gate anchors and manual waypoint |
| City encounter director | Wave/district, spawn timer/pending count, wave kills/total/base count, reinforcement flag, extraction progress and resumable director state |
| Rebuilt/never serialized | World/Three objects, render effects, event queues, dialogs, navigation/spatial indexes, cached routes/targets and closures |

Keep existing local prop IDs intact because render code parses `prop-N`; use `(regionId, localId)` when addressing across regions. Region-qualified objective IDs prevent collisions between service IDs, `street-0` or discoveries with the same label. Preserve each ledger entry and object health exactly; restoring should never call damageProp, collect, start, initRPG or nextWave.

For a future snapshot codec, convert Sets and Maps explicitly, validate finite scalar records and identifiers, and reconstruct references by IDs. Retain generated layout or pinned generator version plus seed. Current RNG is a private closure; session travel can retain that live RNG. Reloadable expeditions need a versioned explicit RNG state, not reseeding and replaying an unknown number of calls.

Keep `sim.time` monotonic. Inactive regional countdowns stop. Enemy `lastHitAt` is a regional absolute timestamp used for combination windows: rebase it by inactive duration if those windows freeze. Player timestamps remain on the global clock. Global weather advances while playing the active region; inactive fires/destruction do not simulate in the background. Clear all derived collision/navigation caches after activation.

## Proposed code seams

1. New `Regions.js`: registry, deterministic first creation, capture/activation, gate eligibility, safe arrival search and transaction result. Keep pure helpers testable.
2. New `CountryRoad.js`: actual connected rural road, irregular boundary, dry walkable route, trees/cover, supply stop and reciprocal gate using current layout interfaces.
3. `Simulation.js`: request/commit travel; separate wave director from general enemy/projectile/environment simulation. Road encounter completion never advances city waves.
4. `RPG.js`: region-aware progress/objective lookup and one accepted roadside delivery with a global once-only claim ledger.
5. `QuestNavigation.js`: objectives carry regionId; off-region guidance resolves to the current departure gate, not foreign coordinates.
6. `World.js`: snapshot hydration for destroyed props, damage stages, rubble, moved vehicles and active environmental state. No event reward replay.
7. `main.js`: one transition event, input/accumulator clearing, loading state, destination rendering/hydration, then commit/resume. Preserve source state for rollback on failure.
8. `Atlas.js` and existing contextual HUD: region title and travel exit marker/destination. Reuse interact input and existing controller/touch icons. No new travel binding or instant map teleport.

## Atomic transition and safe arrival

Entry requires an alive grounded hero on foot, outside rooms, with no grapple, dodge, melee swing or throw active. Reject upgrades/death/victory/loading and threatened gates. Validate the destination against live solids, rubble, water, enemies, fire and imminent hazards. Try deterministic nearby clear candidates; if none is safe, preserve the source state and explain why passage is blocked.

Prepare destination simulation and visuals before committing the active region. Clear held input, one-shot buffers and accumulated fixed steps. Cancel only transient movement/aim/support/vehicle references; preserve health, ammo, cooldowns, inventory and focus charge. Do not grant invulnerability/healing/supplies through the transition. Never allow a failed or repeated request to consume or duplicate rewards.

## Save policy

SaveStore currently normalizes only profile/record/settings and caps portable backups at 256 KB. Do not put regional data in settings or silently change the backup promise. The first slice retains in-memory regional state only. A later suspend/resume feature requires an explicit schema/version, quotas, migrations, validation, corruption recovery and an atomic write policy.

## Acceptance gates — all required before claiming implemented

- [ ] A normal player can walk city → country road → city using keyboard, gamepad and touch interact controls.
- [ ] Repeated visits preserve damage, rubble, moved vehicles, pickups, enemy/encounter state and interior/traversal rewards without regeneration or duplication.
- [ ] Low health, partially spent magazines, reload progress, cooldowns, currency, mastery and focus survive a transition unchanged.
- [ ] Inactive city spawning/waves remain frozen; country kills/empty encounters cannot award city upgrades or trigger extraction.
- [ ] City district advancement does not regenerate the road.
- [ ] Accepted/completed quests retain correct state across regions; foreign targets guide to local gates; repeated delivery claims fail.
- [ ] Blocked/flooded/burning/occupied arrival selects a validated fallback or rejects without any partial switch.
- [ ] Held interact/fire and multi-step frames cannot trigger repeated travel or attacks after loading; pause/restart/death remain correct.
- [ ] World recreation visibly restores collapsed and damaged buildings and moved vehicles without replayed explosions or rewards.
- [ ] Tests cover duplicate local IDs across regions, 50 roundtrips, interrupted/failed render construction, and fresh expedition registry reset.
- [ ] Browser QA checks compact portrait and landscape HUD/map, real combat before/after travel and ordinary indoor entry/exit.
- [ ] Reload retains permanent hero progression and intentionally discards expedition regions; old backups still import/export unchanged.

Physical controller/phone acceptance requires those devices. Automated or desktop-emulated tests are not substitutes for that evidence.
