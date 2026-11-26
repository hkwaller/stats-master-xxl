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

export function getPlayerPhoto(playerId: number): PlayerPhoto | undefined {
  return photos[playerId]
}

