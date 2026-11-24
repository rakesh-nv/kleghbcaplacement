import { useEffect, useState, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Search, X, Info, AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { getFile } from '@/lib/fileStore'

// ── Layout ──────────────────────────────────────────────────────────────────
const SEGMENT_LABELS: Record<string, string> = {
  officer: 'Officer', student: 'Student', 'resume-analysis': 'Resume Analysis', eligible: 'Eligible Students',
  drives: 'Placement Drives', interviews: 'Interviews', results: 'Placement Results', whatsapp: 'WhatsApp Notifications',
  email: 'Email Notifications', academics: 'Academic Details', skills: 'My Skills', resume: 'My Resume',
  analyzer: 'AI Resume Analyzer', recommended: 'Recommended Jobs', jobs: 'Jobs', applications: 'Applications',
  placement: 'Placement Status', learning: 'Skill Development', notifications: 'Notifications', settings: 'Settings',
  students: 'Students', companies: 'Companies', reports: 'Reports', profile: 'My Profile',
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-secondary mb-2 flex-wrap">
      <Link to={`/${parts[0]}`} className="hover:text-primary">Home</Link>
      {parts.slice(1).map((p, i) => {
        const to = '/' + parts.slice(0, i + 2).join('/')
        const label = SEGMENT_LABELS[p] ?? (p.length > 14 ? 'Details' : p)
        return (
          <span key={to} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {i === parts.length - 2 ? <span className="text-text-primary font-medium">{label}</span> : <Link to={to} className="hover:text-primary">{label}</Link>}
          </span>
        )
      })}
    </nav>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      <Breadcrumbs />
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function Card({ title, actions, children, className, bodyClassName }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('card', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-text-primary text-[15px]">{title}</h2>
          {actions}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function StatCard({ label, value, hint, icon: Icon, onClick, tone = 'navy' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; onClick?: () => void; tone?: 'navy' | 'green' | 'amber' | 'red' | 'slate' }) {
  const tones = { navy: 'bg-blue-50 text-primary', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', slate: 'bg-slate-100 text-slate-700' }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={cn('card p-4 text-left w-full', onClick && 'hover:shadow-md hover:border-primary/30 transition')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
        </div>
        <div className={cn('p-2.5 rounded-lg shrink-0', tones[tone])}><Icon className="w-5 h-5" /></div>
      </div>
    </Comp>
  )
}

// ── Form controls ────────────────────────────────────────────────────────────
export function Field({ label, error, hint, children, required, className }: { label: string; error?: string; hint?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
      {error ? <span className="block text-xs text-danger mt-1">{error}</span> : hint ? <span className="block text-xs text-text-secondary mt-1">{hint}</span> : null}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn('input-field', className)} {...p} />
})
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn('input-field min-h-[80px]', className)} {...p} />
})
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn('input-field pr-8', className)} {...p} />
})

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field pl-9 pr-8" aria-label={placeholder} />
      {value && <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary" aria-label="Clear search"><X className="w-3.5 h-3.5" /></button>}
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 mb-4 [&>*]:min-w-[140px] [&>*:first-child]:flex-1 [&>*:first-child]:min-w-[200px]">{children}</div>
}

/** Comma/Enter separated tag input. */
export function TagInput({ value, onChange, placeholder, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [text, setText] = useState('')
  const add = (raw: string) => {
    const items = raw.split(',').map(s => s.trim()).filter(Boolean)
    const next = [...value]
    for (const i of items) if (!next.some(v => v.toLowerCase() === i.toLowerCase())) next.push(i)
    onChange(next); setText('')
  }
  const listId = `tags-${placeholder?.replace(/\W/g, '')}`
  return (
    <div className="input-field flex flex-wrap gap-1.5 items-center min-h-[38px] py-1.5">
      {value.map(v => (
        <span key={v} className="chip">{v}<button type="button" onClick={() => onChange(value.filter(x => x !== v))} aria-label={`Remove ${v}`} className="hover:text-danger"><X className="w-3 h-3" /></button></span>
      ))}
      <input list={suggestions.length ? listId : undefined} value={text} onChange={e => setText(e.target.value)} placeholder={value.length ? '' : placeholder}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1)) }}
        onBlur={() => text && add(text)} className="flex-1 min-w-[100px] outline-none text-sm bg-transparent" />
      {suggestions.length > 0 && <datalist id={listId}>{suggestions.map(s => <option key={s} value={s} />)}</datalist>}
    </div>
  )
}

export function CheckboxGroup<T extends string | number>({ options, value, onChange, render }: { options: T[]; value: T[]; onChange: (v: T[]) => void; render?: (o: T) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = value.includes(o)
        return (
          <button type="button" key={String(o)} onClick={() => onChange(on ? value.filter(v => v !== o) : [...value, o])}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition', on ? 'bg-primary text-white border-primary' : 'bg-white border-border text-text-primary hover:bg-secondary')}
            aria-pressed={on}>
            {render ? render(o) : String(o)}
          </button>
        )
      })}
    </div>
  )
}

// ── Display ─────────────────────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto" role="tablist">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('px-3.5 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition', value === t.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary')}>
          {t.label}{t.count != null && <span className="ml-1.5 text-xs bg-secondary rounded-full px-1.5 py-0.5">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, className, tone = 'navy' }: { value: number; className?: string; tone?: 'navy' | 'green' | 'amber' }) {
  const c = { navy: 'bg-primary', green: 'bg-emerald-600', amber: 'bg-amber-500' }[tone]
  return (
    <div className={cn('h-2 bg-slate-100 rounded-full overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function useFileUrl(ref: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked: string | null = null, alive = true
    if (!ref) { setUrl(null); return }
    getFile(ref.split('#')[0]).then(b => { if (b && alive) { revoked = URL.createObjectURL(b); setUrl(revoked) } }).catch(() => undefined)
    return () => { alive = false; if (revoked) URL.revokeObjectURL(revoked) }
  }, [ref])
  return url
}

export function Avatar({ name, photo, size = 'md' }: { name: string; photo?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const url = useFileUrl(photo)
  const s = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-24 h-24 text-2xl' }[size]
  if (url) return <img src={url} alt={name} className={cn('rounded-full object-cover shrink-0', s)} />
  return <div className={cn('rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0', s)} aria-hidden>{getInitials(name)}</div>
}

export function Banner({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success'; title?: string; children: ReactNode }) {
  const map = { info: ['bg-blue-50 border-blue-200 text-blue-900', Info], warning: ['bg-amber-50 border-amber-200 text-amber-900', AlertTriangle], success: ['bg-emerald-50 border-emerald-200 text-emerald-900', CheckCircle2] } as const
  const [cls, Icon] = map[tone]
  return (
    <div className={cn('flex gap-3 p-3.5 rounded-lg border text-sm', cls)} role={tone === 'warning' ? 'alert' : undefined}>
      <Icon className="w-5 h-5 shrink-0 mt-px" />
      <div>{title && <p className="font-semibold">{title}</p>}<div className={title ? 'mt-0.5' : ''}>{children}</div></div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) { return <div className={cn('skeleton', className)} /> }

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
    </div>
  )
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm font-medium text-text-primary mt-0.5 break-words">{children ?? '—'}</dd>
    </div>
  )
}

export function Chips({ items, tone = 'default', empty = '—' }: { items: string[] | null | undefined; tone?: 'default' | 'green' | 'red'; empty?: string }) {
  if (!items?.length) return <span className="text-sm text-text-muted">{empty}</span>
  const c = { default: 'bg-secondary text-text-primary', green: 'bg-emerald-50 text-emerald-800', red: 'bg-red-50 text-red-800' }[tone]
  return <div className="flex flex-wrap gap-1.5">{items.map(i => <span key={i} className={cn('px-2 py-0.5 rounded-md text-xs font-medium', c)}>{i}</span>)}</div>
}
