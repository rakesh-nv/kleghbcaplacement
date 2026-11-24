// Rule-based resume analysis. Deterministic and transparent: every point in the score
// comes from a named check below. This is NOT AI. An AI analyzer can be added later via a
// secure server-side function (see README); until then the UI labels results "Rule-based".

export async function extractPdfText(file: Blob): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let last: number | null = null
    let text = ''
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (typeof item.str !== 'string') continue
      const yPos = item.transform?.[5] ?? null
      if (last !== null && yPos !== null && Math.abs(yPos - last) > 2) text += '\n'
      else if (text && !text.endsWith(' ')) text += ' '
      text += item.str
      last = yPos
    }
    pages.push(text)
  }
  return pages.join('\n')
}

export const SKILL_DICTIONARY: Record<string, string[]> = {
  Programming: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Kotlin', 'C#', 'PHP', 'R', 'Swift'],
  'Web & Frameworks': ['HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Next.js', 'Tailwind CSS', 'Bootstrap', 'REST API'],
  Databases: ['SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQLite', 'Firebase', 'Redis'],
  'Tools & Cloud': ['Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Jira', 'Postman', 'Figma', 'Excel', 'Power BI', 'Tableau'],
  'Data & AI': ['Machine Learning', 'Deep Learning', 'Data Analysis', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'NLP', 'Statistics'],
  Fundamentals: ['Data Structures', 'Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks'],
  Professional: ['Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Accounting', 'Tally', 'Marketing', 'Sales', 'Finance', 'GST'],
}
const ALL_SKILLS = Object.values(SKILL_DICTIONARY).flat()

const SECTIONS: Record<string, RegExp> = {
  contact: /(@[\w-]+\.\w+)|(\+?\d[\d\s-]{8,}\d)/,
  objective: /\b(career objective|objective|summary|profile|about me)\b/i,
  education: /\b(education|academic|qualification|b\.?e\.?|b\.?tech|b\.?c\.?a|b\.?com|b\.?b\.?a|bachelor|cgpa|sgpa|puc|sslc)\b/i,
  skills: /\b(skills|technical skills|technologies|tools)\b/i,
  projects: /\b(projects?|mini project|major project)\b/i,
  experience: /\b(experience|internship|intern|work history|employment|trainee)\b/i,
  certifications: /\b(certifications?|certificates?|courses?)\b/i,
  achievements: /\b(achievements?|awards?|honou?rs|extra[- ]curricular|activities)\b/i,
}

export const SCORE_WEIGHTS: Array<{ key: string; label: string; points: number }> = [
  { key: 'contact', label: 'Contact details (email / phone)', points: 10 },
  { key: 'objective', label: 'Career objective or summary', points: 10 },
  { key: 'education', label: 'Education section', points: 15 },
  { key: 'skills', label: 'Skills section', points: 15 },
  { key: 'skillcount', label: 'At least 6 recognised skills', points: 10 },
  { key: 'projects', label: 'Projects section', points: 15 },
  { key: 'experience', label: 'Internship / experience', points: 10 },
  { key: 'certifications', label: 'Certifications', points: 5 },
  { key: 'achievements', label: 'Achievements / activities', points: 5 },
  { key: 'length', label: 'Reasonable length (150–900 words)', points: 5 },
]

const ACTION_VERBS = ['developed', 'built', 'designed', 'implemented', 'led', 'created', 'improved', 'optimized', 'managed', 'analyzed', 'automated', 'deployed']

export interface AnalysisOutput {
  completeness: number
  breakdown: Array<{ label: string; points: number; earned: number }>
  skillsFound: string[]
  sectionsFound: string[]
  missingSections: string[]
  education: string[]
  projects: string[]
  experience: string[]
  strengths: string[]
  suggestions: string[]
  wordCount: number
  matchedSkills: string[]
  missingSkills: string[]
  jobMatch: number | null
  keywords: string[]
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function findSkills(text: string): string[] {
  return ALL_SKILLS.filter(skill => {
    const re = skill.length <= 2
      ? new RegExp(`(^|[\\s,(/])${escapeRe(skill)}(?=$|[\\s,)/])`, 'm') // "C", "R", "Go": case-sensitive, whole token
      : new RegExp(`(^|[^a-z0-9])${escapeRe(skill.toLowerCase())}(?=$|[^a-z0-9+#])`, 'm')
    return re.test(skill.length <= 2 ? text : text.toLowerCase())
  })
}

function linesMatching(text: string, re: RegExp, max = 4): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 6 && re.test(l)).slice(0, max)
}

export function analyzeResume(text: string, jobSkills: string[] = []): AnalysisOutput {
  const words = text.split(/\s+/).filter(Boolean)
  const lower = text.toLowerCase()
  const skillsFound = findSkills(text)
  const found: Record<string, boolean> = {}
  for (const [k, re] of Object.entries(SECTIONS)) found[k] = re.test(text)
  found.skillcount = skillsFound.length >= 6
  found.length = words.length >= 150 && words.length <= 900

  const breakdown = SCORE_WEIGHTS.map(w => ({ label: w.label, points: w.points, earned: found[w.key] ? w.points : 0 }))
  const completeness = breakdown.reduce((a, b) => a + b.earned, 0)
  const sectionKeys = ['objective', 'education', 'skills', 'projects', 'experience', 'certifications', 'achievements']
  const nice = (k: string) => k[0].toUpperCase() + k.slice(1)
  const sectionsFound = sectionKeys.filter(k => found[k]).map(nice)
  const missingSections = sectionKeys.filter(k => !found[k]).map(nice)

  const verbs = ACTION_VERBS.filter(v => lower.includes(v))
  const hasNumbers = /\b\d+(\.\d+)?\s?(%|percent|users|students|ms|x)\b/i.test(text)

  const strengths: string[] = []
  if (skillsFound.length >= 8) strengths.push(`Broad skill coverage (${skillsFound.length} recognised skills)`)
  if (found.projects) strengths.push('Includes a projects section')
  if (found.experience) strengths.push('Mentions internship or work experience')
  if (found.certifications) strengths.push('Lists certifications')
  if (verbs.length >= 3) strengths.push(`Uses action verbs (${verbs.slice(0, 4).join(', ')})`)
  if (hasNumbers) strengths.push('Quantifies at least one outcome')

  const suggestions: string[] = []
  if (!found.contact) suggestions.push('Add a professional email address and phone number at the top.')
  if (!found.objective) suggestions.push('Add a 2–3 line career objective tailored to the roles you want.')
  if (!found.projects) suggestions.push('Add 2–3 projects with the problem, your role, the tech used and the outcome.')
  if (!found.experience) suggestions.push('Add internships, freelance work or significant college roles under "Experience".')
  if (!found.certifications) suggestions.push('List relevant certifications (e.g. NPTEL, Coursera, vendor certificates).')
  if (skillsFound.length < 6) suggestions.push('Expand the skills section; group skills by Programming, Frameworks, Databases and Tools.')
  if (verbs.length < 3) suggestions.push('Start bullet points with action verbs such as "Developed", "Designed", "Implemented".')
  if (!hasNumbers) suggestions.push('Quantify results where possible (e.g. "reduced load time by 30%", "used by 200 students").')
  if (words.length < 150) suggestions.push('The resume looks short; add detail to projects and experience.')
  if (words.length > 900) suggestions.push('The resume is long; keep it to one or two pages for freshers.')

  const { matched, missing, jobMatch } = (() => {
    if (!jobSkills.length) return { matched: [] as string[], missing: [] as string[], jobMatch: null }
    const have = new Set([...skillsFound.map(s => s.toLowerCase())])
    const m = jobSkills.filter(s => have.has(s.toLowerCase()) || (s.length > 3 && lower.includes(s.toLowerCase())))
    const mi = jobSkills.filter(s => !m.includes(s))
    return { matched: m, missing: mi, jobMatch: Math.round((m.length / jobSkills.length) * 100) }
  })()
  if (missing.length) suggestions.push(`If you genuinely have them, mention these job keywords: ${missing.join(', ')}.`)

  return {
    completeness, breakdown, skillsFound, sectionsFound, missingSections,
    education: linesMatching(text, SECTIONS.education),
    projects: linesMatching(text, /\b(project|developed|built|system|app|website)\b/i),
    experience: linesMatching(text, SECTIONS.experience),
    strengths, suggestions, wordCount: words.length,
    matchedSkills: matched, missingSkills: missing, jobMatch,
    keywords: missing.length ? missing : SKILL_DICTIONARY.Fundamentals.filter(s => !skillsFound.includes(s)).slice(0, 4),
  }
}
