
-- Add external_url for external job links and interview-related tables
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_url text DEFAULT NULL;

-- Interview invitations table for internal recruitment pipeline
CREATE TABLE IF NOT EXISTS public.interview_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'interview' CHECK (type IN ('interview', 'exam', 'offer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  scheduled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Recruiters can manage their invitations
CREATE POLICY "Recruiters can manage invitations" ON public.interview_invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

-- RLS: Admins can manage all invitations
CREATE POLICY "Admins can manage all invitations" ON public.interview_invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Users can view own invitations
CREATE POLICY "Users can view own invitations" ON public.interview_invitations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Job offers table
CREATE TABLE IF NOT EXISTS public.job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  offer_details text,
  salary_offered text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);

ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can manage offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'recruiter'::app_role) AND recruiter_id = auth.uid());

CREATE POLICY "Admins can manage all offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own offers" ON public.job_offers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Update trigger for interview_invitations
CREATE TRIGGER update_interview_invitations_updated_at
  BEFORE UPDATE ON public.interview_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
