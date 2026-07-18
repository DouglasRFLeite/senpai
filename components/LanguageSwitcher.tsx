'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { setLocale } from '@/lib/actions/set-locale'
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'

const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
}

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter()
  const t = useTranslations('language')
  const [isPending, startTransition] = useTransition()

  function handleSelect(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale)
      router.refresh()
    })
  }

  return (
    <nav className="language-switcher" aria-label={t('label')}>
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          disabled={isPending}
          onClick={() => handleSelect(locale)}
          className={currentLocale === locale ? 'active' : ''}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </nav>
  )
}
