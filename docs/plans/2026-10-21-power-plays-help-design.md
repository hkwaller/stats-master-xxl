# Power Plays visibility and help

Approved October 21, 2026.

Power Plays work only in Classic. Hide the setup toggle in Career, Head-to-Head and Higher/Lower, and save powerupsEnabled=false for those modes.

Provide an info tooltip beside the Classic setup toggle and the in-game Power Plays heading. Open by hover, keyboard focus or tap; dismiss on Escape, blur, mouse leave or outside tap. Use existing colors, typography and square white surfaces. Keep the panel hoverable and within mobile viewports.

Explain Cut (two wrong answers removed for the player; multiple choice only), Double Down (double points if correct; lose 50 if wrong), Freeze (stop stat reveals for everyone while the answer timer continues), and Rush (immediately reveal the next column for everyone). Freeze and Rush require column-by-column reveals. Each has one use per player per game. Share descriptions between help and existing activation confirmations. Add descriptive labels and hover text to in-game action buttons.

Verify mode-specific settings, normalized saved values, tooltip open/dismiss interactions and action descriptions; run TypeScript and relevant existing tests. Inspect the rendered Classic tooltip and Career settings in the local browser.
