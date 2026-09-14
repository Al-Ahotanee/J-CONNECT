
-- Enable realtime for social_comments (announcements already handled)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.social_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profile completion function
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p public.profiles)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LEAST(100, (
    10
    + (CASE WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN 10 ELSE 0 END)
    + (CASE WHEN p.gender IS NOT NULL THEN 5 ELSE 0 END)
    + (CASE WHEN p.date_of_birth IS NOT NULL THEN 5 ELSE 0 END)
    + (CASE WHEN p.lga IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN p.phone IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN p.employment_status IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN p.skills IS NOT NULL AND array_length(p.skills, 1) > 0 THEN 10 ELSE 0 END)
    + (CASE WHEN p.passport_photo_url IS NOT NULL THEN 10 ELSE 0 END)
    + (CASE WHEN p.nin IS NOT NULL THEN 5 ELSE 0 END)
    + (CASE WHEN p.ward IS NOT NULL THEN 5 ELSE 0 END)
    + (CASE WHEN p.sector IS NOT NULL THEN 5 ELSE 0 END)
    + (CASE WHEN p.user_type IS NOT NULL THEN 5 ELSE 0 END)
  ));
$$;
