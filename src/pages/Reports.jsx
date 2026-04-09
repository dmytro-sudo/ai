import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { useWorkspace } from "@/lib/useWorkspace";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, Calendar, CalendarDays, TrendingUp, DollarSign, Users, Sparkles, Download, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Plus, Presentation, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import ReactMarkdown from "react-markdown";
import moment from "moment";
import { cn } from "@/lib/utils";

const typeConfig = {
  daily:   { icon: Clock,        color: "from-chart-5/20 to-chart-5/5",   border: "border-chart-5/30",   badge: "bg-chart-5/10 text-chart-5",   label: "Daily" },
  weekly:  { icon: Calendar,     color: "from-chart-2/20 to-chart-2/5",   border: "border-chart-2/30",   badge: "bg-chart-2/10 text-chart-2",   label: "Weekly" },
  monthly: { icon: CalendarDays, color: "from-primary/20 to-primary/5",   border: "border-primary/30",   badge: "bg-primary/10 text-primary",   label: "Monthly" },
};

const statusConfig = {
  generated: { label: "Generated", color: "bg-primary/10 text-primary" },
  sent:      { label: "Sent",      color: "bg-success/10 text-success" },
  read:      { label: "Read",      color: "bg-secondary text-muted-foreground" },
};

function MetricPill({ label, value, positive }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 bg-card/60 rounded-xl border border-border/50">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-base font-display font-bold text-foreground">{value}</p>
      {positive !== undefined && (
        <span className={cn("text-[10px] font-medium flex items-center gap-0.5 mt-0.5", positive ? "text-success" : "text-destructive")}>
          {positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
          {positive ? "up" : "down"}
        </span>
      )}
    </div>
  );
}

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const cfg = typeConfig[report.type] || typeConfig.monthly;
  const sc = statusConfig[report.status] || statusConfig.generated;
  const TypeIcon = cfg.icon;
  const hasMetrics = report.total_spent || report.total_leads || report.total_revenue || report.roas;

  const handleGeneratePresentation = async () => {
    setGeneratingPresentation(true);
    try {
      const res = await base44.functions.invoke("generatePresentation", {
        reportTitle: report.title || "Report",
        reportSummary: report.summary,
        campaigns: [],
      });
      if (res.data?.success) {
        if (res.data.downloadUrl) {
          const a = document.createElement('a');
          a.href = res.data.downloadUrl;
          a.download = `${report.title || 'report'}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else if (res.data.gammaUrl) {
          window.open(res.data.gammaUrl, '_blank');
        }
      }
    } catch (error) {
      console.error("Presentation generation failed:", error);
      alert("Failed to generate presentation. Make sure GAMMA_API_KEY is configured.");
    } finally {
      setGeneratingPresentation(false);
    }
  };

  const handleDownload = () => {
    const text = `${report.title}\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${report.summary || ""}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("bg-gradient-to-br", cfg.color, "border rounded-2xl overflow-hidden transition-all hover:shadow-lg", cfg.border)}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center bg-card/80 border", cfg.border)}>
              <TypeIcon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full", cfg.badge)}>{cfg.label}</span>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", sc.color)}>{sc.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {report.period_start && report.period_end
                  ? `${moment(report.period_start).format("MMM D")} — ${moment(report.period_end).format("MMM D, YYYY")}`
                  : moment(report.created_date).format("MMM D, YYYY · HH:mm")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGeneratePresentation}
              disabled={generatingPresentation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
            >
              {generatingPresentation ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Presentation className="w-3.5 h-3.5" />
              )}
              {generatingPresentation ? "Generating..." : "Presentation"}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl hover:bg-card/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            {(report.summary || report.recommendations) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 rounded-xl hover:bg-card/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Metrics row */}
        {hasMetrics && (
          <div className="flex flex-wrap gap-2">
            {report.total_spent != null && <MetricPill label="Spent" value={`$${(report.total_spent || 0).toLocaleString()}`} />}
            {report.total_revenue != null && <MetricPill label="Revenue" value={`$${(report.total_revenue || 0).toLocaleString()}`} positive={true} />}
            {report.total_leads != null && <MetricPill label="Leads" value={report.total_leads} positive={true} />}
            {report.avg_cpl != null && <MetricPill label="Avg CPL" value={`$${report.avg_cpl?.toFixed(2)}`} positive={false} />}
            {report.roas != null && <MetricPill label="ROAS" value={`${report.roas?.toFixed(1)}x`} positive={report.roas >= 3} />}
          </div>
        )}
      </div>

      {/* Expanded: AI summary */}
      {expanded && (report.summary || report.recommendations) && (
        <div className="px-5 pb-5 border-t border-border/30 pt-4 space-y-4">
          {report.summary && (
            <div className="bg-card/50 rounded-xl p-4 border border-border/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground uppercase tracking-wider">AI Summary</p>
              </div>
              <ReactMarkdown className="text-sm text-muted-foreground leading-relaxed prose prose-sm prose-invert max-w-none [&_strong]:text-foreground [&_p]:my-1">
                {report.summary}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const { workspace, loading: wsLoading } = useWorkspace();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");



  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Report.filter({ workspace_id: workspace?.id }, "-created_date", 50);
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wsLoading) return;
    if (workspace?.id) {
      loadReports();
    } else {
      setLoading(false);
    }
  }, [wsLoading, workspace?.id]);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.type === filter);

  const totalLeads = reports.reduce((s, r) => s + (r.total_leads || 0), 0);
  const totalSpent = reports.reduce((s, r) => s + (r.total_spent || 0), 0);
  const totalRevenue = reports.reduce((s, r) => s + (r.total_revenue || 0), 0);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Reports" subtitle="Generated performance reports beautifully summarized">
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/report-builder')} className="gap-2 rounded-xl h-9">
            <Plus className="w-4 h-4" /> Create Report
          </Button>
          {["all", "daily", "weekly", "monthly"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                filter === f
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All (${reports.length})` : f}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Summary bar */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Leads (All Reports)", value: totalLeads.toLocaleString(), icon: Users, color: "text-primary" },
            { label: "Total Spend Tracked", value: `$${totalSpent.toLocaleString()}`, icon: DollarSign, color: "text-warning" },
            { label: "Total Revenue Tracked", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-2xl">
          <FileText className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-foreground font-medium">No reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">Use Report Builder to generate your first AI report</p>
        </div>
      ) : (
       <div className="space-y-4">
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
       </div>
      )}
    </div>
  );
}