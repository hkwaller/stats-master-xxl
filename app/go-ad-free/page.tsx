'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { SignInButton, useUser } from '@clerk/nextjs'

import { ArrowLeft } from 'lucide-react'
import { Button, Kickplate, MonoLabel } from '@/components/design-system'
import { PuckMark } from '@/components/arcade'
import { isAdFree, type AdFreePublicMetadata } from '@/lib/entitlement'

const INK = '#0d1b2a'
const RED = '#cf0a2c'

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
    accent: INK,
  },
  {
    plan: 'month',
    name: 'Monthly',
    price: '39 kr',
    cadence: 'per month',
    blurb: 'Ad-free every game. Cancel anytime.',
    accent: RED,
    featured: true,
  },
  {
    plan: 'year',
    name: 'Yearly',
    price: '299 kr',
    cadence: 'per year',
    blurb: 'Best value - over a third off the monthly price.',
    accent: '#0b53c9',
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
    <main className="ice-bg relative flex min-h-screen flex-col overflow-x-hidden">
      <header className="on-ice-header relative z-20">
        <div className="flex h-[60px] items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-[11px]">
            <PuckMark size={26} />
            <span
              className="font-display"
              style={{ fontWeight: 800, fontSize: 18, letterSpacing: '0.02em' }}
            >
              STATS MASTER
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft size={14} strokeWidth={2.2} />
            Back
          </Button>
        </div>
        <Kickplate />
      </header>

      <div className="relative z-[2] mx-auto w-full max-w-[1000px] px-5 pt-10 pb-16 md:px-8">
        <div className="flex flex-col gap-4">
          <MonoLabel size={10} tracking="0.3em">No ads · covers your whole room</MonoLabel>
          <h1
            className="font-display m-0"
            style={{
              fontWeight: 800,
              fontSize: 'clamp(40px,8vw,72px)',
              lineHeight: 0.9,
              letterSpacing: '0.005em',
              textTransform: 'uppercase',
            }}
          >
            Go ad-free
          </h1>
          <p
            className="m-0 max-w-[520px]"
            style={{ fontSize: 15, lineHeight: 1.6, color: '#55677d' }}
          >
            Ditch the banners and popups. Host a game ad-free and your whole room plays clean — the
            perk covers everyone you invite.
          </p>
        </div>

        {/* ── Ad-free confirmation ─────────────────────────────────────────── */}
        {isLoaded && isSignedIn && adFree && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="on-ice mt-9 flex max-w-lg flex-col gap-4 p-7"
            style={{ borderLeft: `5px solid ${RED}` }}
          >
            <MonoLabel size={9}>Active</MonoLabel>
            <h2
              className="font-display m-0"
              style={{ fontWeight: 800, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}
            >
              You&apos;re ad-free
            </h2>
            <div
              className="flex flex-col gap-1.5 pt-3"
              style={{ borderTop: '1px solid rgba(13,27,42,0.10)' }}
            >
              <MonoLabel size={9} tracking="0.2em">
                {isDayPass ? 'Day pass' : `${meta.adFreePlan ?? 'Subscription'} plan`}
              </MonoLabel>
              <span
                className="font-display"
                style={{ fontWeight: 700, fontSize: 22, color: INK }}
              >
                Until {formatUntil(meta.adFreeUntil)}
              </span>
            </div>

            {isSubscriber && (
              <div className="pt-1">
                <Button variant="secondary" size="sm" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </Button>
              </div>
            )}
            {isDayPass && (
              <MonoLabel size={9} tracking="0.14em">
                Want it permanent? Grab a subscription when your pass runs out.
              </MonoLabel>
            )}
          </motion.div>
        )}

        {/* ── Polling after successful checkout ────────────────────────────── */}
        {isLoaded && isSignedIn && !adFree && polling && (
          <div className="on-ice mt-9 flex max-w-lg flex-col gap-2 p-7">
            <MonoLabel size={9}>Stripe</MonoLabel>
            <span
              className="font-display animate-pulse"
              style={{ fontWeight: 800, fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}
            >
              Confirming your purchase
            </span>
            <MonoLabel size={9} tracking="0.14em">This only takes a moment</MonoLabel>
          </div>
        )}

        {/* ── Tier cards ───────────────────────────────────────────────────── */}
        {isLoaded && !(isSignedIn && adFree) && !polling && (
          <>
            {status === 'cancelled' && (
              <p className="mt-8 mb-0" style={{ fontSize: 13, color: RED }}>
                Checkout cancelled — no charge was made.
              </p>
            )}
            {error && (
              <p className="mt-8 mb-0" style={{ fontSize: 13, color: RED }}>
                {error}
              </p>
            )}

            <div className="mt-9 grid gap-3.5 md:grid-cols-3">
              {TIERS.map((tier) => (
                <div
                  key={tier.plan}
                  className="on-ice flex flex-col gap-3 p-6"
                  style={{ borderLeft: `6px solid ${tier.accent}` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-display"
                      style={{
                        fontWeight: 800,
                        fontSize: 26,
                        lineHeight: 1,
                        textTransform: 'uppercase',
                        color: INK,
                      }}
                    >
                      {tier.name}
                    </span>
                    {tier.featured && (
                      <span
                        className="font-mono shrink-0"
                        style={{
                          background: RED,
                          color: '#fff',
                          padding: '3px 7px',
                          fontSize: 9,
                          letterSpacing: '0.16em',
                        }}
                      >
                        POPULAR
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-display tabular-nums"
                      style={{ fontWeight: 800, fontSize: 44, lineHeight: 0.9, color: INK }}
                    >
                      {tier.price}
                    </span>
                  </div>
                  <MonoLabel size={9} tracking="0.16em">{tier.cadence}</MonoLabel>

                  <p
                    className="m-0 flex-1 pt-3"
                    style={{
                      borderTop: '1px solid rgba(13,27,42,0.10)',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#55677d',
                    }}
                  >
                    {tier.blurb}
                  </p>

                  <div className="pt-1">
                    {!isSignedIn ? (
                      <SignInButton mode="modal">
                        <Button
                          variant={tier.featured ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full"
                        >
                          Sign in to buy
                        </Button>
                      </SignInButton>
                    ) : (
                      <Button
                        variant={tier.featured ? 'primary' : 'secondary'}
                        size="sm"
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
              <p className="mt-6">
                <MonoLabel size={9} tracking="0.14em">
                  Sign-in is required to purchase — it links the perk to your account
                </MonoLabel>
              </p>
            )}
          </>
        )}

        {!isLoaded && (
          <div className="flex justify-center py-20">
            <span className="animate-pulse">
              <MonoLabel size={10} tracking="0.24em">Loading</MonoLabel>
            </span>
          </div>
        )}

        <p className="mt-12 mb-0" style={{ fontSize: 12.5, color: '#55677d' }}>
          Payments handled securely by Stripe. Questions?{' '}
          <Link href="/" className="underline decoration-dotted underline-offset-4">
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
        <main className="ice-bg flex min-h-screen items-center justify-center">
          <span className="animate-pulse relative z-[2]">
            <MonoLabel size={10} tracking="0.24em">Loading</MonoLabel>
          </span>
        </main>
      }
    >
      <GoAdFreeInner />
    </Suspense>
  )
}
