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

export const metadata: Metadata = {
  title: 'Stats Master',
  description: 'Multiplayer NHL statistics trivia — guess the player from their stats',
  openGraph: {
    title: 'Stats Master',
    description: 'Multiplayer NHL statistics trivia — guess the player from their stats',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${bungee.variable} ${archivoBLack.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
