import type { ApplicationStatus, DB, PlacementStatus } from '@/types/models'

export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ['applied', 'under_review', 'shortlisted', 'interview_scheduled']

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'offered', 'accepted', 'rejected', 'withdrawn',
]

/**
 * Placement status mapping (highest precedence first):
 *  1. Offer Accepted  – a placement result with status "accepted"
 *  2. Offer Received  – a placement result with status "pending"
 *  3. Selected        – an application marked "selected" or "offered" but no result recorded yet
 *  4. In Progress     – any application in applied / under review / shortlisted / interview scheduled
 *  5. Offer Declined  – every recorded offer was declined and nothing else is active
 *  6. Not Yet Placed  – none of the above
 */
export function derivePlacementStatus(db: DB, studentId: string): PlacementStatus {
  const results = db.results.filter(r => r.student_id === studentId)
  const apps = db.applications.filter(a => a.student_id === studentId)
  if (results.some(r => r.status === 'accepted')) return 'offer_accepted'
  if (results.some(r => r.status === 'pending')) return 'offer_received'
  if (apps.some(a => a.status === 'selected' || a.status === 'offered' || a.status === 'accepted')) return 'selected'
  if (apps.some(a => ACTIVE_APPLICATION_STATUSES.includes(a.status))) return 'in_progress'
  if (results.length && results.every(r => r.status === 'declined')) return 'offer_declined'
  return 'not_placed'
}

export const PLACEMENT_STATUS_LABEL: Record<PlacementStatus, string> = {
  not_placed: 'Not Yet Placed',
  in_progress: 'In Progress',
  selected: 'Selected',
  offer_received: 'Offer Received',
  offer_accepted: 'Offer Accepted',
  offer_declined: 'Offer Declined',
}

export const isPlaced = (s: PlacementStatus) => s === 'offer_accepted'
