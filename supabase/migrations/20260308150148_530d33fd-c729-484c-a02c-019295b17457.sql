
-- Fix ALL RLS policies: They are all RESTRICTIVE which blocks access because PostgreSQL
-- requires at least one PERMISSIVE policy to pass. Drop and recreate key ones as PERMISSIVE.

-- ════════════════════════════════════════════
-- JOBS TABLE - Fix public access + recruiter access
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage all jobs" ON public.jobs;
CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruiters can manage own jobs" ON public.jobs;
CREATE POLICY "Recruiters can manage own jobs" ON public.jobs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND posted_by = auth.uid());

DROP POLICY IF EXISTS "Recruitment admins can manage all jobs" ON public.jobs;
CREATE POLICY "Recruitment admins can manage all jobs" ON public.jobs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- ════════════════════════════════════════════
-- JOB_APPLICATIONS TABLE
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own applications" ON public.job_applications;
CREATE POLICY "Users can view own applications" ON public.job_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can apply for jobs" ON public.job_applications;
CREATE POLICY "Users can apply for jobs" ON public.job_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
CREATE POLICY "Admins can view all applications" ON public.job_applications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruiters can view job applications" ON public.job_applications;
CREATE POLICY "Recruiters can view job applications" ON public.job_applications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "Recruiters can update applications" ON public.job_applications;
CREATE POLICY "Recruiters can update applications" ON public.job_applications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruitment admins can view all applications" ON public.job_applications;
CREATE POLICY "Recruitment admins can view all applications" ON public.job_applications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- ════════════════════════════════════════════
-- PROFILES TABLE
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Profiles viewable by owner" ON public.profiles;
CREATE POLICY "Profiles viewable by owner" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "LGA officers can view profiles" ON public.profiles;
CREATE POLICY "LGA officers can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'lga_officer'::app_role));

DROP POLICY IF EXISTS "Recruiters can view profiles" ON public.profiles;
CREATE POLICY "Recruiters can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "Recruitment admins can view profiles" ON public.profiles;
CREATE POLICY "Recruitment admins can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- ════════════════════════════════════════════
-- JOB_OFFERS TABLE
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own offers" ON public.job_offers;
CREATE POLICY "Users can view own offers" ON public.job_offers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all offers" ON public.job_offers;
CREATE POLICY "Admins can manage all offers" ON public.job_offers
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruiters can manage offers" ON public.job_offers;
CREATE POLICY "Recruiters can manage offers" ON public.job_offers
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

-- Users can respond to offers (accept/decline)
CREATE POLICY "Users can update own offers" ON public.job_offers
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ════════════════════════════════════════════
-- INTERVIEW_INVITATIONS TABLE
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own invitations" ON public.interview_invitations;
CREATE POLICY "Users can view own invitations" ON public.interview_invitations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all invitations" ON public.interview_invitations;
CREATE POLICY "Admins can manage all invitations" ON public.interview_invitations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruiters can manage invitations" ON public.interview_invitations;
CREATE POLICY "Recruiters can manage invitations" ON public.interview_invitations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

-- ════════════════════════════════════════════
-- OTHER TABLES - Fix key policies
-- ════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Education
DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
CREATE POLICY "Users can manage own education" ON public.education
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own education" ON public.education;
CREATE POLICY "Users can view own education" ON public.education
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all education" ON public.education;
CREATE POLICY "Admins can view all education" ON public.education
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read" ON public.messages
  FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- Enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can enroll in courses" ON public.enrollments;
CREATE POLICY "Users can enroll in courses" ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own enrollment" ON public.enrollments;
CREATE POLICY "Users can update own enrollment" ON public.enrollments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
CREATE POLICY "Admins can manage all courses" ON public.courses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Instructors can manage own courses" ON public.courses;
CREATE POLICY "Instructors can manage own courses" ON public.courses
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

-- Mentors
DROP POLICY IF EXISTS "Anyone can view active mentors" ON public.mentors;
CREATE POLICY "Anyone can view active mentors" ON public.mentors
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage mentors" ON public.mentors;
CREATE POLICY "Admins can manage mentors" ON public.mentors
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Mentors can update own profile" ON public.mentors;
CREATE POLICY "Mentors can update own profile" ON public.mentors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Quizzes
DROP POLICY IF EXISTS "Anyone can view published quizzes" ON public.quizzes;
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Instructors can manage own quizzes" ON public.quizzes;
CREATE POLICY "Instructors can manage own quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Recruiters can manage own quizzes" ON public.quizzes;
CREATE POLICY "Recruiters can manage own quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid());

-- Quiz questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage questions" ON public.quiz_questions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view questions of published quizzes" ON public.quiz_questions;
CREATE POLICY "Anyone can view questions of published quizzes" ON public.quiz_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true));

DROP POLICY IF EXISTS "Creators can manage questions" ON public.quiz_questions;
CREATE POLICY "Creators can manage questions" ON public.quiz_questions
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()));

-- Quiz attempts
DROP POLICY IF EXISTS "Users can view own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create attempts" ON public.quiz_attempts;
CREATE POLICY "Users can create attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own attempts" ON public.quiz_attempts;
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Recruiters can view attempts" ON public.quiz_attempts;
CREATE POLICY "Recruiters can view attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

-- Mentorship mappings
DROP POLICY IF EXISTS "Users can view own mentorship" ON public.mentorship_mappings;
CREATE POLICY "Users can view own mentorship" ON public.mentorship_mappings
  FOR SELECT TO authenticated USING (mentee_id = auth.uid() OR mentor_id IN (SELECT id FROM mentors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can request mentorship" ON public.mentorship_mappings;
CREATE POLICY "Users can request mentorship" ON public.mentorship_mappings
  FOR INSERT TO authenticated WITH CHECK (mentee_id = auth.uid());

-- Lessons
DROP POLICY IF EXISTS "Enrolled users can view lessons" ON public.lessons;
CREATE POLICY "Enrolled users can view lessons" ON public.lessons
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;
CREATE POLICY "Admins can manage all lessons" ON public.lessons
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Instructors can manage lessons" ON public.lessons;
CREATE POLICY "Instructors can manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));

-- Recruitment admin can also update applications
CREATE POLICY "Recruitment admins can update applications" ON public.job_applications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));
