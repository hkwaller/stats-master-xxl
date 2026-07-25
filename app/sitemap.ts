import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.statsmaster.site'

// Only stable, public, indexable pages belong here - game rooms are ephemeral
// and are excluded from the index via robots metadata on the room layout.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      images: [`${SITE_URL}/opengraph-image`],
    },
    {
      url: `${SITE_URL}/go-ad-free`,
    },
  ]
}
