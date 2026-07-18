import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

import { stripe } from '@/lib/stripe'

/**
 * Opens the Stripe Customer Portal so a subscriber can update, downgrade, or
 * cancel their plan. Requires a signed-in user who already has a Stripe customer.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const user = await currentUser()
  const customerId = (user?.privateMetadata as { stripeCustomerId?: string })?.stripeCustomerId
  if (!customerId) {
    return NextResponse.json({ error: 'No subscription found.' }, { status: 404 })
  }

  const origin =
    req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/go-ad-free`,
  })

  return NextResponse.json({ url: session.url })
}
