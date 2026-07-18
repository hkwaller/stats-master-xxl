/**
 * Ad-free entitlement, stored on the Clerk user and read on both client & server.
 *
 * publicMetadata (client-readable via useUser):
 *   adFreeUntil:  ISO timestamp - ads hidden while this is in the future
 *   adFreePlan:   'day' | 'month' | 'year' - informational (latest purchase)
 *   subStatus:    Stripe subscription status, or 'day-pass' for the one-time pass
 * privateMetadata (server only):
 *   stripeCustomerId: the Stripe customer for this user
 */
export type AdFreePublicMetadata = {
  adFreeUntil?: string
  adFreePlan?: 'day' | 'month' | 'year'
  subStatus?: string
}

/** True when the given metadata grants ad-free right now. */
export function isAdFree(meta: AdFreePublicMetadata | undefined | null): boolean {
  if (!meta?.adFreeUntil) return false
  const until = Date.parse(meta.adFreeUntil)
  return Number.isFinite(until) && until > Date.now()
}
