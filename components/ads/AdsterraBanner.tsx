'use client'

import Script from 'next/script'

interface AdsterraBannerProps {
  slot?: string
  className?: string
}

export function AdsterraBanner({ slot = 'top', className = '' }: AdsterraBannerProps) {
  const adKey = process.env.NEXT_PUBLIC_ADSTERRA_KEY
  if (!adKey) return null

  return (
    <div className={`w-full flex justify-center my-4 ${className}`}>
      <div
        id={`adsterra-banner-${slot}`}
        className="w-full max-w-[728px] min-h-[90px] bg-game-card-dark/50 rounded-lg overflow-hidden"
      />
      <Script
        src={`//www.topcreativeformat.com/${adKey}/invoke.js`}
        strategy="lazyOnload"
        data-cfasync="false"
      />
    </div>
  )
}
