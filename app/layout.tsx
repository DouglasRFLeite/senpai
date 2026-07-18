import type { Metadata } from 'next'
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'
import Link from 'next/link'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { UserChip } from '@/components/UserChip'
import { UserPicker } from '@/components/UserPicker'
import { getSupportedLocale } from '@/lib/i18n'
import './globals.css'

// Field-log type system: a condensed, riveted display face for headings and
// stamped marks, plain-spoken sans for UI chrome, mono for data/labels, and a
// literary serif reserved for long-form reading (lessons, references).
const display = Big_Shoulders({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})
const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})
const label = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-label',
})
const read = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-read',
})

export const metadata: Metadata = {
  title: 'Senpai',
  description: 'Personal learning OS',
}

// Applies the stored theme before first paint — no light-theme flash.
const themeInit = `try{if(localStorage.getItem('senpai-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}`

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = getSupportedLocale(await getLocale())
  const messages = await getMessages()
  const t = await getTranslations('nav')

  return (
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${label.variable} ${read.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="site-header">
            <Link href="/" className="site-name">
              <span className="site-name-rivet" aria-hidden="true" />
              Field Log
            </Link>
            <nav className="site-nav">
              <Link href="/" className="site-nav-link">{t('home')}</Link>
              <Link href="/dashboard" className="site-nav-link">{t('dashboard')}</Link>
            </nav>
            <div className="site-search" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
              {t('search')}
              <kbd>⌘K</kbd>
            </div>
            <div className="site-header-actions">
              <ThemeToggle />
              <LanguageSwitcher currentLocale={locale} />
              <UserChip />
            </div>
          </header>
          <main>{children}</main>
          <UserPicker />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
