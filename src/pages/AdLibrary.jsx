import { useState, useEffect } from "react";
import { base44 } from "@/api/supabaseClient";
import { Search, Filter, ExternalLink, Play, Image, Layers, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";

const typeIcons = { image: Image, video: Play, carousel: Layers, story: Image, banner: Image };
const typeColors = {
  image: "bg-chart-2/10 text-chart-2",
  video: "bg-chart-1/10 text-chart-1",
  carousel: "bg-chart-3/10 text-chart-3",
  story: "bg-chart-4/10 text-chart-4",
  banner: "bg-chart-5/10 text-chart-5",
};

const statusColors = {
  active: "bg-success/10 text-success",
  approved: "bg-chart-2/10 text-chart-2",
  pending_review: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export default function AdLibrary() {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    base44.entities.Creative.list("-created_date", 100)
      .then(setCreatives)
      .finally(() => setLoading(false));
  }, []);

  const filtered = creatives.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.headline?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = filterPlatform === "all" || c.platform === filterPlatform;
    const matchType = filterType === "all" || c.type === filterType;
    return matchSearch && matchPlatform && matchType;
  });

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Ad Library" subtitle="Browse all ad creatives across campaigns" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creatives..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "Meta Ads", "Google Ads", "Both"].map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium transition-all",
                filterPlatform === p ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "all" ? "All Platforms" : p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "image", "video", "carousel", "story", "banner"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all",
                filterType === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border-2 border-dashed border-border rounded-2xl">
          <Image className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-foreground font-medium">No creatives found</p>
          <p className="text-sm text-muted-foreground mt-1">Upload creatives from the Ad Creatives page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => {
            const Icon = typeIcons[c.type] || Image;
            return (
              <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all group">
                {/* Thumbnail */}
                <div className="aspect-video bg-secondary relative overflow-hidden">
                  {c.thumbnail_url || c.file_url ? (
                    <img src={c.thumbnail_url || c.file_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", typeColors[c.type] || "bg-muted text-muted-foreground")}>
                      {c.type}
                    </span>
                  </div>
                  {c.file_url && (
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">{c.name}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize", statusColors[c.status] || "bg-muted text-muted-foreground")}>
                      {c.status?.replace("_", " ")}
                    </span>
                  </div>
                  {c.headline && <p className="text-xs text-muted-foreground truncate mb-2">{c.headline}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{c.platform}</span>
                    {c.ctr > 0 && (
                      <span className="text-xs font-medium text-success">CTR {c.ctr}%</span>
                    )}
                  </div>
                  {c.impressions > 0 && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{c.impressions?.toLocaleString()} impr.</span>
                      <span>{c.clicks?.toLocaleString()} clicks</span>
                      {c.conversions > 0 && <span>{c.conversions} conv.</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}