# Bundled Classic practice

`questions.json` is the Classic pool (points >= 70) exported from the existing local `scores.js` NHL scrape on November 2, 2026. It contains 2,234 player-season records. The local scrape is intentionally ignored; the snapshot is checked in so clean clones can build offline without database credentials. Refresh deliberately after updating the underlying NHL data; never put server credentials in this bundle.

The practice component reuses `lib/data/choices.ts` and the exact Classic answer/scoring helpers in `lib/game/classic.ts`, also imported by authoritative room rules. It does not simulate rooms, accounts, Career, Head-to-Head, Higher / Lower, or the authoritative daily challenge. Scores are in-memory and are not uploaded.

Fonts are the existing website's Latin WOFF2 files (Big Shoulders, Archivo, Barlow Condensed, JetBrains Mono), with upstream OFL notices in `fonts/`. CSS explicitly scans reused components. All assets use relative paths. `scripts/build-native.mjs` writes the exact retry URL after Vite finishes.
