import { useState } from 'react'
import { Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useStudent } from '@/hooks/useStudent'
import { Banner, Card, Field, Input, KV, PageHeader } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { computeCgpa } from '@/lib/academics'
import { labelize } from '@/lib/utils'
import type { StudentAcademic } from '@/types/models'

interface Draft { id?: string; semester: string; sgpa: string; credits: string; backlogs: string; year: string }

export default function Academics() {
  const { api } = useData()
  const { run } = useToast()
  const { me, academics, settings } = useStudent()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [del, setDel] = useState<StudentAcademic | null>(null)
  const scale = settings.grading_scale
  const computed = computeCgpa(academics, settings.cgpa_method)

  const validate = (d: Draft) => {
    const e: Record<string, string> = {}
    const sem = Number(d.semester)
    if (!Number.isInteger(sem) || sem < 1 || sem > 8) e.semester = 'Semester must be 1–8'
    else if (academics.some(a => a.semester === sem && a.id !== d.id)) e.semester = `Semester ${sem} already has a record`
    if (d.sgpa === '' || Number.isNaN(Number(d.sgpa)) || Number(d.sgpa) < 0 || Number(d.sgpa) > scale) e.sgpa = `SGPA must be between 0 and ${scale}`
    if (d.credits !== '' && (Number(d.credits) <= 0 || Number(d.credits) > 40)) e.credits = 'Credits must be 1–40'
    if (d.backlogs === '' || Number(d.backlogs) < 0 || !Number.isInteger(Number(d.backlogs))) e.backlogs = 'Enter 0 or more'
    if (!/^\d{4}$/.test(d.year)) e.year = 'Enter a 4-digit year'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const save = async () => {
    if (!draft || !validate(draft)) return
    const ok = await run(() => api.saveAcademic({ semester: Number(draft.semester), sgpa: Number(draft.sgpa), credits: draft.credits ? Number(draft.credits) : null, backlogs: Number(draft.backlogs), year: Number(draft.year) }, draft.id), 'Record saved — pending verification')
    if (ok) setDraft(null)
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Academic Details" description="Your official CGPA and backlogs are maintained by the placement cell and used for eligibility."
        actions={<button className="btn-primary" onClick={() => { setErrors({}); setDraft({ semester: String((academics.at(-1)?.semester ?? 0) + 1), sgpa: '', credits: '', backlogs: '0', year: String(new Date().getFullYear()) }) }}><Plus className="w-4 h-4" />Add semester</button>} />
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        <Card><KV label="Degree / department">{me.degree} · {me.department}</KV></Card>
        <Card><KV label={`Official CGPA (of ${scale})`}><span className="text-xl">{me.cgpa ?? '—'}</span></KV></Card>
        <Card><KV label="Active backlogs"><span className="text-xl">{me.backlogs ?? 0}</span></KV></Card>
        <Card><KV label="Graduation year">{me.batch}</KV></Card>
      </div>
      {computed != null && computed !== me.cgpa && <div className="mb-4"><Banner>From your semester records, CGPA works out to <strong>{computed}</strong> ({labelize(settings.cgpa_method)}). The official value changes only after the placement cell verifies your records.</Banner></div>}
      <Card title="Semester-wise record" bodyClassName="p-0">
        {academics.length === 0 ? <p className="p-5 text-sm text-text-secondary">No semester records yet. Add your SGPA for each completed semester.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-xs text-text-secondary uppercase"><th className="text-left px-4 py-2">Semester</th><th className="text-left px-4 py-2">Year</th><th className="text-left px-4 py-2">SGPA</th><th className="text-left px-4 py-2">Credits</th><th className="text-left px-4 py-2">Backlogs</th><th className="text-left px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
            <tbody className="divide-y divide-border">{academics.map(a => (
              <tr key={a.id}><td className="px-4 py-2">{a.semester}</td><td className="px-4 py-2">{a.year}</td><td className="px-4 py-2 tabular-nums">{a.sgpa}</td><td className="px-4 py-2">{a.credits ?? '—'}</td><td className="px-4 py-2">{a.backlogs}</td><td className="px-4 py-2"><StatusBadge status={a.verified ? 'verified' : 'unverified'} /></td>
                <td className="px-4 py-2 text-right whitespace-nowrap">{a.verified ? <span className="text-xs text-text-muted inline-flex items-center gap-1"><Lock className="w-3 h-3" />Locked</span> : <>
                  <button className="btn-ghost btn-sm" aria-label="Edit" onClick={() => { setErrors({}); setDraft({ id: a.id, semester: String(a.semester), sgpa: String(a.sgpa ?? ''), credits: String(a.credits ?? ''), backlogs: String(a.backlogs), year: String(a.year) }) }}><Pencil className="w-3.5 h-3.5" /></button>
                  <button className="btn-ghost btn-sm" aria-label="Delete" onClick={() => setDel(a)}><Trash2 className="w-3.5 h-3.5 text-danger" /></button></>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <p className="text-xs text-text-secondary mt-3">CGPA method configured by the college: {settings.cgpa_method === 'credit_weighted' ? 'credit-weighted average of SGPA (enter credits for each semester)' : 'simple average of SGPA'}.</p>

      <Modal isOpen={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit semester' : 'Add semester'} size="sm"
        footer={<><button className="btn-secondary" onClick={() => setDraft(null)}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
        {draft && <div className="grid grid-cols-2 gap-3">
          <Field label="Semester" error={errors.semester}><Input type="number" value={draft.semester} onChange={e => setDraft({ ...draft, semester: e.target.value })} /></Field>
          <Field label="Year" error={errors.year}><Input type="number" value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })} /></Field>
          <Field label={`SGPA (0–${scale})`} error={errors.sgpa}><Input type="number" step="0.01" value={draft.sgpa} onChange={e => setDraft({ ...draft, sgpa: e.target.value })} /></Field>
          <Field label="Credits" error={errors.credits}><Input type="number" value={draft.credits} onChange={e => setDraft({ ...draft, credits: e.target.value })} /></Field>
          <Field label="Backlogs this semester" error={errors.backlogs} className="col-span-2"><Input type="number" value={draft.backlogs} onChange={e => setDraft({ ...draft, backlogs: e.target.value })} /></Field>
        </div>}
      </Modal>
      <ConfirmDialog isOpen={!!del} title="Delete semester record?" message={`Semester ${del?.semester} will be removed.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { if (del) await run(() => api.deleteAcademic(del.id), 'Record deleted'); setDel(null) }} />
    </div>
  )
}
