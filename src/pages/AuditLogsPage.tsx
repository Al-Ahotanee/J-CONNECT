import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRoles } from "@/lib/api";
import { canAccessAdmin } from "@/lib/roles";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Search, Eye, Download, RefreshCw, Activity, Clock,
  User, Briefcase, GraduationCap, Award, FileText, Bell, Settings,
  UserPlus, UserMinus, Edit, Trash2, Plus, CheckCircle, XCircle,
  TrendingUp, BarChart3, Calendar, Filter, AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, subDays, subHours, isWithinInterval } from "date-fns";

const ENTITY_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  profile: { label: "Profile", icon: User, color: "bg-primary/10 text-primary" },
  job: { label: "Job", icon: Briefcase, color: "bg-accent text-accent-foreground" },
  job_application: { label: "Application", icon: FileText, color: "bg-secondary/10 text-secondary-foreground" },
  course: { label: "Course", icon: GraduationCap, color: "bg-primary/10 text-primary" },
  user_role: { label: "Role", icon: Shield, color: "bg-destructive/10 text-destructive" },
  mentor: { label: "Mentor", icon: Award, color: "bg-accent text-accent-foreground" },
  mentorship_mapping: { label: "Mentorship", icon: Award, color: "bg-secondary/10 text-secondary-foreground" },
  enrollment: { label: "Enrollment", icon: GraduationCap, color: "bg-primary/10 text-primary" },
  certificate: { label: "Certificate", icon: FileText, color: "bg-accent text-accent-foreground" },
  notification: { label: "Notification", icon: Bell, color: "bg-muted text-muted-foreground" },
  approval_workflow: { label: "Workflow", icon: Settings, color: "bg-secondary/10 text-secondary-foreground" },
  job_offer: { label: "Job Offer", icon: Briefcase, color: "bg-primary/10 text-primary" },
  interview_invitation: { label: "Interview", icon: Briefcase, color: "bg-accent text-accent-foreground" },
  workflow: { label: "Workflow", icon: Settings, color: "bg-secondary/10 text-secondary-foreground" },
};

const ACTION_ICON: Record<string, any> = {
  insert: Plus,
  update: Edit,
  delete: Trash2,
  approve: CheckCircle,
  reject: XCircle,
  escalate: AlertTriangle,
};

const TIME_RANGES = [
  { value: "1h", label: "Last Hour" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

const AuditLogsPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("timeline");

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["auditLogsAll", timeRange],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (timeRange !== "all") {
        const now = new Date();
        let from: Date;
        if (timeRange === "1h") from = subHours(now, 1);
        else if (timeRange === "24h") from = subDays(now, 1);
        else if (timeRange === "7d") from = subDays(now, 7);
        else from = subDays(now, 30);
        query = query.gte("created_at", from.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["auditProfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && canAccessAdmin(roles),
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("audit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["auditLogsAll"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const getProfileName = (userId: string) => {
    if (userId === "00000000-0000-0000-0000-000000000000") return "System";
    const p = profiles.find(pr => pr.user_id === userId);
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  const parseAction = (action: string) => {
    const parts = action.split("_");
    const op = parts.pop() || "";
    return op;
  };

  const getActionLabel = (action: string) => {
    if (action.includes("insert")) return "Created";
    if (action.includes("update")) return "Updated";
    if (action.includes("delete")) return "Deleted";
    if (action.includes("approve")) return "Approved";
    if (action.includes("reject")) return "Rejected";
    if (action.includes("escalate")) return "Escalated";
    return action;
  };

  const getActionColor = (action: string) => {
    if (action.includes("insert")) return "bg-primary/10 text-primary border-primary/30";
    if (action.includes("delete")) return "bg-destructive/10 text-destructive border-destructive/30";
    if (action.includes("approve")) return "bg-primary/10 text-primary border-primary/30";
    if (action.includes("reject")) return "bg-destructive/10 text-destructive border-destructive/30";
    if (action.includes("escalate")) return "bg-secondary/10 text-secondary-foreground border-secondary/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filterType !== "all" && log.entity_type !== filterType) return false;
      if (filterAction !== "all" && !log.action.includes(filterAction)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = getProfileName(log.actor_id).toLowerCase();
        const entityType = (ENTITY_TYPE_CONFIG[log.entity_type]?.label || log.entity_type).toLowerCase();
        const action = getActionLabel(log.action).toLowerCase();
        return name.includes(q) || entityType.includes(q) || action.includes(q) || log.entity_id?.includes(q);
      }
      return true;
    });
  }, [auditLogs, filterType, filterAction, search, profiles]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = auditLogs.filter(l => new Date(l.created_at) >= today);
    const uniqueActors = new Set(auditLogs.map(l => l.actor_id)).size;
    const entityBreakdown: Record<string, number> = {};
    auditLogs.forEach(l => {
      entityBreakdown[l.entity_type] = (entityBreakdown[l.entity_type] || 0) + 1;
    });
    const topEntity = Object.entries(entityBreakdown).sort((a, b) => b[1] - a[1])[0];
    const criticalActions = auditLogs.filter(l => l.action.includes("delete") || l.entity_type === "user_role").length;

    return {
      total: auditLogs.length,
      today: todayLogs.length,
      uniqueActors,
      topEntity: topEntity ? `${ENTITY_TYPE_CONFIG[topEntity[0]]?.label || topEntity[0]} (${topEntity[1]})` : "N/A",
      critical: criticalActions,
      entityBreakdown,
    };
  }, [auditLogs]);

  // Hourly activity for chart
  const hourlyActivity = useMemo(() => {
    const hours: Record<string, number> = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now);
      h.setHours(now.getHours() - i, 0, 0, 0);
      hours[format(h, "HH:00")] = 0;
    }
    auditLogs.forEach(l => {
      const h = format(new Date(l.created_at), "HH:00");
      if (hours[h] !== undefined) hours[h]++;
    });
    return Object.entries(hours).map(([hour, count]) => ({ hour, count }));
  }, [auditLogs]);

  const getChangeSummary = (log: any) => {
    const details = log.details as any;
    if (!details) return null;

    if (details.old && details.new) {
      const changes: string[] = [];
      const oldObj = details.old;
      const newObj = details.new;
      for (const key of Object.keys(newObj)) {
        if (["updated_at", "created_at"].includes(key)) continue;
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
          changes.push(key);
        }
      }
      return changes.length > 0 ? `Changed: ${changes.join(", ")}` : "No visible changes";
    }

    if (details.new) {
      const title = details.new.title || details.new.full_name || details.new.email || details.new.role;
      return title ? `"${title}"` : null;
    }

    if (details.notes) return `Notes: ${details.notes}`;
    return null;
  };

  const exportToJSON = () => {
    const data = filteredLogs.map(l => ({
      timestamp: l.created_at,
      actor: getProfileName(l.actor_id),
      action: getActionLabel(l.action),
      entity_type: ENTITY_TYPE_CONFIG[l.entity_type]?.label || l.entity_type,
      entity_id: l.entity_id,
      details: l.details,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID"];
    const rows = filteredLogs.map(l => [
      l.created_at,
      getProfileName(l.actor_id),
      getActionLabel(l.action),
      ENTITY_TYPE_CONFIG[l.entity_type]?.label || l.entity_type,
      l.entity_id || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles.length > 0 && !canAccessAdmin(roles)) return <Navigate to="/dashboard" />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> System Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive activity tracking across all system modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToJSON} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Events", value: stats.total, icon: Activity, color: "text-primary" },
          { label: "Today", value: stats.today, icon: Calendar, color: "text-accent-foreground" },
          { label: "Unique Actors", value: stats.uniqueActors, icon: User, color: "text-muted-foreground" },
          { label: "Critical Actions", value: stats.critical, icon: AlertTriangle, color: "text-destructive" },
          { label: "Top Module", value: stats.topEntity, icon: TrendingUp, color: "text-foreground", small: true },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className={`font-display font-bold text-foreground mt-1 ${(stat as any).small ? "text-sm" : "text-xl"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5 mr-1" /> Activity Timeline</TabsTrigger>
          <TabsTrigger value="breakdown"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Module Breakdown</TabsTrigger>
          <TabsTrigger value="actors"><User className="h-3.5 w-3.5 mr-1" /> Actor Analysis</TabsTrigger>
        </TabsList>

        {/* ═══ ACTIVITY TIMELINE ═══ */}
        <TabsContent value="timeline" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search by actor, action, or entity..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-9 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {Object.entries(ENTITY_TYPE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="insert">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="approve">Approved</SelectItem>
                <SelectItem value="reject">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36 h-9 text-xs"><Clock className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Sparkline */}
          <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Activity (24h)</p>
            <div className="flex items-end gap-[2px] h-12">
              {hourlyActivity.map((h, i) => {
                const max = Math.max(...hourlyActivity.map(x => x.count), 1);
                const height = (h.count / max) * 100;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div
                      className="bg-primary/60 hover:bg-primary rounded-t-sm transition-colors w-full"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${h.hour}: ${h.count} events`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted-foreground">{hourlyActivity[0]?.hour}</span>
              <span className="text-[8px] text-muted-foreground">{hourlyActivity[hourlyActivity.length - 1]?.hour}</span>
            </div>
          </div>

          {/* Log entries */}
          <div className="bg-card rounded-xl shadow-soft border border-border">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-foreground">No audit logs found</p>
                <p className="text-xs text-muted-foreground mt-1">System activity will appear here automatically</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y divide-border">
                  {filteredLogs.map(log => {
                    const entityCfg = ENTITY_TYPE_CONFIG[log.entity_type] || { label: log.entity_type, icon: Activity, color: "bg-muted text-muted-foreground" };
                    const EntityIcon = entityCfg.icon;
                    const op = parseAction(log.action);
                    const ActionIcon = ACTION_ICON[op] || Edit;
                    const summary = getChangeSummary(log);
                    const isCritical = log.action.includes("delete") || log.entity_type === "user_role";

                    return (
                      <div
                        key={log.id}
                        className={`px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${isCritical ? "border-l-2 border-l-destructive" : ""}`}
                        onClick={() => setSelectedLog(log)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg p-1.5 shrink-0 ${entityCfg.color}`}>
                            <EntityIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{getProfileName(log.actor_id)}</span>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${getActionColor(log.action)}`}>
                                {getActionLabel(log.action)}
                              </Badge>
                              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${entityCfg.color}`}>
                                {entityCfg.label}
                              </Badge>
                              {isCritical && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/30 inline-flex items-center gap-1">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Critical
                                </Badge>
                              )}
                            </div>
                            {summary && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-md">{summary}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })} • {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                            </p>
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
            {filteredLogs.length > 0 && (
              <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
                Showing {filteredLogs.length} of {auditLogs.length} events
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ MODULE BREAKDOWN ═══ */}
        <TabsContent value="breakdown" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.entityBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([entity, count]) => {
                const cfg = ENTITY_TYPE_CONFIG[entity] || { label: entity, icon: Activity, color: "bg-muted text-muted-foreground" };
                const Icon = cfg.icon;
                const inserts = auditLogs.filter(l => l.entity_type === entity && l.action.includes("insert")).length;
                const updates = auditLogs.filter(l => l.entity_type === entity && l.action.includes("update")).length;
                const deletes = auditLogs.filter(l => l.entity_type === entity && l.action.includes("delete")).length;
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                return (
                  <div key={entity} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`rounded-lg p-2 ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground">{count} events ({pct}%)</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                      <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs font-semibold text-primary">{inserts}</p>
                        <p className="text-[9px] text-muted-foreground">Created</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{updates}</p>
                        <p className="text-[9px] text-muted-foreground">Updated</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-destructive">{deletes}</p>
                        <p className="text-[9px] text-muted-foreground">Deleted</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>

        {/* ═══ ACTOR ANALYSIS ═══ */}
        <TabsContent value="actors" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl shadow-soft border border-border">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Most Active Users</h3>
            </div>
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border">
                {(() => {
                  const actorCounts: Record<string, { total: number; actions: Record<string, number> }> = {};
                  auditLogs.forEach(l => {
                    if (!actorCounts[l.actor_id]) actorCounts[l.actor_id] = { total: 0, actions: {} };
                    actorCounts[l.actor_id].total++;
                    const action = getActionLabel(l.action);
                    actorCounts[l.actor_id].actions[action] = (actorCounts[l.actor_id].actions[action] || 0) + 1;
                  });

                  return Object.entries(actorCounts)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 50)
                    .map(([actorId, data]) => {
                      const lastAction = auditLogs.find(l => l.actor_id === actorId);
                      return (
                        <div key={actorId} className="px-5 py-3.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold">
                              {getProfileName(actorId)[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{getProfileName(actorId)}</p>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                              {Object.entries(data.actions)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 4)
                                .map(([action, count]) => (
                                  <Badge key={action} variant="outline" className="text-[8px] h-3.5 px-1">
                                    {action} ({count})
                                  </Badge>
                                ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{data.total}</p>
                            <p className="text-[9px] text-muted-foreground">
                              Last: {lastAction ? formatDistanceToNow(new Date(lastAction.created_at), { addSuffix: true }) : "N/A"}
                            </p>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ DETAIL DIALOG ═══ */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actor</p>
                  <p className="text-sm font-semibold text-foreground">{getProfileName(selectedLog.actor_id)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedLog.actor_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Timestamp</p>
                  <p className="text-sm font-semibold text-foreground">{format(new Date(selectedLog.created_at), "MMM d, yyyy HH:mm:ss")}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(selectedLog.created_at), { addSuffix: true })}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Action</p>
                  <Badge variant="outline" className={`text-xs ${getActionColor(selectedLog.action)}`}>
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entity</p>
                  <Badge variant="outline" className={`text-xs ${ENTITY_TYPE_CONFIG[selectedLog.entity_type]?.color || ""}`}>
                    {ENTITY_TYPE_CONFIG[selectedLog.entity_type]?.label || selectedLog.entity_type}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entity ID</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedLog.entity_id || "N/A"}</p>
                </div>
                {selectedLog.ip_address && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">IP Address</p>
                    <p className="text-xs font-mono text-muted-foreground">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>

              {/* Change Details */}
              {selectedLog.details && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Change Details</p>
                  {selectedLog.details.old && selectedLog.details.new ? (
                    <div className="space-y-1.5 max-h-64 overflow-auto">
                      {Object.keys(selectedLog.details.new).map(key => {
                        if (["updated_at", "created_at"].includes(key)) return null;
                        const oldVal = JSON.stringify(selectedLog.details.old[key]);
                        const newVal = JSON.stringify(selectedLog.details.new[key]);
                        if (oldVal === newVal) return null;
                        return (
                          <div key={key} className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-[10px] font-semibold text-foreground uppercase">{key}</p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>
                                <p className="text-[9px] text-muted-foreground">Before</p>
                                <p className="text-[11px] text-destructive font-mono break-all">{oldVal === "null" ? "—" : oldVal}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-muted-foreground">After</p>
                                <p className="text-[11px] text-primary font-mono break-all">{newVal === "null" ? "—" : newVal}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <ScrollArea className="max-h-48">
                      <pre className="text-[10px] bg-muted/50 rounded-lg p-3 font-mono text-muted-foreground overflow-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogsPage;
