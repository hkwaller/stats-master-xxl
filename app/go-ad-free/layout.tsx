import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Go Ad-Free',
  description:
    'Remove ads from Stats Master with a day pass, monthly, or yearly plan. Cleaner screens, same free multiplayer NHL trivia.',
  // Collapse Stripe return params (?success, ?canceled) onto the clean URL.
  alternates: { canonical: '/go-ad-free' },
  openGraph: {
    title: 'Go Ad-Free | Stats Master',
    description:
      'Remove ads from Stats Master with a day pass, monthly, or yearly plan.',
    url: '/go-ad-free',
  },
}

export default function GoAdFreeLayout({ children }: { children: React.ReactNode }) {
  return children
}
