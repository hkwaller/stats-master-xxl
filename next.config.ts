import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow native QA to build while the ordinary web dev server is running.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  allowedDevOrigins: ['127.0.0.1'],
  // PostHog reverse proxy (see instrumentation-client.ts)
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      { source: '/ingest/:path*', destination: 'https://eu.i.posthog.com/:path*' },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
}

export default nextConfig
