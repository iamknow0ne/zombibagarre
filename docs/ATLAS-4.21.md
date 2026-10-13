# Street atlas and quest guidance / 4.21

Design direction: a survivor's field atlas. The map is the main object; a narrow mission ledger explains the next action. Adapt the existing dossier palette and type rather than introduce a new visual theme. Map streets, water, structures, services and objectives have separate visual weights. Distinct symbols and explicit labels supplement color.

Tokens: coal #142125, panel #213237, bone #eee6cf, muted #b4bbaa, quest amber #edbd73, custom destination blue #8fcbd0, completed green #acd5a7. Existing display face for headings, mono for coordinates/progress and system sans for map labels. 8/12/16/24 spacing, square controls, 44px targets, no decorative motion. Canvas labels use dark backing; label collisions are suppressed.

Layout: desktop map plus mission ledger; mobile map above a compact mission panel and collapsible location directory. Quest selection, the next step, reward and tracking action remain actual DOM controls, usable without hitting small canvas symbols. A compact mobile quest strip opens the full map while leaving the thumb controls clear.

## Implemented

- Rebuilt canvas cartography: road edges, bridge/water distinction, building footprints, distinct service/objective symbols, label collision suppression, scale and north marker. Labels compensate for CSS canvas scaling.
- Mission ledger with a contract selector, explicit meet/objective/return stages, destination distance, progress and rewards. Direct map/journal navigation, context centering, categorized nearby places, mouse drag/wheel, retained touch gestures and controller crosshair/options.
- Separate quest and manual waypoints; automatic objective/return updates; completion/next-step notifications; explicit city-wide objectives. Untracking a quest preserves custom pins.
- Cached pedestrian A* with geometry-checked smoothed segments. Buildings, water, shorelines and destroyed obstacles affect routes. Dotted bearings are explicitly labelled when no walking route is available. This is conservative foot navigation, not vehicle GPS or a guarantee that every narrow passage will be routed.
- Compact mobile quest HUD with no overlap against weapon information or thumb controls; portrait summary links directly to the ledger, directory starts collapsed, landscape uses two columns for the atlas.

## Validation

- Full automated suite: 184/184 passed, including seven new navigation tests. Covers quest-stage changes, custom-pin preservation, targetless objectives, building avoidance, bridges/unreachable water, geometry invalidation, asymmetric map coordinates and contacts across four generated city plans.
- Production build passed. Existing Three.js chunk-size advisory remains.
- Browser checks: accept contract, journal → atlas → journal, custom destination and restored quest route, zoom/center, virtual DualSense D-pad selection/Cross activation/Circle return, both supply pickups and return-for-reward guidance.
- Responsive browser fixtures: 390×844 and 844×390, no horizontal overflow in the portrait map, active next-step shortcut, distinct quest and weapon rows, thumb controls unobstructed. Browser console reported no errors. Physical phone/controller testing was not performed.
- Visual review: hierarchy 4/5, map distinctiveness 4/5, typography 4/5, interaction clarity 4/5, mobile readability 4/5. The field-atlas palette and glyphs follow the existing game; no unrelated card system or decorative animation was introduced.
