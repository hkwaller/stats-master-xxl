# Cards on Ice

Approved November 2026. Replaces "On the Ice / Rinkside". Stats Master is a trading-card game played on the pond: every question is a card you are trying to name, and every player wears their own sweater.

## Surfaces

- The pond is the page: `--color-ice-1` with two long white skate trails and a faint faceoff circle (`.ice-bg`). Keep interactive cards opaque over it.
- UI is white card stock in a 3px `--color-ink` frame, rounded (`--radius-card`, 14-20px), with a hard ink offset (`--shadow-card`, larger cards up to 8px). Depth is the offset, never a blur.
- Buttons, tags and chips are pills. Header bars end on a 3px ink rule. No left-edge accent bars, no gradients, no glows.
- Stamps (GOAL!, LOCKED IN, PENALTY BOX, MVP, IN) are small tilted labels in an ink frame on lemon, mint or pink.

## Colour

- `--color-ink` #14213d: text, frames, offsets. `--color-ink-2` #4a5a78: secondary text and labels (6.9:1 on white).
- `--color-cobalt` #2357ff: primary action, your pick, the leader, focus ring. White text.
- `--color-lemon` #ffd84d: the key stat (PTS), stamps, active power plays, the revealed nameplate. Ink text.
- `--color-tangerine` #ff7a1a: the mystery nameplate ("WHO IS IT?"). Ink text.
- `--color-mint` #2bc48a: goal / correct. Ink text.
- `--color-pink` #ff6fa8: penalty box and WIDE stamps. Ink text.
- `--color-alarm` #d92d20: the last 5 seconds and errors only.
- Jersey colours are their own palette in `lib/jersey.ts` (8 bodies, 8 trims) and only appear on sweaters.

## Type

- Anton (`font-display`), one weight, uppercase: headings, names, big numbers. Font synthesis is off.
- Space Mono bold (`font-mono`): labels, the card-back stat table, room codes, scores in lists. Never below 10px.
- DM Sans (`font-body`): running text.

## The card pieces

- **MysteryCard** - tilted -3deg: cobalt season band, dotted photo slot with a silhouette and "?", hint chips (TEAM / POS / ERA) that flip face up, a tangerine "WHO IS IT?" nameplate that turns lemon with the name on reveal, and a GOAL! or SAVED stamp.
- **CardBack** - the season line like the back of a real card: SEASON, TEAM (??? until hinted), GP, G, A, PTS on lemon, PIM. Stats light up left to right, 60ms apart.
- **Binder** - standings as player cards in their jerseys. Live: a lemon IN stamp or "…". After a reveal: the points for that card with GOAL / WIDE / NO SHOT.
- **AnswerRow** - answers as cards: cobalt letter badge; your pick turns cobalt with LOCKED IN; the right answer mint with a check; an eliminated answer is hatched, struck through and stamped PENALTY BOX.

## Jerseys

- Every player picks a sweater on joining: one of six patterns (plain, hoops, yoke, sleeves, sash, chevron), a body colour, a trim colour (never the same as the body) and a number from 1 to 99.
- The number is the identity and is unique per room (the room server enforces it). Colour and pattern can repeat.
- The jersey is drawn as the back of a hockey sweater: boxy body, long sleeves to the wrist, nickname on the nameplate, number in ink with a trim edge. Below 72px the name drops off.
- Sweaters change in the lobby, between games or on the final board, never mid-game. The device remembers the last one, so a rematch keeps it.
- The host wears a lemon C patch next to their jersey, never on it.

## Screens

- **Lobby** is the locker room: jerseys on hooks along an ink rail, open hooks for free seats, room code and QR below, "Deal cards" in the bar.
- **TV question**: mystery card left, title + clock stamp, card back, four answer cards, binder along the bottom, host controls in the header.
- **Reveal** happens in place: name on the card, stamp, mint answer with pick counts, round points in the binder.
- **Final whistle**: a podium of jerseys, MVP stamp, the rest of the binder, two awards, "Rematch · same jerseys".
- **Phone**: jersey header with rank and score, card back, answer cards, power plays docked at the bottom, standings as jersey cards.

## Motion

- Presses sink 2px into the offset. Stamps slap in, names wipe in (380ms), scores settle 5px (260ms), stats light up 60ms apart.
- Under 5 seconds the clock turns alarm red and its ring pulses at 1Hz. Nothing shakes.
- Respect `prefers-reduced-motion`: drop the animations, keep the end states.
