# Native AdMob at final results

Approved: test interstitials after multiplayer finals and completed ten-round practice; at least three minutes between ads. Daily remains ad-free.

A shared completion coordinator observes a session while active, waits three seconds after its genuine completion, consumes that placement once, and presents only an already-loaded ad. Restored finals, duplicate callbacks, remounts, route changes, hidden pages and new sessions cannot cause delayed ads. Persist completion history and frequency state on-device. The same coordinator covers Classic, Career, Head-to-Head, Higher / Lower and practice.

A native adapter owns UMP, one-time SDK initialization, coalesced preloading, listener cleanup and presentation state. Eligibility checks include shared policy, supported native/plugin versions, current entitlement, consent, foreground state and a phone-only native presenter guard. Unknown entitlement is ineligible. The current app has no purchases; expose a hook for a future verified billing integration without creating a storefront. Privacy choices live under About and the privacy page. No review system, banners or rewarded mechanics.

Use Google sample app IDs and interstitial units exclusively. Native setup, deployed JS, privacy configuration and future live IDs are separate release steps. UMP owns any ATT prompt; there is no second direct ATT request.

Plan: install pinned compatible plugin; implement adapter and coordinator with injected dependencies; wire active/completed session events; add native display checks and phone-window ownership; add privacy controls/disclosure; sync native dependencies; test race/failure paths, browser safety and native builds where toolchains permit. Native unavailable checks are reported, not claimed.
