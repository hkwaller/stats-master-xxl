'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { NativeAdsBoot } from './NativeAdsBoot'
import { hasNativePlugin, hydrateNativeGuest, isNative } from '@/lib/native'

export function NativeBoot({ children, nativeRequest }: { children: React.ReactNode; nativeRequest: boolean }) {
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    let active = true
    document.documentElement.classList.toggle('native-shell', isNative())
    void hydrateNativeGuest().finally(() => { if (active) setReady(true) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (ready && isNative() && pathname === '/') router.replace('/app')
  }, [ready, pathname, router])
  useEffect(() => {
    if (!hasNativePlugin('App')) return
    let active = true
    let cleanup: (() => void) | undefined
    void import('@capacitor/app').then(async ({ App }) => {
      const listener = await App.addListener('backButton', ({ canGoBack }) => {
        const joinSheet = document.querySelector<HTMLDialogElement>('.app-join-sheet[open]')
        if (joinSheet) {
          joinSheet.close()
          return
        }
        if (window.location.pathname !== '/app' && canGoBack) window.history.back()
        else if (window.location.pathname !== '/app') router.replace('/app')
        else void App.minimizeApp()
      })
      if (active) cleanup = () => { void listener.remove() }
      else void listener.remove()
    }).catch(() => {})
    return () => { active = false; cleanup?.() }
  }, [router])
  // Browser/SSR markup stays identical; native children wait for Preferences hydration.
  if (!ready && nativeRequest) return <div aria-busy="true" className="native-loading">Loading Stats Master…</div>
  return <><NativeAdsBoot />{children}</>
}
