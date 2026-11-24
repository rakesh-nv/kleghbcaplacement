import { useLookups } from '@/hooks/useLookups'
import { useStudent } from '@/hooks/useStudent'
import { Banner, Card, KV, PageHeader } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PLACEMENT_STATUS_LABEL } from '@/lib/placementStatus'
import { formatDate, cn } from '@/lib/utils'
import type { PlacementStatus } from '@/types/models'

const STEPS: Array<{ id: PlacementStatus; desc: string }> = [
  { id: 'not_placed', desc: 'No active applications or offers.' },
  { id: 'in_progress', desc: 'At least one application is applied, under review, shortlisted or has an interview scheduled.' },
  { id: 'selected', desc: 'A company has selected you; the offer is being recorded.' },
  { id: 'offer_received', desc: 'An offer is recorded and awaiting your decision.' },
  { id: 'offer_accepted', desc: 'You accepted an offer. You are counted as placed.' },
  { id: 'offer_declined', desc: 'All recorded offers were declined and nothing else is active.' },
]

export default function Placement() {
  const lk = useLookups()
  const { me, results, apps, settings } = useStudent()
  const active = apps.filter(a => ['applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'offered'].includes(a.status))
  return (
    <div className="max-w-4xl">
      <PageHeader title="Placement Status" description="Calculated automatically from your applications and the offers recorded by the placement cell." />
      <Card className="mb-4">
        <p className="text-xs text-text-secondary uppercase tracking-wide">Current status</p>
        <p className="text-2xl font-bold mt-1">{PLACEMENT_STATUS_LABEL[me.placement_status]}</p>
        <p className="text-sm text-text-secondary mt-1">{STEPS.find(s => s.id === me.placement_status)?.desc}</p>
      </Card>
      <Card title="Offers" className="mb-4">
        {results.length === 0 ? <p className="text-sm text-text-secondary">No offers recorded yet.</p> : (
          <ul className="divide-y divide-border">{results.map(r => (
            <li key={r.id} className="py-3 grid sm:grid-cols-4 gap-3 items-center">
              <div className="sm:col-span-2"><p className="font-medium">{lk.company.get(r.company_id)?.name}</p><p className="text-sm text-text-secondary">{lk.job.get(r.job_id)?.title}</p></div>
              {settings.show_salary_to_students ? <dl className="grid grid-cols-2 gap-2"><KV label="Package">{r.package_lpa != null ? `₹${r.package_lpa} LPA` : '—'}</KV><KV label="Offer date">{formatDate(r.offer_date)}</KV>{r.joining_date && <KV label="Joining">{formatDate(r.joining_date)}</KV>}</dl> : <p className="text-xs text-text-secondary">Offer details are shared by the placement cell directly.</p>}
              <div className="sm:text-right"><StatusBadge status={r.status} /></div>
            </li>
          ))}</ul>
        )}
        {results.some(r => r.status === 'pending') && <div className="mt-3"><Banner>To accept or decline an offer, inform the placement cell; they record your decision.</Banner></div>}
      </Card>
      <Card title={`Active applications (${active.length})`} className="mb-4">
        {active.length === 0 ? <p className="text-sm text-text-secondary">None.</p> : <ul className="space-y-2">{active.map(a => <li key={a.id} className="flex justify-between gap-3 text-sm"><span>{lk.jobTitle(a.job_id)}</span><StatusBadge status={a.status} /></li>)}</ul>}
      </Card>
      <Card title="How your status is determined">
        <ol className="space-y-2">{STEPS.map(s => <li key={s.id} className={cn('flex gap-3 text-sm p-2 rounded-lg', me.placement_status === s.id && 'bg-blue-50')}><span className="w-32 shrink-0 font-medium">{PLACEMENT_STATUS_LABEL[s.id]}</span><span className="text-text-secondary">{s.desc}</span></li>)}</ol>
        <p className="text-xs text-text-secondary mt-3">When more than one applies, the status highest in this order wins: Offer Accepted → Offer Received → Selected → In Progress → Offer Declined → Not Yet Placed.</p>
      </Card>
    </div>
  )
}
