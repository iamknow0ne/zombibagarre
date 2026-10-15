# 4.52.1 — combat effects above the street

15 October 2026. A reliability step toward vertical encounters, not a new roof-combat feature.

- Actor wounds, dismemberment, remains, fire, electrical reactions, melee waves and mastery effects now retain the actor's floor height. Projectile contacts continue to use absolute impact height.
- Dropped power-ups render at their recorded height. Nova and thermal-shock blasts originate on the correct floor; elevated signature-flame hits no longer create an unrelated fire on the street below.
- Hard fragments and casings land on live support geometry. Remains fall when their support is destroyed. Raised blood pools project onto real nearby surfaces, including roofs above water, rather than floating in space. Nearby-root culling avoids recurring full-city descendant traversal for each stain.
- Paused death animations no longer drift or keep generating frozen smoke/electricity.
- Resuming a checkpoint restores its gameplay weather controls. Changing volume afterwards no longer overwrites the expedition's saved night/rain with title-screen preferences. Failed restores roll back these controls too.

## Validation

679 gameplay regressions; 64 city/campaign checkpoint continuation checks across waves 1–32; production build and visible-version gate passed. Real browser review of staged elevated waves, blood/remains and collapse, plus actual night/rain save → title day/clear → restore → volume change. See [QA evidence](qa/4.52.1/README.md).

## Boundaries

Elevated enemy encounters still need floor-aware navigation, gravity/support loss, wave-completion isolation and persistent regional encounter state. The staged elevated victim is a developer fixture. No new indoor combat, regions, hangar, spacecraft or planet exploration in this patch. Android's clean physical acceptance remains interrupted by the previously documented Dolby system dialog; no phone or FPS improvement is claimed. Steam Deck and Apple notarization remain deferred.
