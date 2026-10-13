# Survivor dossier / 4.19

Design direction: a field dossier for a survivor in Saint-Roch. Dense equipment management, a visible character, item inspection and branching skills. Keep the existing bone, oxidized orange and dark teal identity. No ornamental glow, draggable-only inventory, or new HUD clutter.

Tokens: background #142125, inset #101a1e, raised #213237, text #eee6cf, muted #b4bbaa, accent #e99b62. Rarity retains labelled Common/Rare/Epic/Legendary colors. Existing display and mono fonts; 4/8/12/16/24 spacing; square edges; 44px minimum controls; no layout motion. Selection has a border plus text, not color alone.

Layout: persistent survivor/stats rail and four dossier pages: Inventory, Skills, Journal, Trade when at a shop. Inventory has equipped slots, filterable stash and inline comparison. Skills use connected branches with explicit prerequisites. Journal separates active, available and complete work, shows the next action and tracks the objective rather than always the giver. Mobile stacks sections and uses a compact survivor rail; no drag gesture required. All actions are real buttons/selects supported by the existing gamepad navigation.

Research / design interpretation:
- Cyberpunk 2077 Update 2.0: meaningful perks, specialist vendors, simplified comparison and journals with distance/untracking. https://www.cyberpunk.net/en/news/49060/update-2-0
- Diablo IV Armory: equipment and skills form a coherent build. https://news.blizzard.com/en-us/article/24167111/master-the-occult-in-season-of-witchcraft
We adapt these patterns rather than reproduce either game's UI. Existing levels, equipment and learned skills remain compatible. No paid respec, inventory weight or gear deletion added.

## Implemented
- Permanent armour collection: 36 existing pieces, visual slot silhouettes, rarity marks, slot and rarity/name sorting, per-slot health/protection/damage/speed comparison, equip/unequip, dyes, actual equipped weapon models and independent hand selectors.
- Five attributes plus 12 skills. Survivor has recovery/defence paths, Hunter has a four-step dodge/melee/boss path, Artificer specializes in frost/fire. Existing skills retain their requirements; new children enforce prerequisites in both UI and simulation. Respec removes only profile contributions.
- 17 expedition contracts (previously five): three NPCs, deliveries, gear preparation, districts, supply recovery, relay/convoy/hunt encounters, enemy-specific bounties, wave progression and secret guardians. Journal state, progress, rewards and next destinations use the same simulation functions as trading. Courier delivery specifically requires a visit after acceptance.
- Traders are placed at existing building fronts, with dry, collision-free interaction points and a clear route to a street spawn point. Existing buildings remain collidable/destructible. Shop frontage vanishes on building destruction; services remain accessible through the trader. No enterable shop interiors in this release.
- Decorative shop pieces use rigid geometry batching and frozen local transforms. Character and weapon portraits are generated only when their appearance changes / on first requested weapon tier, not per frame.

## Verification
- 169 automated tests pass, including legacy save normalization, skill prerequisites and respec, item comparisons, objective-to-giver tracking, all new rewards paying once, deterministic accessible building fronts over 12 seeds and bounded storefront mesh count.
- Browser QA: buy armour, compare and equip, observe changed health/protection/speed and portrait; learn Ghost Step and see Ambush unlock; journal shows next supply case and distance; 390px mobile inventory has equal client/scroll width; virtual DualSense D-pad + Cross selects Skills and Circle returns to gameplay. No console errors observed.
- Visually inspected the new workshop on a full city building. Storefronts are exterior interactions; the building renderer still supplies its surface materials, roof, windows and destruction.
- Hardware limitations: responsive desktop browser and simulated controller checks, not a physical phone/controller validation.
- Visual review: AI-slop score 2/10, distinctiveness 8/10. Equipment slots, actual survivor/weapon previews, labelled rarity and connected skill paths suit the survival game. Small secondary labels remain intentionally dense; primary actions retain 44px targets. No ornamental motion or new combat HUD panels.
