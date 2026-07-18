export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt-BR'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/** Validates and returns a supported locale, falling back to DEFAULT_LOCALE. */
export function getSupportedLocale(locale: string | undefined): Locale {
  if (locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return locale as Locale
  }
  return DEFAULT_LOCALE
}
