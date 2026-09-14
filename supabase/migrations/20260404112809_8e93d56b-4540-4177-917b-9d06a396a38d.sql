
-- Branding settings table (single-row config)
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL DEFAULT 'J-Connect',
  tagline TEXT DEFAULT 'Jigawa State''s unified platform for human capital development',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '142 72% 29%',
  secondary_color TEXT DEFAULT '45 93% 47%',
  footer_text TEXT DEFAULT '© {year} J-Connect — Jigawa State Government. All rights reserved.',
  contact_email TEXT DEFAULT 'info@jconnect.jg.gov.ng',
  contact_phone TEXT DEFAULT '+234 800 000 0000',
  contact_address TEXT DEFAULT 'Dutse, Jigawa State',
  meta_description TEXT DEFAULT 'Jigawa State unified platform for human capital development, career growth, and professional networking.',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read branding
CREATE POLICY "Anyone can read branding" ON public.branding_settings
  FOR SELECT USING (true);

-- Only super_admin can update
CREATE POLICY "Super admins can update branding" ON public.branding_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert branding" ON public.branding_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Seed default row
INSERT INTO public.branding_settings (system_name) VALUES ('J-Connect');

-- Trigger for updated_at
CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
