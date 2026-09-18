import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, User, Settings, LogOut, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import NotificationCenter from "@/components/NotificationCenter";
import { HUBS, detectActiveHub } from "./navigationConfig";
import { HubSwitcher } from "./HubSwitcher";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "My Profile",
  "/jobs": "Job Directory",
  "/job-seeker": "Job Seeker Desk",
  "/applications": "My Applications",
  "/cv": "CV Generator",
  "/learning": "Course Catalog",
  "/learning/creator": "Instructor Studio",
  "/learning/admin": "Curriculum Admin",
  "/cbt-admin": "CBT & Assessments",
  "/verify-certificate": "Verify Certificate",
  "/mentorship": "Mentorship Coaching",
  "/mentorship-marketplace": "Mentor Marketplace",
  "/mentorship-admin": "Mentorship Administration",
  "/community": "Community Feed",
  "/chat": "Direct Messages",
  "/video-meetings": "Virtual Meetings",
  "/search": "Global Search",
  "/admin": "Governance & Admin Panel",
  "/citizen-db": "Citizen Registry",
  "/recruiter": "Recruiter Portal",
  "/recruitment-admin": "Recruitment Pipeline",
  "/recruitment-analytics": "Recruitment Analytics",
  "/talent-marketplace": "Talent Marketplace",
  "/companies": "Company Profiles",
  "/analytics": "Executive Analytics & BI",
  "/smart-match": "Smart Job Match",
  "/ai-coach": "AI Interview Coach",
  "/announcements": "Announcements",
  "/bulk-operations": "Bulk Operations",
  "/notifications": "Notifications",
  "/workflows": "Workflow Approvals",
  "/audit-logs": "Audit Trail Logs",
  "/branding": "Portal Customization",
  "/lga-officer": "LGA Operations Desk",
  "/ward-officer": "Ward Verification Desk",
  "/career-profile": "Career Profile",
};

const DashboardHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const activeHubId = detectActiveHub(location.pathname);
  const currentHub = HUBS[activeHubId];
  const pageTitle = routeTitles[location.pathname] || "Workspace";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
        
        {/* Responsive Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm truncate">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            Home
          </Link>
          
          {activeHubId !== "central" && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <Link
                to={currentHub.defaultPath}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium shrink-0 flex items-center gap-1"
              >
                <currentHub.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{currentHub.shortName}</span>
              </Link>
            </>
          )}

          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="font-semibold text-foreground truncate">{pageTitle}</span>
        </div>

        {/* Mobile Title */}
        <div className="sm:hidden flex items-center gap-1.5 min-w-0">
          <span className="font-display font-semibold text-foreground truncate text-sm">
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Search */}
        <form onSubmit={handleSearch} className="hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 pl-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </form>

        {/* Workspace Quick Switcher in Header */}
        <HubSwitcher variant="header" />

        {/* Notifications */}
        <NotificationCenter />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-xs font-medium truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-3.5 w-3.5" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-3.5 w-3.5" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
