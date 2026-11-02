import type { Metadata } from 'next'
import { AppHome } from '@/components/native/AppHome'

export const metadata: Metadata = { title: 'Play', robots: { index: false, follow: false } }
export default function NativeHomePage() { return <AppHome /> }
