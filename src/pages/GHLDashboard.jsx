import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/supabaseClient";
import { Users, DollarSign, TrendingUp, Target, Search, Phone, Mail, Tag, RefreshCw, Clock, CheckCircle2, XCircle, Circle, AlertCircle, Loader2, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "../components/PageHeader";
import { cn } from "@/lib/utils";
import moment from "moment";

const statusConfig = {
  open:     { label: "Open",     color: "text-primary",     bg: "bg-primary/10",     icon: Circle },
  won:      { label: "Won",      color: "text-success",     bg: "bg-success/10",     icon: CheckCircle2 },
  lost:     { label: "Lost",     color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
  abandoned:{ label: "Abandoned",color: "text-warning",     bg: "bg-warning/10",     icon: AlertCircle },
};

function StatCard({ label, value, icon: Icon, color = "text-primary", sub }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ContactRow({ contact }) {
  const name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "No Name";
  const tags = contact.tags || [];
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 hover:bg-secondary/20 px-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {contact.email && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
            {contact.phone && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {tags.slice(0, 2).map((t, i) => (
          <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />{t}
          </span>
        ))}
        {contact.dateAdded && (
          <span className="text-[11px] text-muted-foreground">{moment(contact.dateAdded).fromNow()}</span>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({ opp }) {
  const sc = statusConfig[opp.status] || statusConfig.open;
  const Icon = sc.icon;
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-foreground">{opp.name || "Unnamed Deal"}</p>
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", sc.bg, sc.color)}>
          <Icon className="w-2.5 h-2.5" />{sc.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">Value</p>
          <p className="text-base font-bold text-foreground">${(opp.monetaryValue || 0).toLocaleString()}</p>
        </div>
        {opp.stage?.name && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Stage</p>
            <p className="text-xs text-foreground font-medium">{opp.stage.name}</p>
          </div>
        )}
        {opp.assignedTo && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Owner</p>
            <p className="text-xs text-muted-foreground">{opp.assignedTo}</p>
          </div>
        )}
      </div>
      {opp.lastStageChangeAt && (
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />Updated {moment(opp.lastStageChangeAt).fromNow()}
        </p>
      )}
    </div>
  );
}

export default function GHLDashboard() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState(() => localStorage.getItem('ghl_location_id') || "");
  const [locationInput, setLocationInput] = useState(() => localStorage.getItem('ghl_location_id') || "");
  const [connected, setConnected] = useState(!!localStorage.getItem('ghl_location_id'));
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const invoke = useCallback(async (action, extra = {}) => {
    const res = await base44.functions.invoke("ghl", { action, locationId, ...extra });
    return res.data;
  }, [locationId]);

  const handleConnect = async () => {
    if (!locationInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await base44.functions.invoke("ghl", { action: "getLocations", locationId: locationInput.trim() });
      const locs = data.data?.locations || [];
      if (locs.length === 0) throw new Error("Location not found. Check your Location ID.");
      localStorage.setItem('ghl_location_id', locationInput.trim());
      setLocationId(locationInput.trim());
      setLocations(locs);
      setConnected(true);
    } catch (e) {
      setError(e.message || "Failed to connect. Check your Location ID and API Key.");
    } finally {
      setLoading(false);
    }
  };

  // Load locations on mount if already connected
  useEffect(() => {
    if (connected && locationId) loadAll();
    else setLoading(false);
  }, []);

  // Load data when locationId changes
  useEffect(() => {
    if (!locationId) return;
    loadAll();
  }, [locationId]);

  const loadAll = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [statsData, contactsData, oppsData, pipesData] = await Promise.all([
        base44.functions.invoke("ghl", { action: "getStats", locationId }),
        base44.functions.invoke("ghl", { action: "getContacts", locationId, limit: 50 }),
        base44.functions.invoke("ghl", { action: "getOpportunities", locationId, limit: 100 }),
        base44.functions.invoke("ghl", { action: "getPipelines", locationId }),
      ]);
      setStats(statsData.data?.stats);
      setContacts(contactsData.data?.contacts || []);
      setOpportunities(oppsData.data?.opportunities || []);
      const pipes = pipesData.data?.pipelines || [];
      setPipelines(pipes);
      if (pipes.length > 0 && !selectedPipeline) setSelectedPipeline(pipes[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const searchContacts = async () => {
    if (!search.trim()) return;
    setRefreshing(true);
    try {
      const data = await base44.functions.invoke("ghl", { action: "getContacts", locationId, limit: 50, query: search });
      setContacts(data.data?.contacts || []);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOpps = selectedPipeline
    ? opportunities.filter(o => o.pipelineId === selectedPipeline)
    : opportunities;

  // Not connected yet — show connect form
  if (!connected) return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground mb-1">Connect GoHighLevel</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter your GHL Location ID to sync contacts, deals, and pipeline data.</p>
        <div className="text-left mb-4">
          <label className="text-xs text-muted-foreground block mb-1.5">Location ID</label>
          <Input
            placeholder="e.g. abc123xyz..."
            value={locationInput}
            onChange={e => setLocationInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            className="bg-background border-border"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">Find it in GHL: Settings → Business Info → Location ID</p>
        </div>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        <Button onClick={handleConnect} disabled={loading || !locationInput.trim()} className="w-full rounded-xl gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</> : "Connect GHL"}
        </Button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <Loader2 className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Connecting to GoHighLevel...</p>
      </div>
    </div>
  );

  if (error && !stats) return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="GoHighLevel CRM" subtitle="Connect and sync your GHL data" />
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-foreground font-medium mb-1">Connection Error</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadAll} variant="outline" className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="GoHighLevel CRM" subtitle="Live contacts, deals, and pipeline data">
        <div className="flex items-center gap-3">
          {locations.length > 1 && (
            <select
              value={locationId || ""}
              onChange={e => setLocationId(e.target.value)}
              className="text-xs bg-card border border-border rounded-xl px-3 py-2 text-foreground"
            >
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <Button onClick={loadAll} variant="outline" disabled={refreshing} className="gap-2 rounded-xl border-border text-muted-foreground hover:text-foreground text-xs">
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} /> Sync
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total Contacts" value={(stats.totalContacts || 0).toLocaleString()} icon={Users} />
          <StatCard label="Open Deals" value={stats.openDeals} icon={Circle} color="text-primary" />
          <StatCard label="Pipeline Value" value={`$${(stats.pipelineValue || 0).toLocaleString()}`} icon={DollarSign} color="text-warning" />
          <StatCard label="Won Deals" value={stats.wonDeals} icon={CheckCircle2} color="text-success" sub={`$${(stats.wonValue || 0).toLocaleString()}`} />
          <StatCard label="Lost Deals" value={stats.lostDeals} icon={XCircle} color="text-destructive" />
          <StatCard label="Conv. Rate" value={`${stats.conversionRate}%`} icon={TrendingUp} color="text-chart-2" />
        </div>
      )}

      <Tabs defaultValue="contacts">
        <TabsList className="bg-card border border-border mb-6">
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
        </TabsList>

        {/* CONTACTS */}
        <TabsContent value="contacts">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchContacts()}
                  className="pl-9 bg-background border-border"
                />
              </div>
              <Button onClick={searchContacts} disabled={refreshing} size="sm" className="rounded-xl">Search</Button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No contacts found</p>
            ) : (
              <div className="space-y-1">
                {contacts.map((c, i) => <ContactRow key={c.id || i} contact={c} />)}
              </div>
            )}
          </div>
        </TabsContent>

        {/* OPPORTUNITIES */}
        <TabsContent value="opportunities">
          {pipelines.length > 1 && (
            <div className="flex gap-2 mb-4">
              {pipelines.map(p => (
                <button key={p.id} onClick={() => setSelectedPipeline(p.id)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-medium transition-all", selectedPipeline === p.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {filteredOpps.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No opportunities found</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpps.map((o, i) => <OpportunityCard key={o.id || i} opp={o} />)}
            </div>
          )}
        </TabsContent>

        {/* PIPELINE VIEW (Kanban-style) */}
        <TabsContent value="pipeline">
          {pipelines.length === 0 ? (
            <p className="text-center text-muted-foreground py-16 text-sm">No pipelines found</p>
          ) : (
            <div className="space-y-6">
              {pipelines.map(pipeline => {
                const pipeOpps = opportunities.filter(o => o.pipelineId === pipeline.id);
                const stages = pipeline.stages || [];
                return (
                  <div key={pipeline.id} className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">{pipeline.name}</h3>
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(stages.length, 5)}, 1fr)` }}>
                      {stages.map(stage => {
                        const stageOpps = pipeOpps.filter(o => o.stageId === stage.id);
                        const stageValue = stageOpps.reduce((s, o) => s + (o.monetaryValue || 0), 0);
                        return (
                          <div key={stage.id} className="bg-secondary/30 rounded-xl p-3 min-h-[80px]">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-semibold text-foreground">{stage.name}</p>
                              <span className="text-[10px] bg-card border border-border text-muted-foreground px-1.5 py-0.5 rounded-full">{stageOpps.length}</span>
                            </div>
                            {stageValue > 0 && <p className="text-[11px] text-success font-medium">${stageValue.toLocaleString()}</p>}
                            <div className="mt-2 space-y-1.5">
                              {stageOpps.slice(0, 3).map((o, i) => (
                                <div key={i} className="bg-card border border-border/50 rounded-lg px-2.5 py-1.5">
                                  <p className="text-[11px] font-medium text-foreground truncate">{o.name || "Deal"}</p>
                                  {o.monetaryValue > 0 && <p className="text-[10px] text-muted-foreground">${o.monetaryValue.toLocaleString()}</p>}
                                </div>
                              ))}
                              {stageOpps.length > 3 && <p className="text-[10px] text-muted-foreground text-center">+{stageOpps.length - 3} more</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}