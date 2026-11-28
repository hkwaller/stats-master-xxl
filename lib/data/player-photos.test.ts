import { describe, expect, it } from 'vitest'
import { getPlayerPhoto, photoYear } from './player-photos'

const LAFLEUR = 8448624 // Guy_Lafleur_2013.jpg (AHL event, long retired)
const ESPOSITO = 8446722 // Philip_Esposito,_February_2012_(cropped).jpeg
const GRETZKY = 8447400 // Wayne_Gretzky_1997.jpg (curated)

describe('player photos match the card season', () => {
  it('reads the year from the Commons file name', () => {
    expect(photoYear(getPlayerPhoto(LAFLEUR)!)).toBe(2013)
    expect(photoYear(getPlayerPhoto(ESPOSITO)!)).toBe(2012)
    expect(photoYear(getPlayerPhoto(GRETZKY)!)).toBe(1997)
  })

  it('leaves off photos taken decades after the season', () => {
    expect(getPlayerPhoto(LAFLEUR, '1977-78')).toBeUndefined()
    expect(getPlayerPhoto(ESPOSITO, '1971-72')).toBeUndefined()
  })

  it('keeps photos from the same stretch of the career, and when no season is given', () => {
    expect(getPlayerPhoto(GRETZKY, '1985-86')).toBeDefined()
    expect(getPlayerPhoto(GRETZKY, '1996-97')).toBeDefined()
    expect(getPlayerPhoto(LAFLEUR)).toBeDefined()
  })
})
