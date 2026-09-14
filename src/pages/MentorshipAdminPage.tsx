import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { MENTOR_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, UserCheck, Network, BarChart3, Search, Plus, Trash2,
  CheckCircle, XCircle, Star, Download, MessageCircle, Calendar,
} from "lucide-react";

const MentorshipAdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddMentor, setShowAddMentor] = useState(false);
  const [newMentor, setNewMentor] = useState({ email: "", category: "", specialization: "", bio: "", years: "" });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const canAccess = hasAnyRole(roles, ["super_admin", "admin", "mentorship_admin"]);

  const { data: mentors = [] } = useQuery({
    queryKey: ["admin-mentors"],
    queryFn: async () => {
      const { data: mentorData, error } = await supabase.from("mentors").select("*");
      if (error) throw error;
      if (!mentorData?.length) return [];
      const userIds = mentorData.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, lga, phone").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return mentorData.map(m => ({ ...m, profiles: profileMap.get(m.user_id) || null }));
    },
    enabled: !!user && canAccess,
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ["admin-mappings"],
    queryFn: async () => {
      const { data: mapData, error } = await supabase.from("mentorship_mappings").select("*, mentors(id, category, user_id)");
      if (error) throw error;
      if (!mapData?.length) return [];
      // Get mentor user_ids and mentee_ids for profile lookups
      const mentorUserIds = mapData.map(m => (m.mentors as any)?.user_id).filter(Boolean) as string[];
      const menteeIds = mapData.map(m => m.mentee_id).filter(Boolean) as string[];
      const allUserIds = [...new Set([...mentorUserIds, ...menteeIds])];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", allUserIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return mapData.map(m => ({
        ...m,
        mentors: m.mentors ? { ...(m.mentors as any), profiles: profileMap.get((m.mentors as any).user_id) || null } : null,
        mentee: profileMap.get(m.mentee_id) || null,
      }));
    },
    enabled: !!user && canAccess,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentorship_sessions").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccess,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["admin-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_ratings").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccess,
  });

  const { data: chatrooms = [] } = useQuery({
    queryKey: ["admin-chatrooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_chatrooms").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccess,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !canAccess) return <Navigate to="/dashboard" />;

  const filteredMentors = mentors.filter((m: any) => {
    const name = (m.profiles as any)?.full_name || "";
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAddMentor = async () => {
    if (!newMentor.email || !newMentor.category) { toast.error("Email and category required"); return; }
    try {
      const { data: profile, error: pErr } = await supabase.from("profiles").select("user_id, full_name").eq("email", newMentor.email).single();
      if (pErr || !profile) { toast.error("User not found"); return; }
      const { error } = await supabase.from("mentors").insert({
        user_id: profile.user_id, category: newMentor.category,
        specialization: newMentor.specialization || null, bio: newMentor.bio || null,
        years_of_experience: newMentor.years ? parseInt(newMentor.years) : null, is_active: true,
      });
      if (error) throw error;
      await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "mentor" as any });
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      setShowAddMentor(false);
      setNewMentor({ email: "", category: "", specialization: "", bio: "", years: "" });
      toast.success(`${profile.full_name} added as mentor!`);
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleMentorActive = async (mentorId: string, currentActive: boolean) => {
    const { error } = await supabase.from("mentors").update({ is_active: !currentActive }).eq("id", mentorId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
    toast.success(currentActive ? "Mentor deactivated" : "Mentor activated");
  };

  const overrideMapping = async (mappingId: string, newStatus: string) => {
    const { error } = await supabase.from("mentorship_mappings").update({ status: newStatus }).eq("id", mappingId);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-mappings"] });
    toast.success(`Mapping ${newStatus}`);
  };

  const avgRating = ratings.length > 0 ? (ratings.reduce((a: number, r: any) => a + r.rating, 0) / ratings.length).toFixed(1) : "N/A";

  const exportCSV = () => {
    const headers = ["Mentor Name", "Category", "Specialization", "Active", "Email", "LGA"];
    const rows = filteredMentors.map((m: any) => [
      (m.profiles as any)?.full_name || "", m.category, m.specialization || "", m.is_active ? "Yes" : "No",
      (m.profiles as any)?.email || "", (m.profiles as any)?.lga || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `mentorship-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Mentorship Administration</h1>
          <p className="text-sm text-muted-foreground">Manage mentors, mappings, sessions, and group chatrooms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          <Dialog open={showAddMentor} onOpenChange={setShowAddMentor}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> Add Mentor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Mentor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>User Email</Label><Input placeholder="user@example.com" value={newMentor.email} onChange={e => setNewMentor(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Category</Label>
                  <Select value={newMentor.category} onValueChange={v => setNewMentor(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{MENTOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Specialization</Label><Input value={newMentor.specialization} onChange={e => setNewMentor(p => ({ ...p, specialization: e.target.value }))} /></div>
                <div><Label>Bio</Label><Textarea value={newMentor.bio} onChange={e => setNewMentor(p => ({ ...p, bio: e.target.value }))} /></div>
                <div><Label>Years of Experience</Label><Input type="number" value={newMentor.years} onChange={e => setNewMentor(p => ({ ...p, years: e.target.value }))} /></div>
                <Button onClick={handleAddMentor} className="w-full">Add Mentor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Mentors", value: mentors.length, icon: Users },
          { label: "Active Mentors", value: mentors.filter((m: any) => m.is_active).length, icon: UserCheck },
          { label: "Active Mappings", value: mappings.filter((m: any) => m.status === "active").length, icon: Network },
          { label: "Total Sessions", value: sessions.length, icon: Calendar },
          { label: "Avg Rating", value: avgRating, icon: Star },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><s.icon className="h-4 w-4" /><span className="text-xs">{s.label}</span></div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="mentors">
        <TabsList>
          <TabsTrigger value="mentors"><Users className="h-3.5 w-3.5 mr-1" /> Mentors</TabsTrigger>
          <TabsTrigger value="mappings"><Network className="h-3.5 w-3.5 mr-1" /> Mappings</TabsTrigger>
          <TabsTrigger value="sessions"><Calendar className="h-3.5 w-3.5 mr-1" /> Sessions</TabsTrigger>
          <TabsTrigger value="chatrooms"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Chatrooms</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Reports</TabsTrigger>
        </TabsList>

        {/* Mentors Tab */}
        <TabsContent value="mentors" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search mentors..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Categories</SelectItem>{MENTOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 text-muted-foreground"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Specialization</th><th className="p-3 text-left">Experience</th><th className="p-3 text-left">Mentees</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {filteredMentors.map((m: any) => (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{(m.profiles as any)?.full_name || "Unknown"}<br /><span className="text-xs text-muted-foreground">{(m.profiles as any)?.email}</span></td>
                    <td className="p-3"><Badge variant="secondary">{m.category}</Badge></td>
                    <td className="p-3">{m.specialization || "—"}</td>
                    <td className="p-3">{m.years_of_experience ? `${m.years_of_experience} yrs` : "—"}</td>
                    <td className="p-3">{m.current_mentees}/{m.max_mentees}</td>
                    <td className="p-3"><Badge variant={m.is_active ? "default" : "outline"}>{m.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleMentorActive(m.id, m.is_active)}>
                        {m.is_active ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredMentors.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No mentors found</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 text-muted-foreground"><th className="p-3 text-left">Mentor</th><th className="p-3 text-left">Mentee</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Auto-matched</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {mappings.map((m: any) => (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{(m.mentors as any)?.profiles?.full_name || "Unknown"}</td>
                    <td className="p-3">{(m.mentee as any)?.full_name || "Unknown"}<br /><span className="text-xs text-muted-foreground">{(m.mentee as any)?.email}</span></td>
                    <td className="p-3"><Badge variant={m.status === "active" ? "default" : "outline"}>{m.status}</Badge></td>
                    <td className="p-3">{m.auto_matched ? "Yes" : "Manual"}</td>
                    <td className="p-3 text-xs max-w-[200px] truncate">{m.match_reason || "—"}</td>
                    <td className="p-3 flex gap-1">
                      {m.status === "active" && <Button variant="ghost" size="sm" onClick={() => overrideMapping(m.id, "ended")}><XCircle className="h-4 w-4 text-destructive" /></Button>}
                      {m.status !== "active" && <Button variant="ghost" size="sm" onClick={() => overrideMapping(m.id, "active")}><CheckCircle className="h-4 w-4 text-primary" /></Button>}
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No mappings found</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 text-muted-foreground"><th className="p-3 text-left">Title</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Scheduled</th><th className="p-3 text-left">Duration</th></tr></thead>
              <tbody>
                {sessions.map((s: any) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.title}</td>
                    <td className="p-3"><Badge variant="secondary">{s.session_type}</Badge></td>
                    <td className="p-3"><Badge variant={s.status === "completed" ? "default" : "outline"}>{s.status}</Badge></td>
                    <td className="p-3 text-xs">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString() : "—"}</td>
                    <td className="p-3">{s.duration_minutes ? `${s.duration_minutes}m` : "—"}</td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sessions found</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Chatrooms Tab */}
        <TabsContent value="chatrooms" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 text-muted-foreground"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Topic</th><th className="p-3 text-left">Max Members</th><th className="p-3 text-left">Active</th></tr></thead>
              <tbody>
                {chatrooms.map((c: any) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3"><Badge variant="secondary">{c.topic}</Badge></td>
                    <td className="p-3">{c.max_members}</td>
                    <td className="p-3"><Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge></td>
                  </tr>
                ))}
                {chatrooms.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No chatrooms</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-2">Mentors by Category</h3>
              {MENTOR_CATEGORIES.map(cat => {
                const count = mentors.filter((m: any) => m.category === cat).length;
                return <div key={cat} className="flex justify-between text-sm py-1 border-b border-border last:border-0"><span className="text-muted-foreground">{cat}</span><span className="font-medium">{count}</span></div>;
              })}
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-2">Mapping Stats</h3>
              {["active", "ended", "paused"].map(status => {
                const count = mappings.filter((m: any) => m.status === status).length;
                return <div key={status} className="flex justify-between text-sm py-1 border-b border-border last:border-0"><span className="text-muted-foreground capitalize">{status}</span><span className="font-medium">{count}</span></div>;
              })}
              <div className="flex justify-between text-sm py-1 mt-2"><span className="text-muted-foreground">Auto-matched</span><span className="font-medium">{mappings.filter((m: any) => m.auto_matched).length}</span></div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-2">Session Summary</h3>
              {["scheduled", "completed", "cancelled"].map(status => {
                const count = sessions.filter((s: any) => s.status === status).length;
                return <div key={status} className="flex justify-between text-sm py-1 border-b border-border last:border-0"><span className="text-muted-foreground capitalize">{status}</span><span className="font-medium">{count}</span></div>;
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentorshipAdminPage;
