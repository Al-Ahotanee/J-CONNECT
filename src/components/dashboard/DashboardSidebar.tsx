import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import {
  ROLE_LABELS, getHighestRole, hasAnyRole, canAccessAdmin,
} from "@/lib/roles";
import { useBranding, useLogoUrl } from "@/hooks/useBranding";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, User, Briefcase, FileText, GraduationCap,
  BookOpen, MessageCircle, Search, Shield, Users, Award,
  ClipboardList, LogOut, Building2, Database, UserCheck,
  Monitor, BarChart3, Bell, Activity, Paintbrush,
  FolderKanban, UserPlus, FileBarChart, Megaphone,
  Brain, Bot, PieChart, Target, Code, MapPin, Video, ShoppingBag,
  Heart, Globe, Network, Download, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const branding = useBranding();
  const logoUrl = useLogoUrl();

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isActive = (path: string) => location.pathname === path;
  const highestRole = getHighestRole(roles);

  const isAdmin = hasAnyRole(roles, ["super_admin", "admin", "ministry_admin", "audit_compliance"]);
  const isCitizenDBAdmin = hasAnyRole(roles, ["citizen_db_admin", "cadre_reviewer"]);
  const isMentorshipAdmin = hasAnyRole(roles, ["mentorship_admin"]);
  const isRecruitmentAdmin = hasAnyRole(roles, ["recruitment_admin"]);
  const isCBTAdmin = hasAnyRole(roles, ["cbt_admin", "cbt_assessor"]);
  const isLearningAdmin = hasAnyRole(roles, ["learning_admin"]);
  const isRecruiter = hasAnyRole(roles, ["recruiter", "psb_recruiter", "subeb_recruiter", "employer"]);
  const isInstructor = hasAnyRole(roles, ["instructor", "course_creator"]);
  const isMentor = hasAnyRole(roles, ["mentor"]);
  const isLGAOfficer = hasAnyRole(roles, ["lga_officer", "lga_admin"]);
  const isWardOfficer = hasAnyRole(roles, ["ward_officer", "ward_admin"]);
  const isModuleAdmin = isCitizenDBAdmin || isMentorshipAdmin || isRecruitmentAdmin || isCBTAdmin || isLearningAdmin;
  const isStakeholder = isRecruiter || isInstructor || isMentor;
  const isCitizenOnly = !isAdmin && !isModuleAdmin && !isStakeholder && !isLGAOfficer && !isWardOfficer;

  const renderMenuItems = (items: { title: string; url: string; icon: any }[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url + item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <Link to={item.url} className="flex items-center gap-3">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderGroup = (label: string, items: { title: string; url: string; icon: any }[]) => {
    if (!items.length) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-body font-semibold">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(items)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={logoUrl} alt={branding.system_name} className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-sidebar-foreground leading-tight">{branding.system_name}</span>
              <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">{branding.tagline.split(" ").slice(0, 2).join(" ")}</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* ═══════════════════════════════════════════ */}
        {/* SUPER ADMIN / SYSTEM ADMIN                 */}
        {/* ═══════════════════════════════════════════ */}
        {isAdmin && (
          <>
            {renderGroup("Command Center", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "System Overview", url: "/admin", icon: Activity },
              { title: "Analytics & BI", url: "/analytics", icon: PieChart },
              { title: "User Management", url: "/admin?tab=users", icon: Users },
              { title: "Role Management", url: "/admin?tab=roles", icon: Shield },
            ])}
            {renderGroup("Module Management", [
              { title: "Citizen Database", url: "/citizen-db", icon: Database },
              { title: "Recruitment", url: "/recruitment-admin", icon: Briefcase },
              { title: "Recruitment Analytics", url: "/recruitment-analytics", icon: PieChart },
              { title: "Talent Marketplace", url: "/talent-marketplace", icon: Target },
              { title: "Companies", url: "/companies", icon: Building2 },
              { title: "E-Learning", url: "/learning/admin", icon: GraduationCap },
              { title: "Mentorship", url: "/mentorship-admin", icon: UserCheck },
              { title: "Mentorship Market", url: "/mentorship-marketplace", icon: ShoppingBag },
              { title: "CBT Administration", url: "/cbt-admin", icon: Monitor },
              { title: "Video Meetings", url: "/video-meetings", icon: Video },
            ])}
            {renderGroup("Operations", [
              { title: "Announcements", url: "/announcements", icon: Megaphone },
              { title: "Bulk Operations", url: "/bulk-operations", icon: UserPlus },
              { title: "Workflows", url: "/workflows", icon: FolderKanban },
              { title: "Audit Logs", url: "/audit-logs", icon: FileBarChart },
              { title: "Notifications", url: "/notifications", icon: Bell },
              { title: "Branding", url: "/branding", icon: Paintbrush },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* CITIZEN DATABASE ADMIN                     */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && isCitizenDBAdmin && (
          <>
            {renderGroup("Citizen Database", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Citizen Management", url: "/citizen-db", icon: Database },
              { title: "Citizen Analytics", url: "/citizen-db?tab=analytics", icon: BarChart3 },
              { title: "Reports & Export", url: "/citizen-db?tab=analytics", icon: Download },
              { title: "Register Citizens", url: "/bulk-operations", icon: UserPlus },
              { title: "Register Officers", url: "/citizen-db", icon: MapPin },
            ])}
            {renderGroup("Communication", [
              { title: "Citizen Chat", url: "/citizen-db?tab=chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* MENTORSHIP ADMIN                           */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && isMentorshipAdmin && (
          <>
            {renderGroup("Mentorship Management", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Mentor Management", url: "/mentorship-admin", icon: UserCheck },
              { title: "Mentee Management", url: "/mentorship-admin?tab=mappings", icon: Users },
              { title: "Mentorship Requests", url: "/mentorship-admin?tab=requests", icon: ClipboardList },
              { title: "Session Management", url: "/mentorship-admin?tab=sessions", icon: Video },
              { title: "Marketplace Oversight", url: "/mentorship-marketplace", icon: ShoppingBag },
              { title: "Group Chatrooms", url: "/mentorship-admin?tab=chatrooms", icon: MessageCircle },
              { title: "Mentorship Analytics", url: "/mentorship-admin?tab=reports", icon: BarChart3 },
            ])}
            {renderGroup("Communication", [
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* RECRUITMENT ADMIN                          */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && isRecruitmentAdmin && (
          <>
            {renderGroup("Recruitment Management", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Recruiter Management", url: "/recruitment-admin", icon: Building2 },
              { title: "Job Postings", url: "/recruitment-admin?tab=jobs", icon: Briefcase },
              { title: "Recruitment Analytics", url: "/recruitment-analytics", icon: PieChart },
              { title: "Talent Marketplace", url: "/talent-marketplace", icon: Target },
              { title: "Company Profiles", url: "/companies", icon: Globe },
              { title: "Video Interviews", url: "/video-meetings", icon: Video },
            ])}
            {renderGroup("Communication", [
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* CBT ADMIN                                  */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && isCBTAdmin && (
          <>
            {renderGroup("CBT Administration", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Question Bank", url: "/cbt-admin", icon: Monitor },
              { title: "Exam Templates", url: "/cbt-admin?tab=exams", icon: FileText },
              { title: "Exam Analytics", url: "/cbt-admin?tab=analytics", icon: BarChart3 },
            ])}
            {renderGroup("Communication", [
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* E-LEARNING ADMIN                           */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && isLearningAdmin && (
          <>
            {renderGroup("E-Learning Management", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Course Management", url: "/learning/admin", icon: BookOpen },
              { title: "Instructor Management", url: "/learning/admin?tab=instructors", icon: UserCheck },
              { title: "Enrollment Analytics", url: "/learning/admin?tab=analytics", icon: BarChart3 },
              { title: "Certificates", url: "/learning/admin?tab=certificates", icon: Award },
            ])}
            {renderGroup("Communication", [
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* LGA OFFICER                                */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && !isModuleAdmin && isLGAOfficer && (
          renderGroup("LGA Management", [
            { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
            { title: "LGA Citizens", url: "/lga-officer", icon: MapPin },
            { title: "Register Citizens", url: "/lga-officer", icon: UserPlus },
            { title: "Messages", url: "/chat", icon: MessageCircle },
            { title: "Notifications", url: "/notifications", icon: Bell },
          ])
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* WARD OFFICER                               */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && !isModuleAdmin && !isLGAOfficer && isWardOfficer && (
          renderGroup("Ward Management", [
            { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
            { title: "Ward Registry", url: "/ward-officer", icon: MapPin },
            { title: "Register Citizens", url: "/ward-officer", icon: UserPlus },
            { title: "Messages", url: "/chat", icon: MessageCircle },
            { title: "Notifications", url: "/notifications", icon: Bell },
          ])
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* RECRUITER / MENTOR / INSTRUCTOR            */}
        {/* ═══════════════════════════════════════════ */}
        {!isAdmin && !isModuleAdmin && !isLGAOfficer && !isWardOfficer && isStakeholder && (
          <>
            {isRecruiter && renderGroup("Recruiter Panel", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Recruiter Panel", url: "/recruiter", icon: Building2 },
              { title: "My Job Posts", url: "/jobs", icon: Briefcase },
              { title: "Talent Search", url: "/talent-marketplace", icon: Target },
              { title: "Applications", url: "/applications", icon: ClipboardList },
              { title: "Company Profile", url: "/companies", icon: Building2 },
              { title: "Video Meetings", url: "/video-meetings", icon: Video },
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
            {isInstructor && renderGroup("Creator Studio", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "Creator Studio", url: "/learning/creator", icon: BookOpen },
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
            {isMentor && renderGroup("Mentorship", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "My Mentees", url: "/mentorship", icon: Award },
              { title: "Marketplace", url: "/mentorship-marketplace", icon: ShoppingBag },
              { title: "Video Meetings", url: "/video-meetings", icon: Video },
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* CITIZEN                                    */}
        {/* ═══════════════════════════════════════════ */}
        {isCitizenOnly && (
          <>
            {renderGroup("Main Menu", [
              { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
              { title: "My Profile", url: "/profile", icon: User },
              { title: "Search", url: "/search", icon: Search },
            ])}
            {renderGroup("Jobs & Career", [
              { title: "Job Seeker Hub", url: "/job-seeker", icon: Briefcase },
              { title: "Career Profile", url: "/career-profile", icon: Code },
              { title: "Smart Job Match", url: "/smart-match", icon: Brain },
              { title: "Browse Jobs", url: "/jobs", icon: FolderKanban },
              { title: "Companies", url: "/companies", icon: Building2 },
              { title: "My Applications", url: "/applications", icon: ClipboardList },
              { title: "AI Interview Coach", url: "/ai-coach", icon: Bot },
              { title: "CV Generator", url: "/cv", icon: FileText },
            ])}
            {renderGroup("Learning & Social", [
              { title: "E-Learning", url: "/learning", icon: BookOpen },
              { title: "Mentorship", url: "/mentorship", icon: Award },
              { title: "Mentor Marketplace", url: "/mentorship-marketplace", icon: ShoppingBag },
              { title: "Community", url: "/community", icon: Heart },
              { title: "Video Meetings", url: "/video-meetings", icon: Video },
              { title: "Messages", url: "/chat", icon: MessageCircle },
              { title: "Notifications", url: "/notifications", icon: Bell },
            ])}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary-foreground text-xs font-bold">{user?.email?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize">{ROLE_LABELS[highestRole] || "Citizen"}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0" onClick={() => signOut()}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => signOut()} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
