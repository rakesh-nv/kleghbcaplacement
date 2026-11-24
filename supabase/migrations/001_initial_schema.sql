-- KLE GHBC Haveri Placement Management System
-- Initial Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'placement_officer', 'admin')),
  usn TEXT UNIQUE,
  department TEXT,
  degree TEXT,
  batch INTEGER,
  semester INTEGER CHECK (semester IS NULL OR (semester >= 1 AND semester <= 10)),
  cgpa NUMERIC(4,2) CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)),
  backlogs INTEGER DEFAULT 0 CHECK (backlogs >= 0),
  placement_status TEXT NOT NULL DEFAULT 'not_placed' CHECK (placement_status IN ('not_placed', 'in_progress', 'selected', 'offer_received', 'offer_accepted', 'offer_declined')),
  profile_photo_url TEXT,
  career_objective TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT ACADEMICS
-- ============================================================
CREATE TABLE public.student_academics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 10),
  sgpa NUMERIC(4,2) CHECK (sgpa IS NULL OR (sgpa >= 0 AND sgpa <= 10)),
  cgpa NUMERIC(4,2) CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10)),
  backlogs INTEGER DEFAULT 0 CHECK (backlogs >= 0),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, semester)
);

-- ============================================================
-- STUDENT SKILLS
-- ============================================================
CREATE TABLE public.student_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('programming', 'framework', 'database', 'tool', 'soft_skill', 'other')),
  proficiency TEXT NOT NULL DEFAULT 'beginner' CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, skill_name)
);

-- ============================================================
-- STUDENT CERTIFICATIONS
-- ============================================================
CREATE TABLE public.student_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT RESUMES
-- ============================================================
CREATE TABLE public.student_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  location TEXT,
  description TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  responsibilities TEXT,
  required_skills TEXT[],
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  job_type TEXT DEFAULT 'full_time' CHECK (job_type IN ('full_time', 'internship', 'contract', 'part_time')),
  location TEXT,
  application_deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOB ELIGIBILITY RULES
-- ============================================================
CREATE TABLE public.job_eligibility_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  eligible_departments TEXT[],
  eligible_degrees TEXT[],
  eligible_batches INTEGER[],
  min_cgpa NUMERIC(4,2) CHECK (min_cgpa IS NULL OR (min_cgpa >= 0 AND min_cgpa <= 10)),
  max_backlogs INTEGER DEFAULT 0 CHECK (max_backlogs IS NULL OR max_backlogs >= 0),
  required_skills TEXT[],
  additional_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'offered', 'accepted', 'rejected', 'withdrawn')),
  resume_url TEXT,
  cover_letter TEXT,
  officer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- ============================================================
-- APPLICATION STATUS HISTORY
-- ============================================================
CREATE TABLE public.application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLACEMENT DRIVES
-- ============================================================
CREATE TABLE public.placement_drives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  drive_date DATE NOT NULL,
  venue TEXT,
  mode TEXT NOT NULL DEFAULT 'on_campus' CHECK (mode IN ('on_campus', 'online', 'hybrid')),
  registration_deadline TIMESTAMPTZ,
  instructions TEXT,
  required_documents TEXT[],
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVE REGISTRATIONS
-- ============================================================
CREATE TABLE public.drive_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drive_id UUID NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drive_id, student_id)
);

-- ============================================================
-- INTERVIEWS
-- ============================================================
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('aptitude', 'technical_1', 'technical_2', 'hr', 'group_discussion', 'coding', 'managerial', 'final')),
  round_number INTEGER NOT NULL DEFAULT 1,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  venue TEXT,
  meeting_link TEXT,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTERVIEW FEEDBACK
-- ============================================================
CREATE TABLE public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
  result TEXT CHECK (result IS NULL OR result IN ('pass', 'fail', 'on_hold')),
  given_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PLACEMENT RESULTS
-- ============================================================
CREATE TABLE public.placement_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  package_lpa NUMERIC(8,2),
  offer_date DATE,
  joining_date DATE,
  offer_letter_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, job_id)
);

-- ============================================================
-- RESUME ANALYSES
-- ============================================================
CREATE TABLE public.resume_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_url TEXT NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'rule_based' CHECK (analysis_type IN ('rule_based', 'ai')),
  completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  skills_found TEXT[],
  education_found JSONB,
  experience_found JSONB,
  projects_found JSONB,
  strengths TEXT[],
  weaknesses TEXT[],
  suggestions TEXT[],
  matched_skills TEXT[],
  missing_skills TEXT[],
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING RESOURCES
-- ============================================================
CREATE TABLE public.learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  skill_tags TEXT[],
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  resource_type TEXT NOT NULL DEFAULT 'article' CHECK (resource_type IN ('article', 'video', 'course', 'practice', 'book')),
  is_free BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEARNING PATHS
-- ============================================================
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  skill_tags TEXT[],
  resources UUID[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT LEARNING PROGRESS
-- ============================================================
CREATE TABLE public.student_learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.learning_resources(id) ON DELETE SET NULL,
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT false,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  time_limit_minutes INTEGER,
  passing_score INTEGER NOT NULL DEFAULT 60 CHECK (passing_score >= 0 AND passing_score <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option >= 0),
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'in_app' CHECK (type IN ('email', 'whatsapp', 'in_app')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_group JSONB,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'delivered', 'read')),
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION DELIVERY LOGS
-- ============================================================
CREATE TABLE public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_department ON public.profiles(department);
CREATE INDEX idx_profiles_batch ON public.profiles(batch);
CREATE INDEX idx_profiles_placement_status ON public.profiles(placement_status);
CREATE INDEX idx_profiles_usn ON public.profiles(usn);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_name_trgm ON public.profiles USING gin(full_name gin_trgm_ops);

CREATE INDEX idx_student_academics_student ON public.student_academics(student_id);
CREATE INDEX idx_student_skills_student ON public.student_skills(student_id);
CREATE INDEX idx_student_certifications_student ON public.student_certifications(student_id);
CREATE INDEX idx_student_resumes_student ON public.student_resumes(student_id);

CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_deadline ON public.jobs(application_deadline);
CREATE INDEX idx_job_eligibility_job ON public.job_eligibility_rules(job_id);

CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_applications_student ON public.applications(student_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_application_history_app ON public.application_status_history(application_id);

CREATE INDEX idx_placement_drives_company ON public.placement_drives(company_id);
CREATE INDEX idx_placement_drives_status ON public.placement_drives(status);
CREATE INDEX idx_placement_drives_date ON public.placement_drives(drive_date);
CREATE INDEX idx_drive_registrations_drive ON public.drive_registrations(drive_id);
CREATE INDEX idx_drive_registrations_student ON public.drive_registrations(student_id);

CREATE INDEX idx_interviews_application ON public.interviews(application_id);
CREATE INDEX idx_interviews_student ON public.interviews(student_id);
CREATE INDEX idx_interviews_date ON public.interviews(scheduled_date);
CREATE INDEX idx_interview_feedback_interview ON public.interview_feedback(interview_id);

CREATE INDEX idx_placement_results_student ON public.placement_results(student_id);
CREATE INDEX idx_placement_results_company ON public.placement_results(company_id);
CREATE INDEX idx_resume_analyses_student ON public.resume_analyses(student_id);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_sender ON public.notifications(sender_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notification_logs_notification ON public.notification_delivery_logs(notification_id);

CREATE INDEX idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

CREATE INDEX idx_student_learning_student ON public.student_learning_progress(student_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_student_academics_updated_at BEFORE UPDATE ON public.student_academics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_placement_drives_updated_at BEFORE UPDATE ON public.placement_drives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_placement_results_updated_at BEFORE UPDATE ON public.placement_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_student_learning_progress_updated_at BEFORE UPDATE ON public.student_learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- PROFILE CREATION TRIGGER (from auth.users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Officers can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );
CREATE POLICY "Officers can update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Officers can insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
  OR auth.uid() = id
);

-- Student Academics RLS
ALTER TABLE public.student_academics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own academics" ON public.student_academics FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all academics" ON public.student_academics FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can manage own academics" ON public.student_academics FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Officers can manage all academics" ON public.student_academics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Student Skills RLS
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own skills" ON public.student_skills FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all skills" ON public.student_skills FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can manage own skills" ON public.student_skills FOR ALL USING (auth.uid() = student_id);

-- Student Certifications RLS
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own certs" ON public.student_certifications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all certs" ON public.student_certifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can manage own certs" ON public.student_certifications FOR ALL USING (auth.uid() = student_id);

-- Student Resumes RLS
ALTER TABLE public.student_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own resumes" ON public.student_resumes FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all resumes" ON public.student_resumes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can manage own resumes" ON public.student_resumes FOR ALL USING (auth.uid() = student_id);

-- Companies RLS (public read, officer write)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active companies" ON public.companies FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin')));
CREATE POLICY "Officers can manage companies" ON public.companies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Jobs RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view published jobs" ON public.jobs FOR SELECT USING (status = 'published' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin')));
CREATE POLICY "Officers can manage jobs" ON public.jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Job Eligibility Rules RLS
ALTER TABLE public.job_eligibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view eligibility rules" ON public.job_eligibility_rules FOR SELECT USING (true);
CREATE POLICY "Officers can manage eligibility rules" ON public.job_eligibility_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Applications RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own applications" ON public.applications FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all applications" ON public.applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can create own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = student_id AND status IN ('applied', 'withdrawn'));
CREATE POLICY "Officers can manage all applications" ON public.applications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Application Status History RLS
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own history" ON public.application_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND student_id = auth.uid())
);
CREATE POLICY "Officers can view all history" ON public.application_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Officers can insert history" ON public.application_status_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
  OR auth.uid() = changed_by
);

-- Placement Drives RLS
ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view drives" ON public.placement_drives FOR SELECT USING (true);
CREATE POLICY "Officers can manage drives" ON public.placement_drives FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Drive Registrations RLS
ALTER TABLE public.drive_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own registrations" ON public.drive_registrations FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all registrations" ON public.drive_registrations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can register for drives" ON public.drive_registrations FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Officers can manage registrations" ON public.drive_registrations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Interviews RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own interviews" ON public.interviews FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all interviews" ON public.interviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Officers can manage interviews" ON public.interviews FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Interview Feedback RLS
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can manage feedback" ON public.interview_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Placement Results RLS
ALTER TABLE public.placement_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own results" ON public.placement_results FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all results" ON public.placement_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Officers can manage results" ON public.placement_results FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Resume Analyses RLS
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view own analyses" ON public.resume_analyses FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all analyses" ON public.resume_analyses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Students can create own analyses" ON public.resume_analyses FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Officers can manage analyses" ON public.resume_analyses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Learning Resources RLS (public read)
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view resources" ON public.learning_resources FOR SELECT USING (true);
CREATE POLICY "Officers can manage resources" ON public.learning_resources FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Learning Paths RLS (public read)
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view paths" ON public.learning_paths FOR SELECT USING (true);
CREATE POLICY "Officers can manage paths" ON public.learning_paths FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Student Learning Progress RLS
ALTER TABLE public.student_learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own progress" ON public.student_learning_progress FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all progress" ON public.student_learning_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Quizzes RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin')));
CREATE POLICY "Officers can manage quizzes" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Quiz Questions RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Officers can manage questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Quiz Attempts RLS
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can manage own attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Officers can view all attempts" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Officers can manage notifications" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Notification Delivery Logs RLS
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view delivery logs" ON public.notification_delivery_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);

-- Audit Logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('placement_officer', 'admin'))
);
CREATE POLICY "Users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
