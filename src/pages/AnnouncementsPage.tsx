import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles } from "@/lib/api";
import { canAccessAdmin } from "@/lib/roles";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Plus, Send, Users, Bell, Clock, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "job_seeker", label: "Job Seekers" },
  { value: "student", label: "Students" },
  { value: "professional", label: "Professionals" },
  { value: "entrepreneur", label: "Entrepreneurs" },
  { value: "civil_servant", label: "Civil Servants" },
];

const TYPE_OPTIONS = [
  { value: "info", label: "Information", color: "bg-primary/10 text-primary" },
  { value: "success", label: "Success", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "warning", label: "Warning", color: "bg-secondary/10 text-secondary-foreground" },
  { value: "error", label: "Urgent", color: "bg-destructive/10 text-destructive" },
];

const AnnouncementsPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: "", message: "", type: "info", audience: "all", link: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  // Fetch announcements from the dedicated table
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !canAccessAdmin(roles)) return <Navigate to="/dashboard" />;

  const handleSend = async () => {
    if (!form.title || !form.message) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      // 1. Save to announcements table
      const { error: annErr } = await supabase.from("announcements").insert({
        title: form.title,
        message: form.message,
        type: form.type,
        audience: form.audience,
        link: form.link || null,
        created_by: user.id,
      });
      if (annErr) throw annErr;

      // 2. Send notifications to target users
      let query = supabase.from("profiles").select("user_id");
      if (form.audience !== "all") {
        query = query.eq("user_type", form.audience);
      }
      const { data: targets, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      if (!targets?.length) {
        toast.warning("Announcement saved but no users matched audience filter");
        setSending(false);
        setShowCreate(false);
        queryClient.invalidateQueries({ queryKey: ["announcements"] });
        return;
      }

      const batchSize = 500;
      let totalSent = 0;
      for (let i = 0; i < targets.length; i += batchSize) {
        const batch = targets.slice(i, i + batchSize).map(t => ({
          user_id: t.user_id,
          title: form.title,
          message: form.message,
          type: "announcement",
          link: form.link || null,
          is_read: false,
        }));
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
        totalSent += batch.length;
      }

      toast.success(`Announcement sent to ${totalSent} users!`);
      setShowCreate(false);
      setForm({ title: "", message: "", type: "info", audience: "all", link: "" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted");
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send bulk notifications and announcements to platform users</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold">Title</Label>
                <Input placeholder="e.g., New Job Opportunities Available" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={100} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Message</Label>
                <Textarea placeholder="Write your announcement message..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} maxLength={500} />
                <p className="text-[10px] text-muted-foreground mt-1">{form.message.length}/500</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Target Audience</Label>
                  <Select value={form.audience} onValueChange={v => setForm(f => ({ ...f, audience: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{AUDIENCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Link (optional)</Label>
                <Input placeholder="/jobs or /learning" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
              </div>
              <Button className="w-full gap-2" onClick={handleSend} disabled={sending}>
                <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Announcement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", value: announcements.length, icon: Bell, color: "text-primary" },
          { label: "This Week", value: announcements.filter((a: any) => new Date(a.created_at) > new Date(Date.now() - 7 * 86400000)).length, icon: Clock, color: "text-secondary" },
          { label: "Info", value: announcements.filter((a: any) => a.type === "info").length, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Urgent", value: announcements.filter((a: any) => a.type === "error").length, icon: Users, color: "text-destructive" },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Announcement History */}
      <div className="bg-card rounded-xl shadow-soft border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Recent Announcements</h3>
        </div>
        <ScrollArea className="max-h-[500px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">No announcements sent yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Create your first announcement to reach platform users</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {announcements.map((a: any) => (
                <div key={a.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{a.title}</p>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">{a.type}</Badge>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{AUDIENCE_OPTIONS.find(o => o.value === a.audience)?.label || a.audience}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {a.link && <span className="text-[10px] text-primary">→ {a.link}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
