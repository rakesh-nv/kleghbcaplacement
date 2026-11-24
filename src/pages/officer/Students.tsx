import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Papa from 'papaparse'
import { Plus, Upload, Download, Pencil, Power, FileDown } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Banner, Field, FilterBar, Input, PageHeader, SearchInput, Select, TagInput } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { exportCSV, splitList } from '@/lib/utils'
import { optNum, reqNum } from '@/lib/forms'
import { PLACEMENT_STATUS_LABEL } from '@/lib/placementStatus'
import type { StudentInput } from '@/services/api'
import type { PlacementStatus, Profile } from '@/types/models'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  usn: z.string().trim().min(3, 'USN is required').regex(/^[A-Za-z0-9]+$/, 'Letters and digits only'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().refine(v => !v || /^\+?[\d\s-]{10,15}$/.test(v), 'Enter a valid phone number'),
  department: z.string().min(1, 'Select a department'),
  degree: z.string().min(1, 'Select a degree'),
  batch: reqNum(2000, 2100, 'Batch'),
  semester: reqNum(1, 8, 'Semester'),
  cgpa: optNum(0, 10),
  backlogs: reqNum(0, 50, 'Backlogs'),
})
type In = z.input<typeof schema>
type Out = z.output<typeof schema>

function StudentForm({ initial, onDone }: { initial?: Profile; onDone: () => void }) {
  const { api, db } = useData()
  const { run } = useToast()
  const [skills, setSkills] = useState<string[]>([])
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: initial ? { ...initial, phone: initial.phone ?? '', usn: initial.usn ?? '', department: initial.department ?? '', degree: initial.degree ?? '', cgpa: initial.cgpa ?? '', batch: initial.batch ?? '', semester: initial.semester ?? '', backlogs: initial.backlogs ?? 0 } as In : { backlogs: 0, semester: 5, batch: new Date().getFullYear() + 1 },
  })
  const onSubmit = async (v: Out) => {
    const input: StudentInput = { ...v, phone: v.phone || null, cgpa: v.cgpa, skills }
    const ok = await run(() => initial ? api.updateStudent(initial.id, input) : api.createStudent(input), initial ? 'Student updated' : 'Student added — default password Student@123')
    if (ok) onDone()
  }
  return (
    <form id="student-form" onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4" noValidate>
      <Field label="Full name" required error={errors.full_name?.message}><Input {...register('full_name')} /></Field>
      <Field label="USN / Registration no." required error={errors.usn?.message}><Input {...register('usn')} className="uppercase" /></Field>
      <Field label="Email" required error={errors.email?.message}><Input type="email" {...register('email')} /></Field>
      <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} placeholder="+91 …" /></Field>
      <Field label="Department" required error={errors.department?.message}><Select {...register('department')}><option value="">Select…</option>{db.settings.departments.map(d => <option key={d}>{d}</option>)}</Select></Field>
      <Field label="Degree" required error={errors.degree?.message}><Select {...register('degree')}><option value="">Select…</option>{db.settings.degrees.map(d => <option key={d}>{d}</option>)}</Select></Field>
      <Field label="Batch (graduation year)" required error={errors.batch?.message}><Input type="number" {...register('batch')} /></Field>
      <Field label="Current semester" required error={errors.semester?.message}><Input type="number" {...register('semester')} /></Field>
      <Field label={`CGPA (out of ${db.settings.grading_scale})`} error={errors.cgpa?.message} hint="Official value used for eligibility"><Input type="number" step="0.01" {...register('cgpa')} /></Field>
      <Field label="Active backlogs" required error={errors.backlogs?.message}><Input type="number" {...register('backlogs')} /></Field>
      {!initial && <Field label="Technical skills" className="sm:col-span-2" hint="Press Enter after each skill"><TagInput value={skills} onChange={setSkills} placeholder="e.g. Java, SQL" /></Field>}
      <button type="submit" hidden disabled={isSubmitting} />
    </form>
  )
}

const CSV_COLUMNS = ['full_name', 'usn', 'email', 'phone', 'department', 'degree', 'batch', 'semester', 'cgpa', 'backlogs', 'skills']

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useData()
  const { toast } = useToast()
  const [rows, setRows] = useState<Array<{ row: number; data?: StudentInput; error?: string }>>([])
  const [result, setResult] = useState<{ created: number; errors: Array<{ row: number; message: string }> } | null>(null)
  const [fileName, setFileName] = useState('')

  const parse = (file: File) => {
    setResult(null); setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: res => {
        const missing = ['full_name', 'usn', 'email'].filter(c => !res.meta.fields?.includes(c))
        if (missing.length) { toast({ type: 'error', title: 'Invalid CSV', message: `Missing column(s): ${missing.join(', ')}` }); setRows([]); return }
        setRows(res.data.map((r, i) => {
          const p = schema.safeParse(r)
          if (!p.success) return { row: i + 2, error: p.error.issues.map(x => `${String(x.path[0])}: ${x.message}`).join('; ') }
          return { row: i + 2, data: { ...p.data, phone: p.data.phone || null, skills: splitList(r.skills ?? '') } }
        }))
      },
      error: e => toast({ type: 'error', title: 'Could not read file', message: e.message }),
    })
  }
  const valid = rows.filter(r => r.data)
  const doImport = async () => {
    try {
      const r = await api.importStudents(valid.map(v => v.data!))
      // map service row numbers (index within valid rows) back to CSV rows
      setResult({ created: r.created, errors: r.errors.map(e => ({ row: valid[e.row - 2]?.row ?? e.row, message: e.message })) })
      toast({ type: r.created ? 'success' : 'warning', title: `${r.created} student(s) imported`, message: r.errors.length ? `${r.errors.length} row(s) skipped` : undefined })
    } catch (e) { toast({ type: 'error', title: 'Import failed', message: (e as Error).message }) }
  }
  const close = () => { setRows([]); setResult(null); setFileName(''); onClose() }
  const template = () => {
    const csv = Papa.unparse({ fields: CSV_COLUMNS, data: [['Example Student', 'KLEH24BCA099', 'example.student@student.kleghbc.edu', '+91 9000000000', 'Computer Applications', 'BCA', '2027', '5', '7.8', '0', 'Java; SQL']] })
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'student_import_template.csv'; a.click()
  }
  return (
    <Modal isOpen={open} onClose={close} title="Import students from CSV" size="lg"
      footer={<><button className="btn-secondary" onClick={close}>Close</button>{!result && <button className="btn-primary" disabled={!valid.length} onClick={doImport}>Import {valid.length} valid row(s)</button>}</>}>
      <div className="space-y-4">
        <Banner>Columns: <code className="text-xs">{CSV_COLUMNS.join(', ')}</code>. Separate multiple skills with semicolons. Duplicate USNs or emails are rejected. Imported students get the demo password <code>Student@123</code>.</Banner>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="btn-primary cursor-pointer"><Upload className="w-4 h-4" />Choose CSV<input type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) parse(f); e.target.value = '' }} /></label>
          <button className="btn-outline" onClick={template}><FileDown className="w-4 h-4" />Download template</button>
          {fileName && <span className="text-sm text-text-secondary">{fileName}</span>}
        </div>
        {rows.length > 0 && !result && (
          <div>
            <p className="text-sm mb-2"><span className="font-semibold text-emerald-700">{valid.length} valid</span> · <span className="font-semibold text-danger">{rows.length - valid.length} with errors</span></p>
            <div className="max-h-64 overflow-auto border border-border rounded-lg divide-y divide-border text-sm">
              {rows.map(r => <div key={r.row} className="px-3 py-1.5 flex gap-3"><span className="text-text-muted w-14 shrink-0">Row {r.row}</span>{r.data ? <span>{r.data.full_name} · {r.data.usn}</span> : <span className="text-danger">{r.error}</span>}</div>)}
            </div>
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <Banner tone="success">{result.created} student(s) created.</Banner>
            {result.errors.length > 0 && <div className="border border-red-200 rounded-lg divide-y divide-red-100 text-sm max-h-48 overflow-auto">{result.errors.map(e => <p key={e.row} className="px-3 py-1.5 text-danger">Row {e.row}: {e.message}</p>)}</div>}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Students() {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { batches, departments, degrees } = useUniqueValues()
  const [q, setQ] = useState('')
  const [batch, setBatch] = useState('')
  const [dept, setDept] = useState('')
  const [degree, setDegree] = useState('')
  const [minCgpa, setMinCgpa] = useState('')
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [active, setActive] = useState('active')
  const [editing, setEditing] = useState<Profile | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [toggle, setToggle] = useState<Profile | null>(null)

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return lk.students.filter(p =>
      (!s || [p.full_name, p.usn, p.email, p.department].some(v => v?.toLowerCase().includes(s))) &&
      (!batch || p.batch === Number(batch)) && (!dept || p.department === dept) && (!degree || p.degree === degree) &&
      (!minCgpa || (p.cgpa ?? 0) >= Number(minCgpa)) && (!status || p.placement_status === status) &&
      (active === 'all' || (active === 'active') === p.is_active))
  }, [lk.students, q, batch, dept, degree, minCgpa, status, active])

  const columns: Column<Profile>[] = [
    { key: 'name', label: 'Student', sortValue: r => r.full_name, render: r => <div><p className="font-medium">{r.full_name}</p><p className="text-xs text-text-secondary">{r.email}</p></div> },
    { key: 'usn', label: 'USN', sortValue: r => r.usn, render: r => <span className="font-mono text-xs">{r.usn}</span> },
    { key: 'dept', label: 'Department', sortValue: r => r.department, render: r => <span>{r.degree} · {r.department}</span> },
    { key: 'batch', label: 'Batch', sortValue: r => r.batch, render: r => r.batch },
    { key: 'cgpa', label: 'CGPA', sortValue: r => r.cgpa, render: r => <span className="tabular-nums">{r.cgpa ?? '—'}</span> },
    { key: 'bl', label: 'Backlogs', sortValue: r => r.backlogs, render: r => <span className={r.backlogs ? 'text-danger font-medium' : ''}>{r.backlogs ?? 0}</span> },
    { key: 'resume', label: 'Resume', render: r => lk.resume.has(r.id) ? <span className="text-emerald-700 text-xs font-medium">Uploaded</span> : <span className="text-text-muted text-xs">Missing</span> },
    { key: 'status', label: 'Placement', sortValue: r => r.placement_status, render: r => <div className="flex flex-col gap-1 items-start"><StatusBadge status={r.placement_status} />{!r.is_active && <StatusBadge status="inactive" />}</div> },
  ]

  const doExport = () => {
    const ok = exportCSV(rows.map(p => ({ name: p.full_name, usn: p.usn, email: p.email, phone: p.phone, department: p.department, degree: p.degree, batch: p.batch, semester: p.semester, cgpa: p.cgpa, backlogs: p.backlogs, skills: (lk.skills.get(p.id) ?? []).map(s => s.skill_name), resume: lk.resume.has(p.id) ? 'yes' : 'no', placement_status: PLACEMENT_STATUS_LABEL[p.placement_status], active: p.is_active ? 'yes' : 'no' })), 'students')
    if (!ok) run(async () => { throw new Error('Nothing to export for the current filters.') })
  }

  return (
    <div>
      <PageHeader title="Students" description={`${lk.students.length} student records · ${rows.length} shown`}
        actions={<>
          <button className="btn-outline" onClick={doExport}><Download className="w-4 h-4" />Export CSV</button>
          <button className="btn-outline" onClick={() => setImporting(true)}><Upload className="w-4 h-4" />Import CSV</button>
          <button className="btn-primary" onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Add student</button>
        </>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search name, USN, email, department" />
        <Select value={batch} onChange={e => setBatch(e.target.value)} aria-label="Batch"><option value="">All batches</option>{batches.map(b => <option key={b}>{b}</option>)}</Select>
        <Select value={degree} onChange={e => setDegree(e.target.value)} aria-label="Degree"><option value="">All degrees</option>{degrees.map(d => <option key={d}>{d}</option>)}</Select>
        <Select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}</Select>
        <Select value={minCgpa} onChange={e => setMinCgpa(e.target.value)} aria-label="Minimum CGPA"><option value="">Any CGPA</option>{[6, 6.5, 7, 7.5, 8, 8.5, 9].map(c => <option key={c} value={c}>≥ {c}</option>)}</Select>
        <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Placement status"><option value="">Any placement status</option>{(Object.keys(PLACEMENT_STATUS_LABEL) as PlacementStatus[]).map(s => <option key={s} value={s}>{PLACEMENT_STATUS_LABEL[s]}</option>)}</Select>
        <Select value={active} onChange={e => setActive(e.target.value)} aria-label="Record state"><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="all">All records</option></Select>
      </FilterBar>
      <DataTable rows={rows} columns={columns} rowKey={r => r.id} onRowClick={r => nav(`/officer/students/${r.id}`)}
        empty="No students match these filters."
        actions={r => <div className="inline-flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label={`Edit ${r.full_name}`}><Pencil className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost btn-sm" onClick={() => setToggle(r)} aria-label={r.is_active ? 'Deactivate' : 'Activate'} title={r.is_active ? 'Mark inactive' : 'Mark active'}><Power className={`w-3.5 h-3.5 ${r.is_active ? 'text-danger' : 'text-emerald-600'}`} /></button>
        </div>} />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add student' : 'Edit student'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit" form="student-form">Save</button></>}>
        {editing && <StudentForm key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
      <ImportModal open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog isOpen={!!toggle} variant={toggle?.is_active ? 'danger' : 'info'} title={toggle?.is_active ? 'Mark student inactive?' : 'Reactivate student?'}
        message={toggle?.is_active ? `${toggle.full_name} will not be able to sign in or appear as eligible for jobs until reactivated.` : `${toggle?.full_name} will regain access.`}
        confirmLabel={toggle?.is_active ? 'Mark inactive' : 'Activate'} onCancel={() => setToggle(null)}
        onConfirm={async () => { if (toggle) await run(() => api.setStudentActive(toggle.id, !toggle.is_active), 'Student updated'); setToggle(null) }} />
    </div>
  )
}
