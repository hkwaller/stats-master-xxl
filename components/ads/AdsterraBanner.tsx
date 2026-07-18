'use client'

import Script from 'next/script'
import Link from 'next/link'

import { useAdFree } from '@/hooks/useAdFree'

interface AdsterraBannerProps {
  slot?: string
  className?: string
  /**
   * Force-hide regardless of the local user (e.g. the host's Pro perk suppressing
   * ads for the whole room). Pass `useInGameAdsSuppressed().suppressed` here on
   * in-game/end screens. Combined with the local `useAdFree` gate below.
   */
  suppressed?: boolean
}

/** Adsterra uses different hostnames in embed code (e.g. highperformanceformat.com, topcreativeformat.com). Use the exact host from your dashboard snippet, or override via env. */
const defaultInvokeHost =
  process.env.NEXT_PUBLIC_ADSTERRA_INVOKE_HOST ?? 'www.highperformanceformat.com'

/**
 * Adsterra 728x90 banner. Self-gating: renders nothing for ad-free users (and
 * while Clerk hydrates, to avoid a flash), or when `suppressed` is passed.
 * Includes a subtle "Remove ads" link so the banner doubles as the upsell entry.
 */
export function AdsterraBanner({ slot = 'top', className = '', suppressed = false }: AdsterraBannerProps) {
  const { adFree, loading } = useAdFree()
  const adKey = process.env.NEXT_PUBLIC_ADSTERRA_KEY

  if (suppressed || adFree || loading || !adKey) return null

  const optionsScriptId = `adsterra-atoptions-${slot}`

  return (
    <div className={`w-full flex flex-col items-center gap-1 my-4 ${className}`}>
      <div className="w-full flex justify-center overflow-hidden">
        <div
          id={`adsterra-banner-${slot}`}
          className="w-full max-w-[min(728px,100%)] min-h-[90px] bg-game-card-dark/50 rounded-lg overflow-hidden [&_iframe]:!max-w-full"
        />
      </div>
      <Link
        href="/go-ad-free"
        className="text-xs font-bold text-[#6b7ea0] underline decoration-dotted hover:text-[#0a1535]"
      >
        Remove ads
      </Link>
      <Script
        id={optionsScriptId}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.atOptions = {
              key: ${JSON.stringify(adKey)},
              format: 'iframe',
              height: 90,
              width: 728,
              params: {}
            };
          `,
        }}
      />
      <Script
        src={`https://${defaultInvokeHost}/${adKey}/invoke.js`}
        strategy="afterInteractive"
        data-cfasync="false"
      />
    </div>
  )
}
