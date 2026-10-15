# 4.53.0 — rooftop encounter evidence

15 October 2026.

## Automated checks

- `npm test`: **703/703** passed, including deterministic guardian placement across ten procedural city seeds, optional wave isolation, roof cover navigation, support loss, one-time rewards, regional roundtrips, active/claimed checkpoint restores and legacy checkpoint compatibility.
- `npm run test:rook`: **89/89** actual-model checks passed.
- `node scripts/checkpoint-check.mjs`: **64** city/campaign continuation comparisons across waves 1–32 passed.
- `npm run build`: passed; visible version **4.53.0** verified. Existing large-chunk warning remains; no loading/performance improvement is claimed.
- Cache render ownership test: fixed geometry across 300 updates, lamp/lid states, host destruction and owned-resource disposal passed.

## Browser review

`dev/rooftop-qa.html` uses seed 73, real Simulation/World/RegionUI, real grapple input, AI, combat and collection. The fixture places the hero at street access and suppresses wave spawns; it does not grant invulnerability. Combat advances through fixture buttons, not a full manual campaign playthrough.

1. Actual grapple landed at y=3.41; one guardian appeared with 152 HP at the opposite end. [Arrival](rooftop-arrival.jpg).
2. Five seconds of actual autofire plus walking to the cache cleared the guardian. Kill reward brought crowns/XP to 63/10. [Compact touch prompt](rooftop-touch-prompt.jpg) uses an accessible icon action without another text panel.
3. Clicking that action claimed the cache: crowns **123**, XP **70**, grenades **5** (previously 3), claim prompt disappeared. [Claimed](rooftop-claimed.jpg). The extra 60 crowns/XP and two grenades match the defined reward.
4. Reset → grapple → inject host destruction → simulate two seconds: ledger **lost**, guardian and hero both y=0, real collapse damage applied, no cache reward. [Collapse](rooftop-collapse.jpg).
5. Normal main-game map displayed **Last Signal / Rooftop** and selecting it created a 49 m street route. [Map](map-rooftop-route.jpg).
6. At 844×390 the existing map scrolls; its rooftop destination remains reachable and selectable. [Landscape directory](map-landscape-route.jpg). Viewport override restored afterward. This is browser layout evidence, not physical touch-device acceptance.
7. No captured browser console errors during the encounter review.

## Design review

Intent: an optional, discoverable industrial-rooftop supply encounter, with a recognizable radio case and restrained amber/green state indication. Reuse existing brass/olive materials, crate icon, readable action labels and a minimum 44px touch target. No new permanent HUD panel. Keyboard/controller action goes through existing interaction wiring; actual controller hardware was not exercised. Compact prompt verified by browser click; map destination uses the existing scrollable directory.

Self-review (5 best): consistency 4/5, encounter readability 4/5, compact interaction 4/5, distinctiveness 3/5. The cache is deliberately modest and uses existing props/materials; this is not a new cinematic boss or a broad visual overhaul. Landscape map requires scrolling, as before.

## Release gates

Ad-hoc Apple Silicon package passed deep/strict signature verification and hardware startup. The exact packaged build reported BUILD 4.53.0 and `SMOKE PASS: offline world, shaders, menu and desktop bridge initialized`.

ZIP SHA-256: `4a9851b07c5b2117ee5c2f199fce4467b9259e40f6162aae713120b54c0d81ad`. [GitHub Pages run 38741021613](https://github.com/iamknow0ne/zombibagarre/actions/runs/38741021613) passed for source `cfd5972df889ad3215cf9dd263c5c08485781a8e`. Public title screen reached **BUILD 4.53.0** with no captured console errors; [public screen](public-build.jpg). The [published Mac release](https://github.com/iamknow0ne/zombibagarre/releases/tag/v4.53.0) asset digest exactly matches the tested ZIP above. Automatically triggered Steam Deck run 38741138604 was cancelled because that platform remains deferred. No Apple Developer ID/notarization, physical-phone completion or sustained performance claim.
