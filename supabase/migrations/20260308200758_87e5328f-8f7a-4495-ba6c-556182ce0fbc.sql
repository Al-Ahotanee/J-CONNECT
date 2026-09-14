
-- ==========================================
-- FIX ALL RESTRICTIVE RLS POLICIES TO PERMISSIVE
-- This converts every RESTRICTIVE policy to PERMISSIVE
-- so that ANY matching policy grants access (OR logic)
-- instead of ALL policies needing to pass (AND logic)
-- ==========================================

-- PROFILES
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
CREATE POLICY "profiles_owner_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "profiles_super_admin_all" ON public.profiles;
CREATE POLICY "profiles_super_admin_all" ON public.profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "profiles_recruiter_select" ON public.profiles;
CREATE POLICY "profiles_recruiter_select" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "profiles_recruitment_admin_select" ON public.profiles;
CREATE POLICY "profiles_recruitment_admin_select" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

DROP POLICY IF EXISTS "profiles_lga_officer_select" ON public.profiles;
CREATE POLICY "profiles_lga_officer_select" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'lga_officer'::app_role));

DROP POLICY IF EXISTS "profiles_learning_admin_select" ON public.profiles;
CREATE POLICY "profiles_learning_admin_select" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role));

-- EDUCATION
DROP POLICY IF EXISTS "edu_owner_all" ON public.education;
CREATE POLICY "edu_owner_all" ON public.education FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "edu_admin_select" ON public.education;
CREATE POLICY "edu_admin_select" ON public.education FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "edu_recruiter_select" ON public.education;
CREATE POLICY "edu_recruiter_select" ON public.education FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "user_roles_self_select" ON public.user_roles;
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- JOBS
DROP POLICY IF EXISTS "jobs_public_read" ON public.jobs;
CREATE POLICY "jobs_public_read" ON public.jobs FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "jobs_admin_all" ON public.jobs;
CREATE POLICY "jobs_admin_all" ON public.jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "jobs_super_admin_all" ON public.jobs;
CREATE POLICY "jobs_super_admin_all" ON public.jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "jobs_recruiter_all" ON public.jobs;
CREATE POLICY "jobs_recruiter_all" ON public.jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND posted_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND posted_by = auth.uid());

DROP POLICY IF EXISTS "jobs_recruitment_admin_all" ON public.jobs;
CREATE POLICY "jobs_recruitment_admin_all" ON public.jobs FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- JOB_APPLICATIONS
DROP POLICY IF EXISTS "apps_user_insert" ON public.job_applications;
CREATE POLICY "apps_user_insert" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "apps_user_select" ON public.job_applications;
CREATE POLICY "apps_user_select" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "apps_admin_select" ON public.job_applications;
CREATE POLICY "apps_admin_select" ON public.job_applications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "apps_admin_update" ON public.job_applications;
CREATE POLICY "apps_admin_update" ON public.job_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "apps_recruiter_select" ON public.job_applications;
CREATE POLICY "apps_recruiter_select" ON public.job_applications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "apps_recruiter_update" ON public.job_applications;
CREATE POLICY "apps_recruiter_update" ON public.job_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role));

DROP POLICY IF EXISTS "apps_recruitment_admin_select" ON public.job_applications;
CREATE POLICY "apps_recruitment_admin_select" ON public.job_applications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

DROP POLICY IF EXISTS "apps_recruitment_admin_update" ON public.job_applications;
CREATE POLICY "apps_recruitment_admin_update" ON public.job_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

DROP POLICY IF EXISTS "apps_super_admin_all" ON public.job_applications;
CREATE POLICY "apps_super_admin_all" ON public.job_applications FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- JOB_OFFERS
DROP POLICY IF EXISTS "offers_user_select" ON public.job_offers;
CREATE POLICY "offers_user_select" ON public.job_offers FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "offers_user_update" ON public.job_offers;
CREATE POLICY "offers_user_update" ON public.job_offers FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "offers_recruiter_all" ON public.job_offers;
CREATE POLICY "offers_recruiter_all" ON public.job_offers FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid()) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

DROP POLICY IF EXISTS "offers_admin_all" ON public.job_offers;
CREATE POLICY "offers_admin_all" ON public.job_offers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "offers_super_admin_all" ON public.job_offers;
CREATE POLICY "offers_super_admin_all" ON public.job_offers FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- INTERVIEW_INVITATIONS
DROP POLICY IF EXISTS "invitations_user_select" ON public.interview_invitations;
CREATE POLICY "invitations_user_select" ON public.interview_invitations FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "invitations_recruiter_all" ON public.interview_invitations;
CREATE POLICY "invitations_recruiter_all" ON public.interview_invitations FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid()) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

DROP POLICY IF EXISTS "invitations_admin_all" ON public.interview_invitations;
CREATE POLICY "invitations_admin_all" ON public.interview_invitations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "invitations_super_admin_all" ON public.interview_invitations;
CREATE POLICY "invitations_super_admin_all" ON public.interview_invitations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- COURSES
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "courses_learning_admin_all" ON public.courses;
CREATE POLICY "courses_learning_admin_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "courses_instructor_all" ON public.courses;
CREATE POLICY "courses_instructor_all" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid()) WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

-- ENROLLMENTS
DROP POLICY IF EXISTS "enroll_user_insert" ON public.enrollments;
CREATE POLICY "enroll_user_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "enroll_user_select" ON public.enrollments;
CREATE POLICY "enroll_user_select" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "enroll_user_update" ON public.enrollments;
CREATE POLICY "enroll_user_update" ON public.enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "enroll_admin_all" ON public.enrollments;
CREATE POLICY "enroll_admin_all" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "enroll_learning_admin_all" ON public.enrollments;
CREATE POLICY "enroll_learning_admin_all" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "enroll_instructor_select" ON public.enrollments;
CREATE POLICY "enroll_instructor_select" ON public.enrollments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()));

-- LESSONS
DROP POLICY IF EXISTS "lessons_enrolled_select" ON public.lessons;
CREATE POLICY "lessons_enrolled_select" ON public.lessons FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = lessons.course_id AND enrollments.user_id = auth.uid()));

DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "lessons_learning_admin_all" ON public.lessons;
CREATE POLICY "lessons_learning_admin_all" ON public.lessons FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "lessons_instructor_all" ON public.lessons;
CREATE POLICY "lessons_instructor_all" ON public.lessons FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.instructor_id = auth.uid()));

-- LESSON_COMPLETIONS
DROP POLICY IF EXISTS "lc_user_all" ON public.lesson_completions;
CREATE POLICY "lc_user_all" ON public.lesson_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lc_admin_select" ON public.lesson_completions;
CREATE POLICY "lc_admin_select" ON public.lesson_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "lc_learning_admin_select" ON public.lesson_completions;
CREATE POLICY "lc_learning_admin_select" ON public.lesson_completions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "lc_instructor_select" ON public.lesson_completions;
CREATE POLICY "lc_instructor_select" ON public.lesson_completions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lesson_completions.course_id AND courses.instructor_id = auth.uid()));

-- COURSE_MATERIALS
DROP POLICY IF EXISTS "materials_enrolled_read" ON public.course_materials;
CREATE POLICY "materials_enrolled_read" ON public.course_materials FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_materials.course_id AND enrollments.user_id = auth.uid()));

DROP POLICY IF EXISTS "materials_admin_all" ON public.course_materials;
CREATE POLICY "materials_admin_all" ON public.course_materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "materials_learning_admin_all" ON public.course_materials;
CREATE POLICY "materials_learning_admin_all" ON public.course_materials FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "materials_instructor_all" ON public.course_materials;
CREATE POLICY "materials_instructor_all" ON public.course_materials FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_materials.course_id AND courses.instructor_id = auth.uid()));

-- CERTIFICATES
DROP POLICY IF EXISTS "cert_user_select" ON public.certificates;
CREATE POLICY "cert_user_select" ON public.certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cert_admin_all" ON public.certificates;
CREATE POLICY "cert_admin_all" ON public.certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cert_learning_admin_all" ON public.certificates;
CREATE POLICY "cert_learning_admin_all" ON public.certificates FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "cert_instructor_select" ON public.certificates;
CREATE POLICY "cert_instructor_select" ON public.certificates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));

DROP POLICY IF EXISTS "cert_instructor_insert" ON public.certificates;
CREATE POLICY "cert_instructor_insert" ON public.certificates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = certificates.course_id AND courses.instructor_id = auth.uid()));

-- DISCUSSION_POSTS
DROP POLICY IF EXISTS "dp_enrolled_select" ON public.discussion_posts;
CREATE POLICY "dp_enrolled_select" ON public.discussion_posts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));

DROP POLICY IF EXISTS "dp_enrolled_insert" ON public.discussion_posts;
CREATE POLICY "dp_enrolled_insert" ON public.discussion_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = discussion_posts.course_id AND enrollments.user_id = auth.uid()));

DROP POLICY IF EXISTS "dp_owner_update" ON public.discussion_posts;
CREATE POLICY "dp_owner_update" ON public.discussion_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dp_owner_delete" ON public.discussion_posts;
CREATE POLICY "dp_owner_delete" ON public.discussion_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dp_admin_all" ON public.discussion_posts;
CREATE POLICY "dp_admin_all" ON public.discussion_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "dp_learning_admin_all" ON public.discussion_posts;
CREATE POLICY "dp_learning_admin_all" ON public.discussion_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "dp_instructor_all" ON public.discussion_posts;
CREATE POLICY "dp_instructor_all" ON public.discussion_posts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM courses WHERE courses.id = discussion_posts.course_id AND courses.instructor_id = auth.uid()));

-- QUIZZES (no existing policies shown, skip)

-- QUIZ_ATTEMPTS
DROP POLICY IF EXISTS "qa_user_insert" ON public.quiz_attempts;
CREATE POLICY "qa_user_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "qa_user_select" ON public.quiz_attempts;
CREATE POLICY "qa_user_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "qa_user_update" ON public.quiz_attempts;
CREATE POLICY "qa_user_update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "qa_admin_select" ON public.quiz_attempts;
CREATE POLICY "qa_admin_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "qa_learning_admin_select" ON public.quiz_attempts;
CREATE POLICY "qa_learning_admin_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role));

DROP POLICY IF EXISTS "qa_instructor_select" ON public.quiz_attempts;
CREATE POLICY "qa_instructor_select" ON public.quiz_attempts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quizzes JOIN courses ON courses.id = quizzes.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid()));

-- MENTORS
DROP POLICY IF EXISTS "mentors_public_read" ON public.mentors;
CREATE POLICY "mentors_public_read" ON public.mentors FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "mentors_owner_update" ON public.mentors;
CREATE POLICY "mentors_owner_update" ON public.mentors FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mentors_admin_all" ON public.mentors;
CREATE POLICY "mentors_admin_all" ON public.mentors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- MENTORSHIP_MAPPINGS
DROP POLICY IF EXISTS "mentorship_insert" ON public.mentorship_mappings;
CREATE POLICY "mentorship_insert" ON public.mentorship_mappings FOR INSERT TO authenticated WITH CHECK (mentee_id = auth.uid());

DROP POLICY IF EXISTS "mentorship_select" ON public.mentorship_mappings;
CREATE POLICY "mentorship_select" ON public.mentorship_mappings FOR SELECT TO authenticated USING (mentee_id = auth.uid() OR mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()));

DROP POLICY IF EXISTS "mentorship_update_mentee" ON public.mentorship_mappings;
CREATE POLICY "mentorship_update_mentee" ON public.mentorship_mappings FOR UPDATE TO authenticated USING (mentee_id = auth.uid());

DROP POLICY IF EXISTS "mentorship_update_mentor" ON public.mentorship_mappings;
CREATE POLICY "mentorship_update_mentor" ON public.mentorship_mappings FOR UPDATE TO authenticated USING (mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()));

DROP POLICY IF EXISTS "mentorship_delete_mentee" ON public.mentorship_mappings;
CREATE POLICY "mentorship_delete_mentee" ON public.mentorship_mappings FOR DELETE TO authenticated USING (mentee_id = auth.uid());

DROP POLICY IF EXISTS "mentorship_admin_all" ON public.mentorship_mappings;
CREATE POLICY "mentorship_admin_all" ON public.mentorship_mappings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "mentorship_mentorship_admin_all" ON public.mentorship_mappings;
CREATE POLICY "mentorship_mentorship_admin_all" ON public.mentorship_mappings FOR ALL TO authenticated USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- MENTORSHIP_SESSIONS
DROP POLICY IF EXISTS "session_mentee_all" ON public.mentorship_sessions;
CREATE POLICY "session_mentee_all" ON public.mentorship_sessions FOR ALL TO authenticated USING (mentee_id = auth.uid()) WITH CHECK (mentee_id = auth.uid());

DROP POLICY IF EXISTS "session_mentor_all" ON public.mentorship_sessions;
CREATE POLICY "session_mentor_all" ON public.mentorship_sessions FOR ALL TO authenticated USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());

DROP POLICY IF EXISTS "session_admin_all" ON public.mentorship_sessions;
CREATE POLICY "session_admin_all" ON public.mentorship_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "session_mentorship_admin_all" ON public.mentorship_sessions;
CREATE POLICY "session_mentorship_admin_all" ON public.mentorship_sessions FOR ALL TO authenticated USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- MENTORSHIP_GOALS
DROP POLICY IF EXISTS "goal_participant" ON public.mentorship_goals;
CREATE POLICY "goal_participant" ON public.mentorship_goals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM mentorship_mappings mm WHERE mm.id = mentorship_goals.mapping_id AND (mm.mentee_id = auth.uid() OR mm.mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM mentorship_mappings mm WHERE mm.id = mentorship_goals.mapping_id AND (mm.mentee_id = auth.uid() OR mm.mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()))));

DROP POLICY IF EXISTS "goal_admin_all" ON public.mentorship_goals;
CREATE POLICY "goal_admin_all" ON public.mentorship_goals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- MENTOR_RATINGS
DROP POLICY IF EXISTS "rating_mentee_insert" ON public.mentor_ratings;
CREATE POLICY "rating_mentee_insert" ON public.mentor_ratings FOR INSERT TO authenticated WITH CHECK (mentee_id = auth.uid());

DROP POLICY IF EXISTS "rating_mentee_select" ON public.mentor_ratings;
CREATE POLICY "rating_mentee_select" ON public.mentor_ratings FOR SELECT TO authenticated USING (mentee_id = auth.uid());

DROP POLICY IF EXISTS "rating_mentor_select" ON public.mentor_ratings;
CREATE POLICY "rating_mentor_select" ON public.mentor_ratings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM mentors m WHERE m.id = mentor_ratings.mentor_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "rating_admin_all" ON public.mentor_ratings;
CREATE POLICY "rating_admin_all" ON public.mentor_ratings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "rating_mentorship_admin_all" ON public.mentor_ratings;
CREATE POLICY "rating_mentorship_admin_all" ON public.mentor_ratings FOR ALL TO authenticated USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- MESSAGES
DROP POLICY IF EXISTS "msg_user_insert" ON public.messages;
CREATE POLICY "msg_user_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "msg_user_select" ON public.messages;
CREATE POLICY "msg_user_select" ON public.messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "msg_user_update" ON public.messages;
CREATE POLICY "msg_user_update" ON public.messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notif_user_select" ON public.notifications;
CREATE POLICY "notif_user_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_user_update" ON public.notifications;
CREATE POLICY "notif_user_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_user_insert" ON public.notifications;
CREATE POLICY "notif_user_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_admin_insert" ON public.notifications;
CREATE POLICY "notif_admin_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- GROUP_CHATROOMS
DROP POLICY IF EXISTS "chatroom_public_read" ON public.group_chatrooms;
CREATE POLICY "chatroom_public_read" ON public.group_chatrooms FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "chatroom_creator_all" ON public.group_chatrooms;
CREATE POLICY "chatroom_creator_all" ON public.group_chatrooms FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chatroom_admin_all" ON public.group_chatrooms;
CREATE POLICY "chatroom_admin_all" ON public.group_chatrooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "chatroom_mentorship_admin_all" ON public.group_chatrooms;
CREATE POLICY "chatroom_mentorship_admin_all" ON public.group_chatrooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- CHATROOM_MEMBERS
DROP POLICY IF EXISTS "member_self_select" ON public.chatroom_members;
CREATE POLICY "member_self_select" ON public.chatroom_members FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "member_room_select" ON public.chatroom_members;
CREATE POLICY "member_room_select" ON public.chatroom_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_members.chatroom_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "member_self_insert" ON public.chatroom_members;
CREATE POLICY "member_self_insert" ON public.chatroom_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "member_self_delete" ON public.chatroom_members;
CREATE POLICY "member_self_delete" ON public.chatroom_members FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "member_admin_all" ON public.chatroom_members;
CREATE POLICY "member_admin_all" ON public.chatroom_members FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CHATROOM_MESSAGES
DROP POLICY IF EXISTS "chatmsg_member_select" ON public.chatroom_messages;
CREATE POLICY "chatmsg_member_select" ON public.chatroom_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_messages.chatroom_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "chatmsg_member_insert" ON public.chatroom_messages;
CREATE POLICY "chatmsg_member_insert" ON public.chatroom_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_messages.chatroom_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "chatmsg_admin_all" ON public.chatroom_messages;
CREATE POLICY "chatmsg_admin_all" ON public.chatroom_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- APPROVAL_WORKFLOWS
DROP POLICY IF EXISTS "workflow_super_admin_all" ON public.approval_workflows;
CREATE POLICY "workflow_super_admin_all" ON public.approval_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "workflow_admin_all" ON public.approval_workflows;
CREATE POLICY "workflow_admin_all" ON public.approval_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "workflow_submitter_select" ON public.approval_workflows;
CREATE POLICY "workflow_submitter_select" ON public.approval_workflows FOR SELECT TO authenticated USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "workflow_learning_admin" ON public.approval_workflows;
CREATE POLICY "workflow_learning_admin" ON public.approval_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'learning_admin'::app_role) AND entity_type = 'course') WITH CHECK (has_role(auth.uid(), 'learning_admin'::app_role) AND entity_type = 'course');

DROP POLICY IF EXISTS "workflow_mentorship_admin" ON public.approval_workflows;
CREATE POLICY "workflow_mentorship_admin" ON public.approval_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'mentorship_admin'::app_role) AND entity_type = 'mentor_application') WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role) AND entity_type = 'mentor_application');

DROP POLICY IF EXISTS "workflow_recruitment_admin" ON public.approval_workflows;
CREATE POLICY "workflow_recruitment_admin" ON public.approval_workflows FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role) AND entity_type IN ('job', 'recruiter_application')) WITH CHECK (has_role(auth.uid(), 'recruitment_admin'::app_role) AND entity_type IN ('job', 'recruiter_application'));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "audit_super_admin_all" ON public.audit_logs;
CREATE POLICY "audit_super_admin_all" ON public.audit_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "audit_admin_select" ON public.audit_logs;
CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "audit_admin_insert" ON public.audit_logs;
CREATE POLICY "audit_admin_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "audit_module_admin_select" ON public.audit_logs;
CREATE POLICY "audit_module_admin_select" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'recruitment_admin'::app_role) OR has_role(auth.uid(), 'learning_admin'::app_role) OR has_role(auth.uid(), 'mentorship_admin'::app_role) OR has_role(auth.uid(), 'citizen_db_admin'::app_role));

DROP POLICY IF EXISTS "audit_module_admin_insert" ON public.audit_logs;
CREATE POLICY "audit_module_admin_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'recruitment_admin'::app_role) OR has_role(auth.uid(), 'learning_admin'::app_role) OR has_role(auth.uid(), 'mentorship_admin'::app_role) OR has_role(auth.uid(), 'citizen_db_admin'::app_role));

-- Also add audit_logs trigger-based insert policy for the system trigger
DROP POLICY IF EXISTS "audit_trigger_insert" ON public.audit_logs;
CREATE POLICY "audit_trigger_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
