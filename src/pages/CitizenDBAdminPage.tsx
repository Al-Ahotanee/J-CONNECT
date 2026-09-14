import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllProfiles, fetchUserRoles, adminUpdateProfile } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JIGAWA_LGAS, SECTORS, EMPLOYMENT_STATUSES, QUALIFICATION_TYPES, SENATORIAL_ZONES } from "@/lib/constants";
import {
  Database, Users, Search, Download, Filter, BarChart3,
  Eye, CheckCircle, XCircle, UserPlus, MessageCircle,
  Send, User, TrendingUp, Edit, Save, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(145, 63%, 22%)", "hsl(43, 76%, 50%)", "hsl(210, 40%, 45%)",
  "hsl(0, 72%, 51%)", "hsl(280, 60%, 45%)", "hsl(180, 50%, 40%)",
  "hsl(30, 70%, 50%)", "hsl(120, 40%, 50%)",
];
const PAGE_SIZE = 25;

const CitizenDBAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatUserId, setChatUserId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [newCitizen, setNewCitizen] = useState({
    email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", lga: "", ward: "", village: "",
  });
  const [registering, setRegistering] = useState(false);

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAllowed = hasAnyRole(roles, ["super_admin", "admin", "citizen_db_admin"]);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["citizenProfiles", { search, lga, gender, employmentStatus, sector, qualification, senatorialZone, ageMin, ageMax }],
    queryFn: () => fetchAllProfiles({
      search: search || undefined, lga: lga || undefined, gender: gender || undefined,
      employment_status: employmentStatus || undefined, sector: sector || undefined,
      qualification: qualification || undefined, senatorial_zone: senatorialZone || undefined,
      age_min: ageMin ? parseInt(ageMin) : undefined, age_max: ageMax ? parseInt(ageMax) : undefined,
    }),
    enabled: !!user && isAllowed,
  });

  // Education data for analytics
  const { data: allEducation = [] } = useQuery({
    queryKey: ["citizenEducation"],
    queryFn: async () => {
      const { data } = await supabase.from("education").select("user_id, qualification_type, field_of_study");
      return data || [];
    },
    enabled: !!user && isAllowed,
  });

  // Chat messages
  const { data: chatMessages } = useQuery({
    queryKey: ["citizenChat", user?.id, chatUserId],
    queryFn: async () => {
      if (!chatUserId) return [];
      const { data, error } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${chatUserId}),and(sender_id.eq.${chatUserId},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!chatUserId,
    refetchInterval: 3000,
  });

  // LGA distribution for chart
  const lgaChartData = useMemo(() => {
    return JIGAWA_LGAS.map(l => ({
      name: l,
      count: profiles?.filter(p => p.lga === l).length || 0,
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [profiles]);

  // Qualification distribution from education table
  const qualDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    allEducation.forEach(e => {
      map[e.qualification_type] = (map[e.qualification_type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allEducation]);

  // Sector distribution
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    profiles?.forEach(p => { map[p.sector || "Unspecified"] = (map[p.sector || "Unspecified"] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [profiles]);

  // Senatorial zone data
  const zoneData = useMemo(() => {
    return Object.entries(SENATORIAL_ZONES).map(([zone, lgas]) => ({
      name: zone.replace("Jigawa ", ""),
      citizens: profiles?.filter(p => p.lga && (lgas as readonly string[]).includes(p.lga)).length || 0,
    }));
  }, [profiles]);

  // Registration trend (last 6 months)
  const trendData = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      months.push({
        month: d.toLocaleString("default", { month: "short" }),
        count: profiles?.filter(p => { const pd = new Date(p.created_at); return pd.getMonth() === m && pd.getFullYear() === y; }).length || 0,
      });
    }
    return months;
  }, [profiles]);

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isAllowed) return <Navigate to="/dashboard" />;

  const total = profiles?.length || 0;
  const employed = profiles?.filter(p => p.employment_status === "Employed").length || 0;
  const unemployed = profiles?.filter(p => p.employment_status === "Unemployed").length || 0;
  const selfEmployed = profiles?.filter(p => p.employment_status === "Self-employed").length || 0;
  const male = profiles?.filter(p => p.gender === "Male").length || 0;
  const female = profiles?.filter(p => p.gender === "Female").length || 0;
  const pending = profiles?.filter(p => p.approval_status === "pending").length || 0;
  const approved = profiles?.filter(p => p.approval_status === "approved").length || 0;

  // Paginated profiles
  const paginatedProfiles = profiles?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Gender pie
  const genderData = [
    { name: "Male", value: male },
    { name: "Female", value: female },
    { name: "Other", value: total - male - female },
  ].filter(d => d.value > 0);

  // Employment pie
  const employmentData = [
    { name: "Employed", value: employed },
    { name: "Unemployed", value: unemployed },
    { name: "Self-Employed", value: selfEmployed },
    { name: "Other", value: total - employed - unemployed - selfEmployed },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    if (!profiles?.length) return;
    const headers = ["Full Name", "Gender", "LGA", "Ward", "Village", "Phone", "Email", "Employment Status", "Sector", "User Type", "NIN", "Date of Birth", "Approval Status", "Registered"];
    const rows = profiles.map(p => [
      p.full_name, p.gender || "", p.lga || "", p.ward || "", p.village || "", p.phone || "",
      p.email || "", p.employment_status || "", p.sector || "", p.user_type || "",
      p.nin || "", p.date_of_birth || "", p.approval_status || "", p.created_at?.split("T")[0] || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `citizens-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !chatUserId) return;
    try {
      await supabase.from("messages").insert({
        sender_id: user!.id, receiver_id: chatUserId, content: chatMessage,
      });
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ["citizenChat"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleApprove = async (profileId: string, status: string) => {
    try {
      await adminUpdateProfile(profileId, { approval_status: status });
      queryClient.invalidateQueries({ queryKey: ["citizenProfiles"] });
      toast.success(`Profile ${status}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleEditSave = async () => {
    if (!editingProfile) return;
    try {
      await adminUpdateProfile(editingProfile.id, {
        full_name: editingProfile.full_name,
        gender: editingProfile.gender,
        lga: editingProfile.lga,
        ward: editingProfile.ward,
        village: editingProfile.village,
        phone: editingProfile.phone,
        email: editingProfile.email,
        employment_status: editingProfile.employment_status,
        sector: editingProfile.sector,
        nin: editingProfile.nin,
        date_of_birth: editingProfile.date_of_birth,
        residential_address: editingProfile.residential_address,
      });
      queryClient.invalidateQueries({ queryKey: ["citizenProfiles"] });
      setEditingProfile(null);
      toast.success("Profile updated successfully");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleRegisterCitizen = async () => {
    if (!newCitizen.full_name.trim()) { toast.error("Full name is required"); return; }
    setRegistering(true);
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newCitizen.email || `citizen_${Date.now()}@jconnect.placeholder`,
          password: newCitizen.password,
          full_name: newCitizen.full_name,
          phone: newCitizen.phone || undefined,
          lga: newCitizen.lga || undefined,
          gender: newCitizen.gender || undefined,
        },
      });
      if (res.error || res.data?.error) throw new Error(res.error?.message || res.data?.error);
      // Update ward/village if provided
      if (res.data?.user_id && (newCitizen.ward || newCitizen.village)) {
        await supabase.from("profiles").update({
          ward: newCitizen.ward || undefined,
          village: newCitizen.village || undefined,
        }).eq("user_id", res.data.user_id);
      }
      queryClient.invalidateQueries({ queryKey: ["citizenProfiles"] });
      setShowRegister(false);
      setNewCitizen({ email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", lga: "", ward: "", village: "" });
      toast.success("Citizen registered successfully");
    } catch (err: any) { toast.error(err.message); }
    setRegistering(false);
  };

  const filteredChatProfiles = profiles?.filter(p =>
    !chatSearch || p.full_name.toLowerCase().includes(chatSearch.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Citizen Database</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage citizens, analytics, reports, and communication</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRegister(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Register Citizen
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!profiles?.length}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total", value: total, icon: Users },
          { label: "Male", value: male, icon: User },
          { label: "Female", value: female, icon: User },
          { label: "Employed", value: employed, icon: TrendingUp },
          { label: "Unemployed", value: unemployed, icon: BarChart3 },
          { label: "Self-Employed", value: selfEmployed, icon: CheckCircle },
          { label: "Pending", value: pending, icon: XCircle },
          { label: "Approved", value: approved, icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-3 shadow-soft border border-border">
            <s.icon className="h-4 w-4 text-primary mb-1" />
            <div className="text-lg font-display font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="citizens">
        <TabsList className="flex-wrap">
          <TabsTrigger value="citizens">Citizens ({total})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Charts</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="chat">Citizen Chat</TabsTrigger>
        </TabsList>

        {/* ═══ CITIZENS LIST ═══ */}
        <TabsContent value="citizens" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3.5 w-3.5 mr-1" /> Filters
            </Button>
          </div>

          {showFilters && (
            <div className="bg-card rounded-xl p-4 shadow-soft border border-border grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={lga} onValueChange={v => { setLga(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="LGA" /></SelectTrigger><SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
              <Select value={gender} onValueChange={v => { setGender(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select>
              <Select value={employmentStatus} onValueChange={v => { setEmploymentStatus(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="Employment" /></SelectTrigger><SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Select value={sector} onValueChange={v => { setSector(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger><SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Select value={qualification} onValueChange={v => { setQualification(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="Qualification" /></SelectTrigger><SelectContent>{QUALIFICATION_TYPES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent></Select>
              <Select value={senatorialZone} onValueChange={v => { setSenatorialZone(v); setPage(0); }}><SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger><SelectContent>{Object.keys(SENATORIAL_ZONES).map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="Min Age" type="number" value={ageMin} onChange={e => { setAgeMin(e.target.value); setPage(0); }} />
              <Input placeholder="Max Age" type="number" value={ageMax} onChange={e => { setAgeMax(e.target.value); setPage(0); }} />
              <Button variant="ghost" size="sm" onClick={() => { setLga(""); setGender(""); setEmploymentStatus(""); setSector(""); setQualification(""); setSenatorialZone(""); setAgeMin(""); setAgeMax(""); setPage(0); }}>Clear All</Button>
            </div>
          )}

          <div className="space-y-2">
            {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading citizens...</p> :
              paginatedProfiles.length > 0 ? paginatedProfiles.map(p => (
                <div key={p.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      {p.passport_photo_url ? (
                        <img src={p.passport_photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.lga || "—"} • {p.gender || "—"} • {p.employment_status || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{p.phone || ""} {p.email ? `• ${p.email}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.approval_status && (
                      <Badge variant={p.approval_status === "approved" ? "default" : p.approval_status === "rejected" ? "destructive" : "secondary"} className="text-[9px] mr-1">
                        {p.approval_status}
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => setEditingProfile({ ...p })}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Chat" onClick={() => setChatUserId(p.user_id)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => setSelectedProfile(p)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {p.approval_status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => handleApprove(p.id, "approved")}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleApprove(p.id, "rejected")}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground">No citizens found</p>
                </div>
              )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ ANALYTICS ═══ */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Registration Trend */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Registration Trend (6 Months)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Registrations" fill="hsl(145, 63%, 22%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top LGAs */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Top 10 LGAs by Citizens</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lgaChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Citizens" fill="hsl(43, 76%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Senatorial Zones */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Citizens by Senatorial Zone</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={zoneData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="citizens" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {zoneData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>

            {/* Sector Distribution */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Sector Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectorData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" name="Citizens" fill="hsl(210, 40%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* ═══ DEMOGRAPHICS ═══ */}
        <TabsContent value="demographics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Gender Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>

            {/* Employment */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Employment Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={employmentData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {employmentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RPieChart>
              </ResponsiveContainer>
            </div>

            {/* Qualification Distribution */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Education Levels</h3>
              {qualDistribution.length > 0 ? (
                <div className="space-y-2">
                  {qualDistribution.map(q => (
                    <div key={q.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{q.name}</span>
                        <span className="font-semibold text-foreground">{q.value}</span>
                      </div>
                      <Progress value={qualDistribution[0]?.value ? (q.value / qualDistribution[0].value) * 100 : 0} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No education data available</p>
              )}
            </div>

            {/* LGA Table */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">All LGAs</h3>
              <ScrollArea className="h-[250px]">
                <div className="space-y-1.5">
                  {JIGAWA_LGAS.map(l => {
                    const count = profiles?.filter(p => p.lga === l).length || 0;
                    return (
                      <div key={l} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{l}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={total > 0 ? (count / total) * 100 : 0} className="h-1.5 w-16" />
                          <span className="text-xs font-semibold text-foreground w-6 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* ═══ CHAT ═══ */}
        <TabsContent value="chat" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: "60vh" }}>
            <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border">
                <Input placeholder="Search citizen..." className="h-8 text-xs" value={chatSearch} onChange={e => setChatSearch(e.target.value)} />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredChatProfiles.slice(0, 50).map(p => (
                  <button key={p.user_id} onClick={() => setChatUserId(p.user_id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors ${chatUserId === p.user_id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                    <p className="font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.lga || "—"}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
              {chatUserId ? (
                <>
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {profiles?.find(p => p.user_id === chatUserId)?.full_name || "Citizen"}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages?.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-xl px-3 py-2 text-xs ${msg.sender_id === user!.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {msg.content}
                          <div className={`text-[9px] mt-1 ${msg.sender_id === user!.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!chatMessages || chatMessages.length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start a conversation.</p>
                    )}
                  </div>
                  <div className="p-3 border-t border-border flex gap-2">
                    <Input placeholder="Type a message..." className="text-xs" value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendChat()} />
                    <Button size="icon" className="shrink-0" onClick={handleSendChat}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Select a citizen to chat</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ VIEW PROFILE DIALOG ═══ */}
      {selectedProfile && (
        <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selectedProfile.full_name}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Gender", selectedProfile.gender],
                ["LGA", selectedProfile.lga],
                ["Ward", selectedProfile.ward],
                ["Village", selectedProfile.village],
                ["Phone", selectedProfile.phone],
                ["Email", selectedProfile.email],
                ["Employment", selectedProfile.employment_status],
                ["Sector", selectedProfile.sector],
                ["User Type", selectedProfile.user_type],
                ["NIN", selectedProfile.nin],
                ["Date of Birth", selectedProfile.date_of_birth],
                ["Nationality", selectedProfile.nationality],
                ["State of Origin", selectedProfile.state_of_origin],
                ["Marital Status", selectedProfile.marital_status],
                ["Address", selectedProfile.residential_address],
                ["Current Employer", selectedProfile.current_employer],
                ["Job Title", selectedProfile.job_title],
                ["Approval", selectedProfile.approval_status],
                ["Registered", selectedProfile.created_at?.split("T")[0]],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <p className="text-xs font-medium text-foreground">{(value as string) || "—"}</p>
                </div>
              ))}
            </div>
            {selectedProfile.skills?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground">Skills</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedProfile.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </div>
              </div>
            )}
            {selectedProfile.certifications?.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">Certifications</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedProfile.certifications.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ EDIT PROFILE DIALOG ═══ */}
      {editingProfile && (
        <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit: {editingProfile.full_name}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input className="text-xs" value={editingProfile.full_name || ""} onChange={e => setEditingProfile({ ...editingProfile, full_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="text-xs" value={editingProfile.phone || ""} onChange={e => setEditingProfile({ ...editingProfile, phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input className="text-xs" value={editingProfile.email || ""} onChange={e => setEditingProfile({ ...editingProfile, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={editingProfile.gender || ""} onValueChange={v => setEditingProfile({ ...editingProfile, gender: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">LGA</Label>
                <Select value={editingProfile.lga || ""} onValueChange={v => setEditingProfile({ ...editingProfile, lga: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ward</Label>
                <Input className="text-xs" value={editingProfile.ward || ""} onChange={e => setEditingProfile({ ...editingProfile, ward: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Village</Label>
                <Input className="text-xs" value={editingProfile.village || ""} onChange={e => setEditingProfile({ ...editingProfile, village: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Employment Status</Label>
                <Select value={editingProfile.employment_status || ""} onValueChange={v => setEditingProfile({ ...editingProfile, employment_status: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sector</Label>
                <Select value={editingProfile.sector || ""} onValueChange={v => setEditingProfile({ ...editingProfile, sector: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">NIN</Label>
                <Input className="text-xs" value={editingProfile.nin || ""} onChange={e => setEditingProfile({ ...editingProfile, nin: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Date of Birth</Label>
                <Input className="text-xs" type="date" value={editingProfile.date_of_birth || ""} onChange={e => setEditingProfile({ ...editingProfile, date_of_birth: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address</Label>
                <Textarea className="text-xs" rows={2} value={editingProfile.residential_address || ""} onChange={e => setEditingProfile({ ...editingProfile, residential_address: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(null)}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleEditSave}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ═══ REGISTER CITIZEN DIALOG ═══ */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register New Citizen</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Full Name *</Label>
              <Input className="text-xs" value={newCitizen.full_name} onChange={e => setNewCitizen({ ...newCitizen, full_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input className="text-xs" type="email" value={newCitizen.email} onChange={e => setNewCitizen({ ...newCitizen, email: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="text-xs" value={newCitizen.phone} onChange={e => setNewCitizen({ ...newCitizen, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Gender</Label>
              <Select value={newCitizen.gender} onValueChange={v => setNewCitizen({ ...newCitizen, gender: v })}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">LGA</Label>
              <Select value={newCitizen.lga} onValueChange={v => setNewCitizen({ ...newCitizen, lga: v })}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{JIGAWA_LGAS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ward</Label>
              <Input className="text-xs" value={newCitizen.ward} onChange={e => setNewCitizen({ ...newCitizen, ward: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Village</Label>
              <Input className="text-xs" value={newCitizen.village} onChange={e => setNewCitizen({ ...newCitizen, village: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Default Password</Label>
              <Input className="text-xs" value={newCitizen.password} onChange={e => setNewCitizen({ ...newCitizen, password: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button size="sm" onClick={handleRegisterCitizen} disabled={registering}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> {registering ? "Registering..." : "Register"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CitizenDBAdminPage;
