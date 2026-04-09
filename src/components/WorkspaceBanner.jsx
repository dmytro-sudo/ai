import { useWorkspace } from "@/lib/useWorkspace";
import { ShieldCheck, X, Eye } from "lucide-react";

export default function WorkspaceBanner() {
  const { workspace } = useWorkspace();

  if (!workspace || !workspace.name) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs font-medium">
      <div className="flex items-center gap-2">
        <Eye className="w-3.5 h-3.5" />
        <span>Viewing client workspace:</span>
        <span className="font-bold text-amber-300">{workspace.name}</span>
        <span className="text-amber-500/70">({workspace.owner_email})</span>
      </div>
      <button
        onClick={() => window.location.href = '/'}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
      >
        <ShieldCheck className="w-3 h-3" />
        <span>Return to Agency View</span>
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}