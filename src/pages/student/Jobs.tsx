import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useLookups } from '@/hooks/useLookups'
import { useStudent } from '@/hooks/useStudent'
import { FilterBar, PageHeader, SearchInput, Select } from '@/components/ui/primitives'
import { EmptyState } from '@/components/shared/EmptyState'
import { JobCard, JobDetailModal } from '@/components/JobDetail'

export default function Jobs() {
  const { db } = useData()
  const lk = useLookups()
  const s = useStudent()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState('')
  const [type, setType] = useState('')
  const [minPkg, setMinPkg] = useState('')
  const [deadline, setDeadline] = useState('')
  const [elig, setElig] = useState(params.get('eligible') ? 'eligible' : '')
  const [sort, setSort] = useState('deadline')
  const openId = params.get('open')

  const locations = [...new Set(s.jobViews.map(v => v.job.location).filter(Boolean))] as string[]
  const types = [...new Set(s.jobViews.map(v => v.job.job_type).filter(Boolean))] as string[]
  const rows = useMemo(() => s.jobViews.filter(v => {
    const t = q.toLowerCase()
    const company = lk.company.get(v.job.company_id)?.name ?? ''
    return (!t || [v.job.title, company, ...(v.job.required_skills ?? [])].some(x => x.toLowerCase().includes(t)))
      && (!loc || v.job.location === loc) && (!type || v.job.job_type === type)
      && (!minPkg || (v.job.salary_max ?? v.job.salary_min ?? 0) >= Number(minPkg))
      && (!deadline || (v.daysLeft != null && v.daysLeft <= Number(deadline)))
      && (!elig || (elig === 'eligible' ? v.e.eligible : elig === 'applied' ? !!v.applied : !v.e.eligible))
  }).sort((a, b) => sort === 'deadline' ? (a.daysLeft ?? 999) - (b.daysLeft ?? 999) : sort === 'package' ? (b.job.salary_max ?? 0) - (a.job.salary_max ?? 0) : b.e.skillMatch - a.e.skillMatch), [s.jobViews, lk, q, loc, type, minPkg, deadline, elig, sort])

  return (
    <div>
      <PageHeader title="Available Jobs" description={`${s.jobViews.length} published job(s) open for applications · ${s.jobViews.filter(v => v.e.eligible).length} you're eligible for`} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search role, company or skill" />
        <Select value={elig} onChange={e => setElig(e.target.value)} aria-label="Eligibility"><option value="">All jobs</option><option value="eligible">Eligible for me</option><option value="ineligible">Not eligible</option><option value="applied">Applied</option></Select>
        <Select value={loc} onChange={e => setLoc(e.target.value)} aria-label="Location"><option value="">Any location</option>{locations.map(l => <option key={l}>{l}</option>)}</Select>
        <Select value={type} onChange={e => setType(e.target.value)} aria-label="Job type"><option value="">Any type</option>{types.map(t => <option key={t}>{t}</option>)}</Select>
        {db.settings.show_salary_to_students && <Select value={minPkg} onChange={e => setMinPkg(e.target.value)} aria-label="Package"><option value="">Any package</option>{[3, 4, 5].map(n => <option key={n} value={n}>≥ ₹{n} LPA</option>)}</Select>}
        <Select value={deadline} onChange={e => setDeadline(e.target.value)} aria-label="Deadline"><option value="">Any deadline</option><option value="3">Closing in 3 days</option><option value="7">Closing in 7 days</option><option value="14">Closing in 14 days</option></Select>
        <Select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort"><option value="deadline">Sort: deadline</option><option value="match">Sort: skill match</option>{db.settings.show_salary_to_students && <option value="package">Sort: package</option>}</Select>
      </FilterBar>
      {rows.length === 0 ? <div className="card"><EmptyState title="No jobs match your filters" /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(v => <JobCard key={v.job.id} v={v} onOpen={() => setParams({ open: v.job.id })} />)}</div>
      )}
      <JobDetailModal v={s.jobViews.find(v => v.job.id === openId) ?? null} onClose={() => setParams({})} />
    </div>
  )
}
