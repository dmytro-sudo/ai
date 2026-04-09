import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { useWorkspace } from "@/lib/useWorkspace";
import { Plus, Zap, CheckCircle2, AlertCircle, Clock, X, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "../components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "meta_ads",       label: "Meta Ads",         icon: "📘", fields: ["api_key", "account_id", "extra_field_1"] },
  { value: "google_ads",     label: "Google Ads",       icon: "🎯", fields: ["api_key", "account_id"] },
  { value: "claude_ai",      label: "Claude AI",        icon: "🧠", fields: ["api_key"] },
  { value: "openai",         label: "OpenAI",           icon: "🤖", fields: ["api_key"] },
  { value: "hubspot",        label: "HubSpot",          icon: "🧡", fields: ["api_key", "account_id"] },
  { value: "ghl",            label: "GoHighLevel",      icon: "⚡", fields: ["api_key", "account_id"] },
  { value: "leadconnector",  label: "LeadConnector",    icon: "🔗", fields: ["api_key", "account_id", "extra_field_2"] },
  { value: "zapier",         label: "Zapier",           icon: "⚡", fields: ["api_key", "extra_field_2"] },
  { value: "make",           label: "Make (Integromat)","icon": "🔧", fields: ["api_key", "extra_field_2"] },
  { value: "soha",           label: "Soha",             icon: "🌐", fields: ["api_key", "account_id"] },
  { value: "mindbuddy_crm",  label: "MindBuddy CRM",    icon: "💡", fields: ["api_key", "account_id", "extra_field_2"] },
  { value: "stripe",         label: "Stripe",           icon: "💳", fields: ["api_key", "api_secret"] },
  { value: "webhook",        label: "Webhook",          icon: "🔌", fields: ["extra_field_2"] },
  { value: "other",          label: "Other",            icon: "🔧", fields: ["api_key", "api_secret", "account_id", "extra_field_1", "extra_field_2"] },
];

const FIELD_LABELS = {
  api_key:     { meta_ads: "Access Token", zapier: "Webhook Secret", webhook: "Secret Key", default: "API Key / Token" },
  api_secret:  "API Secret",
  account_id:  { meta_ads: "Ad Account ID", ghl: "Location ID", default: "Account ID" },
  extra_field_1: { meta_ads: "Pixel ID", default: "Extra Field 1" },
  extra_field_2: { zapier: "Webhook URL", make: "Webhook URL", leadconnector: "Webhook URL", webhook: "Webhook URL", default: "Extra Field 2" },
};

const getLabel = (field, type) => {
  const map = FIELD_LABELS[field];
  if (!map) return field;
  if (typeof map === "string") return map;
  return map[type] || map.default;
};

const statusConfig = {
  active:       { icon: CheckCircle2, color: "text-success",     label: "Active" },
  error:        { icon: AlertCircle,  color: "text-destructive", label: "Error" },
  pending:      { icon: Clock,        color: "text-warning",     label: "Pending" },
  disconnected: { icon: X,            color: "text-muted-foreground", label: "Disconnected" },
};

function IntegrationCard({ integ, onDelete }) {
  const [showKey, setShowKey] = useState(false);
  const pl = PLATFORMS.find(p => p.value === integ.type) || PLATFORMS[PLATFORMS.length - 1];
  const sc = statusConfig[integ.status] || statusConfig.pending;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{pl.icon}</span>
          <div>
            <p className="text-sm font-medium text-foreground">{integ.label}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{pl.label}</p>
          </div>
        </div>
        <button onClick={() => onDelete(integ.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={cn("flex items-center gap-1.5 text-xs font-medium mb-2", sc.color)}>
        <sc.icon className="w-3.5 h-3.5" />
        {sc.label}
      </div>
      {integ.api_key && (
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 mt-2">
          <span className="text-xs font-mono text-muted-foreground flex-1">{showKey ? integ.api_key : "••••••••••••"}</span>
          <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>
      )}
      {integ.account_id && <p className="text-[11px] text-muted-foreground mt-1.5">Account: {integ.account_id}</p>}
    </div>
  );
}

export default function Integrations() {
  const { workspace, loading: wsLoading } = useWorkspace();
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "meta_ads", label: "", api_key: "", api_secret: "", account_id: "", extra_field_1: "", extra_field_2: "", status: "active", notes: "" });

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const load = () => {
    if (!workspace?.id) return;
    setLoading(true);
    base44.entities.WorkspaceIntegration.filter({ workspace_id: workspace.id }, "-created_date", 100)
      .then(setIntegrations)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (workspace?.id) load(); else if (!wsLoading) setLoading(false); }, [workspace?.id, wsLoading]);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "internal_admin";

  if (!wsLoading && !loading && !isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="font-medium text-foreground">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">Integrations are only visible to administrators.</p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!form.label) return;
    setSaving(true);
    const pl = PLATFORMS.find(p => p.value === form.type);
    await base44.entities.WorkspaceIntegration.create({
      ...form,
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      label: form.label || pl?.label || form.type,
    });
    setForm({ type: "meta_ads", label: "", api_key: "", api_secret: "", account_id: "", extra_field_1: "", extra_field_2: "", status: "active", notes: "" });
    setShowAdd(false);
    setSaving(false);
    load();
    toast.success("Integration saved!");
  };

  const handleDelete = async (id) => {
    await base44.entities.WorkspaceIntegration.delete(id);
    load();
    toast.success("Integration removed");
  };

  const selectedPlatform = PLATFORMS.find(p => p.value === form.type) || PLATFORMS[0];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Integrations" subtitle={`Connected platforms for ${workspace?.name || "this workspace"}`}>
        <Button onClick={() => setShowAdd(true)} className="gap-2 rounded-xl h-9">
          <Plus className="w-4 h-4" /> Add Integration
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {integrations.length === 0 && !showAdd ? (
            <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-2xl">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-foreground font-medium">No integrations yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Connect your first platform</p>
              <Button onClick={() => setShowAdd(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add Integration
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map(i => (
                <IntegrationCard key={i.id} integ={i} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Add Form */}
          {showAdd && (
            <div className="mt-6 bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-foreground">New Integration</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Platform</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, label: PLATFORMS.find(p => p.value === v)?.label || "" }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Label</Label>
                  <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder={selectedPlatform.label} className="bg-background border-border" />
                </div>
                {selectedPlatform.fields.includes("api_key") && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{getLabel("api_key", form.type)}</Label>
                    <Input type="password" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} className="bg-background border-border font-mono text-xs" />
                  </div>
                )}
                {selectedPlatform.fields.includes("api_secret") && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{getLabel("api_secret", form.type)}</Label>
                    <Input type="password" value={form.api_secret} onChange={e => setForm(f => ({ ...f, api_secret: e.target.value }))} className="bg-background border-border font-mono text-xs" />
                  </div>
                )}
                {selectedPlatform.fields.includes("account_id") && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{getLabel("account_id", form.type)}</Label>
                    <Input value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} className="bg-background border-border" />
                  </div>
                )}
                {selectedPlatform.fields.includes("extra_field_1") && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{getLabel("extra_field_1", form.type)}</Label>
                    <Input value={form.extra_field_1} onChange={e => setForm(f => ({ ...f, extra_field_1: e.target.value }))} className="bg-background border-border" />
                  </div>
                )}
                {selectedPlatform.fields.includes("extra_field_2") && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">{getLabel("extra_field_2", form.type)}</Label>
                    <Input value={form.extra_field_2} onChange={e => setForm(f => ({ ...f, extra_field_2: e.target.value }))} className="bg-background border-border" />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="disconnected">Disconnected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={saving || !form.label} className="mt-5 rounded-xl gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Integration
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}