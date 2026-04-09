import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogOut, Sun, Moon, Monitor, CreditCard, CheckCircle2, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";

const THEME_KEY = "ei-theme";

function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || "dark");

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (t === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(t);
    }
  };

  return [theme, setTheme];
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$297",
    period: "/mo",
    desc: "1 ad platform, up to $5K/mo spend",
    features: ["1 Ad Platform (Meta or Google)", "Up to $5K monthly ad spend", "AI chat assistant", "Weekly reports", "Email support"],
    color: "border-border",
    badge: null,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$597",
    period: "/mo",
    desc: "2 platforms, up to $20K/mo spend",
    features: ["Meta Ads + Google Ads", "Up to $20K monthly ad spend", "Live analytics dashboard", "Daily reports + AI insights", "CRM integration", "Priority support"],
    color: "border-primary/50 bg-primary/5",
    badge: "Most Popular",
  },
  {
    id: "scale",
    name: "Scale",
    price: "$1,197",
    period: "/mo",
    desc: "Unlimited spend, full automation",
    features: ["All platforms", "Unlimited monthly ad spend", "Full AI automation", "Custom reports + API", "Dedicated account manager", "White-glove onboarding"],
    color: "border-warning/30",
    badge: "Best Value",
  },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useTheme();
  const [notifications, setNotifications] = useState({
    dailyReport: true, weeklyReport: true, monthlyReport: true,
    campaignAlerts: true, budgetAlerts: true,
  });
  const [currentPlan] = useState("growth");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u?.notifications) setNotifications(u.notifications);
      setLoading(false);
    });
  }, []);

  const saveNotifications = async () => {
    await base44.auth.updateMe({ notifications });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Account, appearance, billing, and preferences" />

      <Tabs defaultValue="account">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* ACCOUNT */}
        <TabsContent value="account" className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Profile Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                <Input value={user?.full_name || ""} disabled className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Email</Label>
                <Input value={user?.email || ""} disabled className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Role</Label>
                <Input value={user?.role || "user"} disabled className="bg-background border-border capitalize" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Member Since</Label>
                <Input value={user?.created_date ? new Date(user.created_date).toLocaleDateString() : "—"} disabled className="bg-background border-border" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground">End your current session</p>
              </div>
              <Button variant="outline" onClick={() => base44.auth.logout()} className="gap-2 rounded-xl border-border text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-2">Theme</h3>
            <p className="text-xs text-muted-foreground mb-5">Choose how the platform looks for you</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "dark", icon: Moon, label: "Dark", desc: "Default dark theme" },
                { id: "light", icon: Sun, label: "Light", desc: "Clean light theme" },
                { id: "system", icon: Monitor, label: "System", desc: "Follow OS setting" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <t.icon className={`w-5 h-5 mb-2 ${theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-medium ${theme === t.id ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              {[
                { key: "dailyReport", label: "Daily Reports", desc: "Receive daily performance summary" },
                { key: "weeklyReport", label: "Weekly Reports", desc: "Detailed weekly analysis" },
                { key: "monthlyReport", label: "Monthly Reports", desc: "Comprehensive monthly report" },
                { key: "campaignAlerts", label: "Campaign Alerts", desc: "Get notified of significant changes" },
                { key: "budgetAlerts", label: "Budget Alerts", desc: "Alerts when budget thresholds are reached" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                  />
                </div>
              ))}
            </div>
            <Button onClick={saveNotifications} className="mt-5 gap-2 rounded-xl bg-primary hover:bg-primary/90">
              {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : "Save Preferences"}
            </Button>
          </div>
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="space-y-6">
          {/* Current plan */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Current Plan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your active subscription</p>
              </div>
              <span className="bg-success/10 text-success text-xs font-medium px-3 py-1 rounded-full">Active</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-display font-bold text-foreground">$597</span>
              <span className="text-muted-foreground text-sm mb-1">/month</span>
            </div>
            <p className="text-sm text-foreground font-medium">Growth Plan</p>
            <p className="text-xs text-muted-foreground mt-1">Next billing: May 1, 2026 · Auto-renews</p>
            <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-3 gap-3">
              {[
                { label: "Ad Spend This Month", value: "$14,230" },
                { label: "Spend Limit", value: "$20,000" },
                { label: "Campaigns Running", value: "4 active" },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Payment Method</h3>
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-400 rounded-md flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/27</p>
                </div>
              </div>
              <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">Default</span>
            </div>
            <Button variant="outline" className="mt-3 rounded-xl border-border text-xs gap-2 text-muted-foreground hover:text-foreground">
              <CreditCard className="w-3.5 h-3.5" /> Update Payment Method
            </Button>
          </div>

          {/* Plan comparison */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Plans</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`bg-card border-2 rounded-2xl p-5 relative ${plan.color}`}>
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider bg-primary text-primary-foreground px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <p className="text-base font-display font-bold text-foreground">{plan.name}</p>
                  <div className="flex items-end gap-1 my-2">
                    <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-0.5">{plan.period}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="space-y-1.5 mb-5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                        <span className="text-xs text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                  {currentPlan === plan.id ? (
                    <div className="w-full text-center py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium">Current Plan</div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full rounded-xl border-border text-xs text-muted-foreground hover:text-foreground">
                      {plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan) ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invoice history */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-4">Invoice History</h3>
            <div className="space-y-2">
              {[
                { date: "Apr 1, 2026", amount: "$597.00", status: "Paid", inv: "INV-2026-04" },
                { date: "Mar 1, 2026", amount: "$597.00", status: "Paid", inv: "INV-2026-03" },
                { date: "Feb 1, 2026", amount: "$597.00", status: "Paid", inv: "INV-2026-02" },
                { date: "Jan 1, 2026", amount: "$597.00", status: "Paid", inv: "INV-2026-01" },
              ].map((inv, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{inv.inv}</p>
                      <p className="text-xs text-muted-foreground">{inv.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{inv.amount}</span>
                    <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">{inv.status}</span>
                    <button className="text-xs text-primary hover:underline">Download</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}