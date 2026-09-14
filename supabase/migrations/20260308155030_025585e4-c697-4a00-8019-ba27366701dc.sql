
-- =============================================
-- E-LEARNING MODULE: New tables & policy fixes
-- =============================================

-- 1. Course Materials table (PDFs, docs, videos per lesson)
CREATE TABLE public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  file_size bigint,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- 2. Lesson completions (track which lessons each user has completed)
CREATE TABLE public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- 3. Discussion forums per course
CREATE TABLE public.discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

-- 4. Certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid,
  qr_verification_url text,
  pdf_url text,
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 5. Add instructor_approved column to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_approved boolean DEFAULT false;

-- =============================================
-- RLS POLICIES (all PERMISSIVE)
-- =============================================

-- Fix courses RLS: drop restrictive, add permissive
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_all" ON public.courses;

CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "courses_learning_admin_all" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "courses_instructor_all" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());
CREATE POLICY "courses_instructor_read_own" ON public.courses FOR SELECT USING (public.has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

-- Fix lessons RLS: drop restrictive, add permissive
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_enrolled_select" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructor_all" ON public.lessons;

CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "lessons_learning_admin_all" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "lessons_enrolled_select" ON public.lessons FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "lessons_instructor_all" ON public.lessons FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));

-- Fix enrollments RLS: drop restrictive, add permissive
DROP POLICY IF EXISTS "enroll_user_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_user_select" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_user_update" ON public.enrollments;

CREATE POLICY "enroll_user_insert" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll_user_select" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enroll_user_update" ON public.enrollments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "enroll_admin_all" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "enroll_learning_admin_select" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "enroll_instructor_select" ON public.enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()));

-- Course materials policies
CREATE POLICY "materials_public_read" ON public.course_materials FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_materials.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "materials_instructor_all" ON public.course_materials FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "materials_admin_all" ON public.course_materials FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "materials_learning_admin_all" ON public.course_materials FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));

-- Lesson completions policies
CREATE POLICY "lc_user_all" ON public.lesson_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lc_admin_select" ON public.lesson_completions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "lc_instructor_select" ON public.lesson_completions FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lesson_completions.course_id AND courses.instructor_id = auth.uid()));

-- Discussion posts policies
CREATE POLICY "dp_enrolled_select" ON public.discussion_posts FOR SELECT USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "dp_enrolled_insert" ON public.discussion_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "dp_owner_update" ON public.discussion_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dp_owner_delete" ON public.discussion_posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "dp_instructor_all" ON public.discussion_posts FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "dp_admin_all" ON public.discussion_posts FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Certificates policies
CREATE POLICY "cert_user_select" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cert_admin_all" ON public.certificates FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cert_learning_admin_all" ON public.certificates FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "cert_instructor_insert" ON public.certificates FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "cert_instructor_select" ON public.certificates FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "cert_public_verify" ON public.certificates FOR SELECT USING (true);

-- Fix quizzes RLS: drop restrictive, add permissive
DROP POLICY IF EXISTS "quizzes_admin_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_instructor_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_public_read" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_recruiter_all" ON public.quizzes;

CREATE POLICY "quizzes_admin_all" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "quizzes_learning_admin_all" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "quizzes_instructor_all" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid());
CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "quizzes_recruiter_all" ON public.quizzes FOR ALL USING (public.has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid());

-- Fix quiz_questions RLS
DROP POLICY IF EXISTS "qq_admin_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "qq_creator_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "qq_published_read" ON public.quiz_questions;

CREATE POLICY "qq_admin_all" ON public.quiz_questions FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qq_learning_admin_all" ON public.quiz_questions FOR ALL USING (public.has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "qq_creator_all" ON public.quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()));
CREATE POLICY "qq_published_read" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true));

-- Fix quiz_attempts RLS
DROP POLICY IF EXISTS "qa_admin_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_recruiter_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_insert" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_update" ON public.quiz_attempts;

CREATE POLICY "qa_admin_select" ON public.quiz_attempts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_learning_admin_select" ON public.quiz_attempts FOR SELECT USING (public.has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "qa_instructor_select" ON public.quiz_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "qa_user_insert" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_user_select" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qa_user_update" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Add updated_at trigger for discussion posts
CREATE TRIGGER set_discussion_posts_updated_at BEFORE UPDATE ON public.discussion_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for course materials
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-materials
CREATE POLICY "cm_instructor_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'instructor'::app_role));
CREATE POLICY "cm_instructor_update" ON storage.objects FOR UPDATE USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'instructor'::app_role));
CREATE POLICY "cm_instructor_delete" ON storage.objects FOR DELETE USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'instructor'::app_role));
CREATE POLICY "cm_admin_all" ON storage.objects FOR ALL USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cm_enrolled_read" ON storage.objects FOR SELECT USING (bucket_id = 'course-materials');
