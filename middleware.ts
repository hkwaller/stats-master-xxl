import type { NextFetchEvent, NextRequest as PublicNextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

const clerkProxy = clerkMiddleware()


// Public HTML must not depend on a Clerk handshake. Account/game routes keep their existing auth policy.
export default function publicProxy(request: PublicNextRequest, event: NextFetchEvent) {
  if (['/', '/privacy', '/terms', '/about', '/contact', '/support', '/how-to-play', '/robots.txt', '/sitemap.xml'].includes(request.nextUrl.pathname.replace(/\/$/, '') || '/')) {

    return NextResponse.next()
  }
  return clerkProxy(request, event)
}

export const config = {
  matcher: [
    '/((?!_next|ingest|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
