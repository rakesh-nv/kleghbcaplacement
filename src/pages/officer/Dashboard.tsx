import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, UserCheck, Building, Briefcase, ClipboardList, Trophy, UserX, Percent } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useLookups, useUniqueValues } from '@/hooks/useLookups'
import { Card, PageHeader, Select, StatCard } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HBar, TrendLine, VBar } from '@/components/charts'
import { batchTrend, companyStats, computeStats, departmentStats, monthlyPlacements, statusDistribution } from '@/lib/stats'
import { formatDate } from '@/lib/utils'
import { roundLabel } from '@/components/ui/misc'

export default function OfficerDashboard() {
  const { db } = useData()
  const lk = useLookups()
  const nav = useNavigate()
  const { batches, departments } = useUniqueValues()
  const [batch, setBatch] = useState<number | null>(batches[0] ?? null)
  const [dept, setDept] = useState('')
  const f = { batch, department: dept || null }

  const s = useMemo(() => computeStats(db, f), [db, batch, dept]) // eslint-disable-line react-hooks/exhaustive-deps
  const monthly = useMemo(() => monthlyPlacements(db, f), [db, batch, dept]) // eslint-disable-line react-hooks/exhaustive-deps
  const depts = useMemo(() => departmentStats(db, f), [db, batch, dept]) // eslint-disable-line react-hooks/exhaustive-deps
  const comps = useMemo(() => companyStats(db, f).filter(c => c.offers > 0).sort((a, b) => b.placements - a.placements).slice(0, 8), [db, batch, dept]) // eslint-disable-line react-hooks/exhaustive-deps
  const dist = useMemo(() => statusDistribution(db, f), [db, batch, dept]) // eslint-disable-line react-hooks/exhaustive-deps
  const trend = useMemo(() => batchTrend(db, { department: dept || null }), [db, dept])

  const recentApps = [...s.apps].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
  const upcoming = db.interviews.filter(i => ['scheduled', 'rescheduled'].includes(i.status) && new Date(i.scheduled_at) > new Date()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).slice(0, 6)
  const drives = db.drives.filter(d => d.status === 'upcoming').sort((a, b) => a.drive_date.localeCompare(b.drive_date)).slice(0, 4)
  const activity = db.auditLogs.slice(0, 8)

  return (
    <div>
      <PageHeader title="Placement Dashboard" description={`Live figures computed from current records · ${db.settings.academic_year}`}
        actions={<>
          <Select value={batch ?? ''} onChange={e => setBatch(e.target.value ? Number(e.target.value) : null)} aria-label="Batch filter" className="w-auto">
            <option value="">All batches</option>{batches.map(b => <option key={b} value={b}>Batch {b}</option>)}
          </Select>
          <Select value={dept} onChange={e => setDept(e.target.value)} aria-label="Department filter" className="w-auto">
            <option value="">All departments</option>{departments.map(d => <option key={d}>{d}</option>)}
          </Select>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Registered students" value={s.totalStudents} icon={Users} onClick={() => nav('/officer/students')} />
        <StatCard label="Eligible for placement" value={s.eligibleStudents} hint="Eligible for ≥ 1 job" icon={UserCheck} tone="green" onClick={() => nav('/officer/eligible')} />
        <StatCard label="Companies" value={s.totalCompanies} hint={`${s.activeCompanies} active`} icon={Building} tone="slate" onClick={() => nav('/officer/companies')} />
        <StatCard label="Active job openings" value={s.activeJobs} hint="Published & before deadline" icon={Briefcase} tone="amber" onClick={() => nav('/officer/jobs')} />
        <StatCard label="Applications" value={s.totalApplications} icon={ClipboardList} onClick={() => nav('/officer/applications')} />
        <StatCard label="Students placed" value={s.placed} hint="Accepted offers" icon={Trophy} tone="green" onClick={() => nav('/officer/results')} />
        <StatCard label="Not yet placed" value={s.notPlaced} icon={UserX} tone="red" onClick={() => nav('/officer/students?status=not_placed')} />
        <StatCard label="Placement rate" value={`${s.placementPct}%`} hint="Placed ÷ registered" icon={Percent} tone="navy" onClick={() => nav('/officer/reports')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <TrendLine title="Monthly placement progress (last 12 months)" rows={monthly} series={[{ key: 'offers', label: 'Offers made' }, { key: 'accepted', label: 'Offers accepted' }]} />
        <VBar title="Department-wise placement" rows={depts} series={[{ key: 'placed', label: 'Placed' }, { key: 'notPlaced', label: 'Not placed' }]} />
        <HBar title="Company-wise recruitment (placements)" rows={comps} series={[{ key: 'placements', label: 'Placements' }]} />
        <HBar title="Application status distribution" rows={dist} series={[{ key: 'count', label: 'Applications' }]} />
      </div>
      <div className="mb-6"><VBar title="Year-wise placement trend (placement % by batch)" rows={trend} series={[{ key: 'pct', label: 'Placement %' }]} unit="%" /></div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Recent applications" actions={<Link to="/officer/applications" className="text-sm text-accent hover:underline">View all</Link>} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {recentApps.length === 0 && <li className="p-5 text-sm text-text-secondary">No applications yet.</li>}
            {recentApps.map(a => (
              <li key={a.id}><button onClick={() => nav(`/officer/applications?open=${a.id}`)} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block text-sm font-medium truncate">{lk.nameOf(a.student_id)}</span><span className="block text-xs text-text-secondary truncate">{lk.jobTitle(a.job_id)} · {formatDate(a.created_at, 'relative')}</span></span>
                <StatusBadge status={a.status} />
              </button></li>
            ))}
          </ul>
        </Card>
        <Card title="Upcoming interviews" actions={<Link to="/officer/interviews" className="text-sm text-accent hover:underline">Manage</Link>} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {upcoming.length === 0 && <li className="p-5 text-sm text-text-secondary">No upcoming interviews.</li>}
            {upcoming.map(i => (
              <li key={i.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block text-sm font-medium truncate">{lk.nameOf(i.student_id)}</span><span className="block text-xs text-text-secondary truncate">{lk.company.get(i.company_id)?.name} · {roundLabel(i.round)}</span></span>
                <span className="text-xs text-right shrink-0"><span className="block font-medium">{formatDate(i.scheduled_at)}</span><span className="text-text-secondary">{new Date(i.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Upcoming placement drives" actions={<Link to="/officer/drives" className="text-sm text-accent hover:underline">All drives</Link>} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {drives.length === 0 && <li className="p-5 text-sm text-text-secondary">No upcoming drives.</li>}
            {drives.map(d => (
              <li key={d.id}><button onClick={() => nav(`/officer/drives?open=${d.id}`)} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block text-sm font-medium truncate">{d.title}</span><span className="block text-xs text-text-secondary">{db.driveRegistrations.filter(r => r.drive_id === d.id).length} registered · {d.mode.replace('_', '-')}</span></span>
                <span className="text-xs font-medium shrink-0">{formatDate(d.drive_date)}</span>
              </button></li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {activity.length === 0 && <li className="p-5 text-sm text-text-secondary">Actions you take (creating jobs, updating statuses, sending messages) will appear here.</li>}
            {activity.map(a => (
              <li key={a.id} className="px-5 py-2.5 text-sm flex justify-between gap-3">
                <span className="min-w-0 truncate"><span className="font-medium">{lk.nameOf(a.user_id)}</span> <span className="text-text-secondary">{a.action.replace(/_/g, ' ')} {a.entity_type.replace(/_/g, ' ')}</span></span>
                <span className="text-xs text-text-muted shrink-0">{formatDate(a.created_at, 'relative')}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
