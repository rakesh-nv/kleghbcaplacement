import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle, AlertTriangle, Info, Eye, Download } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useData } from '@/store/DataContext'
import { cn, downloadBlob, labelize, formatDate } from '@/lib/utils'
import { getResumeBlob, openBlob } from '@/lib/fileStore'
import type { ApplicationStatusHistory, StudentResume, UserRole } from '@/types/models'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageSkeleton } from './primitives'

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const icon = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info }
  const tone = { success: 'border-emerald-200 bg-emerald-50 text-emerald-900', error: 'border-red-200 bg-red-50 text-red-900', warning: 'border-amber-200 bg-amber-50 text-amber-900', info: 'border-blue-200 bg-blue-50 text-blue-900' }
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:w-96" aria-live="polite">
      {toasts.map(t => {
        const I = icon[t.type]
        return (
          <div key={t.id} className={cn('flex items-start gap-3 p-3.5 rounded-lg border shadow-lg', tone[t.type])} role={t.type === 'error' ? 'alert' : 'status'}>
            <I className="w-5 h-5 shrink-0 mt-px" />
            <div className="flex-1 min-w-0 text-sm"><p className="font-semibold">{t.title}</p>{t.message && <p className="mt-0.5 opacity-90 break-words">{t.message}</p>}</div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="p-0.5 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )
      })}
    </div>
  )
}

export function ProtectedRoute({ role, children }: { role: UserRole[]; children: ReactNode }) {
  const { user, ready } = useData()
  const loc = useLocation()
  if (!ready) return <div className="p-8"><PageSkeleton /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!role.includes(user.role)) return <Navigate to={user.role === 'student' ? '/student' : '/officer'} replace />
  return <>{children}</>
}

export interface CalendarEvent { id: string; date: string; title: string; subtitle?: string; tone?: 'navy' | 'amber' | 'red' | 'green' | 'slate'; onClick?: () => void }

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const days = useMemo(() => {
    const first = new Date(cursor)
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  }, [cursor])
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>()
    for (const e of events) { const k = key(new Date(e.date)); m.set(k, [...(m.get(k) ?? []), e]) }
    for (const list of m.values()) list.sort((a, b) => a.date.localeCompare(b.date))
    return m
  }, [events])
  const todayKey = key(new Date())
  const tone = { navy: 'bg-blue-100 text-blue-900', amber: 'bg-amber-100 text-amber-900', red: 'bg-red-100 text-red-800 line-through', green: 'bg-emerald-100 text-emerald-900', slate: 'bg-slate-100 text-slate-700' }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold">{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d) }}>Today</button>
          <button className="btn-ghost btn-sm" aria-label="Previous month" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
          <button className="btn-ghost btn-sm" aria-label="Next month" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-xs font-medium text-text-secondary bg-slate-50 border-b border-border">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="px-2 py-1.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map(d => {
          const list = byDay.get(key(d)) ?? []
          const other = d.getMonth() !== cursor.getMonth()
          return (
            <div key={d.toISOString()} className={cn('min-h-[88px] border-b border-r border-border p-1 text-xs', other && 'bg-slate-50/60 text-text-muted')}>
              <div className={cn('w-6 h-6 flex items-center justify-center rounded-full mb-0.5', key(d) === todayKey && 'bg-primary text-white font-semibold')}>{d.getDate()}</div>
              <div className="space-y-0.5">
                {list.slice(0, 3).map(e => (
                  <button key={e.id} onClick={e.onClick} title={`${e.title}${e.subtitle ? ' – ' + e.subtitle : ''}`} className={cn('block w-full text-left truncate rounded px-1 py-0.5', tone[e.tone ?? 'navy'])}>
                    <span className="hidden sm:inline">{new Date(e.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} </span>{e.title}
                  </button>
                ))}
                {list.length > 3 && <span className="block px-1 text-text-secondary">+{list.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function StatusTimeline({ history, nameOf }: { history: ApplicationStatusHistory[]; nameOf: (id: string) => string }) {
  const items = [...history].sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (!items.length) return <p className="text-sm text-text-secondary">No history yet.</p>
  return (
    <ol className="relative border-l-2 border-border ml-2 space-y-4">
      {items.map(h => (
        <li key={h.id} className="ml-4">
          <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.new_status} /><span className="text-xs text-text-secondary">{formatDate(h.created_at, 'long')}</span></div>
          <p className="text-xs text-text-secondary mt-1">by {nameOf(h.changed_by)}{h.notes ? ` — ${h.notes}` : ''}</p>
        </li>
      ))}
    </ol>
  )
}

export function ResumeActions({ resume, compact }: { resume: StudentResume | undefined | null; compact?: boolean }) {
  const { db } = useData()
  const { toast } = useToast()
  if (!resume) return <span className="text-xs text-text-muted">No resume</span>
  const get = async () => {
    const b = await getResumeBlob(db, resume)
    if (!b) { toast({ type: 'error', title: 'File unavailable', message: 'This resume file is not stored in this browser.' }); return null }
    return b
  }
  return (
    <div className="inline-flex gap-1">
      <button className="btn-outline btn-sm" onClick={async () => { const b = await get(); if (b) openBlob(b) }}><Eye className="w-3.5 h-3.5" />{!compact && 'View'}</button>
      <button className="btn-outline btn-sm" onClick={async () => { const b = await get(); if (b) downloadBlob(b, resume.file_name) }} aria-label="Download resume"><Download className="w-3.5 h-3.5" />{!compact && 'Download'}</button>
    </div>
  )
}

export function roundLabel(r: string) { return labelize(r).replace('Technical 1', 'Technical Round 1').replace('Technical 2', 'Technical Round 2') }
