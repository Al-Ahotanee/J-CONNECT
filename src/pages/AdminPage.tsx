import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllProfiles, adminUpdateProfile, fetchUserRoles, fetchJobs, updateJob, fetchCourses, createJob } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  AppRole, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_COLORS,
  USER_TYPE_LABELS, UserType, canAccessAdmin, canManageCitizens,
  canManageJobs, canManageCourses, canManageMentors, canManageCBT,
  canAssignRoles, getAssignableRoles, hasAnyRole, getHighestRole,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { JIGAWA_LGAS, SECTORS, EMPLOYMENT_STATUSES, QUALIFICATION_TYPES, SENATORIAL_ZONES, SKILL_CATEGORIES } from "@/lib/constants";
import {
  Search, Download, Users, Briefcase, BarChart3, Filter, FileText, Eye,
  CheckCircle, XCircle, Shield, BookOpen, GraduationCap, Plus, UserCog,
  TrendingUp, Building2, Award, Trash2, Monitor, Database, Crown,
  UserCheck, Network, UserPlus, PieChart,
} from "lucide-react";
import AdvancedReporting from "@/components/admin/AdvancedReporting";
import { toast } from "sonner";

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "overview";

  const [search, setSearch] = useState("");
  const [lga, setLga] = useState("");
  const [gender, setGender] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [sector, setSector] = useState("");
  const [qualification, setQualification] = useState("");
  const [senatorialZone, setSenatorialZone] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleUserId, setRoleUserId] = useState("");
  const [roleToAssign, setRoleToAssign] = useState("");
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "", description: "", company: "", location: "", lga: "",
    sector: "", employment_type: "Full-time", qualification_required: "",
    experience_level: "", salary_range: "", deadline: "", skills: "",
  });
  const [newCourse, setNewCourse] = useState({ title: "", description: "", category: "", level: "Beginner", duration: "", is_free: true });
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newMentor, setNewMentor] = useState({ user_email: "", category: "", specialization: "", bio: "", years_of_experience: "" });
  const [showCreateMentor, setShowCreateMentor] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "", password: "", full_name: "", phone: "", lga: "", gender: "", role: "user",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const hasAccess = canAccessAdmin(roles);
  const isSuperAdmin = hasAnyRole(roles, ["super_admin"]);
  const highestRole = getHighestRole(roles);
  const assignableRoles = getAssignableRoles(roles);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["allProfiles", { search, lga, gender, employment_status: employmentStatus, sector, qualification, senatorialZone, ageMin, ageMax }],
    queryFn: () => fetchAllProfiles({ search: search || undefined, lga: lga || undefined, gender: gender || undefined, employment_status: employmentStatus || undefined, sector: sector || undefined, qualification: qualification || undefined, senatorial_zone: senatorialZone || undefined, age_min: ageMin ? parseInt(ageMin) : undefined, age_max: ageMax ? parseInt(ageMax) : undefined }),
    enabled: !!user && hasAccess,
  });

  const { data: allJobs } = useQuery({
    queryKey: ["adminJobs"],
    queryFn: () => fetchJobs(),
    enabled: !!user && canManageJobs(roles),
  });

  const { data: allCourses } = useQuery({
    queryKey: ["adminCourses"],
    queryFn: () => fetchCourses(),
    enabled: !!user && canManageCourses(roles),
  });

  // Fetch all user roles for the role management tab
  const { data: allUserRoles } = useQuery({
    queryKey: ["allUserRolesAdmin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && canAssignRoles(roles),
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !hasAccess) return <Navigate to="/dashboard" />;

  const stats = {
    total: profiles?.length || 0,
    employed: profiles?.filter(p => p.employment_status === "Employed").length || 0,
    unemployed: profiles?.filter(p => p.employment_status === "Unemployed").length || 0,
    selfEmployed: profiles?.filter(p => p.employment_status === "Self-employed").length || 0,
    male: profiles?.filter(p => p.gender === "Male").length || 0,
    female: profiles?.filter(p => p.gender === "Female").length || 0,
    jobs: allJobs?.length || 0,
    courses: allCourses?.length || 0,
  };

  const exportCSV = () => {
    if (!profiles?.length) return;
    const headers = ["Full Name","Gender","LGA","Phone","Email","Employment Status","Sector","User Type"];
    const rows = profiles.map(p => [p.full_name, p.gender||"", p.lga||"", p.phone||"", p.email||"", p.employment_status||"", p.sector||"", (p as any).user_type||""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `jconnect-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportPrintable = () => {
    if (!profiles?.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `<!DOCTYPE html><html><head><title>J-Connect Report</title>
    <style>body{font-family:Arial;margin:20px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
    th{background:#1a5c2e;color:white}h1{color:#1a5c2e;font-size:18px}
    .meta{color:#666;font-size:12px;margin-bottom:16px}</style></head>
    <body><h1>J-Connect — Citizen Report</h1>
    <p class="meta">Generated: ${new Date().toLocaleString()} | Total: ${profiles.length}</p>
    <table><tr><th>Name</th><th>Gender</th><th>LGA</th><th>Phone</th><th>Email</th><th>Status</th><th>Sector</th></tr>
    ${profiles.map(p => `<tr><td>${p.full_name}</td><td>${p.gender||""}</td><td>${p.lga||""}</td><td>${p.phone||""}</td><td>${p.email||""}</td><td>${p.employment_status||""}</td><td>${p.sector||""}</td></tr>`).join("")}
    </table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleApprove = async (profileId: string, status: string) => {
    try {
      await adminUpdateProfile(profileId, { approval_status: status });
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      toast.success(`Profile ${status}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAssignRole = async () => {
    if (!roleUserId || !roleToAssign) { toast.error("Select a user and role"); return; }
    const profile = profiles?.find(p => p.id === roleUserId);
    if (!profile) { toast.error("Profile not found"); return; }
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: roleToAssign as any });
      if (error) {
        if (error.message?.includes("duplicate")) toast.error("User already has this role");
        else throw error;
      } else {
        toast.success(`Role "${ROLE_LABELS[roleToAssign as AppRole] || roleToAssign}" assigned to ${profile.full_name}`);
        queryClient.invalidateQueries({ queryKey: ["allUserRolesAdmin"] });
        setRoleUserId(""); setRoleToAssign("");
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRemoveRole = async (id: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["allUserRolesAdmin"] });
      toast.success("Role removed");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.company) { toast.error("Title, description, and company required"); return; }
    try {
      await createJob({
        posted_by: user.id, title: newJob.title, description: newJob.description, company: newJob.company,
        location: newJob.location || undefined, lga: newJob.lga || undefined, sector: newJob.sector || undefined,
        employment_type: newJob.employment_type || undefined, qualification_required: newJob.qualification_required || undefined,
        experience_level: newJob.experience_level || undefined, salary_range: newJob.salary_range || undefined,
        deadline: newJob.deadline || undefined,
        skills_required: newJob.skills ? newJob.skills.split(",").map(s => s.trim()) : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      setShowCreateJob(false);
      setNewJob({ title: "", description: "", company: "", location: "", lga: "", sector: "", employment_type: "Full-time", qualification_required: "", experience_level: "", salary_range: "", deadline: "", skills: "" });
      toast.success("Job created!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateCourse = async () => {
    try {
      const { error } = await supabase.from("courses").insert({
        title: newCourse.title, description: newCourse.description || null, category: newCourse.category || null,
        level: newCourse.level, duration: newCourse.duration || null, is_free: newCourse.is_free, is_published: true, instructor_id: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
      setShowCreateCourse(false);
      setNewCourse({ title: "", description: "", category: "", level: "Beginner", duration: "", is_free: true });
      toast.success("Course created!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateMentor = async () => {
    if (!newMentor.user_email || !newMentor.category) { toast.error("Email and category required"); return; }
    try {
      const { data: mentorProfile, error: findErr } = await supabase
        .from("profiles").select("user_id, full_name").eq("email", newMentor.user_email).single();
      if (findErr || !mentorProfile) { toast.error("User not found with that email"); return; }
      const { error } = await supabase.from("mentors").insert({
        user_id: mentorProfile.user_id, category: newMentor.category,
        specialization: newMentor.specialization || null, bio: newMentor.bio || null,
        years_of_experience: newMentor.years_of_experience ? parseInt(newMentor.years_of_experience) : null, is_active: true,
      });
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: mentorProfile.user_id, role: "mentor" as any }).select();
      queryClient.invalidateQueries({ queryKey: ["mentors"] });
      setShowCreateMentor(false);
      setNewMentor({ user_email: "", category: "", specialization: "", bio: "", years_of_experience: "" });
      toast.success(`${mentorProfile.full_name} added as mentor!`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleJob = async (jobId: string, isActive: boolean) => {
    try {
      await updateJob(jobId, { is_active: !isActive });
      queryClient.invalidateQueries({ queryKey: ["adminJobs"] });
      toast.success(`Job ${isActive ? "deactivated" : "activated"}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error("Email, password, and full name are required");
      return;
    }
    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone || undefined,
          lga: newUser.lga || undefined,
          gender: newUser.gender || undefined,
          role: newUser.role !== "user" ? newUser.role : undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`User "${newUser.full_name}" created successfully!`);
      setShowCreateUser(false);
      setNewUser({ email: "", password: "", full_name: "", phone: "", lga: "", gender: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["allUserRolesAdmin"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const updateNewJob = (key: string, value: string) => setNewJob(prev => ({ ...prev, [key]: value }));

  // Build role assignments grouped by user
  const rolesByUser = new Map<string, { roles: { id: string; role: string }[]; profile?: any }>();
  if (allUserRoles && profiles) {
    for (const ur of allUserRoles) {
      if (!rolesByUser.has(ur.user_id)) {
        const profile = profiles.find(p => p.user_id === ur.user_id);
        rolesByUser.set(ur.user_id, { roles: [], profile });
      }
      rolesByUser.get(ur.user_id)!.roles.push({ id: ur.id, role: ur.role });
    }
  }

  // Determine visible tabs based on role
  const visibleTabs: { value: string; label: string; icon: any }[] = [];
  if (isSuperAdmin || hasAnyRole(roles, ["admin"])) {
    visibleTabs.push({ value: "overview", label: "Overview", icon: BarChart3 });
  }
  if (canManageCitizens(roles)) {
    visibleTabs.push({ value: "users", label: "Citizens", icon: Users });
  }
  if (canAssignRoles(roles)) {
    visibleTabs.push({ value: "roles", label: "Roles & Users", icon: Shield });
  }
  if (canManageJobs(roles)) {
    visibleTabs.push({ value: "jobs", label: "Jobs", icon: Briefcase });
  }
  if (canManageCourses(roles)) {
    visibleTabs.push({ value: "courses", label: "Courses", icon: BookOpen });
  }
  if (canManageMentors(roles)) {
    visibleTabs.push({ value: "mentors", label: "Mentors", icon: GraduationCap });
  }
  if (canManageCBT(roles)) {
    visibleTabs.push({ value: "cbt", label: "CBT Exams", icon: Monitor });
  }
  if (isSuperAdmin || hasAnyRole(roles, ["admin"])) {
    visibleTabs.push({ value: "analytics", label: "Reports & Analytics", icon: PieChart });
  }

  const activeTab = visibleTabs.find(t => t.value === defaultTab) ? defaultTab : visibleTabs[0]?.value || "overview";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Administration</h1>
            <Badge className={`text-[10px] h-5 ${ROLE_BADGE_COLORS[highestRole] || ""}`}>
              {ROLE_LABELS[highestRole]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ROLE_DESCRIPTIONS[highestRole]}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPrintable} disabled={!profiles?.length}>
            <FileText className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="gold" size="sm" onClick={exportCSV} disabled={!profiles?.length}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab}>
        <TabsList className="flex-wrap">
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-3.5 w-3.5 mr-1" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Total Citizens", value: stats.total, icon: Users, color: "bg-primary" },
              { label: "Employed", value: stats.employed, icon: TrendingUp, color: "bg-primary" },
              { label: "Unemployed", value: stats.unemployed, icon: BarChart3, color: "bg-destructive" },
              { label: "Self-Employed", value: stats.selfEmployed, icon: Building2, color: "bg-secondary" },
              { label: "Male", value: stats.male, icon: Users, color: "bg-primary" },
              { label: "Female", value: stats.female, icon: Users, color: "bg-secondary" },
              { label: "Jobs", value: stats.jobs, icon: Briefcase, color: "bg-primary" },
              { label: "Courses", value: stats.courses, icon: BookOpen, color: "bg-secondary" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-3.5 shadow-soft border border-border text-center">
                <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-lg font-display font-bold text-foreground">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Role Hierarchy Visualization */}
          {isSuperAdmin && (
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h2 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Network className="h-4 w-4" /> Role Hierarchy
              </h2>
              <div className="space-y-3">
                {/* Super Admin */}
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-red-500" />
                  <Badge className={ROLE_BADGE_COLORS.super_admin}>Super Admin</Badge>
                  <span className="text-[10px] text-muted-foreground">— Full platform control</span>
                </div>
                {/* Module Admins */}
                <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
                  {(["citizen_db_admin", "mentorship_admin", "recruitment_admin", "cbt_admin", "learning_admin"] as AppRole[]).map(role => {
                    const count = allUserRoles?.filter(r => r.role === role).length || 0;
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ROLE_BADGE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                        <span className="text-[10px] text-muted-foreground">{count} assigned</span>
                      </div>
                    );
                  })}
                </div>
                {/* Regional Officers */}
                <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
                  {(["lga_officer", "ward_officer"] as AppRole[]).map(role => {
                    const count = allUserRoles?.filter(r => r.role === role).length || 0;
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ROLE_BADGE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                        <span className="text-[10px] text-muted-foreground">{count} assigned</span>
                      </div>
                    );
                  })}
                </div>
                {/* External Stakeholders */}
                <div className="ml-6 space-y-2 border-l-2 border-border pl-4">
                  {(["recruiter", "mentor", "instructor"] as AppRole[]).map(role => {
                    const count = allUserRoles?.filter(r => r.role === role).length || 0;
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${ROLE_BADGE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                        <span className="text-[10px] text-muted-foreground">{count} assigned</span>
                      </div>
                    );
                  })}
                </div>
                {/* General Users */}
                <div className="ml-6 border-l-2 border-border pl-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${ROLE_BADGE_COLORS.user}`}>{ROLE_LABELS.user}</Badge>
                    <span className="text-[10px] text-muted-foreground">{allUserRoles?.filter(r => r.role === "user").length || 0} citizens</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Citizens Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-3.5 w-3.5" /> {showFilters ? "Hide" : "Show"} Filters
              </Button>
              <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                <DialogTrigger asChild>
                  <Button variant="emerald" size="sm"><UserPlus className="h-3.5 w-3.5" /> Create User</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle className="font-display">Create New User</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Full Name *</Label>
                      <Input value={newUser.full_name} onChange={(e) => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="Enter full name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email *</Label>
                      <Input type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@email.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Password *</Label>
                      <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input value={newUser.phone} onChange={(e) => setNewUser(p => ({ ...p, phone: e.target.value }))} placeholder="08012345678" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Gender</Label>
                      <Select value={newUser.gender} onValueChange={(v) => setNewUser(p => ({ ...p, gender: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">LGA</Label>
                      <Select value={newUser.lga} onValueChange={(v) => setNewUser(p => ({ ...p, lga: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select LGA" /></SelectTrigger>
                        <SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Assign Role</Label>
                      <Select value={newUser.role} onValueChange={(v) => setNewUser(p => ({ ...p, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Citizen (Default)</SelectItem>
                          {assignableRoles.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="emerald" className="w-full mt-3" onClick={handleCreateUser} disabled={creatingUser || !newUser.email || !newUser.password || !newUser.full_name}>
                    {creatingUser ? "Creating..." : "Create User"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-border">
                <Select value={lga} onValueChange={setLga}><SelectTrigger className="text-xs"><SelectValue placeholder="All LGAs" /></SelectTrigger><SelectContent>{[<SelectItem key="all" value="all">All LGAs</SelectItem>, ...JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)]}</SelectContent></Select>
                <Select value={gender} onValueChange={setGender}><SelectTrigger className="text-xs"><SelectValue placeholder="Gender" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
                <Select value={employmentStatus} onValueChange={setEmploymentStatus}><SelectTrigger className="text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{[<SelectItem key="all" value="all">All</SelectItem>, ...EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)]}</SelectContent></Select>
                <Select value={sector} onValueChange={setSector}><SelectTrigger className="text-xs"><SelectValue placeholder="Sector" /></SelectTrigger><SelectContent>{[<SelectItem key="all" value="all">All</SelectItem>, ...SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)]}</SelectContent></Select>
                <Select value={qualification} onValueChange={setQualification}><SelectTrigger className="text-xs"><SelectValue placeholder="Qualification" /></SelectTrigger><SelectContent>{[<SelectItem key="all" value="all">All</SelectItem>, ...QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)]}</SelectContent></Select>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading citizens...</div>
          ) : (
            <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left p-3 font-semibold text-foreground">Name</th>
                      <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Gender</th>
                      <th className="text-left p-3 font-semibold text-foreground">LGA</th>
                      <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">Phone</th>
                      <th className="text-left p-3 font-semibold text-foreground hidden md:table-cell">Status</th>
                      <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">Type</th>
                      <th className="text-left p-3 font-semibold text-foreground hidden lg:table-cell">Approval</th>
                      <th className="text-left p-3 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles?.map((p) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {p.passport_photo_url ? (
                              <img src={p.passport_photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{p.full_name?.[0]}</div>
                            )}
                            <div>
                              <span className="font-medium text-foreground block">{p.full_name}</span>
                              <span className="text-[10px] text-muted-foreground">{p.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{p.gender || "—"}</td>
                        <td className="p-3">{p.lga ? <Badge variant="outline" className="text-[10px] h-5">{p.lga}</Badge> : "—"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{p.phone || "—"}</td>
                        <td className="p-3 hidden md:table-cell">
                          {p.employment_status ? <Badge variant={p.employment_status === "Employed" ? "default" : "secondary"} className="text-[10px] h-5">{p.employment_status}</Badge> : "—"}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className="text-[10px] text-muted-foreground capitalize">{USER_TYPE_LABELS[(p as any).user_type as UserType] || "Job Seeker"}</span>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <Badge variant={p.approval_status === "approved" ? "default" : p.approval_status === "rejected" ? "destructive" : "secondary"} className="text-[10px] h-5">
                            {p.approval_status || "pending"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                              <DialogHeader><DialogTitle className="font-display">{p.full_name}</DialogTitle></DialogHeader>
                              <div className="space-y-2.5 text-xs">
                                {p.passport_photo_url && <img src={p.passport_photo_url} alt="" className="w-20 h-20 rounded-xl object-cover mx-auto" />}
                                {[["Email", p.email], ["Phone", p.phone], ["Gender", p.gender], ["DOB", p.date_of_birth],
                                  ["LGA", p.lga], ["Ward", p.ward], ["Village", p.village], ["Marital Status", p.marital_status],
                                  ["Employment", p.employment_status], ["Employer", p.current_employer], ["Job Title", p.job_title],
                                  ["Sector", p.sector], ["Skills", p.skills?.join(", ")], ["Address", p.residential_address], ["NIN", p.nin],
                                  ["User Type", USER_TYPE_LABELS[(p as any).user_type as UserType] || "Job Seeker"],
                                ].filter(([, v]) => v).map(([label, value]) => (
                                  <div key={label as string} className="flex justify-between">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-medium text-foreground text-right max-w-[60%]">{value as string}</span>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-3">
                                  <Button variant="emerald" size="sm" className="h-7 text-xs" onClick={() => handleApprove(p.id, "approved")}>
                                    <CheckCircle className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleApprove(p.id, "rejected")}>
                                    <XCircle className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                    {(!profiles || profiles.length === 0) && (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No citizens found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {profiles && profiles.length > 0 && (
                <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
                  Showing {profiles.length} result{profiles.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Roles & Users Tab */}
        <TabsContent value="roles" className="space-y-6 mt-4">
          {/* Assign Role Form */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Assign Role to User
            </h2>
            <p className="text-[11px] text-muted-foreground mb-4">
              {isSuperAdmin
                ? "As Super Admin, you can assign any role to any user."
                : `You can assign: ${assignableRoles.map(r => ROLE_LABELS[r]).join(", ")}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Select User</Label>
                <Select value={roleUserId} onValueChange={setRoleUserId}>
                  <SelectTrigger><SelectValue placeholder="Choose user..." /></SelectTrigger>
                  <SelectContent className="max-h-60">{profiles?.map(p => (<SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                  <SelectTrigger><SelectValue placeholder="Choose role..." /></SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(r => (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <span>{ROLE_LABELS[r]}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="emerald" size="sm" onClick={handleAssignRole} disabled={!roleUserId || !roleToAssign} className="w-full">
                  <Shield className="h-3.5 w-3.5" /> Assign Role
                </Button>
              </div>
            </div>
          </div>

          {/* Current Role Assignments */}
          <div className="bg-card rounded-xl shadow-soft border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> All Role Assignments ({allUserRoles?.length || 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">User</th>
                    <th className="text-left p-3 font-semibold text-foreground">Roles</th>
                    <th className="text-left p-3 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(rolesByUser.entries()).map(([userId, { roles: userRoleList, profile }]) => (
                    <tr key={userId} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div>
                          <span className="font-medium text-foreground block">{profile?.full_name || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground">{profile?.email || userId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoleList.map(ur => (
                            <Badge key={ur.id} className={`text-[10px] h-5 ${ROLE_BADGE_COLORS[ur.role as AppRole] || ""}`}>
                              {ROLE_LABELS[ur.role as AppRole] || ur.role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {userRoleList.filter(ur => ur.role !== "user" && ur.role !== "super_admin").map(ur => (
                            <Button key={ur.id} variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveRole(ur.id)} title={`Remove ${ROLE_LABELS[ur.role as AppRole]}`}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rolesByUser.size === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No role assignments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Legend */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" /> Role Reference
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.keys(ROLE_LABELS) as AppRole[]).map(role => (
                <div key={role} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <Badge className={`text-[10px] h-5 shrink-0 ${ROLE_BADGE_COLORS[role]}`}>{ROLE_LABELS[role]}</Badge>
                  <span className="text-[10px] text-muted-foreground leading-tight">{ROLE_DESCRIPTIONS[role]}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
              <DialogTrigger asChild>
                <Button variant="emerald" size="sm"><Plus className="h-3.5 w-3.5" /> Post Job</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Post a New Job</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Job Title *</Label><Input value={newJob.title} onChange={(e) => updateNewJob("title", e.target.value)} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Description *</Label><Textarea value={newJob.description} onChange={(e) => updateNewJob("description", e.target.value)} rows={3} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Company *</Label><Input value={newJob.company} onChange={(e) => updateNewJob("company", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={newJob.location} onChange={(e) => updateNewJob("location", e.target.value)} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">LGA</Label><Select value={newJob.lga} onValueChange={(v) => updateNewJob("lga", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs">Sector</Label><Select value={newJob.sector} onValueChange={(v) => updateNewJob("sector", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs">Qualification</Label><Select value={newJob.qualification_required} onValueChange={(v) => updateNewJob("qualification_required", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={newJob.employment_type} onValueChange={(v) => updateNewJob("employment_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Full-time","Part-time","Contract","Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs">Salary Range</Label><Input value={newJob.salary_range} onChange={(e) => updateNewJob("salary_range", e.target.value)} placeholder="e.g. ₦100k-200k" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" value={newJob.deadline} onChange={(e) => updateNewJob("deadline", e.target.value)} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Skills (comma-separated)</Label><Input value={newJob.skills} onChange={(e) => updateNewJob("skills", e.target.value)} /></div>
                </div>
                <Button variant="emerald" className="w-full mt-3" onClick={handleCreateJob} disabled={!newJob.title || !newJob.description || !newJob.company}>Post Job</Button>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allJobs && allJobs.length > 0 ? allJobs.map(job => (
              <div key={job.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{job.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{job.company} • {job.employment_type} • {job.lga || "All LGAs"}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant={job.is_active ? "default" : "secondary"} className="text-[10px] h-5">{job.is_active ? "Active" : "Closed"}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{job.applicants_count || 0} applicants</Badge>
                  </div>
                </div>
                <Button variant={job.is_active ? "destructive" : "emerald"} size="sm" className="h-7 text-xs" onClick={() => handleToggleJob(job.id, job.is_active ?? true)}>
                  {job.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No jobs yet. Click "Post Job" to create one.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
              <DialogTrigger asChild><Button variant="emerald" size="sm"><Plus className="h-3.5 w-3.5" /> Create Course</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Create Course</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={newCourse.title} onChange={(e) => setNewCourse(p => ({ ...p, title: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={newCourse.description} onChange={(e) => setNewCourse(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={newCourse.category} onValueChange={(v) => setNewCourse(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SKILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">Level</Label><Select value={newCourse.level} onValueChange={(v) => setNewCourse(p => ({ ...p, level: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Beginner","Intermediate","Advanced"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Duration</Label><Input value={newCourse.duration} onChange={(e) => setNewCourse(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 4 weeks" /></div>
                  <Button variant="emerald" className="w-full" onClick={handleCreateCourse} disabled={!newCourse.title}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {allCourses && allCourses.length > 0 ? allCourses.map(course => (
              <div key={course.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{course.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{course.category} • {course.level} • {course.duration || "—"}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant={course.is_published ? "default" : "secondary"} className="text-[10px] h-5">{course.is_published ? "Published" : "Draft"}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{course.enrolled_count || 0} enrolled</Badge>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No courses yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Mentors Tab */}
        <TabsContent value="mentors" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={showCreateMentor} onOpenChange={setShowCreateMentor}>
              <DialogTrigger asChild><Button variant="emerald" size="sm"><Plus className="h-3.5 w-3.5" /> Add Mentor</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Mentor</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">User Email *</Label><Input value={newMentor.user_email} onChange={(e) => setNewMentor(p => ({ ...p, user_email: e.target.value }))} placeholder="mentor@email.com" /><p className="text-[10px] text-muted-foreground">Must be a registered user</p></div>
                  <div className="space-y-1.5"><Label className="text-xs">Category *</Label><Select value={newMentor.category} onValueChange={(v) => setNewMentor(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SKILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label className="text-xs">Specialization</Label><Input value={newMentor.specialization} onChange={(e) => setNewMentor(p => ({ ...p, specialization: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Bio</Label><Textarea value={newMentor.bio} onChange={(e) => setNewMentor(p => ({ ...p, bio: e.target.value }))} rows={2} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Years of Experience</Label><Input type="number" value={newMentor.years_of_experience} onChange={(e) => setNewMentor(p => ({ ...p, years_of_experience: e.target.value }))} /></div>
                  <Button variant="emerald" className="w-full" onClick={handleCreateMentor} disabled={!newMentor.user_email || !newMentor.category}>Add Mentor</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* CBT Tab */}
        <TabsContent value="cbt" className="space-y-4 mt-4">
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Monitor className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="font-display text-sm font-semibold text-foreground">CBT Examination Management</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Manage question banks, monitor exam sessions, and generate reports.</p>
            <p className="text-[10px] text-muted-foreground mt-2">Use the Recruiter Panel to create and manage CBT exams linked to job postings.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/recruiter"}>
              Go to Recruiter Panel
            </Button>
          </div>
        </TabsContent>
        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <AdvancedReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
