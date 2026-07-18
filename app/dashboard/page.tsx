import { listCourses } from '@/lib/courses'
import { DashboardView } from '@/components/DashboardView'

export default function DashboardPage() {
  // Progress is keyed by slug; the accuracy-by-course card wants real titles.
  return <DashboardView courses={listCourses()} />
}
