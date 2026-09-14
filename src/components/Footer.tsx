import { Link } from "react-router-dom";
import { useBranding, useLogoUrl, useFooterText } from "@/hooks/useBranding";

const Footer = () => {
  const branding = useBranding();
  const logoUrl = useLogoUrl();
  const footerText = useFooterText();

  return (
    <footer className="bg-emerald-dark text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt={branding.system_name} className="h-10 w-10" />
              <span className="font-display text-xl font-bold">{branding.system_name}</span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              {branding.tagline}
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/register" className="hover:text-secondary transition-colors">Register</Link></li>
              <li><Link to="/login" className="hover:text-secondary transition-colors">Sign In</Link></li>
              <li><Link to="/jobs" className="hover:text-secondary transition-colors">Job Directory</Link></li>
              <li><Link to="/learning" className="hover:text-secondary transition-colors">E-Learning</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/mentorship" className="hover:text-secondary transition-colors">Mentorship</Link></li>
              <li><Link to="/cv" className="hover:text-secondary transition-colors">CV Builder</Link></li>
              <li><Link to="/search" className="hover:text-secondary transition-colors">Search</Link></li>
              <li><Link to="/dashboard" className="hover:text-secondary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>{branding.contact_address}</li>
              <li>{branding.contact_email}</li>
              <li>{branding.contact_phone}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-8 text-center text-sm text-primary-foreground/50">
          {footerText}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
