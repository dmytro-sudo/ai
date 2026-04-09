import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import CreateWorkspaceWizardExtended from "../components/CreateWorkspaceWizardExtended";
import {
  Plus, Search, Building2, Users, ChevronRight,
  CheckCircle, XCircle, Clock, Trash2, X, Loader2,
  Key, Eye, EyeOff, Link2, Shield, LogIn, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";

const statusConfig = {
  active:    { label: "Active",    color: "bg-success/10 text-success",      icon: CheckCircle },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive", icon: XCircle },
  trial:     { label: "Trial",     color: "bg-warning/10 text-warning",       icon: Clock },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground",  icon: XCircle },
};

const integrationTypes = [
  { value: "meta_api",   label: "Meta API",   description: "Analytics, reports, ad performance from Meta Ads", fields: ["Access Token", "Ad Account ID", "Pixel ID"] },
  { value: "google_api", label: "Google API", description: "Analytics, reports, ad performance from Google Ads", fields: ["API Key", "Customer ID", "Manager Account"] },
  { value: "cloud_api",  label: "Cloud API",  description: "Customer communication, ad account management, automation", fields: ["API Key", "Account ID", "Location ID"] },
];

const planColors = {
  starter:    "bg-secondary text-muted-foreground",
  pro:        "bg-primary/10 text-primary",
  enterprise: "bg-chart-3/10 text-chart-3",
};

// ── Integration Row ──────────────────────────────────────────────────────────
function IntegrationRow({ integ, onDelete }) {
  const [visible, setVisible] = useState(false);
  const typeInfo = integrationTypes.find(t => t.value === integ.type) || { label: integ.type };
  const sc = statusConfig[integ.status] || statusConfig.trial;
  const Icon = sc.icon;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background rounded-xl border border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{integ.label}</p>
          <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {integ.api_key && (
          <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1">
            <span className="text-xs text-muted-foreground font-mono">
              {visible ? integ.api_key : "••••••••••••"}
            </span>
            <button onClick={() => setVisible(!visible)} className="text-muted-foreground hover:text-foreground">
              {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
        )}
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1", sc.color)}>
          <Icon className="w-3 h-3" /> {sc.label}
        </span>
        <button onClick={() => onDelete(integ.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Workspace Detail Panel ───────────────────────────────────────────────────
function WorkspacePanel({ workspace, onClose, onUpdate }) {
  const [integrations, setIntegrations] = useState([]);
  const [loadingInteg, setLoadingInteg] = useState(true);
  const [showAddInteg, setShowAddInteg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newInteg, setNewInteg] = useState({
    type: "meta_api", label: "", api_key: "", api_secret: "", account_id: "",
    extra_field_1: "", extra_field_2: "", status: "active", notes: ""
  });

  const loadIntegrations = () => {
    base44.entities.WorkspaceIntegration.filter({ workspace_id: workspace.id }, "-created_date", 50)
      .then(setIntegrations)
      .finally(() => setLoadingInteg(false));
  };

  useEffect(() => { loadIntegrations(); }, [workspace.id]);

  const selectedType = integrationTypes.find(t => t.value === newInteg.type) || integrationTypes[0];

  const handleAddInteg = async () => {
    if (!newInteg.label || !newInteg.api_key) return;
    setSaving(true);
    await base44.entities.WorkspaceIntegration.create({
      ...newInteg,
      workspace_id: workspace.id,
      workspace_name: workspace.name,
    });
    setNewInteg({ type: "meta_api", label: "", api_key: "", api_secret: "", account_id: "", extra_field_1: "", extra_field_2: "", status: "active", notes: "" });
    setShowAddInteg(false);
    setSaving(false);
    loadIntegrations();
  };

  const handleDeleteInteg = async (id) => {
    await base44.entities.WorkspaceIntegration.delete(id);
    loadIntegrations();
  };

  const handleDeleteWorkspace = async () => {
    if (workspace.is_protected) {
      alert("This workspace is protected and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await base44.entities.Workspace.delete(workspace.id);
    onUpdate();
    onClose();
  };

  const handleSwitchToWorkspace = () => {
    localStorage.setItem('selected-workspace-id', workspace.id);
    window.location.href = '/';
  };

  const sc = statusConfig[workspace.status] || statusConfig.trial;
  const StatusIcon = sc.icon;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-xl h-full bg-card border-l border-border flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-lg">
              {workspace.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-foreground">{workspace.name}</h2>
              <p className="text-xs text-muted-foreground">{workspace.owner_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1", sc.color)}>
              <StatusIcon className="w-3 h-3" /> {sc.label}
            </span>
            {workspace.is_protected && (
              <span className="flex items-center gap-1 text-[10px] text-warning bg-warning/10 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Protected
              </span>
            )}
            <button
              onClick={handleSwitchToWorkspace}
              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Switch to this workspace"
            >
              <LogIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteWorkspace}
              disabled={deleting || workspace.is_protected}
              className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete workspace"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Plan", value: workspace.plan || "starter", badge: planColors[workspace.plan] || planColors.starter },
              { label: "Industry", value: workspace.industry || "—" },
              { label: "Monthly Budget", value: workspace.monthly_budget ? `$${workspace.monthly_budget.toLocaleString()}` : "—" },
              { label: "Owner", value: workspace.owner_email },
            ].map((item, i) => (
              <div key={i} className="bg-background rounded-xl border border-border p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                {item.badge ? (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", item.badge)}>{item.value}</span>
                ) : (
                  <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                )}
              </div>
            ))}
          </div>

          {workspace.notes && (
            <div className="bg-background rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{workspace.notes}</p>
            </div>
          )}

          {/* Integrations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Integrations
                <span className="text-xs text-muted-foreground font-normal">({integrations.length})</span>
              </h3>
              <Button size="sm" className="h-8 gap-1.5 rounded-xl text-xs" onClick={() => setShowAddInteg(true)}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>

            {loadingInteg ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : integrations.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No integrations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {integrations.map(i => (
                  <IntegrationRow key={i.id} integ={i} onDelete={handleDeleteInteg} />
                ))}
              </div>
            )}

            {/* Add Integration Form */}
            {/* API Keys Configuration Section */}
            <div className="mt-6 bg-background border border-border rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">⚙️ Configure APIs</h3>
              <p className="text-xs text-muted-foreground mb-4">Add the three main APIs for analytics, reporting, and client management</p>
              {showAddInteg && (
                <div className="mt-4 space-y-3 p-3 bg-background border border-border rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Integration Type</Label>
                    <Select value={newInteg.type} onValueChange={v => setNewInteg({ ...newInteg, type: v })}>
                      <SelectTrigger className="h-9 bg-card border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {integrationTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedType && (
                      <p className="text-xs text-muted-foreground italic mt-1">{selectedType.description}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Label/Name</Label>
                    <Input value={newInteg.label} onChange={e => setNewInteg({ ...newInteg, label: e.target.value })} placeholder="e.g. Production Meta" className="h-9 bg-card border-border text-xs" />
                  </div>
                  {selectedType.fields[0] && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">{selectedType.fields[0]}</Label>
                      <Input placeholder="" value={newInteg.api_key} onChange={e => setNewInteg({ ...newInteg, api_key: e.target.value })} className="h-9 bg-card border-border text-xs" />
                    </div>
                  )}
                  {selectedType.fields[1] && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">{selectedType.fields[1]}</Label>
                      <Input placeholder="" value={newInteg.account_id} onChange={e => setNewInteg({ ...newInteg, account_id: e.target.value })} className="h-9 bg-card border-border text-xs" />
                    </div>
                  )}
                  {selectedType.fields[2] && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">{selectedType.fields[2]}</Label>
                      <Input placeholder="" value={newInteg.extra_field_1} onChange={e => setNewInteg({ ...newInteg, extra_field_1: e.target.value })} className="h-9 bg-card border-border text-xs" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <Button
                      onClick={handleAddInteg}
                      disabled={saving || !newInteg.api_key}
                      className="h-9 rounded-lg gap-2 text-xs"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save API
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddInteg(false)}
                      className="h-9 rounded-lg text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadWorkspaces = () => {
    base44.entities.Workspace.list("-created_date", 100)
      .then(setWorkspaces)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadWorkspaces(); }, []);

  const filtered = workspaces.filter(w => {
    const matchSearch = !search || w.name?.toLowerCase().includes(search.toLowerCase()) || w.owner_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || w.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: workspaces.length,
    active: workspaces.filter(w => w.status === "active").length,
    trial: workspaces.filter(w => w.status === "trial").length,
    suspended: workspaces.filter(w => w.status === "suspended").length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Client Workspaces" subtitle="Manage all client spaces, integrations and access">
        <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl h-9">
          <Plus className="w-4 h-4" /> New Workspace
        </Button>
      </PageHeader>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Clients", value: counts.all, color: "text-foreground" },
          { label: "Active", value: counts.active, color: "text-success" },
          { label: "Trial", value: counts.trial, color: "text-warning" },
          { label: "Suspended", value: counts.suspended, color: "text-destructive" },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={cn("text-2xl font-display font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          {["all", "active", "trial", "suspended", "cancelled"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all",
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? `All (${counts.all})` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-2xl">
          <Building2 className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-foreground font-medium">No workspaces found</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first client workspace</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(w => {
            const sc = statusConfig[w.status] || statusConfig.trial;
            const StatusIcon = sc.icon;
            return (
              <div
                key={w.id}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:shadow-lg transition-all group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-lg">
                      {w.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{w.owner_email}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 shrink-0", sc.color)}>
                    <StatusIcon className="w-3 h-3" /> {sc.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {w.plan && (
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", planColors[w.plan] || planColors.starter)}>
                        {w.plan}
                      </span>
                    )}
                    {w.industry && <span className="text-xs text-muted-foreground">{w.industry}</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {w.monthly_budget > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Budget: <span className="text-foreground font-medium">${w.monthly_budget.toLocaleString()}/mo</span></p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setSelected(w)}
                    className="flex-1 text-xs text-center py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                  >View Details</button>
                  <button
                    onClick={() => { localStorage.setItem('selected-workspace-id', w.id); window.location.href = '/'; }}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  ><LogIn className="w-3 h-3" /> Enter</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <WorkspacePanel
          workspace={selected}
          onClose={() => setSelected(null)}
          onUpdate={loadWorkspaces}
        />
      )}

      {showCreate && (
        <CreateWorkspaceWizardExtended
          onClose={() => setShowCreate(false)}
          onCreated={loadWorkspaces}
        />
      )}
    </div>
  );
}