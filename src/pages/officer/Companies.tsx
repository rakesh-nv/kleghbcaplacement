import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Power, ExternalLink, Briefcase } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Card, Field, FilterBar, Input, KV, PageHeader, SearchInput, Select, Textarea } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { companyStats } from '@/lib/stats'
import { formatDate, formatLPA } from '@/lib/utils'
import { optStr, url } from '@/lib/forms'
import type { Company } from '@/types/models'

const schema = z.object({
  name: z.string().trim().min(2, 'Company name is required'),
  website: url,
  industry: optStr,
  location: optStr,
  contact_person: optStr,
  contact_email: z.string().trim().refine(v => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email').transform(v => v || null),
  contact_phone: z.string().trim().refine(v => !v || /^\+?[\d\s-]{8,15}$/.test(v), 'Enter a valid phone').transform(v => v || null),
  description: optStr,
  eligibility_requirements: optStr,
})
type In = z.input<typeof schema>
type Out = z.output<typeof schema>

function CompanyForm({ initial, onDone }: { initial?: Company; onDone: () => void }) {
  const { api } = useData()
  const { run } = useToast()
  const { register, handleSubmit, formState: { errors } } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: initial ? Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ''])) as In : {},
  })
  return (
    <form id="company-form" className="grid sm:grid-cols-2 gap-4" noValidate onSubmit={handleSubmit(async v => { if (await run(() => api.saveCompany(v, initial?.id), initial ? 'Company updated' : 'Company added')) onDone() })}>
      <Field label="Company name" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} /></Field>
      <Field label="Website" error={errors.website?.message}><Input {...register('website')} placeholder="https://" /></Field>
      <Field label="Industry"><Input {...register('industry')} /></Field>
      <Field label="Location"><Input {...register('location')} /></Field>
      <Field label="Contact person"><Input {...register('contact_person')} /></Field>
      <Field label="Contact email" error={errors.contact_email?.message}><Input type="email" {...register('contact_email')} /></Field>
      <Field label="Contact phone" error={errors.contact_phone?.message}><Input {...register('contact_phone')} /></Field>
      <Field label="Description" className="sm:col-span-2"><Textarea {...register('description')} /></Field>
      <Field label="Eligibility requirements" className="sm:col-span-2" hint="General criteria shared by the company. Job-specific rules are set on each job opening."><Textarea {...register('eligibility_requirements')} /></Field>
    </form>
  )
}

export default function Companies() {
  const { db, api } = useData()
  const { run } = useToast()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [industry, setIndustry] = useState('')
  const [active, setActive] = useState('all')
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [toggle, setToggle] = useState<Company | null>(null)
  const openId = params.get('open')
  const viewing = db.companies.find(c => c.id === openId)

  const stats = useMemo(() => new Map(companyStats(db, {}).map(s => [s.id, s])), [db])
  const industries = [...new Set(db.companies.map(c => c.industry).filter(Boolean))] as string[]
  const rows = db.companies.filter(c => (!q || [c.name, c.industry, c.location].some(v => v?.toLowerCase().includes(q.toLowerCase()))) && (!industry || c.industry === industry) && (active === 'all' || (active === 'active') === c.is_active))

  const columns: Column<Company>[] = [
    { key: 'name', label: 'Company', sortValue: r => r.name, render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-text-secondary">{r.industry} · {r.location}</p></div> },
    { key: 'contact', label: 'Contact', render: r => <div className="text-xs"><p>{r.contact_person}</p><p className="text-text-secondary">{r.contact_email}</p></div> },
    { key: 'jobs', label: 'Jobs', sortValue: r => stats.get(r.id)?.jobs ?? 0, render: r => stats.get(r.id)?.jobs ?? 0 },
    { key: 'apps', label: 'Applications', sortValue: r => stats.get(r.id)?.applications ?? 0, render: r => stats.get(r.id)?.applications ?? 0 },
    { key: 'iv', label: 'Interviews', sortValue: r => stats.get(r.id)?.interviews ?? 0, render: r => stats.get(r.id)?.interviews ?? 0 },
    { key: 'offers', label: 'Offers', sortValue: r => stats.get(r.id)?.offers ?? 0, render: r => stats.get(r.id)?.offers ?? 0 },
    { key: 'placed', label: 'Placements', sortValue: r => stats.get(r.id)?.placements ?? 0, render: r => <span className="font-semibold">{stats.get(r.id)?.placements ?? 0}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
  ]

  const s = viewing ? stats.get(viewing.id) : undefined
  const companyJobs = viewing ? db.jobs.filter(j => j.company_id === viewing.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) : []
  const history = viewing ? db.results.filter(r => r.company_id === viewing.id) : []
  const byYear = history.reduce<Record<string, { offers: number; accepted: number }>>((acc, r) => { const y = (r.offer_date ?? r.created_at).slice(0, 4); acc[y] ??= { offers: 0, accepted: 0 }; acc[y].offers++; if (r.status === 'accepted') acc[y].accepted++; return acc }, {})

  return (
    <div>
      <PageHeader title="Companies" description={`${db.companies.filter(c => c.is_active).length} active recruiters`} actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Add company</button>} />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search company, industry, location" />
        <Select value={industry} onChange={e => setIndustry(e.target.value)} aria-label="Industry"><option value="">All industries</option>{industries.map(i => <option key={i}>{i}</option>)}</Select>
        <Select value={active} onChange={e => setActive(e.target.value)} aria-label="Status"><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></Select>
      </FilterBar>
      <DataTable rows={rows} columns={columns} rowKey={r => r.id} onRowClick={r => setParams({ open: r.id })} empty="No companies match."
        actions={r => <div className="inline-flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
          <button className="btn-ghost btn-sm" onClick={() => setToggle(r)} aria-label={r.is_active ? 'Deactivate' : 'Activate'}><Power className={`w-3.5 h-3.5 ${r.is_active ? 'text-danger' : 'text-emerald-600'}`} /></button>
        </div>} />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add company' : 'Edit company'} size="lg"
        footer={<><button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit" form="company-form">Save</button></>}>
        {editing && <CompanyForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>

      <Modal isOpen={!!viewing} onClose={() => setParams({})} title={viewing?.name ?? ''} size="xl"
        footer={viewing && <><button className="btn-outline" onClick={() => setEditing(viewing)}><Pencil className="w-4 h-4" />Edit</button><button className="btn-primary" onClick={() => nav(`/officer/jobs?company=${viewing.id}&new=1`)}><Briefcase className="w-4 h-4" />New job opening</button></>}>
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><StatusBadge status={viewing.is_active ? 'active' : 'inactive'} />{viewing.website && <a href={viewing.website} target="_blank" rel="noreferrer" className="text-sm text-accent inline-flex items-center gap-1 hover:underline">Website <ExternalLink className="w-3.5 h-3.5" /></a>}</div>
            <dl className="grid sm:grid-cols-3 gap-4">
              <KV label="Industry">{viewing.industry}</KV><KV label="Location">{viewing.location}</KV><KV label="Contact">{viewing.contact_person}</KV>
              <KV label="Email">{viewing.contact_email}</KV><KV label="Phone">{viewing.contact_phone}</KV><KV label="Added">{formatDate(viewing.created_at)}</KV>
            </dl>
            <KV label="Description">{viewing.description}</KV>
            <KV label="Eligibility requirements">{viewing.eligibility_requirements}</KV>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[['Jobs', s?.jobs], ['Applications', s?.applications], ['Interviews', s?.interviews], ['Offers', s?.offers], ['Placements', s?.placements]].map(([l, v]) => <div key={l as string} className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-text-secondary">{l}</p><p className="text-xl font-bold tabular-nums">{v ?? 0}</p></div>)}
            </div>
            <Card title="Job openings" bodyClassName="p-0">
              {companyJobs.length === 0 ? <p className="p-4 text-sm text-text-secondary">No jobs yet.</p> : <ul className="divide-y divide-border">{companyJobs.map(j => <li key={j.id}><button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex justify-between gap-2 text-sm" onClick={() => nav(`/officer/jobs?open=${j.id}`)}><span>{j.title}<span className="block text-xs text-text-secondary">{formatLPA(j.salary_min, j.salary_max)} · deadline {formatDate(j.application_deadline)}</span></span><StatusBadge status={j.status} /></button></li>)}</ul>}
            </Card>
            <Card title="Recruitment history">
              {Object.keys(byYear).length === 0 ? <p className="text-sm text-text-secondary">No offers recorded yet.</p> : (
                <table className="w-full text-sm"><thead><tr className="text-left text-xs text-text-secondary"><th className="py-1">Year</th><th className="py-1 text-right">Offers</th><th className="py-1 text-right">Accepted</th></tr></thead>
                  <tbody>{Object.entries(byYear).sort().reverse().map(([y, v]) => <tr key={y} className="border-t border-border"><td className="py-1.5">{y}</td><td className="py-1.5 text-right tabular-nums">{v.offers}</td><td className="py-1.5 text-right tabular-nums">{v.accepted}</td></tr>)}</tbody></table>
              )}
            </Card>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!toggle} title={toggle?.is_active ? 'Deactivate company?' : 'Reactivate company?'} variant={toggle?.is_active ? 'danger' : 'info'}
        message={toggle?.is_active ? 'Existing jobs stay as they are, but new jobs cannot be published for an inactive company.' : 'The company can be used for new job openings again.'}
        confirmLabel={toggle?.is_active ? 'Deactivate' : 'Activate'} onCancel={() => setToggle(null)}
        onConfirm={async () => { if (toggle) await run(() => api.setCompanyActive(toggle.id, !toggle.is_active), 'Company updated'); setToggle(null) }} />
    </div>
  )
}
