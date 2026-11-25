import { headers } from 'next/headers'
import type { Metadata, Viewport } from 'next'
import { Anton, DM_Sans, Space_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import { NativeBoot } from '@/components/native/NativeBoot'

/** Cards on Ice: Anton for names and headings, DM Sans for prose, Space Mono for stat lines. */
const anton = Anton({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://statsmaster.playam.app'

const DESCRIPTION =
  'Free NHL trivia with Classic, Career, Head-to-Head and Higher / Lower modes. Play with 2–8 players on your phones or try the daily challenge solo.'

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stats Master - Multiplayer NHL Stats Trivia',
    template: '%s | Stats Master',
  },
  description: DESCRIPTION,
  applicationName: 'Stats Master',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Stats Master',
    locale: 'en_US',
    url: '/',
    title: 'Stats Master - Multiplayer NHL Stats Trivia',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stats Master - Multiplayer NHL Stats Trivia',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.png',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Stats Master',
      description: DESCRIPTION,
    },
    {
      '@type': 'VideoGame',
      '@id': `${SITE_URL}/#game`,
      name: 'Stats Master',
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: 'GameApplication',
      genre: 'Trivia',
      gamePlatform: 'Web browser',
      operatingSystem: 'Any',
      playMode: 'MultiPlayer',
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 8 },
      inLanguage: 'en',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Amalies Utviklingsfabrikk' },
    },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nativeRequest = (await headers()).get('user-agent')?.includes('StatsMasterNative/') ?? false
  return (
    <html
      lang="en"
      className={`${anton.variable} ${dmSans.variable} ${spaceMono.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: 'var(--color-cobalt)',
              colorForeground: 'var(--color-ink)',
              colorMutedForeground: 'var(--color-ink-2)',
              colorBackground: 'var(--color-ice-0)',
              colorInput: 'var(--color-ice-0)',
              colorInputForeground: 'var(--color-ink)',
              colorDanger: 'var(--color-alarm)',
              borderRadius: '14px',
              fontFamily: 'var(--font-body)',
            },
            elements: {
              cardBox: { borderRadius: 18, border: '3px solid var(--color-ink)', boxShadow: '6px 6px 0 var(--color-ink)' },
              card: { boxShadow: 'none' },
              headerTitle: {
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 400,
                textTransform: 'uppercase',
              },
              formFieldInput: { minHeight: '44px' },
              formButtonPrimary: {
                minHeight: '44px',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: '1.05rem',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              },
              footer: { background: 'var(--color-ice-1)' },
              footerActionLink: { fontWeight: 700 },
            },
          }}
        >
          <Providers><NativeBoot nativeRequest={nativeRequest}>{children}</NativeBoot></Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
