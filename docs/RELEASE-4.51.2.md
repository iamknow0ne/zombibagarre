# 4.51.2 — Consistent build identity

15 October 2026. This supersedes 4.51.1, whose gameplay fixes were present but
whose hard-coded title/loading labels still said 4.51.0.

The loading screen, title and development diagnostics now derive their version
from the same package metadata used by the Mac and Android builds. A post-build
check rejects missing or stale visible version labels before packaging. This
prevents future patches from looking like an old cached copy.

The [4.51.1 gameplay fixes and QA](RELEASE-4.51.1.md) remain included: safe returns
around falling structural debris and retryable Android audio recovery. Those
changes passed 635 regressions and a 6,000-frame real-browser combat resource
check. The Android build pipeline also passed independently on GitHub (run
38728019789), including packaging, lint and all asset comparisons. That CI APK
has a different debug key and must not be installed over the local phone build.

This follow-up changes release identification, not combat or rendering logic.
The fresh web build verifies both visible labels as 4.51.2. Final native hashes
and publication evidence are recorded below after packaging.

The phone is still locked. Android rendering, touch, audio, file pickers and FPS
remain unverified despite successful APK installation. The Mac edition remains
ad-hoc signed and not notarized; hardware startup is not an endurance test.
