
-- Create a function to automatically log audit entries on key table changes
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _entity_id uuid;
  _details jsonb;
  _actor_id uuid;
BEGIN
  _action := TG_ARGV[0] || '_' || lower(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id;
    _actor_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    _details := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    _entity_id := NEW.id;
    _actor_id := COALESCE(auth.uid(), NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
    _details := jsonb_build_object('new', to_jsonb(NEW));
  ELSE
    _entity_id := NEW.id;
    _actor_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    _details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (_actor_id, _action, TG_ARGV[0], _entity_id, _details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers for profiles
CREATE TRIGGER audit_profiles_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('profile');

CREATE TRIGGER audit_profiles_delete
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('profile');

-- Triggers for jobs
CREATE TRIGGER audit_jobs_insert
  AFTER INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job');

CREATE TRIGGER audit_jobs_update
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job');

CREATE TRIGGER audit_jobs_delete
  AFTER DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job');

-- Triggers for job_applications
CREATE TRIGGER audit_job_applications_insert
  AFTER INSERT ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job_application');

CREATE TRIGGER audit_job_applications_update
  AFTER UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job_application');

-- Triggers for courses
CREATE TRIGGER audit_courses_insert
  AFTER INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('course');

CREATE TRIGGER audit_courses_update
  AFTER UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('course');

CREATE TRIGGER audit_courses_delete
  AFTER DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('course');

-- Triggers for user_roles
CREATE TRIGGER audit_user_roles_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('user_role');

CREATE TRIGGER audit_user_roles_update
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('user_role');

CREATE TRIGGER audit_user_roles_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('user_role');

-- Triggers for mentors
CREATE TRIGGER audit_mentors_insert
  AFTER INSERT ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentor');

CREATE TRIGGER audit_mentors_update
  AFTER UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentor');

-- Triggers for mentorship_mappings
CREATE TRIGGER audit_mentorship_mappings_insert
  AFTER INSERT ON public.mentorship_mappings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentorship_mapping');

CREATE TRIGGER audit_mentorship_mappings_update
  AFTER UPDATE ON public.mentorship_mappings
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('mentorship_mapping');

-- Triggers for enrollments
CREATE TRIGGER audit_enrollments_insert
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('enrollment');

CREATE TRIGGER audit_enrollments_update
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('enrollment');

-- Triggers for certificates
CREATE TRIGGER audit_certificates_insert
  AFTER INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('certificate');

-- Triggers for notifications (admin-sent)
CREATE TRIGGER audit_notifications_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('notification');

-- Triggers for approval_workflows
CREATE TRIGGER audit_approval_workflows_insert
  AFTER INSERT ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('approval_workflow');

CREATE TRIGGER audit_approval_workflows_update
  AFTER UPDATE ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('approval_workflow');

-- Triggers for job_offers
CREATE TRIGGER audit_job_offers_insert
  AFTER INSERT ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job_offer');

CREATE TRIGGER audit_job_offers_update
  AFTER UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('job_offer');

-- Triggers for interview_invitations
CREATE TRIGGER audit_interview_invitations_insert
  AFTER INSERT ON public.interview_invitations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('interview_invitation');

CREATE TRIGGER audit_interview_invitations_update
  AFTER UPDATE ON public.interview_invitations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log('interview_invitation');

-- Enable realtime on audit_logs for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
