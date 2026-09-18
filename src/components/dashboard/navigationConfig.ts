import {
  LayoutDashboard, User, Briefcase, FileText, GraduationCap,
  BookOpen, MessageCircle, Search, Shield, Users, Award,
  ClipboardList, Building2, Database, UserCheck,
  Monitor, BarChart3, Bell, Activity, Paintbrush,
  FolderKanban, UserPlus, FileBarChart, Megaphone,
  Brain, Bot, PieChart, Target, Code, MapPin, Video, ShoppingBag,
  Heart, Globe, Network, Download, Star, CheckSquare, Sparkles,
  Layers, Settings, GitPullRequest, Compass, Home,
} from "lucide-react";
import { hasAnyRole, canAccessAdmin } from "@/lib/roles";

export type HubId = "central" | "learning" | "jobs" | "community" | "governance";

export interface HubMeta {
  id: HubId;
  name: string;
  shortName: string;
  tagline: string;
  icon: any;
  defaultPath: string;
  badgeColor: string;
  accentColor: string;
  description: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  badge?: string;
  roles?: string[]; // If specified, only users with one of these roles see it
  hideForRoles?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const HUBS: Record<HubId, HubMeta> = {
  central: {
    id: "central",
    name: "J-Connect Central",
    shortName: "Central",
    tagline: "Global Command Center",
    icon: Home,
    defaultPath: "/dashboard",
    badgeColor: "bg-primary/10 text-primary border-primary/20",
    accentColor: "text-primary",
    description: "Overview, quick launchpads, unified notifications & personal desk",
  },
  learning: {
    id: "learning",
    name: "E-Learning Academy",
    shortName: "Learning",
    tagline: "Skills, Courses & CBT",
    icon: GraduationCap,
    defaultPath: "/learning",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    accentColor: "text-emerald-500",
    description: "Interactive courses, video lessons, CBT assessments & state accreditation",
  },
  jobs: {
    id: "jobs",
    name: "Jobs & Career Hub",
    shortName: "Careers",
    tagline: "Recruitment & Talent",
    icon: Briefcase,
    defaultPath: "/jobs",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    accentColor: "text-blue-500",
    description: "Public job board, smart matching, AI interview coach & talent pipeline",
  },
  community: {
    id: "community",
    name: "Community & Network",
    shortName: "Community",
    tagline: "Social & Mentorship",
    icon: Globe,
    defaultPath: "/community",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
    accentColor: "text-purple-500",
    description: "Statewide feed, interest hubs, 1-on-1 mentorship & virtual meetups",
  },
  governance: {
    id: "governance",
    name: "Governance & Registry",
    shortName: "Governance",
    tagline: "Executive Administration",
    icon: Shield,
    defaultPath: "/admin",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    accentColor: "text-amber-500",
    description: "Citizen verification registry, approvals queue, audit trail & census analytics",
  },
};

/**
 * Automatically detects the active Hub based on the current pathname.
 */
export function detectActiveHub(pathname: string): HubId {
  // Learning workspace routes
  if (
    pathname.startsWith("/learning") ||
    pathname.startsWith("/course") ||
    pathname.startsWith("/cbt-admin") ||
    pathname.startsWith("/verify-certificate")
  ) {
    return "learning";
  }

  // Jobs & Recruitment workspace routes
  if (
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/job-seeker") ||
    pathname.startsWith("/applications") ||
    pathname.startsWith("/interview-chat") ||
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/recruitment-admin") ||
    pathname.startsWith("/recruitment-analytics") ||
    pathname.startsWith("/smart-match") ||
    pathname.startsWith("/ai-coach") ||
    pathname.startsWith("/cv") ||
    pathname.startsWith("/career-profile") ||
    pathname.startsWith("/talent-marketplace") ||
    pathname.startsWith("/companies")
  ) {
    return "jobs";
  }

  // Community & Social workspace routes
  if (
    pathname.startsWith("/community") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/mentorship") ||
    pathname.startsWith("/video-meetings")
  ) {
    return "community";
  }

  // Governance & Admin workspace routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/citizen-db") ||
    pathname.startsWith("/workflows") ||
    pathname.startsWith("/audit-logs") ||
    pathname.startsWith("/bulk-operations") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/announcements") ||
    pathname.startsWith("/lga-officer") ||
    pathname.startsWith("/ward-officer")
  ) {
    return "governance";
  }

  // Fallback to Central Command Center
  return "central";
}

/**
 * Returns contextual menu groups tailored to the active hub and the user's roles.
 */
export function getHubNavigation(hubId: HubId, roles: string[]): NavGroup[] {
  const isAdmin = hasAnyRole(roles, ["super_admin", "admin", "ministry_admin"]);
  const isInstructor = hasAnyRole(roles, ["instructor", "course_creator"]) || isAdmin;
  const isRecruiter = hasAnyRole(roles, ["recruiter", "psb_recruiter", "subeb_recruiter", "employer"]) || isAdmin;
  const isMentor = hasAnyRole(roles, ["mentor"]) || isAdmin;
  const isCBTAdmin = hasAnyRole(roles, ["cbt_admin", "cbt_assessor"]) || isAdmin;
  const isCitizenDBAdmin = hasAnyRole(roles, ["citizen_db_admin", "cadre_reviewer"]) || isAdmin;
  const isOfficer = hasAnyRole(roles, ["lga_officer", "lga_admin", "ward_officer", "ward_admin"]) || isAdmin;

  switch (hubId) {
    // ═══════════════════════════════════════════════════════
    // 1. E-LEARNING WORKSPACE
    // ═══════════════════════════════════════════════════════
    case "learning": {
      const groups: NavGroup[] = [
        {
          label: "Learner Desk",
          items: [
            { title: "Course Catalog", url: "/learning", icon: BookOpen },
            { title: "CBT & Assessments", url: "/cbt-admin", icon: Monitor },
            { title: "Verify Certificate", url: "/verify-certificate", icon: Award },
          ],
        },
      ];

      if (isInstructor) {
        groups.push({
          label: "Creator Studio",
          items: [
            { title: "Instructor Studio", url: "/learning/creator", icon: Sparkles },
            { title: "Curriculum Admin", url: "/learning/admin", icon: Layers },
          ],
        });
      }

      return groups;
    }

    // ═══════════════════════════════════════════════════════
    // 2. JOBS & CAREER WORKSPACE
    // ═══════════════════════════════════════════════════════
    case "jobs": {
      const groups: NavGroup[] = [
        {
          label: "Candidate Desk",
          items: [
            { title: "Job Directory", url: "/jobs", icon: Search },
            { title: "My Applications", url: "/applications", icon: FileText },
            { title: "AI Interview Coach", url: "/ai-coach", icon: Bot },
            { title: "Smart Job Match", url: "/smart-match", icon: Target },
            { title: "Smart CV Generator", url: "/cv", icon: FileBarChart },
            { title: "Career Profile", url: "/career-profile", icon: User },
          ],
        },
      ];

      if (isRecruiter) {
        groups.push({
          label: "Recruiter Studio",
          items: [
            { title: "Recruiter Portal", url: "/recruiter", icon: Building2 },
            { title: "Candidate Pipeline", url: "/recruitment-admin", icon: FolderKanban },
            { title: "Recruitment BI", url: "/recruitment-analytics", icon: PieChart },
            { title: "Talent Marketplace", url: "/talent-marketplace", icon: Users },
            { title: "Company Profiles", url: "/companies", icon: Building2 },
          ],
        });
      }

      return groups;
    }

    // ═══════════════════════════════════════════════════════
    // 3. COMMUNITY & NETWORK WORKSPACE
    // ═══════════════════════════════════════════════════════
    case "community": {
      const groups: NavGroup[] = [
        {
          label: "Community Feed",
          items: [
            { title: "Community Feed", url: "/community", icon: Globe },
            { title: "Direct Chatrooms", url: "/chat", icon: MessageCircle },
            { title: "Video Meetings", url: "/video-meetings", icon: Video },
          ],
        },
        {
          label: "Mentorship",
          items: [
            { title: "Find a Mentor", url: "/mentorship-marketplace", icon: ShoppingBag },
            { title: "My Coaching Track", url: "/mentorship", icon: Award },
          ],
        },
      ];

      if (isAdmin || hasAnyRole(roles, ["mentorship_admin"])) {
        groups.push({
          label: "Administration",
          items: [
            { title: "Mentorship Admin", url: "/mentorship-admin", icon: UserCheck },
          ],
        });
      }

      return groups;
    }

    // ═══════════════════════════════════════════════════════
    // 4. GOVERNANCE & REGISTRY WORKSPACE
    // ═══════════════════════════════════════════════════════
    case "governance": {
      const groups: NavGroup[] = [
        {
          label: "Command & Control",
          items: [
            { title: "Executive Overview", url: "/admin", icon: Activity },
            { title: "Analytics & BI", url: "/analytics", icon: PieChart },
            { title: "Announcements", url: "/announcements", icon: Megaphone },
          ],
        },
        {
          label: "Identity & Workflows",
          items: [
            { title: "Citizen Registry", url: "/citizen-db", icon: Database },
            { title: "Approvals Queue", url: "/workflows", icon: GitPullRequest },
            { title: "Audit Trail", url: "/audit-logs", icon: Shield },
            { title: "Bulk Operations", url: "/bulk-operations", icon: ClipboardList },
          ],
        },
      ];

      if (isOfficer || isAdmin) {
        groups.push({
          label: "Grassroots Field Operations",
          items: [
            { title: "LGA Operations Desk", url: "/lga-officer", icon: MapPin },
            { title: "Ward Verification Desk", url: "/ward-officer", icon: CheckSquare },
          ],
        });
      }

      if (isAdmin) {
        groups.push({
          label: "System Configuration",
          items: [
            { title: "Branding & Portal", url: "/branding", icon: Paintbrush },
          ],
        });
      }

      return groups;
    }

    // ═══════════════════════════════════════════════════════
    // 5. J-CONNECT CENTRAL (HOME DASHBOARD)
    // ═══════════════════════════════════════════════════════
    case "central":
    default: {
      const groups: NavGroup[] = [
        {
          label: "Launchpads",
          items: [
            { title: "Main Dashboard", url: "/dashboard", icon: LayoutDashboard },
            { title: "My Profile", url: "/profile", icon: User },
            { title: "Notifications", url: "/notifications", icon: Bell },
            { title: "Quick Search", url: "/search", icon: Search },
          ],
        },
        {
          label: "Quick Workspaces",
          items: [
            { title: "E-Learning Academy", url: "/learning", icon: GraduationCap },
            { title: "Jobs & Careers", url: "/jobs", icon: Briefcase },
            { title: "Community Network", url: "/community", icon: Globe },
          ],
        },
      ];

      if (canAccessAdmin(roles)) {
        groups.push({
          label: "Administration",
          items: [
            { title: "Governance & Registry", url: "/admin", icon: Shield },
          ],
        });
      }

      return groups;
    }
  }
}
