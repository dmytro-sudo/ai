import { useState, useEffect, useMemo } from "react";
import { extractLeads } from "../utils/metaHelpers";
import { base44 } from "@/api/supabaseClient";
import { DollarSign, Users, MousePointer, TrendingUp, Megaphone, Settings, X, Check, Loader2, PhoneCall, Trophy, BarChart2, Layers, WifiOff } from "lucide-react";
import { useWorkspace } from "@/lib/useWorkspace";
import { useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import StatCard from "../components/StatCard";
import DateRangePicker from "../components/DateRangePicker";

import PageHeader from "../components/PageHeader";
import PlatformBadge from "../components/PlatformBadge";
import StatusBadge from "../components/StatusBadge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import moment from "moment";



const ALL_WIDGETS = [
  { id: "stats", label: "KPI Stats" },
  { id: "weekly_spend", label: "Spend Chart" },
  { id: "budget_split", label: "Budget Split" },
  { id: "campaigns", label: "Recent Campaigns" },
];

const PLATFORM_COLORS = {
  "Meta Ads": "hsl(330, 80%, 60%)",
  "Google Ads": "hsl(200, 80%, 55%)",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: ${p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { workspace } = useWorkspace();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaStats, setMetaStats] = useState(null);
  const [metaDaily, setMetaDaily] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [metaInsights, setMetaInsights] = useState([]);
  const [metaCampLoading, setMetaCampLoading] = useState(true);
  const [dateParams, setDateParams] = useState({ datePreset: "last_30d" });
  const [ghlStats, setGhlStats] = useState(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tn-widgets")) || ALL_WIDGETS.map(w => w.id); }
    catch { return ALL_WIDGETS.map(w => w.id); }
  });

  useEffect(() => {
    if (!workspace?.id) return;
    base44.entities.Campaign.filter({ workspace_id: workspace.id }, "-created_date", 100).then(setCampaigns).finally(() => setLoading(false));
    base44.functions.invoke("ghl", { action: "getStats", workspace_id: workspace.id })
      .then(res => { if (res.data?.stats) setGhlStats(res.data.stats); })
      .catch(() => {});
    setMetaCampLoading(true);
    Promise.all([
      base44.functions.invoke("metaAds", { action: "getCampaigns", workspace_id: workspace.id }),
      base44.functions.invoke("metaAds", { action: "getInsights", datePreset: "last_30d", workspace_id: workspace.id }),
    ]).then(([campRes, insRes]) => {
      setMetaCampaigns(campRes.data?.campaigns || []);
      setMetaInsights(insRes.data?.insights || []);
    }).catch(() => {}).finally(() => setMetaCampLoading(false));
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    const p = dateParams.since
      ? { since: dateParams.since, until: dateParams.until }
      : { datePreset: dateParams.datePreset };
    setMetaLoading(true);
    Promise.all([
      base44.functions.invoke("metaAds", { action: "getAccountInsights", workspace_id: workspace.id, ...p }),
      base44.functions.invoke("metaAds", { action: "getDailyInsights", workspace_id: workspace.id, ...p }),
    ]).then(([statsRes, dailyRes]) => {
      setMetaStats(statsRes.data?.insights || null);
      const daily = (dailyRes.data?.insights || []).map(d => {
        const leads = d.actions?.find(a => a.action_type === "onsite_conversion.lead")?.value || 0;
        let dayLabel = "";
        if (d.date_start) {
          const [, m, day] = d.date_start.split("-");
          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          dayLabel = `${months[parseInt(m,10)-1]} ${parseInt(day,10)}`;
        }
        return {
          day: dayLabel,
          spend: parseFloat(d.spend || 0),
          clicks: parseInt(d.clicks || 0),
          leads: parseInt(leads),
        };
      });
      setMetaDaily(daily);
    }).finally(() => setMetaLoading(false));
  }, [dateParams, workspace?.id]);

  const filtered = useMemo(() => campaigns, [campaigns]);

  // Use Meta live data if available, fallback to DB campaigns
  const totalSpent = metaStats ? parseFloat(metaStats.spend || 0) : filtered.reduce((s, c) => s + (c.spent || 0), 0);
  const totalClicks = metaStats ? parseInt(metaStats.clicks || 0) : filtered.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = metaStats ? parseInt(metaStats.impressions || 0) : filtered.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalLeads = metaStats
    ? extractLeads(metaStats.actions)
    : filtered.reduce((s, c) => s + (c.leads || 0), 0);
  const totalRevenue = filtered.reduce((s, c) => s + (c.revenue || 0), 0);
  const avgCPL = totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : "0.00";
  const ctr = metaStats ? parseFloat(metaStats.ctr || 0).toFixed(2) : "0.00";
  const roas = totalSpent > 0 && totalRevenue > 0 ? (totalRevenue / totalSpent).toFixed(1) : "0.0";

  // Use real Meta daily data for chart
  const weeklyData = useMemo(() => {
    return metaDaily.map(d => ({ day: d.day, meta: d.spend, google: 0 }));
  }, [metaDaily]);

  const pieData = useMemo(() => {
    if (metaStats) {
      // Use real Meta API spend
      const metaSpent = parseFloat(metaStats.spend || 0);
      return [
        { name: "Meta Ads", value: 100, amount: metaSpent, color: "hsl(330, 80%, 60%)" },
        { name: "Google Ads", value: 0, amount: 0, color: "hsl(200, 80%, 55%)" },
      ];
    }
    const metaSpent = filtered.filter(c => c.platform === "Meta Ads").reduce((s, c) => s + (c.spent || 0), 0);
    const googleSpent = filtered.filter(c => c.platform === "Google Ads").reduce((s, c) => s + (c.spent || 0), 0);
    const total = metaSpent + googleSpent || 1;
    return [
      { name: "Meta Ads", value: Math.round(metaSpent / total * 100), amount: metaSpent, color: "hsl(330, 80%, 60%)" },
      { name: "Google Ads", value: Math.round(googleSpent / total * 100), amount: googleSpent, color: "hsl(200, 80%, 55%)" },
    ];
  }, [filtered, metaStats]);

  const toggleWidget = (id) => {
    const next = visibleWidgets.includes(id) ? visibleWidgets.filter(w => w !== id) : [...visibleWidgets, id];
    setVisibleWidgets(next);
    localStorage.setItem("tn-widgets", JSON.stringify(next));
  };

  const show = (id) => visibleWidgets.includes(id);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time overview of your ad performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker onChange={setDateParams} />
          {/* Customize */}
          <div className="relative">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-3.5 h-3.5" /> Customize
            </button>
            {showCustomize && (
              <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-2xl shadow-2xl p-4 min-w-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-foreground">Visible Widgets</p>
                  <button onClick={() => setShowCustomize(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="space-y-2">
                  {ALL_WIDGETS.map(w => (
                    <button key={w.id} onClick={() => toggleWidget(w.id)} className="flex items-center gap-3 w-full text-left">
                      <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center transition-all", visibleWidgets.includes(w.id) ? "bg-primary border-primary" : "border-border")}>
                        {visibleWidgets.includes(w.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-foreground">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meta Live Badge */}
      {metaStats && (
        <div className="flex items-center gap-2 mb-4 text-xs text-success">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live data from Meta Ads
          {metaLoading && <Loader2 className="w-3 h-3 animate-spin ml-1 text-muted-foreground" />}
        </div>
      )}

      {/* KPI Stats */}
      {show("stats") && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Spent" value={totalSpent.toLocaleString(undefined, {maximumFractionDigits:0})} prefix="$" icon={DollarSign} />
          <StatCard title="Leads" value={totalLeads.toLocaleString()} icon={Users} />
          <StatCard title="Clicks" value={totalClicks.toLocaleString()} icon={MousePointer} />
          <StatCard title="Impressions" value={totalImpressions >= 1000 ? (totalImpressions/1000).toFixed(1)+"K" : totalImpressions.toLocaleString()} icon={TrendingUp} />
          <StatCard title="Avg. CPL" value={avgCPL} prefix="$" icon={DollarSign} />
          <StatCard title="CTR" value={ctr} suffix="%" icon={TrendingUp} />
        </div>
      )}

      {/* GHL CRM Stats */}
      {ghlStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-chart-2/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-chart-2" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CRM Contacts</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{(ghlStats.totalContacts || 0).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">GoHighLevel</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-warning/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-warning" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Open Deals</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{ghlStats.openDeals || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">${(ghlStats.pipelineValue || 0).toLocaleString()} pipeline</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-success" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Won Deals</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{ghlStats.wonDeals || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">${(ghlStats.wonValue || 0).toLocaleString()} closed</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{ghlStats.conversionRate || 0}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{ghlStats.totalOpportunities || 0} total opps</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Weekly Spend */}
        {show("weekly_spend") && (
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Ad Spend</h3>
            <p className="text-xs text-muted-foreground mb-6">Meta Ads — Amount Spent</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(330, 80%, 60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(330, 80%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="googleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="meta" name="Meta Ads" stroke="hsl(330, 80%, 60%)" fill="url(#metaGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="google" name="Google Ads" stroke="hsl(200, 80%, 55%)" fill="url(#googleGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Budget Split */}
        {show("budget_split") && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Budget Split</h3>
            <p className="text-xs text-muted-foreground mb-4">By platform</p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-foreground">${item.amount?.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    <span className="text-xs text-muted-foreground ml-1">({item.value}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      {show("campaigns") && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">Recent Campaigns</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Managed by TopNotch AI</p>
            </div>
            <Link to="/campaigns" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">View all</Link>
          </div>
          <div className="flex items-center gap-1 mb-5">
            {["all", "active", "paused"].map(f => (
              <button
                key={f}
                onClick={() => setCampaignFilter(f)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all", campaignFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground bg-secondary")}
              >
                {f === "all" ? "All" : f === "active" ? "Active" : "Paused"}
              </button>
            ))}
          </div>

          {metaCampLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (() => {
            const allCamps = metaCampaigns.length > 0 ? metaCampaigns : campaigns;
            const isLive = metaCampaigns.length > 0;
            const displayed = allCamps
              .filter(c => {
                const s = (c.status || "").toLowerCase();
                if (campaignFilter === "active") return s === "active";
                if (campaignFilter === "paused") return s === "paused";
                return true;
              })
              .slice(0, 8);
            return displayed.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No campaigns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {isLive && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-success">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Live from Meta Ads
                  </div>
                )}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campaign", "Status", "Budget/day", "Spent", "Clicks", "Leads", "CPL"].map(h => (
                        <th key={h} className={`text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3 ${h === "Campaign" ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((c) => {
                      const ins = metaInsights.find(i => i.campaign_id === c.id) || {};
                      const leads = extractLeads(ins.actions);
                      const spent = parseFloat(ins.spend || c.spent || 0);
                      const clicks = parseInt(ins.clicks || c.clicks || 0);
                      const cpl = leads > 0 ? `$${(spent / leads).toFixed(2)}` : "—";
                      const dailyBudget = c.daily_budget ? `$${(c.daily_budget / 100).toLocaleString()}` : "—";
                      const status = (c.status || "").toLowerCase();
                      return (
                        <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="py-3.5 pr-4 text-sm font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-3.5 pr-4 text-right"><StatusBadge status={status === "active" ? "active" : status === "paused" ? "paused" : "draft"} /></td>
                          <td className="py-3.5 text-right text-sm text-muted-foreground">{dailyBudget}</td>
                          <td className="py-3.5 text-right text-sm text-foreground">${spent.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                          <td className="py-3.5 text-right text-sm text-foreground">{clicks.toLocaleString()}</td>
                          <td className="py-3.5 text-right text-sm text-foreground">{leads}</td>
                          <td className="py-3.5 text-right text-sm font-medium text-foreground">{cpl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}