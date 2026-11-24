// App-level model types. These extend the Supabase table types in ./database.ts with the
// few extra fields the UI needs. While the app runs on hardcoded demo data (src/data/seed.ts),
// these shapes are the contract the future Supabase service layer must satisfy.
import type {
  Profile as DbProfile,
  StudentAcademic as DbStudentAcademic,
  StudentSkill as DbStudentSkill,
  JobEligibilityRule as DbJobEligibilityRule,
  Interview as DbInterview,
  StudentLearningProgress as DbProgress,
  ApplicationStatus,
  PlacementStatus,
  NotificationType,
  NotificationStatus,
} from './database'

export type {
  UserRole, ApplicationStatus, PlacementStatus, JobStatus, DriveStatus, DriveMode, InterviewRound,
  NotificationType, NotificationStatus, SkillCategory, ProficiencyLevel, ResultStatus,
  StudentCertification, StudentResume, Company, Job, Application, ApplicationStatusHistory,
  PlacementDrive, DriveRegistration, InterviewFeedback, PlacementResult, ResumeAnalysis,
  LearningResource, LearningPath, Quiz, QuizQuestion, QuizAttempt, Notification,
  NotificationDeliveryLog, AuditLog,
} from './database'

export interface Profile extends DbProfile {
  interests: string[]
  linkedin_url: string | null
  github_url: string | null
}

export interface StudentAcademic extends DbStudentAcademic {
  credits: number | null
  /** Records submitted by students stay unverified until a placement officer verifies them. */
  verified: boolean
}

export interface StudentSkill extends DbStudentSkill {
  updated_at: string
}

export interface SkillHistory {
  id: string
  student_id: string
  skill_name: string
  proficiency: DbStudentSkill['proficiency']
  action: 'added' | 'updated' | 'removed'
  created_at: string
}

export interface StudentProject {
  id: string
  student_id: string
  title: string
  description: string | null
  url: string | null
  tech: string[]
  created_at: string
}

export interface JobEligibilityRule extends DbJobEligibilityRule {
  /** When true, missing required skills make a student ineligible. Otherwise skills only affect match. */
  skills_mandatory: boolean
}

export interface Interview extends Omit<DbInterview, 'scheduled_date' | 'scheduled_time'> {
  /** ISO timestamp (UTC). Displayed in the viewer's local timezone. */
  scheduled_at: string
  duration_minutes: number
  attended: boolean | null
  cancel_reason: string | null
}

export interface StudentLearningProgress extends DbProgress {
  saved: boolean
}

export interface LearningGoal {
  id: string
  student_id: string
  week_start: string // yyyy-mm-dd (Monday)
  title: string
  done: boolean
  created_at: string
}

export interface MessageTemplate {
  id: string
  channel: 'email' | 'whatsapp'
  name: string
  subject: string | null
  body: string
  /** WhatsApp Business requires pre-approved templates for business-initiated messages. */
  approved: boolean
}

export interface DemoAccount {
  email: string
  /** DEMO ONLY. Real auth will be Supabase Auth; passwords are never stored in app tables. */
  password: string
  profile_id: string
}

export type CgpaMethod = 'average_sgpa' | 'credit_weighted'

export interface InstitutionSettings {
  college_name: string
  short_name: string
  academic_year: string
  grading_scale: number
  cgpa_method: CgpaMethod
  departments: string[]
  degrees: string[]
  /** Students may withdraw only while their application is in one of these statuses. */
  withdrawable_statuses: ApplicationStatus[]
  allow_reapply_after_withdraw: boolean
  /** Once a student has accepted an offer they cannot apply to more jobs. */
  block_after_accepted_offer: boolean
  show_salary_to_students: boolean
  resume_max_mb: number
}

export interface NotificationJob {
  id: string
  channel: NotificationType
  subject: string | null
  body: string
  recipient_ids: string[]
  filter_summary: string
  sender_id: string
  status: NotificationStatus | 'partially_failed'
  created_at: string
}

export interface DB {
  version: number
  settings: InstitutionSettings
  accounts: DemoAccount[]
  profiles: Profile[]
  academics: StudentAcademic[]
  skills: StudentSkill[]
  skillHistory: SkillHistory[]
  certifications: import('./database').StudentCertification[]
  projects: StudentProject[]
  resumes: import('./database').StudentResume[]
  companies: import('./database').Company[]
  jobs: import('./database').Job[]
  rules: JobEligibilityRule[]
  applications: import('./database').Application[]
  statusHistory: import('./database').ApplicationStatusHistory[]
  drives: import('./database').PlacementDrive[]
  driveRegistrations: import('./database').DriveRegistration[]
  interviews: Interview[]
  feedback: import('./database').InterviewFeedback[]
  results: import('./database').PlacementResult[]
  analyses: import('./database').ResumeAnalysis[]
  resources: import('./database').LearningResource[]
  paths: import('./database').LearningPath[]
  progress: StudentLearningProgress[]
  quizzes: import('./database').Quiz[]
  questions: import('./database').QuizQuestion[]
  attempts: import('./database').QuizAttempt[]
  goals: LearningGoal[]
  notifications: import('./database').Notification[]
  notificationJobs: NotificationJob[]
  deliveryLogs: import('./database').NotificationDeliveryLog[]
  templates: MessageTemplate[]
  auditLogs: import('./database').AuditLog[]
}

export type { PlacementStatus as StudentPlacementStatus }
