# Penalty fill and viewport-aware player suggestions

Approved October 21, 2026: the penalty status has a full-height, subtle hatched fill that drains right to left while its label stays stationary. Use the shared ten-second penalty deadline, freeze on manual pauses, and preserve the countdown with reduced motion.

Player suggestions choose above or below the input based on available visual viewport space. Cap their height and allow scrolling; preserve mouse, touch, and keyboard selection, and keep the active result visible.

## Implementation plan

1. Animate a decorative fill from the authoritative remaining penalty time, cancelling/restarting correctly on pause/resume and respecting reduced motion.
2. Measure the input and visual viewport on opening, scroll, and resize; place the suggestion list on the better side with a bounded height.
3. Verify narrow/short viewports, selection and scrolling, deadline expiry, pause/resume, and reduced motion. Run existing game-control regression checks and TypeScript.

The writing-plans skill referenced by brainstorming is not installed; this document includes the implementation plan.
