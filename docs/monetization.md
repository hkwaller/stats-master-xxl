# Monetization — ads + remove-ads subscription

Adsterra ads for guests/free users, with a Stripe "Go Ad-Free" upsell. Built on
the game-monetization skill.

## The model

- Guests and signed-out users see ads. **Sign-in (Clerk) is required to buy.**
- Entitlement is ONE timestamp on the Clerk user: `publicMetadata.adFreeUntil`.
  - Day pass → `now + 24h` (stacks onto remaining time).
  - Subscriptions → pushed to the current period end on each renewal webhook.
  - Ads are hidden whenever `adFreeUntil` is in the future — one gate, both models.
- Stripe customer id is cached in `privateMetadata.stripeCustomerId`.
- **Host perk:** if the host is ad-free when a game starts, `hostAdFree` is
  stamped into the Liveblocks room and in-game/end-screen ads are suppressed for
  everyone in that room. Captured at start; a mid-game purchase applies next game.

## Tiers (hybrid) — NOK

| Plan  | Type      | Price   | metadata                     | Stripe price env    |
| ----- | --------- | ------- | ---------------------------- | ------------------- |
| day   | one_time  | 19 kr   | `plan=day`, `grant_hours=24` | `STRIPE_PRICE_DAY`  |
| month | recurring | 39 kr/mo| `plan=month`                 | `STRIPE_PRICE_MONTH`|
| year  | recurring | 299 kr/yr| `plan=year`                 | `STRIPE_PRICE_YEAR` |

Amounts in øre: 19 kr = `1900`, 39 kr = `3900`, 299 kr = `29900`.

## Stripe objects

- Account: **_(fill in the Stripe account/email here)_**
- Product: `Stats Master Ad-Free`
- Price IDs (test):  day `price_…`  ·  month `price_…`  ·  year `price_…`
- Price IDs (live):  day `price_…`  ·  month `price_…`  ·  year `price_…`

### Create them (test mode) via curl

```bash
KEY=sk_test_...   # your Stripe TEST secret key

PRODUCT=$(curl -s https://api.stripe.com/v1/products -u "$KEY:" \
  -d name="Stats Master Ad-Free" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# Day pass — one-time
curl -s https://api.stripe.com/v1/prices -u "$KEY:" \
  -d product="$PRODUCT" -d currency=nok -d unit_amount=1900 \
  -d lookup_key=adfree_day \
  -d "metadata[plan]=day" -d "metadata[grant_hours]=24"

# Monthly — recurring
curl -s https://api.stripe.com/v1/prices -u "$KEY:" \
  -d product="$PRODUCT" -d currency=nok -d unit_amount=3900 \
  -d "recurring[interval]=month" -d lookup_key=adfree_month \
  -d "metadata[plan]=month"

# Yearly — recurring
curl -s https://api.stripe.com/v1/prices -u "$KEY:" \
  -d product="$PRODUCT" -d currency=nok -d unit_amount=29900 \
  -d "recurring[interval]=year" -d lookup_key=adfree_year \
  -d "metadata[plan]=year"
```

Copy each returned `id` (`price_…`) into `.env.local` (`STRIPE_PRICE_DAY/_MONTH/_YEAR`).
Verify `livemode` on each response is `false` for test objects. Repeat with the
live key for production.

## Env vars

See `.env.example`. Client-exposed: `NEXT_PUBLIC_ADSTERRA_KEY` (banner),
`NEXT_PUBLIC_ADSTERRA_POPUNDER_SRC`. Server-only: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_DAY/_MONTH/_YEAR`.

## Webhook

Route: `app/api/stripe/webhook/route.ts` (Node runtime, raw body).
Events: `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`.

- Dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, paste the
  printed `whsec_…` into `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.
- Prod: dashboard endpoint at `https://<domain>/api/stripe/webhook` subscribed to
  the four events above; copy its signing secret.

## Files

- `lib/stripe.ts`, `lib/entitlement.ts`
- `hooks/useAdFree.ts`, `hooks/useInGameAdsSuppressed.ts`
- `app/api/stripe/{checkout,portal,webhook}/route.ts`
- `components/ads/AdsterraBanner.tsx` (self-gating + `suppressed` prop),
  `components/ads/AdsterraPopunder.tsx`
- `app/go-ad-free/page.tsx` (pricing page)
- Host perk: `hostAdFree` in `types/game.ts`, `GameRoomProvider.tsx` initial
  storage, set in `useStartGame` / reset in `useRematch` (`lib/liveblocks/mutations.ts`),
  passed from `app/[roomId]/lobby/page.tsx`.

## Ad placement

- Banner (self-gating): landing, setup, lobby, and the player end screen.
- Popunder: player end screen only (never the shared host display, never mid-question).

## Middleware

`middleware.ts` uses `clerkMiddleware()` with no route protection, so all routes
(including `/go-ad-free` and `/api/stripe/*`) are already public. The webhook is
authed by its Stripe signature. No allow-list changes were needed.

## Test checklist

Card `4242 4242 4242 4242`, any future expiry/CVC.

1. Sign in → buy day pass → ads vanish; `/go-ad-free` shows "Day pass … until <time>".
2. Buy monthly → ad-free + "Manage subscription" opens the portal.
3. Cancel in portal → stays ad-free to period end, then ads return.
4. Guest/signed-out → always sees ads.
5. Multiplayer: ad-free host starts a game → joined players see no in-game ads.
