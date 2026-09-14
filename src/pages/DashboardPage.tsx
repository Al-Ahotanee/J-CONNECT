import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, fetchNotifications, fetchMyApplications, fetchMyEnrollments, fetchUserRoles, updateProfile, addEducation } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { hasAnyRole, ROLE_LABELS, getHighestRole, ROLE_BADGE_COLORS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  User, Briefcase, GraduationCap, BookOpen, Award,
  FileText, Bell, ChevronRight, Shield, Users, TrendingUp,
  Clock, CheckCircle, ArrowUpRight, Activity, Database,
  Monitor, UserCheck, Building2, Crown, Network, UserPlus,
  MessageCircle, BarChart3, MapPin, Star,
} from "lucide-react";

// ══════════════════════════════════════════════
// SUPER ADMIN DASHBOARD
// ══════════════════════════════════════════════
const SuperAdminDashboard = ({ user, roles }: { user: any; roles: string[] }) => {
  const highestRole = getHighestRole(roles);
  const { data: allProfiles } = useQuery({
    queryKey: ["adminDashProfiles"], queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, employment_status, gender, lga, approval_status, created_at");
      return data || [];
    }, enabled: !!user,
  });
  const { data: allJobs } = useQuery({
    queryKey: ["adminDashJobs"], queryFn: async () => { const { data } = await supabase.from("jobs").select("id, is_active"); return data || []; }, enabled: !!user,
  });
  const { data: allCourses } = useQuery({
    queryKey: ["adminDashCourses"], queryFn: async () => { const { data } = await supabase.from("courses").select("id"); return data || []; }, enabled: !!user,
  });
  const { data: allMentors } = useQuery({
    queryKey: ["adminDashMentors"], queryFn: async () => { const { data } = await supabase.from("mentors").select("id, is_active"); return data || []; }, enabled: !!user,
  });
  const { data: allRoles } = useQuery({
    queryKey: ["adminDashRoles"], queryFn: async () => { const { data } = await supabase.from("user_roles").select("id, role"); return data || []; }, enabled: !!user,
  });
  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id], queryFn: () => fetchNotifications(user!.id), enabled: !!user,
  });

  const totalUsers = allProfiles?.length || 0;
  const recentRegs = allProfiles?.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)).length || 0;
  const activeJobs = allJobs?.filter(j => j.is_active).length || 0;
  const activeMentors = allMentors?.filter(m => m.is_active).length || 0;
  const admins = allRoles?.filter(r => ["super_admin", "admin", "citizen_db_admin", "mentorship_admin", "recruitment_admin", "cbt_admin", "learning_admin"].includes(r.role)).length || 0;
  const employed = allProfiles?.filter(p => p.employment_status === "Employed").length || 0;
  const unemployed = allProfiles?.filter(p => p.employment_status === "Unemployed").length || 0;
  const male = allProfiles?.filter(p => p.gender === "Male").length || 0;
  const female = allProfiles?.filter(p => p.gender === "Female").length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-5 w-5 text-primary-foreground" />
          <Badge className={`text-[10px] ${ROLE_BADGE_COLORS[highestRole]}`}>{ROLE_LABELS[highestRole]}</Badge>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Admin Command Center</h1>
        <p className="text-primary-foreground/70 mt-1 text-sm">Full system overview and management console.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Citizens", value: totalUsers, icon: Users, sub: `+${recentRegs} this week` },
          { label: "Active Jobs", value: activeJobs, icon: Briefcase, sub: `${allJobs?.length || 0} total` },
          { label: "Courses", value: allCourses?.length || 0, icon: GraduationCap, sub: "Published" },
          { label: "Active Mentors", value: activeMentors, icon: UserCheck, sub: `${allMentors?.length || 0} total` },
          { label: "Admin Users", value: admins, icon: Shield, sub: "All roles" },
          { label: "Citizens (M/F)", value: `${male}/${female}`, icon: User, sub: "Gender split" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Activity className="h-4 w-4" /> Platform Analytics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employment</h3>
                {[{ l: "Employed", v: employed }, { l: "Unemployed", v: unemployed }].map(i => (
                  <div key={i.l}><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{i.l}</span><span className="font-semibold text-foreground">{i.v} ({totalUsers ? Math.round(i.v / totalUsers * 100) : 0}%)</span></div><Progress value={totalUsers ? (i.v / totalUsers) * 100 : 0} className="h-1.5" /></div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</h3>
                {[{ l: "Male", v: male }, { l: "Female", v: female }].map(i => (
                  <div key={i.l}><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{i.l}</span><span className="font-semibold text-foreground">{i.v}</span></div><Progress value={totalUsers ? (i.v / totalUsers) * 100 : 0} className="h-1.5" /></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Network className="h-4 w-4 text-primary" /> System Status</h2>
            {["Authentication", "Database", "File Storage", "Edge Functions"].map(s => (
              <div key={s} className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground">{s}</span><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Operational</span></div>
            ))}
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <div className="flex items-center gap-2 mb-4"><Bell className="h-4 w-4 text-secondary" /><h2 className="font-display text-sm font-semibold text-foreground">Notifications</h2></div>
            {notifications?.slice(0, 5).map(n => (
              <div key={n.id} className="flex items-start gap-2.5 mb-2"><div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-muted-foreground/30" : "bg-secondary"}`} /><div><p className="text-xs text-foreground line-clamp-2">{n.message}</p><span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span></div></div>
            )) || <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// CITIZEN DB ADMIN DASHBOARD
// ══════════════════════════════════════════════
const CitizenDBAdminDashboard = ({ user }: { user: any }) => {
  const { data: profiles } = useQuery({
    queryKey: ["citizenDbDash"], queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, gender, lga, employment_status, created_at, approval_status");
      return data || [];
    }, enabled: !!user,
  });
  const total = profiles?.length || 0;
  const pending = profiles?.filter(p => p.approval_status === "pending").length || 0;
  const recent = profiles?.filter(p => new Date(p.created_at) > new Date(Date.now() - 7 * 86400000)).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6"><Badge className="text-[10px] bg-primary-foreground/20 text-primary-foreground mb-2">Citizen Database Admin</Badge><h1 className="font-display text-2xl font-bold text-primary-foreground">Citizen Database Dashboard</h1><p className="text-primary-foreground/70 text-sm mt-1">Manage, analyze, and communicate with citizens.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Citizens", value: total, icon: Users },
          { label: "Pending Approval", value: pending, icon: Clock },
          { label: "New This Week", value: recent, icon: TrendingUp },
          { label: "Male/Female", value: `${profiles?.filter(p => p.gender === "Male").length || 0}/${profiles?.filter(p => p.gender === "Female").length || 0}`, icon: User },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border"><s.icon className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-display font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/citizen-db" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Database className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Citizen Management</h3><p className="text-xs text-muted-foreground mt-1">Browse, filter, and manage citizen records</p></Link>
        <Link to="/citizen-db?tab=analytics" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><BarChart3 className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Analytics & Reports</h3><p className="text-xs text-muted-foreground mt-1">Demographic analysis and data export</p></Link>
        <Link to="/citizen-db?tab=chat" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><MessageCircle className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Citizen Communication</h3><p className="text-xs text-muted-foreground mt-1">Chat directly with citizens</p></Link>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// MENTORSHIP ADMIN DASHBOARD
// ══════════════════════════════════════════════
const MentorshipAdminDashboard = ({ user }: { user: any }) => {
  const { data: mentors } = useQuery({
    queryKey: ["mentorDash"], queryFn: async () => { const { data } = await supabase.from("mentors").select("id, is_active"); return data || []; }, enabled: !!user,
  });
  const { data: mappings } = useQuery({
    queryKey: ["mappingDash"], queryFn: async () => { const { data } = await supabase.from("mentorship_mappings").select("id, status"); return data || []; }, enabled: !!user,
  });
  const { data: sessions } = useQuery({
    queryKey: ["sessionDash"], queryFn: async () => { const { data } = await supabase.from("mentorship_sessions").select("id, status"); return data || []; }, enabled: !!user,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6"><Badge className="text-[10px] bg-primary-foreground/20 text-primary-foreground mb-2">Mentorship Admin</Badge><h1 className="font-display text-2xl font-bold text-primary-foreground">Mentorship Dashboard</h1><p className="text-primary-foreground/70 text-sm mt-1">Manage mentors, mentees, sessions and analytics.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Mentors", value: mentors?.length || 0, icon: UserCheck },
          { label: "Active Mentors", value: mentors?.filter(m => m.is_active).length || 0, icon: CheckCircle },
          { label: "Active Mappings", value: mappings?.filter(m => m.status === "active").length || 0, icon: Network },
          { label: "Total Sessions", value: sessions?.length || 0, icon: Activity },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border"><s.icon className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-display font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/mentorship-admin" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><UserCheck className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Mentor Management</h3><p className="text-xs text-muted-foreground mt-1">Add, activate/deactivate mentors</p></Link>
        <Link to="/mentorship-admin?tab=mappings" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Users className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Mentee Mappings</h3><p className="text-xs text-muted-foreground mt-1">Review and manage mentor-mentee pairs</p></Link>
        <Link to="/mentorship-admin?tab=reports" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><BarChart3 className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Mentorship Analytics</h3><p className="text-xs text-muted-foreground mt-1">Performance metrics and reports</p></Link>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// RECRUITMENT ADMIN DASHBOARD
// ══════════════════════════════════════════════
const RecruitmentAdminDashboard = ({ user }: { user: any }) => {
  const { data: jobs } = useQuery({
    queryKey: ["recruitAdminDash"], queryFn: async () => { const { data } = await supabase.from("jobs").select("id, is_active, is_internal"); return data || []; }, enabled: !!user,
  });
  const { data: apps } = useQuery({
    queryKey: ["recruitAdminApps"], queryFn: async () => { const { data } = await supabase.from("job_applications").select("id, status"); return data || []; }, enabled: !!user,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6"><Badge className="text-[10px] bg-primary-foreground/20 text-primary-foreground mb-2">Recruitment Admin</Badge><h1 className="font-display text-2xl font-bold text-primary-foreground">Recruitment Dashboard</h1><p className="text-primary-foreground/70 text-sm mt-1">Manage recruiters, jobs, and the hiring pipeline.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: jobs?.length || 0, icon: Briefcase },
          { label: "Active Jobs", value: jobs?.filter(j => j.is_active).length || 0, icon: CheckCircle },
          { label: "Applications", value: apps?.length || 0, icon: FileText },
          { label: "Pending", value: apps?.filter(a => a.status === "pending").length || 0, icon: Clock },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border"><s.icon className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-display font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/recruitment-admin" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Building2 className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Recruiter Management</h3><p className="text-xs text-muted-foreground mt-1">Register and manage recruiters</p></Link>
        <Link to="/recruitment-admin?tab=jobs" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Briefcase className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Job Oversight</h3><p className="text-xs text-muted-foreground mt-1">Review and moderate job postings</p></Link>
        <Link to="/recruitment-analytics" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><BarChart3 className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Recruitment Analytics</h3><p className="text-xs text-muted-foreground mt-1">Pipeline, sector, and hiring data</p></Link>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// GENERIC MODULE ADMIN DASHBOARD (CBT, Learning)
// ══════════════════════════════════════════════
const ModuleAdminDashboard = ({ user, roles }: { user: any; roles: string[] }) => {
  const highestRole = getHighestRole(roles);
  const isCBT = hasAnyRole(roles, ["cbt_admin"]);
  const isLearning = hasAnyRole(roles, ["learning_admin"]);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <Badge className="text-[10px] bg-primary-foreground/20 text-primary-foreground mb-2">{ROLE_LABELS[highestRole]}</Badge>
        <h1 className="font-display text-2xl font-bold text-primary-foreground">{ROLE_LABELS[highestRole]} Dashboard</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Manage your assigned module.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isCBT && (
          <>
            <Link to="/cbt-admin" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Monitor className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Question Bank</h3><p className="text-xs text-muted-foreground mt-1">Manage exam questions and templates</p></Link>
            <Link to="/cbt-admin?tab=exams" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><FileText className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Exam Templates</h3><p className="text-xs text-muted-foreground mt-1">Create and manage exam configurations</p></Link>
          </>
        )}
        {isLearning && (
          <>
            <Link to="/learning/admin" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><BookOpen className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Course Management</h3><p className="text-xs text-muted-foreground mt-1">Manage courses and instructors</p></Link>
            <Link to="/learning/admin?tab=instructors" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><UserCheck className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Instructor Management</h3><p className="text-xs text-muted-foreground mt-1">Register and manage instructors</p></Link>
          </>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// RECRUITER DASHBOARD
// ══════════════════════════════════════════════
const RecruiterDashboardView = ({ user }: { user: any }) => {
  const { data: profile } = useQuery({ queryKey: ["profile", user?.id], queryFn: () => fetchProfile(user!.id), enabled: !!user });
  const { data: jobs } = useQuery({
    queryKey: ["recruiterDashJobs", user?.id], queryFn: async () => {
      const { data } = await supabase.from("jobs").select("*").eq("posted_by", user.id).order("created_at", { ascending: false });
      return data || [];
    }, enabled: !!user,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6">
        <Badge className="text-[10px] bg-primary-foreground/20 text-primary-foreground mb-2">Recruiter</Badge>
        <h1 className="font-display text-2xl font-bold text-primary-foreground">Welcome back, {profile?.full_name || user.email}</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Manage your job postings and candidates.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Jobs", value: jobs?.length || 0, icon: Briefcase },
          { label: "Active Jobs", value: jobs?.filter(j => j.is_active).length || 0, icon: CheckCircle },
          { label: "Total Applicants", value: jobs?.reduce((a, j) => a + (j.applicants_count || 0), 0) || 0, icon: Users },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border"><s.icon className="h-5 w-5 text-primary mb-2" /><div className="text-2xl font-display font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/recruiter" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><Briefcase className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Recruiter Panel</h3><p className="text-xs text-muted-foreground mt-1">Post jobs, manage applicants, conduct hiring</p></Link>
        <Link to="/interview-chat" className="bg-card rounded-xl p-5 shadow-soft border border-border hover:shadow-elevated transition-all"><MessageCircle className="h-5 w-5 text-primary mb-3" /><h3 className="text-sm font-semibold text-foreground">Interview Chat</h3><p className="text-xs text-muted-foreground mt-1">Conduct real-time interviews with candidates</p></Link>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// CITIZEN DASHBOARD
// ══════════════════════════════════════════════
const CitizenDashboard = ({ user }: { user: any }) => {
  const { data: profile } = useQuery({ queryKey: ["profile", user?.id], queryFn: () => fetchProfile(user!.id), enabled: !!user });
  const { data: notifications } = useQuery({ queryKey: ["notifications", user?.id], queryFn: () => fetchNotifications(user!.id), enabled: !!user });
  const { data: applications } = useQuery({ queryKey: ["myApplications", user?.id], queryFn: () => fetchMyApplications(user!.id), enabled: !!user });
  const { data: enrollments } = useQuery({ queryKey: ["myEnrollments", user?.id], queryFn: () => fetchMyEnrollments(user!.id), enabled: !!user });

  const profileCompletion = (() => {
    if (!profile) return 10;
    let score = 10;
    if (profile.full_name) score += 15;
    if (profile.gender) score += 5;
    if (profile.date_of_birth) score += 5;
    if (profile.lga) score += 10;
    if (profile.phone) score += 10;
    if (profile.employment_status) score += 15;
    if (profile.skills?.length) score += 15;
    if (profile.passport_photo_url) score += 15;
    return Math.min(score, 100);
  })();

  const pendingApps = applications?.filter(a => a.status === "pending").length || 0;
  const shortlistedApps = applications?.filter(a => a.status === "shortlisted").length || 0;
  const completedCourses = enrollments?.filter(e => e.completed).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-hero-gradient rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Welcome back, {profile?.full_name?.split(" ")[0] || "User"} 👋</h1>
        <p className="text-primary-foreground/70 mt-1 text-sm">Here's what's happening with your profile today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Applications", value: applications?.length || 0, icon: Briefcase, change: `${pendingApps} pending` },
          { label: "Shortlisted", value: shortlistedApps, icon: CheckCircle, change: "Active" },
          { label: "Courses Enrolled", value: enrollments?.length || 0, icon: BookOpen, change: `${completedCourses} completed` },
          { label: "Profile Score", value: `${profileCompletion}%`, icon: TrendingUp, change: profileCompletion < 100 ? "Incomplete" : "Complete" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {profileCompletion < 100 && (
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <div className="flex items-center justify-between mb-3"><h2 className="font-display text-sm font-semibold text-foreground">Complete Your Profile</h2><span className="text-xs font-bold text-primary">{profileCompletion}%</span></div>
              <Progress value={profileCompletion} className="h-2 mb-3" />
              <Button variant="outline" size="sm" className="mt-2" asChild><Link to="/profile">Complete Profile <ArrowUpRight className="h-3 w-3 ml-1" /></Link></Button>
            </div>
          )}
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: User, label: "Edit Profile", href: "/profile", desc: "Update your information" },
                { icon: Briefcase, label: "Browse Jobs", href: "/jobs", desc: "Find opportunities" },
                { icon: GraduationCap, label: "Find Mentor", href: "/mentorship", desc: "Career guidance" },
                { icon: BookOpen, label: "Start Learning", href: "/learning", desc: "Develop skills" },
                { icon: FileText, label: "Generate CV", href: "/cv", desc: "Professional CV" },
                { icon: Award, label: "Applications", href: "/applications", desc: "Track applications" },
              ].map(a => (
                <Link key={a.label} to={a.href} className="bg-card rounded-xl p-4 shadow-soft border border-border hover:shadow-elevated hover:border-primary/20 transition-all group">
                  <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors"><a.icon className="h-4 w-4 text-primary" /></div>
                  <h3 className="text-sm font-semibold text-foreground">{a.label}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <div className="flex items-center gap-2 mb-4"><Bell className="h-4 w-4 text-secondary" /><h2 className="font-display text-sm font-semibold text-foreground">Notifications</h2></div>
            {notifications?.slice(0, 5).map(n => (
              <div key={n.id} className="flex items-start gap-2.5 mb-2"><div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.is_read ? "bg-muted-foreground/30" : "bg-secondary"}`} /><div><p className="text-xs text-foreground line-clamp-2">{n.message}</p><span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span></div></div>
            )) || <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>}
          </div>
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-4">Activity Summary</h2>
            {[
              { icon: FileText, label: "Total Applications", value: applications?.length || 0 },
              { icon: BookOpen, label: "Courses Enrolled", value: enrollments?.length || 0 },
              { icon: Award, label: "Certificates", value: completedCourses },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground flex items-center gap-2"><i.icon className="h-3.5 w-3.5" /> {i.label}</span><span className="text-sm font-bold text-foreground">{i.value}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// MAIN DASHBOARD ROUTER
// ══════════════════════════════════════════════
const DashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id], queryFn: () => fetchUserRoles(user!.id), enabled: !!user,
  });

  // Apply pending registration data on first login
  useEffect(() => {
    if (!user) return;
    const pending = localStorage.getItem("jconnect_pending_profile");
    if (!pending) return;
    const applyPendingData = async () => {
      try {
        const data = JSON.parse(pending);
        const education = data._education;
        delete data._education;
        // Remove null/empty values
        const profileUpdates: Record<string, any> = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) {
            profileUpdates[k] = v;
          }
        }
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(user.id, profileUpdates);
        }
        // Save education if provided
        if (education?.institution && education?.qualification_type) {
          try {
            await addEducation({
              user_id: user.id,
              institution: education.institution,
              qualification_type: education.qualification_type,
              field_of_study: education.field_of_study || undefined,
              year_of_graduation: education.year_of_graduation || undefined,
              grade: education.grade || undefined,
            });
          } catch { /* ignore duplicate */ }
        }
        localStorage.removeItem("jconnect_pending_profile");
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["education"] });
      } catch {
        localStorage.removeItem("jconnect_pending_profile");
      }
    };
    applyPendingData();
  }, [user, queryClient]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  // Route to role-specific dashboards
  if (hasAnyRole(roles, ["super_admin", "admin"])) return <SuperAdminDashboard user={user} roles={roles} />;
  if (hasAnyRole(roles, ["citizen_db_admin"])) return <CitizenDBAdminDashboard user={user} />;
  if (hasAnyRole(roles, ["mentorship_admin"])) return <MentorshipAdminDashboard user={user} />;
  if (hasAnyRole(roles, ["recruitment_admin"])) return <RecruitmentAdminDashboard user={user} />;
  if (hasAnyRole(roles, ["cbt_admin", "learning_admin"])) return <ModuleAdminDashboard user={user} roles={roles} />;
  if (hasAnyRole(roles, ["recruiter"])) return <RecruiterDashboardView user={user} />;
  if (hasAnyRole(roles, ["lga_officer"])) return <Navigate to="/lga-officer" />;
  if (hasAnyRole(roles, ["ward_officer"])) return <Navigate to="/ward-officer" />;

  return <CitizenDashboard user={user} />;
};

export default DashboardPage;
