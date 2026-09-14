import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllProfiles, fetchUserRoles, fetchProfile } from "@/lib/api";
import { hasAnyRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { JIGAWA_LGAS, EMPLOYMENT_STATUSES } from "@/lib/constants";
import {
  MapPin, Users, Search, Download, UserPlus, BarChart3, Eye,
  CheckCircle, User, FileText, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const LGAOfficerPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [newCitizen, setNewCitizen] = useState({
    email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", ward: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const isLGA = hasAnyRole(roles, ["super_admin", "admin", "ministry_admin", "citizen_db_admin", "lga_admin", "lga_officer"]);
  const officerLGA = myProfile?.lga || "";

  const { data: profiles } = useQuery({
    queryKey: ["lgaCitizens", officerLGA, search],
    queryFn: () => fetchAllProfiles({ lga: officerLGA || undefined, search: search || undefined }),
    enabled: !!user && isLGA && !!officerLGA,
  });

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !isLGA) return <Navigate to="/dashboard" />;

  const total = profiles?.length || 0;
  const male = profiles?.filter(p => p.gender === "Male").length || 0;
  const female = profiles?.filter(p => p.gender === "Female").length || 0;
  const employed = profiles?.filter(p => p.employment_status === "Employed").length || 0;
  const unemployed = profiles?.filter(p => p.employment_status === "Unemployed").length || 0;

  const handleRegister = async () => {
    if (!newCitizen.email || !newCitizen.full_name) { toast.error("Name and email required"); return; }
    try {
      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newCitizen.email, password: newCitizen.password,
          full_name: newCitizen.full_name, phone: newCitizen.phone || undefined,
          gender: newCitizen.gender || undefined, lga: officerLGA,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      // Update ward if provided
      if (newCitizen.ward && res.data?.user_id) {
        await supabase.from("profiles").update({ ward: newCitizen.ward }).eq("user_id", res.data.user_id);
      }

      toast.success(`Citizen "${newCitizen.full_name}" registered in ${officerLGA}!`);
      setShowRegister(false);
      setNewCitizen({ email: "", password: "JCONNECT2025", full_name: "", phone: "", gender: "", ward: "" });
      queryClient.invalidateQueries({ queryKey: ["lgaCitizens"] });
    } catch (err: any) { toast.error(err.message); }
  };

  const exportCSV = () => {
    if (!profiles?.length) return;
    const headers = ["Full Name", "Gender", "Ward", "Phone", "Email", "Employment Status"];
    const rows = profiles.map(p => [p.full_name, p.gender || "", p.ward || "", p.phone || "", p.email || "", p.employment_status || ""]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${officerLGA}-citizens-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">LGA Officer — {officerLGA || "Not Assigned"}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Register citizens, validate data, and generate LGA reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Dialog open={showRegister} onOpenChange={setShowRegister}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-3.5 w-3.5 mr-1" /> Register Citizen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register New Citizen in {officerLGA}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={newCitizen.full_name} onChange={e => setNewCitizen(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={newCitizen.email} onChange={e => setNewCitizen(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={newCitizen.phone} onChange={e => setNewCitizen(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Gender</Label>
                  <Select value={newCitizen.gender} onValueChange={v => setNewCitizen(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Ward</Label><Input value={newCitizen.ward} onChange={e => setNewCitizen(p => ({ ...p, ward: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input value={newCitizen.password} onChange={e => setNewCitizen(p => ({ ...p, password: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleRegister}>Register Citizen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Citizens", value: total, icon: Users },
          { label: "Male", value: male, icon: User },
          { label: "Female", value: female, icon: User },
          { label: "Employed", value: employed, icon: TrendingUp },
          { label: "Unemployed", value: unemployed, icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <div className="text-xl font-display font-bold text-foreground">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {!officerLGA && (
        <div className="bg-destructive/10 rounded-xl p-4 text-sm text-destructive">
          Your profile does not have an LGA assigned. Please contact an admin to set your LGA.
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search citizens..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Citizen List */}
      <div className="space-y-2">
        {profiles && profiles.length > 0 ? profiles.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                <p className="text-[11px] text-muted-foreground">{p.ward || "—"} • {p.gender || "—"} • {p.phone || "—"}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{p.employment_status || "—"}</Badge>
          </div>
        )) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">No citizens found in {officerLGA}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LGAOfficerPage;
