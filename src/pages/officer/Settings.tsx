import { useState } from 'react'
import { RotateCcw, Save, CheckCircle2, XCircle } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { Banner, Card, CheckboxGroup, Field, Input, PageHeader, Select, TagInput, Tabs } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ChangePassword } from '@/pages/shared/ChangePassword'
import { AI_ANALYSIS, INTEGRATIONS } from '@/lib/integrations'
import { isSupabaseConfigured } from '@/lib/supabase'
import { APPLICATION_STATUSES } from '@/lib/placementStatus'
import { formatDate, labelize } from '@/lib/utils'
import type { InstitutionSettings } from '@/types/models'

export default function OfficerSettings() {
  const { db, api, resetDemoData } = useData()
  const { run } = useToast()
  const lk = useLookups()
  const [tab, setTab] = useState<'institution' | 'policies' | 'integrations' | 'account' | 'audit'>('institution')
  const [s, setS] = useState<InstitutionSettings>(db.settings)
  const [reset, setReset] = useState(false)
  const dirty = JSON.stringify(s) !== JSON.stringify(db.settings)
  const set = <K extends keyof InstitutionSettings>(k: K, v: InstitutionSettings[K]) => setS({ ...s, [k]: v })
  const save = () => run(() => api.updateSettings(s), 'Settings saved')

  const integrations = [
    { name: 'Supabase (database, auth, storage)', ok: isSupabaseConfigured(), hint: 'Phase 2: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, run the migrations, then switch the service layer to Supabase. The app currently runs on local demo data.' },
    { name: 'Email provider', ok: INTEGRATIONS.email.configured, hint: INTEGRATIONS.email.setupHint },
    { name: 'WhatsApp Business provider', ok: INTEGRATIONS.whatsapp.configured, hint: INTEGRATIONS.whatsapp.setupHint },
    { name: 'AI resume analysis', ok: AI_ANALYSIS.configured, hint: AI_ANALYSIS.setupHint },
  ]

  return (
    <div>
      <PageHeader title="Settings" description="Institution configuration, placement policies and integrations." actions={['institution', 'policies'].includes(tab) && <button className="btn-primary" disabled={!dirty} onClick={save}><Save className="w-4 h-4" />Save changes</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'institution', label: 'Institution & grading' }, { id: 'policies', label: 'Placement policies' }, { id: 'integrations', label: 'Integrations' }, { id: 'account', label: 'Account' }, { id: 'audit', label: 'Audit log' }]} />

      {tab === 'institution' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Institution">
            <div className="space-y-3">
              <Field label="College name"><Input value={s.college_name} onChange={e => set('college_name', e.target.value)} /></Field>
              <Field label="Short name"><Input value={s.short_name} onChange={e => set('short_name', e.target.value)} /></Field>
              <Field label="Academic year"><Input value={s.academic_year} onChange={e => set('academic_year', e.target.value)} /></Field>
              <Field label="Departments"><TagInput value={s.departments} onChange={v => set('departments', v)} placeholder="Add department" /></Field>
              <Field label="Degrees"><TagInput value={s.degrees} onChange={v => set('degrees', v)} placeholder="Add degree" /></Field>
            </div>
          </Card>
          <Card title="Grading rules">
            <div className="space-y-3">
              <Field label="Grading scale (maximum CGPA)"><Input type="number" value={s.grading_scale} onChange={e => set('grading_scale', Number(e.target.value))} /></Field>
              <Field label="CGPA calculation method" hint="Used when computing CGPA from semester records">
                <Select value={s.cgpa_method} onChange={e => set('cgpa_method', e.target.value as InstitutionSettings['cgpa_method'])}>
                  <option value="credit_weighted">Credit-weighted average of SGPA (Σ SGPA×credits ÷ Σ credits)</option>
                  <option value="average_sgpa">Simple average of SGPA</option>
                </Select>
              </Field>
              <Banner>Official CGPA used for eligibility is set by officers on each student's Academics tab, optionally from verified semester records.</Banner>
            </div>
          </Card>
        </div>
      )}

      {tab === 'policies' && (
        <Card title="Application & placement policy">
          <div className="space-y-5 max-w-2xl">
            <Field label="Students may withdraw while the application is…"><CheckboxGroup options={APPLICATION_STATUSES.filter(x => x !== 'withdrawn')} value={s.withdrawable_statuses} onChange={v => set('withdrawable_statuses', v)} render={labelize} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.allow_reapply_after_withdraw} onChange={e => set('allow_reapply_after_withdraw', e.target.checked)} />Allow re-applying to a job after withdrawing</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.block_after_accepted_offer} onChange={e => set('block_after_accepted_offer', e.target.checked)} />One-offer policy: block new applications after a student accepts an offer</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.show_salary_to_students} onChange={e => set('show_salary_to_students', e.target.checked)} />Show package / offer details to students</label>
            <Field label="Maximum resume size (MB)"><Input type="number" min={1} max={20} value={s.resume_max_mb} onChange={e => set('resume_max_mb', Number(e.target.value))} className="w-32" /></Field>
          </div>
        </Card>
      )}

      {tab === 'integrations' && (
        <div className="space-y-3">
          <Banner tone="warning" title="Credentials never go in the frontend">Provider keys (email, WhatsApp, AI) and the Supabase service-role key must be stored as server-side secrets for Supabase Edge Functions. See README → Integrations.</Banner>
          {integrations.map(i => (
            <Card key={i.name}>
              <div className="flex items-start gap-3">
                {i.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-text-muted shrink-0" />}
                <div><p className="font-medium">{i.name} · <span className={i.ok ? 'text-emerald-700' : 'text-text-secondary'}>{i.ok ? 'Configured' : 'Not configured'}</span></p><p className="text-sm text-text-secondary mt-1">{i.hint}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'account' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <ChangePassword />
          <Card title="Demo data">
            <p className="text-sm text-text-secondary mb-3">Restore the original fictional seed data. All changes made in this browser (students, jobs, applications, uploaded files) will be lost.</p>
            <button className="btn-danger" onClick={() => setReset(true)}><RotateCcw className="w-4 h-4" />Reset demo data</button>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card bodyClassName="p-0">
          {db.auditLogs.length === 0 ? <p className="p-5 text-sm text-text-secondary">No actions recorded yet.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-text-secondary uppercase"><th className="text-left px-4 py-2">When</th><th className="text-left px-4 py-2">User</th><th className="text-left px-4 py-2">Action</th><th className="text-left px-4 py-2">Entity</th><th className="text-left px-4 py-2">Details</th></tr></thead>
              <tbody className="divide-y divide-border">{db.auditLogs.slice(0, 200).map(a => <tr key={a.id}><td className="px-4 py-2 whitespace-nowrap">{formatDate(a.created_at, 'long')}</td><td className="px-4 py-2">{lk.nameOf(a.user_id)}</td><td className="px-4 py-2">{labelize(a.action)}</td><td className="px-4 py-2">{labelize(a.entity_type)}</td><td className="px-4 py-2 text-xs text-text-secondary max-w-md truncate">{a.new_values ? JSON.stringify(a.new_values) : ''}</td></tr>)}</tbody>
            </table></div>
          )}
        </Card>
      )}

      <ConfirmDialog isOpen={reset} title="Reset all demo data?" message="This cannot be undone." confirmLabel="Reset" onCancel={() => setReset(false)} onConfirm={async () => { setReset(false); await resetDemoData(); setS(db.settings); window.location.reload() }} />
    </div>
  )
}
