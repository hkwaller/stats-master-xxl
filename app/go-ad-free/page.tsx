'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { SignInButton, useUser } from '@clerk/nextjs'

import { Button, GameDivider } from '@/components/design-system'
import { CBrand } from '@/components/arcade'
import { isAdFree, type AdFreePublicMetadata } from '@/lib/entitlement'

type PlanKey = 'day' | 'month' | 'year'

const TIERS: {
  plan: PlanKey
  name: string
  price: string
  cadence: string
  blurb: string
  accent: string
  featured?: boolean
}[] = [
  {
    plan: 'day',
    name: 'Day Pass',
    price: '19 kr',
    cadence: 'one-time · 24 hours',
    blurb: 'Kill the ads for a single session. No auto-renew.',
    accent: '#003087',
  },
  {
    plan: 'month',
    name: 'Monthly',
    price: '39 kr',
    cadence: 'per month',
    blurb: 'Ad-free every game. Cancel anytime.',
    accent: '#e32437',
    featured: true,
  },
  {
    plan: 'year',
    name: 'Yearly',
    price: '299 kr',
    cadence: 'per year',
    blurb: 'Best value - over a third off the monthly price.',
    accent: '#ffcf33',
  },
]

function formatUntil(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function GoAdFreeInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, isLoaded, isSignedIn } = useUser()
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)
  const pollStarted = useRef(false)

  const meta = (user?.publicMetadata ?? {}) as AdFreePublicMetadata
  const adFree = isAdFree(meta)
  const isDayPass = meta.subStatus === 'day-pass'
  const isSubscriber = !isDayPass && !!meta.subStatus && meta.subStatus !== 'canceled'
  const status = params.get('status')

  // After returning from Checkout, the webhook writes entitlement asynchronously.
  // Poll the Clerk user a few times so this page reflects the new state.
  useEffect(() => {
    if (status !== 'success' || pollStarted.current || !user) return
    pollStarted.current = true
    setPolling(true)
    let tries = 0
    const tick = async () => {
      tries += 1
      await user.reload()
      const fresh = (user.publicMetadata ?? {}) as AdFreePublicMetadata
      if (isAdFree(fresh) || tries >= 6) {
        setPolling(false)
        return
      }
      setTimeout(tick, 1500)
    }
    void tick()
  }, [status, user])

  const startCheckout = useCallback(async (plan: PlanKey) => {
    setError('')
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout.')
        setLoadingPlan(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Something went wrong. Try again.')
      setLoadingPlan(null)
    }
  }, [])

  const openPortal = useCallback(async () => {
    setError('')
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not open the billing portal.')
        setPortalLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Something went wrong. Try again.')
      setPortalLoading(false)
    }
  }, [])

  return (
    <main className="ice-bg min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <button
          onClick={() => router.push('/')}
          className="text-sm font-bold text-[#6b7ea0] hover:text-[#0a1535] mb-6"
        >
          ← Back
        </button>

        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <CBrand />
          <h1
            style={{
              fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
              fontSize: 40,
              lineHeight: 0.95,
              color: '#0a1535',
            }}
          >
            Go Ad-Free
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body), "Space Grotesk", sans-serif',
              fontSize: 15,
              color: '#6b7ea0',
              maxWidth: 460,
            }}
          >
            Ditch the banners and popups. Host a game ad-free and your whole room plays clean - the
            perk covers everyone you invite.
          </p>
        </div>

        {/* ── Ad-free confirmation ─────────────────────────────────────────── */}
        {isLoaded && isSignedIn && adFree && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white card-puffy p-8 text-center max-w-lg mx-auto"
          >
            <div className="text-5xl mb-3">🎉</div>
            <h2
              style={{
                fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                fontSize: 24,
                color: '#0a1535',
              }}
            >
              You&apos;re ad-free
            </h2>
            <p className="text-[#6b7ea0] mt-2 text-sm">
              {isDayPass ? 'Day pass active' : `${meta.adFreePlan ?? 'Subscription'} plan`} · until{' '}
              <strong className="text-[#0a1535]">{formatUntil(meta.adFreeUntil)}</strong>
            </p>
            {isSubscriber && (
              <div className="mt-6">
                <Button variant="secondary" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </Button>
              </div>
            )}
            {isDayPass && (
              <p className="text-xs text-[#6b7ea0] mt-4">
                Want it permanent? Grab a subscription below when your pass runs out.
              </p>
            )}
          </motion.div>
        )}

        {/* ── Polling after successful checkout ────────────────────────────── */}
        {isLoaded && isSignedIn && !adFree && polling && (
          <div className="bg-white card-puffy p-8 text-center max-w-lg mx-auto">
            <div className="w-10 h-10 border-4 border-[#003087] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#0a1535] font-bold">Confirming your purchase…</p>
            <p className="text-[#6b7ea0] text-sm mt-1">This only takes a moment.</p>
          </div>
        )}

        {/* ── Tier cards ───────────────────────────────────────────────────── */}
        {isLoaded && !(isSignedIn && adFree) && !polling && (
          <>
            {status === 'cancelled' && (
              <p className="text-center text-sm text-[#e32437] font-bold mb-4">
                Checkout cancelled - no charge was made.
              </p>
            )}
            {error && <p className="text-center text-sm text-[#e32437] font-bold mb-4">{error}</p>}

            <div className="grid gap-5 md:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.plan}
                  className="bg-white card-puffy p-6 flex flex-col"
                  style={{
                    outline: tier.featured ? '3px solid #e32437' : undefined,
                    outlineOffset: tier.featured ? 2 : undefined,
                  }}
                >
                  {tier.featured && (
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        background: '#e32437',
                        color: '#fff',
                        border: '2px solid #0a1535',
                        borderRadius: 9999,
                        padding: '2px 10px',
                        fontFamily: 'var(--font-archivo-black), sans-serif',
                        fontSize: 9,
                        letterSpacing: '0.16em',
                        marginBottom: 10,
                      }}
                    >
                      MOST POPULAR
                    </span>
                  )}
                  <div
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 20,
                      color: tier.accent === '#ffcf33' ? '#0a1535' : tier.accent,
                    }}
                  >
                    {tier.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-bungee), "Bungee", sans-serif',
                      fontSize: 34,
                      color: '#0a1535',
                      marginTop: 6,
                    }}
                  >
                    {tier.price}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#6b7ea0',
                      marginTop: 2,
                    }}
                  >
                    {tier.cadence}
                  </div>
                  <GameDivider className="my-4" />
                  <p className="text-sm text-[#6b7ea0] flex-1">{tier.blurb}</p>
                  <div className="mt-5">
                    {!isSignedIn ? (
                      <SignInButton mode="modal">
                        <Button
                          variant={tier.featured ? 'primary' : 'secondary'}
                          className="w-full"
                        >
                          Sign in to buy
                        </Button>
                      </SignInButton>
                    ) : (
                      <Button
                        variant={tier.featured ? 'primary' : 'secondary'}
                        className="w-full"
                        onClick={() => startCheckout(tier.plan)}
                        disabled={loadingPlan !== null}
                      >
                        {loadingPlan === tier.plan
                          ? 'Redirecting…'
                          : tier.plan === 'day'
                            ? 'Get day pass'
                            : 'Subscribe'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!isSignedIn && (
              <p className="text-center text-xs text-[#6b7ea0] mt-6">
                Sign-in is required to purchase - it links the ad-free perk to your account.
              </p>
            )}
          </>
        )}

        {!isLoaded && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#003087] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <p className="text-center text-xs text-[#6b7ea0] mt-10">
          Payments handled securely by Stripe. Questions?{' '}
          <Link href="/" className="underline decoration-dotted">
            Back to the game
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

export default function GoAdFreePage() {
  return (
    <Suspense
      fallback={
        <main className="ice-bg min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#003087] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <GoAdFreeInner />
    </Suspense>
  )
}
