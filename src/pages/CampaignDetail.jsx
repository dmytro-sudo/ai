import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import {
  ArrowLeft, Target, Users, Clock, Plus, Trash2, Calendar, Sparkles,
  Loader2, DollarSign, TrendingUp, MousePointerClick, BarChart3,
  Eye, ShoppingCart, Zap, Image, MessageCircle, CheckCircle2, Presentation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import PlatformBadge from "../components/PlatformBadge";
import StatusBadge from "../components/StatusBadge";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {p.name === "Spend" || p.name === "Revenue" ? `$${p.value}` : p.value}
        </p>
      ))}
    </div>
  );
};

// Synthetic daily data based on campaign totals
function buildDailyData(campaign) {
  const days = 14;
  const baseLeads = Math.round((campaign.leads || 20) / days);
  const baseSpend = Math.round((campaign.spent || 500) / days);
  return Array.from({ length: days }, (_, i) => ({
    day: moment().subtract(days - 1 - i, "days").format("MMM D"),
    leads: Math.max(0, baseLeads + Math.round((Math.random() - 0.4) * baseLeads * 1.5)),
    spend: Math.max(0, baseSpend + Math.round((Math.random() - 0.3) * baseSpend)),
    revenue: Math.max(0, Math.round((campaign.roas || 2) * baseSpend * (0.7 + Math.random() * 0.8))),
    clicks: Math.max(0, Math.round((campaign.clicks || 200) / days * (0.5 + Math.random()))),
  }));
}

const actionLabels = {
  budget_increase: "⬆️ Increase Budget",
  budget_decrease: "⬇️ Decrease Budget",
  pause: "⏸️ Pause Campaign",
  resume: "▶️ Resume Campaign",
  bid_change: "🎯 Change Bid",
  audience_update: "👥 Update Audience",
};

export default function CampaignDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get("id");
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [scheduledActions, setScheduledActions] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    action_type: "budget_increase", scheduled_date: "", scheduled_time: "09:00", value: "", reason: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);

  const load = async () => {
    if (!campaignId) return;
    const [camps, actions, crs] = await Promise.all([
      base44.entities.Campaign.filter({ id: campaignId }),
      base44.entities.ScheduledAction.filter({ campaign_id: campaignId }, "-created_date", 50),
      base44.entities.Creative.filter({ campaign_id: campaignId }, "-created_date", 20),
    ]);
    const c = camps[0];
    setCampaign(c);
    setScheduledActions(actions);
    setCreatives(crs);
    if (c) setDailyData(buildDailyData(c));
    setLoading(false);
  };

  useEffect(() => { load(); }, [campaignId]);

  const getAIInsight = async () => {
    if (!campaign) return;
    setAnalyzingAI(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert media buyer. Deeply analyze this campaign and provide comprehensive insights.

Campaign: ${campaign.name}
Platform: ${campaign.platform}
Status: ${campaign.status}
Budget: $${campaign.budget || 0} | Spent: $${campaign.spent || 0}
Impressions: ${campaign.impressions || 0} | Clicks: ${campaign.clicks || 0}
Leads: ${campaign.leads || 0} | Conversions: ${campaign.conversions || 0}
Revenue: $${campaign.revenue || 0} | CPL: $${campaign.cpl || 0} | CTR: ${campaign.ctr || 0}% | ROAS: ${campaign.roas || 0}x
Audience: ${campaign.audience || "Not specified"}

Provide a full analysis with these sections:

## 📊 Performance Score
Rate overall 1-10. Explain why.

## 🎯 Audience & Interest Analysis
Why does this audience work (or not)? What specific interests/behaviors are driving results?

## ✅ What's Working
Top 3 strengths with data-backed reasons.

## ⚠️ What Needs Fixing
Top 3 issues to address immediately.

## 👥 Recommended Interests to Test
List 8-10 specific Facebook/Google interest categories with expected impact.

## 💰 Budget Strategy
Increase, decrease, or reallocate? Exact numbers and timeline.

## 📅 7-Day Action Plan
Day-by-day specific actions to improve performance.

Be direct, specific, and use exact numbers.`,
      model: "claude_sonnet_4_6",
    });
    setAiInsight(result);
    setAnalyzingAI(false);
  };

  const scheduleAction = async () => {
    if (!scheduleForm.scheduled_date) return;
    setSubmitting(true);
    await base44.entities.ScheduledAction.create({
      ...scheduleForm,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      status: "pending",
    });
    setScheduleForm({ action_type: "budget_increase", scheduled_date: "", scheduled_time: "09:00", value: "", reason: "" });
    setShowSchedule(false);
    setSubmitting(false);
    load();
    toast.success("Action scheduled!");
  };

  const cancelAction = async (id) => {
    await base44.entities.ScheduledAction.update(id, { status: "cancelled" });
    load();
  };

  const handleGeneratePresentation = async () => {
    if (!campaign) return;
    setGeneratingPresentation(true);
    try {
      await base44.functions.invoke("generatePresentation", { campaignId: campaign.id });
      toast.success("Presentation generated and sent to your email!");
    } catch (error) {
      console.error("Presentation generation failed:", error);
      toast.error("Failed to generate presentation");
    } finally {
      setGeneratingPresentation(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!campaign) return (
    <div className="text-center py-20">
      <p className="text-foreground">Campaign not found.</p>
      <button onClick={() => navigate("/campaigns")} className="text-primary text-sm mt-2 hover:underline">← Back</button>
    </div>
  );

  const budgetUsed = campaign.budget ? Math.round((campaign.spent || 0) / campaign.budget * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate("/campaigns")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary/15 via-card to-card border border-primary/20 rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-foreground">{campaign.name}</h1>
              <PlatformBadge platform={campaign.platform} />
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.audience && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Users className="w-3.5 h-3.5" /> {campaign.audience}
              </p>
            )}
            {campaign.start_date && (
              <p className="text-xs text-muted-foreground mt-1">
                {moment(campaign.start_date).format("MMM D, YYYY")} → {campaign.end_date ? moment(campaign.end_date).format("MMM D, YYYY") : "Ongoing"}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={handleGeneratePresentation} disabled={generatingPresentation} variant="outline" size="sm" className="gap-2 rounded-xl border-border">
              {generatingPresentation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Presentation className="w-4 h-4" />
              )}
              {generatingPresentation ? "Generating..." : "Presentation"}
            </Button>
            <Button onClick={() => setShowSchedule(true)} variant="outline" size="sm" className="gap-2 rounded-xl border-border">
              <Clock className="w-4 h-4" /> Schedule
            </Button>
            <Button onClick={getAIInsight} disabled={analyzingAI} size="sm" className="gap-2 rounded-xl bg-primary hover:bg-primary/90">
              {analyzingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Analysis
            </Button>
          </div>
        </div>

        {/* Budget progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Budget Used: ${(campaign.spent || 0).toLocaleString()} / ${(campaign.budget || 0).toLocaleString()}</span>
            <span>{budgetUsed}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetUsed > 90 ? "bg-destructive" : budgetUsed > 70 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Impressions", value: (campaign.impressions || 0).toLocaleString(), icon: Eye },
          { label: "Clicks", value: (campaign.clicks || 0).toLocaleString(), icon: MousePointerClick },
          { label: "CTR", value: `${(campaign.ctr || 0).toFixed(2)}%`, icon: Target },
          { label: "Leads", value: (campaign.leads || 0).toLocaleString(), icon: Users },
          { label: "Conversions", value: (campaign.conversions || 0).toLocaleString(), icon: ShoppingCart },
          { label: "Revenue", value: `$${(campaign.revenue || 0).toLocaleString()}`, icon: DollarSign },
          { label: "Spent", value: `$${(campaign.spent || 0).toLocaleString()}`, icon: DollarSign },
          { label: "CPL", value: `$${(campaign.cpl || 0).toFixed(2)}`, icon: TrendingUp },
          { label: "ROAS", value: `${(campaign.roas || 0).toFixed(1)}x`, icon: Zap },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <kpi.icon className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            </div>
            <p className="text-lg font-display font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="performance">📈 Performance</TabsTrigger>
          <TabsTrigger value="audience">👥 Audience</TabsTrigger>
          <TabsTrigger value="creatives">🎨 Creatives ({creatives.length})</TabsTrigger>
          <TabsTrigger value="schedule">🗓 Schedule ({scheduledActions.filter(a => a.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="ai">🤖 AI Analysis</TabsTrigger>
        </TabsList>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Daily Leads (Last 14 Days)</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(250,90%,65%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(250,90%,65%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(250,90%,65%)" fill="url(#lg1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Daily Spend vs Revenue</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spend" name="Spend" fill="hsl(250,90%,65%)" radius={[3,3,0,0]} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(160,70%,45%)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Daily Clicks (Last 14 Days)</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(40,90%,60%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(40,90%,60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230,12%,14%)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220,10%,50%)", fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(40,90%,60%)" fill="url(#lg2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {/* AUDIENCE */}
        <TabsContent value="audience">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Target Audience</h3>
              <div className="space-y-3">
                {campaign.audience ? (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-sm text-foreground">{campaign.audience}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No audience specified</p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Estimated Demographics</p>
                {[
                  { label: "Age 25–34", pct: 38 },
                  { label: "Age 35–44", pct: 29 },
                  { label: "Age 18–24", pct: 18 },
                  { label: "Age 45+", pct: 15 },
                ].map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{d.label}</span><span>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Platform Targeting</h3>
              <div className="space-y-3">
                <div className="p-4 bg-secondary/30 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Platform</p>
                  <PlatformBadge platform={campaign.platform} />
                </div>
                {[
                  { label: "Device", value: "Mobile 68% · Desktop 32%" },
                  { label: "Gender", value: "All genders" },
                  { label: "Placement", value: campaign.platform === "Meta Ads" ? "Feed, Stories, Reels" : "Search, Display" },
                  { label: "Bid Strategy", value: "Lowest cost" },
                  { label: "Optimization", value: "Conversions / Leads" },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
              <h3 className="text-sm font-medium text-foreground mb-4">Interest Categories</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  "Car Enthusiasts", "Auto Detailing", "Luxury Vehicles", "Car Care",
                  "BMW Owners", "Mercedes Benz", "High Income Homeowners", "Home Improvement",
                  "Vehicle Modification", "Auto Insurance", "New Car Buyers", "Car Dealership Visitors"
                ].map((interest, i) => (
                  <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium">
                    {interest}
                  </span>
                ))}
                <button
                  onClick={getAIInsight}
                  className="px-3 py-1.5 bg-secondary text-muted-foreground border border-dashed border-border rounded-full text-xs hover:border-primary/30 hover:text-primary transition-all"
                >
                  + Get AI Recommendations
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* CREATIVES */}
        <TabsContent value="creatives">
          {creatives.length === 0 ? (
            <div className="text-center py-16 bg-card border-2 border-dashed border-border rounded-2xl">
              <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-foreground font-medium">No creatives linked</p>
              <p className="text-sm text-muted-foreground mt-1">Go to Ad Creatives to upload assets for this campaign</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatives.map((cr) => (
                <div key={cr.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all">
                  {cr.thumbnail_url ? (
                    <img src={cr.thumbnail_url} alt={cr.name} className="w-full h-36 object-cover rounded-xl mb-3" />
                  ) : (
                    <div className="w-full h-36 bg-secondary rounded-xl mb-3 flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground mb-1">{cr.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-center mt-3">
                    <div><p className="text-[10px] text-muted-foreground">CTR</p><p className="text-xs font-bold text-foreground">{(cr.ctr || 0).toFixed(1)}%</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Clicks</p><p className="text-xs font-bold text-foreground">{(cr.clicks || 0).toLocaleString()}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">Conv</p><p className="text-xs font-bold text-foreground">{cr.conversions || 0}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SCHEDULE */}
        <TabsContent value="schedule">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowSchedule(true)} size="sm" className="gap-2 rounded-xl bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Schedule Action
              </Button>
            </div>
            {scheduledActions.length === 0 ? (
              <div className="text-center py-12 bg-card border-2 border-dashed border-border rounded-2xl">
                <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No scheduled actions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledActions.map((action) => (
                  <div key={action.id} className={`p-4 rounded-xl border transition-all ${
                    action.status === "pending" ? "border-primary/20 bg-primary/5" :
                    action.status === "executed" ? "border-success/20 bg-success/5 opacity-70" :
                    "border-border bg-secondary/30 opacity-50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{actionLabels[action.action_type]?.split(" ")[0]}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{actionLabels[action.action_type]?.substring(2) || action.action_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {moment(action.scheduled_date).format("MMM D, YYYY")} at {action.scheduled_time}
                            {action.value && ` · ${action.value}`}
                          </p>
                          {action.reason && <p className="text-xs text-muted-foreground italic mt-0.5">{action.reason}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                          action.status === "pending" ? "bg-primary/10 text-primary" :
                          action.status === "executed" ? "bg-success/10 text-success" :
                          "bg-secondary text-muted-foreground"
                        }`}>{action.status}</span>
                        {action.status === "pending" && (
                          <button onClick={() => cancelAction(action.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI */}
        <TabsContent value="ai">
          <div className="bg-card border border-border rounded-2xl p-6 min-h-64">
            {analyzingAI ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Sparkles className="w-10 h-10 text-primary animate-pulse mb-3" />
                <p className="text-foreground font-medium">EI is analyzing your campaign...</p>
                <p className="text-sm text-muted-foreground mt-1">This takes 10–15 seconds</p>
              </div>
            ) : aiInsight ? (
              <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-5 [&_h2]:mb-2 [&_h2:first-child]:mt-0 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground [&_ul]:space-y-1 [&_ul]:my-2">
                {aiInsight}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <p className="text-foreground font-medium mb-1">Full AI Campaign Analysis</p>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm">Get deep insights on targeting, performance, audience fit, budget strategy and a 7-day action plan</p>
                <Button onClick={getAIInsight} className="gap-2 rounded-xl bg-primary hover:bg-primary/90">
                  <Sparkles className="w-4 h-4" /> Run Analysis
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Schedule Action</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Campaign: <span className="text-foreground">{campaign.name}</span></p>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Action Type</Label>
              <Select value={scheduleForm.action_type} onValueChange={(v) => setScheduleForm({ ...scheduleForm, action_type: v })}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget_increase">⬆️ Increase Budget</SelectItem>
                  <SelectItem value="budget_decrease">⬇️ Decrease Budget</SelectItem>
                  <SelectItem value="pause">⏸️ Pause Campaign</SelectItem>
                  <SelectItem value="resume">▶️ Resume Campaign</SelectItem>
                  <SelectItem value="bid_change">🎯 Change Bid</SelectItem>
                  <SelectItem value="audience_update">👥 Update Audience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Date *</Label>
                <Input type="date" value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })} className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Time</Label>
                <Input type="time" value={scheduleForm.scheduled_time} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_time: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            {["budget_increase", "budget_decrease", "bid_change"].includes(scheduleForm.action_type) && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Value ($  or %)</Label>
                <Input placeholder="+$500 or +20%" value={scheduleForm.value} onChange={(e) => setScheduleForm({ ...scheduleForm, value: e.target.value })} className="bg-background border-border" />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
              <Textarea placeholder="Why this action?" value={scheduleForm.reason} onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })} rows={2} className="bg-background border-border" />
            </div>
            <Button onClick={scheduleAction} disabled={submitting || !scheduleForm.scheduled_date} className="w-full rounded-xl bg-primary hover:bg-primary/90">
              {submitting ? "Scheduling..." : "Schedule Action"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}