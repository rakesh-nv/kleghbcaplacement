// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT SEED DATA — ALL PEOPLE, COMPANIES AND RECORDS BELOW ARE FICTIONAL.
// Generated deterministically (fixed RNG seed) so every statistic shown in the app
// is computed from these records, never hardcoded. Replace with Supabase in phase 2.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Application, ApplicationStatus, ApplicationStatusHistory, Company, DB, DemoAccount, DriveRegistration,
  InstitutionSettings, Interview, InterviewFeedback, InterviewRound, Job, JobEligibilityRule, MessageTemplate,
  Notification, PlacementDrive, PlacementResult, Profile, SkillCategory, StudentAcademic, StudentCertification,
  StudentProject, StudentResume, StudentSkill, ProficiencyLevel,
} from '@/types/models'
import { derivePlacementStatus } from '@/lib/placementStatus'
import { checkEligibility } from '@/lib/eligibility'
import { PATHS, QUESTIONS, QUIZZES, RESOURCES } from './learning'

export const SEED_VERSION = 3
export const OFFICER_ID = 'officer_1'
export const DEMO_PASSWORDS = { officer: 'Officer@123', student: 'Student@123' }

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEFAULT_SETTINGS: InstitutionSettings = {
  college_name: 'KLE Society’s G. H. Bachelor of Computer Applications College, Haveri',
  short_name: 'KLE GHBC Haveri',
  academic_year: '2026-27',
  grading_scale: 10,
  cgpa_method: 'credit_weighted',
  departments: ['Computer Applications', 'Commerce', 'Business Administration', 'Science'],
  degrees: ['BCA', 'B.Com', 'BBA', 'B.Sc'],
  withdrawable_statuses: ['applied', 'under_review'],
  allow_reapply_after_withdraw: false,
  block_after_accepted_offer: true,
  show_salary_to_students: true,
  resume_max_mb: 5,
}

const DEPT_DEGREE: Record<string, string> = {
  'Computer Applications': 'BCA', Commerce: 'B.Com', 'Business Administration': 'BBA', Science: 'B.Sc',
}

const SKILL_POOLS: Record<string, Array<[string, SkillCategory]>> = {
  'Computer Applications': [['Java', 'programming'], ['Python', 'programming'], ['C', 'programming'], ['JavaScript', 'programming'], ['HTML', 'framework'], ['CSS', 'framework'], ['React', 'framework'], ['Node.js', 'framework'], ['SQL', 'database'], ['MySQL', 'database'], ['MongoDB', 'database'], ['Git', 'tool'], ['Data Structures', 'other'], ['DBMS', 'other']],
  Science: [['Python', 'programming'], ['C', 'programming'], ['Java', 'programming'], ['SQL', 'database'], ['Excel', 'tool'], ['Statistics', 'other'], ['Data Analysis', 'other'], ['Machine Learning', 'other'], ['Git', 'tool']],
  Commerce: [['Accounting', 'other'], ['Tally', 'tool'], ['Excel', 'tool'], ['GST', 'other'], ['Finance', 'other'], ['Power BI', 'tool'], ['Data Analysis', 'other']],
  'Business Administration': [['Marketing', 'other'], ['Sales', 'other'], ['Excel', 'tool'], ['Finance', 'other'], ['Power BI', 'tool'], ['Leadership', 'soft_skill']],
}
const SOFT: Array<[string, SkillCategory]> = [['Communication', 'soft_skill'], ['Teamwork', 'soft_skill'], ['Problem Solving', 'soft_skill']]

const FIRST = ['Aarav', 'Bhavana', 'Chetan', 'Deepa', 'Eshwar', 'Farhana', 'Ganesh', 'Harshita', 'Imran', 'Jyoti', 'Kiran', 'Lakshmi', 'Manoj', 'Nandini', 'Omkar', 'Pooja', 'Rahul', 'Sneha', 'Tejas', 'Usha', 'Vinay', 'Swati', 'Yashwant', 'Zoya', 'Akash', 'Divya', 'Sagar', 'Megha', 'Prakash', 'Rekha', 'Santosh', 'Kavya', 'Naveen', 'Shruti', 'Abhishek', 'Pallavi', 'Basavaraj', 'Geeta', 'Mahesh', 'Roopa']
const LAST = ['Patil', 'Hiremath', 'Kulkarni', 'Desai', 'Angadi', 'Shettar', 'Naik', 'Joshi', 'Gowda', 'Bhat', 'Kamble', 'Mulla', 'Hegde', 'Pujar', 'Savanur', 'Yaligar', 'Badiger', 'Kattimani']

const COMPANIES: Array<Omit<Company, 'created_at' | 'updated_at' | 'logo_url' | 'is_active' | 'eligibility_requirements'>> = [
  { id: 'co_nimbus', name: 'Nimbus Softech Pvt. Ltd.', website: 'https://example.com/nimbus', industry: 'IT Services', location: 'Bengaluru', description: 'Fictional mid-size IT services firm building web and mobile apps for SMEs.', contact_person: 'Ritu Menon', contact_email: 'campus@nimbus.example.com', contact_phone: '+91 80000 10001' },
  { id: 'co_kaveri', name: 'Kaveri Infosystems', website: 'https://example.com/kaveri', industry: 'Software Products', location: 'Mysuru', description: 'Fictional product company making school ERP software.', contact_person: 'Arjun Rao', contact_email: 'hr@kaveri.example.com', contact_phone: '+91 80000 10002' },
  { id: 'co_sahyadri', name: 'Sahyadri Finserv', website: 'https://example.com/sahyadri', industry: 'Banking & Finance', location: 'Hubballi', description: 'Fictional NBFC with branches across North Karnataka.', contact_person: 'Meera Kulkarni', contact_email: 'talent@sahyadri.example.com', contact_phone: '+91 80000 10003' },
  { id: 'co_tunga', name: 'Tungabhadra Analytics', website: 'https://example.com/tunga', industry: 'Data & Analytics', location: 'Bengaluru', description: 'Fictional analytics consultancy for retail and agriculture.', contact_person: 'Sandeep Iyer', contact_email: 'careers@tunga.example.com', contact_phone: '+91 80000 10004' },
  { id: 'co_blueriver', name: 'BlueRiver Retail', website: 'https://example.com/blueriver', industry: 'Retail', location: 'Dharwad', description: 'Fictional regional retail chain.', contact_person: 'Anita D’Souza', contact_email: 'jobs@blueriver.example.com', contact_phone: '+91 80000 10005' },
  { id: 'co_deccan', name: 'Deccan Cloudworks', website: 'https://example.com/deccan', industry: 'Cloud & DevOps', location: 'Pune', description: 'Fictional cloud consulting and managed services company.', contact_person: 'Vikram Shah', contact_email: 'campus@deccan.example.com', contact_phone: '+91 80000 10006' },
  { id: 'co_malnad', name: 'Malnad Accounting Services', website: 'https://example.com/malnad', industry: 'Accounting', location: 'Shivamogga', description: 'Fictional accounting and GST compliance firm.', contact_person: 'Prakash Bhat', contact_email: 'hr@malnad.example.com', contact_phone: '+91 80000 10007' },
  { id: 'co_vistara', name: 'Vistara Marketing Hub', website: 'https://example.com/vistara', industry: 'Marketing', location: 'Belagavi', description: 'Fictional digital marketing agency.', contact_person: 'Neha Patil', contact_email: 'people@vistara.example.com', contact_phone: '+91 80000 10008' },
  { id: 'co_orbit', name: 'Orbit EduTech', website: 'https://example.com/orbit', industry: 'EdTech', location: 'Bengaluru', description: 'Fictional online learning platform.', contact_person: 'Farah Khan', contact_email: 'hiring@orbit.example.com', contact_phone: '+91 80000 10009' },
  { id: 'co_hubli', name: 'Hubli Logistics Co.', website: 'https://example.com/hublilog', industry: 'Logistics', location: 'Hubballi', description: 'Fictional logistics operator. Recruitment paused.', contact_person: 'Girish Angadi', contact_email: 'hr@hublilog.example.com', contact_phone: '+91 80000 10010' },
]

interface JobSpec {
  id: string; co: string; title: string; batch: number; depts: string[]; minCgpa: number; maxBacklogs: number
  skills: string[]; mandatory?: boolean; min: number; max: number; type: string; loc: string
  status: Job['status']; postedDaysAgo: number; deadlineInDays: number; desc: string
}

const JOB_SPECS: JobSpec[] = [
  // Batch 2024 (historical)
  { id: 'job_24_1', co: 'co_nimbus', title: 'Trainee Software Engineer', batch: 2024, depts: ['Computer Applications', 'Science'], minCgpa: 6.5, maxBacklogs: 0, skills: ['Java', 'SQL'], min: 3.2, max: 3.6, type: 'Full-time', loc: 'Bengaluru', status: 'archived', postedDaysAgo: 1000, deadlineInDays: -980, desc: 'Graduate trainee programme.' },
  { id: 'job_24_2', co: 'co_sahyadri', title: 'Customer Relationship Officer', batch: 2024, depts: ['Commerce', 'Business Administration'], minCgpa: 6.0, maxBacklogs: 1, skills: ['Communication', 'Finance'], min: 2.6, max: 3.0, type: 'Full-time', loc: 'Hubballi', status: 'archived', postedDaysAgo: 960, deadlineInDays: -940, desc: 'Branch customer service role.' },
  { id: 'job_24_3', co: 'co_malnad', title: 'Junior Accountant', batch: 2024, depts: ['Commerce'], minCgpa: 6.0, maxBacklogs: 1, skills: ['Accounting', 'Tally'], min: 2.4, max: 2.8, type: 'Full-time', loc: 'Shivamogga', status: 'archived', postedDaysAgo: 900, deadlineInDays: -880, desc: 'Bookkeeping and GST filings.' },
  // Batch 2025
  { id: 'job_25_1', co: 'co_kaveri', title: 'Associate Developer', batch: 2025, depts: ['Computer Applications'], minCgpa: 6.5, maxBacklogs: 0, skills: ['JavaScript', 'SQL'], min: 3.5, max: 4.0, type: 'Full-time', loc: 'Mysuru', status: 'archived', postedDaysAgo: 640, deadlineInDays: -620, desc: 'ERP module development.' },
  { id: 'job_25_2', co: 'co_tunga', title: 'Data Analyst Trainee', batch: 2025, depts: ['Science', 'Computer Applications'], minCgpa: 7.0, maxBacklogs: 0, skills: ['Excel', 'SQL', 'Python'], min: 3.8, max: 4.2, type: 'Full-time', loc: 'Bengaluru', status: 'archived', postedDaysAgo: 600, deadlineInDays: -585, desc: 'Reporting and dashboards.' },
  { id: 'job_25_3', co: 'co_vistara', title: 'Marketing Executive', batch: 2025, depts: ['Business Administration', 'Commerce'], minCgpa: 6.0, maxBacklogs: 2, skills: ['Marketing', 'Communication'], min: 2.8, max: 3.2, type: 'Full-time', loc: 'Belagavi', status: 'archived', postedDaysAgo: 560, deadlineInDays: -545, desc: 'Digital campaign execution.' },
  // Batch 2026
  { id: 'job_26_1', co: 'co_deccan', title: 'Cloud Support Associate', batch: 2026, depts: ['Computer Applications', 'Science'], minCgpa: 7.0, maxBacklogs: 0, skills: ['Linux', 'Git', 'Python'], min: 4.0, max: 4.5, type: 'Full-time', loc: 'Pune', status: 'closed', postedDaysAgo: 330, deadlineInDays: -315, desc: 'L1 cloud operations support.' },
  { id: 'job_26_2', co: 'co_nimbus', title: 'Web Developer', batch: 2026, depts: ['Computer Applications'], minCgpa: 6.5, maxBacklogs: 0, skills: ['HTML', 'CSS', 'JavaScript', 'React'], min: 3.6, max: 4.2, type: 'Full-time', loc: 'Bengaluru', status: 'closed', postedDaysAgo: 300, deadlineInDays: -285, desc: 'Front-end development.' },
  { id: 'job_26_3', co: 'co_blueriver', title: 'Store Operations Trainee', batch: 2026, depts: ['Business Administration', 'Commerce'], minCgpa: 5.5, maxBacklogs: 2, skills: ['Sales', 'Communication'], min: 2.4, max: 2.8, type: 'Full-time', loc: 'Dharwad', status: 'closed', postedDaysAgo: 260, deadlineInDays: -245, desc: 'Retail store management track.' },
  // Batch 2027 (current)
  { id: 'job_27_0', co: 'co_orbit', title: 'Content & Support Associate', batch: 2027, depts: ['Computer Applications', 'Science', 'Business Administration'], minCgpa: 6.0, maxBacklogs: 1, skills: ['Communication', 'Excel'], min: 3.0, max: 3.4, type: 'Full-time', loc: 'Bengaluru (Hybrid)', status: 'closed', postedDaysAgo: 95, deadlineInDays: -80, desc: 'Early-season role; selections completed.' },
  { id: 'job_27_1', co: 'co_nimbus', title: 'Graduate Engineer Trainee – Full Stack', batch: 2027, depts: ['Computer Applications', 'Science'], minCgpa: 7.0, maxBacklogs: 0, skills: ['JavaScript', 'React', 'Node.js', 'SQL'], min: 4.5, max: 5.5, type: 'Full-time', loc: 'Bengaluru', status: 'published', postedDaysAgo: 20, deadlineInDays: 14, desc: 'Build customer-facing web applications with React and Node.js under senior mentorship.' },
  { id: 'job_27_2', co: 'co_kaveri', title: 'Software Developer – Java', batch: 2027, depts: ['Computer Applications'], minCgpa: 6.5, maxBacklogs: 0, skills: ['Java', 'SQL', 'Data Structures'], mandatory: false, min: 4.0, max: 4.8, type: 'Full-time', loc: 'Mysuru', status: 'published', postedDaysAgo: 15, deadlineInDays: 10, desc: 'Develop and maintain modules of a school ERP product in Java/Spring.' },
  { id: 'job_27_3', co: 'co_tunga', title: 'Junior Data Analyst', batch: 2027, depts: ['Science', 'Computer Applications', 'Commerce'], minCgpa: 7.0, maxBacklogs: 0, skills: ['Excel', 'SQL', 'Python', 'Data Analysis'], min: 4.2, max: 5.0, type: 'Full-time', loc: 'Bengaluru', status: 'published', postedDaysAgo: 12, deadlineInDays: 20, desc: 'Clean data, build dashboards and present insights to clients.' },
  { id: 'job_27_4', co: 'co_sahyadri', title: 'Relationship Manager Trainee', batch: 2027, depts: ['Commerce', 'Business Administration'], minCgpa: 6.0, maxBacklogs: 1, skills: ['Communication', 'Finance', 'Sales'], min: 3.0, max: 3.5, type: 'Full-time', loc: 'Hubballi / Haveri', status: 'published', postedDaysAgo: 10, deadlineInDays: 18, desc: 'Manage retail customer accounts and loan products.' },
  { id: 'job_27_5', co: 'co_malnad', title: 'Accounts & GST Associate', batch: 2027, depts: ['Commerce'], minCgpa: 6.0, maxBacklogs: 2, skills: ['Accounting', 'Tally', 'GST'], mandatory: true, min: 2.8, max: 3.2, type: 'Full-time', loc: 'Shivamogga', status: 'published', postedDaysAgo: 8, deadlineInDays: 25, desc: 'Bookkeeping, GST returns and reconciliation. Tally and GST knowledge required.' },
  { id: 'job_27_6', co: 'co_deccan', title: 'DevOps Intern (6 months)', batch: 2027, depts: ['Computer Applications', 'Science'], minCgpa: 7.5, maxBacklogs: 0, skills: ['Linux', 'Git', 'Docker', 'Python'], min: 0.25, max: 0.25, type: 'Internship', loc: 'Pune (Remote)', status: 'published', postedDaysAgo: 5, deadlineInDays: 30, desc: 'Paid internship (₹25k/month stipend) with pre-placement offer opportunity.' },
  { id: 'job_27_7', co: 'co_vistara', title: 'Digital Marketing Associate', batch: 2027, depts: ['Business Administration', 'Commerce', 'Computer Applications'], minCgpa: 5.5, maxBacklogs: 2, skills: ['Marketing', 'Communication', 'Excel'], min: 2.8, max: 3.3, type: 'Full-time', loc: 'Belagavi', status: 'published', postedDaysAgo: 3, deadlineInDays: 21, desc: 'Plan and run social media and search campaigns.' },
  { id: 'job_27_8', co: 'co_orbit', title: 'Frontend Developer', batch: 2027, depts: ['Computer Applications'], minCgpa: 7.0, maxBacklogs: 0, skills: ['HTML', 'CSS', 'JavaScript', 'React'], min: 4.0, max: 4.6, type: 'Full-time', loc: 'Bengaluru', status: 'draft', postedDaysAgo: 1, deadlineInDays: 35, desc: 'Draft – awaiting company confirmation.' },
]

const FLOW: ApplicationStatus[] = ['applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'offered', 'accepted']

export function buildSeed(): DB {
  const rand = mulberry32(20261107)
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]
  const chance = (p: number) => rand() < p
  const now = Date.now()
  const DAY = 86400000
  const ago = (d: number) => new Date(now - d * DAY).toISOString()
  const at = (d: number, hour = 10) => { const x = new Date(now + d * DAY); x.setHours(hour, 0, 0, 0); return x.toISOString() }
  const round1 = (n: number) => Math.round(n * 100) / 100

  const profiles: Profile[] = []
  const accounts: DemoAccount[] = []
  const academics: StudentAcademic[] = []
  const skills: StudentSkill[] = []
  const certifications: StudentCertification[] = []
  const projects: StudentProject[] = []
  const resumes: StudentResume[] = []

  profiles.push({
    id: OFFICER_ID, email: 'officer@kleghbc.edu', full_name: 'Prof. Sunil Hosamani (Demo)', phone: '+91 90000 00001',
    role: 'placement_officer', usn: null, department: 'Training & Placement Cell', degree: null, batch: null, semester: null,
    cgpa: null, backlogs: null, placement_status: 'not_placed', profile_photo_url: null, career_objective: null,
    is_active: true, created_at: ago(1200), updated_at: ago(30), interests: [], linkedin_url: null, github_url: null,
  })
  accounts.push({ email: 'officer@kleghbc.edu', password: DEMO_PASSWORDS.officer, profile_id: OFFICER_ID })

  const usedNames = new Set<string>()
  const counters: Record<string, number> = {}
  const cohort: Array<{ batch: number; count: number }> = [
    { batch: 2024, count: 16 }, { batch: 2025, count: 18 }, { batch: 2026, count: 18 }, { batch: 2027, count: 34 },
  ]
  const deptOrder = ['Computer Applications', 'Computer Applications', 'Commerce', 'Business Administration', 'Science']

  for (const { batch, count } of cohort) {
    for (let i = 0; i < count; i++) {
      const isDemo = batch === 2027 && i === 0
      let first = pick(FIRST), last = pick(LAST)
      if (isDemo) { first = 'Ananya'; last = 'Kulkarni' }
      while (usedNames.has(`${first} ${last}`)) { first = pick(FIRST); last = pick(LAST) }
      usedNames.add(`${first} ${last}`)
      const dept = isDemo ? 'Computer Applications' : deptOrder[i % deptOrder.length]
      const degree = DEPT_DEGREE[dept]
      const key = `${batch}${degree}`
      counters[key] = (counters[key] ?? 0) + 1
      const usn = `KLEH${String(batch - 3).slice(2)}${degree.replace(/\W/g, '').toUpperCase()}${String(counters[key]).padStart(3, '0')}`
      const id = `stu_${usn.toLowerCase()}`
      const current = batch === 2027
      const semester = current ? 5 : 6
      const base = isDemo ? 8.4 : 5.6 + rand() * 3.8
      const backlogs = isDemo ? 0 : chance(0.15) ? 1 + Math.floor(rand() * 2) : 0
      const email = `${first}.${last}${batch % 100}`.toLowerCase() + '@student.kleghbc.edu'
      // Semester-wise SGPA around the base; overall CGPA is credit-weighted from these
      const sems = current ? 4 : 6
      let wSum = 0, cSum = 0
      for (let s = 1; s <= sems; s++) {
        const sgpa = Math.max(4.5, Math.min(10, round1(base + (rand() - 0.5) * 0.9)))
        const credits = s <= 2 ? 22 : 24
        wSum += sgpa * credits; cSum += credits
        academics.push({ id: `ac_${id}_${s}`, student_id: id, semester: s, sgpa, cgpa: null, backlogs: s === sems ? backlogs : 0, year: batch - 3 + Math.floor((s - 1) / 2), credits, verified: true, created_at: ago(400), updated_at: ago(400) })
      }
      const cgpa = round1(wSum / cSum)
      profiles.push({
        id, email, full_name: `${first} ${last}`, phone: `+91 9${String(Math.floor(100000000 + rand() * 899999999))}`,
        role: 'student', usn, department: dept, degree, batch, semester, cgpa, backlogs, placement_status: 'not_placed',
        profile_photo_url: null,
        career_objective: isDemo ? 'Final-year BCA student who enjoys building web applications; looking for a full-stack developer role where I can keep learning.' : chance(0.6) ? `Motivated ${degree} graduate seeking an entry-level role in ${dept === 'Commerce' ? 'finance and accounts' : dept === 'Business Administration' ? 'sales and marketing' : 'software and IT'}.` : null,
        is_active: !(chance(0.04) && !isDemo), created_at: ago(current ? 420 : 1000), updated_at: ago(20),
        interests: isDemo ? ['Web Development', 'Databases', 'Cloud'] : [], linkedin_url: null, github_url: isDemo ? 'https://github.com/' : null,
      })
      accounts.push({ email, password: DEMO_PASSWORDS.student, profile_id: id })

      const pool = [...SKILL_POOLS[dept]]
      const n = isDemo ? 0 : 3 + Math.floor(rand() * 4)
      const chosen: Array<[string, SkillCategory]> = isDemo
        ? [['JavaScript', 'programming'], ['React', 'framework'], ['HTML', 'framework'], ['CSS', 'framework'], ['SQL', 'database'], ['Java', 'programming'], ['Git', 'tool'], ['Communication', 'soft_skill']]
        : []
      for (let k = 0; k < n && pool.length; k++) chosen.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
      if (!isDemo && chance(0.7)) chosen.push(pick(SOFT))
      const levels: ProficiencyLevel[] = ['beginner', 'intermediate', 'intermediate', 'advanced']
      chosen.forEach(([name, category], k) => skills.push({ id: `sk_${id}_${k}`, student_id: id, skill_name: name, category, proficiency: isDemo ? (k < 2 ? 'advanced' : 'intermediate') : pick(levels), created_at: ago(200), updated_at: ago(200) }))

      if (isDemo || chance(0.35)) certifications.push({ id: `ce_${id}`, student_id: id, name: isDemo ? 'Responsive Web Design' : dept === 'Commerce' ? 'Tally Prime Certification' : 'NPTEL – Programming in Java', issuer: isDemo ? 'freeCodeCamp' : dept === 'Commerce' ? 'Tally Education' : 'NPTEL', issue_date: ago(300).slice(0, 10), expiry_date: null, credential_url: null, created_at: ago(300) })
      if (isDemo || (dept === 'Computer Applications' && chance(0.6))) projects.push({ id: `pr_${id}`, student_id: id, title: isDemo ? 'College Event Management Portal' : 'Library Management System', description: isDemo ? 'Developed a React + Node.js portal used by 300+ students to register for college fests.' : 'CRUD application for book issue and returns.', url: null, tech: isDemo ? ['React', 'Node.js', 'MySQL'] : ['Java', 'MySQL'], created_at: ago(250) })
      if (!isDemo && chance(0.72)) resumes.push({ id: `rs_${id}`, student_id: id, file_name: `${first}_${last}_Resume.pdf`, file_url: `seed:${id}`, file_size: 48_000 + Math.floor(rand() * 60_000), is_primary: true, created_at: ago(current ? 40 : 500) })
    }
  }

  const companies: Company[] = COMPANIES.map(c => ({ ...c, eligibility_requirements: c.industry === 'Accounting' || c.industry === 'Banking & Finance' ? 'Commerce / management graduates, minimum 60% aggregate, no active backlogs preferred.' : 'Graduates with minimum 6.5 CGPA and no active backlogs.', logo_url: null, is_active: c.id !== 'co_hubli', created_at: ago(1100), updated_at: ago(60) }))
  const jobs: Job[] = []
  const rules: JobEligibilityRule[] = []
  for (const s of JOB_SPECS) {
    jobs.push({ id: s.id, company_id: s.co, title: s.title, description: s.desc, responsibilities: 'Work with the team on assigned deliverables; participate in training; follow quality and reporting processes.', required_skills: s.skills, salary_min: s.min, salary_max: s.max, job_type: s.type, location: s.loc, application_deadline: at(s.deadlineInDays, 23), status: s.status, created_by: OFFICER_ID, created_at: ago(s.postedDaysAgo), updated_at: ago(Math.max(0, s.postedDaysAgo - 2)) })
    rules.push({ id: `rule_${s.id}`, job_id: s.id, eligible_departments: s.depts, eligible_degrees: s.depts.map(d => DEPT_DEGREE[d]), eligible_batches: [s.batch], min_cgpa: s.minCgpa, max_backlogs: s.maxBacklogs, required_skills: s.skills, skills_mandatory: !!s.mandatory, additional_criteria: null, created_at: ago(s.postedDaysAgo) })
  }

  const applications: Application[] = []
  const statusHistory: ApplicationStatusHistory[] = []
  const interviews: Interview[] = []
  const feedback: InterviewFeedback[] = []
  const results: PlacementResult[] = []
  const placed = new Set<string>()
  const ROUNDS: InterviewRound[] = ['aptitude', 'technical_1', 'hr']

  const addApp = (job: Job, student: Profile, finalStatus: ApplicationStatus, appliedDaysAgo: number) => {
    const appId = `app_${job.id}_${student.id}`
    const path: ApplicationStatus[] = finalStatus === 'rejected'
      ? [...FLOW.slice(0, 1 + Math.floor(rand() * 4)), 'rejected']
      : finalStatus === 'withdrawn' ? ['applied', 'withdrawn'] : FLOW.slice(0, FLOW.indexOf(finalStatus) + 1)
    const step = Math.max(1, Math.floor(appliedDaysAgo / (path.length + 1)))
    path.forEach((st, k) => statusHistory.push({ id: `sh_${appId}_${k}`, application_id: appId, old_status: k === 0 ? null : path[k - 1], new_status: st, changed_by: k === 0 ? student.id : st === 'withdrawn' ? student.id : OFFICER_ID, notes: st === 'rejected' ? 'Did not clear the round' : null, created_at: ago(appliedDaysAgo - k * step) }))
    applications.push({ id: appId, job_id: job.id, student_id: student.id, status: finalStatus, resume_url: resumes.find(r => r.student_id === student.id)?.file_url ?? null, cover_letter: null, officer_notes: null, created_at: ago(appliedDaysAgo), updated_at: ago(appliedDaysAgo - (path.length - 1) * step) })

    const reachedInterview = path.includes('interview_scheduled')
    if (reachedInterview) {
      const idx = path.indexOf('interview_scheduled')
      const upcoming = finalStatus === 'interview_scheduled'
      const rounds = upcoming ? ROUNDS.slice(0, 1 + Math.floor(rand() * 2)) : ROUNDS
      rounds.forEach((round, k) => {
        const isLast = k === rounds.length - 1
        const future = upcoming && isLast
        const when = future ? at(1 + Math.floor(rand() * 9), 10 + k) : ago(appliedDaysAgo - (idx + 0.5) * step - k)
        const iv: Interview = { id: `iv_${appId}_${k}`, application_id: appId, job_id: job.id, student_id: student.id, company_id: job.company_id, round, round_number: k + 1, scheduled_at: when, duration_minutes: round === 'aptitude' ? 60 : 30, venue: k === 0 ? 'Seminar Hall, Block A' : null, meeting_link: k > 0 ? 'https://meet.example.com/kle-interview' : null, instructions: round === 'aptitude' ? 'Carry college ID and a pen. Calculators not allowed.' : 'Join 10 minutes early with your resume open.', status: future ? 'scheduled' : 'completed', created_by: OFFICER_ID, created_at: ago(appliedDaysAgo - idx * step), updated_at: ago(appliedDaysAgo - idx * step), attended: future ? null : true, cancel_reason: null }
        interviews.push(iv)
        if (!future) {
          const failed = finalStatus === 'rejected' && isLast
          feedback.push({ id: `fb_${iv.id}`, interview_id: iv.id, feedback: failed ? 'Needs stronger fundamentals.' : 'Cleared the round.', rating: failed ? 2 : 3 + Math.floor(rand() * 3), result: failed ? 'fail' : 'pass', given_by: OFFICER_ID, created_at: iv.scheduled_at })
        }
      })
    }
    if (finalStatus === 'offered' || finalStatus === 'accepted') {
      results.push({ id: `res_${appId}`, student_id: student.id, job_id: job.id, company_id: job.company_id, application_id: appId, package_lpa: job.salary_max, offer_date: ago(Math.max(1, appliedDaysAgo - (path.length - 1) * step)).slice(0, 10), joining_date: null, offer_letter_url: null, status: finalStatus === 'accepted' ? 'accepted' : 'pending', created_by: OFFICER_ID, created_at: ago(Math.max(1, appliedDaysAgo - (path.length - 1) * step)), updated_at: ago(1) })
      if (finalStatus === 'accepted') placed.add(student.id)
    }
  }

  const students = profiles.filter(p => p.role === 'student')
  const demo = students.find(s => s.batch === 2027)!
  for (const job of jobs) {
    if (job.status === 'draft') continue
    const rule = rules.find(r => r.job_id === job.id)
    const eligible = students.filter(s => s.id !== demo.id && checkEligibility(s, job, rule, skills.filter(k => k.student_id === s.id)).eligible)
    const daysAgo = Math.round((now - new Date(job.created_at).getTime()) / DAY)
    const open = job.status === 'published'
    for (const s of eligible) {
      if (!chance(open ? 0.55 : 0.75)) continue
      let status: ApplicationStatus
      if (open) {
        status = pick<ApplicationStatus>(['applied', 'applied', 'under_review', 'shortlisted', 'interview_scheduled', 'rejected', 'withdrawn'])
      } else if (placed.has(s.id)) {
        status = 'rejected'
      } else {
        const r = rand()
        status = r < 0.5 ? 'accepted' : r < 0.55 && job.id === 'job_27_0' ? 'offered' : 'rejected'
      }
      addApp(job, s, status, Math.max(2, daysAgo - 1 - Math.floor(rand() * 4)))
    }
  }
  // Demo student: a realistic, in-progress set of applications (other eligible jobs left open to apply)
  const demoJobs = ['job_27_1', 'job_27_2', 'job_27_3']
  const demoStatuses: ApplicationStatus[] = ['interview_scheduled', 'shortlisted', 'applied']
  demoJobs.forEach((jid, k) => addApp(jobs.find(j => j.id === jid)!, demo, demoStatuses[k], 9 - k * 2))
  // A couple of declined offers for realism
  results.filter(r => r.status === 'accepted').slice(0, 2).forEach(r => { r.status = 'declined'; placed.delete(r.student_id); const a = applications.find(x => x.id === r.application_id); if (a) a.status = 'rejected' })

  const drives: PlacementDrive[] = [
    { id: 'dr_1', company_id: 'co_nimbus', job_id: 'job_27_1', title: 'Nimbus Softech Campus Drive 2026', description: 'Aptitude test, technical interview and HR round on campus.', drive_date: at(6, 9), venue: 'Main Auditorium, KLE GHBC Haveri', mode: 'on_campus', registration_deadline: at(4, 23), instructions: 'Report by 8:30 AM in formal dress with two printed copies of your resume.', required_documents: ['College ID', 'Resume (2 copies)', 'Marks cards'], status: 'upcoming', created_by: OFFICER_ID, created_at: ago(18), updated_at: ago(18) },
    { id: 'dr_2', company_id: 'co_tunga', job_id: 'job_27_3', title: 'Tungabhadra Analytics Online Assessment', description: 'Online Excel + SQL assessment followed by virtual interviews.', drive_date: at(12, 11), venue: null, mode: 'online', registration_deadline: at(10, 23), instructions: 'Use a laptop with a webcam. The assessment link is emailed by the company.', required_documents: ['Resume'], status: 'upcoming', created_by: OFFICER_ID, created_at: ago(10), updated_at: ago(10) },
    { id: 'dr_3', company_id: 'co_sahyadri', job_id: 'job_27_4', title: 'Sahyadri Finserv Pool Drive', description: 'Pool drive for commerce and management students of nearby colleges.', drive_date: at(16, 10), venue: 'Seminar Hall, Block B', mode: 'hybrid', registration_deadline: at(14, 23), instructions: 'Group discussion followed by personal interview.', required_documents: ['College ID', 'Resume'], status: 'upcoming', created_by: OFFICER_ID, created_at: ago(8), updated_at: ago(8) },
    { id: 'dr_4', company_id: 'co_orbit', job_id: 'job_27_0', title: 'Orbit EduTech Early Drive', description: 'Early-season drive.', drive_date: ago(85), venue: 'Main Auditorium', mode: 'on_campus', registration_deadline: ago(88), instructions: null, required_documents: ['Resume'], status: 'completed', created_by: OFFICER_ID, created_at: ago(95), updated_at: ago(84) },
    { id: 'dr_5', company_id: 'co_nimbus', job_id: 'job_26_2', title: 'Nimbus Softech Drive 2025', description: 'Web developer hiring.', drive_date: ago(290), venue: 'Main Auditorium', mode: 'on_campus', registration_deadline: ago(293), instructions: null, required_documents: ['Resume'], status: 'completed', created_by: OFFICER_ID, created_at: ago(300), updated_at: ago(289) },
  ]
  const driveRegistrations: DriveRegistration[] = []
  for (const d of drives) {
    const apps = applications.filter(a => a.job_id === d.job_id && a.status !== 'withdrawn')
    for (const a of apps) driveRegistrations.push({ id: `dreg_${d.id}_${a.student_id}`, drive_id: d.id, student_id: a.student_id, registered_at: d.created_at, attended: d.status === 'completed' ? chance(0.9) : null, created_at: d.created_at })
  }

  const templates: MessageTemplate[] = [
    { id: 'tpl_e_job', channel: 'email', name: 'New job opening', subject: 'New opening: {{job_title}} at {{company}}', body: 'Dear {{name}},\n\n{{company}} has opened applications for {{job_title}}. Check your eligibility and apply on the placement portal before {{deadline}}.\n\nRegards,\nTraining & Placement Cell, KLE GHBC Haveri', approved: true },
    { id: 'tpl_e_drive', channel: 'email', name: 'Placement drive announcement', subject: 'Placement drive: {{drive_title}}', body: 'Dear {{name}},\n\nA placement drive "{{drive_title}}" is scheduled on {{drive_date}}. Please register on the portal and carry the required documents.\n\nRegards,\nTraining & Placement Cell', approved: true },
    { id: 'tpl_e_interview', channel: 'email', name: 'Interview schedule', subject: 'Interview scheduled – {{company}}', body: 'Dear {{name}},\n\nYour interview with {{company}} is scheduled. Please check the Interview Schedule page on the portal for date, time and venue.\n\nAll the best,\nTraining & Placement Cell', approved: true },
    { id: 'tpl_e_result', channel: 'email', name: 'Result announcement', subject: 'Results announced – {{company}}', body: 'Dear {{name}},\n\nResults for {{company}} have been published. Log in to the portal to view your status.\n\nRegards,\nTraining & Placement Cell', approved: true },
    { id: 'tpl_w_job', channel: 'whatsapp', name: 'job_opening_alert', subject: null, body: 'Hello {{name}}, a new opening "{{job_title}}" from {{company}} is live on the KLE GHBC placement portal. Last date: {{deadline}}.', approved: true },
    { id: 'tpl_w_drive', channel: 'whatsapp', name: 'drive_reminder', subject: null, body: 'Reminder {{name}}: "{{drive_title}}" is on {{drive_date}}. Carry your college ID and resume.', approved: true },
    { id: 'tpl_w_custom', channel: 'whatsapp', name: 'general_update (pending approval)', subject: null, body: 'Hello {{name}}, {{message}}', approved: false },
  ]

  const notifications: Notification[] = [
    { id: 'n_1', type: 'in_app', title: 'Interview scheduled – Nimbus Softech', message: 'Your aptitude round for Graduate Engineer Trainee – Full Stack has been scheduled. See Interview Schedule for details.', recipient_id: demo.id, recipient_group: null, sender_id: OFFICER_ID, status: 'delivered', read_at: null, metadata: { link: '/student/interviews' }, created_at: ago(1) },
    { id: 'n_2', type: 'in_app', title: 'Shortlisted – Kaveri Infosystems', message: 'You have been shortlisted for Software Developer – Java.', recipient_id: demo.id, recipient_group: null, sender_id: OFFICER_ID, status: 'delivered', read_at: null, metadata: { link: '/student/applications' }, created_at: ago(3) },
    { id: 'n_3', type: 'in_app', title: 'New placement drive: Nimbus Softech Campus Drive 2026', message: 'Registrations close soon. Check the drive details and required documents.', recipient_id: demo.id, recipient_group: null, sender_id: OFFICER_ID, status: 'read', read_at: ago(5), metadata: { link: '/student/jobs' }, created_at: ago(6) },
    { id: 'n_4', type: 'in_app', title: 'Welcome to the KLE GHBC Placement Portal', message: 'Complete your profile, add skills and upload your resume to get job recommendations.', recipient_id: demo.id, recipient_group: null, sender_id: 'system', status: 'read', read_at: ago(40), metadata: { link: '/student/profile' }, created_at: ago(45) },
  ]

  const db: DB = {
    version: SEED_VERSION, settings: DEFAULT_SETTINGS, accounts, profiles, academics, skills, skillHistory: skills.map(s => ({ id: `skh_${s.id}`, student_id: s.student_id, skill_name: s.skill_name, proficiency: s.proficiency, action: 'added' as const, created_at: s.created_at })),
    certifications, projects, resumes, companies, jobs, rules, applications, statusHistory, drives, driveRegistrations,
    interviews, feedback, results, analyses: [], resources: RESOURCES, paths: PATHS, quizzes: QUIZZES, questions: QUESTIONS,
    progress: [
      { id: 'pg_1', student_id: demo.id, resource_id: 'res_web1', path_id: 'path_web', completed: true, progress_percent: 100, notes: null, saved: true, created_at: ago(60), updated_at: ago(30) },
      { id: 'pg_2', student_id: demo.id, resource_id: 'res_js1', path_id: 'path_web', completed: true, progress_percent: 100, notes: null, saved: false, created_at: ago(50), updated_at: ago(20) },
    ],
    attempts: [], goals: [], notifications, notificationJobs: [], deliveryLogs: [], templates, auditLogs: [],
  }
  for (const p of db.profiles) if (p.role === 'student') p.placement_status = derivePlacementStatus(db, p.id)
  return db
}
