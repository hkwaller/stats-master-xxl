import { Capacitor } from '@capacitor/core'

export function isNative(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}
export function hasNativePlugin(name: string): boolean {
  return isNative() && Capacitor.isPluginAvailable(name)
}

/** Older shells and Android error pages may have no bridge. Feedback is optional. */
export async function nativeFeedback(kind: 'selection' | 'correct' | 'wrong' | 'lock' = 'selection') {
  if (!hasNativePlugin('Haptics')) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (kind === 'correct' || kind === 'wrong') {
      await Haptics.notification({ type: kind === 'correct' ? NotificationType.Success : NotificationType.Error })
    } else if (kind === 'lock') {
      await Haptics.impact({ style: ImpactStyle.Light })
    } else {
      await Haptics.selectionChanged()
    }
  } catch { /* Optional on unsupported hardware and older shells. */ }
}

export const GUEST_STORAGE_KEY = 'nhl-stats-master:guest'

export async function hydrateNativeGuest() {
  if (!hasNativePlugin('Preferences')) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const local = localStorage.getItem(GUEST_STORAGE_KEY)
    const { value } = await Preferences.get({ key: GUEST_STORAGE_KEY })
    if (!local && value) {
      const guest = JSON.parse(value)
      if (typeof guest.id === 'string' && typeof guest.name === 'string') localStorage.setItem(GUEST_STORAGE_KEY, value)
    } else if (local) {
      await Preferences.set({ key: GUEST_STORAGE_KEY, value: local })
    }
  } catch { /* Storage and plugins can be unavailable. Guest play still works. */ }
}

export async function persistNativeGuest(value: string) {
  if (!hasNativePlugin('Preferences')) return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key: GUEST_STORAGE_KEY, value })
  } catch { /* Browser storage remains the immediate source. */ }
}
