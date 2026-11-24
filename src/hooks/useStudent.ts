import { useMemo } from 'react'
import { useData, useMe } from '@/store/DataContext'
import { checkEligibility, isJobOpen, type EligibilityResult } from '@/lib/eligibility'
import type { Job } from '@/types/models'

export interface JobView { job: Job; e: EligibilityResult; applied?: string; daysLeft: number | null }

/** Everything the signed-in student may see, scoped to their own records (mirrors RLS). */
export function useStudent() {
  const { db } = useData()
  const me = useMe()
  return useMemo(() => {
    const skills = db.skills.filter(s => s.student_id === me.id)
    const resume = db.resumes.find(r => r.student_id === me.id)
    const apps = db.applications.filter(a => a.student_id === me.id)
    const interviews = db.interviews.filter(i => i.student_id === me.id)
    const results = db.results.filter(r => r.student_id === me.id)
    const academics = db.academics.filter(a => a.student_id === me.id).sort((a, b) => a.semester - b.semester)
    const certs = db.certifications.filter(c => c.student_id === me.id)
    const projects = db.projects.filter(p => p.student_id === me.id)
    // Students only ever see published jobs that are still open, or jobs they already applied to.
    const visibleJobs = db.jobs.filter(j => isJobOpen(j) || apps.some(a => a.job_id === j.id))
    const jobViews: JobView[] = visibleJobs.filter(isJobOpen).map(job => ({
      job,
      e: checkEligibility(me, job, db.rules.find(r => r.job_id === job.id), skills),
      applied: apps.find(a => a.job_id === job.id)?.status,
      daysLeft: job.application_deadline ? Math.ceil((new Date(job.application_deadline).getTime() - Date.now()) / 86400000) : null,
    }))

    const checks = [
      { label: 'Phone number', done: !!me.phone, to: '/student/profile' },
      { label: 'Career objective', done: !!me.career_objective, to: '/student/profile' },
      { label: 'Profile photo', done: !!me.profile_photo_url, to: '/student/profile' },
      { label: 'Career interests', done: me.interests.length > 0, to: '/student/profile' },
      { label: 'At least 3 skills', done: skills.length >= 3, to: '/student/skills' },
      { label: 'Resume uploaded', done: !!resume, to: '/student/resume' },
      { label: 'Semester records', done: academics.length > 0, to: '/student/academics' },
      { label: 'A project or certification', done: projects.length + certs.length > 0, to: '/student/skills' },
    ]
    const completion = Math.round((checks.filter(c => c.done).length / checks.length) * 100)
    return { me, skills, resume, apps, interviews, results, academics, certs, projects, jobViews, checks, completion, settings: db.settings }
  }, [db, me])
}

export interface Recommendation extends JobView { score: number; why: string[] }

export function recommend(views: JobView[], skills: string[], interests: string[], cgpa: number | null, rules: Map<string, { min_cgpa: number | null }>): { eligible: Recommendation[]; stretch: Recommendation[] } {
  const score = (v: JobView): Recommendation => {
    const why: string[] = []
    if (v.e.matchedSkills.length) why.push(`You have ${v.e.matchedSkills.length}/${v.e.matchedSkills.length + v.e.missingSkills.length} required skills (${v.e.matchedSkills.join(', ')})`)
    const text = `${v.job.title} ${v.job.description ?? ''} ${(v.job.required_skills ?? []).join(' ')}`.toLowerCase()
    const hits = interests.filter(i => i.toLowerCase().split(/\s+/).some(w => w.length > 3 && text.includes(w.toLowerCase())))
    if (hits.length) why.push(`Matches your interest in ${hits.join(', ')}`)
    const min = rules.get(v.job.id)?.min_cgpa
    if (v.e.eligible && min != null && cgpa != null) why.push(`Your CGPA ${cgpa} meets the minimum ${min}`)
    if (v.daysLeft != null && v.daysLeft <= 7) why.push(`Deadline in ${v.daysLeft} day(s)`)
    void skills
    return { ...v, why, score: v.e.skillMatch * 0.7 + hits.length * 15 + (v.daysLeft != null && v.daysLeft <= 7 ? 5 : 0) }
  }
  const open = views.filter(v => !v.applied)
  return {
    eligible: open.filter(v => v.e.eligible).map(score).sort((a, b) => b.score - a.score),
    // Not eligible today only because of skills they can learn — shown as suggestions, never as eligible.
    stretch: open.filter(v => !v.e.eligible && v.e.reasons.every(r => r.startsWith('Missing mandatory skill'))).map(score),
  }
}
