import type { DB, LearningPath } from '@/types/models'
import { checkEligibility, isJobOpen } from './eligibility'

/** Skills that open jobs (in the student's scope) require but the student does not list. */
export function missingJobSkills(db: DB, studentId: string): Map<string, number> {
  const me = db.profiles.find(p => p.id === studentId)
  const counts = new Map<string, number>()
  if (!me) return counts
  const skills = db.skills.filter(s => s.student_id === studentId)
  for (const j of db.jobs.filter(isJobOpen)) {
    const rule = db.rules.find(r => r.job_id === j.id)
    const e = checkEligibility(me, j, rule, skills)
    // Only jobs where skills are the gap (dept/batch/CGPA match) are relevant for learning suggestions.
    if (!e.reasons.every(r => r.startsWith('Missing mandatory skill'))) continue
    for (const s of e.missingSkills) counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return counts
}

export function suggestPaths(db: DB, studentId: string): Array<{ path: LearningPath; covers: string[]; jobs: number }> {
  const missing = missingJobSkills(db, studentId)
  return db.paths.map(path => {
    const covers = (path.skill_tags ?? []).filter(t => [...missing.keys()].some(m => m.toLowerCase() === t.toLowerCase()))
    return { path, covers, jobs: covers.reduce((s, c) => s + (missing.get(c) ?? 0), 0) }
  }).filter(x => x.covers.length).sort((a, b) => b.jobs - a.jobs)
}
