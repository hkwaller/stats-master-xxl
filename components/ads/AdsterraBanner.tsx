'use client'

import Script from 'next/script'

interface AdsterraBannerProps {
  slot?: string
  className?: string
}

/** Adsterra uses different hostnames in embed code (e.g. highperformanceformat.com, topcreativeformat.com). Use the exact host from your dashboard snippet, or override via env. */
const defaultInvokeHost =
  process.env.NEXT_PUBLIC_ADSTERRA_INVOKE_HOST ?? 'www.highperformanceformat.com'

export function AdsterraBanner({ slot = 'top', className = '' }: AdsterraBannerProps) {
  const adKey = process.env.NEXT_PUBLIC_ADSTERRA_KEY
  if (!adKey) return null

  const optionsScriptId = `adsterra-atoptions-${slot}`

  return (
    <div className={`w-full flex justify-center my-4 ${className}`}>
      <div
        id={`adsterra-banner-${slot}`}
        className="w-full max-w-[728px] min-h-[90px] bg-game-card-dark/50 rounded-lg overflow-hidden"
      />
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
