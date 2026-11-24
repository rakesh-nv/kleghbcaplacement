import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileSearch, Building, Briefcase, UserCheck, ClipboardList, CalendarDays, CalendarClock, Trophy,
  MessageCircle, Mail, ChartColumn, Settings, Home, User, GraduationCap, Wrench, FileText, Sparkles, Star, BookOpen,
  Award, Bell, Menu, X, LogOut, PanelLeftClose, PanelLeft, Search, ChevronDown, type LucideIcon,
} from 'lucide-react'
import { useData } from '@/store/DataContext'
import { cn, formatDate } from '@/lib/utils'
import { Avatar, PageSkeleton } from '@/components/ui/primitives'
import { isJobOpen } from '@/lib/eligibility'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

export const OFFICER_NAV: NavItem[] = [
  { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/officer/students', label: 'Students', icon: Users },
  { to: '/officer/resume-analysis', label: 'Resume Analysis', icon: FileSearch },
  { to: '/officer/companies', label: 'Companies', icon: Building },
  { to: '/officer/jobs', label: 'Job Openings', icon: Briefcase },
  { to: '/officer/eligible', label: 'Eligible Students', icon: UserCheck },
  { to: '/officer/applications', label: 'Applications', icon: ClipboardList },
  { to: '/officer/drives', label: 'Placement Drives', icon: CalendarDays },
  { to: '/officer/interviews', label: 'Interview Management', icon: CalendarClock },
  { to: '/officer/results', label: 'Placement Results', icon: Trophy },
  { to: '/officer/whatsapp', label: 'WhatsApp Notifications', icon: MessageCircle },
  { to: '/officer/email', label: 'Email Notifications', icon: Mail },
  { to: '/officer/reports', label: 'Reports', icon: ChartColumn },
  { to: '/officer/settings', label: 'Settings', icon: Settings },
]

export const STUDENT_NAV: NavItem[] = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/profile', label: 'My Profile', icon: User },
  { to: '/student/academics', label: 'Academic Details', icon: GraduationCap },
  { to: '/student/skills', label: 'My Skills', icon: Wrench },
  { to: '/student/resume', label: 'My Resume', icon: FileText },
  { to: '/student/analyzer', label: 'AI Resume Analyzer', icon: Sparkles },
  { to: '/student/recommended', label: 'Recommended Jobs', icon: Star },
  { to: '/student/jobs', label: 'Available Jobs', icon: Briefcase },
  { to: '/student/applications', label: 'My Applications', icon: ClipboardList },
  { to: '/student/interviews', label: 'Interview Schedule', icon: CalendarClock },
  { to: '/student/placement', label: 'Placement Status', icon: Award },
  { to: '/student/learning', label: 'Skill Development', icon: BookOpen },
  { to: '/student/notifications', label: 'Notifications', icon: Bell },
  { to: '/student/settings', label: 'Settings', icon: Settings },
]

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, onOut])
}

function GlobalSearch({ officer }: { officer: boolean }) {
  const { db } = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const out: Array<{ id: string; label: string; sub: string; to: string; kind: string }> = []
    if (officer) {
      db.profiles.filter(p => p.role === 'student' && [p.full_name, p.usn, p.email].some(v => v?.toLowerCase().includes(s))).slice(0, 5)
        .forEach(p => out.push({ id: p.id, label: p.full_name, sub: `${p.usn} · ${p.department}`, to: `/officer/students/${p.id}`, kind: 'Student' }))
      db.companies.filter(c => c.name.toLowerCase().includes(s)).slice(0, 3)
        .forEach(c => out.push({ id: c.id, label: c.name, sub: c.industry ?? '', to: `/officer/companies?open=${c.id}`, kind: 'Company' }))
    }
    db.jobs.filter(j => (officer || isJobOpen(j)) && j.title.toLowerCase().includes(s)).slice(0, 4)
      .forEach(j => out.push({ id: j.id, label: j.title, sub: db.companies.find(c => c.id === j.company_id)?.name ?? '', to: officer ? `/officer/jobs?open=${j.id}` : `/student/jobs?open=${j.id}`, kind: 'Job' }))
    return out
  }, [q, db, officer])
  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={officer ? 'Search students, companies, jobs…' : 'Search jobs…'} className="input-field pl-9 bg-slate-50" aria-label="Global search" />
      {open && q.trim().length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 card shadow-lg z-40 max-h-96 overflow-y-auto py-1">
          {results.length === 0 ? <p className="px-4 py-3 text-sm text-text-secondary">No matches for “{q}”</p> : results.map(r => (
            <button key={r.kind + r.id} onClick={() => { nav(r.to); setOpen(false); setQ('') }} className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center justify-between gap-2">
              <span className="min-w-0"><span className="block text-sm font-medium truncate">{r.label}</span><span className="block text-xs text-text-secondary truncate">{r.sub}</span></span>
              <span className="text-[10px] uppercase tracking-wide text-text-muted shrink-0">{r.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationBell({ base }: { base: string }) {
  const { db, user, api } = useData()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  const mine = db.notifications.filter(n => n.recipient_id === user?.id && n.type === 'in_app')
  const unread = mine.filter(n => !n.read_at).length
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-secondary text-text-secondary" aria-label={`Notifications, ${unread} unread`}>
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(22rem,calc(100vw-2rem))] card shadow-lg z-40">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="font-semibold text-sm">Notifications</p>
            {unread > 0 && <button className="text-xs text-accent hover:underline" onClick={() => api.markAllRead()}>Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {mine.length === 0 ? <p className="px-4 py-6 text-sm text-center text-text-secondary">You're all caught up.</p> : mine.slice(0, 8).map(n => (
              <button key={n.id} onClick={() => { api.markRead(n.id); const link = (n.metadata as { link?: string } | null)?.link; if (link) nav(link); setOpen(false) }} className={cn('w-full text-left px-4 py-2.5 hover:bg-secondary', !n.read_at && 'bg-blue-50/60')}>
                <p className="text-sm font-medium flex items-center gap-2">{!n.read_at && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}{n.title}</p>
                <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{n.message}</p>
                <p className="text-[11px] text-text-muted mt-1">{formatDate(n.created_at, 'relative')}</p>
              </button>
            ))}
          </div>
          <button onClick={() => { nav(`${base}/notifications`); setOpen(false) }} className="w-full text-center text-sm text-accent py-2 border-t border-border hover:bg-secondary">View all</button>
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ base }: { base: string }) {
  const { user, logout } = useData()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))
  if (!user) return null
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-secondary" aria-haspopup="menu" aria-expanded={open}>
        <Avatar name={user.full_name} photo={user.profile_photo_url} size="sm" />
        <span className="hidden md:block text-left"><span className="block text-sm font-medium leading-tight max-w-40 truncate">{user.full_name}</span><span className="block text-xs text-text-secondary leading-tight">{user.role === 'student' ? user.usn : 'Placement Officer'}</span></span>
        <ChevronDown className="w-4 h-4 text-text-secondary hidden md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 card shadow-lg z-40 py-1" role="menu">
          {user.role === 'student' && <button role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2" onClick={() => { nav('/student/profile'); setOpen(false) }}><User className="w-4 h-4" />My profile</button>}
          <button role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-secondary flex items-center gap-2" onClick={() => { nav(`${base}/settings`); setOpen(false) }}><Settings className="w-4 h-4" />Settings</button>
          <button role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-secondary text-danger flex items-center gap-2" onClick={() => { logout(); nav('/login') }}><LogOut className="w-4 h-4" />Sign out</button>
        </div>
      )}
    </div>
  )
}

export function AppShell({ variant }: { variant: 'officer' | 'student' }) {
  const { db, ready } = useData()
  const items = variant === 'officer' ? OFFICER_NAV : STUDENT_NAV
  const base = `/${variant}`
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('kle-sidebar') === '1' } catch { return false } })
  const [mobile, setMobile] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMobile(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => { try { localStorage.setItem('kle-sidebar', collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])

  const sidebar = (isMobile: boolean) => (
    <nav className="flex flex-col h-full" aria-label="Main navigation">
      <div className={cn('flex items-center gap-2.5 h-16 px-4 border-b border-white/10 shrink-0', collapsed && !isMobile && 'justify-center px-2')}>
        <div className="w-9 h-9 rounded-lg bg-white text-primary font-bold flex items-center justify-center text-sm shrink-0">KLE</div>
        {(!collapsed || isMobile) && <div className="min-w-0"><p className="text-white font-semibold text-sm leading-tight truncate">{db.settings.short_name}</p><p className="text-blue-200/80 text-xs">{variant === 'officer' ? 'Placement Cell' : 'Student Portal'}</p></div>}
        {isMobile && <button onClick={() => setMobile(false)} className="ml-auto p-1 text-white/80" aria-label="Close menu"><X className="w-5 h-5" /></button>}
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} title={collapsed && !isMobile ? it.label : undefined}
            className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition', isActive ? 'bg-sidebar-active text-white font-medium' : 'text-blue-100/80 hover:bg-sidebar-hover hover:text-white', collapsed && !isMobile && 'justify-center px-2')}>
            <it.icon className="w-[18px] h-[18px] shrink-0" />
            {(!collapsed || isMobile) && <span className="truncate">{it.label}</span>}
          </NavLink>
        ))}
      </div>
      {!isMobile && (
        <button onClick={() => setCollapsed(c => !c)} className="flex items-center gap-2 px-4 py-3 text-xs text-blue-200/80 hover:text-white border-t border-white/10" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeft className="w-4 h-4 mx-auto" /> : <><PanelLeftClose className="w-4 h-4" />Collapse</>}
        </button>
      )}
    </nav>
  )

  return (
    <div className="min-h-screen flex">
      <aside className={cn('hidden lg:block fixed inset-y-0 left-0 bg-sidebar-bg z-30 transition-[width]', collapsed ? 'w-[68px]' : 'w-64')}>{sidebar(false)}</aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar-bg">{sidebar(true)}</aside>
        </div>
      )}
      <div className={cn('flex-1 min-w-0 flex flex-col', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-border flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobile(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0 hidden sm:block"><GlobalSearch officer={variant === 'officer'} /></div>
          <div className="flex-1 sm:hidden font-semibold text-primary truncate">{db.settings.short_name}</div>
          <NotificationBell base={base} />
          <ProfileMenu base={base} />
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-[1500px] w-full mx-auto">{ready ? <Outlet /> : <PageSkeleton />}</main>
        <footer className="px-6 py-3 text-xs text-text-muted border-t border-border bg-white">Demo build · all records are fictional seed data stored in this browser. {db.settings.college_name}</footer>
      </div>
    </div>
  )
}
