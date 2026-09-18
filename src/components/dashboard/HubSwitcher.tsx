import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchUserRoles } from "@/lib/api";
import { canAccessAdmin } from "@/lib/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid, ChevronDown, Check, Sparkles, ExternalLink,
} from "lucide-react";
import { HUBS, HubId, detectActiveHub } from "./navigationConfig";

interface HubSwitcherProps {
  variant?: "header" | "sidebar";
  showLabel?: boolean;
}

export const HubSwitcher = ({ variant = "header", showLabel = true }: HubSwitcherProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeHubId = detectActiveHub(location.pathname);
  const currentHub = HUBS[activeHubId];

  const { data: roles = [] } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: () => fetchUserRoles(user!.id),
    enabled: !!user,
  });

  const isAdmin = canAccessAdmin(roles);

  const visibleHubs: HubId[] = ["central", "learning", "jobs", "community"];
  if (isAdmin) {
    visibleHubs.push("governance");
  }

  const handleSelectHub = (hubId: HubId) => {
    const hub = HUBS[hubId];
    if (hub) {
      navigate(hub.defaultPath);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between px-2.5 py-1.5 h-auto font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-sidebar-border/60 rounded-lg group transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded-md ${currentHub.badgeColor} shrink-0`}>
                <currentHub.icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  {currentHub.shortName} Hub
                </span>
                <span className="text-[10px] text-muted-foreground truncate leading-tight">
                  Switch Workspace
                </span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform duration-200" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 px-2.5 text-xs font-medium bg-background/80 hover:bg-accent border-border/80 shadow-xs"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-primary shrink-0" />
            {showLabel && (
              <span className="hidden sm:inline font-semibold text-foreground">
                {currentHub.shortName}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={variant === "sidebar" ? "start" : "end"} className="w-72 p-2 shadow-lg border-border">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center justify-between">
          <span>PORTAL WORKSPACES</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono">
            J-Connect Hubs
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-1 py-1">
          {visibleHubs.map((hubId) => {
            const hub = HUBS[hubId];
            const isSelected = activeHubId === hubId;

            return (
              <DropdownMenuItem
                key={hubId}
                onClick={() => handleSelectHub(hubId)}
                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? "bg-accent/80 font-medium" : "hover:bg-muted/60"
                }`}
              >
                <div className={`p-2 rounded-lg ${hub.badgeColor} shrink-0 mt-0.5`}>
                  <hub.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {hub.name}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate leading-relaxed">
                    {hub.tagline}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/40 rounded-md">
          <span>Current Context:</span>
          <span className="font-semibold text-foreground">{currentHub.name}</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HubSwitcher;
