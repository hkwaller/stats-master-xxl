'use client'

import { useState, useSyncExternalStore } from 'react'
import { nativeAds, nativeAdsSupported } from '@/lib/ads/native'

const getSnapshot = () => nativeAdsSupported() && nativeAds.privacyRequired
const getServerSnapshot = () => false
export function AdPrivacyChoices() {
  const required = useSyncExternalStore(nativeAds.subscribe, getSnapshot, getServerSnapshot)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!required) return null
  return <div>
    <button className="app-text-action" disabled={busy} aria-busy={busy} onClick={async () => {
      setBusy(true); setError('')
      try {
        if (!await nativeAds.privacyChoices()) setError('Privacy choices could not open. Check your connection and try again.')
      } finally { setBusy(false) }
    }}>{busy ? 'Opening privacy choices…' : 'Ad privacy choices'}</button>
    {error && <p role="status">{error}</p>}
  </div>
}
