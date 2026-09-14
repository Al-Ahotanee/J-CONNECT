
-- Fix ALL e-learning RLS policies: change from RESTRICTIVE to PERMISSIVE

-- ═══ COURSES ═══
DROP POLICY IF EXISTS "courses_admin_all" ON courses;
DROP POLICY IF EXISTS "courses_instructor_all" ON courses;
DROP POLICY IF EXISTS "courses_instructor_read_own" ON courses;
DROP POLICY IF EXISTS "courses_learning_admin_all" ON courses;
DROP POLICY IF EXISTS "courses_public_read" ON courses;

CREATE POLICY "courses_admin_all" ON courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "courses_learning_admin_all" ON courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "courses_instructor_all" ON courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

CREATE POLICY "courses_public_read" ON courses FOR SELECT TO authenticated
  USING (is_published = true);

-- ═══ LESSONS ═══
DROP POLICY IF EXISTS "lessons_admin_all" ON lessons;
DROP POLICY IF EXISTS "lessons_instructor_all" ON lessons;
DROP POLICY IF EXISTS "lessons_enrolled_select" ON lessons;
DROP POLICY IF EXISTS "lessons_learning_admin_all" ON lessons;

CREATE POLICY "lessons_admin_all" ON lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lessons_learning_admin_all" ON lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "lessons_instructor_all" ON lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "lessons_enrolled_select" ON lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));

-- ═══ ENROLLMENTS ═══
DROP POLICY IF EXISTS "enroll_admin_all" ON enrollments;
DROP POLICY IF EXISTS "enroll_instructor_select" ON enrollments;
DROP POLICY IF EXISTS "enroll_learning_admin_select" ON enrollments;
DROP POLICY IF EXISTS "enroll_user_insert" ON enrollments;
DROP POLICY IF EXISTS "enroll_user_select" ON enrollments;
DROP POLICY IF EXISTS "enroll_user_update" ON enrollments;

CREATE POLICY "enroll_admin_all" ON enrollments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "enroll_learning_admin_select" ON enrollments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "enroll_instructor_select" ON enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "enroll_user_insert" ON enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enroll_user_select" ON enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "enroll_user_update" ON enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ═══ LESSON_COMPLETIONS ═══
DROP POLICY IF EXISTS "lc_admin_select" ON lesson_completions;
DROP POLICY IF EXISTS "lc_instructor_select" ON lesson_completions;
DROP POLICY IF EXISTS "lc_user_all" ON lesson_completions;

CREATE POLICY "lc_user_all" ON lesson_completions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lc_admin_select" ON lesson_completions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lc_instructor_select" ON lesson_completions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lesson_completions.course_id AND courses.instructor_id = auth.uid()));

-- ═══ COURSE_MATERIALS ═══
DROP POLICY IF EXISTS "materials_admin_all" ON course_materials;
DROP POLICY IF EXISTS "materials_instructor_all" ON course_materials;
DROP POLICY IF EXISTS "materials_learning_admin_all" ON course_materials;
DROP POLICY IF EXISTS "materials_public_read" ON course_materials;

CREATE POLICY "materials_admin_all" ON course_materials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "materials_learning_admin_all" ON course_materials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "materials_instructor_all" ON course_materials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "materials_enrolled_read" ON course_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_materials.course_id AND enrollments.user_id = auth.uid()));

-- ═══ CERTIFICATES ═══
DROP POLICY IF EXISTS "cert_admin_all" ON certificates;
DROP POLICY IF EXISTS "cert_instructor_insert" ON certificates;
DROP POLICY IF EXISTS "cert_instructor_select" ON certificates;
DROP POLICY IF EXISTS "cert_learning_admin_all" ON certificates;
DROP POLICY IF EXISTS "cert_public_verify" ON certificates;
DROP POLICY IF EXISTS "cert_user_select" ON certificates;

CREATE POLICY "cert_admin_all" ON certificates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cert_learning_admin_all" ON certificates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "cert_instructor_insert" ON certificates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "cert_instructor_select" ON certificates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "cert_user_select" ON certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "cert_public_verify" ON certificates FOR SELECT TO anon, authenticated
  USING (true);

-- ═══ DISCUSSION_POSTS ═══
DROP POLICY IF EXISTS "dp_admin_all" ON discussion_posts;
DROP POLICY IF EXISTS "dp_enrolled_insert" ON discussion_posts;
DROP POLICY IF EXISTS "dp_enrolled_select" ON discussion_posts;
DROP POLICY IF EXISTS "dp_instructor_all" ON discussion_posts;
DROP POLICY IF EXISTS "dp_owner_delete" ON discussion_posts;
DROP POLICY IF EXISTS "dp_owner_update" ON discussion_posts;

CREATE POLICY "dp_admin_all" ON discussion_posts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dp_instructor_all" ON discussion_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid()));

CREATE POLICY "dp_enrolled_select" ON discussion_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));

CREATE POLICY "dp_enrolled_insert" ON discussion_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));

CREATE POLICY "dp_owner_update" ON discussion_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "dp_owner_delete" ON discussion_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ═══ QUIZZES ═══
DROP POLICY IF EXISTS "quizzes_admin_all" ON quizzes;
DROP POLICY IF EXISTS "quizzes_instructor_all" ON quizzes;
DROP POLICY IF EXISTS "quizzes_learning_admin_all" ON quizzes;
DROP POLICY IF EXISTS "quizzes_public_read" ON quizzes;
DROP POLICY IF EXISTS "quizzes_recruiter_all" ON quizzes;

CREATE POLICY "quizzes_admin_all" ON quizzes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "quizzes_learning_admin_all" ON quizzes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "quizzes_instructor_all" ON quizzes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND created_by = auth.uid());

CREATE POLICY "quizzes_recruiter_all" ON quizzes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND created_by = auth.uid());

CREATE POLICY "quizzes_public_read" ON quizzes FOR SELECT TO authenticated
  USING (is_published = true);

-- ═══ QUIZ_QUESTIONS ═══
DROP POLICY IF EXISTS "qq_admin_all" ON quiz_questions;
DROP POLICY IF EXISTS "qq_creator_all" ON quiz_questions;
DROP POLICY IF EXISTS "qq_learning_admin_all" ON quiz_questions;
DROP POLICY IF EXISTS "qq_published_read" ON quiz_questions;

CREATE POLICY "qq_admin_all" ON quiz_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qq_learning_admin_all" ON quiz_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "qq_creator_all" ON quiz_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.created_by = auth.uid()));

CREATE POLICY "qq_published_read" ON quiz_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true));

-- ═══ QUIZ_ATTEMPTS ═══
DROP POLICY IF EXISTS "qa_admin_select" ON quiz_attempts;
DROP POLICY IF EXISTS "qa_instructor_select" ON quiz_attempts;
DROP POLICY IF EXISTS "qa_learning_admin_select" ON quiz_attempts;
DROP POLICY IF EXISTS "qa_user_insert" ON quiz_attempts;
DROP POLICY IF EXISTS "qa_user_select" ON quiz_attempts;
DROP POLICY IF EXISTS "qa_user_update" ON quiz_attempts;

CREATE POLICY "qa_user_insert" ON quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "qa_user_select" ON quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "qa_user_update" ON quiz_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "qa_admin_select" ON quiz_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "qa_learning_admin_select" ON quiz_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "qa_instructor_select" ON quiz_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid()));

-- ═══ USER_ROLES: learning_admin can read ═══
DROP POLICY IF EXISTS "roles_learning_admin_read" ON user_roles;
CREATE POLICY "roles_learning_admin_read" ON user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role));

-- ═══ PROFILES: learning_admin can read ═══
DROP POLICY IF EXISTS "profiles_learning_admin_select" ON profiles;
CREATE POLICY "profiles_learning_admin_select" ON profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'learning_admin'::app_role));
