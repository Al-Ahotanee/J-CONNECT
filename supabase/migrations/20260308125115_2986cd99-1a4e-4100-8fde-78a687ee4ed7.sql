
-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'citizen_db_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mentorship_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruitment_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cbt_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'learning_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ward_officer';
