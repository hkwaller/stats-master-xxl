import { ClientLayout } from './ClientLayout'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ roomId: string }>
}

export default async function RoomLayout({ children, params }: LayoutProps) {
  const { roomId } = await params
  return <ClientLayout roomId={roomId}>{children}</ClientLayout>
}
