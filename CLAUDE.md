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

## Multiplayer rooms

PartyServer runs one Cloudflare Durable Object per room. Plain JSON game state is
persisted and broadcast after validated actions. `lib/party/rules.ts` holds game
rules, `reducer.ts` enforces signed identities and phases, and `protocol.ts` validates
socket payloads. Components use the existing hooks in `lib/party/mutations.ts`
and selectors in `client.tsx`. See `party/README.md` for local setup and deployment.

## Scoring

- Correct answer: 100 pts base
- Speed bonus: 0–50 pts (linear over 40s window)
- Hint penalty: -10 pts per hint used (min 0 earned)
- Double Down powerup: 2× if correct, -50 if wrong
- Wrong/no answer: 0 pts

## Answer Correctness (freetext)

Normalize: lowercase + trim + collapse spaces. Accept full name OR last name only.

## Design System - "Cards on Ice"

A trading-card game played on the pond. Tokens live in the `@theme` block in `app/globals.css`; never hardcode a colour that has a token. `DESIGN.md` has the full rules.

- **The pond is the page.** `.ice-bg` paints pale ice (`--color-ice-1`) with two long white skate trails and a faint faceoff circle via `::before` (z-index 0), so page content needs `relative z-[2]`.
- **Cards, not planes.** UI sits on the ice as white cards in a 3px ink frame with a rounded corner and a hard offset shadow: `.on-ice` (`--radius-card` 16px, `--shadow-card` 4px 4px). Buttons and tags are pills. No blur shadows, no left-edge accent bars.
- **Ink and a small box of colours.** Navy `--color-ink` (#14213d) is text and every frame; `--color-ink-2` the lightest secondary on white. `--color-cobalt` is action, your pick and the leader (white text). `--color-lemon` marks the key stat (PTS), stamps and power plays; `--color-tangerine` the mystery nameplate; `--color-mint` a goal; `--color-pink` the penalty box. All four carry ink text. `--color-alarm` is only for the last 5 seconds and errors.
- **Cards carry the game.** `MysteryCard` (tilted card, photo slot, hint chips, nameplate, GOAL!/SAVED stamp), `CardBack` (season line in Space Mono, PTS on lemon, stats light up left to right), `Binder` (standings as player cards), `TvHeader`, `ClockStamp` - all in `components/cards/`.
- **Jerseys identify players.** Every `Player` has a `jersey` (pattern, body, trim, number 1-99, unique per room) validated by the room server; `components/game/Jersey.tsx` draws the back of a hockey sweater (name drops below 72px), `SweaterPicker` lets players choose one. Helpers in `lib/jersey.ts` (DOM-free, shared with the party server) and `lib/jersey-storage.ts` (browser). Show a player by their jersey, never a generic avatar.
- **Type.** `font-display` (Anton, one weight, uppercase) for headings, names and big numbers; `font-body` (DM Sans) for prose; `font-mono` (Space Mono, bold) for labels, stat lines and room codes - use `MonoLabel`, never below 10px. Font synthesis is off, so don't ask Anton for bold.
- **Icons** are Lucide at 2.4-3 stroke width. No emoji.
- **Never encode state in colour alone.** Your pick carries a check and a LOCKED IN stamp; an eliminated answer is struck through with a PENALTY BOX stamp in a dashed frame; results read GOAL / WIDE / NO SHOT; the leader keeps rank 1.
- **Motion.** Presses sink 2px into the offset. Stamps slap in, names wipe in, stats light up 60ms apart. Under 5s the clock goes alarm red and its ring pulses - no shake. Respect `prefers-reduced-motion`.

Shared building blocks: `components/design-system.tsx` (Button, MonoLabel, TierBadge, ProgressTrack, Clock, Modal, GameHeading), `components/cards/*`, `components/arcade/Brand.tsx` (PuckMark, CBrand), `components/game/*` (Jersey, SweaterPicker, AnswerRow, Scoreboard/FinalBoard, PlayerScorebug, SideRail, PowerupBar, HintPanel, PlayerNameInput).

The approved direction is "Cards on Ice" on the Stats Master Redesign canvas (rows 4-6).

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
npm run party:dev # separate terminal
npm run dev
```
