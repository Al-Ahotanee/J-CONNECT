import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBranding, useLogoUrl } from "@/hooks/useBranding";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const branding = useBranding();
  const logoUrl = useLogoUrl();

  const navLinks = user
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Jobs", href: "/jobs" },
        { label: "Mentorship", href: "/mentorship" },
        { label: "Learning", href: "/learning" },
        { label: "My CV", href: "/cv" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Job Board", href: "/jobs-board" },
        { label: "Features", href: "/#features" },
      ];

  const isActive = (href: string) => location.pathname === href;

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoUrl} alt={branding.system_name} className="h-10 w-10" />
          <span className="font-display text-xl font-bold text-foreground">{branding.system_name}</span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive(link.href) ? "text-primary" : "text-muted-foreground"}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/search"><Search size={18} /></Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
              <Button variant="emerald" size="sm" asChild><Link to="/register">Get Started</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 space-y-3">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary">{link.label}</Link>
          ))}
          {user && (
            <>
              <Link to="/search" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary">Search</Link>
              <Link to="/applications" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary">My Applications</Link>
              <Link to="/chat" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary">Messages</Link>
            </>
          )}
          <div className="flex gap-2 pt-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild className="flex-1"><Link to="/profile" onClick={() => setMobileOpen(false)}>Profile</Link></Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex-1">Logout</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="flex-1"><Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link></Button>
                <Button variant="emerald" size="sm" asChild className="flex-1"><Link to="/register" onClick={() => setMobileOpen(false)}>Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
