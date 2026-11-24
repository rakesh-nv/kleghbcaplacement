import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Banner, Card, Field, FilterBar, PageHeader, Progress, SearchInput, Select, Tabs } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { exportCSV } from '@/lib/utils'
import { isJobOpen, type EligibilityResult } from '@/lib/eligibility'
import type { Profile } from '@/types/models'

type Row = { p: Profile; e: EligibilityResult; applied?: string }

export default function EligibleStudents() {
  const { db } = useData()
  const { toast } = useToast()
  const lk = useLookups()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const jobs = db.jobs.filter(j => j.status !== 'archived').sort((a, b) => Number(isJobOpen(b)) - Number(isJobOpen(a)) || b.created_at.localeCompare(a.created_at))
  const jobId = params.get('job') ?? jobs[0]?.id ?? ''
  const job = lk.job.get(jobId)
  const rule = lk.rule.get(jobId)
  const [tab, setTab] = useState<'eligible' | 'ineligible'>('eligible')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [applied, setApplied] = useState('')

  // Recomputed on every change to students, skills or the job's criteria.
  const all: Row[] = useMemo(() => !job ? [] : lk.students.map(p => ({ p, e: lk.eligibility(p.id, job.id)!, applied: db.applications.find(a => a.job_id === job.id && a.student_id === p.id)?.status })), [job, lk, db.applications])
  const scoped = all.filter(r => (!q || [r.p.full_name, r.p.usn].some(v => v?.toLowerCase().includes(q.toLowerCase()))) && (!dept || r.p.department === dept) && (!applied || (applied === 'yes' ? !!r.applied : !r.applied)))
  const eligible = scoped.filter(r => r.e.eligible)
  const ineligible = scoped.filter(r => !r.e.eligible)
  const rows = tab === 'eligible' ? eligible : ineligible

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Student', sortValue: r => r.p.full_name, render: r => <div><p className="font-medium">{r.p.full_name}</p><p className="text-xs text-text-secondary">{r.p.usn}</p></div> },
    { key: 'dept', label: 'Dept / Batch', sortValue: r => r.p.department, render: r => <span className="text-xs">{r.p.degree} · {r.p.department}<br />Batch {r.p.batch}</span> },
    { key: 'cgpa', label: 'CGPA', sortValue: r => r.p.cgpa, render: r => r.p.cgpa ?? '—' },
    { key: 'bl', label: 'Backlogs', sortValue: r => r.p.backlogs, render: r => r.p.backlogs ?? 0 },
    { key: 'match', label: 'Skill match', sortValue: r => r.e.skillMatch, render: r => <div className="w-28"><div className="flex justify-between text-xs mb-1"><span>{r.e.skillMatch}%</span></div><Progress value={r.e.skillMatch} /></div> },
    tab === 'eligible'
      ? { key: 'applied', label: 'Applied', sortValue: r => r.applied ?? '', render: r => r.applied ? <StatusBadge status={r.applied} /> : <span className="text-xs text-text-muted">Not applied</span> }
      : { key: 'reasons', label: 'Why ineligible', render: r => <ul className="text-xs text-danger list-disc pl-4 space-y-0.5 max-w-md">{r.e.reasons.map(x => <li key={x}>{x}</li>)}</ul> },
  ]

  const doExport = () => {
    const ok = exportCSV(rows.map(r => ({ name: r.p.full_name, usn: r.p.usn, email: r.p.email, phone: r.p.phone, department: r.p.department, degree: r.p.degree, batch: r.p.batch, cgpa: r.p.cgpa, backlogs: r.p.backlogs, skill_match_pct: r.e.skillMatch, missing_skills: r.e.missingSkills, eligible: r.e.eligible ? 'yes' : 'no', reasons: r.e.reasons, application_status: r.applied ?? '' })), `${tab}_students_${job?.title.replace(/\W+/g, '_')}`)
    if (!ok) toast({ type: 'warning', title: 'Nothing to export' })
  }

  return (
    <div>
      <PageHeader title="Eligible Students" description="Eligibility is calculated live from each job's criteria and the students' official records." actions={<button className="btn-outline" onClick={doExport}><Download className="w-4 h-4" />Export {tab} list</button>} />
      <Card className="mb-4">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <Field label="Job opening"><Select value={jobId} onChange={e => setParams({ job: e.target.value })}>{jobs.map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)} · {j.status}{isJobOpen(j) ? ' (open)' : ''}</option>)}</Select></Field>
          {job && <button className="btn-outline" onClick={() => nav(`/officer/jobs?open=${job.id}`)}>View job</button>}
        </div>
        {rule && <p className="text-xs text-text-secondary mt-3">Criteria: {rule.eligible_departments?.join(', ') || 'all departments'} · batch {rule.eligible_batches?.join(', ') || 'any'} · CGPA ≥ {rule.min_cgpa ?? '—'} · backlogs ≤ {rule.max_backlogs ?? '∞'}{rule.skills_mandatory ? ` · must have ${rule.required_skills?.join(', ')}` : ''}</p>}
      </Card>
      {!job ? <Banner>No job openings yet.</Banner> : <>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'eligible', label: 'Eligible', count: eligible.length }, { id: 'ineligible', label: 'Ineligible', count: ineligible.length }]} />
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search name or USN" />
          <Select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{db.settings.departments.map(d => <option key={d}>{d}</option>)}</Select>
          <Select value={applied} onChange={e => setApplied(e.target.value)} aria-label="Applied"><option value="">Applied or not</option><option value="yes">Applied</option><option value="no">Not applied</option></Select>
        </FilterBar>
        <DataTable rows={rows} columns={columns} rowKey={r => r.p.id} onRowClick={r => nav(`/officer/students/${r.p.id}`)} initialSort={{ key: 'match', dir: 'desc' }} empty={tab === 'eligible' ? 'No eligible students for these filters.' : 'Everyone in scope is eligible.'} />
      </>}
    </div>
  )
}
