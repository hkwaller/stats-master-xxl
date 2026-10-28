# Pause controls and timed career penalties

Approved behavior: host and boss can pause/resume from the shared display and player controls. A room pause freezes timers, season reveals, answers, buzzing, hints and powerups. Everyone sees a paused status. Career wrong guesses prevent buzzing for ten seconds, with a visible countdown, then allow another attempt in the same round. Manual pauses also freeze penalties.

## Implementation plan

1. Store an optional room pause timestamp and per-player career penalty deadlines in PartyServer. Keep defaults compatible with existing rooms.
2. On resume, shift question start, existing career buzz pause and penalty deadlines by the manual pause duration. This excludes manual pauses from speed scoring and preserves overlapping buzz pauses.
3. Guard gameplay mutations and scheduled state transitions while paused. Preserve the active answering slot and input draft.
4. Add Pause/Resume controls and a shared paused status. Disable player interactions, and derive penalty countdowns/counts from shared deadlines.
5. Verify permission checks, timer/scoring preservation, nested pauses, penalty expiry/re-entry, and round/rematch resets with regression tests; run TypeScript checks.

The writing-plans skill referenced by brainstorming is not installed; this document includes the implementation plan instead.
