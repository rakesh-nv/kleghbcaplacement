import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useLookups } from '@/hooks/useLookups'
import { Card, Field, PageHeader, SearchInput, Select } from '@/components/ui/primitives'
import { ResumeActions } from '@/components/ui/misc'
import { Modal } from '@/components/shared/Modal'
import { AnalysisHistory, AnalysisResult, ResumeAnalysisPanel } from '@/components/ResumeAnalysisPanel'
import type { AnalysisOutput } from '@/lib/resumeAnalyzer'
import type { ResumeAnalysis as RA } from '@/types/models'

export default function ResumeAnalysis() {
  const { db } = useData()
  const lk = useLookups()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const studentId = params.get('student') ?? ''
  const [open, setOpen] = useState<RA | null>(null)

  const candidates = useMemo(() => {
    const s = q.toLowerCase()
    return lk.students.filter(p => p.is_active && (!s || p.full_name.toLowerCase().includes(s) || p.usn?.toLowerCase().includes(s)))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  }, [lk.students, q])
  const student = lk.profile.get(studentId)
  const jobs = db.jobs.filter(j => j.status !== 'archived')

  return (
    <div>
      <PageHeader title="Resume Analysis" description="Parse student resumes, compare them with job requirements and keep an analysis history." />
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
        <div className="space-y-4">
          <Card title="Select a student">
            <SearchInput value={q} onChange={setQ} placeholder="Name or USN" className="mb-3" />
            <Field label={`${candidates.length} students`}>
              <Select size={10} value={studentId} onChange={e => setParams({ student: e.target.value })} className="h-64">
                {candidates.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.usn}{lk.resume.has(p.id) ? '' : ' (no resume)'}</option>)}
              </Select>
            </Field>
          </Card>
          <Card title="Recent analyses (all students)">
            <AnalysisHistory items={db.analyses.slice(0, 15)} showStudent onOpen={setOpen} />
          </Card>
        </div>
        <div className="min-w-0">
          {student ? (
            <div className="space-y-4">
              <Card title={`${student.full_name} · ${student.usn}`} actions={<ResumeActions resume={lk.resume.get(student.id)} />}>
                <p className="text-sm text-text-secondary">{student.degree} {student.department} · Batch {student.batch} · CGPA {student.cgpa ?? '—'} · Listed skills: {(lk.skills.get(student.id) ?? []).map(s => s.skill_name).join(', ') || 'none'}</p>
              </Card>
              <ResumeAnalysisPanel key={student.id} studentId={student.id} jobs={jobs} allowUpload />
              <Card title="This student's analysis history"><AnalysisHistory items={db.analyses.filter(a => a.student_id === student.id)} onOpen={setOpen} /></Card>
            </div>
          ) : <Card><p className="text-sm text-text-secondary py-10 text-center">Select a student to view or analyse their resume.</p></Card>}
        </div>
      </div>
      <Modal isOpen={!!open} onClose={() => setOpen(null)} title={open ? `Analysis – ${lk.nameOf(open.student_id)}` : ''} size="full">
        {open && <AnalysisResult a={open.raw_analysis as unknown as AnalysisOutput} jobTitle={open.job_id ? lk.job.get(open.job_id)?.title : undefined} />}
      </Modal>
    </div>
  )
}
