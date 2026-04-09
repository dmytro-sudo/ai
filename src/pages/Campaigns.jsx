import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { useWorkspace } from "@/lib/useWorkspace";
import { Megaphone, Search, Plus, X, ChevronRight, Loader2, Edit2, Check, BarChart2 } from "lucide-react";
import CampaignDetailModal from "../components/CampaignDetailModal";
import DateRangePicker from "../components/DateRangePicker";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import PlatformBadge from "../components/PlatformBadge";
import StatusBadge from "../components/StatusBadge";
import { cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { key: "platform", label: "Platform", question: "Which advertising platform?", type: "select", options: ["Meta Ads", "Google Ads"] },
  { key: "objective", label: "Objective", question: "What is the campaign objective?", type: "select", options: ["Lead Generation", "Brand Awareness", "Traffic", "Conversions", "Sales", "App Installs"] },
  { key: "budget", label: "Budget", question: "Set your campaign budget", type: "budget" },
  { key: "audience", label: "Audience", question: "Who is your target audience?", type: "text", placeholder: "e.g. Car owners aged 25-44 in Miami interested in luxury vehicles" },
  { key: "age_range", label: "Age Range", question: "What is the target age range?", type: "select", options: ["18-24", "25-34", "35-44", "45-54", "55-64", "18-44", "25-54", "All ages"] },
  { key: "offer", label: "Offer / CTA", question: "What is the main offer or call-to-action?", type: "text", placeholder: "e.g. Free PPF consultation, Book now, Get a quote" },
];

function CreateCampaignModal({ onClose, onCreated, workspaceId }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ platform: "", objective: "", budget: "", total_budget: "", start_date: "", end_date: "", audience: "", age_range: "", offer: "", name: "" });
  const [saving, setSaving] = useState(false);

  const current = WIZARD_STEPS[step];
  const isLast = step === WIZARD_STEPS.length - 1;
  const value = form[current.key];

  const canNext = current.type === "budget" ? (form.budget && form.budget !== "") : (value && value.trim() !== "");

  const handleNext = async () => {
    if (isLast) {
      if (!workspaceId) {
        alert('Workspace not loaded. Please refresh and try again.');
        return;
      }
      setSaving(true);
      const name = `${form.platform} — ${form.objective} (${form.age_range})`;
      await base44.entities.Campaign.create({
        workspace_id: workspaceId,
        name,
        platform: form.platform,
        status: "draft",
        audience: form.audience,
        budget: parseFloat(form.budget) || 0,
        spent: 0,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      });
      setSaving(false);
      onCreated();
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-base font-display font-bold text-foreground">New Campaign</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of {WIZARD_STEPS.length}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-5 pt-4">
          {WIZARD_STEPS.map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-border")} />
          ))}
        </div>

        {/* Step content */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider text-[10px] font-semibold">{current.label}</p>
            <p className="text-base font-medium text-foreground mb-4">{current.question}</p>

            {current.type === "budget" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Daily Budget ($) *</label>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={e => setForm({ ...form, budget: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Total Campaign Budget ($) — optional</label>
                  <input
                    type="number"
                    value={form.total_budget}
                    onChange={e => setForm({ ...form, total_budget: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} min={form.start_date || undefined} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                </div>
              </div>
            ) : current.type === "select" ? (
              <div className="grid gap-2">
                {current.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setForm({ ...form, [current.key]: opt })}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                      form[current.key] === opt
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-foreground hover:border-primary/20 hover:bg-secondary/30"
                    )}
                  >
                    {opt}
                    {form[current.key] === opt && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={form[current.key]}
                onChange={e => setForm({ ...form, [current.key]: e.target.value })}
                placeholder={current.placeholder}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            )}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-xl h-11">Back</Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canNext || saving}
              className="flex-1 rounded-xl h-11 gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : isLast ? <><Check className="w-4 h-4" /> Create Campaign</> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetEditor({ campaign, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(campaign.budget || 0));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.entities.Campaign.update(campaign.id, { budget: parseFloat(value) || 0 });
    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group"
      >
        ${(campaign.budget || 0).toLocaleString()}/day
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-sm">$</span>
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-20 h-7 px-2 rounded-lg border border-primary bg-background text-sm text-foreground focus:outline-none"
        autoFocus
        onKeyDown={e => e.key === "Enter" && save()}
      />
      <button onClick={save} disabled={saving} className="p-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-secondary"><X className="w-3 h-3 text-muted-foreground" /></button>
    </div>
  );
}

export default function Campaigns() {
  const { workspace } = useWorkspace();
  const [campaigns, setCampaigns] = useState([]);
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [metaInsights, setMetaInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [dateParams, setDateParams] = useState({ datePreset: "last_30d" });

  const load = () => {
    if (!workspace?.id) return;
    base44.entities.Campaign.filter({ workspace_id: workspace.id }, "-created_date", 50)
      .then(setCampaigns)
      .finally(() => setLoading(false));
  };

  const loadMeta = () => {
    if (!workspace?.id) return;
    const p = dateParams.since
      ? { since: dateParams.since, until: dateParams.until }
      : { datePreset: dateParams.datePreset };
    setMetaLoading(true);
    Promise.all([
      base44.functions.invoke("metaAds", { action: "getCampaigns", workspace_id: workspace.id }).catch(() => ({ data: {} })),
      base44.functions.invoke("metaAds", { action: "getInsights", workspace_id: workspace.id, ...p }).catch(() => ({ data: {} })),
    ]).then(([camRes, insRes]) => {
      setMetaCampaigns(camRes.data?.campaigns || []);
      setMetaInsights(insRes.data?.insights || []);
    }).finally(() => setMetaLoading(false));
  };

  useEffect(() => {
    if (!workspace?.id) return;
    setLoading(true);
    load();
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    loadMeta();
  }, [dateParams, workspace?.id]);

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = filterPlatform === "all" || c.platform === filterPlatform;
    const matchStatus = filterStatus === "all" || (c.status || "").toLowerCase() === filterStatus;
    return matchSearch && matchPlatform && matchStatus;
  });

  const filteredMeta = metaCampaigns
    .filter((mc) => {
      const matchSearch = !search || mc.name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || (mc.status || "").toLowerCase() === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const aActive = (a.status || "").toLowerCase() === "active" ? 0 : 1;
      const bActive = (b.status || "").toLowerCase() === "active" ? 0 : 1;
      return aActive - bActive;
    });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Campaigns" subtitle="All your AI-managed advertising campaigns">
        <DateRangePicker onChange={setDateParams} />
        <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl h-9">
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "Meta Ads", "Google Ads"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={cn("px-4 py-2 rounded-xl text-xs font-medium transition-all", filterPlatform === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}
            >
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "active", "paused"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn("px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all", filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
      </div>

      {metaLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeta.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-xs text-success mb-1">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Live from Meta Ads API
              </div>
              {filteredMeta.map((mc) => {
                const ins = metaInsights.find(i => i.campaign_id === mc.id) || {};
                const leads = ins.actions?.find(a => a.action_type === "onsite_conversion.lead")?.value || 0;
                const spent = parseFloat(ins.spend || 0);
                const cpl = leads > 0 ? (spent / leads).toFixed(2) : "—";
                const status = mc.status?.toLowerCase() === "active" ? "active" : mc.status?.toLowerCase() === "paused" ? "paused" : "draft";
                return (
                  <div key={mc.id} className="bg-card border border-primary/20 rounded-2xl p-5 hover:border-primary/40 transition-all cursor-pointer" onClick={() => setSelectedCampaign(mc)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-medium text-foreground">{mc.name}</h3>
                          <PlatformBadge platform="Meta Ads" />
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">Daily Budget: ${mc.daily_budget ? (mc.daily_budget / 100).toLocaleString() : "—"}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Spent</p><p className="text-sm font-semibold text-foreground">${spent.toLocaleString(undefined,{maximumFractionDigits:0})}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Clicks</p><p className="text-sm font-semibold text-foreground">{parseInt(ins.clicks||0).toLocaleString()}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Leads</p><p className="text-sm font-semibold text-foreground">{parseInt(leads).toLocaleString()}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">CPL</p><p className="text-sm font-semibold text-foreground">{cpl !== "—" ? `$${cpl}` : "—"}</p></div>
                      </div>
                      <BarChart2 className="w-4 h-4 text-muted-foreground hidden md:block flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-foreground font-medium">No campaigns found</p>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal onClose={() => setShowCreate(false)} onCreated={load} workspaceId={workspace?.id} />
      )}
      {selectedCampaign && (
        <CampaignDetailModal campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
      )}
    </div>
  );
}