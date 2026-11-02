/** There is no billing integration yet. A future verified purchase/restore provider
 * must set `unknown` before hydration, then publish `free` or `ad-free` here.
 * Never derive a paid entitlement from an unverified local-storage flag. */
export type AdEntitlement = 'unknown' | 'free' | 'ad-free'
let entitlement: AdEntitlement = 'free'
const listeners = new Set<() => void>()
export const getAdEntitlement = () => entitlement
export function setAdEntitlement(value: AdEntitlement) {
  entitlement = value
  listeners.forEach(listener => listener())
}
export function subscribeAdEntitlement(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
