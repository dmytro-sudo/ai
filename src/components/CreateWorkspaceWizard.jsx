import { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { X, Check, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateWorkspaceWizard({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const workspace = await base44.entities.Workspace.create({
      name: name.trim(),
      slug,
      status: "onboarding",
      plan: "starter",
      billing_status: "trial",
    });

    await base44.entities.ActivityLog.create({
      workspace_id: workspace.id,
      action: "workspace_created",
      entity_type: "Workspace",
      entity_id: workspace.id,
      details: `Workspace "${workspace.name}" created`,
      platform_action: true,
    }).catch(() => {});

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">New Workspace</h2>
              <p className="text-xs text-muted-foreground">Create a blank client workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              Workspace Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. ClipCar Toronto"
              className="bg-background border-border"
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A blank workspace will be created. You can configure all details, integrations, and team members from the workspace settings.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="rounded-xl gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}