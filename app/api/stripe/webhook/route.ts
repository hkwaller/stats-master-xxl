import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe'
import type { AdFreePublicMetadata } from '@/lib/entitlement'

/**
 * Stripe webhook. Translates Stripe events into the unified `adFreeUntil`
 * entitlement on the Clerk user (see lib/entitlement.ts).
 *
 * Must run on the Node runtime and read the RAW body - signature verification
 * fails against a parsed/re-serialized body. This route needs no auth gating
 * (Stripe is unauthenticated; the signature is the auth); the middleware here
 * leaves all routes public.
 */
export const runtime = 'nodejs'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

async function setAdFree(clerkUserId: string, patch: AdFreePublicMetadata) {
  const client = await clerkClient()
  const existing = await client.users.getUser(clerkUserId)
  const prev = (existing.publicMetadata ?? {}) as AdFreePublicMetadata
  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { ...prev, ...patch },
  })
}

/** Resolve the Clerk user id from a subscription, falling back to the customer. */
async function clerkIdFromSubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  const fromSub = (sub.metadata as Record<string, string>)?.clerkUserId
  if (fromSub) return fromSub
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return undefined
  return (customer.metadata as Record<string, string>)?.clerkUserId
}

/** Period end lives on the item in newer API versions; fall back to the sub. */
function subscriptionPeriodEndMs(sub: Stripe.Subscription): number | undefined {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  const seconds =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  return typeof seconds === 'number' ? seconds * 1000 : undefined
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Subscription checkouts are entitled via subscription.* events below.
        if (session.mode !== 'payment') break
        const clerkUserId =
          session.metadata?.clerkUserId ?? session.client_reference_id ?? undefined
        if (!clerkUserId) break

        // Day pass: grant 24h, stacking onto any remaining time.
        const client = await clerkClient()
        const user = await client.users.getUser(clerkUserId)
        const prev = (user.publicMetadata ?? {}) as AdFreePublicMetadata
        const prevUntil = prev.adFreeUntil ? Date.parse(prev.adFreeUntil) : 0
        const base = Math.max(Date.now(), Number.isFinite(prevUntil) ? prevUntil : 0)
        const until = new Date(base + 24 * 60 * 60 * 1000).toISOString()
        await setAdFree(clerkUserId, {
          adFreeUntil: until,
          adFreePlan: 'day',
          subStatus: 'day-pass',
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const clerkUserId = await clerkIdFromSubscription(sub)
        if (!clerkUserId) break
        const plan = (sub.metadata as Record<string, string>)?.plan as 'month' | 'year' | undefined
        const periodEnd = subscriptionPeriodEndMs(sub)
        const active = sub.status === 'active' || sub.status === 'trialing'
        await setAdFree(clerkUserId, {
          subStatus: sub.status,
          ...(active && periodEnd
            ? { adFreeUntil: new Date(periodEnd).toISOString(), adFreePlan: plan }
            : {}),
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const clerkUserId = await clerkIdFromSubscription(sub)
        if (!clerkUserId) break
        // Entitlement was already set to the period end; it expires naturally.
        await setAdFree(clerkUserId, { subStatus: 'canceled' })
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe] handler error', event.type, err)
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
