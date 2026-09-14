import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export interface BrandingSettings {
  id: string;
  system_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  meta_description: string;
  updated_at: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  id: "",
  system_name: "J-Connect",
  tagline: "Jigawa State's unified platform for human capital development",
  logo_url: null,
  favicon_url: null,
  primary_color: "142 72% 29%",
  secondary_color: "45 93% 47%",
  footer_text: "© {year} J-Connect — Jigawa State Government. All rights reserved.",
  contact_email: "info@jconnect.jg.gov.ng",
  contact_phone: "+234 800 000 0000",
  contact_address: "Dutse, Jigawa State",
  meta_description: "Jigawa State unified platform for human capital development, career growth, and professional networking.",
  updated_at: "",
};

const BrandingContext = createContext<BrandingSettings>(DEFAULT_BRANDING);

export const useBranding = () => useContext(BrandingContext);

async function fetchBranding(): Promise<BrandingSettings> {
  const { data, error } = await supabase
    .from("branding_settings")
    .select("*")
    .limit(1)
    .single();
  if (error || !data) return DEFAULT_BRANDING;
  return {
    id: data.id,
    system_name: data.system_name || DEFAULT_BRANDING.system_name,
    tagline: data.tagline || DEFAULT_BRANDING.tagline,
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
    secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
    footer_text: data.footer_text || DEFAULT_BRANDING.footer_text,
    contact_email: data.contact_email || DEFAULT_BRANDING.contact_email,
    contact_phone: data.contact_phone || DEFAULT_BRANDING.contact_phone,
    contact_address: data.contact_address || DEFAULT_BRANDING.contact_address,
    meta_description: data.meta_description || DEFAULT_BRANDING.meta_description,
    updated_at: data.updated_at,
  };
}

/** Gets the effective logo: custom upload or default asset */
export const useLogoUrl = () => {
  const { logo_url } = useBranding();
  return logo_url || logo;
};

/** Resolves the footer text template (replaces {year}) */
export const useFooterText = () => {
  const { footer_text, system_name } = useBranding();
  return footer_text
    .replace("{year}", new Date().getFullYear().toString())
    .replace("J-Connect", system_name);
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { data: branding } = useQuery({
    queryKey: ["branding-settings"],
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <BrandingContext.Provider value={branding || DEFAULT_BRANDING}>
      {children}
    </BrandingContext.Provider>
  );
};
