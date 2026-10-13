# Boss encounter redesign / 4.16

Direction: quarantine folklore at architectural scale. The playfield remains dominant; boss introductions use a short field transmission, original procedural sculptures, low brass/bell cues and a camera that frames the survivor together with the threat. Coal/bone/amber HUD, rust for imminent strikes, pale teal for recovery. Existing condensed display type; 10–13px mono combat labels; 8/12px spacing; square field plates. No extra combat buttons, decorative screen flashes or forced input lock. Reduced motion disables cinematic camera movement and shake.

Research: Supergiant's [Welcome to Hell notes](https://www.supergiantgames.com/blog/hades-welcome-to-hell-update-patch-notes/) describe paired Fury encounters, attack cadence adjustments and preventing excess damage from skipping boss phases. The [Superstar notes](https://www.supergiantgames.com/blog/hades-superstar-update-patch-notes/) document simultaneous refinements to boss animation, timing and health bars, plus reduced homing tracking. Our design inference is to treat silhouette, animation, warning geometry and damage timing as one authored move, give committed attacks a punishable ending, and control overlapping attacks in a duo. This is an original implementation, not a recreation of Hades assets or source code.

## Encounter identities

- **The Bell Warden**: armoured executioner with a hanging bronze bell, massive tower shield and crown of broken iron. A targeted bell fall, committed shield rush and two-beat judgement. At half health the shield opens; recovery exposes the core and phase two adds a delayed follow-up. Read the lane, dodge sideways, punish the ending.
- **The Dredger**: a skeletal dock crane on four articulated supports, suspended diving cage, hook and dragging chain. Harpoon lanes and an expanding tide with a safe centre. At half health the cage separates and alternating bombardments punish standing still.
- **The Bloom Mother**: ribbed seed vessel, layered fleshy petals and six root limbs. Seed bursts, root eruptions and bounded summons. In phase two the petals unfold to reveal a vulnerable heart; attack between root sequences.
- **The Cinder King**: a walking industrial kiln about 11 metres high, buttress legs, chimney crown, rotating furnace doors and glowing brickwork. Slow heavy stamps and staggered furnace lanes; phase two opens the boiler and adds a delayed outer shockwave. Clear silhouettes and long warnings make its scale playable.
- **The Root Cathedral**: building-scale botanical variant, tall branch antlers and fossil ribs. Root constellations and two expanding rings. The core opens in phase two.
- **The Avalanche**: building-scale pale armoured giant, crystalline spine and heavy shoulder blocks. Fault-line strikes and committed charges. A long recovery follows each avalanche combination.
- **The Dust Reaper & The Ash Cantor**: hook hunter and ranged furnace priest, separate health bars. A shared heavy-attack reservation prevents simultaneous committed sequences. Killing either enrages the survivor; both must die before the wave can finish.
- **The Fen King**: marsh-black furnace titan with verdigris plates, green heart and broken antlers. Staggered pressure zones and widening rings; the final transition exposes the heart.

Hidden RPG bosses use the matching bespoke rig and state machine, retain their names and relic rewards. Boss waves reduce ordinary reinforcements so the boss remains the main problem.

## Combat contract

Every authored attack follows arrival → pursuit → locked telegraph → strike → recovery. Warnings share simulation geometry with damage: circles, lanes, and rings with a safe interior. No invisible full-circle hits for a lane attack. Dodge invulnerability applies normally. Targets stop tracking when the warning is placed. Phase transitions occur once at half health, absorb overflow, clear only that boss's pending attacks and offer a brief safe visual transformation. Recovery takes increased damage. Summons and effects have hard limits. Giant placement tests the actual collision radius, and cannot silently overlap a building. Duo health is individual; attacks and transition cleanup are owner-scoped.

Validation must cover both phases, warning/damage agreement, dodge avoidance, recovery bonus, no phase skipping, duo scheduling/survivor rage, summon bounds, death cleanup, spawn clearance, mobile HUD and camera framing, and a real browser render of all four rigs plus giant/duo encounters.

## Validation / 4.16.0

151 automated tests pass, including eight new encounter regressions. The production bundle builds. Browser workshop checks cover the four base silhouettes, architectural-scale variants, phase transformations, separate duo bars and phone layout. These are simulated-input and desktop browser checks; physical phone/controller playtesting and broader human difficulty tuning remain ongoing work. The renderer batches static details inside articulated joints to keep model draw calls bounded. No Hades art, sound or code is included.
