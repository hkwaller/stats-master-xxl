# NHL Stats Master

Multiplayer trivia game where players guess NHL players from revealed statistics.

## Data Source

Player-season data lives in the **Supabase `nhl_player_seasons` table** - 46,704 records covering the complete NHL history (1917-18 → 2024-25, all scoring levels).

- All data access goes through `lib/data/database.ts` (server-only, async functions)
- Classic mode queries rows with `points >= 70` (2,182 records)
- Career mode queries all seasons per player (full careers)
- To refresh data: `node scripts/scrape-nhl.mjs` then `node scripts/load-to-supabase.mjs` then `node scripts/generate-player-names.mjs`
- Player autocomplete uses `lib/data/player-names.json` (7,745 unique players) - regenerate with the script above after a data refresh

`lib/data/database.ts` is marked `server-only` - never import it in client components. Client-side player search uses the API route `/api/players/search`.

## Difficulty Tiers

| Tier   | Points  |
| ------ | ------- |
| easy   | 140+    |
| medium | 120–139 |
| hard   | 100–119 |
| expert | 70–99   |

## Game State Machine

```
idle → starting → question → answering → revealing → next → (loop or finished) → rematch
```

## Liveblocks Storage

Storage key is `game` (not `gameState`). Access in mutations:

```ts
const game = storage.get('game') as unknown as LiveObject<GameState>
```

`players` is a `LiveList<Player>` - always use the self-healing pattern before operating on it. `questionSequence`, `answers`, `answeredAt`, `hintsUsed`, `playerPowerups` are plain objects/arrays.

## Scoring

- Correct answer: 100 pts base
- Speed bonus: 0–50 pts (linear over 40s window)
- Hint penalty: -10 pts per hint used (min 0 earned)
- Double Down powerup: 2× if correct, -50 if wrong
- Wrong/no answer: 0 pts

## Answer Correctness (freetext)

Normalize: lowercase + trim + collapse spaces. Accept full name OR last name only.

## Design System — "On the Ice"

Broadcast-hockey visual system. Tokens live in the `@theme` block in `app/globals.css`;
never hardcode a colour that has a token.

- **Ice is the page.** `.ice-bg` paints the white-to-pale-blue gradient and lays skate
  scuffs over it via `::before` (z-index 0), so page content needs `relative z-[2]`.
  `RinkBg` adds the rink geometry (blue lines, centre line, faceoff circle).
- **Planes, not boxes.** UI sits *on* the ice as flat white planes: `.on-ice`
  (ambient shadow) or `.on-ice-header`. Square corners everywhere — no radius, no
  outlines. Separation comes from hairlines (`rgba(13,27,42,0.10)`) and a 5–6px
  coloured left edge marker.
- **Ink and one accent.** Navy `#0d1b2a` is the ink, `#55677d` the lightest
  permitted secondary on white. Red `#cf0a2c` is the only accent — leader, live,
  primary action. Amber `#f2b21c` is trim only: the `Kickplate` under header bars.
- **The jumbotron is the one dark object** and the only place amber LED type appears.
  Use `Jumbotron` (5-cell stat line) or `JumbotronPanel` (free-form).
- **Type.** `font-display` (Big Shoulders, 700/800, uppercase) for headings, names and
  numbers; `font-led` (Barlow Condensed) for LED digits; `font-body` (Archivo) for
  prose; `font-mono` (JetBrains Mono) for labels — never below 9px, use `MonoLabel`.
- **Icons** are Lucide at 2–2.4 stroke width. No emoji.
- **Never encode state in colour alone.** Eliminated answers also carry the
  `.penalty-hatch` fill and a `PENALTY BOX` label; the leader also carries rank 1;
  "answered" is a navy bar, not a hue; toggles read ON/OFF.
- **Motion is flat.** 1px press, no bounce or scale. The one flourish is the
  jumbotron's left-to-right cell illumination (60ms stagger). Under 5s the clock goes
  red and the progress track pulses — no shake.

Shared building blocks: `components/design-system.tsx` (Button, MonoLabel, TierBadge,
Avatar, ProgressTrack, Clock, Kickplate, Ticker, Modal, GameHeading),
`components/arcade/*` (PuckMark, CBrand, RinkBg, FaceoffCircle, Jumbotron),
`components/game/*` (Scorebug, AnswerRow, SideRail, Scoreboard/FinalBoard,
PowerupBar, HintPanel, PlayerNameInput).

The full handoff spec is `~/Downloads/Hockey app design critique.zip`
(`design_handoff_on_the_ice/`) — section **3a — ON THE ICE** is the approved direction.

## Route Structure

```
/                             Landing - create or join room
/[roomId]/setup               Host configures game
/[roomId]/lobby               Players wait + QR code
/[roomId]/connect             Mobile join page (no ads)
/[roomId]/game                Shared host screen (no ads)
/[roomId]/player/[id]         Individual player device (no ads)
```

## Env Vars

See `.env.example`. Copy to `.env.local` and fill in values.

## Dev

```bash
npm install
npm run dev
```
