import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useWorkspace } from "../lib/useWorkspace";
import WorkspaceBanner from "./WorkspaceBanner";
import FloatingSupport from "./FloatingSupport";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import { useState } from "react";

export default function Layout() {
  const { workspace } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (workspace?.name && workspace?.id) {
      document.title = `${workspace.name} | TopNotch AI`;
      localStorage.setItem('current-workspace-id', workspace.id);
    }
  }, [workspace?.id, workspace?.name]);

  if (!workspace) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-screen overflow-y-auto flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 h-full animate-slide-up">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <WorkspaceBanner />
        {/* Top bar with notification bell (desktop only) */}
        <div className="hidden lg:flex items-center justify-end px-8 py-3 border-b border-border bg-background/50 backdrop-blur-sm">
          <NotificationBell />
        </div>
        <MobileHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8" style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}>
          <Outlet />
        </main>
        <MobileBottomNav />
        <FloatingSupport />
      </div>
    </div>
  );
}