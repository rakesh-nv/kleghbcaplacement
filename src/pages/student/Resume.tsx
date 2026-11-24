import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Trash2, FileText, Sparkles } from 'lucide-react'
import { useData } from '@/store/DataContext'
import { useToast } from '@/contexts/ToastContext'
import { useStudent } from '@/hooks/useStudent'
import { Banner, Card, KV, PageHeader } from '@/components/ui/primitives'
import { ResumeActions } from '@/components/ui/misc'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatBytes, formatDate } from '@/lib/utils'

export default function Resume() {
  const { api } = useData()
  const { run, toast } = useToast()
  const { resume, settings } = useStudent()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [del, setDel] = useState(false)
  const [replace, setReplace] = useState<File | null>(null)

  const validate = (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast({ type: 'error', title: 'Only PDF files are accepted' }); return false }
    if (f.size > settings.resume_max_mb * 1024 * 1024) { toast({ type: 'error', title: `File is larger than ${settings.resume_max_mb} MB`, message: formatBytes(f.size) }); return false }
    return true
  }
  const upload = async (f: File) => { setBusy(true); await run(() => api.uploadResume(f), resume ? 'Resume replaced' : 'Resume uploaded'); setBusy(false) }
  const pick = (f: File | undefined) => { if (!f || !validate(f)) return; if (resume) setReplace(f); else upload(f) }

  return (
    <div className="max-w-3xl">
      <PageHeader title="My Resume" description={`PDF only, up to ${settings.resume_max_mb} MB. Your resume is attached to every application you submit.`} />
      {resume && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><FileText className="w-6 h-6" /></div>
            <dl className="flex-1 grid sm:grid-cols-3 gap-3 min-w-0"><KV label="File">{resume.file_name}</KV><KV label="Size">{formatBytes(resume.file_size)}</KV><KV label="Uploaded">{formatDate(resume.created_at, 'long')}</KV></dl>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <ResumeActions resume={resume} />
            <button className="btn-outline btn-sm" onClick={() => nav('/student/analyzer')}><Sparkles className="w-3.5 h-3.5" />Analyse</button>
            <button className="btn-outline btn-sm text-danger" onClick={() => setDel(true)}><Trash2 className="w-3.5 h-3.5" />Delete</button>
          </div>
          {resume.file_url.startsWith('seed:') && <p className="text-xs text-text-secondary mt-3">This is a generated demo resume from fictional seed data. Upload your own PDF to replace it.</p>}
        </Card>
      )}
      <label onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]) }}
        className={`card border-2 border-dashed flex flex-col items-center justify-center text-center p-10 cursor-pointer transition ${drag ? 'border-primary bg-blue-50/50' : 'hover:border-primary/40'} ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
        <Upload className="w-8 h-8 text-primary mb-2" />
        <p className="font-medium">{busy ? 'Uploading…' : resume ? 'Drop a new PDF to replace your resume' : 'Drop your resume PDF here'}</p>
        <p className="text-sm text-text-secondary">or click to choose a file</p>
        <input type="file" accept="application/pdf,.pdf" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <div className="mt-4"><Banner>Demo storage: files stay in this browser. In production, resumes go to a private Supabase Storage bucket and are opened with short-lived signed URLs visible only to you and the placement cell.</Banner></div>
      <ConfirmDialog isOpen={del} title="Delete resume?" message="Applications already submitted keep their reference, but recruiters may not be able to open it. You can upload a new one anytime." confirmLabel="Delete" onCancel={() => setDel(false)} onConfirm={async () => { setDel(false); if (resume) await run(() => api.deleteResume(resume.id), 'Resume deleted') }} />
      <ConfirmDialog isOpen={!!replace} variant="warning" title="Replace resume?" message={`Your current resume will be replaced with "${replace?.name}".`} confirmLabel="Replace" onCancel={() => setReplace(null)} onConfirm={() => { const f = replace; setReplace(null); if (f) upload(f) }} />
    </div>
  )
}
