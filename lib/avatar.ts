/**
 * Returns a Dicebear bottts-neutral avatar URL.
 * The seed is the guest ID, so avatars are consistent per device.
 * The background is ice, so avatars sit on the surface rather than punching a hole in it.
 */
export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e4ecf5`
}
