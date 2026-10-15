# 4.53.0 — The Last Signal

15 October 2026. The first optional combat encounter above the streets.

Open the city map, choose **Places & services → Rooftop access → Last Signal / Rooftop**, and follow the route to the street-side grapple point. Land on the service roof to awaken its spitter guardian. Clear it, approach the green radio case and interact to recover 60 crowns, 60 character XP, ammunition and two grenades. The guardian also grants its ordinary kill reward.

- Rooftop enemies navigate around cover on their own floor, respect parapets and fall when support is destroyed. Raised drops fall onto the next remaining surface.
- The guardian is optional: it does not hold up waves or count toward wave kills. Its living state, cleared cache and claimed reward persist through district travel and expedition checkpoints. A collapsed host loses its cache.
- The case has a radio antenna, state light and opening lid. It uses the existing compact touch action and keyboard/controller interaction prompt. Map labels reflect whether supplies are ready or recovered.
- The recovered manifest hints at a hangar beyond Old Mill Road. This is story foreshadowing; the hangar and spacecraft are still future work.

## Validation

703 gameplay regressions, 89 actual-model checks and 64 city/campaign checkpoint continuation checks passed. Production build and visible-version gate passed. Real browser review covered grapple arrival, guardian combat, one-time cache reward, building collapse, compact touch action, the normal city-map route and an 844×390 landscape layout. See [QA evidence](qa/4.53.0/README.md).

## Boundaries

One guardian/cache template on the existing generated service roof, not a network of new roof levels. No new interiors, hangar, spacecraft or planets yet. Browser touch-layout checks are not physical phone/controller acceptance. Mac hardware startup is a separate packaging gate, not an endurance or FPS benchmark. Android's prior system-dialog issue and deferred Steam Deck/Apple notarization work remain unchanged.

## Mac test package

Apple Silicon ZIP: `Zombie-Bagarre-4.53.0-macOS-arm64.zip`.
SHA-256: `4a9851b07c5b2117ee5c2f199fce4467b9259e40f6162aae713120b54c0d81ad`.
Deep/strict ad-hoc signature verification and hardware-GPU startup passed on this Mac. This is a local test edition, not Developer ID signed/notarized.
