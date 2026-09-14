
-- Allow recruiters to view applicant profiles
CREATE POLICY "Recruiters can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'recruiter'::app_role));

-- Allow recruitment_admin to manage all jobs
CREATE POLICY "Recruitment admins can manage all jobs"
ON public.jobs FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- Allow recruitment_admin to view all applications
CREATE POLICY "Recruitment admins can view all applications"
ON public.job_applications FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'recruitment_admin'::app_role));

-- Allow recruitment_admin to view profiles
CREATE POLICY "Recruitment admins can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'recruitment_admin'::app_role));
