import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, CalendarDays, List, Pencil, XCircle, ClipboardCheck, Video, MapPin } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Field, FilterBar, Input, PageHeader, SearchInput, Select, Textarea } from '@/components/ui/primitives'
import { CalendarView, roundLabel } from '@/components/ui/misc'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatTime, toLocalInput } from '@/lib/utils'
import type { Interview, InterviewRound } from '@/types/models'

const ROUNDS: InterviewRound[] = ['aptitude', 'group_discussion', 'coding', 'technical_1', 'technical_2', 'managerial', 'hr', 'final']
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

interface Draft { application_id: string; round: InterviewRound; round_number: number; scheduled_at: string; duration_minutes: number; venue: string; meeting_link: string; instructions: string }

function ScheduleForm({ draft, setDraft, lockApp, editing }: { draft: Draft; setDraft: (d: Draft) => void; lockApp?: boolean; editing?: boolean }) {
  const { db } = useData()
  const lk = useLookups()
  const [q, setQ] = useState('')
  const apps = db.applications.filter(a => !['withdrawn', 'rejected', 'accepted'].includes(a.status) && lk.job.get(a.job_id)?.status !== 'archived')
    .filter(a => !q || [lk.nameOf(a.student_id), lk.profile.get(a.student_id)?.usn, lk.job.get(a.job_id)?.title].some(v => v?.toLowerCase().includes(q.toLowerCase())))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v })
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {!editing && (
        <div className="sm:col-span-2 space-y-2">
          {!lockApp && <SearchInput value={q} onChange={setQ} placeholder="Find application by student, USN or job" />}
          <Field label="Application" required>
            <Select value={draft.application_id} onChange={e => { const n = db.interviews.filter(i => i.application_id === e.target.value && i.status !== 'cancelled').length; setDraft({ ...draft, application_id: e.target.value, round_number: n + 1 }) }} disabled={lockApp}>
              <option value="">Select…</option>
              {(lockApp ? db.applications.filter(a => a.id === draft.application_id) : apps).map(a => <option key={a.id} value={a.id}>{lk.nameOf(a.student_id)} · {lk.jobTitle(a.job_id)} ({a.status.replace(/_/g, ' ')})</option>)}
            </Select>
          </Field>
        </div>
      )}
      {!editing && <Field label="Round type"><Select value={draft.round} onChange={e => set('round', e.target.value as InterviewRound)}>{ROUNDS.map(r => <option key={r} value={r}>{roundLabel(r)}</option>)}</Select></Field>}
      {!editing && <Field label="Round number"><Input type="number" min={1} value={draft.round_number} onChange={e => set('round_number', Number(e.target.value) || 1)} /></Field>}
      <Field label="Date & time" required hint={`Your timezone: ${tz}`}><Input type="datetime-local" value={draft.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} /></Field>
      <Field label="Duration (minutes)"><Input type="number" min={10} step={5} value={draft.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value) || 30)} /></Field>
      <Field label="Venue" hint="Venue or meeting link required"><Input value={draft.venue} onChange={e => set('venue', e.target.value)} /></Field>
      <Field label="Meeting link"><Input value={draft.meeting_link} onChange={e => set('meeting_link', e.target.value)} placeholder="https://" /></Field>
      <Field label="Preparation instructions" className="sm:col-span-2"><Textarea value={draft.instructions} onChange={e => set('instructions', e.target.value)} /></Field>
    </div>
  )
}

export default function Interviews() {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('active')
  const [company, setCompany] = useState('')
  const [round, setRound] = useState('')
  const empty: Draft = { application_id: params.get('schedule') ?? '', round: 'technical_1', round_number: 1, scheduled_at: '', duration_minutes: 30, venue: '', meeting_link: '', instructions: '' }
  const [draft, setDraft] = useState<Draft | null>(params.get('schedule') ? { ...empty, round_number: db.interviews.filter(i => i.application_id === params.get('schedule') && i.status !== 'cancelled').length + 1 } : null)
  const [editing, setEditingRaw] = useState<Interview | null>(null)
  const [editDraft, setEditDraft] = useState<Draft | null>(null)
  const setEditing = (i: Interview | null) => { setEditingRaw(i); setEditDraft(i ? toDraft(i) : null) }
  const [cancel, setCancel] = useState<Interview | null>(null)
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState<{ iv: Interview; attended: boolean; feedback: string; rating: string; result: '' | 'pass' | 'fail' | 'on_hold' } | null>(null)

  const rows = useMemo(() => db.interviews.filter(i =>
    (status === 'all' || (status === 'active' ? ['scheduled', 'rescheduled'].includes(i.status) : i.status === status)) &&
    (!company || i.company_id === company) && (!round || i.round === round) &&
    (!q || [lk.nameOf(i.student_id), lk.profile.get(i.student_id)?.usn].some(v => v?.toLowerCase().includes(q.toLowerCase()))),
  ).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)), [db.interviews, status, company, round, q, lk])

  const columns: Column<Interview>[] = [
    { key: 'when', label: 'When', sortValue: r => r.scheduled_at, render: r => <div><p className="font-medium">{formatDate(r.scheduled_at)}</p><p className="text-xs text-text-secondary">{formatTime(r.scheduled_at)} · {r.duration_minutes} min</p></div> },
    { key: 'student', label: 'Student', sortValue: r => lk.nameOf(r.student_id), render: r => <div><p>{lk.nameOf(r.student_id)}</p><p className="text-xs text-text-secondary">{lk.profile.get(r.student_id)?.usn}</p></div> },
    { key: 'job', label: 'Company / role', render: r => <div><p>{lk.company.get(r.company_id)?.name}</p><p className="text-xs text-text-secondary">{lk.job.get(r.job_id)?.title}</p></div> },
    { key: 'round', label: 'Round', sortValue: r => r.round_number, render: r => <span>#{r.round_number} {roundLabel(r.round)}</span> },
    { key: 'where', label: 'Where', render: r => <span className="text-xs flex items-center gap-1">{r.meeting_link ? <><Video className="w-3.5 h-3.5" />Online</> : <><MapPin className="w-3.5 h-3.5" />{r.venue}</>}</span> },
    { key: 'status', label: 'Status', sortValue: r => r.status, render: r => <div className="flex flex-col items-start gap-1"><StatusBadge status={r.status} />{r.attended === false && <span className="text-[11px] text-danger">Absent</span>}{db.feedback.find(f => f.interview_id === r.id)?.result && <StatusBadge status={db.feedback.find(f => f.interview_id === r.id)!.result!} />}</div> },
  ]

  const toDraft = (i: Interview): Draft => ({ application_id: i.application_id, round: i.round, round_number: i.round_number, scheduled_at: toLocalInput(i.scheduled_at), duration_minutes: i.duration_minutes, venue: i.venue ?? '', meeting_link: i.meeting_link ?? '', instructions: i.instructions ?? '' })
  const closeSchedule = () => { setDraft(null); if (params.get('schedule')) setParams({}) }

  return (
    <div>
      <PageHeader title="Interview Management" description={`Times shown in ${tz}`}
        actions={<>
          <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
            <button className={`btn-sm btn ${view === 'list' ? 'bg-primary text-white' : 'text-text-secondary'}`} onClick={() => setView('list')}><List className="w-3.5 h-3.5" />List</button>
            <button className={`btn-sm btn ${view === 'calendar' ? 'bg-primary text-white' : 'text-text-secondary'}`} onClick={() => setView('calendar')}><CalendarDays className="w-3.5 h-3.5" />Calendar</button>
          </div>
          <button className="btn-primary" onClick={() => setDraft(empty)}><CalendarPlus className="w-4 h-4" />Schedule interview</button>
        </>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search student or USN" />
        <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="active">Scheduled & rescheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="all">All</option></Select>
        <Select value={company} onChange={e => setCompany(e.target.value)} aria-label="Company"><option value="">All companies</option>{db.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={round} onChange={e => setRound(e.target.value)} aria-label="Round"><option value="">All rounds</option>{ROUNDS.map(r => <option key={r} value={r}>{roundLabel(r)}</option>)}</Select>
      </FilterBar>
      {view === 'calendar' ? (
        <CalendarView events={rows.map(i => ({ id: i.id, date: i.scheduled_at, title: lk.nameOf(i.student_id), subtitle: `${lk.company.get(i.company_id)?.name} · ${roundLabel(i.round)}`, tone: i.status === 'cancelled' ? 'red' : i.status === 'rescheduled' ? 'amber' : i.status === 'completed' ? 'slate' : 'navy', onClick: () => i.status !== 'cancelled' && i.status !== 'completed' ? setEditing(i) : undefined }))} />
      ) : (
        <DataTable rows={rows} columns={columns} rowKey={r => r.id} empty="No interviews match."
          actions={r => r.status === 'cancelled' ? <span className="text-xs text-text-muted" title={r.cancel_reason ?? ''}>Cancelled</span> : (
            <div className="inline-flex gap-1">
              {r.status !== 'completed' && <button className="btn-ghost btn-sm" title="Reschedule / edit" onClick={() => setEditing(r)}><Pencil className="w-3.5 h-3.5" /></button>}
              <button className="btn-ghost btn-sm" title="Record attendance & feedback" onClick={() => { const fb = db.feedback.find(f => f.interview_id === r.id); setOutcome({ iv: r, attended: r.attended ?? true, feedback: fb?.feedback ?? '', rating: fb?.rating ? String(fb.rating) : '', result: fb?.result ?? '' }) }}><ClipboardCheck className="w-3.5 h-3.5" /></button>
              {r.status !== 'completed' && <button className="btn-ghost btn-sm" title="Cancel" onClick={() => { setCancel(r); setReason('') }}><XCircle className="w-3.5 h-3.5 text-danger" /></button>}
            </div>
          )} />
      )}

      <Modal isOpen={!!draft} onClose={closeSchedule} title="Schedule interview" size="lg"
        footer={<><button className="btn-secondary" onClick={closeSchedule}>Cancel</button><button className="btn-primary" disabled={!draft?.application_id || !draft?.scheduled_at} onClick={async () => {
          if (!draft) return
          if (await run(() => api.scheduleInterview({ ...draft, scheduled_at: new Date(draft.scheduled_at).toISOString(), venue: draft.venue || null, meeting_link: draft.meeting_link || null, instructions: draft.instructions || null }), 'Interview scheduled & student notified')) closeSchedule()
        }}>Schedule</button></>}>
        {draft && <ScheduleForm draft={draft} setDraft={setDraft} lockApp={!!params.get('schedule')} />}
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit interview – ${lk.nameOf(editing.student_id)}` : ''} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Close</button><button className="btn-primary" onClick={async () => {
          if (!editing || !editDraft) return
          const d = editDraft
          if (await run(() => api.rescheduleInterview(editing.id, { scheduled_at: new Date(d.scheduled_at).toISOString(), duration_minutes: d.duration_minutes, venue: d.venue || null, meeting_link: d.meeting_link || null, instructions: d.instructions || null }), 'Interview updated & student notified')) setEditing(null)
        }}>Save changes</button></>}>
        {editing && editDraft && <ScheduleForm draft={editDraft} setDraft={setEditDraft} editing />}
      </Modal>

      <ConfirmDialog isOpen={!!cancel} title="Cancel interview?" message={`${cancel ? lk.nameOf(cancel.student_id) : ''} will be notified.`} confirmLabel="Cancel interview" onCancel={() => setCancel(null)}
        onConfirm={async () => { if (cancel) await run(() => api.cancelInterview(cancel.id, reason), 'Interview cancelled'); setCancel(null) }}>
        <Field label="Reason (shared with the student)"><Input value={reason} onChange={e => setReason(e.target.value)} /></Field>
      </ConfirmDialog>

      <Modal isOpen={!!outcome} onClose={() => setOutcome(null)} title="Attendance & feedback" size="md"
        footer={outcome && <><button className="btn-secondary" onClick={() => setOutcome(null)}>Cancel</button><button className="btn-primary" onClick={async () => {
          if (await run(() => api.recordInterviewOutcome(outcome.iv.id, outcome.attended, { feedback: outcome.feedback, rating: outcome.rating ? Number(outcome.rating) : null, result: outcome.result || null }), 'Outcome recorded')) setOutcome(null)
        }}>Save</button></>}>
        {outcome && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{lk.nameOf(outcome.iv.student_id)} · {roundLabel(outcome.iv.round)} · {formatDate(outcome.iv.scheduled_at, 'long')}</p>
            <Field label="Attendance"><Select value={outcome.attended ? 'yes' : 'no'} onChange={e => setOutcome({ ...outcome, attended: e.target.value === 'yes' })}><option value="yes">Attended</option><option value="no">Absent</option></Select></Field>
            <Field label="Round result"><Select value={outcome.result} onChange={e => setOutcome({ ...outcome, result: e.target.value as typeof outcome.result })}><option value="">Not decided</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="on_hold">On hold</option></Select></Field>
            <Field label="Rating (1–5)"><Select value={outcome.rating} onChange={e => setOutcome({ ...outcome, rating: e.target.value })}><option value="">—</option>{[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}</Select></Field>
            <Field label="Feedback (officers only)"><Textarea value={outcome.feedback} onChange={e => setOutcome({ ...outcome, feedback: e.target.value })} /></Field>
            <p className="text-xs text-text-secondary">Recording an outcome marks the interview completed. Update the application status separately when a decision is made.</p>
          </div>
        )}
      </Modal>
    </div>
  )

}
