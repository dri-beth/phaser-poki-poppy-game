export const FRUIT_TEXTURE_KEYS = {
  legacy: 'fruit',
  unripe: 'fruit_unripe',
  midripe: 'fruit_midripe',
  ripe: 'fruit_ripe'
} as const

export type FruitTextureKey = (typeof FRUIT_TEXTURE_KEYS)[keyof typeof FRUIT_TEXTURE_KEYS]

export function getFruitStateTextureKey(state: 0 | 1 | 2 | 3): FruitTextureKey {
  if (state === 0) return FRUIT_TEXTURE_KEYS.unripe
  if (state === 1) return FRUIT_TEXTURE_KEYS.midripe
  if (state === 2) return FRUIT_TEXTURE_KEYS.ripe
  return FRUIT_TEXTURE_KEYS.midripe
}
