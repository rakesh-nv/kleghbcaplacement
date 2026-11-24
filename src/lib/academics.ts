import type { CgpaMethod, StudentAcademic } from '@/types/models'

/** CGPA per the institution's configured rule (Settings → Grading). */
export function computeCgpa(records: StudentAcademic[], method: CgpaMethod): number | null {
  const withSgpa = records.filter(r => r.sgpa != null)
  if (!withSgpa.length) return null
  if (method === 'credit_weighted') {
    const withCredits = withSgpa.filter(r => r.credits && r.credits > 0)
    if (withCredits.length === withSgpa.length) {
      const credits = withCredits.reduce((s, r) => s + r.credits!, 0)
      return Math.round((withCredits.reduce((s, r) => s + r.sgpa! * r.credits!, 0) / credits) * 100) / 100
    }
  }
  return Math.round((withSgpa.reduce((s, r) => s + r.sgpa!, 0) / withSgpa.length) * 100) / 100
}
