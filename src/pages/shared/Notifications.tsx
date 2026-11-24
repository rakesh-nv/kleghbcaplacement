import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Trash2, Bell } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, Tabs } from '@/components/ui/primitives'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, cn } from '@/lib/utils'

export default function Notifications() {
  const { db, api, user } = useData()
  const { run } = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const mine = db.notifications.filter(n => n.recipient_id === user?.id && n.type === 'in_app')
  const list = tab === 'unread' ? mine.filter(n => !n.read_at) : mine
  return (
    <div className="max-w-3xl">
      <PageHeader title="Notifications" description="Updates about jobs, applications, interviews and results." actions={mine.some(n => !n.read_at) && <button className="btn-outline" onClick={() => run(() => api.markAllRead(), 'All marked as read')}><CheckCheck className="w-4 h-4" />Mark all read</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: mine.length }, { id: 'unread', label: 'Unread', count: mine.filter(n => !n.read_at).length }]} />
      {list.length === 0 ? <div className="card"><EmptyState icon={Bell} title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} /></div> : (
        <div className="card divide-y divide-border">
          {list.map(n => {
            const link = (n.metadata as { link?: string } | null)?.link
            return (
              <div key={n.id} className={cn('flex gap-3 px-4 py-3', !n.read_at && 'bg-blue-50/50')}>
                <span className={cn('w-2 h-2 rounded-full mt-2 shrink-0', n.read_at ? 'bg-transparent' : 'bg-accent')} />
                <button className="flex-1 text-left min-w-0" onClick={() => { api.markRead(n.id); if (link) nav(link) }}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-text-secondary mt-0.5">{n.message}</p>
                  <p className="text-xs text-text-muted mt-1">{formatDate(n.created_at, 'long')}</p>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.read_at && <button className="btn-ghost btn-sm" onClick={() => api.markRead(n.id)} aria-label="Mark read"><CheckCheck className="w-3.5 h-3.5" /></button>}
                  <button className="btn-ghost btn-sm" onClick={() => run(() => api.deleteNotification(n.id))} aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
