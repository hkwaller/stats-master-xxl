const query = process.argv.slice(2).join(' ').trim()

if (!query) {
  console.error('Usage: node scripts/find-player-photos.mjs <player name or File:title>')
  process.exit(1)
}

const params = new URLSearchParams({
  action: 'query',
  format: 'json',
  formatversion: '2',
  prop: 'imageinfo',
  iiprop: 'url|extmetadata',
  iiurlwidth: '500',
  iiextmetadatafilter: 'Artist|Attribution|Credit|LicenseShortName|LicenseUrl|ImageDescription|Restrictions',
})

if (query.startsWith('File:')) {
  params.set('titles', query)
  params.set('redirects', '1')
} else {
  params.set('generator', 'search')
  params.set('gsrsearch', query)
  params.set('gsrnamespace', '6')
  params.set('gsrlimit', '5')
}

try {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'StatsMasterPhotoCatalog/1.0 (https://github.com/hkwaller/stats-master-xxl)' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Commons returned HTTP ${response.status}`)

  const result = await response.json()
  if (result.error) throw new Error(result.error.info)

  const candidates = (result.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap(page => (page.imageinfo ?? []).map(image => ({
      title: page.title,
      sourceUrl: image.descriptionurl,
      imageUrl: image.thumburl ?? image.url,
      creator: image.extmetadata?.Artist?.value,
      attribution: image.extmetadata?.Attribution?.value,
      credit: image.extmetadata?.Credit?.value,
      license: image.extmetadata?.LicenseShortName?.value,
      licenseUrl: image.extmetadata?.LicenseUrl?.value,
      description: image.extmetadata?.ImageDescription?.value,
      restrictions: image.extmetadata?.Restrictions?.value,
    })))

  console.error('Review each source page for identity, license and attribution before adding a photo to lib/data/player-photos.ts.')
  console.log(JSON.stringify(candidates, null, 2))
} catch (error) {
  console.error(`Wikimedia lookup failed: ${error.message}`)
  process.exitCode = 1
}
