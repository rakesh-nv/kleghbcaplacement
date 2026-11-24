// Service layer. Every mutation goes through here, and every business rule is enforced here
// (role checks, eligibility on apply, duplicate prevention, status history, notifications, audit).
// In the database phase these functions become Supabase queries / RPCs / Edge Functions, and the
// same rules move into SQL functions + RLS. Pages never mutate data directly.
import type {
  Application, ApplicationStatus, Company, DB, DriveStatus, Interview, InterviewFeedback, Job, JobEligibilityRule,
  JobStatus, LearningGoal, MessageTemplate, NotificationJob, PlacementDrive, PlacementResult, Profile, ResultStatus,
  ResumeAnalysis, StudentAcademic, StudentCertification, StudentProject, StudentSkill, InstitutionSettings,
} from '@/types/models'
import type { Json as DbJson } from '@/types/database'
import { checkEligibility, isJobOpen } from '@/lib/eligibility'
import { nowISO, uid } from '@/lib/utils'
import { deleteFile, putFile } from '@/lib/fileStore'
import { INTEGRATIONS } from '@/lib/integrations'

export class ApiError extends Error {}

type Commit = (fn: (d: DB) => void) => void
type Get = () => DB
type Me = () => Profile | null

export type StudentInput = Pick<Profile, 'full_name' | 'usn' | 'email' | 'phone' | 'department' | 'degree' | 'batch' | 'semester' | 'cgpa' | 'backlogs'> & { skills?: string[] }
export type CompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at' | 'logo_url' | 'is_active'>
export type JobInput = Omit<Job, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company'>
export type RuleInput = Omit<JobEligibilityRule, 'id' | 'job_id' | 'created_at'>
export type DriveInput = Omit<PlacementDrive, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company' | 'job'>
export type InterviewInput = Pick<Interview, 'application_id' | 'round' | 'round_number' | 'scheduled_at' | 'duration_minutes' | 'venue' | 'meeting_link' | 'instructions'>
export type ResultInput = Pick<PlacementResult, 'application_id' | 'package_lpa' | 'offer_date' | 'joining_date' | 'status'>

const MY_PROFILE_FIELDS = ['full_name', 'phone', 'career_objective', 'interests', 'linkedin_url', 'github_url', 'profile_photo_url'] as const

export function createApi(get: Get, commit: Commit, me: Me) {
  const requireUser = () => { const u = me(); if (!u) throw new ApiError('You must be signed in.'); return u }
  const requireOfficer = () => {
    const u = requireUser()
    if (u.role !== 'placement_officer' && u.role !== 'admin') throw new ApiError('Only placement officers can perform this action.')
    return u
  }
  const requireStudent = () => { const u = requireUser(); if (u.role !== 'student') throw new ApiError('Only students can perform this action.'); return u }

  const audit = (d: DB, action: string, entity_type: string, entity_id: string | null, new_values: unknown = null) => {
    d.auditLogs.unshift({ id: uid('al'), user_id: me()?.id ?? 'system', action, entity_type, entity_id, old_values: null, new_values: (new_values ?? null) as DbJson, ip_address: null, created_at: nowISO() })
    if (d.auditLogs.length > 500) d.auditLogs.length = 500
  }
  const notify = (d: DB, recipient: string, title: string, message: string, link?: string) => {
    d.notifications.unshift({ id: uid('n'), type: 'in_app', title, message, recipient_id: recipient, recipient_group: null, sender_id: me()?.id ?? 'system', status: 'delivered', read_at: null, metadata: link ? { link } : null, created_at: nowISO() })
  }
  const officers = (d: DB) => d.profiles.filter(p => p.role !== 'student' && p.is_active)
  const jobLabel = (d: DB, jobId: string) => {
    const j = d.jobs.find(x => x.id === jobId)
    const c = d.companies.find(x => x.id === j?.company_id)
    return `${j?.title ?? 'Job'} – ${c?.name ?? ''}`
  }
  const find = <T extends { id: string }>(list: T[], id: string, what: string): T => {
    const x = list.find(i => i.id === id); if (!x) throw new ApiError(`${what} not found.`); return x
  }

  const validateStudent = (d: DB, s: StudentInput, ignoreId?: string) => {
    const scale = d.settings.grading_scale
    if (!s.full_name?.trim()) throw new ApiError('Full name is required.')
    if (!s.usn?.trim()) throw new ApiError('USN is required.')
    if (!/^\S+@\S+\.\S+$/.test(s.email ?? '')) throw new ApiError('A valid email is required.')
    if (s.cgpa != null && (s.cgpa < 0 || s.cgpa > scale)) throw new ApiError(`CGPA must be between 0 and ${scale}.`)
    if (s.backlogs != null && s.backlogs < 0) throw new ApiError('Backlogs cannot be negative.')
    const usn = s.usn.trim().toUpperCase(), email = s.email.trim().toLowerCase()
    if (d.profiles.some(p => p.id !== ignoreId && p.usn?.toUpperCase() === usn)) throw new ApiError(`USN ${usn} already exists.`)
    if (d.profiles.some(p => p.id !== ignoreId && p.email.toLowerCase() === email)) throw new ApiError(`Email ${email} is already registered.`)
  }

  const setAppStatus = (d: DB, app: Application, status: ApplicationStatus, note: string | null) => {
    if (app.status === status) return
    d.statusHistory.push({ id: uid('sh'), application_id: app.id, old_status: app.status, new_status: status, changed_by: me()?.id ?? 'system', notes: note, created_at: nowISO() })
    app.status = status
    app.updated_at = nowISO()
  }

  const api = {
    // ── Auth (demo) ──────────────────────────────────────────────────────────
    async login(email: string, password: string): Promise<Profile> {
      const d = get()
      const acct = d.accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!acct || acct.password !== password) throw new ApiError('Invalid email or password.')
      const p = d.profiles.find(x => x.id === acct.profile_id)
      if (!p) throw new ApiError('Account has no profile.')
      if (!p.is_active) throw new ApiError('This account is inactive. Contact the placement cell.')
      return p
    },
    async changePassword(current: string, next: string) {
      const u = requireUser()
      if (next.length < 8) throw new ApiError('New password must be at least 8 characters.')
      commit(d => {
        const a = d.accounts.find(x => x.profile_id === u.id)
        if (!a || a.password !== current) throw new ApiError('Current password is incorrect.')
        a.password = next
      })
    },

    // ── Students (officer) ───────────────────────────────────────────────────
    async createStudent(s: StudentInput): Promise<string> {
      requireOfficer()
      const id = uid('stu')
      commit(d => {
        validateStudent(d, s)
        const t = nowISO()
        d.profiles.push({ id, email: s.email.trim().toLowerCase(), full_name: s.full_name.trim(), phone: s.phone || null, role: 'student', usn: s.usn!.trim().toUpperCase(), department: s.department, degree: s.degree, batch: s.batch, semester: s.semester, cgpa: s.cgpa, backlogs: s.backlogs ?? 0, placement_status: 'not_placed', profile_photo_url: null, career_objective: null, is_active: true, created_at: t, updated_at: t, interests: [], linkedin_url: null, github_url: null })
        d.accounts.push({ email: s.email.trim().toLowerCase(), password: 'Student@123', profile_id: id })
        for (const name of s.skills ?? []) d.skills.push({ id: uid('sk'), student_id: id, skill_name: name, category: 'other', proficiency: 'intermediate', created_at: t, updated_at: t })
        audit(d, 'create', 'student', id, { usn: s.usn })
      })
      return id
    },
    async updateStudent(id: string, s: StudentInput) {
      requireOfficer()
      commit(d => {
        validateStudent(d, s, id)
        const p = find(d.profiles, id, 'Student')
        const oldEmail = p.email
        Object.assign(p, { full_name: s.full_name.trim(), usn: s.usn!.trim().toUpperCase(), email: s.email.trim().toLowerCase(), phone: s.phone || null, department: s.department, degree: s.degree, batch: s.batch, semester: s.semester, cgpa: s.cgpa, backlogs: s.backlogs ?? 0, updated_at: nowISO() })
        const a = d.accounts.find(x => x.email === oldEmail); if (a) a.email = p.email
        audit(d, 'update', 'student', id, s)
      })
    },
    async setStudentActive(id: string, active: boolean) {
      requireOfficer()
      commit(d => { find(d.profiles, id, 'Student').is_active = active; audit(d, active ? 'activate' : 'deactivate', 'student', id) })
    },
    async importStudents(rows: StudentInput[]): Promise<{ created: number; errors: Array<{ row: number; message: string }> }> {
      requireOfficer()
      const errors: Array<{ row: number; message: string }> = []
      let created = 0
      commit(d => {
        rows.forEach((s, i) => {
          try {
            validateStudent(d, s)
            const id = uid('stu'), t = nowISO()
            d.profiles.push({ id, email: s.email.trim().toLowerCase(), full_name: s.full_name.trim(), phone: s.phone || null, role: 'student', usn: s.usn!.trim().toUpperCase(), department: s.department, degree: s.degree, batch: s.batch, semester: s.semester, cgpa: s.cgpa, backlogs: s.backlogs ?? 0, placement_status: 'not_placed', profile_photo_url: null, career_objective: null, is_active: true, created_at: t, updated_at: t, interests: [], linkedin_url: null, github_url: null })
            d.accounts.push({ email: s.email.trim().toLowerCase(), password: 'Student@123', profile_id: id })
            for (const name of s.skills ?? []) d.skills.push({ id: uid('sk'), student_id: id, skill_name: name, category: 'other', proficiency: 'intermediate', created_at: t, updated_at: t })
            created++
          } catch (e) { errors.push({ row: i + 2, message: (e as Error).message }) }
        })
        if (created) audit(d, 'import', 'student', null, { created, failed: errors.length })
      })
      return { created, errors }
    },
    async verifyAcademic(id: string, verified: boolean) {
      requireOfficer()
      commit(d => { const a = find(d.academics, id, 'Academic record'); a.verified = verified; a.updated_at = nowISO(); audit(d, verified ? 'verify' : 'unverify', 'academic', id) })
    },
    /** Officer sets the authoritative CGPA/backlogs used for eligibility (e.g. from verified semester records). */
    async setOfficialAcademics(studentId: string, cgpa: number | null, backlogs: number) {
      requireOfficer()
      commit(d => {
        if (cgpa != null && (cgpa < 0 || cgpa > d.settings.grading_scale)) throw new ApiError('CGPA out of range.')
        const p = find(d.profiles, studentId, 'Student'); p.cgpa = cgpa; p.backlogs = backlogs; p.updated_at = nowISO()
        audit(d, 'set_official_cgpa', 'student', studentId, { cgpa, backlogs })
      })
    },

    // ── Student self-service ─────────────────────────────────────────────────
    async updateMyProfile(updates: Partial<Pick<Profile, typeof MY_PROFILE_FIELDS[number]>>) {
      const u = requireUser()
      const clean = Object.fromEntries(Object.entries(updates).filter(([k]) => (MY_PROFILE_FIELDS as readonly string[]).includes(k)))
      if ('full_name' in clean && !String(clean.full_name).trim()) throw new ApiError('Name cannot be empty.')
      commit(d => { Object.assign(find(d.profiles, u.id, 'Profile'), clean, { updated_at: nowISO() }) })
    },
    async saveAcademic(rec: Pick<StudentAcademic, 'semester' | 'sgpa' | 'credits' | 'backlogs' | 'year'>, id?: string) {
      const u = requireStudent()
      commit(d => {
        if (rec.sgpa != null && (rec.sgpa < 0 || rec.sgpa > d.settings.grading_scale)) throw new ApiError(`SGPA must be between 0 and ${d.settings.grading_scale}.`)
        if (rec.semester < 1 || rec.semester > 8) throw new ApiError('Semester must be between 1 and 8.')
        if (d.academics.some(a => a.student_id === u.id && a.semester === rec.semester && a.id !== id)) throw new ApiError(`Semester ${rec.semester} already has a record.`)
        if (id) {
          const a = find(d.academics, id, 'Record')
          if (a.student_id !== u.id) throw new ApiError('Not allowed.')
          Object.assign(a, rec, { verified: false, updated_at: nowISO() })
        } else d.academics.push({ id: uid('ac'), student_id: u.id, ...rec, cgpa: null, verified: false, created_at: nowISO(), updated_at: nowISO() })
      })
    },
    async deleteAcademic(id: string) {
      const u = requireStudent()
      commit(d => {
        const a = find(d.academics, id, 'Record')
        if (a.student_id !== u.id) throw new ApiError('Not allowed.')
        if (a.verified) throw new ApiError('Verified records can only be changed by the placement cell.')
        d.academics = d.academics.filter(x => x.id !== id)
      })
    },
    async saveSkill(s: Pick<StudentSkill, 'skill_name' | 'category' | 'proficiency'>, id?: string) {
      const u = requireStudent()
      const name = s.skill_name.trim()
      if (!name) throw new ApiError('Skill name is required.')
      commit(d => {
        if (d.skills.some(k => k.student_id === u.id && k.skill_name.toLowerCase() === name.toLowerCase() && k.id !== id)) throw new ApiError(`"${name}" is already in your skills.`)
        const t = nowISO()
        if (id) {
          const k = find(d.skills, id, 'Skill'); if (k.student_id !== u.id) throw new ApiError('Not allowed.')
          Object.assign(k, s, { skill_name: name, updated_at: t })
          d.skillHistory.unshift({ id: uid('skh'), student_id: u.id, skill_name: name, proficiency: s.proficiency, action: 'updated', created_at: t })
        } else {
          d.skills.push({ id: uid('sk'), student_id: u.id, ...s, skill_name: name, created_at: t, updated_at: t })
          d.skillHistory.unshift({ id: uid('skh'), student_id: u.id, skill_name: name, proficiency: s.proficiency, action: 'added', created_at: t })
        }
      })
    },
    async removeSkill(id: string) {
      const u = requireStudent()
      commit(d => {
        const k = find(d.skills, id, 'Skill'); if (k.student_id !== u.id) throw new ApiError('Not allowed.')
        d.skills = d.skills.filter(x => x.id !== id)
        d.skillHistory.unshift({ id: uid('skh'), student_id: u.id, skill_name: k.skill_name, proficiency: k.proficiency, action: 'removed', created_at: nowISO() })
      })
    },
    async addCertification(c: Omit<StudentCertification, 'id' | 'student_id' | 'created_at'>) {
      const u = requireStudent()
      if (!c.name.trim() || !c.issuer.trim()) throw new ApiError('Name and issuer are required.')
      commit(d => { d.certifications.push({ id: uid('ce'), student_id: u.id, ...c, created_at: nowISO() }) })
    },
    async removeCertification(id: string) {
      const u = requireStudent()
      commit(d => { if (find(d.certifications, id, 'Certification').student_id !== u.id) throw new ApiError('Not allowed.'); d.certifications = d.certifications.filter(x => x.id !== id) })
    },
    async addProject(p: Omit<StudentProject, 'id' | 'student_id' | 'created_at'>) {
      const u = requireStudent()
      if (!p.title.trim()) throw new ApiError('Project title is required.')
      commit(d => { d.projects.push({ id: uid('pr'), student_id: u.id, ...p, created_at: nowISO() }) })
    },
    async removeProject(id: string) {
      const u = requireStudent()
      commit(d => { if (find(d.projects, id, 'Project').student_id !== u.id) throw new ApiError('Not allowed.'); d.projects = d.projects.filter(x => x.id !== id) })
    },
    async uploadResume(file: File) {
      const u = requireStudent()
      const max = get().settings.resume_max_mb
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new ApiError('Only PDF files are allowed.')
      if (file.size > max * 1024 * 1024) throw new ApiError(`File is larger than ${max} MB.`)
      const id = uid('rs')
      const ref = await putFile(`resume_${u.id}_${id}`, file)
      const old = get().resumes.filter(r => r.student_id === u.id)
      commit(d => {
        d.resumes = d.resumes.filter(r => r.student_id !== u.id)
        d.resumes.push({ id, student_id: u.id, file_name: file.name, file_url: ref, file_size: file.size, is_primary: true, created_at: nowISO() })
        audit(d, old.length ? 'replace' : 'upload', 'resume', id)
      })
      for (const r of old) await deleteFile(r.file_url)
    },
    async deleteResume(id: string) {
      const u = requireStudent()
      const r = get().resumes.find(x => x.id === id)
      if (!r || r.student_id !== u.id) throw new ApiError('Resume not found.')
      commit(d => { d.resumes = d.resumes.filter(x => x.id !== id); audit(d, 'delete', 'resume', id) })
      await deleteFile(r.file_url)
    },
    async uploadPhoto(file: File) {
      const u = requireUser()
      if (!file.type.startsWith('image/')) throw new ApiError('Please choose an image file.')
      if (file.size > 2 * 1024 * 1024) throw new ApiError('Photo must be under 2 MB.')
      const ref = await putFile(`photo_${u.id}`, file)
      commit(d => { find(d.profiles, u.id, 'Profile').profile_photo_url = `${ref}#${Date.now()}` })
    },

    // ── Companies ────────────────────────────────────────────────────────────
    async saveCompany(c: CompanyInput, id?: string): Promise<string> {
      requireOfficer()
      if (!c.name.trim()) throw new ApiError('Company name is required.')
      const newId = id ?? uid('co')
      commit(d => {
        if (d.companies.some(x => x.id !== id && x.name.trim().toLowerCase() === c.name.trim().toLowerCase())) throw new ApiError('A company with this name already exists.')
        if (id) Object.assign(find(d.companies, id, 'Company'), c, { updated_at: nowISO() })
        else d.companies.push({ ...c, id: newId, logo_url: null, is_active: true, created_at: nowISO(), updated_at: nowISO() })
        audit(d, id ? 'update' : 'create', 'company', newId, { name: c.name })
      })
      return newId
    },
    async setCompanyActive(id: string, active: boolean) {
      requireOfficer()
      commit(d => { find(d.companies, id, 'Company').is_active = active; audit(d, active ? 'activate' : 'deactivate', 'company', id) })
    },

    // ── Jobs ─────────────────────────────────────────────────────────────────
    async saveJob(job: JobInput, rule: RuleInput, id?: string): Promise<string> {
      const u = requireOfficer()
      if (!job.title.trim()) throw new ApiError('Job title is required.')
      if (job.salary_min != null && job.salary_max != null && job.salary_min > job.salary_max) throw new ApiError('Minimum package cannot exceed maximum package.')
      if (rule.min_cgpa != null && (rule.min_cgpa < 0 || rule.min_cgpa > get().settings.grading_scale)) throw new ApiError('Minimum CGPA is out of range.')
      if (rule.max_backlogs != null && rule.max_backlogs < 0) throw new ApiError('Maximum backlogs cannot be negative.')
      if (job.status === 'published' && job.application_deadline && new Date(job.application_deadline).getTime() < Date.now()) throw new ApiError('A published job needs a deadline in the future.')
      const newId = id ?? uid('job')
      commit(d => {
        const co = find(d.companies, job.company_id, 'Company')
        if (!co.is_active && job.status === 'published') throw new ApiError('Cannot publish a job for an inactive company.')
        const t = nowISO()
        const wasPublished = id ? d.jobs.find(j => j.id === id)?.status === 'published' : false
        if (id) Object.assign(find(d.jobs, id, 'Job'), job, { updated_at: t })
        else d.jobs.push({ ...job, id: newId, created_by: u.id, created_at: t, updated_at: t })
        const r = d.rules.find(x => x.job_id === newId)
        if (r) Object.assign(r, rule)
        else d.rules.push({ ...rule, id: uid('rule'), job_id: newId, created_at: t })
        if (job.status === 'published' && !wasPublished) {
          const j = d.jobs.find(x => x.id === newId)!, rr = d.rules.find(x => x.job_id === newId)
          d.profiles.filter(p => p.role === 'student' && checkEligibility(p, j, rr, d.skills.filter(s => s.student_id === p.id)).eligible)
            .forEach(p => notify(d, p.id, `New job: ${j.title}`, `${co.name} is hiring. You are eligible — apply before the deadline.`, '/student/jobs'))
        }
        audit(d, id ? 'update' : 'create', 'job', newId, { title: job.title, status: job.status })
      })
      return newId
    },
    async setJobStatus(id: string, status: JobStatus) {
      requireOfficer()
      const j = get().jobs.find(x => x.id === id)
      if (!j) throw new ApiError('Job not found.')
      if (status === 'published' && j.application_deadline && new Date(j.application_deadline).getTime() < Date.now()) throw new ApiError('Extend the application deadline before publishing.')
      const rule = get().rules.find(r => r.job_id === id)
      await api.saveJob({ ...j, status }, rule ?? { eligible_departments: null, eligible_degrees: null, eligible_batches: null, min_cgpa: null, max_backlogs: null, required_skills: null, additional_criteria: null, skills_mandatory: false }, id)
    },

    // ── Applications ─────────────────────────────────────────────────────────
    async applyToJob(jobId: string, coverLetter: string | null) {
      const u = requireStudent()
      commit(d => {
        const me2 = find(d.profiles, u.id, 'Profile')
        const job = find(d.jobs, jobId, 'Job')
        if (!isJobOpen(job)) throw new ApiError('This job is not open for applications.')
        const res = checkEligibility(me2, job, d.rules.find(r => r.job_id === jobId), d.skills.filter(s => s.student_id === u.id))
        if (!res.eligible) throw new ApiError(`You are not eligible: ${res.reasons.join('; ')}`)
        const existing = d.applications.find(a => a.job_id === jobId && a.student_id === u.id)
        if (existing && !(existing.status === 'withdrawn' && d.settings.allow_reapply_after_withdraw)) throw new ApiError(existing.status === 'withdrawn' ? 'You withdrew this application; re-applying is not permitted by the placement policy.' : 'You have already applied to this job.')
        if (d.settings.block_after_accepted_offer && d.results.some(r => r.student_id === u.id && r.status === 'accepted')) throw new ApiError('You have already accepted an offer. Per placement policy, further applications are closed.')
        const resume = d.resumes.find(r => r.student_id === u.id && r.is_primary)
        const t = nowISO()
        if (existing) d.applications = d.applications.filter(a => a.id !== existing.id)
        const id = uid('app')
        d.applications.push({ id, job_id: jobId, student_id: u.id, status: 'applied', resume_url: resume?.file_url ?? null, cover_letter: coverLetter?.trim() || null, officer_notes: null, created_at: t, updated_at: t })
        d.statusHistory.push({ id: uid('sh'), application_id: id, old_status: null, new_status: 'applied', changed_by: u.id, notes: null, created_at: t })
        officers(d).forEach(o => notify(d, o.id, 'New application', `${me2.full_name} (${me2.usn}) applied for ${jobLabel(d, jobId)}.`, '/officer/applications'))
        notify(d, u.id, 'Application submitted', `Your application for ${jobLabel(d, jobId)} was received.`, '/student/applications')
        audit(d, 'apply', 'application', id)
      })
    },
    async withdrawApplication(id: string) {
      const u = requireStudent()
      commit(d => {
        const a = find(d.applications, id, 'Application')
        if (a.student_id !== u.id) throw new ApiError('Not allowed.')
        if (!d.settings.withdrawable_statuses.includes(a.status)) throw new ApiError(`Applications cannot be withdrawn once they are "${a.status.replace(/_/g, ' ')}".`)
        setAppStatus(d, a, 'withdrawn', 'Withdrawn by student')
        officers(d).forEach(o => notify(d, o.id, 'Application withdrawn', `${u.full_name} withdrew from ${jobLabel(d, a.job_id)}.`, '/officer/applications'))
        audit(d, 'withdraw', 'application', id)
      })
    },
    async updateApplicationStatus(ids: string[], status: ApplicationStatus, note: string | null) {
      requireOfficer()
      commit(d => {
        for (const id of ids) {
          const a = find(d.applications, id, 'Application')
          if (a.status === 'withdrawn') throw new ApiError('Withdrawn applications cannot be changed.')
          if (status === 'accepted' && !d.results.some(r => r.application_id === id)) throw new ApiError('Record the offer in Placement Results before marking it accepted.')
          const old = a.status
          setAppStatus(d, a, status, note)
          if (old !== status) notify(d, a.student_id, `Application update: ${status.replace(/_/g, ' ')}`, `Your application for ${jobLabel(d, a.job_id)} is now "${status.replace(/_/g, ' ')}".${note ? ` Note: ${note}` : ''}`, '/student/applications')
        }
        audit(d, 'status_change', 'application', ids.join(','), { status, note })
      })
    },
    async saveOfficerNotes(id: string, notes: string) {
      requireOfficer()
      commit(d => { const a = find(d.applications, id, 'Application'); a.officer_notes = notes.trim() || null; a.updated_at = nowISO() })
    },

    // ── Drives ───────────────────────────────────────────────────────────────
    async saveDrive(input: DriveInput, id?: string): Promise<string> {
      const u = requireOfficer()
      if (!input.title.trim()) throw new ApiError('Title is required.')
      if (!input.drive_date) throw new ApiError('Drive date is required.')
      if (input.registration_deadline && new Date(input.registration_deadline) > new Date(input.drive_date)) throw new ApiError('Registration deadline must be before the drive date.')
      if (input.mode !== 'online' && !input.venue?.trim()) throw new ApiError('Venue is required for on-campus / hybrid drives.')
      const newId = id ?? uid('dr')
      commit(d => {
        const t = nowISO()
        const prev = id ? d.drives.find(x => x.id === id) : undefined
        const scheduleChanged = prev && (prev.drive_date !== input.drive_date || prev.venue !== input.venue || prev.mode !== input.mode)
        if (id) Object.assign(find(d.drives, id, 'Drive'), input, { updated_at: t })
        else d.drives.push({ ...input, id: newId, created_by: u.id, created_at: t, updated_at: t })
        const co = d.companies.find(c => c.id === input.company_id)
        if (!id && input.job_id) {
          const j = d.jobs.find(x => x.id === input.job_id), r = d.rules.find(x => x.job_id === input.job_id)
          if (j) d.profiles.filter(p => p.role === 'student' && checkEligibility(p, j, r, d.skills.filter(s => s.student_id === p.id)).eligible)
            .forEach(p => notify(d, p.id, `New placement drive: ${input.title}`, `${co?.name ?? ''} drive on ${new Date(input.drive_date).toLocaleString('en-IN')}. Register on the portal.`, '/student/jobs'))
        }
        if (scheduleChanged) d.driveRegistrations.filter(r => r.drive_id === newId).forEach(r => notify(d, r.student_id, `Schedule changed: ${input.title}`, `New date/venue: ${new Date(input.drive_date).toLocaleString('en-IN')} – ${input.mode === 'online' ? 'Online' : input.venue}.`, '/student/jobs'))
        audit(d, id ? 'update' : 'create', 'drive', newId, { title: input.title })
      })
      return newId
    },
    async setDriveStatus(id: string, status: DriveStatus) {
      requireOfficer()
      commit(d => {
        const dr = find(d.drives, id, 'Drive'); dr.status = status; dr.updated_at = nowISO()
        if (status === 'cancelled') d.driveRegistrations.filter(r => r.drive_id === id).forEach(r => notify(d, r.student_id, `Drive cancelled: ${dr.title}`, 'This placement drive has been cancelled.', '/student/jobs'))
        audit(d, 'status_change', 'drive', id, { status })
      })
    },
    async registerForDrive(driveId: string, studentIds: string[]): Promise<{ added: number; skipped: string[] }> {
      const u = requireUser()
      const isOfficer = u.role !== 'student'
      if (!isOfficer && (studentIds.length !== 1 || studentIds[0] !== u.id)) throw new ApiError('Students can only register themselves.')
      let added = 0
      const skipped: string[] = []
      commit(d => {
        const dr = find(d.drives, driveId, 'Drive')
        if (dr.status !== 'upcoming') throw new ApiError('Registration is only possible for upcoming drives.')
        if (!isOfficer && dr.registration_deadline && new Date(dr.registration_deadline).getTime() < Date.now()) throw new ApiError('Registration deadline has passed.')
        const job = dr.job_id ? d.jobs.find(j => j.id === dr.job_id) : undefined
        const rule = job ? d.rules.find(r => r.job_id === job.id) : undefined
        for (const sid of studentIds) {
          const p = d.profiles.find(x => x.id === sid)
          if (!p) continue
          if (d.driveRegistrations.some(r => r.drive_id === driveId && r.student_id === sid)) { skipped.push(`${p.full_name}: already registered`); continue }
          if (job) { const e = checkEligibility(p, job, rule, d.skills.filter(s => s.student_id === sid)); if (!e.eligible) { skipped.push(`${p.full_name}: ${e.reasons[0]}`); continue } }
          d.driveRegistrations.push({ id: uid('dreg'), drive_id: driveId, student_id: sid, registered_at: nowISO(), attended: null, created_at: nowISO() })
          notify(d, sid, `Registered: ${dr.title}`, `You are registered for the drive on ${new Date(dr.drive_date).toLocaleString('en-IN')}.`, '/student/jobs')
          added++
        }
        if (!isOfficer && skipped.length) throw new ApiError(skipped[0])
      })
      return { added, skipped }
    },
    async unregisterFromDrive(regId: string) {
      const u = requireUser()
      commit(d => {
        const r = find(d.driveRegistrations, regId, 'Registration')
        if (u.role === 'student' && r.student_id !== u.id) throw new ApiError('Not allowed.')
        d.driveRegistrations = d.driveRegistrations.filter(x => x.id !== regId)
      })
    },
    async markDriveAttendance(regId: string, attended: boolean | null) {
      requireOfficer()
      commit(d => { find(d.driveRegistrations, regId, 'Registration').attended = attended })
    },

    // ── Interviews ───────────────────────────────────────────────────────────
    async scheduleInterview(input: InterviewInput): Promise<string> {
      const u = requireOfficer()
      if (!input.scheduled_at) throw new ApiError('Date and time are required.')
      if (!input.venue?.trim() && !input.meeting_link?.trim()) throw new ApiError('Provide a venue or a meeting link.')
      if (input.meeting_link && !/^https?:\/\//.test(input.meeting_link)) throw new ApiError('Meeting link must start with http:// or https://')
      const id = uid('iv')
      commit(d => {
        const a = find(d.applications, input.application_id, 'Application')
        if (['withdrawn', 'rejected'].includes(a.status)) throw new ApiError(`Cannot schedule an interview for a ${a.status} application.`)
        const job = find(d.jobs, a.job_id, 'Job')
        const start = new Date(input.scheduled_at).getTime(), end = start + input.duration_minutes * 60000
        const clash = d.interviews.find(iv => iv.student_id === a.student_id && iv.status !== 'cancelled' && iv.status !== 'completed' && start < new Date(iv.scheduled_at).getTime() + iv.duration_minutes * 60000 && new Date(iv.scheduled_at).getTime() < end)
        if (clash) throw new ApiError('The student already has an interview at that time.')
        const t = nowISO()
        d.interviews.push({ id, ...input, job_id: a.job_id, student_id: a.student_id, company_id: job.company_id, status: 'scheduled', attended: null, cancel_reason: null, created_by: u.id, created_at: t, updated_at: t })
        if (['applied', 'under_review', 'shortlisted'].includes(a.status)) setAppStatus(d, a, 'interview_scheduled', `${input.round.replace(/_/g, ' ')} round scheduled`)
        notify(d, a.student_id, `Interview scheduled – ${jobLabel(d, a.job_id)}`, `Round ${input.round_number} (${input.round.replace(/_/g, ' ')}) on ${new Date(input.scheduled_at).toLocaleString('en-IN')}.`, '/student/interviews')
        audit(d, 'schedule', 'interview', id)
      })
      return id
    },
    async rescheduleInterview(id: string, changes: Pick<Interview, 'scheduled_at' | 'duration_minutes' | 'venue' | 'meeting_link' | 'instructions'>) {
      requireOfficer()
      commit(d => {
        const iv = find(d.interviews, id, 'Interview')
        if (iv.status === 'cancelled' || iv.status === 'completed') throw new ApiError(`Cannot reschedule a ${iv.status} interview.`)
        const moved = iv.scheduled_at !== changes.scheduled_at
        Object.assign(iv, changes, { status: moved ? 'rescheduled' : iv.status, updated_at: nowISO() })
        notify(d, iv.student_id, `Interview ${moved ? 'rescheduled' : 'updated'} – ${jobLabel(d, iv.job_id)}`, `Now on ${new Date(iv.scheduled_at).toLocaleString('en-IN')}${iv.venue ? ` at ${iv.venue}` : ''}.`, '/student/interviews')
        audit(d, 'reschedule', 'interview', id)
      })
    },
    async cancelInterview(id: string, reason: string) {
      requireOfficer()
      commit(d => {
        const iv = find(d.interviews, id, 'Interview')
        iv.status = 'cancelled'; iv.cancel_reason = reason || null; iv.updated_at = nowISO()
        notify(d, iv.student_id, `Interview cancelled – ${jobLabel(d, iv.job_id)}`, reason ? `Reason: ${reason}` : 'The placement cell will share an updated schedule if applicable.', '/student/interviews')
        audit(d, 'cancel', 'interview', id)
      })
    },
    async recordInterviewOutcome(id: string, attended: boolean, fb: Pick<InterviewFeedback, 'feedback' | 'rating' | 'result'> | null) {
      const u = requireOfficer()
      commit(d => {
        const iv = find(d.interviews, id, 'Interview')
        if (iv.status === 'cancelled') throw new ApiError('Interview was cancelled.')
        iv.attended = attended; iv.status = 'completed'; iv.updated_at = nowISO()
        d.feedback = d.feedback.filter(f => f.interview_id !== id)
        if (fb && (fb.feedback.trim() || fb.result)) d.feedback.push({ id: uid('fb'), interview_id: id, ...fb, given_by: u.id, created_at: nowISO() })
        audit(d, 'outcome', 'interview', id, { attended, result: fb?.result })
      })
    },

    // ── Results ──────────────────────────────────────────────────────────────
    async saveResult(input: ResultInput, id?: string) {
      const u = requireOfficer()
      if (input.package_lpa != null && input.package_lpa < 0) throw new ApiError('Package cannot be negative.')
      if (input.offer_date && input.joining_date && input.joining_date < input.offer_date) throw new ApiError('Joining date cannot be before the offer date.')
      commit(d => {
        const a = find(d.applications, input.application_id, 'Application')
        if (d.results.some(r => r.application_id === a.id && r.id !== id)) throw new ApiError('A placement result already exists for this application.')
        if (input.status === 'accepted' && d.results.some(r => r.student_id === a.student_id && r.status === 'accepted' && r.id !== id)) throw new ApiError('This student has already accepted another offer.')
        const job = find(d.jobs, a.job_id, 'Job')
        const t = nowISO()
        if (id) Object.assign(find(d.results, id, 'Result'), input, { updated_at: t })
        else d.results.push({ id: uid('res'), student_id: a.student_id, job_id: a.job_id, company_id: job.company_id, ...input, offer_letter_url: null, created_by: u.id, created_at: t, updated_at: t })
        const target: ApplicationStatus = input.status === 'accepted' ? 'accepted' : input.status === 'declined' ? a.status : 'offered'
        if (input.status !== 'declined') setAppStatus(d, a, target, 'Placement result recorded')
        notify(d, a.student_id, `Offer ${input.status === 'pending' ? 'received' : input.status} – ${jobLabel(d, a.job_id)}`, 'See Placement Status for details.', '/student/placement')
        audit(d, id ? 'update' : 'create', 'placement_result', id ?? a.id, input)
      })
    },
    async setResultStatus(id: string, status: ResultStatus) {
      const r = get().results.find(x => x.id === id)
      if (!r) throw new ApiError('Result not found.')
      await api.saveResult({ application_id: r.application_id, package_lpa: r.package_lpa, offer_date: r.offer_date, joining_date: r.joining_date, status }, id)
    },
    async deleteResult(id: string) {
      requireOfficer()
      commit(d => { d.results = d.results.filter(r => r.id !== id); audit(d, 'delete', 'placement_result', id) })
    },

    // ── Resume analysis ──────────────────────────────────────────────────────
    async saveAnalysis(a: Omit<ResumeAnalysis, 'id' | 'created_at'>) {
      const u = requireUser()
      if (u.role === 'student' && a.student_id !== u.id) throw new ApiError('Not allowed.')
      commit(d => { d.analyses.unshift({ ...a, id: uid('ra'), created_at: nowISO() }) })
    },

    // ── Learning ─────────────────────────────────────────────────────────────
    async setResourceProgress(resourceId: string, patch: { completed?: boolean; saved?: boolean }) {
      const u = requireStudent()
      commit(d => {
        const res = find(d.resources, resourceId, 'Resource')
        let p = d.progress.find(x => x.student_id === u.id && x.resource_id === resourceId)
        if (!p) { p = { id: uid('pg'), student_id: u.id, resource_id: resourceId, path_id: d.paths.find(x => x.resources.includes(res.id))?.id ?? null, completed: false, progress_percent: 0, notes: null, saved: false, created_at: nowISO(), updated_at: nowISO() }; d.progress.push(p) }
        if (patch.completed !== undefined) { p.completed = patch.completed; p.progress_percent = patch.completed ? 100 : 0 }
        if (patch.saved !== undefined) p.saved = patch.saved
        p.updated_at = nowISO()
      })
    },
    /** Scoring happens here (server side in phase 2), never trusted from the client. */
    async submitQuiz(quizId: string, answers: Record<string, number>, seconds: number) {
      const u = requireStudent()
      const d0 = get()
      const quiz = find(d0.quizzes, quizId, 'Quiz')
      const qs = d0.questions.filter(q => q.quiz_id === quizId)
      const total = qs.reduce((s, q) => s + q.points, 0)
      const score = qs.reduce((s, q) => s + (answers[q.id] === q.correct_option ? q.points : 0), 0)
      const attempt = { id: uid('qa'), quiz_id: quizId, student_id: u.id, answers, score, total_points: total, passed: total > 0 && (score / total) * 100 >= quiz.passing_score, time_taken_seconds: seconds, created_at: nowISO() }
      commit(d => { d.attempts.push(attempt) })
      return attempt
    },
    async saveGoal(title: string, weekStart: string) {
      const u = requireStudent()
      if (!title.trim()) throw new ApiError('Goal cannot be empty.')
      commit(d => { d.goals.push({ id: uid('goal'), student_id: u.id, week_start: weekStart, title: title.trim(), done: false, created_at: nowISO() } satisfies LearningGoal) })
    },
    async toggleGoal(id: string) {
      const u = requireStudent()
      commit(d => { const g = find(d.goals, id, 'Goal'); if (g.student_id !== u.id) throw new ApiError('Not allowed.'); g.done = !g.done })
    },
    async deleteGoal(id: string) {
      const u = requireStudent()
      commit(d => { d.goals = d.goals.filter(g => !(g.id === id && g.student_id === u.id)) })
    },

    // ── Notifications ────────────────────────────────────────────────────────
    async markRead(id: string) {
      const u = requireUser()
      commit(d => { const n = d.notifications.find(x => x.id === id && x.recipient_id === u.id); if (n && !n.read_at) { n.read_at = nowISO(); n.status = 'read' } })
    },
    async markAllRead() {
      const u = requireUser()
      commit(d => { d.notifications.forEach(n => { if (n.recipient_id === u.id && !n.read_at) { n.read_at = nowISO(); n.status = 'read' } }) })
    },
    async deleteNotification(id: string) {
      const u = requireUser()
      commit(d => { d.notifications = d.notifications.filter(n => !(n.id === id && n.recipient_id === u.id)) })
    },
    /**
     * Sends a broadcast. External channels go through INTEGRATIONS; with no provider configured
     * every delivery is logged as FAILED with the reason, never reported as sent.
     */
    async sendBroadcast(opts: { channel: 'email' | 'whatsapp'; recipientIds: string[]; subject: string | null; body: string; alsoInApp: boolean; filterSummary: string; templateId: string | null }): Promise<NotificationJob> {
      const u = requireOfficer()
      if (!opts.recipientIds.length) throw new ApiError('Select at least one recipient.')
      if (!opts.body.trim()) throw new ApiError('Message cannot be empty.')
      if (opts.channel === 'email' && !opts.subject?.trim()) throw new ApiError('Email subject is required.')
      const d0 = get()
      if (opts.channel === 'whatsapp' && opts.templateId) {
        const tpl = d0.templates.find(t => t.id === opts.templateId)
        if (tpl && !tpl.approved) throw new ApiError('This WhatsApp template is not approved yet. Business-initiated WhatsApp messages require an approved template.')
      }
      const provider = INTEGRATIONS[opts.channel]
      const jobId = uid('nj')
      const recipients = d0.profiles.filter(p => opts.recipientIds.includes(p.id))
      const outcomes = await Promise.all(recipients.map(async p => {
        const contact = opts.channel === 'email' ? p.email : p.phone ?? ''
        const body = opts.body.replace(/\{\{\s*name\s*\}\}/g, p.full_name)
        const subject = opts.subject?.replace(/\{\{\s*name\s*\}\}/g, p.full_name) ?? null
        if (!contact) return { p, contact, body, subject, ok: false, error: opts.channel === 'whatsapp' ? 'No phone number on record' : 'No email on record' }
        const r = await provider.send({ to: contact, subject, body })
        return { p, contact, body, subject, ok: r.ok, error: r.error ?? null }
      }))
      const okCount = outcomes.filter(o => o.ok).length
      const job: NotificationJob = { id: jobId, channel: opts.channel, subject: opts.subject, body: opts.body, recipient_ids: opts.recipientIds, filter_summary: opts.filterSummary, sender_id: u.id, status: okCount === outcomes.length ? 'sent' : okCount === 0 ? 'failed' : 'partially_failed', created_at: nowISO() }
      commit(d => {
        d.notificationJobs.unshift(job)
        const t = nowISO()
        for (const o of outcomes) {
          const nid = uid('n')
          d.notifications.unshift({ id: nid, type: opts.channel, title: o.subject ?? `WhatsApp message`, message: o.body, recipient_id: o.p.id, recipient_group: { job: jobId } as DbJson, sender_id: u.id, status: o.ok ? 'sent' : 'failed', read_at: null, metadata: { job: jobId, error: o.error } as DbJson, created_at: t })
          d.deliveryLogs.unshift({ id: uid('dl'), notification_id: nid, channel: opts.channel, recipient_id: o.p.id, recipient_contact: o.contact, status: o.ok ? 'sent' : 'failed', error_message: o.error, sent_at: o.ok ? t : null, delivered_at: null, created_at: t })
          if (opts.alsoInApp) notify(d, o.p.id, o.subject ?? 'Message from the placement cell', o.body)
        }
        audit(d, 'broadcast', opts.channel, jobId, { recipients: outcomes.length, sent: okCount })
      })
      return job
    },

    // ── Settings & templates ─────────────────────────────────────────────────
    async updateSettings(s: Partial<InstitutionSettings>) {
      requireOfficer()
      if (s.grading_scale != null && (s.grading_scale < 4 || s.grading_scale > 100)) throw new ApiError('Grading scale looks invalid.')
      commit(d => { Object.assign(d.settings, s); audit(d, 'update', 'settings', null, s) })
    },
    async saveTemplate(t: Omit<MessageTemplate, 'id'>, id?: string) {
      requireOfficer()
      if (!t.name.trim() || !t.body.trim()) throw new ApiError('Template name and body are required.')
      commit(d => {
        if (id) Object.assign(find(d.templates, id, 'Template'), t)
        else d.templates.push({ ...t, id: uid('tpl') })
      })
    },
    async deleteTemplate(id: string) {
      requireOfficer()
      commit(d => { d.templates = d.templates.filter(t => t.id !== id) })
    },
    }
  return api
}

export type Api = ReturnType<typeof createApi>
