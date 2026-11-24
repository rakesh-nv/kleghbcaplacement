import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, List, MapPin, Video, BookOpen } from 'lucide-react'
import { useLookups } from '@/hooks/useLookups'
import { useStudent } from '@/hooks/useStudent'
import { Card, PageHeader, Tabs } from '@/components/ui/primitives'
import { CalendarView, roundLabel } from '@/components/ui/misc'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatTime } from '@/lib/utils'
import type { Interview } from '@/types/models'

const PREP: Record<string, string> = { aptitude: 'path_apt', group_discussion: 'path_comm', hr: 'path_int', coding: 'path_dsa', technical_1: 'path_dsa', technical_2: 'path_dsa', managerial: 'path_comm', final: 'path_int' }
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

export default function StudentInterviews() {
  const lk = useLookups()
  const { interviews } = useStudent()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const now = Date.now()
  const upcoming = interviews.filter(i => i.status !== 'completed' && (new Date(i.scheduled_at).getTime() >= now || i.status === 'cancelled' && new Date(i.scheduled_at).getTime() >= now)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  const past = interviews.filter(i => !upcoming.includes(i)).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
  const list = tab === 'upcoming' ? upcoming : past

  const item = (i: Interview) => (
    <Card key={i.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{lk.company.get(i.company_id)?.name}</p>
          <p className="text-sm text-text-secondary">{lk.job.get(i.job_id)?.title} · Round {i.round_number}: {roundLabel(i.round)}</p>
        </div>
        <StatusBadge status={i.status} />
      </div>
      <div className={`mt-3 grid sm:grid-cols-3 gap-3 text-sm ${i.status === 'cancelled' ? 'line-through text-text-muted' : ''}`}>
        <p><span className="block text-xs text-text-secondary">Date</span>{formatDate(i.scheduled_at)}</p>
        <p><span className="block text-xs text-text-secondary">Time ({tz})</span>{formatTime(i.scheduled_at)} · {i.duration_minutes} min</p>
        <p className="min-w-0"><span className="block text-xs text-text-secondary">Where</span>{i.meeting_link ? <a href={i.meeting_link} target="_blank" rel="noreferrer" className="text-accent inline-flex items-center gap-1 hover:underline"><Video className="w-4 h-4" />Join meeting</a> : <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{i.venue}</span>}</p>
      </div>
      {i.status === 'rescheduled' && <p className="text-xs text-amber-700 mt-2">This interview was rescheduled — the time above is the new time.</p>}
      {i.status === 'cancelled' && <p className="text-xs text-danger mt-2">Cancelled{i.cancel_reason ? `: ${i.cancel_reason}` : ''}</p>}
      {i.instructions && i.status !== 'cancelled' && <p className="text-sm mt-3 bg-slate-50 rounded-lg p-3"><span className="font-medium">Instructions: </span>{i.instructions}</p>}
      {tab === 'upcoming' && i.status !== 'cancelled' && <Link to={`/student/learning?path=${PREP[i.round] ?? 'path_int'}`} className="text-sm text-accent hover:underline inline-flex items-center gap-1 mt-3"><BookOpen className="w-4 h-4" />Prepare for this round</Link>}
      {tab === 'past' && i.status === 'completed' && <p className="text-xs text-text-secondary mt-2">{i.attended === false ? 'Marked absent' : 'Attended'}</p>}
    </Card>
  )

  return (
    <div className="max-w-5xl">
      <PageHeader title="Interview Schedule" description="Schedules are set by the placement cell. You'll be notified of any changes."
        actions={<div className="inline-flex rounded-lg border border-border bg-white p-0.5">
          <button className={`btn btn-sm ${view === 'list' ? 'bg-primary text-white' : 'text-text-secondary'}`} onClick={() => setView('list')}><List className="w-3.5 h-3.5" />List</button>
          <button className={`btn btn-sm ${view === 'calendar' ? 'bg-primary text-white' : 'text-text-secondary'}`} onClick={() => setView('calendar')}><CalendarDays className="w-3.5 h-3.5" />Calendar</button>
        </div>} />
      {view === 'calendar' ? <CalendarView events={interviews.map(i => ({ id: i.id, date: i.scheduled_at, title: lk.company.get(i.company_id)?.name ?? '', subtitle: roundLabel(i.round), tone: i.status === 'cancelled' ? 'red' : i.status === 'rescheduled' ? 'amber' : i.status === 'completed' ? 'slate' : 'navy' }))} /> : <>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'upcoming', label: 'Upcoming', count: upcoming.length }, { id: 'past', label: 'Previous', count: past.length }]} />
        {list.length === 0 ? <div className="card"><EmptyState title={tab === 'upcoming' ? 'No upcoming interviews' : 'No previous interviews'} /></div> : <div className="space-y-3">{list.map(item)}</div>}
      </>}
    </div>
  )
}
