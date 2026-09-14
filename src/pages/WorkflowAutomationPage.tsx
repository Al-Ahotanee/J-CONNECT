import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles } from "@/lib/api";
import { canAccessAdmin, hasAnyRole, ROLE_LABELS, AppRole } from "@/lib/roles";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  GitPullRequest, CheckCircle, XCircle, Clock, AlertTriangle,
  ArrowUpCircle, Filter, Search, Eye, RotateCcw, Timer,
  TrendingUp, BarChart3, Shield, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, addHours, isPast } from "date-fns";

const ENTITY_TYPES = [
  { value: "job", label: "Job Posting", color: "bg-primary/10 text-primary" },
  { value: "course", label: "Course", color: "bg-accent text-accent-foreground" },
  { value: "mentor_application", label: "Mentor Application", color: "bg-secondary/10 text-secondary-foreground" },
  { value: "recruiter_application", label: "Recruiter Application", color: "bg-muted text-muted-foreground" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-secondary/10 text-secondary-foreground border-secondary/30" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/30" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/30" },
  escalated: { label: "Escalated", icon: ArrowUpCircle, color: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-primary/10 text-primary" },
  high: { label: "High", color: "bg-secondary/10 text-secondary-foreground" },
  urgent: { label: "Urgent", color: "bg-destructive/10 text-destructive" },
};

const SLA_HOURS: Record<string, number> = {
  low: 72,
  normal: 48,
  high: 24,
  urgent: 4,
};

const WorkflowAutomationPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [activeTab, setActiveTab] = useState("queue");

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["approvalWorkflows", filterStatus, filterType],
    queryFn: async () => {
      let query = supabase
        .from("approval_workflows")
        .select("*")
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      if (filterType !== "all") query = query.eq("entity_type", filterType);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  // Fetch submitter profiles for display
  const { data: profiles = [] } = useQuery({
    queryKey: ["workflowProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  // Realtime for workflow updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("workflow-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_workflows" }, () => {
        queryClient.invalidateQueries({ queryKey: ["approvalWorkflows"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !canAccessAdmin(roles)) return <Navigate to="/dashboard" />;

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.full_name || p?.email || "Unknown";
  };

  const filteredWorkflows = workflows.filter(w => {
    if (search) {
      const q = search.toLowerCase();
      return w.entity_title.toLowerCase().includes(q) ||
        getProfileName(w.submitted_by).toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = workflows.filter(w => w.status === "pending").length;
  const overdueCount = workflows.filter(w => w.status === "pending" && w.sla_deadline && isPast(new Date(w.sla_deadline))).length;
  const approvedToday = workflows.filter(w => w.status === "approved" && w.reviewed_at && new Date(w.reviewed_at).toDateString() === new Date().toDateString()).length;

  const avgResponseTime = (() => {
    const reviewed = workflows.filter(w => w.reviewed_at && w.submitted_at);
    if (!reviewed.length) return "N/A";
    const totalMs = reviewed.reduce((sum, w) => sum + (new Date(w.reviewed_at!).getTime() - new Date(w.submitted_at).getTime()), 0);
    const avgHrs = Math.round(totalMs / reviewed.length / 3600000);
    return avgHrs < 24 ? `${avgHrs}h` : `${Math.round(avgHrs / 24)}d`;
  })();

  const handleReview = async (workflowId: string, status: "approved" | "rejected" | "escalated") => {
    try {
      const { error } = await supabase
        .from("approval_workflows")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
          notes: reviewNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workflowId);
      if (error) throw error;

      // Log the action
      await supabase.from("audit_logs").insert({
        actor_id: user!.id,
        action: status === "approved" ? "approve" : status === "rejected" ? "reject" : "escalate",
        entity_type: selectedWorkflow?.entity_type || "workflow",
        entity_id: workflowId,
        details: { notes: reviewNotes, entity_title: selectedWorkflow?.entity_title },
      });

      // If approved, perform the actual entity update
      if (status === "approved" && selectedWorkflow) {
        if (selectedWorkflow.entity_type === "job") {
          await supabase.from("jobs").update({ is_active: true }).eq("id", selectedWorkflow.entity_id);
        } else if (selectedWorkflow.entity_type === "course") {
          await supabase.from("courses").update({ is_published: true, instructor_approved: true }).eq("id", selectedWorkflow.entity_id);
        }
      }

      // Notify the submitter
      await supabase.from("notifications").insert({
        user_id: selectedWorkflow.submitted_by,
        title: `${selectedWorkflow.entity_type === "job" ? "Job" : "Request"} ${status}`,
        message: `Your ${selectedWorkflow.entity_type.replace("_", " ")} "${selectedWorkflow.entity_title}" has been ${status}.${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`,
        type: status === "approved" ? "success" : status === "rejected" ? "error" : "warning",
        link: status === "approved" ? (selectedWorkflow.entity_type === "job" ? "/jobs" : "/learning") : undefined,
      });

      toast.success(`Workflow ${status} successfully`);
      setSelectedWorkflow(null);
      setReviewNotes("");
      queryClient.invalidateQueries({ queryKey: ["approvalWorkflows"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update workflow");
    }
  };

  const getSLAStatus = (workflow: any) => {
    if (workflow.status !== "pending" || !workflow.sla_deadline) return null;
    const deadline = new Date(workflow.sla_deadline);
    if (isPast(deadline)) return "overdue";
    const hoursLeft = (deadline.getTime() - Date.now()) / 3600000;
    if (hoursLeft < 4) return "critical";
    if (hoursLeft < 12) return "warning";
    return "ok";
  };

  const getSLABadge = (slaStatus: string | null) => {
    switch (slaStatus) {
      case "overdue": return <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px]">⏰ SLA Overdue</Badge>;
      case "critical": return <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[9px]">🔴 Critical</Badge>;
      case "warning": return <Badge className="bg-secondary/10 text-secondary-foreground border-secondary/30 text-[9px]">🟡 Due Soon</Badge>;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <GitPullRequest className="h-6 w-6 text-primary" /> Workflow Automation
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage approval pipelines, track SLAs, and review audit trails
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-secondary" },
          { label: "Overdue SLA", value: overdueCount, icon: AlertTriangle, color: "text-destructive" },
          { label: "Approved Today", value: approvedToday, icon: CheckCircle, color: "text-primary" },
          { label: "Avg Response", value: avgResponseTime, icon: Timer, color: "text-muted-foreground" },
          { label: "Total Workflows", value: workflows.length, icon: TrendingUp, color: "text-foreground" },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">
            <GitPullRequest className="h-3.5 w-3.5 mr-1" /> Approval Queue
            {pendingCount > 0 && <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sla"><Timer className="h-3.5 w-3.5 mr-1" /> SLA Tracking</TabsTrigger>
          <TabsTrigger value="audit"><Shield className="h-3.5 w-3.5 mr-1" /> Audit Trail</TabsTrigger>
        </TabsList>

        {/* ═══ APPROVAL QUEUE ═══ */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search workflows..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ENTITY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workflow List */}
          <div className="bg-card rounded-xl shadow-soft border border-border">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading workflows...</div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="p-16 text-center">
                <GitPullRequest className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-foreground">No workflows found</p>
                <p className="text-xs text-muted-foreground mt-1">Approval requests will appear here when submitted</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="divide-y divide-border">
                  {filteredWorkflows.map(w => {
                    const statusCfg = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
                    const priorityCfg = PRIORITY_CONFIG[w.priority] || PRIORITY_CONFIG.normal;
                    const entityCfg = ENTITY_TYPES.find(t => t.value === w.entity_type);
                    const slaStatus = getSLAStatus(w);
                    const StatusIcon = statusCfg.icon;

                    return (
                      <div
                        key={w.id}
                        className={`px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer ${slaStatus === "overdue" ? "bg-destructive/5" : ""}`}
                        onClick={() => { setSelectedWorkflow(w); setReviewNotes(""); }}
                      >
                        <div className="flex items-start gap-3">
                          <StatusIcon className={`h-5 w-5 mt-0.5 shrink-0 ${statusCfg.color.split(" ")[1]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{w.entity_title}</p>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${entityCfg?.color || ""}`}>
                                {entityCfg?.label || w.entity_type}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${statusCfg.color}`}>
                                {statusCfg.label}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${priorityCfg.color}`}>
                                {priorityCfg.label}
                              </Badge>
                              {getSLABadge(slaStatus)}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              <span>By: {getProfileName(w.submitted_by)}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(w.submitted_at), { addSuffix: true })}</span>
                              {w.sla_deadline && w.status === "pending" && (
                                <>
                                  <span>•</span>
                                  <span className={slaStatus === "overdue" ? "text-destructive font-semibold" : ""}>
                                    SLA: {formatDistanceToNow(new Date(w.sla_deadline), { addSuffix: true })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ═══ SLA TRACKING ═══ */}
        <TabsContent value="sla" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* SLA Configuration */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Timer className="h-4 w-4 text-primary" /> SLA Policies
              </h3>
              <div className="space-y-3">
                {Object.entries(SLA_HOURS).map(([priority, hours]) => (
                  <div key={priority} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${PRIORITY_CONFIG[priority]?.color || ""}`}>
                        {PRIORITY_CONFIG[priority]?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">priority</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{hours}h response time</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="bg-card rounded-xl p-5 shadow-soft border border-border">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" /> SLA Compliance
              </h3>
              {(() => {
                const reviewed = workflows.filter(w => w.reviewed_at && w.sla_deadline);
                const onTime = reviewed.filter(w => new Date(w.reviewed_at!) <= new Date(w.sla_deadline!));
                const complianceRate = reviewed.length ? Math.round((onTime.length / reviewed.length) * 100) : 100;
                return (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className={`font-display text-4xl font-bold ${complianceRate >= 90 ? "text-primary" : complianceRate >= 70 ? "text-secondary" : "text-destructive"}`}>
                        {complianceRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Overall SLA Compliance</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="font-display text-lg font-bold text-foreground">{reviewed.length}</p>
                        <p className="text-[9px] text-muted-foreground">Reviewed</p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-2">
                        <p className="font-display text-lg font-bold text-primary">{onTime.length}</p>
                        <p className="text-[9px] text-muted-foreground">On Time</p>
                      </div>
                      <div className="bg-destructive/5 rounded-lg p-2">
                        <p className="font-display text-lg font-bold text-destructive">{reviewed.length - onTime.length}</p>
                        <p className="text-[9px] text-muted-foreground">Breached</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Overdue Items */}
          {overdueCount > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
              <h3 className="font-display text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4" /> Overdue Items ({overdueCount})
              </h3>
              <div className="space-y-2">
                {workflows
                  .filter(w => w.status === "pending" && w.sla_deadline && isPast(new Date(w.sla_deadline)))
                  .map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-card rounded-lg px-4 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{w.entity_title}</p>
                        <p className="text-[10px] text-muted-foreground">Overdue by {formatDistanceToNow(new Date(w.sla_deadline!))}</p>
                      </div>
                      <Button size="sm" variant="destructive" className="text-[10px] h-7" onClick={() => { setSelectedWorkflow(w); setReviewNotes(""); }}>
                        Review Now
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ AUDIT TRAIL ═══ */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl shadow-soft border border-border">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Activity Log
              </h3>
              <Badge variant="secondary" className="text-[9px]">{auditLogs.length} entries</Badge>
            </div>
            <ScrollArea className="max-h-[500px]">
              {auditLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No audit entries yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLogs.map(log => {
                    const actionColors: Record<string, string> = {
                      approve: "text-primary",
                      reject: "text-destructive",
                      escalate: "text-secondary-foreground",
                      create: "text-foreground",
                      update: "text-muted-foreground",
                      delete: "text-destructive",
                      role_assign: "text-primary",
                      bulk_import: "text-secondary-foreground",
                    };
                    return (
                      <div key={log.id} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold uppercase ${actionColors[log.action] || "text-foreground"}`}>
                                {log.action}
                              </span>
                              <span className="text-xs text-muted-foreground">on</span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">{log.entity_type}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              By {getProfileName(log.actor_id)}
                              {(log.details as any)?.entity_title && ` — "${(log.details as any).entity_title}"`}
                              {(log.details as any)?.notes && ` — ${(log.details as any).notes}`}
                            </p>
                            <span className="text-[9px] text-muted-foreground/60">
                              {format(new Date(log.created_at), "MMM d, yyyy 'at' HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedWorkflow} onOpenChange={(open) => { if (!open) setSelectedWorkflow(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Review Workflow</DialogTitle>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={ENTITY_TYPES.find(t => t.value === selectedWorkflow.entity_type)?.color || ""}>
                    {ENTITY_TYPES.find(t => t.value === selectedWorkflow.entity_type)?.label}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_CONFIG[selectedWorkflow.priority]?.color || ""}>
                    {PRIORITY_CONFIG[selectedWorkflow.priority]?.label} Priority
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">{selectedWorkflow.entity_title}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Submitted by: <span className="font-medium text-foreground">{getProfileName(selectedWorkflow.submitted_by)}</span></p>
                  <p>Submitted: {format(new Date(selectedWorkflow.submitted_at), "MMM d, yyyy 'at' HH:mm")}</p>
                  {selectedWorkflow.sla_deadline && (
                    <p>SLA Deadline: <span className={isPast(new Date(selectedWorkflow.sla_deadline)) ? "text-destructive font-semibold" : ""}>
                      {format(new Date(selectedWorkflow.sla_deadline), "MMM d, yyyy 'at' HH:mm")}
                    </span></p>
                  )}
                  {selectedWorkflow.notes && <p>Notes: {selectedWorkflow.notes}</p>}
                </div>
              </div>

              {selectedWorkflow.status === "pending" && (
                <>
                  <div>
                    <Label className="text-xs font-semibold">Review Notes (optional)</Label>
                    <Textarea
                      placeholder="Add review notes..."
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button className="gap-1" onClick={() => handleReview(selectedWorkflow.id, "approved")}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button variant="destructive" className="gap-1" onClick={() => handleReview(selectedWorkflow.id, "rejected")}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => handleReview(selectedWorkflow.id, "escalated")}>
                      <ArrowUpCircle className="h-3.5 w-3.5" /> Escalate
                    </Button>
                  </div>
                </>
              )}

              {selectedWorkflow.status !== "pending" && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    This workflow was <span className="font-semibold">{selectedWorkflow.status}</span>
                    {selectedWorkflow.reviewed_at && ` on ${format(new Date(selectedWorkflow.reviewed_at), "MMM d, yyyy 'at' HH:mm")}`}
                    {selectedWorkflow.reviewed_by && ` by ${getProfileName(selectedWorkflow.reviewed_by)}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowAutomationPage;
