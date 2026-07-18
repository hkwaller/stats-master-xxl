import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'

import { stripe, priceIdForPlan, checkoutModeForPlan, type PlanKey } from '@/lib/stripe'

/**
 * Creates a Stripe Checkout Session for the requested ad-free plan and returns
 * its hosted-page URL. Requires a signed-in Clerk user (guests can't subscribe).
 * The Stripe customer is created once and cached in the user's privateMetadata.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to remove ads.' }, { status: 401 })
  }

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: PlanKey }
  if (plan !== 'day' && plan !== 'month' && plan !== 'year') {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 })
  }

  const price = priceIdForPlan(plan)
  if (!price) {
    return NextResponse.json({ error: 'Plan is not configured.' }, { status: 500 })
  }

  const client = await clerkClient()
  const user = await currentUser()

  // Reuse the cached Stripe customer, or create one and cache it on the user.
  let customerId = (user?.privateMetadata as { stripeCustomerId?: string })?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.emailAddresses[0]?.emailAddress,
      metadata: { clerkUserId: userId },
    })
    customerId = customer.id
    await client.users.updateUserMetadata(userId, {
      privateMetadata: { stripeCustomerId: customerId },
    })
  }

  const origin =
    req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const mode = checkoutModeForPlan(plan)

  const session = await stripe.checkout.sessions.create({
    mode,
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: userId,
    allow_promotion_codes: true,
    metadata: { clerkUserId: userId, plan },
    // Mirror the mapping onto the subscription so subscription.* webhooks can
    // resolve the Clerk user without a customer lookup.
    ...(mode === 'subscription'
      ? { subscription_data: { metadata: { clerkUserId: userId, plan } } }
      : {}),
    success_url: `${origin}/go-ad-free?status=success`,
    cancel_url: `${origin}/go-ad-free?status=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
