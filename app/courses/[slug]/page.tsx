import { notFound } from 'next/navigation'
import { listCourses, getCourse, readResources } from '@/lib/courses'
import { loadBank, type BankQuestion } from '@/lib/bank'
import { DEFAULT_OPEN_PASS } from '@/lib/session'
import { CourseView } from '@/components/CourseView'

export function generateStaticParams() {
  return listCourses().map((course) => ({ slug: course.slug }))
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = getCourse(slug)
  if (!course) notFound()

  let bank: BankQuestion[] = []
  try {
    bank = loadBank(slug)
  } catch (err) {
    // A malformed bank must not hide the course's lessons; /author-bank fixes it.
    console.error(`bank for ${slug} skipped:`, err)
  }

  const openPass = parseFloat(process.env.OPEN_PASS || '') || DEFAULT_OPEN_PASS

  return (
    <CourseView
      course={course}
      hasResources={readResources(slug) != null}
      bank={bank}
      openPass={openPass}
    />
  )
}
