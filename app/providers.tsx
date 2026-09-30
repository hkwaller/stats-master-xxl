'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

// posthog is initialised in instrumentation-client.ts
export function Providers({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
