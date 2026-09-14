
-- ==========================================
-- J-CONNECT COMPLETE DATABASE SCHEMA
-- ==========================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'lga_officer', 'recruiter', 'mentor', 'instructor', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  marital_status TEXT,
  nationality TEXT DEFAULT 'Nigerian',
  state_of_origin TEXT DEFAULT 'Jigawa',
  lga TEXT,
  ward TEXT,
  village TEXT,
  phone TEXT,
  email TEXT,
  residential_address TEXT,
  passport_photo_url TEXT,
  nin TEXT,
  employment_status TEXT,
  current_employer TEXT,
  job_title TEXT,
  sector TEXT,
  work_experience TEXT,
  skills TEXT[],
  certifications TEXT[],
  cv_file_url TEXT,
  profile_completion INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- EDUCATION TABLE
-- ==========================================
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution TEXT NOT NULL,
  qualification_type TEXT NOT NULL,
  field_of_study TEXT,
  year_of_graduation TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- JOBS TABLE
-- ==========================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  lga TEXT,
  sector TEXT,
  employment_type TEXT DEFAULT 'Full-time',
  qualification_required TEXT,
  experience_level TEXT,
  skills_required TEXT[],
  salary_range TEXT,
  deadline DATE,
  is_internal BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  applicants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- JOB APPLICATIONS TABLE
-- ==========================================
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending',
  cover_letter TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- MENTORS TABLE
-- ==========================================
CREATE TABLE public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  category TEXT NOT NULL,
  specialization TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  max_mentees INTEGER DEFAULT 5,
  current_mentees INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- MENTORSHIP MAPPINGS TABLE
-- ==========================================
CREATE TABLE public.mentorship_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);
ALTER TABLE public.mentorship_mappings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- MESSAGES TABLE (for mentorship chat)
-- ==========================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- COURSES TABLE
-- ==========================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  level TEXT DEFAULT 'Beginner',
  is_free BOOLEAN DEFAULT true,
  price NUMERIC DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  enrolled_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- COURSE LESSONS TABLE
-- ==========================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ENROLLMENTS TABLE
-- ==========================================
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Profiles viewable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "LGA officers can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'lga_officer'));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Education policies
CREATE POLICY "Users can view own education" ON public.education
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own education" ON public.education
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all education" ON public.education
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Jobs policies
CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Recruiters can manage own jobs" ON public.jobs
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'recruiter') AND posted_by = auth.uid()
  );

-- Job applications policies
CREATE POLICY "Users can view own applications" ON public.job_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can apply for jobs" ON public.job_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can view job applications" ON public.job_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'));

CREATE POLICY "Admins can view all applications" ON public.job_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Mentors policies
CREATE POLICY "Anyone can view active mentors" ON public.mentors
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Mentors can update own profile" ON public.mentors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage mentors" ON public.mentors
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Mentorship mappings policies
CREATE POLICY "Users can view own mentorship" ON public.mentorship_mappings
  FOR SELECT TO authenticated USING (
    mentee_id = auth.uid() OR 
    mentor_id IN (SELECT id FROM public.mentors WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can request mentorship" ON public.mentorship_mappings
  FOR INSERT TO authenticated WITH CHECK (mentee_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO authenticated USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can mark messages as read" ON public.messages
  FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT TO authenticated USING (is_published = true);

CREATE POLICY "Instructors can manage own courses" ON public.courses
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'instructor') AND instructor_id = auth.uid()
  );

CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lessons policies
CREATE POLICY "Enrolled users can view lessons" ON public.lessons
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.enrollments 
      WHERE enrollments.course_id = lessons.course_id 
      AND enrollments.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all lessons" ON public.lessons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment" ON public.enrollments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('course-content', 'course-content', false);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own CVs" ON storage.objects
  FOR SELECT USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own CV" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Enrolled users can view course content" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-content');

CREATE POLICY "Instructors can upload course content" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-content');

-- Indexes for performance
CREATE INDEX idx_profiles_lga ON public.profiles(lga);
CREATE INDEX idx_profiles_employment_status ON public.profiles(employment_status);
CREATE INDEX idx_profiles_sector ON public.profiles(sector);
CREATE INDEX idx_jobs_sector ON public.jobs(sector);
CREATE INDEX idx_jobs_lga ON public.jobs(lga);
CREATE INDEX idx_jobs_is_active ON public.jobs(is_active);
CREATE INDEX idx_education_qualification ON public.education(qualification_type);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);
