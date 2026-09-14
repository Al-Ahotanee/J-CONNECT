import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { useBranding } from "@/hooks/useBranding";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const branding = useBranding();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <footer className="border-t border-border bg-card px-6 py-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>© {new Date().getFullYear()} {branding.system_name}</span>
              <span>Version 1.0.0</span>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
