import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = () => {
      base44.entities.Notification.filter({ is_read: false }, "-created_date", 100)
        .then((n) => setUnreadCount(n.length))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
      <Bell className="w-5 h-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}