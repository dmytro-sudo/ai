import { useState, useEffect } from "react";
import { getStore, setStore, subscribeStore } from "../lib/backgroundStore";
import { base44 } from "@/api/supabaseClient";
import { useWorkspace } from "@/lib/useWorkspace";
import { FileText, Download, Plus, Sparkles, Loader2, Calendar, TrendingUp, Users, DollarSign, MousePointer, Globe, BarChart3, Presentation } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import PageHeader from "../components/PageHeader";
import { cn } from "@/lib/utils";

const metrics = [
  { id: "spend", label: "Total Spend", icon: DollarSign },
  { id: "revenue", label: "Revenue", icon: TrendingUp },
  { id: "leads", label: "Leads", icon: Users },
  { id: "clicks", label: "Clicks", icon: MousePointer },
  { id: "impressions", label: "Impressions", icon: BarChart3 },
  { id: "cpl", label: "Cost Per Lead", icon: DollarSign },
  { id: "ctr", label: "CTR", icon: MousePointer },
  { id: "roas", label: "ROAS", icon: TrendingUp },
  { id: "conversions", label: "Conversions", icon: TrendingUp },
];

const dimensions = [
  { id: "platform", label: "Platform" },
  { id: "campaign", label: "Campaign" },
  { id: "audience", label: "Audience" },
  { id: "location", label: "Location" },
  { id: "age_group", label: "Age Group" },
  { id: "device", label: "Device" },
  { id: "creative", label: "Creative" },
  { id: "placement", label: "Placement" },
];

function downloadCSV(report, campaigns) {
  const rows = [["Metric", "Value"]];
  if (report.selectedMetrics.includes("spend")) rows.push(["Total Spend", `$${campaigns.reduce((s, c) => s + (c.spent || 0), 0).toLocaleString()}`]);
  if (report.selectedMetrics.includes("revenue")) rows.push(["Revenue", `$${campaigns.reduce((s, c) => s + (c.revenue || 0), 0).toLocaleString()}`]);
  if (report.selectedMetrics.includes("leads")) rows.push(["Leads", campaigns.reduce((s, c) => s + (c.leads || 0), 0)]);
  if (report.selectedMetrics.includes("clicks")) rows.push(["Clicks", campaigns.reduce((s, c) => s + (c.clicks || 0), 0)]);
  if (report.selectedMetrics.includes("roas")) {
    const spent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
    const rev = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    rows.push(["ROAS", spent > 0 ? (rev / spent).toFixed(2) + "x" : "N/A"]);
  }

  rows.push([], ["Campaign", "Platform", "Status", "Spent", "Leads", "Revenue", "ROAS"]);
  campaigns.forEach((c) => {
    rows.push([c.name, c.platform, c.status, `$${c.spent || 0}`, c.leads || 0, `$${c.revenue || 0}`, c.roas ? c.roas.toFixed(1) + "x" : "N/A"]);
  });

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.name || "report"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateAISummary(campaigns, selectedMetrics, selectedDimensions) {
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const roas = totalSpent > 0 ? (totalRevenue / totalSpent).toFixed(2) : 0;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert marketing analyst for EI Agency. Generate a professional report summary.

Campaign data:
${campaigns.map((c) => `${c.name} (${c.platform}): spent=$${c.spent || 0}, leads=${c.leads || 0}, revenue=$${c.revenue || 0}, cpl=$${c.cpl || 0}, roas=${c.roas || 0}`).join("\n")}

Totals: Spent=$${totalSpent}, Revenue=$${totalRevenue}, Leads=${totalLeads}, ROAS=${roas}x

Metrics selected: ${selectedMetrics.join(", ")}
Dimensions analyzed: ${selectedDimensions.join(", ")}

Write a 3-4 paragraph executive report with: key performance highlights, what's working, what needs attention, and 3 specific AI recommendations. Be data-driven and professional.`,
    model: "claude_sonnet_4_6",
  });
  return result;
}

export default function ReportBuilder() {
  const { workspace } = useWorkspace();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(() => getStore('report_generating') || false);
  const [generatedReport, setGeneratedReportState] = useState(() => getStore('report_generated') || null);
  const setGeneratedReport = (v) => { setGeneratedReportState(v); setStore('report_generated', v); };
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState({
    name: "",
    type: "custom",
    dateRange: "last_30",
    dateFrom: "",
    dateTo: "",
    platform: "all",
    selectedMetrics: ["spend", "revenue", "leads", "roas"],
    selectedDimensions: ["platform", "campaign"],
  });
  const [exportingPresentation, setExportingPresentation] = useState(false);

  useEffect(() => {
    if (!workspace?.id) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    base44.entities.Campaign.filter({ workspace_id: workspace.id }, "-created_date", 100)
      .then(setCampaigns)
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const toggleMetric = (id) => {
    setReport((r) => ({
      ...r,
      selectedMetrics: r.selectedMetrics.includes(id) ? r.selectedMetrics.filter((m) => m !== id) : [...r.selectedMetrics, id],
    }));
  };

  const toggleDimension = (id) => {
    setReport((r) => ({
      ...r,
      selectedDimensions: r.selectedDimensions.includes(id) ? r.selectedDimensions.filter((d) => d !== id) : [...r.selectedDimensions, id],
    }));
  };

  const filteredCampaigns = report.platform === "all" ? campaigns : campaigns.filter((c) => c.platform === report.platform);

  useEffect(() => {
    const unsub = subscribeStore('report_generated', (v) => setGeneratedReportState(v));
    const unsubG = subscribeStore('report_generating', setGenerating);
    return () => { unsub(); unsubG(); };
  }, []);

  const generateReport = async () => {
    setStore('report_generating', true);
    setGenerating(true);
    const summary = await generateAISummary(filteredCampaigns, report.selectedMetrics, report.selectedDimensions);
    setGeneratedReport({ ...report, summary, campaigns: filteredCampaigns });
    setStore('report_generating', false);
    setGenerating(false);
    // Save to Reports
    if (workspace?.id) {
      await base44.entities.Report.create({
        workspace_id: workspace.id,
        title: report.name || `Custom Report — ${new Date().toLocaleDateString()}`,
        type: report.type === "custom" ? "monthly" : report.type,
        summary,
        total_spent: filteredCampaigns.reduce((s, c) => s + (c.spent || 0), 0),
        total_revenue: filteredCampaigns.reduce((s, c) => s + (c.revenue || 0), 0),
        total_leads: filteredCampaigns.reduce((s, c) => s + (c.leads || 0), 0),
        roas: filteredCampaigns.reduce((s, c) => s + (c.revenue || 0), 0) / Math.max(filteredCampaigns.reduce((s, c) => s + (c.spent || 0), 0), 1),
        status: "generated",
      });
    }
  };

  const handleDownload = () => {
    if (!generatedReport) return;
    downloadCSV(generatedReport, generatedReport.campaigns);
  };

  const handleExportPresentation = async () => {
    if (!generatedReport) return;
    setExportingPresentation(true);
    try {
      const res = await base44.functions.invoke("generatePresentation", {
        reportTitle: generatedReport.name || "Custom Report",
        reportSummary: generatedReport.summary,
        campaigns: generatedReport.campaigns,
      });

      if (res.data?.success) {
        if (res.data.downloadUrl) {
          // Gamma API returned download URL — download PDF
          const a = document.createElement('a');
          a.href = res.data.downloadUrl;
          a.download = `${generatedReport.name || 'report'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (res.data.gammaUrl) {
          // Open Gamma presentation
          window.open(res.data.gammaUrl, '_blank');
        }
      }
    } catch (error) {
      console.error("Error exporting presentation:", error);
      alert("Failed to generate presentation. Make sure GAMMA_API_KEY is configured.");
    } finally {
      setExportingPresentation(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Report Builder" subtitle="Build and export custom performance reports with AI analysis">
        {generatedReport && (
         <div className="flex gap-2">
           <Button onClick={handleExportPresentation} disabled={exportingPresentation} variant="outline" className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10">
             {exportingPresentation ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Presentation className="w-4 h-4" /> Export Presentation</>}
           </Button>
            <Button onClick={handleDownload} variant="outline" className="gap-2 rounded-xl border-border text-foreground hover:bg-secondary">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          {/* Basic settings */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Report Settings</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Report Name</Label>
                <Input placeholder="Q1 Performance Report" value={report.name} onChange={(e) => setReport({ ...report, name: e.target.value })} className="bg-background border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Date Range</Label>
                <Select value={report.dateRange} onValueChange={(v) => setReport({ ...report, dateRange: v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7">Last 7 days</SelectItem>
                    <SelectItem value="last_30">Last 30 days</SelectItem>
                    <SelectItem value="last_90">Last 90 days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="between">Custom Range...</SelectItem>
                  </SelectContent>
                </Select>
                {report.dateRange === "between" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">From</Label>
                      <Input type="date" value={report.dateFrom} onChange={(e) => setReport({ ...report, dateFrom: e.target.value })} className="bg-background border-border text-xs" />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">To</Label>
                      <Input type="date" value={report.dateTo} onChange={(e) => setReport({ ...report, dateTo: e.target.value })} className="bg-background border-border text-xs" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Platform</Label>
                <Select value={report.platform} onValueChange={(v) => setReport({ ...report, platform: v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Metrics</h3>
            <div className="space-y-2.5">
              {metrics.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Checkbox
                    id={m.id}
                    checked={report.selectedMetrics.includes(m.id)}
                    onCheckedChange={() => toggleMetric(m.id)}
                    className="border-border"
                  />
                  <Label htmlFor={m.id} className="text-sm text-foreground cursor-pointer flex items-center gap-2">
                    <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {m.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Breakdown By</h3>
            <div className="space-y-2.5">
              {dimensions.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`dim_${d.id}`}
                    checked={report.selectedDimensions.includes(d.id)}
                    onCheckedChange={() => toggleDimension(d.id)}
                    className="border-border"
                  />
                  <Label htmlFor={`dim_${d.id}`} className="text-sm text-foreground cursor-pointer">
                    {d.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={generateReport} disabled={generating || loading} className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 h-12">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate AI Report</>}
          </Button>
        </div>

        {/* Report preview */}
        <div className="lg:col-span-2">
          {!generatedReport ? (
            <div className="bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-foreground font-medium">Configure your report</p>
                <p className="text-sm text-muted-foreground mt-1">Select metrics and dimensions, then click Generate</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-border rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">{generatedReport.name || "Custom Report"}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5" /> AI Generated
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Spent", value: `$${filteredCampaigns.reduce((s, c) => s + (c.spent || 0), 0).toLocaleString()}`, show: report.selectedMetrics.includes("spend") },
                  { label: "Total Revenue", value: `$${filteredCampaigns.reduce((s, c) => s + (c.revenue || 0), 0).toLocaleString()}`, show: report.selectedMetrics.includes("revenue") },
                  { label: "Total Leads", value: filteredCampaigns.reduce((s, c) => s + (c.leads || 0), 0).toLocaleString(), show: report.selectedMetrics.includes("leads") },
                  { label: "Avg ROAS", value: `${(filteredCampaigns.reduce((s, c) => s + (c.revenue || 0), 0) / Math.max(filteredCampaigns.reduce((s, c) => s + (c.spent || 0), 0), 1)).toFixed(1)}x`, show: report.selectedMetrics.includes("roas") },
                ].filter((k) => k.show).map((k, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{k.label}</p>
                    <p className="text-xl font-display font-bold text-foreground">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Campaign breakdown */}
              {report.selectedDimensions.includes("campaign") && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-medium text-foreground mb-4">Campaign Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">Campaign</th>
                          <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">Platform</th>
                          {report.selectedMetrics.includes("spend") && <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">Spent</th>}
                          {report.selectedMetrics.includes("leads") && <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">Leads</th>}
                          {report.selectedMetrics.includes("cpl") && <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">CPL</th>}
                          {report.selectedMetrics.includes("roas") && <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-3 font-medium">ROAS</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCampaigns.map((c) => (
                          <tr key={c.id} className="border-b border-border/50 last:border-0">
                            <td className="py-3 text-foreground font-medium">{c.name}</td>
                            <td className="py-3 text-muted-foreground">{c.platform}</td>
                            {report.selectedMetrics.includes("spend") && <td className="py-3 text-right text-foreground">${(c.spent || 0).toLocaleString()}</td>}
                            {report.selectedMetrics.includes("leads") && <td className="py-3 text-right text-foreground">{c.leads || 0}</td>}
                            {report.selectedMetrics.includes("cpl") && <td className="py-3 text-right text-foreground">${(c.cpl || 0).toFixed(2)}</td>}
                            {report.selectedMetrics.includes("roas") && <td className="py-3 text-right text-foreground">{(c.roas || 0).toFixed(1)}x</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Summary */}
              <div className="bg-card border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">AI Executive Summary</h3>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0">
                  <ReactMarkdown>{generatedReport.summary}</ReactMarkdown>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleExportPresentation}
                  disabled={exportingPresentation}
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 h-12"
                >
                  {exportingPresentation ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Presentation className="w-4 h-4" /> Export Presentation</>
                  )}
                </Button>
                <Button onClick={handleDownload} className="flex-1 gap-2 rounded-xl bg-primary hover:bg-primary/90 h-12">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}