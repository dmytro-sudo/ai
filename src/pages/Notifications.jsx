import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { Bell, Zap, TrendingUp, AlertTriangle, CreditCard, Megaphone, Info, CheckCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import moment from "moment";
import { cn } from "@/lib/utils";

const typeConfig = {
  alert: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  success: { icon: TrendingUp, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  news: { icon: Zap, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  info: { icon: Info, color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/20" },
};

const categoryConfig = {
  billing: { icon: CreditCard, label: "Billing" },
  performance: { icon: TrendingUp, label: "Performance" },
  creative: { icon: Megaphone, label: "Creative" },
  campaign: { icon: Megaphone, label: "Campaign" },
  ai_insight: { icon: Sparkles, label: "AI Insight" },
  system: { icon: Info, label: "System" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = () => {
    base44.entities.Notification.list("-created_date", 100)
      .then(setNotifications)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
    load();
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const filtered = filter === "all" ? notifications : filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Alerts & News" subtitle="Real-time notifications from EI and your campaigns">
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-2 rounded-xl border-border text-muted-foreground hover:text-foreground text-xs">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          { key: "alert", label: "Alerts" },
          { key: "news", label: "News" },
          { key: "success", label: "Wins" },
          { key: "warning", label: "Warnings" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-foreground font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">EI will notify you of important updates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const catCfg = categoryConfig[n.category] || categoryConfig.system;
            const TypeIcon = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={cn(
                  "bg-card border rounded-2xl p-5 transition-all cursor-pointer hover:border-primary/20",
                  cfg.border,
                  !n.is_read && "border-l-4"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <TypeIcon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                          {catCfg.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{moment(n.created_date).fromNow()}</span>
                      </div>
                    </div>
                    {n.action_label && (
                      <button className="mt-2 text-xs text-primary font-medium hover:underline">{n.action_label} →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}