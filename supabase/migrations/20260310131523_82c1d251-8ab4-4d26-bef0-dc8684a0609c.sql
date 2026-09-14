
-- Company profiles for employer branding
CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  industry TEXT,
  company_size TEXT,
  founded_year TEXT,
  website TEXT,
  location TEXT,
  lga TEXT,
  culture TEXT,
  benefits TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Company reviews
CREATE TABLE public.company_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  pros TEXT,
  cons TEXT,
  is_current_employee BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Candidate scores for assessment tracking
CREATE TABLE public.candidate_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scorer_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'overall',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Portfolio items for career profiles
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  project_url TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved/bookmarked candidates (talent pool)
CREATE TABLE public.saved_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recruiter_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recruiter_id, candidate_id)
);

-- Hiring pipeline stage history
CREATE TABLE public.pipeline_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;

-- Company profiles RLS
CREATE POLICY "cp_public_read" ON public.company_profiles FOR SELECT TO public USING (true);
CREATE POLICY "cp_owner_all" ON public.company_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cp_admin_all" ON public.company_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Company reviews RLS
CREATE POLICY "cr_public_read" ON public.company_reviews FOR SELECT TO public USING (true);
CREATE POLICY "cr_user_insert" ON public.company_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cr_user_delete" ON public.company_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Candidate scores RLS
CREATE POLICY "cs_recruiter_all" ON public.candidate_scores FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role)) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "cs_admin_all" ON public.candidate_scores FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cs_user_select" ON public.candidate_scores FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Portfolio items RLS
CREATE POLICY "pi_public_read" ON public.portfolio_items FOR SELECT TO public USING (true);
CREATE POLICY "pi_owner_all" ON public.portfolio_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Saved candidates RLS
CREATE POLICY "sc_recruiter_all" ON public.saved_candidates FOR ALL TO authenticated USING (recruiter_id = auth.uid()) WITH CHECK (recruiter_id = auth.uid());
CREATE POLICY "sc_admin_all" ON public.saved_candidates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Pipeline history RLS
CREATE POLICY "ph_recruiter_all" ON public.pipeline_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'recruiter'::app_role)) WITH CHECK (has_role(auth.uid(), 'recruiter'::app_role));
CREATE POLICY "ph_admin_all" ON public.pipeline_history FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ph_user_select" ON public.pipeline_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM job_applications ja WHERE ja.id = pipeline_history.application_id AND ja.user_id = auth.uid()));
