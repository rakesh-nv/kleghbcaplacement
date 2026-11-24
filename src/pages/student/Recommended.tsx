import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { useLookups } from '@/hooks/useLookups'
import { recommend, useStudent } from '@/hooks/useStudent'
import { Banner, Card, Chips, PageHeader } from '@/components/ui/primitives'
import { EmptyState } from '@/components/shared/EmptyState'
import { JobCard, JobDetailModal } from '@/components/JobDetail'

export default function Recommended() {
  const lk = useLookups()
  const s = useStudent()
  const [openId, setOpenId] = useState<string | null>(null)
  const { eligible, stretch } = recommend(s.jobViews, s.skills.map(k => k.skill_name), s.me.interests, s.me.cgpa, lk.rule)
  return (
    <div>
      <PageHeader title="Recommended Jobs" description="Open jobs you are eligible for, ranked by skill match, your interests and deadline." />
      {s.me.interests.length === 0 && <div className="mb-4"><Banner>Add career interests on <Link className="underline" to="/student/profile">My Profile</Link> to improve recommendations.</Banner></div>}
      <h2 className="font-semibold mb-3">You're eligible ({eligible.length})</h2>
      {eligible.length === 0 ? <div className="card mb-6"><EmptyState title="No eligible jobs you haven't applied to" description="New openings will appear here when the placement cell publishes them." /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">{eligible.map(r => <JobCard key={r.job.id} v={r} why={r.why} onOpen={() => setOpenId(r.job.id)} />)}</div>
      )}
      {stretch.length > 0 && <>
        <h2 className="font-semibold mb-1 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-600" />Suggestions — not eligible yet</h2>
        <p className="text-sm text-text-secondary mb-3">You meet every requirement except mandatory skills. These are <strong>not</strong> confirmed eligibility; learn the missing skills and update your profile to qualify before the deadline.</p>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{stretch.map(r => (
          <Card key={r.job.id} title={r.job.title} actions={<button className="btn-ghost btn-sm" onClick={() => setOpenId(r.job.id)}>Details</button>}>
            <p className="text-sm text-text-secondary">{lk.company.get(r.job.company_id)?.name}</p>
            <p className="text-xs font-medium mt-3 mb-1">Skills to learn</p><Chips items={r.e.missingSkills} tone="red" />
            <Link to="/student/learning" className="text-sm text-accent hover:underline inline-block mt-3">Find learning resources →</Link>
          </Card>
        ))}</div>
      </>}
      <JobDetailModal v={s.jobViews.find(v => v.job.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  )
}
