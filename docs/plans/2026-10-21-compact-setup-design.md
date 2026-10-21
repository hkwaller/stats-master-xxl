# Compact game setup

Approved October 21, 2026.

Keep the existing rink identity and game configuration behavior. Make setup an efficient task surface: a smaller title and adjacent progress, compact mode buttons with the selected description below, then difficulty, eras, and format. Put Career instructions in a native, initially collapsed “How to play” disclosure. Keep the pool and Continue action anchored at the bottom.

On desktop, use four mode buttons in one row and the existing two-column settings layout. On mobile, use two mode columns and stacked settings; maintain touch targets and enough bottom space to scroll every setting above the fixed footer. Preserve all mode-specific options, host permissions, pool loading and error states, selection semantics, and keyboard focus.

Implementation is limited to the setup page and its existing CSS rules. Verify TypeScript, existing setup-pool checks, and rendered setup interactions at desktop and mobile sizes.
