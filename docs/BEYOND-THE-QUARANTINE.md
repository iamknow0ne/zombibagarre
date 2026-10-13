# Beyond the quarantine

**Design proposal · 13 October 2026 · not implemented in 4.40.**

The strongest expansion is a second act that changes what the player thinks the quarantine means. First make Saint-Roch worth inhabiting: accessible shelters, useful interiors, people with routines and neighbouring towns. Then let a completed expedition reveal that the evacuation schedule was never describing a road out of the country.

## The reveal: the last departure

Keep the ordinary extraction after wave 32. Completing a run earns its existing rewards whether or not the player follows the new lead. After a first clear, a damaged radio repeats an unfamiliar departure code. Nocturne recognises it but refuses to explain it over the air. The resulting story chapter is a permanent unlock, so dying on the way does not require another 32-wave clear.

1. **A route beyond the map.** Mara identifies an engine signature in the transmission. A new country road appears beyond the industrial district, leading through abandoned farms and a forest service tunnel. This is a journey with clues, shelter and one deliberate encounter—not a long empty walk across enlarged terrain.
2. **The hangar.** A concealed flood-control depot contains a craft beneath dust sheets. Its emergency lamps use the same amber as the survivors' shelters. The player can walk inside, loot a maintenance room and examine a passenger manifest containing names from Lenoir's register. The craft is a lived-in vehicle, not a glowing portal.
3. **Make it fly.** Recover a power assembly, restore the hangar doors and decide what to carry. Mara handles the mechanical work; Lenoir supplies a sealed medical case; Nocturne finally gives up the coordinates. Separate objectives can be completed in any order. The final launch is an explicit player action with a checkpoint and a return option.
4. **The climb.** Engines blow debris across the floor. Rain becomes cloud, the city becomes a pattern of lamps, radio chatter thins out, and the music drops into silence. Let the player look around. Reduced-motion mode offers a quieter ascent; the sequence is skippable after the first viewing.
5. **The other lights.** The planet falls below the cockpit. Several distant quarantine beacons answer the same bell pattern. The reveal is not “you finished the game”: a navigation console becomes usable. A nearby moon has a landing site and an unanswered distress call.

Proposed twist: Saint-Roch is one node of an older evacuation and containment network. The Bell Warden was protecting or repeating its signal. This should complicate the survivors' story without making their suffering meaningless. Keep the exact origin of the infection unresolved until the next chapter.

For **Blackout / 2089**, the parallel reveal is that Lazarus has been restoring minds across settlements, not merely across a city. Theme switching must preserve objective IDs and rewards; dialogue, signs and artwork change without duplicating quest completion.

## Build the inhabited world first

| Milestone | Playable scope | Completion gate |
| --- | --- | --- |
| A · Places worth entering | One workshop, one clinic, one apartment interior; loot, merchant and short quest | Enter/leave from every supported input; no camera trap; saves and destroyed entrances have defined recovery |
| B · The country road | Two cities joined by a rural region, vehicle travel and distinct local contracts | No repeated rewards or duplicate NPCs; travel resumes safely after interruption; mobile memory stays bounded |
| C · The last departure | One hidden hangar, repair chain, launch, orbit and return | Existing extraction still works; launch can be skipped/replayed; save recovery at every transition |
| D · First contact | One moon, one landing region, one creature family, one material and one weapon evolution | Complete city → orbit → moon → city loop, including death, cargo and quest recovery |
| E · A small system | Three authored planetary identities with seeded regions | Each world changes tactics, navigation and discoveries; measured variety before increasing planet count |
| F · Free exploration | Expand landing choices, ship modules, discoveries and factions | Stable streaming, economy, exploration rewards and hardware budgets demonstrated on target devices |

These are dependency milestones, not delivery-date promises. Planetary work starts only after the preceding slice is playable and measured.

## Interior rules to settle before implementation

- Mark accessible doors consistently. Most facades can remain scenery initially; no promise that every room in every building is simulated.
- Use a short doorway transition into a separately loaded interior. Keep an exterior return anchor and camera orientation. Interiors need cover, lighting, collision and a readable cutaway, not only larger floor plans.
- Give shops meaningful functions: Mara modifies gear, Lenoir trades recovery supplies, Nocturne sells information and rare leads. NPC interiors should have personality, limited stock and a reason to revisit.
- A destroyed entrance cannot permanently erase a required merchant or strand the player indoors. Move the contact to a marked emergency shelter and use a safe exterior exit if the building collapses.
- Persist containers and quest objects by stable IDs. Re-entering a room, changing regions or reloading must not reroll claimed rewards.
- Begin with one loot interaction and one contextual action button. Keep controller prompts and mobile icons consistent with current interactions.

## Planets need distinct play, not different colours

| Destination concept | Creature / environment rule | Useful discovery |
| --- | --- | --- |
| Ash moon | Low gravity and brittle mineral cover; ambush creatures sense impacts | Material for a charged impact weapon; long jumps with clear landing previews |
| Flooded biosphere | Conductive water, living vegetation and predators disturbed by light | Insulated armour and a branching electric evolution |
| Frozen relay world | Shelter routes, sliding ground and machines that thaw during storms | Heat-retaining equipment and a signal fragment that changes the next story chapter |

These reuse familiar fire, water, electricity, weather and traversal systems where it makes sense, then add one memorable rule per destination. Avoid universal fetch quests and unlimited crafting currencies. A small set of materials should support visible equipment choices and exploration tools.

## Travel and technical shape

The experience can feel continuous without simulating an entire solar system at city scale. Retain the detailed local combat simulation. Load interiors and regional chunks separately. Use a flight layer for altitude transitions and an orbital map with controllable travel. Initially land at several validated locations, then extend the landing system as terrain and streaming mature. Market the implemented scope accurately; a cinematic connecting scenes is not unrestricted atmospheric flight.

Before splitting into multiple worlds:

- Separate persistent character state, expedition state and world changes. Define a versioned migration and export/import path before expanding saves.
- Introduce stable `worldId`, `regionId`, `interiorId`, entity IDs and deterministic region seeds. Retain only active regions and a small neighbour budget in memory.
- Save quest milestones, opened containers, important destruction, ship location and cargo as bounded records. Do not serialize every particle or debris fragment.
- Keep region coordinates local and translate to an orbital frame. Do not put city-scale physics at astronomical coordinates.
- Load render resources asynchronously; show an honest transition while loading. Cancel obsolete loads and dispose old geometry/textures when leaving a region.
- Create shared interaction, vehicle and travel interfaces before building a second flight-control implementation. Preserve the mobile assisted-driving option for accessible flight presets.
- Make fidelity adaptive: distant planets are inexpensive representations; ground detail, foliage, lights and particles follow device budgets. “More worlds” must not mean “all worlds loaded.”

## Progression and failure

Preserve the agreed model: **permanent hero, fresh expeditions**. Character skills, discovered equipment and major story discoveries survive death. Local enemy waves, ordinary containers and expedition contracts can refresh when a new expedition begins. Decide explicitly which construction and major world changes persist; do not silently change today's save contract.

The ship becomes a persistent home and travel unlock. Treat ordinary expedition cargo separately from the permanent discovery catalogue. For the first slice, use generous cargo recovery at the ship rather than losing a unique quest item on death. Never allow the player to sell the only required launch component or get stranded without a return route. Finishing the city must remain worthwhile for players who prefer the original game.

## Release gates

- Complete both the ordinary 32-wave extraction and the optional hangar route with a new and an existing hero.
- Test death, pause, app suspend and reload at doors, departure, orbit, landing and return.
- Claim quest rewards and open containers repeatedly through travel; every unique reward must remain single-use.
- Destroy a quest building before accepting, during the objective and while inside it; recovery must remain possible.
- Verify controller-only and touch-only completion, readable travel screens and optional guidance.
- Profile peak memory, loading pauses and sustained combat on a real phone and Steam Deck LCD. Set final caps from these measurements, not desktop screenshots.
- Ship the first moon only when returning home with its discovery works reliably. A larger universe comes after that proof.

**Next implementation candidate:** one enterable workshop and one apartment loot quest. That establishes doors, interior loading, interactions and recovery rules needed by both the country expansion and the hangar.
