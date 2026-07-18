import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { getSupportedLocale, LOCALE_COOKIE } from '@/lib/i18n'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = getSupportedLocale(cookieStore.get(LOCALE_COOKIE)?.value)

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
