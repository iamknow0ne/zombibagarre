# Main-world traversal: next playable slice

14 October 2026 · implementation plan from two independent code audits, not a completed feature.

## Delivery boundary

Start with a small service yard inside Open City: jump onto low service platforms, grapple between visible anchors, collect a reward and return to combat. Keep initial supports around 1.1 m so ordinary enemies remain relevant. Extend to a curated flat service roof only after elevated enemy threats or access are working. Arbitrary procedural building traversal is a later step.

## Shared height contract first

- Add actor feet/base height and prop base/top intervals in Ballistics. Preserve identical y=0 behavior.
- Initialize player vertical state in Simulation, then refactor Traversal to accept the actual RPG movement intent/speed. Use one horizontal movement path. Preserve dodge, Focus, combat facing and grounded snow traction.
- Build exact support, parapet, obstacle and anchor geometry from one plan used by physics and rendering. Existing building targets end at b.h while visible flat roofs top at b.h+0.31; gables, HVAC and parapets are not yet accurate traversal colliders.

## Integration tasks

1. Separate jump and grapple from dodge and grenades. Provisional keyboard J/G preserves Space/E. Controller defaults must be chosen from free slots and migrate custom bindings without overwriting them. Add configurable actions, diagrams and compact context-sensitive touch buttons.
2. Offset weapon and throwable launch positions by player feet height. Target real bodies/surfaces in diorama, TPS and FPS. Keep continuous collision for all shots, not only perspective shots.
3. Give melee, electricity, enemy contact, spitters, boss attacks, blasts, fire and structural debris explicit vertical spans and line of sight. Jumping may evade a ground shockwave; airborne must not imply general invulnerability.
4. Height-gate pickups, vehicle entry, merchants, quest triggers and extraction. Avoid interacting through floors.
5. Preserve grounded weapon animations; blend airborne legs and landing compression, with a dedicated grappling hand/stow pose only while attached. The trainer currently replaces weapon animation whenever p.traversal is set.
6. Extract bounded anchor/cable/landing visuals from the trainer. Update using simulation time. Keep one stable selected target and reserve mobile HUD space. Remove destroyed anchors immediately.
7. Use actual obstacle base height in camera clearance; elevate casings, progression popups and quest guidance. Support collapse must release into swept falling, without teleporting through intermediate floors.

## Acceptance gates

- Unchanged ground-level campaign regressions and movement speed/weather/dodge behavior.
- Jump over low cover, jump while firing, attach/release, land, fall and recover.
- Shoot over/under bodies; melee misses another floor; correct ground/tall hazard overlap.
- Destroy an anchor while attached and a support while standing on it.
- No elevated vehicle, shop or extraction teleport.
- Same visible support and collider in diorama, TPS and FPS; readable character and cable.
- Keyboard, scripted controller, portrait/landscape held-stick touch, pause and focus-loss cancellation. Physical device checks remain separate.
- Add a visible campaign fixture using the real shared plan, plus meaningful physics and migration regressions.

## After traversal

One enterable workshop and apartment loot quest need a stable exterior anchor, paused exterior simulation, stable loot/quest IDs and a safe exit if the exterior building collapses. Region travel then needs explicit save boundaries before the country road, hidden hangar, launch/orbit/return and first moon slices.
