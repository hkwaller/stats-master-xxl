import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { DailyChallenge } from '@/components/game/DailyChallenge'

export const metadata: Metadata = { title: 'Daily challenge', robots: { index: false, follow: false } }

export default function AppDailyPage() {
  return (
    <main className="app-daily-page ice-bg">
      <header className="app-detail-header"><Link href="/app"><ChevronLeft size={22} aria-hidden="true" />Play</Link></header>
      <div className="app-daily-content">
        <h1 className="app-play-title">Daily challenge</h1>
        <p className="app-daily-description">Same skater for everyone. A new challenge at midnight UTC.</p>
        <DailyChallenge />
      </div>
    </main>
  )
}
