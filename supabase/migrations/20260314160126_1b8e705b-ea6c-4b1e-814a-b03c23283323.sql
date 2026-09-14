
-- Mentorship Marketplace Listings
CREATE TABLE public.mentorship_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_type text NOT NULL DEFAULT 'seeking_mentor', -- 'seeking_mentor' or 'seeking_mentee'
  title text NOT NULL,
  description text,
  skills text[] DEFAULT '{}',
  experience_level text,
  expectations text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_owner_all" ON public.mentorship_listings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "listing_public_read" ON public.mentorship_listings FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "listing_admin_all" ON public.mentorship_listings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "listing_mentorship_admin_all" ON public.mentorship_listings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- Mentorship Requests (bi-directional)
CREATE TABLE public.mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  listing_id uuid REFERENCES public.mentorship_listings(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'mentee_to_mentor', -- 'mentee_to_mentor' or 'mentor_to_mentee'
  message text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_sender_all" ON public.mentorship_requests FOR ALL TO authenticated
  USING (from_user_id = auth.uid()) WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "request_receiver_select" ON public.mentorship_requests FOR SELECT TO authenticated
  USING (to_user_id = auth.uid());
CREATE POLICY "request_receiver_update" ON public.mentorship_requests FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid());
CREATE POLICY "request_admin_all" ON public.mentorship_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "request_mentorship_admin_all" ON public.mentorship_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'mentorship_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'mentorship_admin'::app_role));

-- Video Meetings table
CREATE TABLE public.video_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  room_name text NOT NULL,
  created_by uuid NOT NULL,
  meeting_type text NOT NULL DEFAULT 'mentorship', -- mentorship, interview, screening, general
  related_id uuid, -- mapping_id, application_id, etc.
  scheduled_at timestamptz,
  ended_at timestamptz,
  participants uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'scheduled', -- scheduled, active, ended
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_creator_all" ON public.video_meetings FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "meeting_participant_select" ON public.video_meetings FOR SELECT TO authenticated
  USING (auth.uid() = ANY(participants));
CREATE POLICY "meeting_admin_all" ON public.video_meetings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "meeting_recruiter_all" ON public.video_meetings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'recruiter'::app_role)) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "meeting_mentor_select" ON public.video_meetings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'mentor'::app_role));

-- Skill Endorsements
CREATE TABLE public.skill_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endorser_id uuid NOT NULL,
  skill text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endorser_id, skill)
);

ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "endorsement_insert" ON public.skill_endorsements FOR INSERT TO authenticated
  WITH CHECK (endorser_id = auth.uid() AND user_id != auth.uid());
CREATE POLICY "endorsement_select" ON public.skill_endorsements FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "endorsement_delete" ON public.skill_endorsements FOR DELETE TO authenticated
  USING (endorser_id = auth.uid());

-- Activity Feed
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL, -- 'course_completed', 'job_applied', 'mentorship_started', 'skill_endorsed', 'certificate_earned'
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_owner_all" ON public.activity_feed FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "feed_public_read" ON public.activity_feed FOR SELECT TO authenticated
  USING (is_public = true);

-- Enable realtime for mentorship_requests and video_meetings
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_meetings;
