import fs from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { parseLesson, readTitle } from 'teachdown'
import { listCourses, getCourse, type Course } from '@/lib/courses'
import { LessonView, type NavLink } from '@/components/LessonView'

/**
 * App-rendered Teachdown lesson. The route is extension-less on
 * purpose: `public/` wins over dynamic routes, so the raw `<stem>.md` stays
 * fetchable at its real path while this route owns `/lessons/<stem>`.
 * A lesson that fails validation throws TeachdownValidationError here — a
 * loud, line-numbered load error, never a broken rendering.
 */

const courseDir = (slug: string) => path.join(process.cwd(), 'public', 'courses', slug)

export function generateStaticParams() {
  return listCourses().flatMap(
    (course) =>
      getCourse(course.slug)?.lessons.map((lesson) => ({ slug: course.slug, stem: lesson.file })) ?? [],
  )
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string; stem: string }> }) {
  const { slug, stem } = await params
  const course = getCourse(slug)
  const file = path.join(courseDir(slug), 'lessons', `${stem}.md`)
  if (!course || !fs.existsSync(file)) notFound()

  const doc = parseLesson(fs.readFileSync(file, 'utf8'))
  const index = course.lessons.findIndex((lesson) => lesson.file === stem)
  const neighbor = (at: number): NavLink | null => {
    const lesson = index === -1 ? undefined : course.lessons[at]
    return lesson ? { href: `/courses/${slug}/lessons/${lesson.file}`, label: lesson.title } : null
  }

  return (
    <LessonView
      courseSlug={slug}
      stem={stem}
      courseTitle={course.title}
      lessonNumber={index + 1}
      lessons={course.lessons}
      doc={doc}
      prev={neighbor(index - 1)}
      next={neighbor(index + 1)}
      related={(doc.frontmatter.related ?? []).map((entry) => resolveRelated(slug, entry, course))}
    />
  )
}

/** `reference/<stem>` → the reference route; a bare stem → a sibling lesson. */
function resolveRelated(slug: string, entry: string, course: Course): NavLink {
  if (entry.startsWith('reference/')) {
    const stem = entry.slice('reference/'.length)
    const file = path.join(courseDir(slug), 'reference', `${stem}.md`)
    const title = (fs.existsSync(file) && readTitle(fs.readFileSync(file, 'utf8'))) || stem
    return { href: `/courses/${slug}/reference/${stem}`, label: title }
  }
  const lesson = course.lessons.find((l) => l.file === entry)
  return { href: `/courses/${slug}/lessons/${entry}`, label: lesson?.title ?? entry }
}
