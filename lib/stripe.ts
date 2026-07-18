import 'server-only'
import Stripe from 'stripe'

/**
 * Server-side Stripe client + plan/price mapping for the Ad-Free product.
 *
 * There are three tiers (see the Stripe dashboard for this game's account):
 *   - `day`   one-time 24h pass (no auto-renew)  →  mode: 'payment'
 *   - `month` auto-renewing subscription          →  mode: 'subscription'
 *   - `year`  auto-renewing subscription          →  mode: 'subscription'
 *
 * Entitlement is unified as a single `adFreeUntil` timestamp on the Clerk user
 * (see lib/entitlement.ts): the day pass sets it to now+24h; subscriptions keep
 * pushing it to the current period end on each renewal webhook. Ads are hidden
 * whenever `adFreeUntil` is in the future, so both models share one gate.
 */

if (!process.env.STRIPE_SECRET_KEY) {
  // Don't throw at import time in dev without keys - routes guard per-request.
  console.warn('[stripe] STRIPE_SECRET_KEY is not set; Stripe routes will 500.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  typescript: true,
})

export type PlanKey = 'day' | 'month' | 'year'

export function priceIdForPlan(plan: PlanKey): string | undefined {
  switch (plan) {
    case 'day':
      return process.env.STRIPE_PRICE_DAY
    case 'month':
      return process.env.STRIPE_PRICE_MONTH
    case 'year':
      return process.env.STRIPE_PRICE_YEAR
  }
}

/** Day pass is a one-time payment; the recurring tiers use subscription mode. */
export function checkoutModeForPlan(plan: PlanKey): 'payment' | 'subscription' {
  return plan === 'day' ? 'payment' : 'subscription'
}
