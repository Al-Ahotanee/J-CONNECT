
-- Add location_scope and custom_questions to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location_scope text DEFAULT 'LGA';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS custom_questions jsonb DEFAULT '[]'::jsonb;

-- Add custom_answers to job_applications for storing answers to custom questions
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS custom_answers jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS resume_url text;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- =============================================
-- DROP ALL RESTRICTIVE POLICIES AND RECREATE AS PERMISSIVE
-- =============================================

-- ── JOBS ──
DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can manage own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruitment admins can manage all jobs" ON public.jobs;

CREATE POLICY "jobs_public_read" ON public.jobs FOR SELECT USING (is_active = true);
CREATE POLICY "jobs_admin_all" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "jobs_recruiter_all" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND posted_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND posted_by = auth.uid());
CREATE POLICY "jobs_recruitment_admin_all" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'recruitment_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'recruitment_admin'::app_role));
CREATE POLICY "jobs_super_admin_all" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── JOB_APPLICATIONS ──
DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruiters can update applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruitment admins can update applications" ON public.job_applications;
DROP POLICY IF EXISTS "Recruitment admins can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can apply for jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.job_applications;

CREATE POLICY "apps_user_insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "apps_user_select" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "apps_recruiter_select" ON public.job_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "apps_recruiter_update" ON public.job_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "apps_admin_select" ON public.job_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "apps_admin_update" ON public.job_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "apps_recruitment_admin_select" ON public.job_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruitment_admin'::app_role));
CREATE POLICY "apps_recruitment_admin_update" ON public.job_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'recruitment_admin'::app_role));
CREATE POLICY "apps_super_admin_all" ON public.job_applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── PROFILES ──
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "LGA officers can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Recruiters can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Recruitment admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_owner_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_recruiter_select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "profiles_recruitment_admin_select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruitment_admin'::app_role));
CREATE POLICY "profiles_lga_officer_select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'lga_officer'::app_role));
CREATE POLICY "profiles_super_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── USER_ROLES ──
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "roles_owner_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "roles_super_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── JOB_OFFERS ──
DROP POLICY IF EXISTS "Admins can manage all offers" ON public.job_offers;
DROP POLICY IF EXISTS "Recruiters can manage offers" ON public.job_offers;
DROP POLICY IF EXISTS "Users can update own offers" ON public.job_offers;
DROP POLICY IF EXISTS "Users can view own offers" ON public.job_offers;

CREATE POLICY "offers_user_select" ON public.job_offers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "offers_user_update" ON public.job_offers FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "offers_recruiter_all" ON public.job_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());
CREATE POLICY "offers_admin_all" ON public.job_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "offers_super_admin_all" ON public.job_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── INTERVIEW_INVITATIONS ──
DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.interview_invitations;
DROP POLICY IF EXISTS "Recruiters can manage invitations" ON public.interview_invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON public.interview_invitations;

CREATE POLICY "invitations_user_select" ON public.interview_invitations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "invitations_recruiter_all" ON public.interview_invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());
CREATE POLICY "invitations_admin_all" ON public.interview_invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invitations_super_admin_all" ON public.interview_invitations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- ── NOTIFICATIONS ──
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "notif_user_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_user_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_user_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_admin_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ── MESSAGES ──
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;

CREATE POLICY "msg_user_select" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "msg_user_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "msg_user_update" ON public.messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- ── EDUCATION ──
DROP POLICY IF EXISTS "Admins can view all education" ON public.education;
DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
DROP POLICY IF EXISTS "Users can view own education" ON public.education;

CREATE POLICY "edu_owner_all" ON public.education FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edu_admin_select" ON public.education FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "edu_recruiter_select" ON public.education FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role));

-- ── COURSES ──
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can manage own courses" ON public.courses;

CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "courses_instructor_all" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

-- ── ENROLLMENTS ──
DROP POLICY IF EXISTS "Users can enroll in courses" ON public.enrollments;
DROP POLICY IF EXISTS "Users can update own enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;

CREATE POLICY "enroll_user_select" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "enroll_user_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll_user_update" ON public.enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ── LESSONS ──
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;
DROP POLICY IF EXISTS "Enrolled users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can manage lessons" ON public.lessons;

CREATE POLICY "lessons_enrolled_select" ON public.lessons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "lessons_instructor_all" ON public.lessons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));

-- ── MENTORS ──
DROP POLICY IF EXISTS "Admins can manage mentors" ON public.mentors;
DROP POLICY IF EXISTS "Anyone can view active mentors" ON public.mentors;
DROP POLICY IF EXISTS "Mentors can update own profile" ON public.mentors;

CREATE POLICY "mentors_public_read" ON public.mentors FOR SELECT USING (is_active = true);
CREATE POLICY "mentors_admin_all" ON public.mentors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mentors_owner_update" ON public.mentors FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ── MENTORSHIP_MAPPINGS ──
DROP POLICY IF EXISTS "Users can request mentorship" ON public.mentorship_mappings;
DROP POLICY IF EXISTS "Users can view own mentorship" ON public.mentorship_mappings;

CREATE POLICY "mentorship_insert" ON public.mentorship_mappings FOR INSERT TO authenticated WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "mentorship_select" ON public.mentorship_mappings FOR SELECT TO authenticated USING (mentee_id = auth.uid() OR mentor_id IN (SELECT mentors.id FROM mentors WHERE mentors.user_id = auth.uid()));

-- ── QUIZZES ──
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view published quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Instructors can manage own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Recruiters can manage own quizzes" ON public.quizzes;

CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "quizzes_admin_all" ON public.quizzes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "quizzes_instructor_all" ON public.quizzes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid());
CREATE POLICY "quizzes_recruiter_all" ON public.quizzes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid());

-- ── QUIZ_QUESTIONS ──
DROP POLICY IF EXISTS "Admins can manage questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view questions of published quizzes" ON public.quiz_questions;
DROP POLICY IF EXISTS "Creators can manage questions" ON public.quiz_questions;

CREATE POLICY "qq_published_read" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true));
CREATE POLICY "qq_admin_all" ON public.quiz_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qq_creator_all" ON public.quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()));

-- ── QUIZ_ATTEMPTS ──
DROP POLICY IF EXISTS "Admins can view all attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Recruiters can view attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can create attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;

CREATE POLICY "qa_user_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "qa_user_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_user_update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "qa_admin_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_recruiter_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'recruiter'::app_role));

-- Create application-documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('application-documents', 'application-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "app_docs_user_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'application-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "app_docs_user_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'application-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "app_docs_recruiter_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'application-documents' AND (public.has_role(auth.uid(), 'recruiter'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));
