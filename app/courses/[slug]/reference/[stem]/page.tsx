import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { parseLesson } from 'teachdown'
import { listCourses, getCourse } from '@/lib/courses'
import { StaticBlock } from '@/components/TeachdownBlocks'
import styles from '@/styles/Lesson.module.css'

/**
 * Reference docs are Teachdown too, rendered fully server-side (no widgets,
 * no progress events) and printable via the stylesheet's @media print rules.
 */

const referenceDir = (slug: string) => path.join(process.cwd(), 'public', 'courses', slug, 'reference')

export function generateStaticParams() {
  return listCourses().flatMap(({ slug }) => {
    const dir = referenceDir(slug)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => ({ slug, stem: file.slice(0, -'.md'.length) }))
  })
}

export default async function ReferencePage({ params }: { params: Promise<{ slug: string; stem: string }> }) {
  const { slug, stem } = await params
  const course = getCourse(slug)
  const file = path.join(referenceDir(slug), `${stem}.md`)
  if (!course || !fs.existsSync(file)) notFound()

  const doc = parseLesson(fs.readFileSync(file, 'utf8'))
  const t = await getTranslations('lesson')

  return (
    <div className={styles.page}>
      <Link href={`/courses/${slug}`} className={styles.back}>
        ← {course.title}
      </Link>
      <p className={styles.kicker}>{[doc.frontmatter.unit, t('referenceKicker'), course.title].filter(Boolean).join(' · ')}</p>
      <h1 className={styles.title}>{doc.frontmatter.title}</h1>
      <article className={styles.doc}>
        {doc.blocks.map((block, i) => (
          <StaticBlock key={i} block={block} sourceTitle={t('sourceTitle')} />
        ))}
      </article>
    </div>
  )
}
