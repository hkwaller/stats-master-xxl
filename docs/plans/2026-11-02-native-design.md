# Stats Master native app

Approved in chat November 2, 2026, including a dedicated /app home and app.playam.statsmaster identity.

Capacitor iOS and Android load https://statsmaster.playam.app/app because the existing Next.js actions, Clerk, Supabase data and PartyServer rooms require servers. Preserve the web homepage and hockey visual system. The app home offers host, join, daily and local Classic practice. Ship a bundled, styled offline home and practice using a checked-in NHL snapshot and shared pure answer/scoring helpers. Practice has no authoritative history or daily score effects.

Centralize SSR-safe native helpers and optional-plugin guards. Hydrate guest identity before dependent game UI, then mirror guest updates to Preferences. Haptics attach to deliberate selection and result events. Use native keyboard resizing and one safe-area model. No TV, ads or purchases.

## Implementation checklist

1. Add matching Capacitor 8 platforms/plugins and release-safe configuration.
2. Add /app home, shared Classic practice, local data/fonts and bundled fallback with health-checked retry.
3. Add native boot, guest persistence, safe areas, lifecycle and haptics.
4. Generate iOS/Android, name Xcode workspace/target/product/scheme, supply brand assets.
5. Build/sync, run web and native checks, exercise available browser/simulator flows.
6. Document confirmed evidence and remaining signing/store/device tasks in NATIVE.md.

Remote web deployments remain a release dependency; store review rules still apply. Only the production origin is in release navigation configuration; auth and deep links require verification against the actual account configuration.
