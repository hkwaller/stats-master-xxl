import importedPhotos from './imported-player-photos.json'

export interface PlayerPhoto {
  src: string
  creator: string
  sourceUrl: string
  license: string
  licenseUrl: string
  editNote?: string
  caption?: string
}

function commonsPhoto({ file, creator, src, shareAlikeVersion, editNote }: {
  file: string
  creator: string
  src: string
  shareAlikeVersion: string
  editNote?: string
}): PlayerPhoto {
  return {
    src,
    creator,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
    license: `CC BY-SA ${shareAlikeVersion}`,
    licenseUrl: `https://creativecommons.org/licenses/by-sa/${shareAlikeVersion}/`,
    editNote,
  }
}

const photos: Partial<Record<number, PlayerPhoto>> = {
  ...importedPhotos,
  8447400: commonsPhoto({
    src: '/player-photos/8447400.jpg',
    file: 'Wayne_Gretzky_1997.jpg',
    creator: 'Rick Dikeman',
    shareAlikeVersion: '3.0',
  }),
  8448208: commonsPhoto({
    src: '/player-photos/8448208.png',
    file: 'Jagr_Czech1_crop.png',
    creator: 's.yume',
    shareAlikeVersion: '2.0',
    editNote: 'Cropped on Commons',
  }),
  8471675: commonsPhoto({
    src: '/player-photos/8471675.jpg',
    file: 'Sidney_Crosby_2017-06-08_2_(cropped).jpg',
    creator: 'Michael Miller',
    shareAlikeVersion: '4.0',
    editNote: 'Cropped on Commons',
  }),
  8478402: commonsPhoto({
    src: '/player-photos/8478402.jpg',
    file: 'Connor_McDavid_2-FEB-2022.jpg',
    creator: 'Brian Murphy / All-Pro Reels',
    shareAlikeVersion: '2.0',
    editNote: 'Cropped on Commons',
  }),
}

/**
 * A photo this many years away from the card's season is left off: most
 * Wikidata portraits of retired players are taken decades after their prime
 * (Guy Lafleur in 2013 on his 1977-78 card).
 */
export const MAX_PHOTO_SEASON_GAP_YEARS = 15

/**
 * The year a photo was taken, read from its Commons file name
 * ("Guy_Lafleur_2013.jpg", "Philip_Esposito,_February_2012_(cropped).jpeg").
 * The catalog stores no capture date, so undated file names return undefined.
 */
export function photoYear(photo: PlayerPhoto): number | undefined {
  let file = photo.sourceUrl.split('/File:')[1] ?? ''
  try { file = decodeURIComponent(file) } catch { /* keep the raw name */ }
  const match = /(?:^|\D)(19\d{2}|20\d{2})(?!\d)/.exec(file)
  return match ? Number(match[1]) : undefined
}

/** Years between the photo and a season like "1977-78"; 0 when taken during it. */
function yearsFromSeason(year: number, season: string): number | undefined {
  const start = Number(season.slice(0, 4))
  if (!Number.isInteger(start)) return undefined
  return year < start ? start - year : Math.max(0, year - (start + 1))
}

/**
 * The player's photo, or undefined when there is none or, given the card's
 * season, when the photo is dated far from it.
 */
export function getPlayerPhoto(playerId: number, season?: string | null): PlayerPhoto | undefined {
  const photo = photos[playerId]
  if (!photo || !season) return photo
  const year = photoYear(photo)
  const gap = year === undefined ? undefined : yearsFromSeason(year, season)
  return gap !== undefined && gap > MAX_PHOTO_SEASON_GAP_YEARS ? undefined : photo
}

