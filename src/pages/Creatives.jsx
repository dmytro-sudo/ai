import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/supabaseClient";
import { useWorkspace } from "@/lib/useWorkspace";
import { Upload, Search, Filter, ImagePlay, Video, Grid3X3, List, X, Plus, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/PageHeader";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  active: "bg-success/10 text-success",
  approved: "bg-success/10 text-success",
  pending_review: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

const TYPE_ICONS = {
  image: ImagePlay,
  video: Video,
  carousel: Grid3X3,
  story: ImagePlay,
  banner: ImagePlay,
};

function CreativeCard({ creative, onDelete }) {
  const Icon = TYPE_ICONS[creative.type] || ImagePlay;
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group">
      <div className="aspect-video bg-secondary/50 flex items-center justify-center relative">
        {creative.thumbnail_url || creative.file_url ? (
          <img
            src={creative.thumbnail_url || creative.file_url}
            alt={creative.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <Icon className="w-10 h-10 text-muted-foreground/30" />
        )}
        <button
          onClick={() => onDelete(creative.id)}
          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-card/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-foreground truncate mb-1">{creative.name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{creative.type}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground">{creative.platform}</span>
          {creative.status && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[creative.status] || "bg-secondary text-muted-foreground")}>
              {creative.status?.replace("_", " ")}
            </span>
          )}
        </div>
        {creative.headline && <p className="text-xs text-muted-foreground mt-2 truncate">{creative.headline}</p>}
      </div>
    </div>
  );
}

function UploadModal({ onClose, onCreated, workspaceId }) {
  const [form, setForm] = useState({
    name: "", type: "image", platform: "Meta Ads", status: "pending_review",
    file_url: "", headline: "", description: "", cta: "", notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, file_url, name: f.name || file.name.replace(/\.[^.]+$/, "") }));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    await base44.entities.Creative.create({ ...form, campaign_id: workspaceId });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h3 className="text-base font-display font-bold text-foreground">Add Creative</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
            )}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : form.file_url ? (
              <>
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-success rotate-45" />
                </div>
                <p className="text-xs text-success font-medium">File uploaded ✓</p>
                <p className="text-xs text-muted-foreground">Click to replace</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop file here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Images, videos, banners</p>
                </div>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Or paste URL */}
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input placeholder="Or paste image/video URL..." value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className="bg-background border-border text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Creative Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Promo Banner" className="bg-background border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Platform</label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["image", "video", "carousel", "story", "banner"].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Headline</label>
            <Input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="Ad headline text" className="bg-background border-border" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Notes (for AI)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes for AI creative selection..." rows={2} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || saving} className="flex-1 rounded-xl gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Add Creative"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Creatives() {
  const { workspace } = useWorkspace();
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showUpload, setShowUpload] = useState(false);

  const load = () => {
    if (!workspace?.id) return;
    base44.entities.Creative.filter({ workspace_id: workspace.id }, "-created_date", 100)
      .then(setCreatives)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [workspace?.id]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this creative?")) return;
    await base44.entities.Creative.delete(id);
    load();
  };

  const filtered = creatives.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.headline?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = filterPlatform === "all" || c.platform === filterPlatform;
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchType = filterType === "all" || c.type === filterType;
    return matchSearch && matchPlatform && matchStatus && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Ad Creatives" subtitle="Manage your creative assets and media library">
        <Button onClick={() => setShowUpload(true)} className="gap-2 rounded-xl h-9">
          <Plus className="w-4 h-4" /> Add Creative
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search creatives..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "Meta Ads", "Google Ads"].map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)} className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-all", filterPlatform === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "active", "approved", "pending_review", "archived"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={cn("px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all", filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground")}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-card border-2 border-dashed border-border rounded-2xl">
          <ImagePlay className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">No creatives yet</p>
          <p className="text-sm text-muted-foreground mb-6">Upload your first ad creative to get started</p>
          <Button onClick={() => setShowUpload(true)} className="gap-2 rounded-xl">
            <Upload className="w-4 h-4" /> Upload Creative
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(c => (
            <CreativeCard key={c.id} creative={c} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onCreated={load} workspaceId={workspace?.id} />
      )}
    </div>
  );
}