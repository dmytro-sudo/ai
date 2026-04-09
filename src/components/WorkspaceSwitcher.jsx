import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/lib/useWorkspace";
import { Search, ChevronDown, Building2, ShieldCheck, Pin, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace, loading, userRole } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pinned_workspaces") || "[]"); } catch { return []; }
  });
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const togglePin = (id, e) => {
    e.stopPropagation();
    const next = pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id];
    setPinned(next);
    localStorage.setItem("pinned_workspaces", JSON.stringify(next));
  };

  const select = (ws) => {
    switchWorkspace(ws.id);
    setOpen(false);
    setSearch("");
  };

  if (loading || !workspace) return null;

  const filtered = workspaces.filter(w =>
    !search || w.name?.toLowerCase().includes(search.toLowerCase()) || w.owner_email?.toLowerCase().includes(search.toLowerCase())
  );
  const pinnedList = filtered.filter(w => pinned.includes(w.id));
  const otherList = filtered.filter(w => !pinned.includes(w.id));

  return (
    <div className="px-3 py-3 border-b border-sidebar-border/50" ref={ref}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Workspace</p>
      
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground text-sm hover:border-sidebar-ring transition-all"
      >
        <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center font-display font-bold text-xs text-primary shrink-0">
          {workspace.name?.[0]?.toUpperCase()}
        </div>
        <span className="flex-1 text-left truncate">{workspace.name}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-20 z-50 bg-card border border-border rounded-xl shadow-lg p-2 max-h-64 overflow-y-auto">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search workspace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1.5 mb-1">Pinned</p>
                  <div className="space-y-1 mb-2">
                    {pinnedList.map(w => <WorkspaceRow key={w.id} w={w} active={workspace} onSelect={select} onPin={togglePin} pinned={pinned} />)}
                  </div>
                </>
              )}

              {otherList.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1.5 mb-1">{pinnedList.length > 0 ? "Other" : "All"}</p>
                  <div className="space-y-1">
                    {otherList.map(w => <WorkspaceRow key={w.id} w={w} active={workspace} onSelect={select} onPin={togglePin} pinned={pinned} />)}
                  </div>
                </>
              )}

              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No workspaces found</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceRow({ w, active, pinned, onSelect, onPin }) {
  const isActive = active?.id === w.id;
  const isPinned = pinned.includes(w.id);
  return (
    <div
      onClick={() => onSelect(w)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group cursor-pointer",
        isActive ? "bg-primary/10" : "hover:bg-secondary"
      )}
    >
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs shrink-0",
        isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
      )}>
        {w.name?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{w.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{w.owner_email}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
        <button
          onClick={(e) => { e.stopPropagation(); onPin(w.id, e); }}
          className={cn("p-1 rounded-lg transition-colors", isPinned ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
        >
          <Pin className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}