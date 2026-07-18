'use server'

import { cookies } from 'next/headers'
import { getSupportedLocale, LOCALE_COOKIE } from '@/lib/i18n'

export async function setLocale(locale: string) {
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, getSupportedLocale(locale), {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
