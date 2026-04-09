import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { extractLeads } from "../utils/metaHelpers";
import {
  X, Loader2, CalendarDays, TrendingUp, TrendingDown, Users, MousePointerClick,
  Eye, DollarSign, Target, BarChart2, Clock, Check, ChevronDown
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
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

const TABS = ["Overview", "Audience", "Budget"];

function KpiMini({ label, value }) {
  return (
    <div className="bg-secondary rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function CampaignDetailModal({ campaign, onClose }) {
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [adsets, setAdsets] = useState([]);
  const [selected, setSelected] = useState("last_30d");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [appliedCustom, setAppliedCustom] = useState(null);

  // Budget state
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleAction, setScheduleAction] = useState(null); // { type, value }
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const currentDailyBudget = campaign.daily_budget ? campaign.daily_budget / 100 : 0;

  useEffect(() => {
    setLoading(true);
    const timeParam = appliedCustom
      ? { since: appliedCustom.since, until: appliedCustom.until }
      : { datePreset: selected };

    Promise.all([
      base44.functions.invoke("metaAds", { action: "getInsights", ...timeParam, campaignId: campaign.id }),
      base44.functions.invoke("metaAds", { action: "getCampaignInsights", campaignId: campaign.id, ...timeParam }),
      base44.functions.invoke("metaAds", { action: "getCampaignAgeBreakdown", campaignId: campaign.id, ...timeParam }),
      base44.functions.invoke("metaAds", { action: "getCampaignGenderBreakdown", campaignId: campaign.id, ...timeParam }),
      base44.functions.invoke("metaAds", { action: "getCampaignAdSets", campaignId: campaign.id }),
    ]).then(([statsRes, dailyRes, ageRes, genderRes, adsetsRes]) => {
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

      const ages = (ageRes.data?.insights || []).map(d => ({
        age: d.age,
        leads: extractLeads(d.actions),
        clicks: parseInt(d.clicks || 0),
        impressions: parseInt(d.impressions || 0),
        ctr: parseFloat(d.ctr || 0).toFixed(2),
        spend: parseFloat(d.spend || 0),
      }));
      setAgeData(ages);

      const genders = (genderRes.data?.insights || []).map(d => ({
        gender: d.gender === "male" ? "Male" : d.gender === "female" ? "Female" : "Unknown",
        leads: extractLeads(d.actions),
        clicks: parseInt(d.clicks || 0),
        ctr: parseFloat(d.ctr || 0).toFixed(2),
        spend: parseFloat(d.spend || 0),
      }));
      setGenderData(genders);

      setAdsets(adsetsRes.data?.adsets || []);
    }).finally(() => setLoading(false));
  }, [campaign.id, selected, appliedCustom]);

  const leads = stats ? extractLeads(stats.actions) : 0;
  const spend = stats ? parseFloat(stats.spend || 0) : 0;
  const clicks = stats ? parseInt(stats.clicks || 0) : 0;
  const impressions = stats ? parseInt(stats.impressions || 0) : 0;
  const ctr = stats ? parseFloat(stats.ctr || 0).toFixed(2) : "—";
  const cpl = leads > 0 ? `$${(spend / leads).toFixed(2)}` : "—";
  const cpc = stats ? `$${parseFloat(stats.cpc || 0).toFixed(2)}` : "—";

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

  const applyBudget = async (newBudget) => {
    if (!newBudget || newBudget <= 0) return;
    setBudgetSaving(true);
    await base44.functions.invoke("metaAds", {
      action: "updateCampaignBudget",
      campaignId: campaign.id,
      dailyBudget: Math.round(newBudget * 100),
    });
    setBudgetSaving(false);
    setBudgetSuccess(true);
    campaign.daily_budget = Math.round(newBudget * 100);
    setTimeout(() => setBudgetSuccess(false), 2000);
  };

  const handleQuickBudget = (pct) => {
    const newBudget = currentDailyBudget * (1 + pct / 100);
    applyBudget(newBudget);
  };

  const saveSchedule = async () => {
    if (!scheduleAction || !scheduleDate) return;
    setScheduleSaving(true);
    const pct = scheduleAction.type === "increase" ? scheduleAction.value : -scheduleAction.value;
    const newBudget = currentDailyBudget * (1 + pct / 100);
    await base44.entities.ScheduledAction.create({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      action_type: scheduleAction.type === "increase" ? "budget_increase" : "budget_decrease",
      scheduled_date: scheduleDate,
      scheduled_time: scheduleTime,
      value: `${scheduleAction.value}% → $${newBudget.toFixed(0)}/day`,
      reason: `Scheduled ${scheduleAction.type === "increase" ? "+" : "-"}${scheduleAction.value}% budget change`,
      status: "pending",
    });
    setScheduleSaving(false);
    setScheduleSuccess(true);
    setScheduleAction(null);
    setScheduleDate("");
    setTimeout(() => setScheduleSuccess(false), 3000);
  };

  const genderTotal = genderData.reduce((s, g) => s + g.leads, 0);

  // Extract interests from adsets targeting
  const allInterests = adsets.flatMap(as => {
    const t = as.targeting || {};
    const interests = t.flexible_spec?.flatMap(f => f.interests || []) || [];
    const behaviors = t.flexible_spec?.flatMap(f => f.behaviors || []) || [];
    return [...interests, ...behaviors];
  });
  const uniqueInterests = [...new Map(allInterests.map(i => [i.id || i.name, i])).values()];

  const ageRange = adsets.length > 0
    ? `${adsets[0].targeting?.age_min || "18"}–${adsets[0].targeting?.age_max || "65+"}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl max-h-[93vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex flex-col gap-3 p-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-display font-bold text-foreground">{campaign.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meta Ads · Daily budget: <span className="text-foreground font-medium">${currentDailyBudget.toLocaleString()}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {t}
                </button>
              ))}
            </div>

            {/* Date picker (not shown on Budget tab) */}
            {tab !== "Budget" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                  {PRESETS.map(p => (
                    <button key={p.value} onClick={() => handlePreset(p.value)}
                      className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                        !appliedCustom && selected === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}>
                      {p.label}
                    </button>
                  ))}
                  <button onClick={() => setShowCustom(!showCustom)}
                    className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all",
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
                      className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">Apply</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === "Overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KpiMini label="Spend" value={`$${spend.toLocaleString(undefined,{maximumFractionDigits:0})}`} />
                    <KpiMini label="Leads" value={leads.toLocaleString()} />
                    <KpiMini label="Clicks" value={clicks.toLocaleString()} />
                    <KpiMini label="Impressions" value={impressions >= 1000 ? `${(impressions/1000).toFixed(1)}K` : impressions} />
                    <KpiMini label="CTR" value={`${ctr}%`} />
                    <KpiMini label="CPL" value={cpl} />
                  </div>

                  {daily.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="bg-secondary rounded-2xl p-4">
                        <h4 className="text-xs font-medium text-foreground mb-3">Daily Spend</h4>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={daily}>
                              <defs>
                                <linearGradient id="cdSpend" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(330,80%,60%)" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="hsl(330,80%,60%)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={Math.max(0, Math.floor(daily.length / 6) - 1)} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="spend" name="Spend $" stroke="hsl(330,80%,60%)" fill="url(#cdSpend)" strokeWidth={2} />
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

              {/* AUDIENCE TAB */}
              {tab === "Audience" && (
                <div className="space-y-6">
                  {/* Interests */}
                  {uniqueInterests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Interests & Behaviors</h4>
                      <div className="flex flex-wrap gap-2">
                        {uniqueInterests.map((int, i) => (
                          <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium border border-primary/20">
                            {int.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Age range from targeting */}
                  {ageRange && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Target age range:</span>
                      <span className="px-3 py-1 bg-secondary rounded-xl text-xs font-medium text-foreground">{ageRange}</span>
                    </div>
                  )}

                  {/* Age breakdown */}
                  {ageData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Age Performance</h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ageData} barGap={3}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                            <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} allowDecimals={false} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar yAxisId="left" dataKey="leads" name="Leads" fill="hsl(250,90%,65%)" radius={[4,4,0,0]} />
                            <Bar yAxisId="right" dataKey="ctr" name="CTR%" fill="hsl(160,70%,45%)" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-border">
                            {["Age", "Leads", "Clicks", "CTR", "Spend"].map(h => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-4 font-medium">{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {ageData.map((row, i) => (
                              <tr key={i} className="border-b border-border/40 last:border-0">
                                <td className="py-1.5 pr-4 font-medium text-foreground">{row.age}</td>
                                <td className="py-1.5 pr-4 text-foreground">{row.leads}</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{row.clicks.toLocaleString()}</td>
                                <td className="py-1.5 pr-4 text-success">{row.ctr}%</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">${row.spend.toFixed(0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Gender breakdown */}
                  {genderData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Gender Performance</h4>
                      <div className="space-y-3">
                        {genderData.map((g, i) => {
                          const cpl = g.leads > 0 ? `$${(g.spend / g.leads).toFixed(1)}` : "—";
                          return (
                            <div key={i} className="bg-secondary rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">{g.gender}</span>
                                <span className="text-xs text-muted-foreground">{g.leads} leads · CPL {cpl} · CTR {g.ctr}%</span>
                              </div>
                              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary"
                                  style={{ width: `${genderTotal > 0 ? (g.leads / genderTotal * 100).toFixed(0) : 0}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {uniqueInterests.length === 0 && ageData.length === 0 && genderData.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground text-sm">No audience data available</div>
                  )}
                </div>
              )}

              {/* BUDGET TAB */}
              {tab === "Budget" && (
                <div className="space-y-6 max-w-lg">
                  {/* Current budget */}
                  <div className="bg-secondary rounded-2xl p-5">
                    <p className="text-xs text-muted-foreground mb-1">Current Daily Budget</p>
                    <p className="text-3xl font-display font-bold text-foreground">${currentDailyBudget.toLocaleString()}<span className="text-base font-normal text-muted-foreground">/day</span></p>
                  </div>

                  {/* Quick adjust */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Quick Adjust</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: "+20%", pct: 20, color: "text-success border-success/30 bg-success/5 hover:bg-success/10" },
                        { label: "+50%", pct: 50, color: "text-success border-success/30 bg-success/5 hover:bg-success/10" },
                        { label: "-20%", pct: -20, color: "text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10" },
                        { label: "-50%", pct: -50, color: "text-destructive border-destructive/30 bg-destructive/5 hover:bg-destructive/10" },
                      ].map(btn => (
                        <button key={btn.pct}
                          onClick={() => handleQuickBudget(btn.pct)}
                          disabled={budgetSaving}
                          className={cn("flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all", btn.color)}>
                          <span>{btn.label}</span>
                          <span className="text-xs font-normal opacity-70">
                            → ${(currentDailyBudget * (1 + btn.pct / 100)).toFixed(0)}/day
                          </span>
                        </button>
                      ))}
                    </div>
                    {budgetSuccess && (
                      <div className="flex items-center gap-2 mt-3 text-success text-xs font-medium">
                        <Check className="w-3.5 h-3.5" /> Budget updated successfully
                      </div>
                    )}
                  </div>

                  {/* Set custom budget */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Set Exact Budget</h4>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-secondary rounded-xl border border-border px-3 py-2.5">
                        <span className="text-muted-foreground text-sm">$</span>
                        <input
                          type="number"
                          value={budgetInput}
                          onChange={e => setBudgetInput(e.target.value)}
                          placeholder={currentDailyBudget.toFixed(0)}
                          className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">/day</span>
                      </div>
                      <button
                        onClick={() => applyBudget(parseFloat(budgetInput))}
                        disabled={!budgetInput || budgetSaving}
                        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                        {budgetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Schedule a budget change */}
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" /> Schedule Budget Change
                    </h4>
                    <div className="bg-secondary rounded-2xl p-4 space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Select action</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { type: "increase", value: 20, label: "+20%" },
                            { type: "increase", value: 50, label: "+50%" },
                            { type: "decrease", value: 20, label: "-20%" },
                            { type: "decrease", value: 50, label: "-50%" },
                          ].map((a, i) => (
                            <button key={i}
                              onClick={() => setScheduleAction(a)}
                              className={cn("px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                                scheduleAction?.type === a.type && scheduleAction?.value === a.value
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : a.type === "increase"
                                    ? "border-success/30 text-success hover:bg-success/5"
                                    : "border-destructive/30 text-destructive hover:bg-destructive/5"
                              )}>
                              {a.label} → ${(currentDailyBudget * (1 + (a.type === "increase" ? a.value : -a.value) / 100)).toFixed(0)}/day
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Date</p>
                          <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                            className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Time</p>
                          <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                            className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none" />
                        </div>
                      </div>

                      <button
                        onClick={saveSchedule}
                        disabled={!scheduleAction || !scheduleDate || scheduleSaving}
                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                        {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        Schedule Change
                      </button>

                      {scheduleSuccess && (
                        <div className="flex items-center gap-2 text-success text-xs font-medium">
                          <Check className="w-3.5 h-3.5" /> Scheduled action saved successfully
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}