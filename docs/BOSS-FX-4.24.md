# Boss impacts / 4.24

Impact effects now originate across the actual attack footprint. Circle, annular and rotated-lane sampling share the combat geometry; ring centres are not filled with a blast disc. Short jagged ground flashes, expanding rims, low radial dust, upward fragments and colored streaks separate the strike from its red warning. Existing attack timing, hit tests and damage stay unchanged.

The Cinder family uses ground fire jets and hot sparks. Dredgers use raised spray, mist and metal fragments; dry-ground spray is lifted from the water renderer's normal waterline to street level. Bloom attacks use wood fragments and earthy dust. Warden attacks use concrete; the Avalanche uses larger irregular glass-like ice shards and blue contrast against snow. Real water suppresses fire and ground fracture marks. Phase changes and defeats add bursts at three heights on the body; charges finish with a ground impact.

Effects use the existing ballistic fragment collision/bounce implementation, procedural fire shader and three reusable blast lights. The added burst budget is at most 140 entries, or 64 on low quality, and stops adding when the world already has 360 effects. Existing global cleanup caps all transient effects at 420. Ground effects expire within 0.95 seconds; ordinary debris uses the existing settling/lifetime rules. Reduced motion suppresses added camera shake and softens the local light pulse. These effects are visual aftermath, not new lingering damage zones.

Verification: targeted boss and effects checks cover every boss family, exact impact-centre geometry, cancelled attacks, quality budgets, finite ground-effect lifetimes, and water suppression. Browser inspection covered the Cinder King's furnace lane and phase eruption, Dredger spray and the Avalanche. The local visual range now freezes after a real strike and includes a phase-burst control. Performance is protected by count limits; no physical-device FPS claim is made.

Release validation: all 200 Node tests pass, including four new effects tests. The production build succeeds with the existing Three.js chunk-size advisory. No new packages or external assets are required.
