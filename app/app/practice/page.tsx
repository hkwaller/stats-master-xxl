'use client'
import { useRouter } from 'next/navigation'
import { ClassicPractice } from '@/components/native/ClassicPractice'
export default function PracticePage() {
  const router = useRouter()
  return <main className="app-practice-page min-h-dvh"><ClassicPractice onExit={() => router.push('/app')} /></main>
}
