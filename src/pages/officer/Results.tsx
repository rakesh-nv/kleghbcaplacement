import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Download } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Card, Field, FilterBar, Input, PageHeader, SearchInput, Select, StatCard } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { exportCSV, formatDate, pct } from '@/lib/utils'
import { packageStats } from '@/lib/stats'
import { Trophy, IndianRupee, Clock, XCircle } from 'lucide-react'
import type { PlacementResult, ResultStatus } from '@/types/models'

interface Draft { application_id: string; package_lpa: string; offer_date: string; joining_date: string; status: ResultStatus }

export default function Results() {
  const { db, api } = useData()
  const { run, toast } = useToast()
  const lk = useLookups()
  const { batches } = useUniqueValues()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [company, setCompany] = useState('')
  const [dept, setDept] = useState('')
  const [batch, setBatch] = useState(String(batches[0] ?? ''))
  const [status, setStatus] = useState('')
  const preApp = params.get('app')
  const [draft, setDraft] = useState<(Draft & { id?: string }) | null>(preApp ? { application_id: preApp, package_lpa: String(lk.job.get(db.applications.find(a => a.id === preApp)?.job_id ?? '')?.salary_max ?? ''), offer_date: new Date().toISOString().slice(0, 10), joining_date: '', status: 'pending' } : null)
  const [del, setDel] = useState<PlacementResult | null>(null)

  const rows = useMemo(() => db.results.filter(r => {
    const p = lk.profile.get(r.student_id)
    return (!q || [p?.full_name, p?.usn].some(v => v?.toLowerCase().includes(q.toLowerCase()))) && (!company || r.company_id === company) && (!dept || p?.department === dept) && (!batch || p?.batch === Number(batch)) && (!status || r.status === status)
  }).sort((a, b) => (b.offer_date ?? '').localeCompare(a.offer_date ?? '')), [db.results, lk, q, company, dept, batch, status])

  const accepted = rows.filter(r => r.status === 'accepted')
  const pk = packageStats(accepted.map(r => r.package_lpa).filter((x): x is number => x != null))
  const scopeStudents = lk.students.filter(s => (!batch || s.batch === Number(batch)) && (!dept || s.department === dept))
  const byCompany = Object.values(rows.reduce<Record<string, { name: string; offers: number; accepted: number; pkgs: number[] }>>((acc, r) => { const n = lk.company.get(r.company_id)?.name ?? '—'; acc[n] ??= { name: n, offers: 0, accepted: 0, pkgs: [] }; acc[n].offers++; if (r.status === 'accepted') { acc[n].accepted++; if (r.package_lpa) acc[n].pkgs.push(r.package_lpa) } return acc }, {})).sort((a, b) => b.accepted - a.accepted)
  const byDept = db.settings.departments.map(d => { const st = scopeStudents.filter(s => s.department === d); const placed = new Set(accepted.filter(r => lk.profile.get(r.student_id)?.department === d).map(r => r.student_id)).size; return { d, total: st.length, placed } }).filter(x => x.total)

  const candidates = db.applications.filter(a => (['shortlisted', 'interview_scheduled', 'selected', 'offered'].includes(a.status) && !db.results.some(r => r.application_id === a.id)) || a.id === draft?.application_id)

  const columns: Column<PlacementResult>[] = [
    { key: 'student', label: 'Student', sortValue: r => lk.nameOf(r.student_id), render: r => <div><p className="font-medium">{lk.nameOf(r.student_id)}</p><p className="text-xs text-text-secondary">{lk.profile.get(r.student_id)?.usn} · {lk.profile.get(r.student_id)?.department}</p></div> },
    { key: 'company', label: 'Company / role', sortValue: r => lk.company.get(r.company_id)?.name, render: r => <div><p>{lk.company.get(r.company_id)?.name}</p><p className="text-xs text-text-secondary">{lk.job.get(r.job_id)?.title}</p></div> },
    { key: 'pkg', label: 'Package (LPA)', sortValue: r => r.package_lpa, render: r => <span className="tabular-nums">{r.package_lpa ?? '—'}</span> },
    { key: 'offer', label: 'Offer date', sortValue: r => r.offer_date, render: r => formatDate(r.offer_date) },
    { key: 'join', label: 'Joining', sortValue: r => r.joining_date, render: r => formatDate(r.joining_date) },
    { key: 'status', label: 'Offer status', sortValue: r => r.status, render: r => (
      <Select value={r.status} onClick={e => e.stopPropagation()} onChange={e => run(() => api.setResultStatus(r.id, e.target.value as ResultStatus), 'Offer status updated')} className="py-1 text-xs w-32" aria-label="Offer status">
        <option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option>
      </Select>
    ) },
  ]

  const save = async () => {
    if (!draft) return
    const ok = await run(() => api.saveResult({ application_id: draft.application_id, package_lpa: draft.package_lpa === '' ? null : Number(draft.package_lpa), offer_date: draft.offer_date || null, joining_date: draft.joining_date || null, status: draft.status }, draft.id), draft.id ? 'Result updated' : 'Placement result recorded')
    if (ok) { setDraft(null); if (preApp) setParams({}) }
  }

  return (
    <div>
      <PageHeader title="Placement Results" description="Offers recorded by the placement cell. Salary details are visible to officers only unless Settings allow students to see them."
        actions={<>
          <button className="btn-outline" onClick={() => { if (!exportCSV(rows.map(r => ({ student: lk.nameOf(r.student_id), usn: lk.profile.get(r.student_id)?.usn, department: lk.profile.get(r.student_id)?.department, batch: lk.profile.get(r.student_id)?.batch, company: lk.company.get(r.company_id)?.name, job: lk.job.get(r.job_id)?.title, package_lpa: r.package_lpa, offer_date: r.offer_date, joining_date: r.joining_date, status: r.status })), 'placement_results')) toast({ type: 'warning', title: 'Nothing to export' }) }}><Download className="w-4 h-4" />Export</button>
          <button className="btn-primary" onClick={() => setDraft({ application_id: '', package_lpa: '', offer_date: new Date().toISOString().slice(0, 10), joining_date: '', status: 'pending' })}><Plus className="w-4 h-4" />Record offer</button>
        </>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search student or USN" />
        <Select value={batch} onChange={e => setBatch(e.target.value)} aria-label="Batch"><option value="">All batches</option>{batches.map(b => <option key={b}>{b}</option>)}</Select>
        <Select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{db.settings.departments.map(d => <option key={d}>{d}</option>)}</Select>
        <Select value={company} onChange={e => setCompany(e.target.value)} aria-label="Company"><option value="">All companies</option>{db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="">All offer statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></Select>
      </FilterBar>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Accepted offers" value={accepted.length} hint={`${pct(new Set(accepted.map(r => r.student_id)).size, scopeStudents.length)}% of ${scopeStudents.length} students`} icon={Trophy} tone="green" />
        <StatCard label="Pending offers" value={rows.filter(r => r.status === 'pending').length} icon={Clock} tone="amber" />
        <StatCard label="Declined" value={rows.filter(r => r.status === 'declined').length} icon={XCircle} tone="red" />
        <StatCard label="Highest / median" value={pk.count ? `${pk.highest} / ${pk.median}` : '—'} hint="LPA, accepted offers" icon={IndianRupee} />
      </div>
      <DataTable rows={rows} columns={columns} rowKey={r => r.id} empty="No placement results for these filters."
        actions={r => <div className="inline-flex gap-1">
          <button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => setDraft({ id: r.id, application_id: r.application_id, package_lpa: String(r.package_lpa ?? ''), offer_date: r.offer_date ?? '', joining_date: r.joining_date ?? '', status: r.status })}><Pencil className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost btn-sm" aria-label="Delete" onClick={() => setDel(r)}><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
        </div>} />

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card title="Company-wise summary" bodyClassName="p-0">
          <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-xs text-text-secondary uppercase"><th className="text-left px-4 py-2">Company</th><th className="text-right px-4 py-2">Offers</th><th className="text-right px-4 py-2">Accepted</th><th className="text-right px-4 py-2">Avg LPA</th></tr></thead>
            <tbody className="divide-y divide-border">{byCompany.length === 0 ? <tr><td colSpan={4} className="px-4 py-4 text-text-secondary">No data</td></tr> : byCompany.map(c => <tr key={c.name}><td className="px-4 py-2">{c.name}</td><td className="px-4 py-2 text-right tabular-nums">{c.offers}</td><td className="px-4 py-2 text-right tabular-nums">{c.accepted}</td><td className="px-4 py-2 text-right tabular-nums">{packageStats(c.pkgs).average || '—'}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Department-wise summary" bodyClassName="p-0">
          <table className="w-full text-sm"><thead><tr className="bg-slate-50 text-xs text-text-secondary uppercase"><th className="text-left px-4 py-2">Department</th><th className="text-right px-4 py-2">Students</th><th className="text-right px-4 py-2">Placed</th><th className="text-right px-4 py-2">%</th></tr></thead>
            <tbody className="divide-y divide-border">{byDept.map(d => <tr key={d.d}><td className="px-4 py-2">{d.d}</td><td className="px-4 py-2 text-right tabular-nums">{d.total}</td><td className="px-4 py-2 text-right tabular-nums">{d.placed}</td><td className="px-4 py-2 text-right tabular-nums">{pct(d.placed, d.total)}%</td></tr>)}</tbody></table>
        </Card>
      </div>

      <Modal isOpen={!!draft} onClose={() => { setDraft(null); if (preApp) setParams({}) }} title={draft?.id ? 'Edit placement result' : 'Record placement offer'} size="md"
        footer={<><button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button><button className="btn-primary" disabled={!draft?.application_id} onClick={save}>Save</button></>}>
        {draft && (
          <div className="space-y-4">
            <Field label="Application" required hint="Shortlisted, interviewing, selected or offered applications without a recorded result">
              <Select value={draft.application_id} disabled={!!draft.id} onChange={e => { const a = db.applications.find(x => x.id === e.target.value); setDraft({ ...draft, application_id: e.target.value, package_lpa: draft.package_lpa || String(lk.job.get(a?.job_id ?? '')?.salary_max ?? '') }) }}>
                <option value="">Select…</option>{candidates.map(a => <option key={a.id} value={a.id}>{lk.nameOf(a.student_id)} · {lk.jobTitle(a.job_id)}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Package (LPA)"><Input type="number" step="0.01" min={0} value={draft.package_lpa} onChange={e => setDraft({ ...draft, package_lpa: e.target.value })} /></Field>
              <Field label="Offer status"><Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as ResultStatus })}><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></Select></Field>
              <Field label="Offer date"><Input type="date" value={draft.offer_date} onChange={e => setDraft({ ...draft, offer_date: e.target.value })} /></Field>
              <Field label="Joining date"><Input type="date" value={draft.joining_date} onChange={e => setDraft({ ...draft, joining_date: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={!!del} title="Delete placement result?" message="This removes the offer record. The application status is not changed automatically." confirmLabel="Delete" onCancel={() => setDel(null)}
        onConfirm={async () => { if (del) await run(() => api.deleteResult(del.id), 'Result deleted'); setDel(null) }} />
    </div>
  )
}
