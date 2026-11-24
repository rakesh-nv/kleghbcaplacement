import { cn } from '@/lib/utils'
import { PLACEMENT_STATUS_LABEL } from '@/lib/placementStatus'

const statusColors: Record<string, string> = {
  // Application statuses
  applied: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-purple-100 text-purple-800',
  interview_scheduled: 'bg-indigo-100 text-indigo-800',
  selected: 'bg-green-100 text-green-800',
  offered: 'bg-emerald-100 text-emerald-800',
  accepted: 'bg-green-200 text-green-900',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  // Placement statuses
  not_placed: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  offer_received: 'bg-emerald-100 text-emerald-800',
  offer_accepted: 'bg-green-200 text-green-900',
  offer_declined: 'bg-red-100 text-red-800',
  // Job statuses
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  archived: 'bg-gray-200 text-gray-600',
  // Drive statuses
  upcoming: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  // Interview statuses
  scheduled: 'bg-blue-100 text-blue-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
  // Result statuses
  pending: 'bg-yellow-100 text-yellow-800',
  declined: 'bg-red-100 text-red-800',
  // Notification statuses
  queued: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-gray-100 text-gray-600',
  // General
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  partially_failed: 'bg-orange-100 text-orange-800',
  eligible: 'bg-green-100 text-green-800',
  ineligible: 'bg-red-50 text-red-700',
  verified: 'bg-green-100 text-green-800',
  unverified: 'bg-amber-100 text-amber-800',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800'
  const label = (PLACEMENT_STATUS_LABEL as Record<string, string>)[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', color, className)}>
      {label}
    </span>
  )
}
