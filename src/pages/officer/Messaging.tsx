import { useMemo, useState } from 'react'
import { Send, Plus, Pencil, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { Banner, Card, Field, Input, PageHeader, SearchInput, Select, Tabs, Textarea } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { INTEGRATIONS } from '@/lib/integrations'
import { APPLICATION_STATUSES } from '@/lib/placementStatus'
import { formatDate, labelize } from '@/lib/utils'
import type { MessageTemplate, NotificationJob } from '@/types/models'

export default function Messaging({ channel }: { channel: 'email' | 'whatsapp' }) {
  const { db, api } = useData()
  const { run, toast } = useToast()
  const lk = useLookups()
  const { batches } = useUniqueValues()
  const provider = INTEGRATIONS[channel]
  const label = channel === 'email' ? 'Email' : 'WhatsApp'
  const [tab, setTab] = useState<'compose' | 'history' | 'templates'>('compose')

  // recipients
  const [dept, setDept] = useState('')
  const [batch, setBatch] = useState(String(batches[0] ?? ''))
  const [eligJob, setEligJob] = useState('')
  const [appJob, setAppJob] = useState('')
  const [appStatus, setAppStatus] = useState('')
  const [driveId, setDriveId] = useState('')
  const [q, setQ] = useState('')
  const [excluded, setExcluded] = useState<string[]>([])
  // message
  const [templateId, setTemplateId] = useState('')
  const [ctxJob, setCtxJob] = useState('')
  const [ctxDrive, setCtxDrive] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [alsoInApp, setAlsoInApp] = useState(true)
  const [confirmSend, setConfirmSend] = useState(false)
  const [logFor, setLogFor] = useState<NotificationJob | null>(null)
  const [tpl, setTpl] = useState<(Omit<MessageTemplate, 'id'> & { id?: string }) | null>(null)
  const [delTpl, setDelTpl] = useState<MessageTemplate | null>(null)

  const matched = useMemo(() => lk.students.filter(s => s.is_active
    && (!dept || s.department === dept) && (!batch || s.batch === Number(batch))
    && (!eligJob || lk.eligibility(s.id, eligJob)?.eligible)
    && (!appJob && !appStatus || db.applications.some(a => a.student_id === s.id && (!appJob || a.job_id === appJob) && (!appStatus || a.status === appStatus)))
    && (!driveId || db.driveRegistrations.some(r => r.drive_id === driveId && r.student_id === s.id))), [lk, db.applications, db.driveRegistrations, dept, batch, eligJob, appJob, appStatus, driveId])
  const recipients = matched.filter(s => !excluded.includes(s.id))
  const visible = matched.filter(s => !q || s.full_name.toLowerCase().includes(q.toLowerCase()) || s.usn?.toLowerCase().includes(q.toLowerCase()))
  const missingContact = recipients.filter(s => channel === 'whatsapp' ? !s.phone : !s.email).length

  const templates = db.templates.filter(t => t.channel === channel)
  const selectedTpl = templates.find(t => t.id === templateId)
  const fillContext = (text: string) => {
    const j = lk.job.get(ctxJob), d = db.drives.find(x => x.id === ctxDrive)
    return text
      .replace(/\{\{\s*job_title\s*\}\}/g, j?.title ?? '{{job_title}}')
      .replace(/\{\{\s*company\s*\}\}/g, (j ? lk.company.get(j.company_id)?.name : d ? lk.company.get(d.company_id)?.name : undefined) ?? '{{company}}')
      .replace(/\{\{\s*deadline\s*\}\}/g, j?.application_deadline ? formatDate(j.application_deadline) : '{{deadline}}')
      .replace(/\{\{\s*drive_title\s*\}\}/g, d?.title ?? '{{drive_title}}')
      .replace(/\{\{\s*drive_date\s*\}\}/g, d ? formatDate(d.drive_date, 'long') : '{{drive_date}}')
  }
  const finalBody = fillContext(body)
  const finalSubject = fillContext(subject)
  const unresolved = [...new Set([...(finalBody + finalSubject).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).filter(k => k !== 'name'))]
  const sample = recipients[0]
  const preview = (t: string) => t.replace(/\{\{\s*name\s*\}\}/g, sample?.full_name ?? 'Student')

  const summary = [dept && `Dept: ${dept}`, batch && `Batch ${batch}`, eligJob && `Eligible for ${lk.job.get(eligJob)?.title}`, (appJob || appStatus) && `Applicants${appJob ? ` to ${lk.job.get(appJob)?.title}` : ''}${appStatus ? ` (${labelize(appStatus)})` : ''}`, driveId && `Registered for ${db.drives.find(d => d.id === driveId)?.title}`, excluded.length && `${excluded.length} excluded`].filter(Boolean).join(' · ') || 'All active students'

  const send = async () => {
    setConfirmSend(false)
    try {
      const job = await api.sendBroadcast({ channel, recipientIds: recipients.map(r => r.id), subject: channel === 'email' ? finalSubject : null, body: finalBody, alsoInApp, filterSummary: summary, templateId: templateId || null })
      if (job.status === 'sent') toast({ type: 'success', title: `${label} sent to ${job.recipient_ids.length} recipient(s)` })
      else toast({ type: 'warning', title: `${label} not delivered`, message: `${provider.name} provider is not configured, so ${job.status === 'failed' ? 'no messages were' : 'some messages were not'} sent. Failures are logged in History.${alsoInApp ? ' In-app notifications were delivered.' : ''}` })
      setTab('history')
    } catch (e) { toast({ type: 'error', title: 'Could not send', message: (e as Error).message }) }
  }

  const jobs = db.notificationJobs.filter(j => j.channel === channel)
  const histCols: Column<NotificationJob>[] = [
    { key: 'when', label: 'Created', sortValue: r => r.created_at, render: r => formatDate(r.created_at, 'long') },
    { key: 'msg', label: 'Message', render: r => <div className="max-w-md"><p className="font-medium truncate">{r.subject ?? r.body.slice(0, 60)}</p><p className="text-xs text-text-secondary truncate">{r.filter_summary}</p></div> },
    { key: 'n', label: 'Recipients', sortValue: r => r.recipient_ids.length, render: r => r.recipient_ids.length },
    { key: 'sent', label: 'Sent / failed', render: r => { const l = db.notifications.filter(n => (n.metadata as { job?: string } | null)?.job === r.id); return <span className="tabular-nums">{l.filter(n => n.status === 'sent').length} / <span className="text-danger">{l.filter(n => n.status === 'failed').length}</span></span> } },
    { key: 'status', label: 'Status', sortValue: r => r.status, render: r => <StatusBadge status={r.status} /> },
  ]
  const logs = logFor ? db.deliveryLogs.filter(l => db.notifications.find(n => n.id === l.notification_id && (n.metadata as { job?: string } | null)?.job === logFor.id)) : []

  return (
    <div>
      <PageHeader title={`${label} Notifications`} description={`Send ${label.toLowerCase()} announcements about jobs, drives, interviews and results.`} />
      {!provider.configured && <div className="mb-4"><Banner tone="warning" title={`${label} integration needs configuration`}>Messages will be logged as <strong>failed</strong> — nothing is sent until a provider is connected on the server. {provider.setupHint} You can still deliver the same message as an in-app notification.</Banner></div>}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'compose', label: 'Compose' }, { id: 'history', label: 'History', count: jobs.length }, { id: 'templates', label: 'Templates', count: templates.length }]} />

      {tab === 'compose' && (
        <div className="grid xl:grid-cols-[1fr_1fr] gap-4 items-start">
          <Card title={`1. Recipients (${recipients.length})`}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Department"><Select value={dept} onChange={e => setDept(e.target.value)}><option value="">All</option>{db.settings.departments.map(d => <option key={d}>{d}</option>)}</Select></Field>
              <Field label="Batch"><Select value={batch} onChange={e => setBatch(e.target.value)}><option value="">All</option>{batches.map(b => <option key={b}>{b}</option>)}</Select></Field>
              <Field label="Eligible for job"><Select value={eligJob} onChange={e => setEligJob(e.target.value)}><option value="">Any</option>{db.jobs.filter(j => j.status !== 'archived').map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)}</option>)}</Select></Field>
              <Field label="Placement drive registrants"><Select value={driveId} onChange={e => setDriveId(e.target.value)}><option value="">Any</option>{db.drives.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</Select></Field>
              <Field label="Applied to job"><Select value={appJob} onChange={e => setAppJob(e.target.value)}><option value="">Any</option>{db.jobs.map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)}</option>)}</Select></Field>
              <Field label="Application status"><Select value={appStatus} onChange={e => setAppStatus(e.target.value)}><option value="">Any</option>{APPLICATION_STATUSES.map(s => <option key={s} value={s}>{labelize(s)}</option>)}</Select></Field>
            </div>
            <div className="mt-4">
              <SearchInput value={q} onChange={setQ} placeholder="Filter list to include / exclude individuals" className="mb-2" />
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
                {visible.length === 0 && <p className="p-3 text-sm text-text-secondary">No students match.</p>}
                {visible.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={!excluded.includes(s.id)} onChange={() => setExcluded(x => x.includes(s.id) ? x.filter(i => i !== s.id) : [...x, s.id])} />
                    <span className="flex-1 truncate">{s.full_name} <span className="text-xs text-text-secondary">{s.usn}</span></span>
                    <span className="text-xs text-text-muted truncate max-w-40">{channel === 'email' ? s.email : s.phone ?? 'no phone'}</span>
                  </label>
                ))}
              </div>
              {missingContact > 0 && <p className="text-xs text-amber-700 mt-2">{missingContact} recipient(s) have no {channel === 'email' ? 'email' : 'phone number'} and will be logged as failed.</p>}
            </div>
          </Card>
          <Card title="2. Message">
            <div className="space-y-3">
              <Field label="Template"><Select value={templateId} onChange={e => { setTemplateId(e.target.value); const t = templates.find(x => x.id === e.target.value); if (t) { setBody(t.body); setSubject(t.subject ?? '') } }}><option value="">{channel === 'whatsapp' ? 'Free text (only within a 24-hour user session)' : 'No template'}</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}{channel === 'whatsapp' && !t.approved ? ' — not approved' : ''}</option>)}</Select></Field>
              {selectedTpl && channel === 'whatsapp' && !selectedTpl.approved && <p className="text-xs text-danger flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Unapproved templates cannot be sent.</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Fill details from job"><Select value={ctxJob} onChange={e => setCtxJob(e.target.value)}><option value="">—</option>{db.jobs.filter(j => j.status !== 'archived').map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)}</option>)}</Select></Field>
                <Field label="Fill details from drive"><Select value={ctxDrive} onChange={e => setCtxDrive(e.target.value)}><option value="">—</option>{db.drives.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}</Select></Field>
              </div>
              {channel === 'email' && <Field label="Subject" required><Input value={subject} onChange={e => setSubject(e.target.value)} /></Field>}
              <Field label="Message" required hint="Placeholders: {{name}} is filled per recipient; {{company}}, {{job_title}}, {{deadline}}, {{drive_title}}, {{drive_date}} from the job/drive above.">
                <Textarea value={body} onChange={e => setBody(e.target.value)} className="min-h-[160px]" maxLength={channel === 'whatsapp' ? 1024 : undefined} />
              </Field>
              {channel === 'whatsapp' && <p className="text-xs text-text-secondary text-right">{body.length}/1024</p>}
              {unresolved.length > 0 && <p className="text-xs text-amber-700">Unfilled placeholders: {unresolved.map(u => `{{${u}}}`).join(', ')}</p>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={alsoInApp} onChange={e => setAlsoInApp(e.target.checked)} />Also deliver as an in-app notification</label>
              <div className="bg-slate-50 border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Preview for {sample?.full_name ?? '—'}</p>
                {channel === 'email' && <p className="text-sm font-semibold">{preview(finalSubject) || '(no subject)'}</p>}
                <p className="text-sm whitespace-pre-wrap mt-1">{preview(finalBody) || '(empty message)'}</p>
              </div>
              <button className="btn-primary w-full" disabled={!recipients.length || !body.trim() || (channel === 'email' && !subject.trim()) || unresolved.length > 0 || (!!selectedTpl && channel === 'whatsapp' && !selectedTpl.approved)} onClick={() => setConfirmSend(true)}><Send className="w-4 h-4" />Send to {recipients.length} recipient(s)</button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'history' && <DataTable rows={jobs} columns={histCols} rowKey={r => r.id} onRowClick={setLogFor} empty="No messages sent yet." />}

      {tab === 'templates' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button className="btn-primary" onClick={() => setTpl({ channel, name: '', subject: channel === 'email' ? '' : null, body: '', approved: channel === 'email' })}><Plus className="w-4 h-4" />New template</button></div>
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map(t => (
              <Card key={t.id} title={t.name} actions={<div className="flex gap-1">{channel === 'whatsapp' && <StatusBadge status={t.approved ? 'active' : 'pending'} />}<button className="btn-ghost btn-sm" onClick={() => setTpl(t)} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button><button className="btn-ghost btn-sm" onClick={() => setDelTpl(t)} aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-danger" /></button></div>}>
                {t.subject && <p className="text-sm font-medium mb-1">{t.subject}</p>}
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{t.body}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmSend} variant="info" title={`Send ${label.toLowerCase()}?`} confirmLabel="Send"
        message={<>This will attempt delivery to <strong>{recipients.length}</strong> student(s) ({summary}).{!provider.configured && ' The provider is not configured, so external delivery will fail and be logged.'}</>}
        onCancel={() => setConfirmSend(false)} onConfirm={send} />

      <Modal isOpen={!!logFor} onClose={() => setLogFor(null)} title="Delivery log" size="lg">
        {logFor && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">{logFor.subject && <p className="font-semibold">{logFor.subject}</p>}<p className="whitespace-pre-wrap">{logFor.body}</p></div>
            <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto text-sm">
              {logs.map(l => <div key={l.id} className="px-3 py-2 flex flex-wrap justify-between gap-2"><span>{lk.nameOf(l.recipient_id)} <span className="text-xs text-text-secondary">{l.recipient_contact || '—'}</span></span><span className="flex items-center gap-2"><StatusBadge status={l.status} />{l.error_message && <span className="text-xs text-danger">{l.error_message}</span>}</span></div>)}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!tpl} onClose={() => setTpl(null)} title={tpl?.id ? 'Edit template' : 'New template'} size="md"
        footer={tpl && <><button className="btn-secondary" onClick={() => setTpl(null)}>Cancel</button><button className="btn-primary" onClick={async () => { const { id, ...rest } = tpl; if (await run(() => api.saveTemplate(rest, id), 'Template saved')) setTpl(null) }}>Save</button></>}>
        {tpl && (
          <div className="space-y-3">
            <Field label="Name" required><Input value={tpl.name} onChange={e => setTpl({ ...tpl, name: e.target.value })} /></Field>
            {channel === 'email' && <Field label="Subject"><Input value={tpl.subject ?? ''} onChange={e => setTpl({ ...tpl, subject: e.target.value })} /></Field>}
            <Field label="Body" required><Textarea value={tpl.body} onChange={e => setTpl({ ...tpl, body: e.target.value })} className="min-h-[140px]" /></Field>
            {channel === 'whatsapp' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tpl.approved} onChange={e => setTpl({ ...tpl, approved: e.target.checked })} />Approved in WhatsApp Business Manager</label>}
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={!!delTpl} title="Delete template?" message={delTpl?.name} confirmLabel="Delete" onCancel={() => setDelTpl(null)} onConfirm={async () => { if (delTpl) await run(() => api.deleteTemplate(delTpl.id), 'Template deleted'); setDelTpl(null) }} />
    </div>
  )
}
