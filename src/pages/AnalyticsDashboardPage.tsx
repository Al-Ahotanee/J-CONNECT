import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles } from "@/lib/api";
import { canAccessAdmin, hasAnyRole } from "@/lib/roles";
import { JIGAWA_LGAS, SENATORIAL_ZONES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Users, Briefcase, GraduationCap, TrendingUp, Activity,
  Download, MapPin, PieChart, ArrowUpRight, ArrowDownRight,
  UserCheck, Clock, Target, Building2, Award, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";

const CHART_COLORS = [
  "hsl(145, 63%, 22%)", "hsl(43, 76%, 50%)", "hsl(210, 40%, 45%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 45%)", "hsl(180, 50%, 40%)",
  "hsl(30, 70%, 50%)", "hsl(120, 40%, 50%)", "hsl(340, 60%, 50%)",
];

const AnalyticsDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("all");

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["analyticsProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, gender, lga, employment_status, sector, created_at, date_of_birth, skills, user_type");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["analyticsJobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs")
        .select("id, is_active, sector, lga, created_at, applicants_count, employment_type");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["analyticsApps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_applications")
        .select("id, status, created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["analyticsEnrollments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments")
        .select("id, completed, created_at, progress");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: mentors = [] } = useQuery({
    queryKey: ["analyticsMentors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentors")
        .select("id, is_active, category, current_mentees");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["analyticsCourses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses")
        .select("id, is_published, category, enrolled_count, created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  // Filter by time range
  const filterByTime = <T extends { created_at: string }>(data: T[]) => {
    if (timeRange === "all") return data;
    const now = Date.now();
    const ranges: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
    const days = ranges[timeRange] || 9999;
    return data.filter(d => new Date(d.created_at).getTime() > now - days * 86400000);
  };

  const filteredProfiles = filterByTime(profiles);
  const filteredJobs = filterByTime(jobs);
  const filteredApps = filterByTime(applications);

  // KPIs
  const totalCitizens = filteredProfiles.length;
  const employed = filteredProfiles.filter(p => p.employment_status === "Employed").length;
  const unemployed = filteredProfiles.filter(p => p.employment_status === "Unemployed").length;
  const selfEmployed = filteredProfiles.filter(p => p.employment_status === "Self-employed").length;
  const employmentRate = totalCitizens ? Math.round((employed / totalCitizens) * 100) : 0;
  const activeJobs = jobs.filter(j => j.is_active).length;
  const totalApps = filteredApps.length;
  const shortlisted = filteredApps.filter(a => a.status === "shortlisted").length;
  const hired = filteredApps.filter(a => a.status === "hired").length;
  const conversionRate = totalApps ? Math.round((hired / totalApps) * 100) : 0;
  const activeMentors = mentors.filter(m => m.is_active).length;
  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter(e => e.completed).length;
  const courseCompletionRate = totalEnrollments ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

  // Week-over-week growth
  const recentWeek = profiles.filter(p => new Date(p.created_at).getTime() > Date.now() - 7 * 86400000).length;
  const prevWeek = profiles.filter(p => {
    const t = new Date(p.created_at).getTime();
    return t > Date.now() - 14 * 86400000 && t <= Date.now() - 7 * 86400000;
  }).length;
  const growthPct = prevWeek ? Math.round(((recentWeek - prevWeek) / prevWeek) * 100) : recentWeek > 0 ? 100 : 0;

  // Gender data
  const genderData = [
    { name: "Male", value: filteredProfiles.filter(p => p.gender === "Male").length },
    { name: "Female", value: filteredProfiles.filter(p => p.gender === "Female").length },
    { name: "Other", value: filteredProfiles.filter(p => !p.gender || !["Male", "Female"].includes(p.gender)).length },
  ].filter(d => d.value > 0);

  // Employment data
  const employmentData = [
    { name: "Employed", value: employed },
    { name: "Unemployed", value: unemployed },
    { name: "Self-Employed", value: selfEmployed },
    { name: "Retired", value: filteredProfiles.filter(p => p.employment_status === "Retired").length },
  ].filter(d => d.value > 0);

  // LGA distribution
  const lgaData = JIGAWA_LGAS.map(lga => ({
    name: lga,
    citizens: filteredProfiles.filter(p => p.lga === lga).length,
    jobs: jobs.filter(j => j.lga === lga).length,
  })).sort((a, b) => b.citizens - a.citizens);

  // Senatorial zone data
  const zoneData = Object.entries(SENATORIAL_ZONES).map(([zone, lgas]) => ({
    name: zone.replace("Jigawa ", ""),
    citizens: filteredProfiles.filter(p => p.lga && (lgas as readonly string[]).includes(p.lga)).length,
    employed: filteredProfiles.filter(p => p.lga && (lgas as readonly string[]).includes(p.lga) && p.employment_status === "Employed").length,
  }));

  // Monthly registration trend (last 12 months)
  const trendData = useMemo(() => {
    const months: { month: string; registrations: number; applications: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months.push({
        month: label,
        registrations: profiles.filter(p => { const pd = new Date(p.created_at); return pd.getMonth() === m && pd.getFullYear() === y; }).length,
        applications: applications.filter(a => { const ad = new Date(a.created_at); return ad.getMonth() === m && ad.getFullYear() === y; }).length,
      });
    }
    return months;
  }, [profiles, applications]);

  // Sector distribution
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProfiles.forEach(p => { map[p.sector || "Unspecified"] = (map[p.sector || "Unspecified"] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredProfiles]);

  // Application pipeline
  const pipelineData = [
    { stage: "Applied", count: totalApps },
    { stage: "Shortlisted", count: shortlisted },
    { stage: "Interviewed", count: filteredApps.filter(a => a.status === "interviewed").length },
    { stage: "Offered", count: filteredApps.filter(a => a.status === "offered").length },
    { stage: "Hired", count: hired },
  ];

  // Mentor categories
  const mentorCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    mentors.forEach(m => { map[m.category] = (map[m.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [mentors]);

  // Course categories
  const courseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach(c => { map[c.category || "Uncategorized"] = (map[c.category || "Uncategorized"] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [courses]);

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      kpis: { totalCitizens, employed, unemployed, selfEmployed, employmentRate, activeJobs, totalApps, hired, conversionRate, activeMentors, totalEnrollments, courseCompletionRate },
      lgaBreakdown: lgaData,
      zoneBreakdown: zoneData,
      trends: trendData,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const kpiCards = [
    { label: "Total Citizens", value: totalCitizens, icon: Users, trend: growthPct, trendLabel: "vs last week", color: "bg-primary" },
    { label: "Employment Rate", value: `${employmentRate}%`, icon: TrendingUp, sub: `${employed} employed`, color: "bg-primary" },
    { label: "Active Jobs", value: activeJobs, icon: Briefcase, sub: `${jobs.length} total`, color: "bg-secondary" },
    { label: "Applications", value: totalApps, icon: Target, sub: `${hired} hired`, color: "bg-primary" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: ArrowUpRight, sub: "App → Hire", color: "bg-secondary" },
    { label: "Active Mentors", value: activeMentors, icon: UserCheck, sub: `${mentors.reduce((a, m) => a + (m.current_mentees || 0), 0)} mentees`, color: "bg-primary" },
    { label: "Course Enrollments", value: totalEnrollments, icon: GraduationCap, sub: `${courseCompletionRate}% completion`, color: "bg-secondary" },
    { label: "Published Courses", value: courses.filter(c => c.is_published).length, icon: Award, sub: `${courses.length} total`, color: "bg-primary" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Analytics & Business Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time platform performance and demographic insights</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="365d">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl p-4 shadow-soft border border-border hover:shadow-elevated transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 ${kpi.color} rounded-lg flex items-center justify-center`}>
                <kpi.icon className="h-4 w-4 text-primary-foreground" />
              </div>
              {kpi.trend !== undefined && (
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${kpi.trend >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {kpi.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(kpi.trend)}%
                </span>
              )}
            </div>
            <div className="text-xl font-display font-bold text-foreground">{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</div>
            {kpi.sub && <div className="text-[9px] text-muted-foreground/70 mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><BarChart3 className="h-3 w-3 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="demographics"><Users className="h-3 w-3 mr-1" /> Demographics</TabsTrigger>
          <TabsTrigger value="employment"><TrendingUp className="h-3 w-3 mr-1" /> Employment</TabsTrigger>
          <TabsTrigger value="recruitment"><Briefcase className="h-3 w-3 mr-1" /> Recruitment</TabsTrigger>
          <TabsTrigger value="learning"><GraduationCap className="h-3 w-3 mr-1" /> Learning</TabsTrigger>
          <TabsTrigger value="geographic"><MapPin className="h-3 w-3 mr-1" /> Geographic</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Registration Trend */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Registration & Application Trends</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="registrations" name="Registrations" stroke="hsl(145, 63%, 22%)" fill="hsl(145, 63%, 22%)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="applications" name="Applications" stroke="hsl(43, 76%, 50%)" fill="hsl(43, 76%, 50%)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Employment Breakdown */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Employment Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RPieChart>
                  <Pie data={employmentData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {employmentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recruitment Pipeline */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Recruitment Pipeline</h3>
            <div className="flex items-end gap-1">
              {pipelineData.map((stage, i) => {
                const maxCount = Math.max(...pipelineData.map(s => s.count), 1);
                const height = Math.max((stage.count / maxCount) * 120, 20);
                return (
                  <div key={stage.stage} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-foreground">{stage.count}</span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{ height, background: CHART_COLORS[i] }}
                    />
                    <span className="text-[9px] text-muted-foreground text-center">{stage.stage}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Demographics */}
        <TabsContent value="demographics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {genderData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Sector Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(145, 63%, 22%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Senatorial Zone Comparison */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Senatorial Zone Comparison</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={zoneData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="citizens" name="Total Citizens" fill="hsl(145, 63%, 22%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="employed" name="Employed" fill="hsl(43, 76%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Employment */}
        <TabsContent value="employment" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Employed", value: employed, pct: totalCitizens ? Math.round(employed / totalCitizens * 100) : 0, color: "text-emerald-600" },
              { label: "Unemployed", value: unemployed, pct: totalCitizens ? Math.round(unemployed / totalCitizens * 100) : 0, color: "text-destructive" },
              { label: "Self-Employed", value: selfEmployed, pct: totalCitizens ? Math.round(selfEmployed / totalCitizens * 100) : 0, color: "text-secondary" },
              { label: "Retired", value: filteredProfiles.filter(p => p.employment_status === "Retired").length, pct: 0, color: "text-muted-foreground" },
            ].map(item => (
              <div key={item.label} className="bg-card rounded-xl p-4 shadow-soft border border-border text-center">
                <div className={`text-2xl font-display font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="text-[10px] text-muted-foreground/70">{item.pct}% of total</div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Employment by Sector</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" name="Citizens" fill="hsl(145, 63%, 22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Recruitment */}
        <TabsContent value="recruitment" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Jobs", value: jobs.length },
              { label: "Active Jobs", value: activeJobs },
              { label: "Total Applications", value: totalApps },
              { label: "Hire Rate", value: `${conversionRate}%` },
            ].map(item => (
              <div key={item.label} className="bg-card rounded-xl p-4 shadow-soft border border-border text-center">
                <div className="text-xl font-display font-bold text-foreground">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Application Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={[
                    { name: "Pending", value: filteredApps.filter(a => a.status === "pending").length },
                    { name: "Shortlisted", value: shortlisted },
                    { name: "Interviewed", value: filteredApps.filter(a => a.status === "interviewed").length },
                    { name: "Hired", value: hired },
                    { name: "Rejected", value: filteredApps.filter(a => a.status === "rejected").length },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {[0, 1, 2, 3, 4].map(i => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </RPieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Learning */}
        <TabsContent value="learning" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Published Courses", value: courses.filter(c => c.is_published).length },
              { label: "Total Enrollments", value: totalEnrollments },
              { label: "Completed", value: completedEnrollments },
              { label: "Completion Rate", value: `${courseCompletionRate}%` },
            ].map(item => (
              <div key={item.label} className="bg-card rounded-xl p-4 shadow-soft border border-border text-center">
                <div className="text-xl font-display font-bold text-foreground">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Courses by Category</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={courseCategoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(43, 76%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Mentor Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={mentorCategoryData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {mentorCategoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* Geographic */}
        <TabsContent value="geographic" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Citizens by LGA (Top 15)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={lgaData.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="citizens" name="Citizens" fill="hsl(145, 63%, 22%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="jobs" name="Jobs" fill="hsl(43, 76%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* LGA Heatmap Table */}
          <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">LGA Coverage Heatmap</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
              {lgaData.map(lga => {
                const max = Math.max(...lgaData.map(l => l.citizens), 1);
                const intensity = lga.citizens / max;
                return (
                  <div
                    key={lga.name}
                    className="rounded-lg p-2 text-center border border-border transition-all hover:scale-105"
                    style={{ background: `hsl(145, 63%, ${90 - intensity * 60}%)` }}
                  >
                    <div className="text-[9px] font-semibold text-foreground truncate">{lga.name}</div>
                    <div className="text-sm font-bold text-foreground">{lga.citizens}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboardPage;
