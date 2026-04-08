# NHL Stats Master

Multiplayer trivia game where players guess NHL players from revealed statistics.

## Data Source

Player-season data lives in the **Supabase `nhl_player_seasons` table** — 46,704 records covering the complete NHL history (1917-18 → 2024-25, all scoring levels).
- All data access goes through `lib/data/database.ts` (server-only, async functions)
- Classic mode queries rows with `points >= 70` (2,182 records)
- Career mode queries all seasons per player (full careers)
- To refresh data: `node scripts/scrape-nhl.mjs` then `node scripts/load-to-supabase.mjs`

`lib/data/database.ts` is marked `server-only` — never import it in client components.
Client-side player search uses the API route `/api/players/search`.

## Difficulty Tiers

| Tier   | Points |
|--------|--------|
| easy   | 140+   |
| medium | 120–139|
| hard   | 100–119|
| expert | 70–99  |

## Game State Machine

```
idle → starting → question → answering → revealing → next → (loop or finished) → rematch
```

## Liveblocks Storage

Storage key is `game` (not `gameState`). Access in mutations:
```ts
const game = storage.get('game') as unknown as LiveObject<GameState>
```

`players` is a `LiveList<Player>` — always use the self-healing pattern before operating on it.
`questionSequence`, `answers`, `answeredAt`, `hintsUsed`, `playerPowerups` are plain objects/arrays.

## Scoring

- Correct answer: 100 pts base
- Speed bonus: 0–50 pts (linear over 40s window)
- Hint penalty: -10 pts per hint used (min 0 earned)
- Double Down powerup: 2× if correct, -50 if wrong
- Wrong/no answer: 0 pts

## Answer Correctness (freetext)

Normalize: lowercase + trim + collapse spaces. Accept full name OR last name only.

## Route Structure

```
/nhl-stats-master                         Landing — create or join room
/nhl-stats-master/[roomId]/setup          Host configures game
/nhl-stats-master/[roomId]/lobby          Players wait + QR code
/nhl-stats-master/[roomId]/connect        Mobile join page (no ads)
/nhl-stats-master/[roomId]/game           Shared host screen (no ads)
/nhl-stats-master/[roomId]/player/[id]    Individual player device (no ads)
```

## Env Vars

See `.env.example`. Copy to `.env.local` and fill in values.

## Dev

```bash
npm install
npm run dev
```
