import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, TrendingUp, Clock, Users, Briefcase, CheckCircle, XCircle,
  Target, Award, Calendar, Activity, PieChart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

const RecruitmentAnalyticsPage = () => {
  const { user } = useAuth();
  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAllowed = hasAnyRole(roles, [
    "super_admin", "admin", "ministry_admin", "recruitment_admin", 
    "recruiter", "psb_recruiter", "subeb_recruiter", "employer", "audit_compliance"
  ]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["recruitmentAnalytics"],
    queryFn: async () => {
      const [jobsRes, appsRes, offersRes, invRes] = await Promise.all([
        supabase.from("jobs").select("id, title, is_active, is_internal, sector, lga, employment_type, applicants_count, created_at, posted_by"),
        supabase.from("job_applications").select("id, status, created_at, job_id, user_id"),
        supabase.from("job_offers").select("id, status, created_at, responded_at"),
        supabase.from("interview_invitations").select("id, status, type, created_at, scheduled_at"),
      ]);

      const jobs = jobsRes.data || [];
      const apps = appsRes.data || [];
      const offers = offersRes.data || [];
      const invitations = invRes.data || [];

      // Time to hire (avg days from application to offer)
      const hiredApps = apps.filter(a => a.status === "hired" || a.status === "offered");
      const avgTimeToHire = hiredApps.length > 0
        ? Math.round(hiredApps.reduce((acc, a) => {
            const offer = offers.find(o => o.status === "accepted");
            if (offer) {
              return acc + (new Date(offer.created_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
            }
            return acc + 14; // default
          }, 0) / hiredApps.length)
        : 0;

      // Hiring funnel
      const funnel = [
        { stage: "Applied", count: apps.length },
        { stage: "Shortlisted", count: apps.filter(a => a.status === "shortlisted").length },
        { stage: "Interview", count: invitations.filter(i => i.type === "interview").length },
        { stage: "Exam", count: invitations.filter(i => i.type === "exam").length },
        { stage: "Offered", count: offers.length },
        { stage: "Accepted", count: offers.filter(o => o.status === "accepted").length },
      ];

      // Jobs by sector
      const sectorData = jobs.reduce((acc: any[], j) => {
        const existing = acc.find(a => a.name === (j.sector || "Other"));
        if (existing) existing.value++;
        else acc.push({ name: j.sector || "Other", value: 1 });
        return acc;
      }, []);

      // Jobs by type
      const typeData = jobs.reduce((acc: any[], j) => {
        const existing = acc.find(a => a.name === (j.employment_type || "Full-time"));
        if (existing) existing.value++;
        else acc.push({ name: j.employment_type || "Full-time", value: 1 });
        return acc;
      }, []);

      // Monthly trends
      const monthMap: Record<string, { jobs: number; apps: number }> = {};
      jobs.forEach(j => {
        const m = j.created_at.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { jobs: 0, apps: 0 };
        monthMap[m].jobs++;
      });
      apps.forEach(a => {
        const m = a.created_at.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { jobs: 0, apps: 0 };
        monthMap[m].apps++;
      });
      const trendData = Object.entries(monthMap).sort().slice(-6).map(([month, d]) => ({
        month: month.slice(5), jobs: d.jobs, apps: d.apps,
      }));

      // Top jobs by applicants
      const topJobs = [...jobs].sort((a, b) => (b.applicants_count || 0) - (a.applicants_count || 0)).slice(0, 5).map(j => ({
        name: j.title.length > 20 ? j.title.slice(0, 20) + "..." : j.title,
        applicants: j.applicants_count || 0,
      }));

      // Success rate
      const hiringRate = apps.length > 0 ? Math.round((offers.filter(o => o.status === "accepted").length / apps.length) * 100) : 0;
      const offerAcceptRate = offers.length > 0 ? Math.round((offers.filter(o => o.status === "accepted").length / offers.length) * 100) : 0;

      return {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.is_active).length,
        totalApps: apps.length,
        totalOffers: offers.length,
        acceptedOffers: offers.filter(o => o.status === "accepted").length,
        rejectedApps: apps.filter(a => a.status === "rejected").length,
        pendingApps: apps.filter(a => a.status === "pending").length,
        avgTimeToHire,
        hiringRate,
        offerAcceptRate,
        funnel,
        sectorData,
        typeData,
        trendData,
        topJobs,
        totalInterviews: invitations.length,
      };
    },
    enabled: !!user && isAllowed,
  });

  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAllowed) return <Navigate to="/dashboard" />;

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading analytics...</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Recruitment Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Comprehensive hiring metrics and performance insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Jobs", value: analytics?.totalJobs || 0, icon: Briefcase, color: "text-primary" },
          { label: "Active Jobs", value: analytics?.activeJobs || 0, icon: CheckCircle, color: "text-primary" },
          { label: "Applications", value: analytics?.totalApps || 0, icon: Users, color: "text-primary" },
          { label: "Avg Time to Hire", value: `${analytics?.avgTimeToHire || 0}d`, icon: Clock, color: "text-secondary-foreground" },
          { label: "Hiring Rate", value: `${analytics?.hiringRate || 0}%`, icon: Target, color: "text-primary" },
          { label: "Offer Accept", value: `${analytics?.offerAcceptRate || 0}%`, icon: Award, color: "text-primary" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl p-4 border border-border text-center">
            <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
            <div className="text-xl font-display font-bold text-foreground">{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Funnel */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Hiring Funnel
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics?.funnel || []} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs by Sector */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Jobs by Sector
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPie>
              <Pie data={analytics?.sectorData || []} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {(analytics?.sectorData || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trends */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Monthly Trends
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics?.trendData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="jobs" stroke="hsl(var(--primary))" strokeWidth={2} name="Jobs Posted" />
              <Line type="monotone" dataKey="apps" stroke="hsl(var(--secondary))" strokeWidth={2} name="Applications" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Jobs */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Top Jobs by Applicants
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics?.topJobs || []}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="applicants" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">Application Pipeline Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Pending", value: analytics?.pendingApps || 0, total: analytics?.totalApps || 1 },
            { label: "Interviews", value: analytics?.totalInterviews || 0, total: analytics?.totalApps || 1 },
            { label: "Offers Made", value: analytics?.totalOffers || 0, total: analytics?.totalApps || 1 },
            { label: "Accepted", value: analytics?.acceptedOffers || 0, total: analytics?.totalOffers || 1 },
            { label: "Rejected", value: analytics?.rejectedApps || 0, total: analytics?.totalApps || 1 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
              <Progress value={item.total > 0 ? (item.value / item.total) * 100 : 0} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecruitmentAnalyticsPage;
