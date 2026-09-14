-- Drop existing policies that may conflict
DROP POLICY IF EXISTS "profiles_citizen_db_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_mentorship_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_recruitment_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_cbt_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_learning_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_lga_officer_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_ward_officer_select" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_module_admin_select" ON public.user_roles;
DROP POLICY IF EXISTS "mentors_mentorship_admin_all" ON public.mentors;
DROP POLICY IF EXISTS "user_roles_mentorship_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_recruitment_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_learning_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_citizen_db_admin_insert" ON public.user_roles;
DROP POLICY IF EXISTS "edu_citizen_db_admin_select" ON public.education;
DROP POLICY IF EXISTS "edu_mentorship_admin_select" ON public.education;
DROP POLICY IF EXISTS "messages_citizen_db_admin_all" ON public.messages;

-- 1. Profiles access for module admins
CREATE POLICY "profiles_citizen_db_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'citizen_db_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'citizen_db_admin'::app_role));

CREATE POLICY "profiles_mentorship_admin_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mentorship_admin'::app_role));

CREATE POLICY "profiles_recruitment_admin_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'recruitment_admin'::app_role));

CREATE POLICY "profiles_cbt_admin_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'cbt_admin'::app_role));

CREATE POLICY "profiles_learning_admin_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'learning_admin'::app_role));

CREATE POLICY "profiles_lga_officer_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lga_officer'::app_role));

CREATE POLICY "profiles_ward_officer_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'ward_officer'::app_role));

-- 2. User roles read for module admins
CREATE POLICY "user_roles_module_admin_select" ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'citizen_db_admin'::app_role) OR
    public.has_role(auth.uid(), 'mentorship_admin'::app_role) OR
    public.has_role(auth.uid(), 'recruitment_admin'::app_role) OR
    public.has_role(auth.uid(), 'cbt_admin'::app_role) OR
    public.has_role(auth.uid(), 'learning_admin'::app_role)
  );

-- 3. Mentorship admin full access to mentors
DROP POLICY IF EXISTS "mentors_public_read" ON public.mentors;
CREATE POLICY "mentors_public_read" ON public.mentors FOR SELECT TO public USING (is_active = true);
CREATE POLICY "mentors_mentorship_admin_all" ON public.mentors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'mentorship_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'mentorship_admin'::app_role));

-- 4. Module admin role inserts
CREATE POLICY "user_roles_mentorship_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'mentorship_admin'::app_role) AND role = 'mentor'::app_role);

CREATE POLICY "user_roles_recruitment_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'recruitment_admin'::app_role) AND role = 'recruiter'::app_role);

CREATE POLICY "user_roles_learning_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'learning_admin'::app_role) AND role = 'instructor'::app_role);

CREATE POLICY "user_roles_citizen_db_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'citizen_db_admin'::app_role) AND role IN ('lga_officer'::app_role, 'ward_officer'::app_role, 'user'::app_role));

-- 5. Education read for module admins
CREATE POLICY "edu_citizen_db_admin_select" ON public.education FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'citizen_db_admin'::app_role));

CREATE POLICY "edu_mentorship_admin_select" ON public.education FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mentorship_admin'::app_role));

-- 6. Messages for citizen_db_admin
CREATE POLICY "messages_citizen_db_admin_all" ON public.messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'citizen_db_admin'::app_role) AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'citizen_db_admin'::app_role) AND sender_id = auth.uid());

-- =============================================
-- SOCIAL MEDIA MODULE TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  media_type text DEFAULT 'text',
  visibility text DEFAULT 'public',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_public_read" ON public.social_posts FOR SELECT TO authenticated USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY "sp_owner_all" ON public.social_posts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sp_admin_all" ON public.social_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.social_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.social_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_read" ON public.social_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sr_owner" ON public.social_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.social_comments(id) ON DELETE CASCADE,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_read" ON public.social_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc_owner" ON public.social_comments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sc_admin_delete" ON public.social_comments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.social_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image_url text,
  created_by uuid NOT NULL,
  is_public boolean DEFAULT true,
  member_count integer DEFAULT 1,
  category text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sg_read" ON public.social_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "sg_owner" ON public.social_groups FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "sg_admin_all" ON public.social_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.social_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.social_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.social_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sgm_read" ON public.social_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "sgm_self" ON public.social_group_members FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.social_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sf_read" ON public.social_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "sf_owner" ON public.social_follows FOR ALL TO authenticated USING (follower_id = auth.uid()) WITH CHECK (follower_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;