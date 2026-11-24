import { useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useStudent } from '@/hooks/useStudent'
import { Card, Chips, Field, Input, PageHeader, Select, TagInput, Textarea } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SKILL_DICTIONARY } from '@/lib/resumeAnalyzer'
import { formatDate, labelize } from '@/lib/utils'
import type { ProficiencyLevel, SkillCategory, StudentSkill } from '@/types/models'

const CATS: Array<{ id: SkillCategory; label: string }> = [
  { id: 'programming', label: 'Programming' }, { id: 'framework', label: 'Frameworks' }, { id: 'database', label: 'Databases' },
  { id: 'tool', label: 'Tools' }, { id: 'soft_skill', label: 'Communication & soft skills' }, { id: 'other', label: 'Other' },
]
const LEVELS: ProficiencyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']
const LEVEL_W: Record<ProficiencyLevel, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 }
const ALL = Object.values(SKILL_DICTIONARY).flat()

export default function Skills() {
  const { db, api } = useData()
  const { run } = useToast()
  const { me, skills, certs, projects } = useStudent()
  const [skill, setSkill] = useState<{ id?: string; skill_name: string; category: SkillCategory; proficiency: ProficiencyLevel } | null>(null)
  const [cert, setCert] = useState<{ name: string; issuer: string; issue_date: string; credential_url: string } | null>(null)
  const [proj, setProj] = useState<{ title: string; description: string; url: string; tech: string[] } | null>(null)
  const [del, setDel] = useState<{ kind: 'skill' | 'cert' | 'project'; id: string; name: string } | null>(null)
  const history = db.skillHistory.filter(h => h.student_id === me.id).slice(0, 15)

  const doDelete = async () => {
    if (!del) return
    await run(() => del.kind === 'skill' ? api.removeSkill(del.id) : del.kind === 'cert' ? api.removeCertification(del.id) : api.removeProject(del.id), 'Removed')
    setDel(null)
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title="My Skills" description="Skills drive job matching and learning recommendations. List only skills you can discuss in an interview."
        actions={<button className="btn-primary" onClick={() => setSkill({ skill_name: '', category: 'programming', proficiency: 'intermediate' })}><Plus className="w-4 h-4" />Add skill</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 content-start">
          {CATS.map(c => {
            const list = skills.filter(s => s.category === c.id)
            return (
              <Card key={c.id} title={c.label}>
                {list.length === 0 ? <p className="text-sm text-text-muted">None added.</p> : <ul className="space-y-3">{list.map((s: StudentSkill) => (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-sm"><span className="font-medium">{s.skill_name}</span>
                      <span className="flex items-center gap-1"><span className="text-xs text-text-secondary">{labelize(s.proficiency)}</span>
                        <button className="btn-ghost btn-sm p-1!" aria-label={`Edit ${s.skill_name}`} onClick={() => setSkill({ id: s.id, skill_name: s.skill_name, category: s.category, proficiency: s.proficiency })}><Pencil className="w-3.5 h-3.5" /></button>
                        <button className="btn-ghost btn-sm p-1!" aria-label={`Remove ${s.skill_name}`} onClick={() => setDel({ kind: 'skill', id: s.id, name: s.skill_name })}><Trash2 className="w-3.5 h-3.5 text-danger" /></button></span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-full bg-primary rounded-full" style={{ width: `${LEVEL_W[s.proficiency]}%` }} /></div>
                  </li>
                ))}</ul>}
              </Card>
            )
          })}
        </div>
        <div className="space-y-4">
          <Card title="Certifications" actions={<button className="btn-ghost btn-sm" onClick={() => setCert({ name: '', issuer: '', issue_date: '', credential_url: '' })}><Plus className="w-3.5 h-3.5" />Add</button>}>
            {certs.length === 0 ? <p className="text-sm text-text-muted">None added.</p> : <ul className="space-y-2">{certs.map(c => <li key={c.id} className="flex justify-between gap-2 text-sm"><span><span className="font-medium">{c.name}</span><span className="block text-xs text-text-secondary">{c.issuer}{c.issue_date && ` · ${formatDate(c.issue_date)}`}</span>{c.credential_url && <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-xs text-accent inline-flex items-center gap-1">Credential <ExternalLink className="w-3 h-3" /></a>}</span><button className="btn-ghost btn-sm" aria-label="Remove" onClick={() => setDel({ kind: 'cert', id: c.id, name: c.name })}><Trash2 className="w-3.5 h-3.5 text-danger" /></button></li>)}</ul>}
          </Card>
          <Card title="Projects" actions={<button className="btn-ghost btn-sm" onClick={() => setProj({ title: '', description: '', url: '', tech: [] })}><Plus className="w-3.5 h-3.5" />Add</button>}>
            {projects.length === 0 ? <p className="text-sm text-text-muted">None added.</p> : <ul className="space-y-3">{projects.map(p => <li key={p.id} className="text-sm"><div className="flex justify-between gap-2"><span className="font-medium">{p.title}</span><button className="btn-ghost btn-sm" aria-label="Remove" onClick={() => setDel({ kind: 'project', id: p.id, name: p.title })}><Trash2 className="w-3.5 h-3.5 text-danger" /></button></div><p className="text-xs text-text-secondary">{p.description}</p>{p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-accent inline-flex items-center gap-1">Link <ExternalLink className="w-3 h-3" /></a>}<div className="mt-1"><Chips items={p.tech} /></div></li>)}</ul>}
          </Card>
          <Card title="Skill progress over time">
            {history.length === 0 ? <p className="text-sm text-text-muted">Changes you make will be tracked here.</p> : <ul className="space-y-1.5 text-xs">{history.map(h => <li key={h.id} className="flex justify-between gap-2"><span><span className={h.action === 'removed' ? 'text-danger' : h.action === 'added' ? 'text-emerald-700' : 'text-primary'}>{labelize(h.action)}</span> {h.skill_name}{h.action !== 'removed' && ` (${h.proficiency})`}</span><span className="text-text-muted">{formatDate(h.created_at)}</span></li>)}</ul>}
          </Card>
        </div>
      </div>

      <Modal isOpen={!!skill} onClose={() => setSkill(null)} title={skill?.id ? 'Edit skill' : 'Add skill'} size="sm"
        footer={skill && <><button className="btn-secondary" onClick={() => setSkill(null)}>Cancel</button><button className="btn-primary" disabled={!skill.skill_name.trim()} onClick={async () => { const { id, ...rest } = skill; if (await run(() => api.saveSkill(rest, id), 'Skill saved')) setSkill(null) }}>Save</button></>}>
        {skill && <div className="space-y-3">
          <Field label="Skill" required><Input list="skill-list" value={skill.skill_name} onChange={e => setSkill({ ...skill, skill_name: e.target.value })} autoFocus /><datalist id="skill-list">{ALL.map(s => <option key={s} value={s} />)}</datalist></Field>
          <Field label="Category"><Select value={skill.category} onChange={e => setSkill({ ...skill, category: e.target.value as SkillCategory })}>{CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
          <Field label="Proficiency"><Select value={skill.proficiency} onChange={e => setSkill({ ...skill, proficiency: e.target.value as ProficiencyLevel })}>{LEVELS.map(l => <option key={l} value={l}>{labelize(l)}</option>)}</Select></Field>
        </div>}
      </Modal>
      <Modal isOpen={!!cert} onClose={() => setCert(null)} title="Add certification" size="sm"
        footer={cert && <><button className="btn-secondary" onClick={() => setCert(null)}>Cancel</button><button className="btn-primary" onClick={async () => { if (cert.credential_url && !/^https?:\/\//.test(cert.credential_url)) { run(async () => { throw new Error('Credential URL must start with http(s)://') }); return } if (await run(() => api.addCertification({ name: cert.name, issuer: cert.issuer, issue_date: cert.issue_date || null, expiry_date: null, credential_url: cert.credential_url || null }), 'Certification added')) setCert(null) }}>Save</button></>}>
        {cert && <div className="space-y-3">
          <Field label="Certificate name" required><Input value={cert.name} onChange={e => setCert({ ...cert, name: e.target.value })} /></Field>
          <Field label="Issued by" required><Input value={cert.issuer} onChange={e => setCert({ ...cert, issuer: e.target.value })} /></Field>
          <Field label="Issue date"><Input type="date" value={cert.issue_date} onChange={e => setCert({ ...cert, issue_date: e.target.value })} /></Field>
          <Field label="Credential URL"><Input value={cert.credential_url} onChange={e => setCert({ ...cert, credential_url: e.target.value })} placeholder="https://" /></Field>
        </div>}
      </Modal>
      <Modal isOpen={!!proj} onClose={() => setProj(null)} title="Add project" size="md"
        footer={proj && <><button className="btn-secondary" onClick={() => setProj(null)}>Cancel</button><button className="btn-primary" onClick={async () => { if (proj.url && !/^https?:\/\//.test(proj.url)) { run(async () => { throw new Error('Project link must start with http(s)://') }); return } if (await run(() => api.addProject({ title: proj.title, description: proj.description || null, url: proj.url || null, tech: proj.tech }), 'Project added')) setProj(null) }}>Save</button></>}>
        {proj && <div className="space-y-3">
          <Field label="Title" required><Input value={proj.title} onChange={e => setProj({ ...proj, title: e.target.value })} /></Field>
          <Field label="What did you build and what was the outcome?"><Textarea value={proj.description} onChange={e => setProj({ ...proj, description: e.target.value })} /></Field>
          <Field label="Link (GitHub, demo)"><Input value={proj.url} onChange={e => setProj({ ...proj, url: e.target.value })} placeholder="https://" /></Field>
          <Field label="Technologies"><TagInput value={proj.tech} onChange={t => setProj({ ...proj, tech: t })} placeholder="e.g. React" suggestions={ALL} /></Field>
        </div>}
      </Modal>
      <ConfirmDialog isOpen={!!del} title="Remove?" message={`"${del?.name}" will be removed.`} confirmLabel="Remove" onCancel={() => setDel(null)} onConfirm={doDelete} />
    </div>
  )
}
