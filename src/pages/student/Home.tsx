import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, FileText, Briefcase, ClipboardList, CalendarClock, Award, CheckCircle2, Circle, BookOpen } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useLookups } from '@/hooks/useLookups'
import { recommend, useStudent } from '@/hooks/useStudent'
import { Card, PageHeader, Progress, StatCard } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { JobCard, JobDetailModal } from '@/components/JobDetail'
import { roundLabel } from '@/components/ui/misc'
import { PLACEMENT_STATUS_LABEL } from '@/lib/placementStatus'
import { formatDate } from '@/lib/utils'
import { suggestPaths } from '@/lib/learning'

export default function StudentHome() {
  const { db } = useData()
  const lk = useLookups()
  const s = useStudent()
  const nav = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const recs = recommend(s.jobViews, s.skills.map(k => k.skill_name), s.me.interests, s.me.cgpa, lk.rule)
  const eligibleCount = s.jobViews.filter(v => v.e.eligible).length
  const upcoming = s.interviews.filter(i => ['scheduled', 'rescheduled'].includes(i.status) && new Date(i.scheduled_at) > new Date()).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  const latest = [...s.apps].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
  const notes = db.notifications.filter(n => n.recipient_id === s.me.id && n.type === 'in_app').slice(0, 4)
  const paths = suggestPaths(db, s.me.id).slice(0, 3)

  return (
    <div>
      <PageHeader title={`Welcome, ${s.me.full_name.split(' ')[0]}`} description={`${s.me.usn} · ${s.me.degree} ${s.me.department} · Batch ${s.me.batch}`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Profile complete" value={`${s.completion}%`} icon={CheckCircle2} tone={s.completion === 100 ? 'green' : 'amber'} onClick={() => nav('/student/profile')} />
        <StatCard label="CGPA" value={s.me.cgpa ?? '—'} hint={`${s.me.backlogs ?? 0} backlog(s) · Sem ${s.me.semester}`} icon={GraduationCap} onClick={() => nav('/student/academics')} />
        <StatCard label="Resume" value={s.resume ? 'Uploaded' : 'Missing'} hint={s.resume ? formatDate(s.resume.created_at) : 'Upload a PDF'} icon={FileText} tone={s.resume ? 'green' : 'red'} onClick={() => nav('/student/resume')} />
        <StatCard label="Eligible jobs" value={eligibleCount} hint={`${s.jobViews.length} open`} icon={Briefcase} tone="navy" onClick={() => nav('/student/jobs?eligible=1')} />
        <StatCard label="Applications" value={s.apps.length} icon={ClipboardList} onClick={() => nav('/student/applications')} />
        <StatCard label="Upcoming interviews" value={upcoming.length} hint={upcoming[0] ? formatDate(upcoming[0].scheduled_at) : undefined} icon={CalendarClock} tone="amber" onClick={() => nav('/student/interviews')} />
        <StatCard label="Latest status" value={latest ? <StatusBadge status={latest.status} className="text-sm" /> : '—'} hint={latest ? lk.job.get(latest.job_id)?.title : 'No applications yet'} icon={ClipboardList} tone="slate" onClick={() => nav('/student/applications')} />
        <StatCard label="Placement status" value={<span className="text-lg">{PLACEMENT_STATUS_LABEL[s.me.placement_status]}</span>} icon={Award} tone="green" onClick={() => nav('/student/placement')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Recommended for you" actions={<Link to="/student/recommended" className="text-sm text-accent hover:underline">See all</Link>}>
            {recs.eligible.length === 0 ? <p className="text-sm text-text-secondary">No new eligible jobs right now. Check <Link className="text-accent" to="/student/jobs">all available jobs</Link>.</p> : (
              <div className="grid sm:grid-cols-2 gap-3">{recs.eligible.slice(0, 4).map(r => <JobCard key={r.job.id} v={r} why={r.why.slice(0, 2)} onOpen={() => setOpenId(r.job.id)} />)}</div>
            )}
          </Card>
          <Card title="Upcoming interviews" actions={<Link to="/student/interviews" className="text-sm text-accent hover:underline">Schedule</Link>} bodyClassName="p-0">
            {upcoming.length === 0 ? <p className="p-5 text-sm text-text-secondary">No interviews scheduled.</p> : <ul className="divide-y divide-border">{upcoming.slice(0, 4).map(i => (
              <li key={i.id} className="px-5 py-3 flex justify-between gap-3 text-sm"><span><span className="font-medium block">{lk.company.get(i.company_id)?.name}</span><span className="text-xs text-text-secondary">{roundLabel(i.round)} · {i.meeting_link ? 'Online' : i.venue}</span></span><span className="text-right"><span className="block font-medium">{formatDate(i.scheduled_at)}</span><span className="text-xs text-text-secondary">{new Date(i.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>{i.status === 'rescheduled' && <StatusBadge status="rescheduled" className="ml-1" />}</span></li>
            ))}</ul>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Complete your profile">
            <Progress value={s.completion} tone={s.completion === 100 ? 'green' : 'navy'} className="mb-3" />
            <ul className="space-y-1.5 text-sm">{s.checks.map(c => <li key={c.label}><Link to={c.to} className="flex items-center gap-2 hover:text-primary">{c.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-text-muted" />}<span className={c.done ? 'text-text-secondary' : ''}>{c.label}</span></Link></li>)}</ul>
          </Card>
          <Card title="Recent notifications" actions={<Link to="/student/notifications" className="text-sm text-accent hover:underline">All</Link>} bodyClassName="p-0">
            {notes.length === 0 ? <p className="p-5 text-sm text-text-secondary">Nothing yet.</p> : <ul className="divide-y divide-border">{notes.map(n => <li key={n.id} className="px-5 py-2.5"><p className={`text-sm ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</p><p className="text-xs text-text-muted">{formatDate(n.created_at, 'relative')}</p></li>)}</ul>}
          </Card>
          <Card title="Suggested learning" actions={<Link to="/student/learning" className="text-sm text-accent hover:underline">Open</Link>}>
            {paths.length === 0 ? <p className="text-sm text-text-secondary">You're covering the skills open jobs ask for.</p> : <ul className="space-y-2 text-sm">{paths.map(p => <li key={p.path.id}><Link to={`/student/learning?path=${p.path.id}`} className="flex gap-2 hover:text-primary"><BookOpen className="w-4 h-4 mt-0.5 text-primary shrink-0" /><span>{p.path.title}<span className="block text-xs text-text-secondary">Covers {p.covers.join(', ')}</span></span></Link></li>)}</ul>}
          </Card>
        </div>
      </div>
      <JobDetailModal v={s.jobViews.find(v => v.job.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  )
}
