
-- ============ MENTOR CATEGORIES CONSTANT ============
-- Add missing mentor categories as a reference

-- ============ MENTORSHIP SESSIONS ============
CREATE TABLE public.mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL REFERENCES public.mentorship_mappings(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  title text NOT NULL,
  notes text,
  session_type text NOT NULL DEFAULT 'chat',
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_mentor_all" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());
CREATE POLICY "session_mentee_all" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (mentee_id = auth.uid()) WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "session_admin_all" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "session_mentorship_admin_all" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- ============ MENTORSHIP GOALS ============
CREATE TABLE public.mentorship_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid NOT NULL REFERENCES public.mentorship_mappings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  target_date date,
  completed_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_participant" ON public.mentorship_goals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mentorship_mappings mm
      WHERE mm.id = mentorship_goals.mapping_id
      AND (mm.mentee_id = auth.uid() OR mm.mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentorship_mappings mm
      WHERE mm.id = mentorship_goals.mapping_id
      AND (mm.mentee_id = auth.uid() OR mm.mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()))
    )
  );
CREATE POLICY "goal_admin_all" ON public.mentorship_goals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ MENTOR RATINGS ============
CREATE TABLE public.mentor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  mentee_id uuid NOT NULL,
  mapping_id uuid REFERENCES public.mentorship_mappings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mapping_id, mentee_id)
);

ALTER TABLE public.mentor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rating_mentee_insert" ON public.mentor_ratings FOR INSERT TO authenticated
  WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "rating_mentee_select" ON public.mentor_ratings FOR SELECT TO authenticated
  USING (mentee_id = auth.uid());
CREATE POLICY "rating_mentor_select" ON public.mentor_ratings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM mentors m WHERE m.id = mentor_ratings.mentor_id AND m.user_id = auth.uid()));
CREATE POLICY "rating_admin_all" ON public.mentor_ratings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "rating_mentorship_admin_all" ON public.mentor_ratings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- ============ GROUP CHATROOMS ============
CREATE TABLE public.group_chatrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  topic text NOT NULL,
  created_by uuid NOT NULL,
  mentor_id uuid REFERENCES public.mentors(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_members integer DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_chatrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatroom_public_read" ON public.group_chatrooms FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "chatroom_creator_all" ON public.group_chatrooms FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "chatroom_admin_all" ON public.group_chatrooms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "chatroom_mentorship_admin_all" ON public.group_chatrooms FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- ============ CHATROOM MEMBERS ============
CREATE TABLE public.chatroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL REFERENCES public.group_chatrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(chatroom_id, user_id)
);

ALTER TABLE public.chatroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_self_insert" ON public.chatroom_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "member_self_select" ON public.chatroom_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "member_room_select" ON public.chatroom_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_members.chatroom_id AND cm.user_id = auth.uid()));
CREATE POLICY "member_self_delete" ON public.chatroom_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "member_admin_all" ON public.chatroom_members FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ CHATROOM MESSAGES ============
CREATE TABLE public.chatroom_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id uuid NOT NULL REFERENCES public.group_chatrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  file_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chatroom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatmsg_member_insert" ON public.chatroom_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_messages.chatroom_id AND cm.user_id = auth.uid())
  );
CREATE POLICY "chatmsg_member_select" ON public.chatroom_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chatroom_members cm WHERE cm.chatroom_id = chatroom_messages.chatroom_id AND cm.user_id = auth.uid()));
CREATE POLICY "chatmsg_admin_all" ON public.chatroom_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============ ENABLE REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatroom_messages;

-- ============ UPDATE MENTORSHIP_MAPPINGS ============
-- Add auto_matched flag
ALTER TABLE public.mentorship_mappings ADD COLUMN IF NOT EXISTS auto_matched boolean DEFAULT false;
ALTER TABLE public.mentorship_mappings ADD COLUMN IF NOT EXISTS match_reason text;

-- Fix mentorship_mappings RLS to support pending status
DROP POLICY IF EXISTS "mentorship_insert" ON public.mentorship_mappings;
DROP POLICY IF EXISTS "mentorship_select" ON public.mentorship_mappings;

CREATE POLICY "mentorship_insert" ON public.mentorship_mappings FOR INSERT TO authenticated
  WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "mentorship_select" ON public.mentorship_mappings FOR SELECT TO authenticated
  USING (
    mentee_id = auth.uid() OR
    mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid())
  );
CREATE POLICY "mentorship_update_mentor" ON public.mentorship_mappings FOR UPDATE TO authenticated
  USING (mentor_id IN (SELECT m.id FROM mentors m WHERE m.user_id = auth.uid()));
CREATE POLICY "mentorship_update_mentee" ON public.mentorship_mappings FOR UPDATE TO authenticated
  USING (mentee_id = auth.uid());
CREATE POLICY "mentorship_delete_mentee" ON public.mentorship_mappings FOR DELETE TO authenticated
  USING (mentee_id = auth.uid());
CREATE POLICY "mentorship_admin_all" ON public.mentorship_mappings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "mentorship_mentorship_admin_all" ON public.mentorship_mappings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- Add file_url and file_name to messages for file sharing
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name text;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false) ON CONFLICT DO NOTHING;

-- Storage RLS for chat-files
CREATE POLICY "chat_files_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-files');
