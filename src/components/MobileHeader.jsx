import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function MobileHeader({ onMenuClick }) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-display font-bold text-base">T</span>
        </div>
        <div>
          <span className="font-display font-bold text-foreground text-base">TopNotch</span>
          <span className="text-muted-foreground text-xs font-medium"> AI Platform</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-secondary">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
}