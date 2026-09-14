
-- Fix ALL e-learning RLS policies from RESTRICTIVE to PERMISSIVE
-- Drop and recreate each policy

-- ============ COURSES ============
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_instructor_all" ON public.courses;
DROP POLICY IF EXISTS "courses_learning_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;

CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "courses_instructor_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid()) WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());
CREATE POLICY "courses_learning_admin_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);

-- ============ LESSONS ============
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructor_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_learning_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_enrolled_select" ON public.lessons;

CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "lessons_instructor_all" ON public.lessons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "lessons_learning_admin_all" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "lessons_enrolled_select" ON public.lessons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));

-- ============ ENROLLMENTS ============
DROP POLICY IF EXISTS "enroll_admin_all" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_instructor_select" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_learning_admin_select" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_user_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_user_select" ON public.enrollments;
DROP POLICY IF EXISTS "enroll_user_update" ON public.enrollments;

CREATE POLICY "enroll_admin_all" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "enroll_instructor_select" ON public.enrollments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "enroll_learning_admin_all" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "enroll_user_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enroll_user_select" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "enroll_user_update" ON public.enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ LESSON_COMPLETIONS ============
DROP POLICY IF EXISTS "lc_admin_select" ON public.lesson_completions;
DROP POLICY IF EXISTS "lc_instructor_select" ON public.lesson_completions;
DROP POLICY IF EXISTS "lc_user_all" ON public.lesson_completions;

CREATE POLICY "lc_admin_select" ON public.lesson_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "lc_instructor_select" ON public.lesson_completions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lesson_completions.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "lc_learning_admin_select" ON public.lesson_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "lc_user_all" ON public.lesson_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COURSE_MATERIALS ============
DROP POLICY IF EXISTS "materials_admin_all" ON public.course_materials;
DROP POLICY IF EXISTS "materials_instructor_all" ON public.course_materials;
DROP POLICY IF EXISTS "materials_learning_admin_all" ON public.course_materials;
DROP POLICY IF EXISTS "materials_enrolled_read" ON public.course_materials;

CREATE POLICY "materials_admin_all" ON public.course_materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "materials_instructor_all" ON public.course_materials FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "materials_learning_admin_all" ON public.course_materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "materials_enrolled_read" ON public.course_materials FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_materials.course_id AND enrollments.user_id = auth.uid()));

-- ============ CERTIFICATES ============
DROP POLICY IF EXISTS "cert_admin_all" ON public.certificates;
DROP POLICY IF EXISTS "cert_instructor_insert" ON public.certificates;
DROP POLICY IF EXISTS "cert_instructor_select" ON public.certificates;
DROP POLICY IF EXISTS "cert_learning_admin_all" ON public.certificates;
DROP POLICY IF EXISTS "cert_public_verify" ON public.certificates;
DROP POLICY IF EXISTS "cert_user_select" ON public.certificates;

CREATE POLICY "cert_admin_all" ON public.certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cert_instructor_insert" ON public.certificates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "cert_instructor_select" ON public.certificates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "cert_learning_admin_all" ON public.certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "cert_public_verify" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "cert_user_select" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ DISCUSSION_POSTS ============
DROP POLICY IF EXISTS "dp_admin_all" ON public.discussion_posts;
DROP POLICY IF EXISTS "dp_instructor_all" ON public.discussion_posts;
DROP POLICY IF EXISTS "dp_enrolled_insert" ON public.discussion_posts;
DROP POLICY IF EXISTS "dp_enrolled_select" ON public.discussion_posts;
DROP POLICY IF EXISTS "dp_owner_delete" ON public.discussion_posts;
DROP POLICY IF EXISTS "dp_owner_update" ON public.discussion_posts;

CREATE POLICY "dp_admin_all" ON public.discussion_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "dp_instructor_all" ON public.discussion_posts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "dp_enrolled_insert" ON public.discussion_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "dp_enrolled_select" ON public.discussion_posts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));
CREATE POLICY "dp_owner_delete" ON public.discussion_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dp_owner_update" ON public.discussion_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dp_learning_admin_all" ON public.discussion_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

-- ============ QUIZZES ============
DROP POLICY IF EXISTS "quizzes_admin_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_instructor_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_learning_admin_all" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_public_read" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_recruiter_all" ON public.quizzes;

CREATE POLICY "quizzes_admin_all" ON public.quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "quizzes_instructor_all" ON public.quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid());
CREATE POLICY "quizzes_learning_admin_all" ON public.quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "quizzes_public_read" ON public.quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "quizzes_recruiter_all" ON public.quizzes FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid());

-- ============ QUIZ_QUESTIONS ============
DROP POLICY IF EXISTS "qq_admin_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "qq_creator_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "qq_learning_admin_all" ON public.quiz_questions;
DROP POLICY IF EXISTS "qq_published_read" ON public.quiz_questions;

CREATE POLICY "qq_admin_all" ON public.quiz_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qq_creator_all" ON public.quiz_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()));
CREATE POLICY "qq_learning_admin_all" ON public.quiz_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "qq_published_read" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true));

-- ============ QUIZ_ATTEMPTS ============
DROP POLICY IF EXISTS "qa_admin_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_instructor_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_learning_admin_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_insert" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_select" ON public.quiz_attempts;
DROP POLICY IF EXISTS "qa_user_update" ON public.quiz_attempts;

CREATE POLICY "qa_admin_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "qa_instructor_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "qa_learning_admin_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role));
CREATE POLICY "qa_user_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qa_user_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "qa_user_update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
