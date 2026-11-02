'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { nativeAds, nativeAdsSupported, setNativeAdsActive } from '@/lib/ads/native'
import { hasNativePlugin } from '@/lib/native'

let launchRequested = false
export function NativeAdsBoot() {
  const pathname = usePathname()
  useEffect(() => {
    if (!['/app', '/privacy'].includes(pathname) || launchRequested || !nativeAdsSupported()) return
    launchRequested = true
    void nativeAds.bootstrap()
  }, [pathname])
  useEffect(() => {
    if (!hasNativePlugin('App') || !nativeAdsSupported()) return
    let active = true
    let cleanup: (() => void) | undefined
    void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        setNativeAdsActive(isActive)
        if (isActive) void nativeAds.preload()
      })
      if (active) cleanup = () => { void listener.remove() }
      else void listener.remove()
    }).catch(() => {})
    return () => { active = false; cleanup?.() }
  }, [])
  return null
}
