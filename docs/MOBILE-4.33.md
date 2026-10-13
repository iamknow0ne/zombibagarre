# Mobile controls and character notices — 4.33

Phone combat controls use outlined SVG icons: swap, reload, dodge, ordnance, auto fire, map, pause, vehicle entry/exit, trade, brake and reverse. Combat buttons are 48 × 48 px; utility buttons retain 44 × 44 px touch targets. Ammo and dodge cooldown remain visible, with explicit ON/OFF auto-fire state. Labels remain available to assistive technology; Settings includes an icon legend. Detailed menus keep their text for clarity.

The HUD bell opens the paused character Notices panel. Skill points and ready contract rewards are live reminders and remain until spent/claimed. Newly acquired armour and automatic weapon evolutions are expedition-local notices; opening Notices acknowledges these while keeping recent history available. Notices link to the skill tree, the specific armour item, inventory or the relevant journal contract. There is no manual weapon-upgrade claim: mastery tiers apply automatically. Main menu and pause character buttons also show the pending count.

Validation: 249 automated tests, including four new notification lifecycle checks; production build. Browser checks at phone sizes include icon controls, simultaneous stick + dodge, notices → skill tree, spending all points, badge clearing and return to gameplay. These are browser/simulated touch checks, not physical phone hardware validation.
