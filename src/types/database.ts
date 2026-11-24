export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'student' | 'placement_officer' | 'admin'
export type ApplicationStatus = 'applied' | 'under_review' | 'shortlisted' | 'interview_scheduled' | 'selected' | 'offered' | 'accepted' | 'rejected' | 'withdrawn'
export type PlacementStatus = 'not_placed' | 'in_progress' | 'selected' | 'offer_received' | 'offer_accepted' | 'offer_declined'
export type JobStatus = 'draft' | 'published' | 'closed' | 'archived'
export type DriveStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type DriveMode = 'on_campus' | 'online' | 'hybrid'
export type InterviewRound = 'aptitude' | 'technical_1' | 'technical_2' | 'hr' | 'group_discussion' | 'coding' | 'managerial' | 'final'
export type NotificationType = 'email' | 'whatsapp' | 'in_app'
export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'delivered' | 'read'
export type SkillCategory = 'programming' | 'framework' | 'database' | 'tool' | 'soft_skill' | 'other'
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type ResultStatus = 'pending' | 'accepted' | 'declined'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      student_academics: {
        Row: StudentAcademic
        Insert: Omit<StudentAcademic, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StudentAcademic, 'id'>>
      }
      student_skills: {
        Row: StudentSkill
        Insert: Omit<StudentSkill, 'id' | 'created_at'>
        Update: Partial<Omit<StudentSkill, 'id'>>
      }
      student_certifications: {
        Row: StudentCertification
        Insert: Omit<StudentCertification, 'id' | 'created_at'>
        Update: Partial<Omit<StudentCertification, 'id'>>
      }
      student_resumes: {
        Row: StudentResume
        Insert: Omit<StudentResume, 'id' | 'created_at'>
        Update: Partial<Omit<StudentResume, 'id'>>
      }
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Company, 'id'>>
      }
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Job, 'id'>>
      }
      job_eligibility_rules: {
        Row: JobEligibilityRule
        Insert: Omit<JobEligibilityRule, 'id' | 'created_at'>
        Update: Partial<Omit<JobEligibilityRule, 'id'>>
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Application, 'id'>>
      }
      application_status_history: {
        Row: ApplicationStatusHistory
        Insert: Omit<ApplicationStatusHistory, 'id' | 'created_at'>
        Update: Partial<Omit<ApplicationStatusHistory, 'id'>>
      }
      placement_drives: {
        Row: PlacementDrive
        Insert: Omit<PlacementDrive, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlacementDrive, 'id'>>
      }
      drive_registrations: {
        Row: DriveRegistration
        Insert: Omit<DriveRegistration, 'id' | 'created_at'>
        Update: Partial<Omit<DriveRegistration, 'id'>>
      }
      interviews: {
        Row: Interview
        Insert: Omit<Interview, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Interview, 'id'>>
      }
      interview_feedback: {
        Row: InterviewFeedback
        Insert: Omit<InterviewFeedback, 'id' | 'created_at'>
        Update: Partial<Omit<InterviewFeedback, 'id'>>
      }
      placement_results: {
        Row: PlacementResult
        Insert: Omit<PlacementResult, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PlacementResult, 'id'>>
      }
      resume_analyses: {
        Row: ResumeAnalysis
        Insert: Omit<ResumeAnalysis, 'id' | 'created_at'>
        Update: Partial<Omit<ResumeAnalysis, 'id'>>
      }
      learning_resources: {
        Row: LearningResource
        Insert: Omit<LearningResource, 'id' | 'created_at'>
        Update: Partial<Omit<LearningResource, 'id'>>
      }
      learning_paths: {
        Row: LearningPath
        Insert: Omit<LearningPath, 'id' | 'created_at'>
        Update: Partial<Omit<LearningPath, 'id'>>
      }
      student_learning_progress: {
        Row: StudentLearningProgress
        Insert: Omit<StudentLearningProgress, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StudentLearningProgress, 'id'>>
      }
      quizzes: {
        Row: Quiz
        Insert: Omit<Quiz, 'id' | 'created_at'>
        Update: Partial<Omit<Quiz, 'id'>>
      }
      quiz_questions: {
        Row: QuizQuestion
        Insert: Omit<QuizQuestion, 'id' | 'created_at'>
        Update: Partial<Omit<QuizQuestion, 'id'>>
      }
      quiz_attempts: {
        Row: QuizAttempt
        Insert: Omit<QuizAttempt, 'id' | 'created_at'>
        Update: Partial<Omit<QuizAttempt, 'id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id'>>
      }
      notification_delivery_logs: {
        Row: NotificationDeliveryLog
        Insert: Omit<NotificationDeliveryLog, 'id' | 'created_at'>
        Update: Partial<Omit<NotificationDeliveryLog, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id'>>
      }
    }
  }
}

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  usn: string | null
  department: string | null
  degree: string | null
  batch: number | null
  semester: number | null
  cgpa: number | null
  backlogs: number | null
  placement_status: PlacementStatus
  profile_photo_url: string | null
  career_objective: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StudentAcademic {
  id: string
  student_id: string
  semester: number
  sgpa: number | null
  cgpa: number | null
  backlogs: number
  year: number
  created_at: string
  updated_at: string
}

export interface StudentSkill {
  id: string
  student_id: string
  skill_name: string
  category: SkillCategory
  proficiency: ProficiencyLevel
  created_at: string
}

export interface StudentCertification {
  id: string
  student_id: string
  name: string
  issuer: string
  issue_date: string | null
  expiry_date: string | null
  credential_url: string | null
  created_at: string
}

export interface StudentResume {
  id: string
  student_id: string
  file_name: string
  file_url: string
  file_size: number
  is_primary: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  location: string | null
  description: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  eligibility_requirements: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  company_id: string
  title: string
  description: string | null
  responsibilities: string | null
  required_skills: string[] | null
  salary_min: number | null
  salary_max: number | null
  job_type: string | null
  location: string | null
  application_deadline: string | null
  status: JobStatus
  created_by: string
  created_at: string
  updated_at: string
  company?: Company
}

export interface JobEligibilityRule {
  id: string
  job_id: string
  eligible_departments: string[] | null
  eligible_degrees: string[] | null
  eligible_batches: number[] | null
  min_cgpa: number | null
  max_backlogs: number | null
  required_skills: string[] | null
  additional_criteria: string | null
  created_at: string
}

export interface Application {
  id: string
  job_id: string
  student_id: string
  status: ApplicationStatus
  resume_url: string | null
  cover_letter: string | null
  officer_notes: string | null
  created_at: string
  updated_at: string
  job?: Job
  student?: Profile
}

export interface ApplicationStatusHistory {
  id: string
  application_id: string
  old_status: ApplicationStatus | null
  new_status: ApplicationStatus
  changed_by: string
  notes: string | null
  created_at: string
}

export interface PlacementDrive {
  id: string
  company_id: string
  job_id: string | null
  title: string
  description: string | null
  drive_date: string
  venue: string | null
  mode: DriveMode
  registration_deadline: string | null
  instructions: string | null
  required_documents: string[] | null
  status: DriveStatus
  created_by: string
  created_at: string
  updated_at: string
  company?: Company
  job?: Job
}

export interface DriveRegistration {
  id: string
  drive_id: string
  student_id: string
  registered_at: string
  attended: boolean | null
  created_at: string
}

export interface Interview {
  id: string
  application_id: string
  job_id: string
  student_id: string
  company_id: string
  round: InterviewRound
  round_number: number
  scheduled_date: string
  scheduled_time: string
  venue: string | null
  meeting_link: string | null
  instructions: string | null
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  created_by: string
  created_at: string
  updated_at: string
  job?: Job
  company?: Company
  student?: Profile
  application?: Application
}

export interface InterviewFeedback {
  id: string
  interview_id: string
  feedback: string
  rating: number | null
  result: 'pass' | 'fail' | 'on_hold' | null
  given_by: string
  created_at: string
}

export interface PlacementResult {
  id: string
  student_id: string
  job_id: string
  company_id: string
  application_id: string
  package_lpa: number | null
  offer_date: string | null
  joining_date: string | null
  offer_letter_url: string | null
  status: ResultStatus
  created_by: string
  created_at: string
  updated_at: string
  student?: Profile
  job?: Job
  company?: Company
}

export interface ResumeAnalysis {
  id: string
  student_id: string
  resume_url: string
  analysis_type: 'rule_based' | 'ai'
  completeness_score: number
  skills_found: string[] | null
  education_found: Json | null
  experience_found: Json | null
  projects_found: Json | null
  strengths: string[] | null
  weaknesses: string[] | null
  suggestions: string[] | null
  matched_skills: string[] | null
  missing_skills: string[] | null
  job_id: string | null
  raw_analysis: Json | null
  created_at: string
}

export interface LearningResource {
  id: string
  title: string
  description: string | null
  url: string
  category: string
  skill_tags: string[] | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  resource_type: 'article' | 'video' | 'course' | 'practice' | 'book'
  is_free: boolean
  created_at: string
}

export interface LearningPath {
  id: string
  title: string
  description: string | null
  category: string
  skill_tags: string[] | null
  resources: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_hours: number | null
  created_at: string
}

export interface StudentLearningProgress {
  id: string
  student_id: string
  resource_id: string | null
  path_id: string | null
  completed: boolean
  progress_percent: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  title: string
  description: string | null
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit_minutes: number | null
  passing_score: number
  is_active: boolean
  created_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  options: string[]
  correct_option: number
  explanation: string | null
  points: number
  created_at: string
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  answers: Record<string, number>
  score: number
  total_points: number
  passed: boolean
  time_taken_seconds: number | null
  created_at: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  recipient_id: string | null
  recipient_group: Json | null
  sender_id: string
  status: NotificationStatus
  read_at: string | null
  metadata: Json | null
  created_at: string
}

export interface NotificationDeliveryLog {
  id: string
  notification_id: string
  channel: NotificationType
  recipient_id: string
  recipient_contact: string
  status: NotificationStatus
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  created_at: string
}

