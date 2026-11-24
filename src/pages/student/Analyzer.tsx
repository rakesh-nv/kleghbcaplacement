import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '@/store/DataContext'
import { useStudent } from '@/hooks/useStudent'
import { Banner, Card, PageHeader } from '@/components/ui/primitives'
import { Modal } from '@/components/shared/Modal'
import { AnalysisHistory, AnalysisResult, ResumeAnalysisPanel } from '@/components/ResumeAnalysisPanel'
import type { AnalysisOutput } from '@/lib/resumeAnalyzer'
import type { ResumeAnalysis } from '@/types/models'

export default function Analyzer() {
  const { db } = useData()
  const { me, resume, jobViews } = useStudent()
  const [open, setOpen] = useState<ResumeAnalysis | null>(null)
  return (
    <div>
      <PageHeader title="AI Resume Analyzer" description="Check how complete your resume is and how well it matches a job's required skills." />
      {!resume && <div className="mb-4"><Banner tone="warning">Upload your resume first on <Link to="/student/resume" className="underline font-medium">My Resume</Link>, or analyse any PDF directly below.</Banner></div>}
      <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
        <ResumeAnalysisPanel studentId={me.id} jobs={jobViews.map(v => v.job)} allowUpload />
        <div className="space-y-4">
          <Card title="How scoring works">
            <ul className="text-sm text-text-secondary space-y-1.5 list-disc pl-4">
              <li>The completeness score adds up fixed points for sections and details found in your PDF (open “How is this calculated?” for the full table).</li>
              <li>Job match = share of the job's required skills that appear in your resume.</li>
              <li>The analysis reads text only; scanned image PDFs cannot be read.</li>
              <li>Scores are guidance to improve your resume — they do not guarantee or decide selection.</li>
            </ul>
          </Card>
          <Card title="My analysis history"><AnalysisHistory items={db.analyses.filter(a => a.student_id === me.id)} onOpen={setOpen} /></Card>
        </div>
      </div>
      <Modal isOpen={!!open} onClose={() => setOpen(null)} title="Saved analysis" size="full">
        {open && <AnalysisResult a={open.raw_analysis as unknown as AnalysisOutput} jobTitle={open.job_id ? db.jobs.find(j => j.id === open.job_id)?.title : undefined} />}
      </Modal>
    </div>
  )
}
