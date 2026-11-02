# Compact native Play screen

Approved direction: compact Play screen with a Join sheet, preserving Rinkside on game night.

Mode: Operate. Target: Capacitor iOS/Android home at /app.

Replace the marketing intro and permanently exposed join form with a compact brand/account bar, Play title, dominant Host action and secondary Join action. Keep daily and local practice as clear list destinations. Preserve room validation, optional Clerk accounts, existing haptics and routing. Put legal links in an About disclosure. Use existing colors, fonts and square white planes, with restrained rink markings.

Joining is a focused native HTML dialog styled as a bottom sheet on phones and centered on wider screens. Provide Cancel, automatic field focus, focus containment/restoration, Escape and backdrop dismissal, explicit validation and loading feedback. The daily challenge gets /app/daily with a back link; existing challenge logic stays intact.

Implementation: update AppHome and scoped CSS; add daily route; verify TypeScript, existing tests and browser layouts/flows at narrow phone, phone and tablet widths. Check simulator if available; report unavailable hardware verification honestly.
