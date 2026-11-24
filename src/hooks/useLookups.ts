import { useMemo } from 'react'
import { useData } from '@/store/DataContext'
import type { Company, Job, JobEligibilityRule, Profile, StudentResume, StudentSkill } from '@/types/models'
import { checkEligibility, type EligibilityResult } from '@/lib/eligibility'

export function useLookups() {
  const { db } = useData()
  return useMemo(() => {
    const profile = new Map<string, Profile>(db.profiles.map(p => [p.id, p]))
    const company = new Map<string, Company>(db.companies.map(c => [c.id, c]))
    const job = new Map<string, Job>(db.jobs.map(j => [j.id, j]))
    const rule = new Map<string, JobEligibilityRule>(db.rules.map(r => [r.job_id, r]))
    const resume = new Map<string, StudentResume>()
    for (const r of db.resumes) if (r.is_primary || !resume.has(r.student_id)) resume.set(r.student_id, r)
    const skills = new Map<string, StudentSkill[]>()
    for (const s of db.skills) skills.set(s.student_id, [...(skills.get(s.student_id) ?? []), s])
    const students = db.profiles.filter(p => p.role === 'student')
    const nameOf = (id: string) => id === 'system' ? 'System' : profile.get(id)?.full_name ?? 'Unknown'
    const jobTitle = (id: string) => { const j = job.get(id); return j ? `${j.title} – ${company.get(j.company_id)?.name ?? ''}` : 'Unknown job' }
    const eligibility = (studentId: string, jobId: string): EligibilityResult | null => {
      const p = profile.get(studentId), j = job.get(jobId)
      return p && j ? checkEligibility(p, j, rule.get(jobId), skills.get(studentId) ?? []) : null
    }
    return { profile, company, job, rule, resume, skills, students, nameOf, jobTitle, eligibility }
  }, [db.profiles, db.companies, db.jobs, db.rules, db.resumes, db.skills])
}

export function useUniqueValues() {
  const { db } = useData()
  return useMemo(() => {
    const students = db.profiles.filter(p => p.role === 'student')
    const batches = [...new Set(students.map(s => s.batch).filter((b): b is number => b != null))].sort((a, b) => b - a)
    return { batches, departments: db.settings.departments, degrees: db.settings.degrees }
  }, [db.profiles, db.settings])
}
