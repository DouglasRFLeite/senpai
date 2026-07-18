import { getCourse, listCourses, type Course } from '@/lib/courses'
import { HomeView } from '@/components/HomeView'

export default function HomePage() {
  // Full courses (with lesson lists): Home's resume band and each card's
  // "next: …" line need lesson titles, not just summaries.
  const courses = listCourses()
    .map((c) => getCourse(c.slug))
    .filter((c): c is Course => c !== null)
  return <HomeView courses={courses} />
}
