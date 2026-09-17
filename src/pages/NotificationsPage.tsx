import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications, markNotificationRead } from "@/lib/api";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, ExternalLink, CheckCircle2, AlertTriangle, AlertCircle, Megaphone, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const NotificationsPage = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user,
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-full-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error": return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "announcement": return <Megaphone className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl shadow-soft border border-border">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You'll see notifications here when there's activity</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`px-5 py-4 hover:bg-muted/30 transition-colors ${!n.is_read ? "bg-accent/20 border-l-2 border-l-primary" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {!n.is_read && <Badge className="bg-primary/10 text-primary text-[9px] h-4 px-1.5">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {n.link && (
                        <Link to={n.link} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" /> View
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleMarkRead(n.id)}>
                      <Check className="h-3 w-3 mr-1" /> Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
