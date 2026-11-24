import { useState } from 'react'
import { MapPin, Clock, CheckCircle2, XCircle, Send, CalendarDays } from 'lucide-react'
import { useData, useMe } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { Banner, Chips, Field, KV, Textarea } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatLPA, cn, isPast } from '@/lib/utils'
import type { JobView } from '@/hooks/useStudent'

export function JobCard({ v, onOpen, why }: { v: JobView; onOpen: () => void; why?: string[] }) {
  const { db } = useData()
  const lk = useLookups()
  const c = lk.company.get(v.job.company_id)
  return (
    <button onClick={onOpen} className="card p-4 text-left hover:shadow-md hover:border-primary/30 transition flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="font-semibold leading-snug">{v.job.title}</h3><p className="text-sm text-text-secondary truncate">{c?.name}</p></div>
        {v.applied ? <StatusBadge status={v.applied} /> : <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', v.e.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{v.e.eligible ? 'Eligible' : 'Not eligible'}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{v.job.location}</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{v.daysLeft != null ? (v.daysLeft <= 0 ? 'Closes today' : `${v.daysLeft} day(s) left`) : 'No deadline'}</span>
        {db.settings.show_salary_to_students && <span className="font-medium text-text-primary">{formatLPA(v.job.salary_min, v.job.salary_max)}</span>}
      </div>
      <div className="mt-3"><Chips items={(v.job.required_skills ?? []).slice(0, 5)} /></div>
      {why && why.length > 0 && <ul className="mt-3 text-xs text-text-secondary space-y-0.5">{why.map(w => <li key={w} className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />{w}</li>)}</ul>}
    </button>
  )
}

export function JobDetailModal({ v, onClose }: { v: JobView | null; onClose: () => void }) {
  const { db, api } = useData()
  const me = useMe()
  const { run } = useToast()
  const lk = useLookups()
  const [confirm, setConfirm] = useState(false)
  const [note, setNote] = useState('')
  const hasResume = db.resumes.some(r => r.student_id === me.id)
  const c = v ? lk.company.get(v.job.company_id) : undefined
  const rule = v ? lk.rule.get(v.job.id) : undefined
  const drive = v ? db.drives.find(d => d.job_id === v.job.id && d.status === 'upcoming') : undefined
  const myReg = drive ? db.driveRegistrations.find(r => r.drive_id === drive.id && r.student_id === me.id) : undefined
  const app = v ? db.applications.find(a => a.job_id === v.job.id && a.student_id === me.id) : undefined

  return (
    <>
      <Modal isOpen={!!v && !confirm} onClose={onClose} title={v?.job.title ?? ''} size="lg"
        footer={v && <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          {app ? <span className="text-sm text-text-secondary flex items-center gap-2">Applied {formatDate(app.created_at)} · <StatusBadge status={app.status} /></span>
            : <button className="btn-primary" disabled={!v.e.eligible} onClick={() => setConfirm(true)}><Send className="w-4 h-4" />Apply</button>}
        </>}>
        {v && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{c?.name} · {c?.industry} · {v.job.job_type}</p>
            {v.e.eligible ? <Banner tone="success">You meet all eligibility criteria for this job.</Banner> : (
              <Banner tone="warning" title="You are not eligible for this job">
                <ul className="list-disc pl-4 mt-1">{v.e.reasons.map(r => <li key={r}>{r}</li>)}</ul>
              </Banner>
            )}
            <dl className="grid sm:grid-cols-3 gap-4">
              {db.settings.show_salary_to_students && <KV label="Package">{formatLPA(v.job.salary_min, v.job.salary_max)}</KV>}
              <KV label="Location">{v.job.location}</KV><KV label="Apply by">{formatDate(v.job.application_deadline, 'long')}</KV>
            </dl>
            <KV label="About the role">{v.job.description}</KV>
            <KV label="Responsibilities">{v.job.responsibilities}</KV>
            <div><p className="text-xs text-text-secondary mb-1">Required skills{rule?.skills_mandatory ? ' (mandatory)' : ''}</p>
              <div className="flex flex-wrap gap-1.5">{(rule?.required_skills ?? v.job.required_skills ?? []).map(s => {
                const has = v.e.matchedSkills.includes(s)
                return <span key={s} className={cn('px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1', has ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-text-secondary')}>{has ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{s}</span>
              })}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 grid sm:grid-cols-2 gap-3 text-sm">
              <KV label="Departments">{rule?.eligible_departments?.join(', ') || 'All'}</KV>
              <KV label="Batch">{rule?.eligible_batches?.join(', ') || 'Any'}</KV>
              <KV label="Minimum CGPA">{rule?.min_cgpa ?? 'None'}</KV>
              <KV label="Maximum backlogs">{rule?.max_backlogs ?? 'No limit'}</KV>
              {rule?.additional_criteria && <div className="sm:col-span-2"><KV label="Other conditions">{rule.additional_criteria}</KV></div>}
            </div>
            {c?.description && <KV label={`About ${c.name}`}>{c.description}</KV>}
            {drive && (
              <div className="border border-border rounded-lg p-3">
                <p className="font-medium text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />{drive.title}</p>
                <p className="text-xs text-text-secondary mt-1">{formatDate(drive.drive_date, 'long')} · {drive.mode === 'online' ? 'Online' : drive.venue} · register by {formatDate(drive.registration_deadline, 'long')}</p>
                {drive.instructions && <p className="text-xs mt-1">{drive.instructions}</p>}
                {drive.required_documents?.length ? <p className="text-xs mt-1">Bring: {drive.required_documents.join(', ')}</p> : null}
                <div className="mt-2">
                  {myReg ? <div className="flex items-center gap-2"><span className="text-xs text-emerald-700 font-medium">You are registered</span><button className="btn-ghost btn-sm" onClick={() => run(() => api.unregisterFromDrive(myReg.id), 'Registration cancelled')}>Cancel registration</button></div>
                    : <button className="btn-outline btn-sm" disabled={!v.e.eligible || isPast(drive.registration_deadline)} onClick={() => run(() => api.registerForDrive(drive.id, [me.id]), 'Registered for the drive')}>Register for drive</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal isOpen={confirm && !!v} onClose={() => setConfirm(false)} title="Confirm application" size="md"
        footer={<><button className="btn-secondary" onClick={() => setConfirm(false)}>Back</button><button className="btn-primary" onClick={async () => {
          if (!v) return
          if (await run(() => api.applyToJob(v.job.id, note), 'Application submitted')) { setConfirm(false); setNote(''); onClose() }
        }}>Submit application</button></>}>
        {v && (
          <div className="space-y-3">
            <p className="text-sm">You are applying for <strong>{v.job.title}</strong> at <strong>{c?.name}</strong>.</p>
            {hasResume ? <p className="text-sm text-text-secondary">Your current resume will be attached.</p> : <Banner tone="warning">You have not uploaded a resume. You can still apply, but recruiters may skip applications without one.</Banner>}
            <Field label="Short note to the placement cell (optional)"><Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></Field>
            <p className="text-xs text-text-secondary">Withdrawal is allowed only while the application is {db.settings.withdrawable_statuses.map(s => s.replace(/_/g, ' ')).join(' or ')}.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
