import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Megaphone, BarChart3, FileText, BotMessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/reports", icon: FileText, label: "Reports" },
  { path: "/client-chat", icon: BotMessageSquare, label: "AI" },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 h-0.5 w-8 bg-primary rounded-full -mt-2" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}