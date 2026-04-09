import { useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useWorkspace } from "@/lib/useWorkspace";
import { 
  LayoutDashboard, 
  Megaphone, 
  BarChart3, 
  FileText, 
  MessageCircle, 
  LifeBuoy, 
  Settings,
  X,
  Bell,
  FilePlus,
  ImagePlay,
  Activity,
  Search,
  CreditCard,
  BotMessageSquare,
  CalendarDays,
  ShieldCheck,
  Library,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { path: "/analytics", icon: BarChart3, label: "Analytics", submenu: [
    { path: "/analytics?platform=meta", label: "Meta Ads" },
    { path: "/analytics?platform=google", label: "Google Ads" }
  ] },
  { path: "/live", icon: Activity, label: "Live Analytics", submenu: [
    { path: "/live?platform=meta", label: "Meta Ads" },
    { path: "/live?platform=google", label: "Google Ads" }
  ] },
  { path: "/reports", icon: FileText, label: "Reports" },
  { path: "/report-builder", icon: FilePlus, label: "Report Builder" },
  { path: "/market-research", icon: Search, label: "Market Research" },
  { path: "/client-chat", icon: BotMessageSquare, label: "AI Assistant", highlight: true },
  { path: "/creatives", icon: ImagePlay, label: "Ad Creatives" },
  { path: "/notifications", icon: Bell, label: "Alerts & News" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/admin/workspaces", icon: ShieldCheck, label: "Admin: Workspaces", adminOnly: true },
  { path: "/users", icon: Users, label: "User Management", adminOnly: true },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const slug = workspace?.slug || '';
  const [openSubmenu, setOpenSubmenu] = useState(null);

  return (
    <div className="w-72 h-full bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">TopNotch</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Marketing Platform</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      <WorkspaceSwitcher />

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 flex flex-col">
        <div className="space-y-1 flex-1">
        {navItems.filter(i => i.path !== '/creatives' && !i.adminOnly).map((item) => {
          const fullPath = item.path === '/' ? `/${slug}/dashboard` : `/${slug}${item.path}`;
          const isActive = location.pathname.startsWith(fullPath.split('?')[0]);
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          return (
            <div
              key={item.path}
              onClick={() => hasSubmenu && setOpenSubmenu(openSubmenu === item.path ? null : item.path)}
            >
              <Link
                to={fullPath}
                onClick={(e) => {
                  if (hasSubmenu) e.preventDefault();
                  onClose && onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px]", isActive && "text-primary")} />
                <span>{item.label}</span>
                {item.soon && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
                {item.highlight && !item.soon && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold bg-success/20 text-success px-2 py-0.5 rounded-full animate-pulse">
                    New
                  </span>
                )}
                {hasSubmenu && (
                  <span className="ml-auto text-[12px] text-muted-foreground">▼</span>
                )}
              </Link>
              {hasSubmenu && openSubmenu === item.path && (
                <div className="mt-1 ml-4 space-y-0.5 border-l border-sidebar-border/50 pl-3">
                  {item.submenu.map(sub => {
                    const subFullPath = `/${slug}${sub.path}`;
                    const isSubActive = location.pathname === subFullPath.split('?')[0] && location.search === sub.path.split('?')[1] ? '?' + sub.path.split('?')[1] : '';
                    return (
                      <Link
                        key={sub.path}
                        to={subFullPath}
                        onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>

        {/* Bottom nav items */}
        <div className="mt-2 pt-2 border-t border-sidebar-border/50 space-y-1">
          {navItems.filter(i => i.path === '/creatives' || i.adminOnly).map((item) => {
            const fullPath = item.adminOnly ? item.path : `/${slug}${item.path}`;
            const isActive = location.pathname === fullPath;
            return (
              <Link
                key={item.path}
                to={fullPath}
                onClick={() => onClose && onClose()}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("w-[16px] h-[16px]", isActive && "text-primary")} />
                <span>{item.label}</span>
                {item.soon && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}