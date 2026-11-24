import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Trophy, Download, CheckSquare } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Card, Field, FilterBar, Input, KV, PageHeader, SearchInput, Select, Textarea } from '@/components/ui/primitives'
import { ResumeActions, StatusTimeline, roundLabel } from '@/components/ui/misc'
import { Modal } from '@/components/shared/Modal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { APPLICATION_STATUSES } from '@/lib/placementStatus'
import { exportCSV, formatDate, labelize } from '@/lib/utils'
import type { Application, ApplicationStatus } from '@/types/models'

function ApplicationDetail({ app }: { app: Application }) {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const nav = useNavigate()
  const p = lk.profile.get(app.student_id)!
  const [status, setStatus] = useState<ApplicationStatus>(app.status)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState(app.officer_notes ?? '')
  useEffect(() => { setStatus(app.status); setNotes(app.officer_notes ?? '') }, [app.id, app.status, app.officer_notes])
  const history = db.statusHistory.filter(h => h.application_id === app.id)
  const interviews = db.interviews.filter(i => i.application_id === app.id).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  const result = db.results.find(r => r.application_id === app.id)
  const e = lk.eligibility(p.id, app.job_id)
  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="space-y-5">
        <dl className="grid sm:grid-cols-3 gap-4">
          <KV label="Student"><button className="text-accent hover:underline" onClick={() => nav(`/officer/students/${p.id}`)}>{p.full_name}</button></KV>
          <KV label="USN">{p.usn}</KV><KV label="Dept">{p.degree} · {p.department}</KV>
          <KV label="CGPA / backlogs">{p.cgpa ?? '—'} / {p.backlogs ?? 0}</KV><KV label="Applied">{formatDate(app.created_at, 'long')}</KV>
          <KV label="Current eligibility">{e?.eligible ? <span className="text-emerald-700">Eligible</span> : <span className="text-danger" title={e?.reasons.join('\n')}>No longer eligible</span>}</KV>
        </dl>
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-text-secondary">Resume submitted:</span><ResumeActions resume={db.resumes.find(r => r.file_url === app.resume_url) ?? lk.resume.get(p.id)} /></div>
        {app.cover_letter && <KV label="Cover note">{app.cover_letter}</KV>}
        <Card title="Update status" bodyClassName="p-4">
          {app.status === 'withdrawn' ? <p className="text-sm text-text-secondary">The student withdrew this application.</p> : (
            <div className="grid sm:grid-cols-[200px_1fr_auto] gap-3 items-end">
              <Field label="New status"><Select value={status} onChange={e => setStatus(e.target.value as ApplicationStatus)}>{APPLICATION_STATUSES.filter(s => s !== 'withdrawn').map(s => <option key={s} value={s}>{labelize(s)}</option>)}</Select></Field>
              <Field label="Note to student (optional)"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Shown in the notification" /></Field>
              <button className="btn-primary" disabled={status === app.status} onClick={async () => { if (await run(() => api.updateApplicationStatus([app.id], status, note || null), 'Status updated & student notified')) setNote('') }}>Update</button>
            </div>
          )}
          {status === 'accepted' && !result && <p className="text-xs text-amber-700 mt-2">Record the offer under Placement Results first.</p>}
        </Card>
        <Field label="Officer notes (internal, not visible to students)">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        <button className="btn-outline btn-sm" disabled={notes === (app.officer_notes ?? '')} onClick={() => run(() => api.saveOfficerNotes(app.id, notes), 'Notes saved')}>Save notes</button>
        <Card title="Interviews" actions={!['withdrawn', 'rejected'].includes(app.status) && <button className="btn-outline btn-sm" onClick={() => nav(`/officer/interviews?schedule=${app.id}`)}><CalendarPlus className="w-3.5 h-3.5" />Schedule</button>} bodyClassName="p-4">
          {interviews.length === 0 ? <p className="text-sm text-text-secondary">None scheduled.</p> : <ul className="space-y-2 text-sm">{interviews.map(i => <li key={i.id} className="flex justify-between gap-2"><span>Round {i.round_number}: {roundLabel(i.round)} · {formatDate(i.scheduled_at, 'long')}</span><StatusBadge status={i.status} /></li>)}</ul>}
        </Card>
        <Card title="Placement result" actions={!result && ['selected', 'offered', 'interview_scheduled', 'shortlisted'].includes(app.status) && <button className="btn-outline btn-sm" onClick={() => nav(`/officer/results?app=${app.id}`)}><Trophy className="w-3.5 h-3.5" />Record offer</button>} bodyClassName="p-4">
          {result ? <p className="text-sm">{result.package_lpa} LPA · offer {formatDate(result.offer_date)} · <StatusBadge status={result.status} /></p> : <p className="text-sm text-text-secondary">No offer recorded.</p>}
        </Card>
      </div>
      <div><h3 className="font-semibold text-sm mb-3">Status history</h3><StatusTimeline history={history} nameOf={lk.nameOf} /></div>
    </div>
  )
}

export default function Applications() {
  const { db, api } = useData()
  const { run, toast } = useToast()
  const lk = useLookups()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [company, setCompany] = useState('')
  const [jobId, setJobId] = useState(params.get('job') ?? '')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [bulk, setBulk] = useState<ApplicationStatus | ''>('')
  const viewing = db.applications.find(a => a.id === params.get('open'))

  const rows = useMemo(() => db.applications.filter(a => {
    const p = lk.profile.get(a.student_id), j = lk.job.get(a.job_id)
    const s = q.toLowerCase()
    return (!s || [p?.full_name, p?.usn, j?.title].some(v => v?.toLowerCase().includes(s))) && (!company || j?.company_id === company) && (!jobId || a.job_id === jobId) && (!status || a.status === status)
      && (!from || a.created_at.slice(0, 10) >= from) && (!to || a.created_at.slice(0, 10) <= to)
  }).sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [db.applications, lk, q, company, jobId, status, from, to])

  const columns: Column<Application>[] = [
    { key: 'student', label: 'Student', sortValue: r => lk.nameOf(r.student_id), render: r => <div><p className="font-medium">{lk.nameOf(r.student_id)}</p><p className="text-xs text-text-secondary">{lk.profile.get(r.student_id)?.usn}</p></div> },
    { key: 'job', label: 'Job', sortValue: r => lk.job.get(r.job_id)?.title, render: r => <div><p>{lk.job.get(r.job_id)?.title}</p><p className="text-xs text-text-secondary">{lk.company.get(lk.job.get(r.job_id)?.company_id ?? '')?.name}</p></div> },
    { key: 'applied', label: 'Applied', sortValue: r => r.created_at, render: r => formatDate(r.created_at) },
    { key: 'updated', label: 'Last update', sortValue: r => r.updated_at, render: r => formatDate(r.updated_at, 'relative') },
    { key: 'status', label: 'Status', sortValue: r => APPLICATION_STATUSES.indexOf(r.status), render: r => <StatusBadge status={r.status} /> },
  ]

  return (
    <div>
      <PageHeader title="Applications" description={`${rows.length} of ${db.applications.length} applications`}
        actions={<button className="btn-outline" onClick={() => { if (!exportCSV(rows.map(a => ({ student: lk.nameOf(a.student_id), usn: lk.profile.get(a.student_id)?.usn, job: lk.job.get(a.job_id)?.title, company: lk.company.get(lk.job.get(a.job_id)?.company_id ?? '')?.name, status: labelize(a.status), applied_on: a.created_at.slice(0, 10), last_update: a.updated_at.slice(0, 10) })), 'applications')) toast({ type: 'warning', title: 'Nothing to export' }) }}><Download className="w-4 h-4" />Export CSV</button>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search student, USN or job" />
        <Select value={company} onChange={e => { setCompany(e.target.value); setJobId('') }} aria-label="Company"><option value="">All companies</option>{db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={jobId} onChange={e => setJobId(e.target.value)} aria-label="Job"><option value="">All jobs</option>{db.jobs.filter(j => !company || j.company_id === company).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</Select>
        <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{APPLICATION_STATUSES.map(s => <option key={s} value={s}>{labelize(s)}</option>)}</Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Applied from" title="Applied from" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Applied to" title="Applied to" />
      </FilterBar>
      {selected.length > 0 && (
        <div className="card p-3 mb-3 flex flex-wrap items-center gap-2 bg-blue-50/60">
          <CheckSquare className="w-4 h-4 text-primary" /><span className="text-sm font-medium">{selected.length} selected</span>
          <Select value={bulk} onChange={e => setBulk(e.target.value as ApplicationStatus)} className="w-auto" aria-label="Bulk status"><option value="">Change status to…</option>{APPLICATION_STATUSES.filter(s => !['withdrawn', 'accepted'].includes(s)).map(s => <option key={s} value={s}>{labelize(s)}</option>)}</Select>
          <button className="btn-primary btn-sm" disabled={!bulk} onClick={async () => { if (bulk && await run(() => api.updateApplicationStatus(selected, bulk, null), `${selected.length} application(s) updated`)) { setSelected([]); setBulk('') } }}>Apply</button>
          <button className="btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      <DataTable rows={rows} columns={columns} rowKey={r => r.id} onRowClick={r => setParams({ open: r.id })} selectable selected={selected} onSelectedChange={setSelected} empty="No applications match these filters." />
      <Modal isOpen={!!viewing} onClose={() => setParams({})} title={viewing ? lk.jobTitle(viewing.job_id) : ''} size="xl">
        {viewing && <ApplicationDetail app={viewing} />}
      </Modal>
    </div>
  )
}
