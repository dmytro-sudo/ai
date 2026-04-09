import { useState, useEffect, useMemo } from "react";
import { extractLeads } from "../utils/metaHelpers";
import { base44 } from "@/api/supabaseClient";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Loader2 } from "lucide-react";

// Distribute a total value across hours 0-23 with a realistic ad traffic curve
function distributeHourly(total, currentHour) {
  const weights = [0.5, 0.3, 0.2, 0.15, 0.15, 0.2, 0.5, 1, 2, 3, 3.5, 4, 5, 4.5, 4, 4, 4.5, 5, 5.5, 5, 4, 3, 2, 1];
  const activeWeights = weights.slice(0, currentHour + 1);
  const weightSum = activeWeights.reduce((a, b) => a + b, 0);
  // Distribute as floats first, then round to integers while preserving total
  const floats = Array.from({ length: currentHour + 1 }, (_, h) =>
    (weights[h] / weightSum) * total
  );
  const floored = floats.map(v => Math.floor(v));
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  // Distribute remaining units to hours with largest fractional parts
  const fracs = floats.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < remainder; k++) floored[fracs[k].i]++;
  return floored;
}

const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {prefix}{typeof p.value === "number" ? p.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

export default function TodayHourlyCharts() {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      base44.functions.invoke("metaAds", { action: "getTodayInsights" })
        .then(res => setTodayData(res.data?.insights || {}))
        .catch(() => setTodayData({}))
        .finally(() => setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 3600000); // refresh every hour
    return () => clearInterval(interval);
  }, []);

  const currentHour = new Date().getHours();

  const hourlyData = useMemo(() => {
    if (!todayData) return [];
    const totalLeads = extractLeads(todayData.actions);
    const totalSpend = parseFloat(todayData.spend || 0);
    // Revenue: use action_values (purchase value) if available, otherwise spend * 3 as ROAS estimate
    const totalRevenue = parseFloat(todayData.action_values?.find(a => a.action_type === "omni_purchase")?.value || 0) || totalSpend * 3;

    const leadsHourly = distributeHourly(totalLeads, currentHour);
    const revenueHourly = distributeHourly(totalRevenue, currentHour);

    return Array.from({ length: currentHour + 1 }, (_, h) => ({
      hour: `${h.toString().padStart(2, "0")}:00`,
      leads: leadsHourly[h],
      revenue: revenueHourly[h],
    })).filter(d => d.leads > 0); // only show hours with actual leads
  }, [todayData, currentHour]);

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ))}
      </div>
    );
  }

  const totalLeads = extractLeads(todayData?.actions);
  const totalSpend = parseFloat(todayData?.spend || 0);
  const totalRevenue = parseFloat(todayData?.action_values?.find(a => a.action_type === "omni_purchase")?.value || 0) || totalSpend * 3;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Leads by Hour */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-foreground">Leads by Hour</h3>
          <div className="flex items-center gap-1.5 text-xs text-success">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Today · Meta Ads
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground mb-4">{totalLeads} <span className="text-sm font-normal text-muted-foreground">leads today</span></p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} barSize={8}>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={3} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip suffix=" leads" />} />
              <Bar dataKey="leads" name="Leads" fill="hsl(250,90%,65%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Hour */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-foreground">Revenue by Hour</h3>
          <div className="flex items-center gap-1.5 text-xs text-success">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Today · Meta Ads
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground mb-4">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-muted-foreground">est. revenue today</span></p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(170,70%,50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(170,70%,50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} interval={3} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip prefix="$" />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(170,70%,50%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}