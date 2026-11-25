// Usage: node --env-file=.env.local scripts/import-player-photos.mjs
import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile, rename } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const userAgent = 'StatsMasterPhotoCatalog/1.0 (https://github.com/hkwaller/stats-master-xxl)'
const output = new URL('../lib/data/imported-player-photos.json', import.meta.url)
const curatedIds = new Set([8447400, 8448208, 8471675, 8478402])
const reviewedSources = new URL('player-photo-sources.json', import.meta.url)
const crownTemplate = 'Template:PD-Canada-Crown'
const classicMinimumPoints = 70

async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(70_000),
    })
    if (response.ok) {
      const body = await response.json()
      if (!body.error) return body
      if (body.error.code !== 'maxlag') throw new Error(body.error.info)
    } else if (response.status !== 429 && response.status !== 503) {
      throw new Error(`${url.hostname} returned HTTP ${response.status}`)
    }
    const retryAfter = response.headers.get('Retry-After')
    const datesMs = retryAfter && !Number.isFinite(Number(retryAfter)) ? Date.parse(retryAfter) - Date.now() : 0
    await delay(Math.max(datesMs || 0, (Number(retryAfter) || 0) * 1000, 5000 * (attempt + 1)))
  }
  throw new Error(`${url.hostname} is still rate limited or unavailable`)
}

async function getClassicPlayerIds() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const ids = new Set()
  const pageSize = 1000

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await db.from('nhl_player_seasons')
      .select('player_id')
      .gte('points', classicMinimumPoints)
      .order('player_id')
      .order('season_id')
      .range(start, start + pageSize - 1)
    if (error) throw new Error(error.message)
    for (const row of data) ids.add(row.player_id)
    if (data.length < pageSize) return ids
  }
}

async function getWikidataCandidates(ids) {
  const url = new URL('https://query.wikidata.org/sparql')
  url.searchParams.set('query', 'SELECT ?person ?id ?image WHERE { ?person wdt:P3522 ?id ; wdt:P18 ?image . }')
  const { results } = await fetchJson(url)
  const candidates = new Map()

  for (const row of results.bindings) {
    const id = Number(row.id.value)
    if (!ids.has(id) || curatedIds.has(id)) continue
    const file = decodeURIComponent(row.image.value.split('/').at(-1)).replaceAll('_', ' ')
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue
    const matches = candidates.get(id) ?? []
    matches.push({ person: row.person.value, title: `File:${file}` })
    candidates.set(id, matches)
  }

  return [...candidates].flatMap(([id, matches]) => {
    if (new Set(matches.map(match => match.person)).size > 1) return []
    return matches.map(({ title }) => ({ id, title }))
  }).sort((a, b) => a.id - b.id || a.title.localeCompare(b.title, 'en'))
}

function attributionText(html = '') {
  const entities = { amp: '&', quot: '"', apos: "'", nbsp: ' ', lt: '<', gt: '>', ndash: '–', mdash: '—' }
  return html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, key) => {
      if (!key.startsWith('#')) return entities[key] ?? entity
      const code = key[1]?.toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1))
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
    })
    .replace(/\s+/g, ' ').trim()
}

function toCatalogPhoto(page) {
  const image = page.imageinfo?.[0]
  if (!image?.thumburl || !image.descriptionurl) return
  const metadata = image.extmetadata ?? {}
  const license = metadata.LicenseShortName?.value
  const licenseUrl = metadata.LicenseUrl?.value
    ?.replace(/^http:/, 'https:')
    .replace(/\/deed\.[a-z-]+\/?$/i, '/')
  const cc = /^(CC BY(-SA)?) ([1-4]\.[05])$/.exec(license ?? '')
  const ccPath = cc ? `/licenses/${cc[2] ? 'by-sa' : 'by'}/${cc[3]}` : undefined
  const cc0 = license === 'CC0' && /^https:\/\/creativecommons\.org\/publicdomain\/zero\/1\.0\/?$/.test(licenseUrl ?? '')
  const ccLicensed = ccPath && [ccPath, `${ccPath}/`].some(path => licenseUrl === `https://creativecommons.org${path}`)
  const expiredCrownCopyright = license === 'Public domain' && page.templates?.some(t => t.title === crownTemplate)
  if ((!ccLicensed && !cc0 && !expiredCrownCopyright) || attributionText(metadata.Restrictions?.value)) return

  const creator = attributionText(metadata.Attribution?.value || metadata.Artist?.value)
  if (!creator || /&[#\w]+;|[<>]|^unknown$/i.test(creator)) return

  const thumbnail = new URL(image.thumburl)
  const source = new URL(image.descriptionurl)
  if (thumbnail.protocol !== 'https:' || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(thumbnail.hostname)
    || source.origin !== 'https://commons.wikimedia.org') return
  thumbnail.search = ''
  const editNote = /\bcrop(?:ped)?\b/i.test(page.title) ? 'Cropped on Commons' : undefined
  return {
    src: thumbnail.href, creator, sourceUrl: source.href, license,
    licenseUrl: expiredCrownCopyright ? `https://commons.wikimedia.org/wiki/${crownTemplate}` : licenseUrl,
    ...(editNote && { editNote }),
  }
}

async function getCommonsPhotos(candidates) {
  const idsByTitle = new Map()
  const captionsByTitle = new Map()
  for (const { id, title, caption } of candidates) {
    const ids = idsByTitle.get(title) ?? new Set()
    ids.add(id)
    idsByTitle.set(title, ids)
    if (caption) captionsByTitle.set(title, caption)
  }
  const titles = [...idsByTitle].filter(([, ids]) => ids.size === 1).map(([title]) => title)
  const matchesBySource = new Map()
  const batchSize = 20

  for (let start = 0; start < titles.length; start += batchSize) {
    const batch = titles.slice(start, start + batchSize)
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', maxlag: '5', redirects: '1',
      titles: batch.join('|'), prop: 'imageinfo|templates', tltemplates: crownTemplate,
      iiprop: 'url|extmetadata', iiurlwidth: '500',
      iiextmetadatafilter: 'Artist|Attribution|LicenseShortName|LicenseUrl|Restrictions',
    })
    const { query } = await fetchJson(url)
    const redirects = new Map([...(query.normalized ?? []), ...(query.redirects ?? [])].map(row => [row.from, row.to]))
    const pages = new Map(query.pages.map(page => [page.title, page]))

    for (const title of batch) {
      let canonical = title
      const seen = new Set()
      while (redirects.has(canonical) && !seen.has(canonical)) {
        seen.add(canonical)
        canonical = redirects.get(canonical)
      }
      const page = pages.get(canonical)
      const photo = page && toCatalogPhoto(page)
      if (!photo) continue
      const [id] = idsByTitle.get(title)
      const caption = captionsByTitle.get(title)
      if (caption) photo.caption = caption
      const match = matchesBySource.get(photo.sourceUrl) ?? { ids: new Set(), photo }
      match.ids.add(id)
      matchesBySource.set(photo.sourceUrl, match)
    }
    console.log(`Checked ${Math.min(start + batchSize, titles.length)}/${titles.length} Commons files`)
    if (start + batchSize < titles.length) await delay(1100)
  }

  const photos = {}
  for (const { ids, photo } of matchesBySource.values()) {
    if (ids.size !== 1) continue
    const [id] = ids
    photos[id] ??= photo
  }
  return photos
}

try {
  const ids = await getClassicPlayerIds()
  const reviewed = JSON.parse(await readFile(reviewedSources, 'utf8'))
  const candidates = Object.entries(reviewed).flatMap(([key, { file, caption }]) => {
    const id = Number(key)
    return ids.has(id) && !curatedIds.has(id) ? [{ id, title: `File:${file}`, caption }] : []
  })
  candidates.push(...await getWikidataCandidates(ids))
  const photos = await getCommonsPhotos(candidates)
  const imported = Object.keys(photos).length
  if (!imported) throw new Error('No licensed matches found. The previous catalog was kept.')
  const temporary = new URL(`${output.href}.${process.pid}.tmp`)
  await writeFile(temporary, `${JSON.stringify(photos, null, 2)}\n`)
  await rename(temporary, output)
  const curated = [...curatedIds].filter(id => ids.has(id)).length
  console.log(`${imported} imported + ${curated} curated photos for ${ids.size} Classic players`)
} catch (error) {
  console.error(`Player photo import failed: ${error.message}`)
  process.exitCode = 1
}
