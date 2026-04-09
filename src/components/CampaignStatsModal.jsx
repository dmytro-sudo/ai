import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { extractLeads } from "../utils/metaHelpers";
import { X, Loader2, CalendarDays } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const PRESETS = [
  { label: "7D", value: "last_7d" },
  { label: "14D", value: "last_14d" },
  { label: "30D", value: "last_30d" },
  { label: "90D", value: "last_90d" },
];

export default function CampaignStatsModal({ campaign, onClose }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);
  const [selected, setSelected] = useState("last_30d");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [appliedCustom, setAppliedCustom] = useState(null); // { since, until } or null

  useEffect(() => {
    setLoading(true);
    const timeParam = appliedCustom
      ? { since: appliedCustom.since, until: appliedCustom.until }
      : { datePreset: selected };

    Promise.all([
      base44.functions.invoke("metaAds", { action: "getInsights", ...timeParam, campaignId: campaign.id }),
      base44.functions.invoke("metaAds", { action: "getCampaignInsights", campaignId: campaign.id, ...timeParam }),
    ]).then(([statsRes, dailyRes]) => {
      const insights = statsRes.data?.insights || [];
      const match = insights.find(i => i.campaign_id === campaign.id) || insights[0] || null;
      setStats(match);

      const dailyInsights = (dailyRes.data?.insights || []).map(d => {
        const [, m, day] = d.date_start.split("-");
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return {
          day: `${months[parseInt(m,10)-1]} ${parseInt(day,10)}`,
          spend: parseFloat(d.spend || 0),
          leads: extractLeads(d.actions),
          clicks: parseInt(d.clicks || 0),
        };
      });
      setDaily(dailyInsights);
    }).finally(() => setLoading(false));
  }, [campaign.id, selected, appliedCustom]);

  const leads = stats ? extractLeads(stats.actions) : 0;
  const spend = stats ? parseFloat(stats.spend || 0) : 0;
  const clicks = stats ? parseInt(stats.clicks || 0) : 0;
  const impressions = stats ? parseInt(stats.impressions || 0) : 0;
  const ctr = stats ? parseFloat(stats.ctr || 0).toFixed(2) : "—";
  const cpl = leads > 0 ? `$${(spend / leads).toFixed(2)}` : "—";

  const handlePreset = (value) => {
    setSelected(value);
    setAppliedCustom(null);
    setShowCustom(false);
  };

  const applyCustom = () => {
    if (!since || !until) return;
    setAppliedCustom({ since, until });
    setShowCustom(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 p-6 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-display font-bold text-foreground">{campaign.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Campaign Statistics · Meta Ads</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Date picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
              {PRESETS.map(p => (
                <button key={p.value}
                  onClick={() => handlePreset(p.value)}
                  className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    !appliedCustom && selected === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustom(!showCustom)}
                className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  appliedCustom ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}>
                <CalendarDays className="w-3 h-3" />
                {appliedCustom ? `${appliedCustom.since} → ${appliedCustom.until}` : "Custom"}
              </button>
            </div>

            {showCustom && (
              <div className="flex items-center gap-2 bg-secondary rounded-xl p-2 flex-wrap">
                <input type="date" value={since} onChange={e => setSince(e.target.value)} max={until || undefined}
                  className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                <span className="text-xs text-muted-foreground">→</span>
                <input type="date" value={until} onChange={e => setUntil(e.target.value)} min={since || undefined}
                  className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none" />
                <button onClick={applyCustom} disabled={!since || !until}
                  className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Spent", value: `$${spend.toLocaleString(undefined,{maximumFractionDigits:0})}` },
                  { label: "Leads", value: leads.toLocaleString() },
                  { label: "Clicks", value: clicks.toLocaleString() },
                  { label: "Impressions", value: impressions >= 1000 ? `${(impressions/1000).toFixed(1)}K` : impressions },
                  { label: "CTR", value: `${ctr}%` },
                  { label: "CPL", value: cpl },
                ].map((k, i) => (
                  <div key={i} className="bg-secondary rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{k.label}</p>
                    <p className="text-lg font-bold text-foreground">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              {daily.length > 0 && (
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="bg-secondary rounded-2xl p-4">
                    <h4 className="text-xs font-medium text-foreground mb-3">Daily Spend</h4>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={daily}>
                          <defs>
                            <linearGradient id="csgSpend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(330,80%,60%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(330,80%,60%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={Math.max(0, Math.floor(daily.length / 6) - 1)} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="spend" name="Spend $" stroke="hsl(330,80%,60%)" fill="url(#csgSpend)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-secondary rounded-2xl p-4">
                    <h4 className="text-xs font-medium text-foreground mb-3">Daily Leads</h4>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={Math.max(0, Math.floor(daily.length / 6) - 1)} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="leads" name="Leads" fill="hsl(160,70%,45%)" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}