import { useState, useEffect } from "react";
import { extractLeads } from "../utils/metaHelpers";
import { base44 } from "@/api/supabaseClient";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Users, MousePointerClick, Eye, DollarSign, Target, Loader2, WifiOff } from "lucide-react";
import { useWorkspace } from "@/lib/useWorkspace";
import DateRangePicker from "../components/DateRangePicker";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(250,90%,65%)", "hsl(160,70%,45%)", "hsl(40,90%,60%)", "hsl(330,80%,60%)", "hsl(200,80%,55%)"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

function KpiCard({ label, value, sub, icon: Icon, trend }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {trend !== undefined && (
          <span className={cn("text-xs font-medium flex items-center gap-0.5", trend >= 0 ? "text-success" : "text-destructive")}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xl font-display font-bold text-foreground">{value ?? "—"}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function LoadingGrid({ count = 6 }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-5 h-28 animate-pulse" />
      ))}
    </div>
  );
}

export default function Analytics() {
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [dateParams, setDateParams] = useState({ datePreset: "last_30d" });
  const [kpis, setKpis] = useState(null);
  const [ageData, setAgeData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [placementData, setPlacementData] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    if (!workspace?.id) return;
    setLoading(true);
    const p = dateParams.since
      ? { since: dateParams.since, until: dateParams.until }
      : { datePreset: dateParams.datePreset };
    Promise.all([
      base44.functions.invoke("metaAds", { action: "getAccountInsights", workspace_id: workspace.id, ...p }),
      base44.functions.invoke("metaAds", { action: "getAgeBreakdown", workspace_id: workspace.id, ...p }),
      base44.functions.invoke("metaAds", { action: "getGenderBreakdown", workspace_id: workspace.id, ...p }),
      base44.functions.invoke("metaAds", { action: "getPlacementBreakdown", workspace_id: workspace.id, ...p }),
      base44.functions.invoke("metaAds", { action: "getDailyInsights", workspace_id: workspace.id, ...p }),
    ]).then(([kpiRes, ageRes, genderRes, placRes, dailyRes]) => {
      const kpi = kpiRes.data?.insights;
      setKpis(kpi || null);

      const ages = (ageRes.data?.insights || []).map(d => ({
      age: d.age,
      impressions: parseInt(d.impressions || 0),
      clicks: parseInt(d.clicks || 0),
      leads: extractLeads(d.actions),
        ctr: parseFloat(d.ctr || 0).toFixed(2),
        cpc: parseFloat(d.cpc || 0).toFixed(2),
        cpm: (parseFloat(d.spend || 0) / Math.max(parseInt(d.impressions || 1), 1) * 1000).toFixed(1),
      }));
      setAgeData(ages);

      const genders = (genderRes.data?.insights || []).map(d => {
      const leads = extractLeads(d.actions);
        const spend = parseFloat(d.spend || 0);
        return {
          gender: d.gender === "male" ? "Male" : d.gender === "female" ? "Female" : "Unknown",
          leads,
          spend,
          cpl: leads > 0 ? (spend / leads).toFixed(1) : "—",
          ctr: parseFloat(d.ctr || 0).toFixed(2),
        };
      });
      setGenderData(genders);

      const placements = (placRes.data?.insights || []).map(d => ({
      placement: d.publisher_platform,
      impressions: parseInt(d.impressions || 0),
      clicks: parseInt(d.clicks || 0),
      leads: extractLeads(d.actions),
        ctr: parseFloat(d.ctr || 0).toFixed(2),
        cpc: parseFloat(d.cpc || 0).toFixed(2),
      }));
      setPlacementData(placements);

      const daily = (dailyRes.data?.insights || []).map(d => {
        const leads = extractLeads(d.actions);
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
          leads,
        };
      });
      setDailyData(daily);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [dateParams, workspace?.id]);

  const totalLeads = kpis ? extractLeads(kpis.actions) : null;
  const spend = kpis ? parseFloat(kpis.spend || 0) : null;

  const kpiCards = kpis ? [
    { label: "Spend", value: `$${spend.toLocaleString(undefined, {maximumFractionDigits: 0})}`, icon: DollarSign },
    { label: "Leads", value: totalLeads?.toLocaleString(), icon: Users },
    { label: "CPL", value: totalLeads > 0 ? `$${(spend / totalLeads).toFixed(1)}` : "—", icon: DollarSign },
    { label: "Clicks", value: parseInt(kpis.clicks || 0).toLocaleString(), icon: MousePointerClick },
    { label: "CPC", value: `$${parseFloat(kpis.cpc || 0).toFixed(2)}`, icon: DollarSign },
    { label: "CTR", value: `${parseFloat(kpis.ctr || 0).toFixed(2)}%`, icon: Target },
    { label: "Frequency", value: parseFloat(kpis.frequency || 0).toFixed(2), icon: TrendingUp },
  ] : [];

  const genderTotalLeads = genderData.reduce((s, g) => s + g.leads, 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time Meta Ads analytics — audience, placements, trends</p>
        </div>
        <DateRangePicker onChange={setDateParams} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !kpis ? (
        <div className="text-center py-24 text-muted-foreground text-sm">
          No data from Meta Ads API. Check your credentials in Integrations.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Live badge */}
          <div className="flex items-center gap-2 text-xs text-success">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live data from Meta Ads API
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {kpiCards.map((k, i) => <KpiCard key={i} {...k} />)}
          </div>

          {/* Daily Spend + Leads Chart */}
          {dailyData.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Daily Spend</h3>
                <p className="text-xs text-muted-foreground mb-4">Ad spend over time</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(250,90%,65%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(250,90%,65%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={Math.floor(dailyData.length / 6)} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="spend" name="Spend $" stroke="hsl(250,90%,65%)" fill="url(#spendGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Daily Leads</h3>
                <p className="text-xs text-muted-foreground mb-4">Lead volume over time</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={Math.floor(dailyData.length / 6)} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="leads" name="Leads" fill="hsl(160,70%,45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Age + Gender */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Age */}
            {ageData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-1">Age Group Performance</h3>
                <p className="text-xs text-muted-foreground mb-4">Leads & CTR by age bracket</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                      <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar yAxisId="left" dataKey="leads" name="Leads" fill="hsl(250,90%,65%)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="ctr" name="CTR%" fill="hsl(160,70%,45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      {["Age", "Leads", "CTR", "CPC", "CPM"].map(h => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {ageData.map((row, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3 font-medium text-foreground">{row.age}</td>
                          <td className="py-1.5 pr-3 text-foreground">{row.leads}</td>
                          <td className="py-1.5 pr-3 text-success">{row.ctr}%</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">${row.cpc}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">${row.cpm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Gender */}
            {genderData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-medium text-foreground mb-4">Gender Breakdown</h3>
                <div className="space-y-4">
                  {genderData.map((g, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground font-medium">{g.gender}</span>
                        <span className="text-muted-foreground">{g.leads} leads · CPL ${g.cpl} · CTR {g.ctr}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${genderTotalLeads > 0 ? (g.leads / genderTotalLeads * 100).toFixed(0) : 0}%`, background: COLORS[i] }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gender spend table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      {["Gender", "Leads", "Spend", "CPL", "CTR"].map(h => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {genderData.map((g, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3 font-medium text-foreground">{g.gender}</td>
                          <td className="py-1.5 pr-3 text-foreground">{g.leads}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">${g.spend.toFixed(0)}</td>
                          <td className="py-1.5 pr-3 text-success">${g.cpl}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{g.ctr}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Placements */}
          {placementData.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Placement Performance</h3>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={placementData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} />
                      <YAxis type="category" dataKey="placement" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} width={90} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="leads" name="Leads" fill="hsl(250,90%,65%)" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto self-center">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      {["Placement", "Leads", "Clicks", "CTR", "CPC"].map(h => <th key={h} className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {placementData.map((row, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="py-1.5 pr-3 font-medium text-foreground capitalize">{row.placement}</td>
                          <td className="py-1.5 pr-3 text-foreground">{row.leads}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{row.clicks.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 text-success">{row.ctr}%</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">${row.cpc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}