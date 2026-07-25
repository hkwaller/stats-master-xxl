import type { Metadata } from 'next'
import { Bungee, Archivo_Black, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'

const bungee = Bungee({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-bungee',
  display: 'swap',
})

const archivoBLack = Archivo_Black({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-archivo-black',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['500', '700'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.statsmaster.site'

const DESCRIPTION =
  'Free multiplayer NHL trivia. Five stats, four names, twelve seconds — guess the hockey legend before your friends do. Play 2–8 players from any device.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stats Master — Multiplayer NHL Stats Trivia',
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
    title: 'Stats Master — Multiplayer NHL Stats Trivia',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stats Master — Multiplayer NHL Stats Trivia',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${bungee.variable} ${archivoBLack.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <body>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
