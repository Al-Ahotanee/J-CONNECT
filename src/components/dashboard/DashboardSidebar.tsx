import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { ROLE_LABELS, getHighestRole } from "@/lib/roles";
import { useBranding, useLogoUrl } from "@/hooks/useBranding";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HUBS, detectActiveHub, getHubNavigation } from "./navigationConfig";
import { HubSwitcher } from "./HubSwitcher";

const DashboardSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const branding = useBranding();
  const logoUrl = useLogoUrl();

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const activeHubId = detectActiveHub(location.pathname);
  const currentHub = HUBS[activeHubId];
  const navGroups = getHubNavigation(activeHubId, roles);
  const highestRole = getHighestRole(roles);

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/learning" || path === "/jobs" || path === "/community" || path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderMenuItems = (items: { title: string; url: string; icon: any; badge?: string }[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url + item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
          <Link to={item.url} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </div>
            {!collapsed && item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-primary/10 text-primary font-medium">
                {item.badge}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderGroup = (label: string, items: { title: string; url: string; icon: any; badge?: string }[]) => {
    if (!items.length) return null;
    return (
      <SidebarGroup key={label} className="py-1">
        <SidebarGroupLabel className="text-sidebar-foreground/45 text-[10px] uppercase tracking-widest font-body font-semibold">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(items)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-3 gap-3">
        {/* Brand & Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <img
            src={logoUrl}
            alt={branding.system_name}
            className="h-9 w-9 rounded-lg shrink-0 object-contain shadow-xs transition-transform group-hover:scale-105"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-bold text-sidebar-foreground leading-tight truncate">
                {branding.system_name}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest truncate">
                {branding.tagline.split(" ").slice(0, 3).join(" ")}
              </span>
            </div>
          )}
        </Link>

        {/* Workspace Quick Switcher in Sidebar */}
        {!collapsed && (
          <div className="pt-1">
            <HubSwitcher variant="sidebar" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* If user is inside a specialized Hub (not Central), show Back to Central action & Active Hub card */}
        {activeHubId !== "central" && (
          <div className="mb-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Return to Central Command"
                  className="text-muted-foreground hover:text-foreground font-medium text-xs bg-sidebar-accent/30 hover:bg-sidebar-accent"
                >
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    {!collapsed && <span>Return to Central</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {!collapsed && (
              <div className="mt-2.5 mx-1 p-2.5 rounded-lg border bg-sidebar-accent/40 border-sidebar-border/70 flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${currentHub.badgeColor} shrink-0`}>
                  <currentHub.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-sidebar-foreground truncate">
                    {currentHub.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {currentHub.tagline}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Contextual Navigation Groups */}
        {navGroups.map((group) => renderGroup(group.label, group.items))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary-foreground text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize truncate">
                {ROLE_LABELS[highestRole] || "Citizen"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => signOut()}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
