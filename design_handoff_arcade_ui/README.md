# Handoff: Stats Master - "Arcade" UI Redesign (Direction C)

## Overview

Complete visual redesign of Stats Master moving from the current brutalist aesthetic to a bright, playful **"Ice-Rink Arcade"** direction. Affects the Landing page, Setup page, Lobby, and in-game screen. Keeps the existing ice-hockey colour DNA (red, navy, ice-blue, off-white, black) but replaces the current black-border / hard-shadow treatment with chunky puffy 3-D cards, rink-line backgrounds, a puck mascot, and - in-game - a jumbotron LED treatment for the season stat tiles.

## About the Design Files

The files under `reference/` are **design references created in HTML/React (Babel in-browser)** - prototypes showing intended look and behaviour, not production code to copy directly.

The task is to **recreate these designs in the existing Stats Master codebase** (Next.js 15 App Router + React 19 + Tailwind v4, Liveblocks for realtime, Supabase for data - see `stats-master/CLAUDE.md` and `package.json`). Replace the current brutalist design-system (`components/design-system.tsx`) and the token block in `app/globals.css` with the tokens and components described below. Keep all existing business logic, hooks, state machines and Liveblocks wiring intact - this is a pure visual / component refresh.

Only **Direction C - "Arcade"** should be implemented. Directions A and B are present in the reference files for context; ignore them.

## Fidelity

**High-fidelity.** Hex values, font sizes, radii, shadows, spacing and copy below are final. Typography uses Google Fonts `Bungee`, `Archivo Black`, `Space Grotesk`, `JetBrains Mono`, `VT323`.

---

## Design Tokens

Replace the `@theme` block in `app/globals.css` with these tokens.

### Colors

```
--c-ice:      #eaf2ff   /* page background, soft tiles */
--c-ice-2:    #d3e3ff   /* gradient tail, inactive tiles */
--c-cream:    #fdfaf1   /* secondary cards */
--c-ink:      #0a1535   /* text + all borders ("black" in the design) */
--c-navy:     #003087   /* primary brand navy, also jumbotron panel */
--c-red:      #e32437   /* primary action, highlight stat, penalty */
--c-red-soft: #ffd6dc
--c-yellow:   #ffcf33   /* power-play, highlight badges */
--c-green:    #2cc66b   /* online status, "easy" tier */
--c-shadow:   rgba(0,24,60,0.18)

/* LED jumbotron colours (stat tiles only) */
--led-ice-glow: #dce8ff
--led-red-glow: #ffe4e8
--led-dot-blue: #6b8bff   /* dot-matrix overlay on navy panels */
--led-dot-pink: #ffbcc5   /* dot-matrix overlay on red panels */
```

### Typography

| Role        | Family         | Weight  | Notes                                 |
| ----------- | -------------- | ------- | ------------------------------------- |
| Display     | Bungee         | 400     | Logo, big numbers, card titles        |
| Display alt | Archivo Black  | 900     | Small caps labels, button text        |
| Body        | Space Grotesk  | 400–700 | Paragraphs, descriptive copy          |
| Mono        | JetBrains Mono | 500–700 | Tags, room codes, small labels        |
| LED digits  | VT323          | 400     | Jumbotron stat numbers (in-game only) |

Import via `next/font` or add to `<head>`:

```
https://fonts.googleapis.com/css2?family=Bungee&family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=VT323&display=swap
```

### Radius

- Small chips/pills: `8–10px`
- Cards & buttons: `12–16px`
- Hero card / big panels: `16–18px`
- Pill buttons / status badges: `9999px`

### Shadows (signature "puffy" lift)

All borders are **2–3 px solid `--c-ink`**. The lift comes from a hard, zero-blur drop shadow in `--c-ink`, layered with a soft ambient blur.

```
.card-puffy    { border: 3px solid var(--c-ink); box-shadow: 0 8px 0 var(--c-ink); }
.card-puffy-sm { border: 3px solid var(--c-ink); box-shadow: 0 5px 0 var(--c-ink); }
.btn-puffy     { border: 2px solid var(--c-ink); box-shadow: 0 4px 0 var(--c-btn-shadow), 0 6px 14px rgba(0,0,0,0.15); }
```

`--c-btn-shadow` is 20% darker than the button fill (e.g. red button → `#a21726`, navy → `#001e55`, yellow → `#c89a14`). Buttons use a `linear-gradient(180deg, fill 0%, fill 60%, darker 100%)` fill for depth.

On press/hover: `transform: translateY(2px)` and reduce drop shadow by same amount - gives the button-pop feel.

### Spacing

8 px base unit; common gaps: `8 / 10 / 12 / 14 / 18 / 20 / 28 / 40`.

### Backgrounds

**Page (`iceBg`):**

```css
background:
  radial-gradient(ellipse at 20% 0%, #fff 0%, transparent 45%),
  radial-gradient(ellipse at 90% 100%, var(--c-ice-2) 0%, transparent 50%),
  linear-gradient(180deg, #f4f8ff 0%, var(--c-ice) 60%, var(--c-ice-2) 100%);
```

**Rink markings (SVG, `opacity:0.10–0.18`, absolute inset:0, preserveAspectRatio="none"):**

- Outer rounded rectangle stroke in `--c-navy`, `strokeWidth 4`, rx/ry 120.
- Two blue lines (vertical), navy, 4 px.
- Centre red line, red, 5 px, dashed `20 12`.
- Centre face-off circle: navy stroke 4 + red 90 r, dot centre.
- Four faceoff circles in corners: 50 r, navy 3 px.
- See `reference/direction-c-arcade.jsx` → `RinkBg` component.

---

## Components

Create these as React components in `components/arcade/` (or replace the existing `components/design-system.tsx` primitives):

### `<Brand>` - wordmark + puck mascot

- Mascot: inline SVG puck with a face (eyes, blush dots, smile). See `CMascot` in reference. Two moods: `happy` / `sad` (flipped smile).
- Wordmark: `STATS!MASTER` in Bungee; `!` in red; all in `--c-ink`.
- Subtitle: `ICE · TRIVIA · ARCADE` in JetBrains Mono 700 / 9 px / 0.28em tracking.

### `<Btn variant size>`

Variants: `red | navy | white | yellow` - all with the puffy treatment above. Sizes: `sm (8/14 pad, 11px)` / `md (14/20, 14px)` / `lg (18/28, 17px)`. Radius by size: `10 / 12 / 14`.

### `<Card>` - generic puffy card

`bg: white; border: 3px solid ink; radius: 16–18; box-shadow: 0 8px 0 ink;`. Accent variants swap the drop-shadow colour for `--c-red` or `--c-navy`.

### `<Pill>` - status pills

Rounded 9999, 2 px ink border, `0 3px 0 var(--c-ink)` shadow, bold 11 px Archivo Black, 0.2em tracking.

### `<StatTile>` - **JUMBOTRON LED** (in-game only, replaces current stat column)

The most distinctive component. Replaces the current white-tile stats.

Structure:

```
<div class="card-puffy" style="padding:8; background:#fff; radius:16">
  <div class="jumbotron-inner">
    <div class="led-key">{k}</div>
    <div class="led-number">{v}</div>
  </div>
</div>
```

**Inner jumbotron panel:**

- `background: linear-gradient(180deg, PANEL 0%, PANEL 70%, rgba(0,0,0,0.35) 100%)` where `PANEL = var(--c-navy)` for normal stats, `var(--c-red)` for the highlight stat (the "answer" stat, e.g. PTS).
- `border: 2px solid var(--c-ink); border-radius: 10px;`
- `padding: 14px 8px 10px;`
- Inner shadow for "screen" depth: `inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -10px 20px rgba(0,0,0,0.25)`
- **Dot-matrix overlay** (absolute inset:0, `mix-blend-mode: screen`, `opacity: 0.55`): 8×8 SVG of a 1.1 r circle at centre, fill `--led-dot-blue` on navy / `--led-dot-pink` on red, opacity 0.38.

**LED key chip** (stat abbreviation - GP, G, A, PTS, PIM):

- `background: rgba(0,0,0,0.28); color: var(--led-ice-glow)` (or `--led-red-glow` on red panel)
- `font: 900 11px/1 "Archivo Black"; letter-spacing: 0.28em;`
- `padding: 3px 10px; border-radius: 4px; border: 1px solid GLOW44`

**LED number:**

- `font: 900 54px/0.9 "VT323", "JetBrains Mono", monospace;`
- `color: var(--led-ice-glow)` (navy panel) / `var(--led-red-glow)` (red panel)
- `letter-spacing: 0.06em; font-variant-numeric: tabular-nums;`
- Glow: `text-shadow: 0 0 8px GLOW, 0 0 18px GLOWcc, 0 0 32px GLOW88;`

**HOT! badge** on the highlight stat: yellow pill rotated 10°, absolute `top:-6; right:-6`, 2 px ink border, 900 10px Archivo Black.

Reference: `reference/direction-c-arcade.jsx` lines ~530–580 (search `jumbotron LED inside puffy arcade shell`).

### `<MatchCode>` - large room code display

`DQK·VDS` in Bungee 32–56 px, letter-spacing 0.08em. Dot in red.

### `<PlayerChip>`

Puffy card (3 px ink border, 0 5px 0 ink shadow). Grid: avatar (48 px, rounded 12, 2 px ink border) + name (Bungee 16) + score/rank line (JetBrains Mono 700 / 11 / 0.18em). Host chip: red bg white text, `HOST`. Boss chip: yellow bg ink text, `👑 BOSS`. Current user's chip: bg `--c-navy` text white.

### `<CountdownRing>`

100 px SVG. Track `--c-ice-2` 8 px; progress `--c-red` 8 px, `strokeLinecap:round`, rotated -90°. Center number in `Bungee 40px` red.

### `<ComboMeter>`

Pill with 🔥 + "COMBO" label + big `×N` in Bungee 24 red + "ON FIRE" caption.

### `<PenaltyBox>`

Dark ink card, drop shadow in `--c-red`. Inner panel has a repeating-linear-gradient overlay at 90° creating vertical red bars (`repeating-linear-gradient(90deg, transparent 0 14px, #e324376 14px 16px)`).

### `<PowerupButton>`

48 px puffy button, counter badge in red circle at top-right (-8, -8) with `2 px ink` border and white number. Active state uses the variant colour as fill.

---

## Screens

All screens use the `iceBg` page background and `Space Grotesk` as the default body family. All interactive surfaces get the puffy treatment.

### 1. Landing (`app/page.tsx`)

**Top bar** (padding 18/36): `<Brand>` left; right side = online-count pill (white, green dot, "1,284 PLAYING" in 800 11 px Archivo Black) + `<Btn variant="white" size="sm">SIGN IN</Btn>`.

**Hero** (padding 40, relative, overflow hidden):

- Behind: `<RinkBg opacity={0.15}>`.
- Sticker decals (absolute, rotated): yellow "POWER PLAY ⚡" top-right +12°; white "STREAKS ×4 🔥" mid-left −8°. Both are puffy pill cards.
- 2-column grid (1.2fr / 1fr):
  - Left:
    - Red pill badge "🏒 MULTIPLAYER · 2–8 PLAYERS".
    - H1 (`Bungee 108px/0.9`, 3 lines): `FIVE` navy + ` STATS.` ink / `ONE` red + ` LEGEND.` ink / `GO!` in a yellow tilted -2° pill with 3 px ink border and 6 px drop shadow.
    - P (`Space Grotesk 18/1.5`, ink 85%): "The couch-co-op hockey trivia game your group chat has been begging for. Buzz in, build streaks, dodge the penalty box."
    - Buttons: red lg "🎮 CREATE GAME" + white lg "JOIN WITH CODE".
  - Right (440 px tall, relative): floating preview cluster.
    - Mini stat card (rotated -4°, 300 px wide) showing the jumbotron treatment in miniature (20 px LED digits instead of 54).
    - Mini scoreboard card (ink bg, rotated +4°, bottom-right) - top 3 players.
    - Yellow power-play puck (120 px circle, radial gradient yellow→#f0b512, 4 px ink border, "2×" Bungee 30 + "POWER PLAY" label).

**Features strip** (white, 4 px ink top+bottom borders): 4-column grid of cream puffy cards. Each card has a 46 px coloured square icon (red/yellow/navy/ink) with emoji (🏒 🔥 ⚡ 🚫), a Bungee 22 title, and a Space Grotesk 13 description. Copy:

- Stat blitz - "Five stats, four names, twelve seconds. Go."
- Streak combos - "Answer fast, rack up a combo, earn foil bonuses."
- Power plays - "Random 2× windows that flip the leaderboard."
- Penalty box - "Wrong answer in boss mode? Sit two rounds out."

### 2. Setup (`app/[roomId]/setup/page.tsx` - or wherever current setup lives)

Header: brand small + white room-code pill with green dot.

Section heading row:

- Yellow "STEP 1 OF 2" pill.
- H2 `Bungee 60/0.9`: "Set up the _game_" (game in red).
- Right: white `◁ BACK` + red `CONTINUE ▸` buttons.

Two-column (1.1 / 0.9):

- **Game Mode** card - 2×2 grid of mode buttons. Each mode: 36 px coloured square icon (red/navy/yellow/green + emoji 🏒 📈 🤼 ⚖️), Bungee 18 title, Space Grotesk 12 description, radio indicator. Selected state = filled with its colour + 0 5px 0 ink shadow.
- **Answer Mode** sub-section: 2-column puffy toggle ("● MULTIPLE CHOICE" red / "○ FREE TEXT" white).
- **Questions** card - 4-column grid of big Bungee 34 numbers (5/10/15/20); selected = navy fill.
- **Difficulty** card - stacked list of 4 rows (Easy/Medium/Hard/Expert). Each row: 38 px coloured chip with point range (green/navy/red/ink + emoji 🏆 ⭐ 🔥 💀), Bungee 16 label, description, 26 px square checkbox at right.

Difficulty copy:

- Easy · 140+ · "Legends"
- Medium · 120–139 · "All-time greats"
- Hard · 100–119 · "Excellent scorers"
- Expert · 70–99 · "Solid contributors"

### 3. Lobby (`app/[roomId]/page.tsx` lobby state)

Header identical to setup but with red pill "● WAITING TO START" instead of room-code pill.

Heading: yellow "STEP 2 OF 2" pill; H2 Bungee 56: `Lobby · DQKVDS` (dots and half the code in red); right = red `lg` `🎮 DROP THE PUCK`.

Two-column (0.8 / 1.2):

- **Invite** card:
  - Ice-tinted inner card containing a 170 px QR (white bg, 2 px ink border, 10 px padding). Render a real QR in production (e.g. `qrcode.react`).
  - Below QR: code in Bungee 32 (`DQKVDS` with 0.08em tracking); small URL in JetBrains Mono under it.
  - 2-col button row: navy sm `⎘ COPY LINK` + white sm `SHARE`.
  - Cream settings summary card - navy 900-11 "⚙ MATCH SETTINGS" header then rows for Mode / Questions / Difficulty / Reveal.
- **Players** grid (2-column):
  - Host player chip: navy bg / white text / red avatar / red "HOST" chip / yellow "👑 BOSS" chip if boss.
  - Other players: white bg / ink text.
  - Empty slots: 3 px dashed ink-44 border, no shadow, "+ WAITING…" Bungee 14, min-height 86.

### 4. Game (`app/[roomId]/page.tsx` playing state) - **highest priority screen**

**Top scoreboard strip** (ink bg, 4 px red bottom border, padding 14/24, relative):

- Left: 36 px mascot + "STATS!MASTER" / "ARCADE MODE".
- Centre: horizontal player chips. Each chip: ink bg (or red if current user), 2 px border, 10 px radius, 6/10 padding, 22 px avatar + `#{rank} {name}` Archivo Black 10 + score Bungee 13 + optional yellow `×{streak}` Bungee 11.
- Right: yellow "⚡ 2× POWER PLAY · 0:14" pill with white border (only when power play active).

**Question bar + clock row** (3-column):

- Left: white puffy pill with red `Q 4/10` chip + Bungee 20 "WHO'S THIS?" + ice chip "EASY".
- Centre: combo meter pill.
- Right: 100 px countdown ring.

**Stat tiles row** - the 5 `<StatTile>` jumbotron components. Each 20% of the width, 14 px gap. See component spec above. The highlight stat (e.g. PTS) gets the red panel + HOT! badge.

**Answer choices** (2×2 grid, 12 px gap): puffy 16-radius cards. Each has a 48 px coloured letter chip (A red / B navy / C green / D yellow) + Bungee 22 name + JetBrains Mono 11 detail line ("EDM · C · 1997–"). States:

- Selected: `--c-navy` fill, white text, `0 6px 0 ink` shadow, yellow "LOCKED ✓" badge rotated 4°.
- Eliminated (by ✂ powerup): opacity 0.5, disabled, `#d9d9e6` fill, ✂ icon visible.
- Correct reveal: green fill + bounce animation.
- Wrong reveal: red fill + shake animation.

**Bottom row** (1.2 / 1 / 1):

- **Powerups** card - 4 puffy 48 px buttons (✂ Eliminate / ×2 Double / ❄ Freeze / ⚡ Rush). Active button gets variant fill. Count badge top-right.
- **Penalty box** card - ink bg, `0 5px 0 red` shadow. Red "🚫 PENALTY BOX" chip + yellow Bungee 12 countdown. Inner caged panel (see component spec) contains offender's avatar + name + "WRONG ANSWER · 2 ROUNDS".
- **Hints** card - white puffy. "💡 Hints · SHARED" title, then ice pill buttons ("+ ERA", "+ TEAM", "+ POSITION"). Below: a yellow toast "🚜 ZAMBONI INCOMING · NEXT Q IN 0:08" - this is the between-question transition.

---

## Interactions & Behavior

| Trigger | Behaviour |
| --- | --- |
| Answer correct | Green wash on selected card; `score-float` "+100" delta rises 40 px + fades over 1.5 s; combo counter increments with a yellow pulse; if streak ≥ 3, screen flashes yellow at 8% opacity for 200 ms |
| Answer wrong | Red shake on selected card (`translateX` ±8 px, 3 cycles, 300 ms); combo resets to ×0 with grey flash; if in boss mode, player moves to penalty box card |
| Answer eliminated (via ✂) | Card fades to 0.5 opacity over 200 ms; ✂ icon pops in with scale 0→1.2→1 |
| Powerup activated | Button pulses once (scale 1→1.05→1, 250 ms); counter decrements; relevant overlay appears (freeze = ice-blue overlay on clock, rush = extra time bar) |
| Power Play window | Yellow pill appears top-right of scoreboard; duration bar counts down; all correct answers award 2× points; overlay fades out over 400 ms at end |
| Zamboni transition (between Qs) | Yellow toast expands; cross-screen sprite of a Zamboni slides left→right over 1.2 s, wiping a subtle white gradient. Use `framer-motion` (already in deps). Skip if `prefers-reduced-motion`. |
| Host drops puck (lobby → game) | Room state transitions; animate a puck dropping from top-centre, bouncing once, settling, then fading as the game screen fades in |
| Countdown ≤ 3 s | Ring stroke pulses; number scales 1→1.15→1 each second |

All animations should check `prefers-reduced-motion`.

---

## State Management

No changes expected. The existing state machine in `hooks/useHostStateMachine.ts` and Liveblocks rooms remain the source of truth. Replace the visual layer only.

The only new visual state is the Zamboni transition flag, which can be local to the game component (set true on `currentQuestionIndex` change, auto-cleared after 1.2 s).

---

## Assets

- **No bitmap assets needed.** All iconography is emoji or inline SVG (mascot, rink lines, QR, countdown ring, Zamboni - draw the Zamboni as a simple SVG with a rectangular body + yellow top + wheels).
- Replace `GameLogo` in `components/design-system.tsx` with the new `<Brand>`.
- Remove the `halftone` / `stat-shimmer` / `brutalist` utilities from `app/globals.css`.

---

## Files in this bundle

```
design_handoff_arcade_ui/
├─ README.md                           ← this file
└─ reference/
   ├─ index.html                       ← entrypoint; ignore the 3-direction navigation
   ├─ app.jsx                          ← just wires up the 3 directions
   ├─ shared.jsx                       ← MOCK data (players, stats, powerups) you can reuse
   └─ direction-c-arcade.jsx           ← ★ THE DESIGN ★ - CLanding / CSetup / CLobby / CGame
```

**Read order:**

1. `reference/direction-c-arcade.jsx` - everything lives here. Search for `CLanding`, `CSetup`, `CLobby`, `CGame`.
2. `reference/shared.jsx` - mock data shapes for quick reference.
3. This README for the parts that matter (tokens, StatTile spec, behaviour).

---

## Existing codebase references

- `stats-master/components/design-system.tsx` - current primitives to replace (Panel, Button, TierBadge, Avatar, PlayerChip, CountdownRing, Modal, GameHeading, GameLogo, GameDivider, StatLabel).
- `stats-master/app/globals.css` - replace the `@theme` block.
- `stats-master/app/layout.tsx` - add the Google Font imports (or use `next/font`).
- `stats-master/app/page.tsx` - landing.
- `stats-master/app/[roomId]/` - setup/lobby/game pages (follow existing routing).
- `stats-master/components/game/` - game-specific subcomponents to refresh.
- `framer-motion` is already in `package.json` - use it for all the motion above.

## Out of scope

- The NHL wordmark in the current logo is replaced with "STATS!MASTER" (trademark safety).
- No backend changes.
- No new powerups - spec matches existing set (Eliminate, Double, Freeze, Rush).
- No changes to difficulty logic - only the visual labels.
