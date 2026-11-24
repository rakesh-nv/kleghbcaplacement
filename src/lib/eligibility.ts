import type { DB, Job, JobEligibilityRule, Profile, StudentSkill } from '@/types/models'

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
  matchedSkills: string[]
  missingSkills: string[]
  /** 0–100, share of the job's required skills the student lists. Informational only. */
  skillMatch: number
}

const norm = (s: string) => s.trim().toLowerCase()

export function skillOverlap(have: string[], need: string[]) {
  const set = new Set(have.map(norm))
  const matched = need.filter(s => set.has(norm(s)))
  const missing = need.filter(s => !set.has(norm(s)))
  return { matched, missing, score: need.length ? Math.round((matched.length / need.length) * 100) : 100 }
}

/**
 * Pure eligibility check. This mirrors the SQL function `check_eligibility` that the
 * database phase will enforce server-side; keep the two in sync.
 */
export function checkEligibility(
  student: Profile,
  job: Job,
  rule: JobEligibilityRule | undefined,
  studentSkills: StudentSkill[],
): EligibilityResult {
  const reasons: string[] = []
  const required = rule?.required_skills?.length ? rule.required_skills : (job.required_skills ?? [])
  const { matched, missing, score } = skillOverlap(studentSkills.map(s => s.skill_name), required)

  if (!student.is_active) reasons.push('Student record is inactive')
  if (rule) {
    if (rule.eligible_departments?.length && !rule.eligible_departments.includes(student.department ?? ''))
      reasons.push(`Department "${student.department ?? 'not set'}" is not eligible (allowed: ${rule.eligible_departments.join(', ')})`)
    if (rule.eligible_degrees?.length && !rule.eligible_degrees.includes(student.degree ?? ''))
      reasons.push(`Degree "${student.degree ?? 'not set'}" is not eligible (allowed: ${rule.eligible_degrees.join(', ')})`)
    if (rule.eligible_batches?.length && !rule.eligible_batches.includes(student.batch ?? -1))
      reasons.push(`Batch ${student.batch ?? 'not set'} is not eligible (allowed: ${rule.eligible_batches.join(', ')})`)
    if (rule.min_cgpa != null) {
      if (student.cgpa == null) reasons.push(`CGPA not recorded (minimum ${rule.min_cgpa} required)`)
      else if (student.cgpa < rule.min_cgpa) reasons.push(`CGPA ${student.cgpa} is below the minimum ${rule.min_cgpa}`)
    }
    if (rule.max_backlogs != null && (student.backlogs ?? 0) > rule.max_backlogs)
      reasons.push(`${student.backlogs} active backlog(s); maximum allowed is ${rule.max_backlogs}`)
    if (rule.skills_mandatory && missing.length)
      reasons.push(`Missing mandatory skill(s): ${missing.join(', ')}`)
  }
  return { eligible: reasons.length === 0, reasons, matchedSkills: matched, missingSkills: missing, skillMatch: score }
}

export function eligibilityFor(db: DB, studentId: string, jobId: string): EligibilityResult | null {
  const student = db.profiles.find(p => p.id === studentId)
  const job = db.jobs.find(j => j.id === jobId)
  if (!student || !job) return null
  return checkEligibility(student, job, db.rules.find(r => r.job_id === jobId), db.skills.filter(s => s.student_id === studentId))
}

export function isJobOpen(job: Job): boolean {
  return job.status === 'published' && (!job.application_deadline || new Date(job.application_deadline).getTime() >= Date.now())
}
