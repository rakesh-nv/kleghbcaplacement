import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Send, XCircle, Archive, Users, UserCheck } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Banner, CheckboxGroup, Chips, Field, FilterBar, Input, KV, PageHeader, SearchInput, Select, TagInput, Textarea } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatLPA, isPast, toLocalInput } from '@/lib/utils'
import { optNum, optStr } from '@/lib/forms'
import { SKILL_DICTIONARY } from '@/lib/resumeAnalyzer'
import { isJobOpen } from '@/lib/eligibility'
import type { Job, JobStatus } from '@/types/models'

const ALL_SKILLS = Object.values(SKILL_DICTIONARY).flat()
const JOB_TYPES = ['Full-time', 'Internship', 'Internship + PPO', 'Part-time', 'Contract']

const schema = z.object({
  company_id: z.string().min(1, 'Select a company'),
  title: z.string().trim().min(3, 'Job title is required'),
  description: optStr,
  responsibilities: optStr,
  salary_min: optNum(0, 100),
  salary_max: optNum(0, 100),
  job_type: z.string().min(1),
  location: optStr,
  application_deadline: z.string().min(1, 'Deadline is required'),
  status: z.enum(['draft', 'published']),
  min_cgpa: optNum(0, 10),
  max_backlogs: optNum(0, 20),
  skills_mandatory: z.boolean(),
  additional_criteria: optStr,
}).refine(v => v.salary_min == null || v.salary_max == null || v.salary_min <= v.salary_max, { message: 'Minimum must not exceed maximum', path: ['salary_max'] })
  .refine(v => v.status !== 'published' || new Date(v.application_deadline).getTime() > Date.now(), { message: 'A published job needs a future deadline', path: ['application_deadline'] })
type In = z.input<typeof schema>
type Out = z.output<typeof schema>

function JobForm({ initial, companyId, onDone }: { initial?: Job; companyId?: string; onDone: (id: string) => void }) {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const { batches } = useUniqueValues()
  const rule = initial ? lk.rule.get(initial.id) : undefined
  const [skills, setSkills] = useState<string[]>(rule?.required_skills ?? initial?.required_skills ?? [])
  const [depts, setDepts] = useState<string[]>(rule?.eligible_departments ?? [])
  const [degrees, setDegrees] = useState<string[]>(rule?.eligible_degrees ?? [])
  const [jobBatches, setJobBatches] = useState<number[]>(rule?.eligible_batches ?? (batches.length ? [Math.max(...batches)] : []))
  const { register, handleSubmit, formState: { errors } } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: initial ? {
      company_id: initial.company_id, title: initial.title, description: initial.description ?? '', responsibilities: initial.responsibilities ?? '',
      salary_min: initial.salary_min ?? '', salary_max: initial.salary_max ?? '', job_type: initial.job_type ?? 'Full-time', location: initial.location ?? '',
      application_deadline: initial.application_deadline ? toLocalInput(initial.application_deadline) : '', status: initial.status === 'published' ? 'published' : 'draft',
      min_cgpa: rule?.min_cgpa ?? '', max_backlogs: rule?.max_backlogs ?? '', skills_mandatory: rule?.skills_mandatory ?? false, additional_criteria: rule?.additional_criteria ?? '',
    } : { company_id: companyId ?? '', job_type: 'Full-time', status: 'draft', skills_mandatory: false, max_backlogs: 0 },
  })
  const submit = async (v: Out) => {
    let id = ''
    const ok = await run(async () => {
      id = await api.saveJob(
        { company_id: v.company_id, title: v.title, description: v.description, responsibilities: v.responsibilities, required_skills: skills, salary_min: v.salary_min, salary_max: v.salary_max, job_type: v.job_type, location: v.location, application_deadline: new Date(v.application_deadline).toISOString(), status: initial && !['draft', 'published'].includes(initial.status) ? initial.status : v.status },
        { eligible_departments: depts.length ? depts : null, eligible_degrees: degrees.length ? degrees : null, eligible_batches: jobBatches.length ? jobBatches : null, min_cgpa: v.min_cgpa, max_backlogs: v.max_backlogs, required_skills: skills, skills_mandatory: v.skills_mandatory, additional_criteria: v.additional_criteria },
        initial?.id)
    }, initial ? 'Job updated' : v.status === 'published' ? 'Job published — eligible students notified' : 'Draft saved')
    if (ok) onDone(id)
  }
  const companies = db.companies.filter(c => c.is_active || c.id === initial?.company_id)
  return (
    <form id="job-form" onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Company" required error={errors.company_id?.message}><Select {...register('company_id')}><option value="">Select…</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Job title" required error={errors.title?.message}><Input {...register('title')} /></Field>
        <Field label="Job type"><Select {...register('job_type')}>{JOB_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Location"><Input {...register('location')} /></Field>
        <Field label="Package min (LPA)" error={errors.salary_min?.message}><Input type="number" step="0.01" {...register('salary_min')} /></Field>
        <Field label="Package max (LPA)" error={errors.salary_max?.message}><Input type="number" step="0.01" {...register('salary_max')} /></Field>
        <Field label="Application deadline" required error={errors.application_deadline?.message}><Input type="datetime-local" {...register('application_deadline')} /></Field>
        {(!initial || ['draft', 'published'].includes(initial.status)) && <Field label="Status"><Select {...register('status')}><option value="draft">Draft (not visible to students)</option><option value="published">Published</option></Select></Field>}
        <Field label="Description" className="sm:col-span-2"><Textarea {...register('description')} /></Field>
        <Field label="Responsibilities" className="sm:col-span-2"><Textarea {...register('responsibilities')} /></Field>
        <Field label="Required skills" className="sm:col-span-2" hint="Used for matching and recommendations"><TagInput value={skills} onChange={setSkills} placeholder="Type a skill and press Enter" suggestions={ALL_SKILLS} /></Field>
      </section>
      <section>
        <h3 className="font-semibold mb-3">Eligibility criteria</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Eligible departments" hint="None selected = all departments" className="sm:col-span-2"><CheckboxGroup options={db.settings.departments} value={depts} onChange={setDepts} /></Field>
          <Field label="Eligible degrees" hint="None selected = all degrees" className="sm:col-span-2"><CheckboxGroup options={db.settings.degrees} value={degrees} onChange={setDegrees} /></Field>
          <Field label="Graduation batches" hint="None selected = all batches" className="sm:col-span-2"><CheckboxGroup options={[...new Set([...batches, new Date().getFullYear() + 1, new Date().getFullYear() + 2])].sort()} value={jobBatches} onChange={setJobBatches} /></Field>
          <Field label="Minimum CGPA" error={errors.min_cgpa?.message}><Input type="number" step="0.01" {...register('min_cgpa')} /></Field>
          <Field label="Maximum active backlogs" error={errors.max_backlogs?.message} hint="Blank = no limit"><Input type="number" {...register('max_backlogs')} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" {...register('skills_mandatory')} />Required skills are mandatory (students missing any are ineligible)</label>
          <Field label="Other conditions (shown to students)" className="sm:col-span-2"><Textarea {...register('additional_criteria')} placeholder="e.g. Willing to relocate; 60% in PUC" /></Field>
        </div>
      </section>
    </form>
  )
}

export default function Jobs() {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [company, setCompany] = useState(params.get('company') && !params.get('new') ? params.get('company')! : '')
  const [editing, setEditing] = useState<Job | 'new' | null>(params.get('new') ? 'new' : null)
  const [confirm, setConfirm] = useState<{ job: Job; status: JobStatus } | null>(null)
  const viewing = db.jobs.find(j => j.id === params.get('open'))

  const counts = useMemo(() => {
    const m = new Map<string, { apps: number; eligible: number }>()
    for (const j of db.jobs) m.set(j.id, { apps: db.applications.filter(a => a.job_id === j.id).length, eligible: lk.students.filter(s => lk.eligibility(s.id, j.id)?.eligible).length })
    return m
  }, [db.jobs, db.applications, lk])

  const rows = db.jobs.filter(j => (!q || [j.title, lk.company.get(j.company_id)?.name, j.location].some(v => v?.toLowerCase().includes(q.toLowerCase()))) && (!status || (status === 'open' ? isJobOpen(j) : j.status === status)) && (!company || j.company_id === company))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const columns: Column<Job>[] = [
    { key: 'title', label: 'Job', sortValue: r => r.title, render: r => <div><p className="font-medium">{r.title}</p><p className="text-xs text-text-secondary">{lk.company.get(r.company_id)?.name} · {r.job_type}</p></div> },
    { key: 'pkg', label: 'Package', sortValue: r => r.salary_max ?? r.salary_min, render: r => <span className="whitespace-nowrap">{formatLPA(r.salary_min, r.salary_max)}</span> },
    { key: 'batch', label: 'Batch', render: r => lk.rule.get(r.id)?.eligible_batches?.join(', ') ?? 'All' },
    { key: 'deadline', label: 'Deadline', sortValue: r => r.application_deadline, render: r => <span className={isPast(r.application_deadline) ? 'text-text-muted' : ''}>{formatDate(r.application_deadline)}</span> },
    { key: 'elig', label: 'Eligible', sortValue: r => counts.get(r.id)?.eligible, render: r => counts.get(r.id)?.eligible },
    { key: 'apps', label: 'Applied', sortValue: r => counts.get(r.id)?.apps, render: r => counts.get(r.id)?.apps },
    { key: 'status', label: 'Status', sortValue: r => r.status, render: r => <div className="flex flex-col items-start gap-1"><StatusBadge status={r.status} />{r.status === 'published' && isPast(r.application_deadline) && <span className="text-[11px] text-amber-700">Deadline passed</span>}</div> },
  ]

  const rule = viewing ? lk.rule.get(viewing.id) : undefined
  const apps = viewing ? db.applications.filter(a => a.job_id === viewing.id) : []
  const statusActions = (j: Job) => <>
    {j.status !== 'published' && j.status !== 'archived' && <button className="btn-primary btn-sm" onClick={() => setConfirm({ job: j, status: 'published' })}><Send className="w-3.5 h-3.5" />Publish</button>}
    {j.status === 'published' && <button className="btn-outline btn-sm" onClick={() => setConfirm({ job: j, status: 'closed' })}><XCircle className="w-3.5 h-3.5" />Close</button>}
    {j.status !== 'archived' && <button className="btn-outline btn-sm" onClick={() => setConfirm({ job: j, status: 'archived' })}><Archive className="w-3.5 h-3.5" />Archive</button>}
    {j.status === 'archived' && <button className="btn-outline btn-sm" onClick={() => setConfirm({ job: j, status: 'draft' })}>Restore as draft</button>}
  </>

  return (
    <div>
      <PageHeader title="Job Openings" description={`${db.jobs.filter(isJobOpen).length} open for applications`} actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="w-4 h-4" />New job</button>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search title, company, location" />
        <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="open">Open now</option>{['draft', 'published', 'closed', 'archived'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</Select>
        <Select value={company} onChange={e => setCompany(e.target.value)} aria-label="Company"><option value="">All companies</option>{db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </FilterBar>
      <DataTable rows={rows} columns={columns} rowKey={r => r.id} onRowClick={r => setParams({ open: r.id })} empty="No jobs match."
        actions={r => <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>} />

      <Modal isOpen={!!editing} onClose={() => { setEditing(null); if (params.get('new')) setParams({}) }} title={editing === 'new' ? 'New job opening' : 'Edit job opening'} size="xl"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit" form="job-form">Save job</button></>}>
        {editing && <JobForm initial={editing === 'new' ? undefined : editing} companyId={params.get('company') ?? undefined} onDone={() => { setEditing(null); setParams({}) }} />}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setParams({})} title={viewing ? viewing.title : ''} size="xl"
        footer={viewing && <>{statusActions(viewing)}<button className="btn-outline btn-sm" onClick={() => setEditing(viewing)}><Pencil className="w-3.5 h-3.5" />Edit</button></>}>
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 items-center"><StatusBadge status={viewing.status} /><span className="text-sm text-text-secondary">{lk.company.get(viewing.company_id)?.name}</span></div>
            <dl className="grid sm:grid-cols-4 gap-4">
              <KV label="Package">{formatLPA(viewing.salary_min, viewing.salary_max)}</KV><KV label="Type">{viewing.job_type}</KV><KV label="Location">{viewing.location}</KV><KV label="Deadline">{formatDate(viewing.application_deadline, 'long')}</KV>
            </dl>
            <KV label="Description">{viewing.description}</KV>
            <KV label="Responsibilities">{viewing.responsibilities}</KV>
            <div><p className="text-xs text-text-secondary mb-1">Required skills {rule?.skills_mandatory && <span className="text-danger">(mandatory)</span>}</p><Chips items={rule?.required_skills ?? viewing.required_skills} /></div>
            <div className="bg-slate-50 rounded-lg p-4 grid sm:grid-cols-3 gap-4">
              <KV label="Departments">{rule?.eligible_departments?.join(', ') || 'All'}</KV>
              <KV label="Degrees">{rule?.eligible_degrees?.join(', ') || 'All'}</KV>
              <KV label="Batches">{rule?.eligible_batches?.join(', ') || 'All'}</KV>
              <KV label="Min CGPA">{rule?.min_cgpa ?? 'None'}</KV>
              <KV label="Max backlogs">{rule?.max_backlogs ?? 'No limit'}</KV>
              <KV label="Other">{rule?.additional_criteria || '—'}</KV>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline" onClick={() => nav(`/officer/eligible?job=${viewing.id}`)}><UserCheck className="w-4 h-4" />Eligible students ({counts.get(viewing.id)?.eligible})</button>
              <button className="btn-outline" onClick={() => nav(`/officer/applications?job=${viewing.id}`)}><Users className="w-4 h-4" />Applications ({apps.length})</button>
            </div>
            {apps.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {apps.map(a => <button key={a.id} onClick={() => nav(`/officer/applications?open=${a.id}`)} className="w-full text-left px-4 py-2 flex justify-between text-sm hover:bg-slate-50"><span>{lk.nameOf(a.student_id)} <span className="text-text-secondary text-xs">{lk.profile.get(a.student_id)?.usn}</span></span><StatusBadge status={a.status} /></button>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!confirm} variant={confirm?.status === 'published' || confirm?.status === 'draft' ? 'info' : 'warning'} title={`${confirm?.status === 'published' ? 'Publish' : confirm?.status === 'closed' ? 'Close' : confirm?.status === 'archived' ? 'Archive' : 'Restore'} job?`}
        message={confirm?.status === 'published' ? 'Eligible students will see this job and receive a notification.' : confirm?.status === 'closed' ? 'Students will no longer be able to apply. Existing applications remain.' : confirm?.status === 'archived' ? 'The job will be hidden from active lists. Applications and results are kept.' : 'The job returns to draft.'}
        confirmLabel="Confirm" onCancel={() => setConfirm(null)}
        onConfirm={async () => { if (confirm) await run(() => api.setJobStatus(confirm.job.id, confirm.status), 'Job status updated'); setConfirm(null) }} />
      {rows.length === 0 && db.jobs.length === 0 && <Banner>No jobs yet — create the first opening.</Banner>}
    </div>
  )
}
