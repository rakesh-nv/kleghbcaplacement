import { useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { Card, Field, Input, PageHeader, Select } from '@/components/ui/primitives'
import { computeStats, companyStats, departmentStats, packageStats, batchTrend } from '@/lib/stats'
import { exportCSV, formatDate, labelize, pct } from '@/lib/utils'
import { exportPdf } from '@/lib/reportPdf'
import { PLACEMENT_STATUS_LABEL } from '@/lib/placementStatus'
import { roundLabel } from '@/components/ui/misc'

const REPORTS = [
  { id: 'overall', label: 'Overall placement statistics' },
  { id: 'department', label: 'Department-wise placement report' },
  { id: 'batch', label: 'Batch-wise placement report' },
  { id: 'student', label: 'Student-wise placement status' },
  { id: 'company', label: 'Company recruitment report' },
  { id: 'jobs', label: 'Job application report' },
  { id: 'interviews', label: 'Interview attendance report' },
  { id: 'eligible', label: 'Eligible students report' },
  { id: 'salary', label: 'Salary package statistics' },
] as const
type ReportId = typeof REPORTS[number]['id']
type Row = Record<string, string | number | null>

export default function Reports() {
  const { db } = useData()
  const { toast } = useToast()
  const lk = useLookups()
  const { batches } = useUniqueValues()
  const [report, setReport] = useState<ReportId>('overall')
  const [batch, setBatch] = useState(String(batches[0] ?? ''))
  const [dept, setDept] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [jobId, setJobId] = useState(db.jobs.find(j => j.status === 'published')?.id ?? db.jobs[0]?.id ?? '')
  const f = { batch: batch ? Number(batch) : null, department: dept || null, from: from || null, to: to || null }
  const inRange = (iso: string | null | undefined) => !iso ? !from && !to : (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to)

  const rows: Row[] = useMemo(() => {
    const s = computeStats(db, f)
    const ids = new Set(s.students.map(x => x.id))
    switch (report) {
      case 'overall': return [
        { metric: 'Registered students', value: s.totalStudents },
        { metric: 'Eligible for at least one job', value: s.eligibleStudents },
        { metric: 'Companies (active)', value: `${s.totalCompanies} (${s.activeCompanies})` },
        { metric: 'Active job openings', value: s.activeJobs },
        { metric: 'Applications', value: s.totalApplications },
        { metric: 'Offers made', value: s.results.length },
        { metric: 'Students placed (accepted offer)', value: s.placed },
        { metric: 'Students not yet placed', value: s.notPlaced },
        { metric: 'Placement percentage', value: `${s.placementPct}%` },
      ]
      case 'department': return departmentStats(db, f).map(d => ({ department: d.name, students: d.total, placed: d.placed, not_placed: d.notPlaced, placement_pct: `${d.pct}%` }))
      case 'batch': return batchTrend(db, { department: f.department, from: f.from, to: f.to }).map(b => ({ batch: b.name, students: b.total, placed: b.placed, placement_pct: `${b.pct}%` }))
      case 'student': return s.students.map(p => {
        const acc = db.results.find(r => r.student_id === p.id && r.status === 'accepted')
        return { name: p.full_name, usn: p.usn, department: p.department, batch: p.batch, cgpa: p.cgpa, backlogs: p.backlogs, applications: db.applications.filter(a => a.student_id === p.id && inRange(a.created_at)).length, offers: db.results.filter(r => r.student_id === p.id).length, status: PLACEMENT_STATUS_LABEL[p.placement_status], placed_at: acc ? lk.company.get(acc.company_id)?.name ?? '' : '', package_lpa: acc?.package_lpa ?? null }
      })
      case 'company': return companyStats(db, f).filter(c => c.jobs || c.applications).map(c => ({ company: c.fullName, jobs: c.jobs, applications: c.applications, interviews: c.interviews, offers: c.offers, placements: c.placements }))
      case 'jobs': return db.jobs.filter(j => j.status !== 'draft').map(j => {
        const apps = db.applications.filter(a => a.job_id === j.id && ids.has(a.student_id) && inRange(a.created_at))
        const reached = (st: string[]) => apps.filter(a => db.statusHistory.some(h => h.application_id === a.id && st.includes(h.new_status))).length
        return { job: j.title, company: lk.company.get(j.company_id)?.name ?? '', status: j.status, eligible: s.students.filter(p => lk.eligibility(p.id, j.id)?.eligible).length, applied: apps.length, shortlisted: reached(['shortlisted']), interviewed: reached(['interview_scheduled']), selected: reached(['selected', 'offered', 'accepted']), rejected: apps.filter(a => a.status === 'rejected').length, withdrawn: apps.filter(a => a.status === 'withdrawn').length }
      }).filter(r => r.applied || r.eligible)
      case 'interviews': return db.interviews.filter(i => ids.has(i.student_id) && inRange(i.scheduled_at)).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)).map(i => ({ date: formatDate(i.scheduled_at, 'long'), student: lk.nameOf(i.student_id), usn: lk.profile.get(i.student_id)?.usn ?? '', company: lk.company.get(i.company_id)?.name ?? '', round: roundLabel(i.round), status: labelize(i.status), attendance: i.attended == null ? (i.status === 'cancelled' ? 'n/a' : 'Not marked') : i.attended ? 'Present' : 'Absent', result: db.feedback.find(fb => fb.interview_id === i.id)?.result ?? '' }))
      case 'eligible': return jobId ? s.students.map(p => ({ p, e: lk.eligibility(p.id, jobId)! })).filter(x => x.e.eligible).map(({ p, e }) => ({ name: p.full_name, usn: p.usn, email: p.email, phone: p.phone, department: p.department, batch: p.batch, cgpa: p.cgpa, backlogs: p.backlogs, skill_match_pct: e.skillMatch, applied: db.applications.some(a => a.job_id === jobId && a.student_id === p.id) ? 'Yes' : 'No' })) : []
      case 'salary': {
        const acc = s.results.filter(r => r.status === 'accepted' && r.package_lpa != null)
        const line = (group: string, vals: number[]) => { const k = packageStats(vals); return { group, offers: k.count, highest_lpa: k.highest, lowest_lpa: k.lowest, average_lpa: k.average, median_lpa: k.median } }
        return [
          line('All accepted offers', acc.map(r => r.package_lpa!)),
          ...db.settings.departments.map(d => line(`Dept: ${d}`, acc.filter(r => lk.profile.get(r.student_id)?.department === d).map(r => r.package_lpa!))).filter(r => r.offers),
          ...db.companies.map(c => line(`Company: ${c.name}`, acc.filter(r => r.company_id === c.id).map(r => r.package_lpa!))).filter(r => r.offers),
        ]
      }
    }
  }, [db, report, batch, dept, from, to, jobId, lk]) // eslint-disable-line react-hooks/exhaustive-deps

  const cols = rows.length ? Object.keys(rows[0]) : []
  const meta = REPORTS.find(r => r.id === report)!
  const filterText = [batch ? `Batch ${batch}` : 'All batches', dept || 'All departments', from || to ? `${from || '…'} to ${to || '…'}` : null, report === 'eligible' ? lk.jobTitle(jobId) : null].filter(Boolean).join(' · ')
  const fname = meta.label.toLowerCase().replace(/\W+/g, '_')

  return (
    <div>
      <PageHeader title="Reports" description="Generated live from current records. Exports include only what officers are authorised to see."
        actions={<>
          <button className="btn-outline" onClick={() => { if (!exportCSV(rows, fname)) toast({ type: 'warning', title: 'Nothing to export' }) }}><Download className="w-4 h-4" />CSV</button>
          <button className="btn-primary" onClick={() => rows.length ? exportPdf({ title: meta.label, subtitle: filterText, institution: db.settings.college_name, rows, filename: fname }) : toast({ type: 'warning', title: 'Nothing to export' })}><FileText className="w-4 h-4" />PDF</button>
        </>} />
      <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
        <Card title="Report" bodyClassName="p-2">
          <nav className="space-y-0.5">{REPORTS.map(r => <button key={r.id} onClick={() => setReport(r.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${report === r.id ? 'bg-primary text-white' : 'hover:bg-secondary'}`}>{r.label}</button>)}</nav>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Field label="Batch"><Select value={batch} onChange={e => setBatch(e.target.value)} disabled={report === 'batch'}><option value="">All</option>{batches.map(b => <option key={b}>{b}</option>)}</Select></Field>
              <Field label="Department"><Select value={dept} onChange={e => setDept(e.target.value)}><option value="">All</option>{db.settings.departments.map(d => <option key={d}>{d}</option>)}</Select></Field>
              <Field label="From"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
              {report === 'eligible' && <Field label="Job"><Select value={jobId} onChange={e => setJobId(e.target.value)}>{db.jobs.map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)}</option>)}</Select></Field>}
            </div>
            <p className="text-xs text-text-secondary mt-2">Date range applies to application, offer and interview dates.</p>
          </Card>
          <Card title={`${meta.label} · ${rows.length} row(s)`} bodyClassName="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-text-secondary text-center">No data for these filters.</p> : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0"><tr className="bg-slate-50 border-b border-border">{cols.map(c => <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase whitespace-nowrap">{labelize(c)}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">{rows.map((r, i) => <tr key={i} className="hover:bg-slate-50">{cols.map(c => <td key={c} className="px-3 py-2 whitespace-nowrap tabular-nums">{r[c] ?? '—'}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </Card>
          {report === 'overall' && <p className="text-xs text-text-secondary">Placement % = students with an accepted offer ÷ registered students in scope ({pct(computeStats(db, f).placed, computeStats(db, f).totalStudents)}%).</p>}
        </div>
      </div>
    </div>
  )
}
