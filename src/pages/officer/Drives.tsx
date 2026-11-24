import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, MapPin, Monitor, Users, UserPlus, Trash2, Download } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { Field, Input, KV, PageHeader, Select, TagInput, Tabs, Textarea, Chips } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { exportCSV, formatDate, toLocalInput } from '@/lib/utils'
import { optStr } from '@/lib/forms'
import type { DriveStatus, PlacementDrive } from '@/types/models'

const schema = z.object({
  title: z.string().trim().min(3, 'Title is required'),
  company_id: z.string().min(1, 'Select a company'),
  job_id: z.string().transform(v => v || null),
  mode: z.enum(['on_campus', 'online', 'hybrid']),
  drive_date: z.string().min(1, 'Drive date is required'),
  registration_deadline: z.string(),
  venue: optStr,
  description: optStr,
  instructions: optStr,
}).refine(v => !v.registration_deadline || v.registration_deadline <= v.drive_date, { message: 'Must be before the drive date', path: ['registration_deadline'] })
  .refine(v => v.mode === 'online' || !!v.venue, { message: 'Venue is required for on-campus / hybrid drives', path: ['venue'] })
type In = z.input<typeof schema>
type Out = z.output<typeof schema>

function DriveForm({ initial, onDone }: { initial?: PlacementDrive; onDone: () => void }) {
  const { db, api } = useData()
  const { run } = useToast()
  const [docs, setDocs] = useState<string[]>(initial?.required_documents ?? ['College ID', 'Resume'])
  const { register, handleSubmit, watch, formState: { errors } } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: initial ? { title: initial.title, company_id: initial.company_id, job_id: initial.job_id ?? '', mode: initial.mode, drive_date: toLocalInput(initial.drive_date), registration_deadline: initial.registration_deadline ? toLocalInput(initial.registration_deadline) : '', venue: initial.venue ?? '', description: initial.description ?? '', instructions: initial.instructions ?? '' } : { mode: 'on_campus', job_id: '', registration_deadline: '' },
  })
  const companyId = watch('company_id')
  const mode = watch('mode')
  return (
    <form id="drive-form" noValidate className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit(async v => {
      const ok = await run(() => api.saveDrive({ ...v, drive_date: new Date(v.drive_date).toISOString(), registration_deadline: v.registration_deadline ? new Date(v.registration_deadline).toISOString() : null, required_documents: docs, status: initial?.status ?? 'upcoming', venue: v.mode === 'online' ? null : v.venue }, initial?.id), initial ? 'Drive updated (registered students notified of schedule changes)' : 'Drive created — eligible students notified')
      if (ok) onDone()
    })}>
      <Field label="Drive title" required error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} /></Field>
      <Field label="Company" required error={errors.company_id?.message}><Select {...register('company_id')}><option value="">Select…</option>{db.companies.filter(c => c.is_active || c.id === initial?.company_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Linked job (sets eligibility)" hint="Optional"><Select {...register('job_id')}><option value="">No linked job</option>{db.jobs.filter(j => j.company_id === companyId && j.status !== 'archived').map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</Select></Field>
      <Field label="Mode"><Select {...register('mode')}><option value="on_campus">On campus</option><option value="online">Online</option><option value="hybrid">Hybrid</option></Select></Field>
      <Field label="Venue" error={errors.venue?.message}><Input {...register('venue')} disabled={mode === 'online'} placeholder={mode === 'online' ? 'Not needed for online drives' : ''} /></Field>
      <Field label="Drive date & time" required error={errors.drive_date?.message}><Input type="datetime-local" {...register('drive_date')} /></Field>
      <Field label="Registration deadline" error={errors.registration_deadline?.message}><Input type="datetime-local" {...register('registration_deadline')} /></Field>
      <Field label="Description" className="sm:col-span-2"><Textarea {...register('description')} /></Field>
      <Field label="Instructions for students" className="sm:col-span-2"><Textarea {...register('instructions')} /></Field>
      <Field label="Required documents" className="sm:col-span-2"><TagInput value={docs} onChange={setDocs} placeholder="Add document and press Enter" /></Field>
    </form>
  )
}

export default function Drives() {
  const { db, api } = useData()
  const { run, toast } = useToast()
  const lk = useLookups()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'upcoming' | 'ongoing' | 'completed' | 'cancelled'>('upcoming')
  const [editing, setEditing] = useState<PlacementDrive | 'new' | null>(null)
  const [statusChange, setStatusChange] = useState<DriveStatus | null>(null)
  const [addStudent, setAddStudent] = useState('')
  const viewing = db.drives.find(d => d.id === params.get('open'))
  const list = db.drives.filter(d => d.status === tab).sort((a, b) => tab === 'upcoming' ? a.drive_date.localeCompare(b.drive_date) : b.drive_date.localeCompare(a.drive_date))
  const regs = viewing ? db.driveRegistrations.filter(r => r.drive_id === viewing.id) : []
  const eligibleNotRegistered = viewing ? lk.students.filter(s => s.is_active && !regs.some(r => r.student_id === s.id) && (!viewing.job_id || lk.eligibility(s.id, viewing.job_id)?.eligible)) : []

  const registerAll = async () => {
    if (!viewing) return
    try {
      const r = await api.registerForDrive(viewing.id, eligibleNotRegistered.map(s => s.id))
      toast({ type: 'success', title: `${r.added} student(s) registered`, message: r.skipped.length ? `${r.skipped.length} skipped` : undefined })
    } catch (e) { toast({ type: 'error', title: 'Registration failed', message: (e as Error).message }) }
  }

  return (
    <div>
      <PageHeader title="Placement Drives" description="Schedule recruitment drives, register eligible students and track attendance." actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="w-4 h-4" />New drive</button>} />
      <Tabs value={tab} onChange={setTab} tabs={(['upcoming', 'ongoing', 'completed', 'cancelled'] as const).map(s => ({ id: s, label: s[0].toUpperCase() + s.slice(1), count: db.drives.filter(d => d.status === s).length }))} />
      {list.length === 0 ? <div className="card"><EmptyState title={`No ${tab} drives`} description={tab === 'upcoming' ? 'Create a drive to invite eligible students.' : undefined} action={tab === 'upcoming' ? { label: 'New drive', onClick: () => setEditing('new') } : undefined} /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(d => {
            const count = db.driveRegistrations.filter(r => r.drive_id === d.id)
            return (
              <button key={d.id} onClick={() => setParams({ open: d.id })} className="card p-5 text-left hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{d.title}</h3><StatusBadge status={d.status} /></div>
                <p className="text-sm text-text-secondary mt-1">{lk.company.get(d.company_id)?.name}{d.job_id && ` · ${lk.job.get(d.job_id)?.title}`}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex items-center gap-2">{d.mode === 'online' ? <Monitor className="w-4 h-4 text-text-secondary" /> : <MapPin className="w-4 h-4 text-text-secondary" />}{d.mode === 'online' ? 'Online' : d.venue}{d.mode === 'hybrid' && ' (hybrid)'}</p>
                  <p className="font-medium">{formatDate(d.drive_date, 'long')}</p>
                  <p className="flex items-center gap-2 text-text-secondary"><Users className="w-4 h-4" />{count.length} registered{d.status === 'completed' && ` · ${count.filter(r => r.attended).length} attended`}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New placement drive' : 'Edit drive'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit" form="drive-form">Save</button></>}>
        {editing && <DriveForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setParams({})} title={viewing?.title ?? ''} size="xl"
        footer={viewing && <>
          {viewing.status === 'upcoming' && <button className="btn-outline btn-sm" onClick={() => setStatusChange('ongoing')}>Mark ongoing</button>}
          {['upcoming', 'ongoing'].includes(viewing.status) && <button className="btn-outline btn-sm" onClick={() => setStatusChange('completed')}>Mark completed</button>}
          {['upcoming', 'ongoing'].includes(viewing.status) && <button className="btn-outline btn-sm text-danger" onClick={() => setStatusChange('cancelled')}>Cancel drive</button>}
          {viewing.status !== 'cancelled' && <button className="btn-primary btn-sm" onClick={() => setEditing(viewing)}><Pencil className="w-3.5 h-3.5" />Edit</button>}
        </>}>
        {viewing && (
          <div className="space-y-5">
            <dl className="grid sm:grid-cols-4 gap-4">
              <KV label="Company">{lk.company.get(viewing.company_id)?.name}</KV><KV label="Job">{viewing.job_id ? lk.job.get(viewing.job_id)?.title : 'Not linked'}</KV>
              <KV label="Date">{formatDate(viewing.drive_date, 'long')}</KV><KV label="Register by">{formatDate(viewing.registration_deadline, 'long')}</KV>
              <KV label="Mode">{viewing.mode.replace('_', ' ')}</KV><KV label="Venue">{viewing.venue ?? 'Online'}</KV><KV label="Status"><StatusBadge status={viewing.status} /></KV>
            </dl>
            {viewing.description && <KV label="Description">{viewing.description}</KV>}
            {viewing.instructions && <KV label="Instructions">{viewing.instructions}</KV>}
            <div><p className="text-xs text-text-secondary mb-1">Required documents</p><Chips items={viewing.required_documents} /></div>
            <div className="flex flex-wrap gap-2 items-end">
              <h3 className="font-semibold mr-auto">Registrations ({regs.length})</h3>
              {viewing.status === 'upcoming' && <>
                <button className="btn-primary btn-sm" disabled={!eligibleNotRegistered.length} onClick={registerAll}><UserPlus className="w-3.5 h-3.5" />Register all eligible ({eligibleNotRegistered.length})</button>
                <Select value={addStudent} onChange={e => setAddStudent(e.target.value)} className="w-56 py-1.5 text-xs" aria-label="Add student"><option value="">Add one eligible student…</option>{eligibleNotRegistered.map(s => <option key={s.id} value={s.id}>{s.full_name} · {s.usn}</option>)}</Select>
                <button className="btn-outline btn-sm" disabled={!addStudent} onClick={async () => { await run(() => api.registerForDrive(viewing.id, [addStudent]), 'Student registered'); setAddStudent('') }}>Add</button>
              </>}
              <button className="btn-outline btn-sm" onClick={() => { if (!exportCSV(regs.map(r => ({ name: lk.nameOf(r.student_id), usn: lk.profile.get(r.student_id)?.usn, email: lk.profile.get(r.student_id)?.email, registered_at: r.registered_at.slice(0, 10), attended: r.attended == null ? '' : r.attended ? 'yes' : 'no' })), `drive_${viewing.title.replace(/\W+/g, '_')}`)) toast({ type: 'warning', title: 'No registrations' }) }}><Download className="w-3.5 h-3.5" />Export</button>
            </div>
            <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
              {regs.length === 0 && <p className="p-4 text-sm text-text-secondary">No registrations yet.</p>}
              {regs.map(r => (
                <div key={r.id} className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{lk.nameOf(r.student_id)} <span className="text-xs text-text-secondary">{lk.profile.get(r.student_id)?.usn}</span></span>
                  <span className="flex items-center gap-2">
                    {viewing.status !== 'upcoming' && viewing.status !== 'cancelled' && (
                      <Select value={r.attended == null ? '' : r.attended ? 'yes' : 'no'} onChange={e => run(() => api.markDriveAttendance(r.id, e.target.value === '' ? null : e.target.value === 'yes'))} className="w-36 py-1 text-xs" aria-label="Attendance">
                        <option value="">Not marked</option><option value="yes">Attended</option><option value="no">Absent</option>
                      </Select>
                    )}
                    {viewing.status === 'upcoming' && <button className="btn-ghost btn-sm" onClick={() => run(() => api.unregisterFromDrive(r.id), 'Registration removed')} aria-label="Remove registration"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!statusChange} title={`Mark drive ${statusChange}?`} variant={statusChange === 'cancelled' ? 'danger' : 'info'}
        message={statusChange === 'cancelled' ? 'All registered students will be notified that the drive is cancelled.' : statusChange === 'completed' ? 'You can then record attendance for each registration.' : 'Attendance can be recorded once the drive is ongoing.'}
        onCancel={() => setStatusChange(null)} onConfirm={async () => { if (viewing && statusChange) await run(() => api.setDriveStatus(viewing.id, statusChange), 'Drive updated'); setStatusChange(null) }} />
    </div>
  )
}
