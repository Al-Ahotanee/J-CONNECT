import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { fetchAllRecruiters, fetchRecruitmentStats, createExternalJob, fetchAllJobs } from "@/lib/recruitment-api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JIGAWA_LGAS, SECTORS, QUALIFICATION_TYPES } from "@/lib/constants";
import {
  Briefcase, Users, Plus, Building2, BarChart3, Eye, Globe, Lock,
  TrendingUp, FileText, UserPlus, CheckCircle, XCircle, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const RecruitmentAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const [newJob, setNewJob] = useState({
    title: "", description: "", company: "", location: "", lga: "",
    sector: "", employment_type: "Full-time", qualification_required: "",
    experience_level: "", salary_range: "", deadline: "", skills: "",
    external_url: "",
  });

  const [newRecruiter, setNewRecruiter] = useState({
    full_name: "", email: "", password: "JCONNECT2025", company: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAllowed = hasAnyRole(roles, ["super_admin", "admin", "recruitment_admin"]);

  const { data: stats } = useQuery({
    queryKey: ["recruitmentStats"],
    queryFn: fetchRecruitmentStats,
    enabled: !!user && isAllowed,
  });

  const { data: recruiters } = useQuery({
    queryKey: ["allRecruiters"],
    queryFn: fetchAllRecruiters,
    enabled: !!user && isAllowed,
  });

  const { data: allJobs } = useQuery({
    queryKey: ["allJobsAdmin"],
    queryFn: () => fetchAllJobs({}),
    enabled: !!user && isAllowed,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAllowed) return <Navigate to="/dashboard" />;

  const handlePostExternalJob = async () => {
    try {
      await createExternalJob({
        posted_by: user.id, title: newJob.title, description: newJob.description,
        company: newJob.company, location: newJob.location || undefined,
        lga: newJob.lga || undefined, sector: newJob.sector || undefined,
        employment_type: newJob.employment_type || undefined,
        qualification_required: newJob.qualification_required || undefined,
        experience_level: newJob.experience_level || undefined,
        salary_range: newJob.salary_range || undefined,
        deadline: newJob.deadline || undefined,
        skills_required: newJob.skills ? newJob.skills.split(",").map(s => s.trim()) : undefined,
        external_url: newJob.external_url,
      });
      queryClient.invalidateQueries({ queryKey: ["allJobsAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["recruitmentStats"] });
      setShowPostDialog(false);
      setNewJob({ title: "", description: "", company: "", location: "", lga: "", sector: "", employment_type: "Full-time", qualification_required: "", experience_level: "", salary_range: "", deadline: "", skills: "", external_url: "" });
      toast.success("External job posted!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRegisterRecruiter = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: newRecruiter.email, password: newRecruiter.password, full_name: newRecruiter.full_name, role: "recruiter" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["allRecruiters"] });
      setShowRegisterDialog(false);
      setNewRecruiter({ full_name: "", email: "", password: "JCONNECT2025", company: "" });
      toast.success("Recruiter registered!");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleJob = async (jobId: string, isActive: boolean) => {
    await supabase.from("jobs").update({ is_active: !isActive }).eq("id", jobId);
    queryClient.invalidateQueries({ queryKey: ["allJobsAdmin"] });
    toast.success(isActive ? "Job deactivated" : "Job activated");
  };

  const updateNewJob = (key: string, value: string) => setNewJob(prev => ({ ...prev, [key]: value }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage recruiters, job postings, and recruitment analytics</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><UserPlus className="h-3.5 w-3.5 mr-1" /> Register Recruiter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Register New Recruiter</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={newRecruiter.full_name} onChange={e => setNewRecruiter(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={newRecruiter.email} onChange={e => setNewRecruiter(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={newRecruiter.company} onChange={e => setNewRecruiter(p => ({ ...p, company: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input value={newRecruiter.password} onChange={e => setNewRecruiter(p => ({ ...p, password: e.target.value }))} /></div>
                <Button variant="emerald" className="w-full" onClick={handleRegisterRecruiter} disabled={!newRecruiter.full_name || !newRecruiter.email}>Register</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
            <DialogTrigger asChild>
              <Button variant="emerald" size="sm"><Globe className="h-3.5 w-3.5 mr-1" /> Post External Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Post External Job</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Title *</Label><Input value={newJob.title} onChange={e => updateNewJob("title", e.target.value)} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Description *</Label><Textarea value={newJob.description} onChange={e => updateNewJob("description", e.target.value)} rows={3} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Company *</Label><Input value={newJob.company} onChange={e => updateNewJob("company", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">External URL *</Label><Input type="url" placeholder="https://..." value={newJob.external_url} onChange={e => updateNewJob("external_url", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Location</Label><Input value={newJob.location} onChange={e => updateNewJob("location", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">LGA</Label><Select value={newJob.lga} onValueChange={v => updateNewJob("lga", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Sector</Label><Select value={newJob.sector} onValueChange={v => updateNewJob("sector", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Qualification</Label><Select value={newJob.qualification_required} onValueChange={v => updateNewJob("qualification_required", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={newJob.employment_type} onValueChange={v => updateNewJob("employment_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Full-time", "Part-time", "Contract", "Internship"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Salary</Label><Input value={newJob.salary_range} onChange={e => updateNewJob("salary_range", e.target.value)} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" value={newJob.deadline} onChange={e => updateNewJob("deadline", e.target.value)} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">Skills (comma separated)</Label><Input value={newJob.skills} onChange={e => updateNewJob("skills", e.target.value)} /></div>
              </div>
              <Button variant="emerald" className="w-full mt-3" onClick={handlePostExternalJob} disabled={!newJob.title || !newJob.description || !newJob.company || !newJob.external_url}>Post External Job</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Jobs", value: stats?.totalJobs || 0, icon: Briefcase, sub: `${stats?.activeJobs || 0} active` },
          { label: "Internal Jobs", value: stats?.internalJobs || 0, icon: Lock, sub: "Full recruitment" },
          { label: "External Jobs", value: stats?.externalJobs || 0, icon: Globe, sub: "Posted links" },
          { label: "Applications", value: stats?.totalApplications || 0, icon: FileText, sub: `${stats?.pendingApplications || 0} pending` },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="recruiters">
        <TabsList>
          <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
          <TabsTrigger value="jobs">All Jobs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Recruiters Tab */}
        <TabsContent value="recruiters" className="mt-4">
          <div className="space-y-3">
            {recruiters && recruiters.length > 0 ? recruiters.map(r => (
              <div key={r.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{r.full_name}</h3>
                    <p className="text-[11px] text-muted-foreground">{r.email} • {r.current_employer || "N/A"}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">Recruiter</Badge>
              </div>
            )) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Building2 className="mx-auto text-muted-foreground/20 mb-3 h-10 w-10" />
                <p className="text-sm text-muted-foreground">No recruiters registered yet</p>
                <Button variant="emerald" size="sm" className="mt-3" onClick={() => setShowRegisterDialog(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Register First Recruiter
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-4">
          <div className="space-y-3">
            {allJobs && allJobs.length > 0 ? allJobs.map(job => (
              <div key={job.id} className="bg-card rounded-xl p-4 shadow-soft border border-border">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                      <Badge variant={job.is_internal ? "default" : "secondary"} className="text-[10px] h-5 shrink-0">
                        {job.is_internal ? <><Lock className="h-2.5 w-2.5 mr-0.5" /> Internal</> : <><Globe className="h-2.5 w-2.5 mr-0.5" /> External</>}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{job.company} • {job.location} • {job.employment_type}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={job.is_active ? "outline" : "secondary"} className="text-[10px]">{job.is_active ? "Active" : "Closed"}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggleJob(job.id, !!job.is_active)}>
                      {job.is_active ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <p className="text-sm text-muted-foreground">No jobs posted yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Application Pipeline
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Pending", value: stats?.pendingApplications || 0, total: stats?.totalApplications || 1 },
                  { label: "Shortlisted", value: stats?.shortlistedApplications || 0, total: stats?.totalApplications || 1 },
                  { label: "Offers Made", value: stats?.totalOffers || 0, total: stats?.totalApplications || 1 },
                  { label: "Offers Accepted", value: stats?.acceptedOffers || 0, total: stats?.totalOffers || 1 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                    <Progress value={item.total > 0 ? (item.value / item.total) * 100 : 0} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4" /> Jobs by Sector
              </h3>
              <div className="space-y-2">
                {stats?.jobsBySector && Object.entries(stats.jobsBySector).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([sector, count]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">{sector}</span>
                    <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                  </div>
                ))}
                {(!stats?.jobsBySector || Object.keys(stats.jobsBySector).length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecruitmentAdminPage;
