import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { useStudent } from '@/hooks/useStudent'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FilterBar, KV, PageHeader, SearchInput, Select } from '@/components/ui/primitives'
import { StatusTimeline, roundLabel } from '@/components/ui/misc'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { APPLICATION_STATUSES } from '@/lib/placementStatus'
import { formatDate, labelize } from '@/lib/utils'
import type { Application } from '@/types/models'

export default function MyApplications() {
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const s = useStudent()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [withdraw, setWithdraw] = useState<Application | null>(null)
  const canWithdraw = (a: Application) => s.settings.withdrawable_statuses.includes(a.status)
  const nextInterview = (a: Application) => s.interviews.filter(i => i.application_id === a.id && ['scheduled', 'rescheduled'].includes(i.status)).sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at))[0]

  const rows = s.apps.filter(a => (!status || a.status === status) && (!q || lk.jobTitle(a.job_id).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const columns: Column<Application>[] = [
    { key: 'company', label: 'Company', sortValue: r => lk.company.get(lk.job.get(r.job_id)?.company_id ?? '')?.name, render: r => <span className="font-medium">{lk.company.get(lk.job.get(r.job_id)?.company_id ?? '')?.name}</span> },
    { key: 'role', label: 'Role', sortValue: r => lk.job.get(r.job_id)?.title, render: r => lk.job.get(r.job_id)?.title },
    { key: 'date', label: 'Applied', sortValue: r => r.created_at, render: r => formatDate(r.created_at) },
    { key: 'status', label: 'Status', sortValue: r => APPLICATION_STATUSES.indexOf(r.status), render: r => <StatusBadge status={r.status} /> },
    { key: 'iv', label: 'Next interview', render: r => { const i = nextInterview(r); return i ? <span className="text-xs">{formatDate(i.scheduled_at, 'long')}<br /><span className="text-text-secondary">{roundLabel(i.round)}</span></span> : <span className="text-text-muted text-xs">—</span> } },
    { key: 'upd', label: 'Last update', sortValue: r => r.updated_at, render: r => formatDate(r.updated_at, 'relative') },
  ]
  const open = s.apps.find(a => a.id === openId)

  return (
    <div>
      <PageHeader title="My Applications" description={`${s.apps.length} application(s)`} />
      {s.apps.length === 0 ? <div className="card"><EmptyState title="No applications yet" description="Browse jobs you're eligible for and apply." action={{ label: 'Browse jobs', onClick: () => nav('/student/jobs?eligible=1') }} /></div> : <>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search company or role" />
          <Select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{APPLICATION_STATUSES.map(x => <option key={x} value={x}>{labelize(x)}</option>)}</Select>
        </FilterBar>
        <DataTable rows={rows} columns={columns} rowKey={r => r.id} onRowClick={r => setOpenId(r.id)} empty="No applications match."
          actions={r => canWithdraw(r) ? <button className="btn-ghost btn-sm text-danger" onClick={() => setWithdraw(r)}>Withdraw</button> : <button className="btn-ghost btn-sm" onClick={() => setOpenId(r.id)}>Timeline</button>} />
      </>}
      <Modal isOpen={!!open} onClose={() => setOpenId(null)} title={open ? lk.jobTitle(open.job_id) : ''} size="lg"
        footer={open && canWithdraw(open) && <button className="btn-outline text-danger" onClick={() => setWithdraw(open)}>Withdraw application</button>}>
        {open && (
          <div className="grid sm:grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3"><KV label="Status"><StatusBadge status={open.status} /></KV><KV label="Applied">{formatDate(open.created_at, 'long')}</KV></dl>
              {open.cover_letter && <KV label="Your note">{open.cover_letter}</KV>}
              <div><p className="text-xs text-text-secondary mb-1">Interviews</p>
                {s.interviews.filter(i => i.application_id === open.id).length === 0 ? <p className="text-sm text-text-muted">None scheduled.</p> : <ul className="space-y-1 text-sm">{s.interviews.filter(i => i.application_id === open.id).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(i => <li key={i.id} className="flex justify-between gap-2"><span>{roundLabel(i.round)} · {formatDate(i.scheduled_at, 'long')}</span><StatusBadge status={i.status} /></li>)}</ul>}
              </div>
              {!canWithdraw(open) && open.status !== 'withdrawn' && <p className="text-xs text-text-secondary">Withdrawal is closed at this stage per placement policy.</p>}
            </div>
            <div><p className="text-sm font-semibold mb-3">Timeline</p><StatusTimeline history={db.statusHistory.filter(h => h.application_id === open.id)} nameOf={id => id === s.me.id ? 'You' : 'Placement cell'} /></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={!!withdraw} title="Withdraw application?" message={`You are withdrawing from ${withdraw ? lk.jobTitle(withdraw.job_id) : ''}.${s.settings.allow_reapply_after_withdraw ? '' : ' You will not be able to apply to this job again.'}`} confirmLabel="Withdraw"
        onCancel={() => setWithdraw(null)} onConfirm={async () => { if (withdraw) await run(() => api.withdrawApplication(withdraw.id), 'Application withdrawn'); setWithdraw(null) }} />
    </div>
  )
}
