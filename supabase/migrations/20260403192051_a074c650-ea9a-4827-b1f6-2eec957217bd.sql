
-- ==========================================
-- 1. ANNOUNCEMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  audience TEXT NOT NULL DEFAULT 'all',
  link TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ann_admin_all" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ann_super_admin_all" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ann_citizen_db_admin_all" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'citizen_db_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'citizen_db_admin'::app_role));

CREATE POLICY "ann_public_read" ON public.announcements FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- 2. AUDIT LOG TRIGGERS
-- ==========================================
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('profile');

CREATE TRIGGER audit_jobs AFTER INSERT OR UPDATE OR DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job');

CREATE TRIGGER audit_job_applications AFTER INSERT OR UPDATE OR DELETE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job_application');

CREATE TRIGGER audit_courses AFTER INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('course');

CREATE TRIGGER audit_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('enrollment');

CREATE TRIGGER audit_mentors AFTER INSERT OR UPDATE OR DELETE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentor');

CREATE TRIGGER audit_mentorship_mappings AFTER INSERT OR UPDATE OR DELETE ON public.mentorship_mappings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentorship_mapping');

-- ==========================================
-- 3. ACTIVITY FEED TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.fn_activity_feed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _title text;
  _desc text;
  _type text;
BEGIN
  _type := TG_ARGV[0];
  
  IF _type = 'job_application' AND TG_OP = 'INSERT' THEN
    _user_id := NEW.user_id;
    _title := 'Applied for a job';
    _desc := 'Submitted a new job application';
  ELSIF _type = 'enrollment' AND TG_OP = 'INSERT' THEN
    _user_id := NEW.user_id;
    _title := 'Enrolled in a course';
    _desc := 'Started a new learning journey';
  ELSIF _type = 'profile' AND TG_OP = 'UPDATE' THEN
    _user_id := NEW.user_id;
    _title := 'Updated profile';
    _desc := 'Profile information was updated';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.activity_feed (user_id, activity_type, title, description, is_public)
  VALUES (_user_id, _type, _title, _desc, true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER activity_job_application AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_activity_feed('job_application');

CREATE TRIGGER activity_enrollment AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_activity_feed('enrollment');

CREATE TRIGGER activity_profile_update AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_activity_feed('profile');
