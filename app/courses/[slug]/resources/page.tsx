import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { MarkdownView } from 'teachdown/react'
import { listCourses, getCourse, readResources } from '@/lib/courses'
import styles from '@/styles/Resources.module.css'

export function generateStaticParams() {
  return listCourses()
    .filter((course) => readResources(course.slug) != null)
    .map((course) => ({ slug: course.slug }))
}

export default async function ResourcesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const raw = readResources(slug)
  const course = getCourse(slug)
  if (raw == null || course == null) notFound()

  const t = await getTranslations('resources')

  return (
    <div className={styles.page}>
      <Link href={`/courses/${slug}`} className={styles.back}>
        ← {course.title}
      </Link>
      <p className={styles.kicker}>{t('kicker')}</p>
      <article className={styles.doc}>
        <MarkdownView markdown={raw} />
      </article>
    </div>
  )
}
