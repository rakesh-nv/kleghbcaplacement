import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Calculator } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { Avatar, Card, Chips, Field, Input, KV, PageHeader, Tabs } from '@/components/ui/primitives'
import { ResumeActions, roundLabel } from '@/components/ui/misc'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatBytes, formatDate, formatLPA, labelize } from '@/lib/utils'
import { computeCgpa } from '@/lib/academics'

export default function StudentDetail() {
  const { id } = useParams()
  const { db, api } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const nav = useNavigate()
  const [tab, setTab] = useState<'overview' | 'academics' | 'applications' | 'skills'>('overview')
  const p = id ? lk.profile.get(id) : undefined
  const [cgpa, setCgpa] = useState(String(p?.cgpa ?? ''))
  const [backlogs, setBacklogs] = useState(String(p?.backlogs ?? 0))
  useEffect(() => { setCgpa(String(p?.cgpa ?? '')); setBacklogs(String(p?.backlogs ?? 0)) }, [p?.id, p?.cgpa, p?.backlogs])
  if (!p || p.role !== 'student') return <EmptyState title="Student not found" description="The record may have been removed." action={{ label: 'Back to students', onClick: () => nav('/officer/students') }} />

  const academics = db.academics.filter(a => a.student_id === p.id).sort((a, b) => a.semester - b.semester)
  const skills = lk.skills.get(p.id) ?? []
  const certs = db.certifications.filter(c => c.student_id === p.id)
  const projects = db.projects.filter(x => x.student_id === p.id)
  const apps = db.applications.filter(a => a.student_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
  const results = db.results.filter(r => r.student_id === p.id)
  const interviews = db.interviews.filter(i => i.student_id === p.id).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
  const resume = lk.resume.get(p.id)
  const computed = computeCgpa(academics.filter(a => a.verified), db.settings.cgpa_method)

  return (
    <div>
      <Link to="/officer/students" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary mb-2"><ArrowLeft className="w-4 h-4" />Students</Link>
      <PageHeader title={p.full_name} description={`${p.usn} · ${p.degree} ${p.department} · Batch ${p.batch}`} actions={<StatusBadge status={p.placement_status} />} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'academics', label: 'Academics', count: academics.length }, { id: 'skills', label: 'Skills & projects', count: skills.length }, { id: 'applications', label: 'Applications', count: apps.length }]} />

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Profile" className="lg:col-span-2">
            <div className="flex items-start gap-4">
              <Avatar name={p.full_name} photo={p.profile_photo_url} size="lg" />
              <dl className="grid sm:grid-cols-3 gap-4 flex-1">
                <KV label="Email">{p.email}</KV><KV label="Phone">{p.phone}</KV><KV label="Semester">{p.semester}</KV>
                <KV label="CGPA">{p.cgpa ?? '—'}</KV><KV label="Backlogs">{p.backlogs ?? 0}</KV><KV label="Record">{p.is_active ? 'Active' : 'Inactive'}</KV>
                <div className="sm:col-span-3"><KV label="Career objective">{p.career_objective}</KV></div>
                <div className="sm:col-span-3"><KV label="Interests"><Chips items={p.interests} /></KV></div>
              </dl>
            </div>
          </Card>
          <Card title="Resume">
            {resume ? <div className="space-y-3"><p className="text-sm font-medium break-all">{resume.file_name}</p><p className="text-xs text-text-secondary">{formatBytes(resume.file_size)} · uploaded {formatDate(resume.created_at)}</p><ResumeActions resume={resume} />
              <button className="btn-outline btn-sm w-full" onClick={() => nav(`/officer/resume-analysis?student=${p.id}`)}>Analyse resume</button></div>
              : <p className="text-sm text-text-secondary">No resume uploaded yet.</p>}
          </Card>
          <Card title="Placement results" className="lg:col-span-2">
            {results.length === 0 ? <p className="text-sm text-text-secondary">No offers recorded.</p> : (
              <ul className="divide-y divide-border">{results.map(r => <li key={r.id} className="py-2 flex justify-between gap-3 text-sm"><span>{lk.jobTitle(r.job_id)}<span className="block text-xs text-text-secondary">{formatLPA(r.package_lpa)} · offer {formatDate(r.offer_date)}</span></span><StatusBadge status={r.status} /></li>)}</ul>
            )}
          </Card>
          <Card title="Interviews">
            {interviews.length === 0 ? <p className="text-sm text-text-secondary">None.</p> : (
              <ul className="space-y-2 text-sm">{interviews.slice(0, 6).map(i => <li key={i.id} className="flex justify-between gap-2"><span className="min-w-0 truncate">{lk.company.get(i.company_id)?.name} · {roundLabel(i.round)}</span><StatusBadge status={i.status} /></li>)}</ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'academics' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card title="Semester records" className="lg:col-span-2" bodyClassName="p-0">
            {academics.length === 0 ? <p className="p-5 text-sm text-text-secondary">No semester records.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-xs text-text-secondary uppercase"><th className="text-left px-4 py-2">Sem</th><th className="text-left px-4 py-2">SGPA</th><th className="text-left px-4 py-2">Credits</th><th className="text-left px-4 py-2">Backlogs</th><th className="text-left px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
                <tbody className="divide-y divide-border">{academics.map(a => (
                  <tr key={a.id}><td className="px-4 py-2">{a.semester}</td><td className="px-4 py-2 tabular-nums">{a.sgpa ?? '—'}</td><td className="px-4 py-2">{a.credits ?? '—'}</td><td className="px-4 py-2">{a.backlogs}</td><td className="px-4 py-2"><StatusBadge status={a.verified ? 'verified' : 'unverified'} /></td>
                    <td className="px-4 py-2 text-right"><button className="btn-outline btn-sm" onClick={() => run(() => api.verifyAcademic(a.id, !a.verified), a.verified ? 'Marked unverified' : 'Record verified')}><BadgeCheck className="w-3.5 h-3.5" />{a.verified ? 'Unverify' : 'Verify'}</button></td></tr>
                ))}</tbody>
              </table>
            )}
          </Card>
          <Card title="Official CGPA & backlogs">
            <p className="text-xs text-text-secondary mb-3">These values drive job eligibility. Students cannot edit them.</p>
            <div className="space-y-3">
              <Field label={`CGPA (out of ${db.settings.grading_scale})`}><Input type="number" step="0.01" value={cgpa} onChange={e => setCgpa(e.target.value)} /></Field>
              <Field label="Active backlogs"><Input type="number" value={backlogs} onChange={e => setBacklogs(e.target.value)} /></Field>
              {computed != null && <button className="btn-ghost btn-sm" onClick={() => { setCgpa(String(computed)); setBacklogs(String(academics.filter(a => a.verified).reduce((s, a) => s + a.backlogs, 0))) }}><Calculator className="w-3.5 h-3.5" />Use verified records: {computed} ({labelize(db.settings.cgpa_method)})</button>}
              <button className="btn-primary w-full" onClick={() => run(() => api.setOfficialAcademics(p.id, cgpa === '' ? null : Number(cgpa), Number(backlogs) || 0), 'Official academics updated')}>Save</button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'skills' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Skills">{skills.length === 0 ? <p className="text-sm text-text-secondary">No skills listed.</p> : <ul className="divide-y divide-border">{skills.map(s => <li key={s.id} className="py-1.5 flex justify-between text-sm"><span>{s.skill_name} <span className="text-xs text-text-secondary">· {labelize(s.category)}</span></span><span className="text-xs text-text-secondary">{labelize(s.proficiency)}</span></li>)}</ul>}</Card>
          <div className="space-y-4">
            <Card title="Certifications">{certs.length === 0 ? <p className="text-sm text-text-secondary">None.</p> : <ul className="space-y-1 text-sm">{certs.map(c => <li key={c.id}>{c.name} <span className="text-text-secondary">– {c.issuer}</span></li>)}</ul>}</Card>
            <Card title="Projects">{projects.length === 0 ? <p className="text-sm text-text-secondary">None.</p> : <ul className="space-y-2 text-sm">{projects.map(x => <li key={x.id}><p className="font-medium">{x.title}</p><p className="text-text-secondary text-xs">{x.description}</p><Chips items={x.tech} /></li>)}</ul>}</Card>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <Card bodyClassName="p-0">
          {apps.length === 0 ? <p className="p-5 text-sm text-text-secondary">No applications.</p> : (
            <ul className="divide-y divide-border">{apps.map(a => (
              <li key={a.id}><button className="w-full text-left px-5 py-3 hover:bg-slate-50 flex justify-between gap-3" onClick={() => nav(`/officer/applications?open=${a.id}`)}>
                <span><span className="block text-sm font-medium">{lk.jobTitle(a.job_id)}</span><span className="text-xs text-text-secondary">Applied {formatDate(a.created_at)}</span></span><StatusBadge status={a.status} />
              </button></li>
            ))}</ul>
          )}
        </Card>
      )}
    </div>
  )
}
