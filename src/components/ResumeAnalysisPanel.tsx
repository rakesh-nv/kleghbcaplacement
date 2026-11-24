import { useState } from 'react'
import { FileSearch, Upload, Info, Loader2 } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useLookups } from '@/hooks/useLookups'
import { Banner, Card, Chips, Field, Progress, Select } from '@/components/ui/primitives'
import { analyzeResume, extractPdfText, SCORE_WEIGHTS, type AnalysisOutput } from '@/lib/resumeAnalyzer'
import { getResumeBlob } from '@/lib/fileStore'
import { AI_ANALYSIS } from '@/lib/integrations'
import { formatDate } from '@/lib/utils'
import type { Job, ResumeAnalysis } from '@/types/models'

export function AnalysisResult({ a, jobTitle }: { a: AnalysisOutput; jobTitle?: string }) {
  const [showMethod, setShowMethod] = useState(false)
  const tone = a.completeness >= 75 ? 'green' : a.completeness >= 50 ? 'navy' : 'amber'
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Resume completeness">
          <p className="text-4xl font-bold tabular-nums">{a.completeness}<span className="text-lg text-text-secondary">/100</span></p>
          <Progress value={a.completeness} tone={tone} className="mt-3" />
          <button className="text-xs text-accent mt-3 inline-flex items-center gap-1 hover:underline" onClick={() => setShowMethod(s => !s)}><Info className="w-3.5 h-3.5" />How is this calculated?</button>
          {showMethod && (
            <table className="w-full text-xs mt-2">
              <tbody>{a.breakdown.map(b => <tr key={b.label} className="border-b border-border/60"><td className="py-1 pr-2">{b.label}</td><td className={`py-1 text-right tabular-nums ${b.earned ? 'text-emerald-700' : 'text-text-muted'}`}>{b.earned}/{b.points}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
        <Card title={jobTitle ? `Match: ${jobTitle}` : 'Job match'}>
          {a.jobMatch == null ? <p className="text-sm text-text-secondary">Select a job to compare required skills.</p> : <>
            <p className="text-4xl font-bold tabular-nums">{a.jobMatch}%</p>
            <p className="text-xs text-text-secondary mt-1">of the job's required skills appear in the resume</p>
            <div className="mt-3 space-y-2"><div><p className="text-xs font-medium mb-1">Matched</p><Chips items={a.matchedSkills} tone="green" empty="None" /></div><div><p className="text-xs font-medium mb-1">Missing</p><Chips items={a.missingSkills} tone="red" empty="None" /></div></div>
          </>}
        </Card>
        <Card title="Detected">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs text-text-secondary">Sections found</dt><dd><Chips items={a.sectionsFound} /></dd></div>
            <div><dt className="text-xs text-text-secondary">Missing sections</dt><dd><Chips items={a.missingSections} tone="red" empty="None — good" /></dd></div>
            <div><dt className="text-xs text-text-secondary">Words</dt><dd className="font-medium">{a.wordCount}</dd></div>
          </dl>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card title={`Skills detected (${a.skillsFound.length})`}><Chips items={a.skillsFound} empty="No known skills detected" /></Card>
        <Card title="Education lines detected">{a.education.length ? <ul className="text-sm space-y-1 list-disc pl-4">{a.education.map(l => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-text-secondary">None detected.</p>}</Card>
        <Card title="Projects">{a.projects.length ? <ul className="text-sm space-y-1 list-disc pl-4">{a.projects.map(l => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-text-secondary">None detected.</p>}</Card>
        <Card title="Internships / experience">{a.experience.length ? <ul className="text-sm space-y-1 list-disc pl-4">{a.experience.map(l => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-text-secondary">None detected.</p>}</Card>
        <Card title="Strengths">{a.strengths.length ? <ul className="text-sm space-y-1 list-disc pl-4">{a.strengths.map(l => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-text-secondary">No specific strengths detected by the rules.</p>}</Card>
        <Card title="Suggestions">{a.suggestions.length ? <ul className="text-sm space-y-1 list-disc pl-4">{a.suggestions.map(l => <li key={l}>{l}</li>)}</ul> : <p className="text-sm text-text-secondary">Nothing to suggest.</p>}</Card>
      </div>
      <Card title="Suggested keywords & learning topics"><Chips items={a.keywords} /></Card>
      <p className="text-xs text-text-secondary">This score measures how complete the resume looks to a simple rule-based reader. It does not predict selection and must not be used on its own to reject a candidate.</p>
    </div>
  )
}

export function ResumeAnalysisPanel({ studentId, jobs, allowUpload }: { studentId: string; jobs: Job[]; allowUpload?: boolean }) {
  const { db, api } = useData()
  const { toast } = useToast()
  const lk = useLookups()
  const [jobId, setJobId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ a: AnalysisOutput; job?: Job } | null>(null)
  const resume = lk.resume.get(studentId)

  const run = async (blob: Blob, ref: string) => {
    setBusy(true)
    try {
      const text = await extractPdfText(blob)
      if (text.trim().length < 30) throw new Error('Very little text could be read from this PDF. It may be a scanned image; OCR is not supported.')
      const job = jobs.find(j => j.id === jobId)
      const skills = job ? (lk.rule.get(job.id)?.required_skills ?? job.required_skills ?? []) : []
      const a = analyzeResume(text, skills)
      setResult({ a, job })
      await api.saveAnalysis({ student_id: studentId, resume_url: ref, analysis_type: 'rule_based', completeness_score: a.completeness, skills_found: a.skillsFound, education_found: a.education, experience_found: a.experience, projects_found: a.projects, strengths: a.strengths, weaknesses: a.missingSections, suggestions: a.suggestions, matched_skills: a.matchedSkills, missing_skills: a.missingSkills, job_id: job?.id ?? null, raw_analysis: a as unknown as ResumeAnalysis['raw_analysis'] })
    } catch (e) {
      toast({ type: 'error', title: 'Analysis failed', message: (e as Error).message })
    } finally { setBusy(false) }
  }

  const analyzeStored = async () => {
    if (!resume) return
    const b = await getResumeBlob(db, resume)
    if (!b) { toast({ type: 'error', title: 'Resume file not available in this browser' }); return }
    await run(b, resume.file_url)
  }

  return (
    <div className="space-y-4">
      <Banner tone="info" title="Rule-based analysis">{AI_ANALYSIS.configured ? 'AI analysis is configured.' : `AI analysis is not configured. ${AI_ANALYSIS.setupHint}`}</Banner>
      <Card>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <Field label="Compare with job (optional)" className="flex-1">
            <Select value={jobId} onChange={e => setJobId(e.target.value)}><option value="">No job comparison</option>{jobs.map(j => <option key={j.id} value={j.id}>{lk.jobTitle(j.id)}</option>)}</Select>
          </Field>
          <button className="btn-primary" disabled={!resume || busy} onClick={analyzeStored}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}Analyse {resume ? 'stored resume' : '(no resume on file)'}</button>
          {allowUpload && <label className={`btn-outline cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}><Upload className="w-4 h-4" />Analyse a PDF<input type="file" accept="application/pdf,.pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (!f.name.toLowerCase().endsWith('.pdf')) { toast({ type: 'error', title: 'Please choose a PDF' }); return } run(f, `upload:${f.name}`) }} /></label>}
        </div>
        {resume && <p className="text-xs text-text-secondary mt-2">On file: {resume.file_name} · {formatDate(resume.created_at)}</p>}
      </Card>
      {busy && <Card><div className="flex items-center gap-3 text-sm text-text-secondary"><Loader2 className="w-5 h-5 animate-spin" />Reading PDF and running checks…</div></Card>}
      {result && !busy && <AnalysisResult a={result.a} jobTitle={result.job?.title} />}
    </div>
  )
}

export function AnalysisHistory({ items, showStudent, onOpen }: { items: ResumeAnalysis[]; showStudent?: boolean; onOpen: (a: ResumeAnalysis) => void }) {
  const lk = useLookups()
  if (!items.length) return <p className="text-sm text-text-secondary">No analyses yet.</p>
  return (
    <ul className="divide-y divide-border">
      {items.map(a => (
        <li key={a.id}><button onClick={() => onOpen(a)} className="w-full text-left py-2.5 px-1 hover:bg-slate-50 flex justify-between gap-3 text-sm">
          <span className="min-w-0"><span className="block font-medium truncate">{showStudent ? lk.nameOf(a.student_id) : formatDate(a.created_at, 'long')}</span><span className="block text-xs text-text-secondary truncate">{a.job_id ? `vs ${lk.jobTitle(a.job_id)}` : 'General analysis'}{showStudent ? ` · ${formatDate(a.created_at, 'relative')}` : ''} · rule-based</span></span>
          <span className="font-semibold tabular-nums shrink-0">{a.completeness_score}/100</span>
        </button></li>
      ))}
    </ul>
  )
}
