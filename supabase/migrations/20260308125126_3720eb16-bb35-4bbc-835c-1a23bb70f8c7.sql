
-- Add user_type column to profiles for citizen subtypes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'job_seeker';

-- Update has_role function to also treat super_admin as having all roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND (role = _role OR role = 'super_admin')
  )
$$;
