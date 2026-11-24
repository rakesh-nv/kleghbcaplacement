// Local stand-in for Supabase Storage while the app runs on demo data.
// Files live in this browser's IndexedDB; references look like "idb:<key>".
// In the database phase these become private bucket paths served through signed URLs.
import type { DB, StudentResume } from '@/types/models'

const DB_NAME = 'kleghbc-files'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putFile(key: string, blob: Blob): Promise<string> {
  await tx('readwrite', s => s.put(blob, key))
  return `idb:${key}`
}

export async function getFile(ref: string): Promise<Blob | null> {
  if (!ref.startsWith('idb:')) return null
  return (await tx<Blob | undefined>('readonly', s => s.get(ref.slice(4)))) ?? null
}

export async function deleteFile(ref: string): Promise<void> {
  if (!ref.startsWith('idb:')) return
  await tx('readwrite', s => s.delete(ref.slice(4)))
}

export async function clearFiles(): Promise<void> {
  await tx('readwrite', s => s.clear())
}

/** Seeded (fictional) resumes have no uploaded file; generate a PDF from the demo profile on demand. */
async function generateSeedResume(db: DB, resume: StudentResume): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const p = db.profiles.find(x => x.id === resume.student_id)
  const skills = db.skills.filter(s => s.student_id === resume.student_id).map(s => s.skill_name)
  const projects = db.projects.filter(x => x.student_id === resume.student_id)
  const certs = db.certifications.filter(c => c.student_id === resume.student_id)
  const doc = new jsPDF()
  let y = 18
  const line = (text: string, size = 10, bold = false, gap = 6) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size)
    for (const l of doc.splitTextToSize(text, 180)) { doc.text(l, 15, y); y += gap }
  }
  line(p?.full_name ?? 'Student', 18, true, 9)
  line(`${p?.email ?? ''} | ${p?.phone ?? ''}`, 10)
  line('FICTIONAL DEMO RESUME - generated from seed data', 8)
  y += 3
  line('CAREER OBJECTIVE', 12, true); line(p?.career_objective ?? 'Seeking an entry-level role.')
  y += 2; line('EDUCATION', 12, true)
  line(`${p?.degree ?? ''} in ${p?.department ?? ''}, KLE GHBC Haveri (${p?.batch ?? ''}) - CGPA ${p?.cgpa ?? '-'}`)
  y += 2; line('TECHNICAL SKILLS', 12, true); line(skills.join(', ') || 'Not listed')
  if (projects.length) {
    y += 2; line('PROJECTS', 12, true)
    projects.forEach(pr => line(`- ${pr.title}: ${pr.description ?? ''} (${pr.tech.join(', ')})`))
  }
  if (certs.length) {
    y += 2; line('CERTIFICATIONS', 12, true)
    certs.forEach(c => line(`- ${c.name} - ${c.issuer}`))
  }
  return doc.output('blob')
}

export async function getResumeBlob(db: DB, resume: StudentResume): Promise<Blob | null> {
  if (resume.file_url.startsWith('seed:')) return generateSeedResume(db, resume)
  return getFile(resume.file_url)
}

export async function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
