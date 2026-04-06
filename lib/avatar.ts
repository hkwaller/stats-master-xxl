/**
 * Returns a Dicebear bottts-neutral avatar URL.
 * The seed is the guest ID, so avatars are consistent per device.
 */
export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0a0e1a`
}
