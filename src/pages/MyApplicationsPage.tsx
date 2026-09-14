import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMyApplications } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, CheckCircle, XCircle, FileText } from "lucide-react";

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: "bg-secondary/20 text-secondary", icon: Clock },
  shortlisted: { color: "bg-emerald-light text-primary", icon: CheckCircle },
  rejected: { color: "bg-destructive/10 text-destructive", icon: XCircle },
  hired: { color: "bg-primary text-primary-foreground", icon: CheckCircle },
  interviewed: { color: "bg-gold-light text-secondary", icon: FileText },
  offered: { color: "bg-primary/10 text-primary", icon: CheckCircle },
};

const MyApplicationsPage = () => {
  const { user, loading } = useAuth();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["myApplications", user?.id],
    queryFn: () => fetchMyApplications(user!.id),
    enabled: !!user,
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track the status of all your job applications.</p>
      </div>

      {isLoading ? (
        <p className="text-center py-12 text-muted-foreground text-sm">Loading...</p>
      ) : applications && applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => {
            const job = (app as any).jobs;
            const cfg = statusConfig[app.status || "pending"] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={app.id} className="bg-card rounded-xl p-5 shadow-soft border border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{job?.title || "Job"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{job?.company} • {job?.location}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {(app.status || "pending").charAt(0).toUpperCase() + (app.status || "pending").slice(1)}
                  </div>
                </div>
                {app.cover_letter && (
                  <p className="text-xs text-muted-foreground mt-3 bg-muted p-3 rounded-lg line-clamp-2">{app.cover_letter}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Briefcase className="mx-auto text-muted-foreground/20 mb-4 h-12 w-12" />
          <h3 className="font-display text-base font-semibold text-foreground">No Applications Yet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            <Link to="/jobs" className="text-primary hover:underline">Browse jobs</Link> and start applying!
          </p>
        </div>
      )}
    </div>
  );
};

export default MyApplicationsPage;
