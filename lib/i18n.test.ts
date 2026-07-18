import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, getSupportedLocale } from './i18n'

describe('getSupportedLocale', () => {
  it('returns a supported locale as-is', () => {
    expect(getSupportedLocale('en')).toBe('en')
    expect(getSupportedLocale('pt-BR')).toBe('pt-BR')
  })

  it('falls back to the default locale for unsupported values', () => {
    expect(getSupportedLocale('fr')).toBe(DEFAULT_LOCALE)
    expect(getSupportedLocale(undefined)).toBe(DEFAULT_LOCALE)
  })
})
