import type { Metadata } from 'next'
import { ClientLayout } from './ClientLayout'

// Game rooms are ephemeral, per-session, and multiplayer-only - keep them out of search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ roomId: string }>
}

export default async function RoomLayout({ children, params }: LayoutProps) {
  const { roomId } = await params
  return <ClientLayout roomId={roomId}>{children}</ClientLayout>
}
