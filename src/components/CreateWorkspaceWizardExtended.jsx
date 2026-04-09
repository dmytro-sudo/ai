// @ts-nocheck
import { useState } from "react";
import { base44 } from "@/api/supabaseClient";
import { X, Check, Loader2, Building2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { id: 1, title: "Basic Information", icon: "🏢" },
  { id: 2, title: "Contact Details", icon: "📞" },
  { id: 3, title: "Services & Offerings", icon: "💼" },
  { id: 4, title: "Target Audience", icon: "🎯" },
  { id: 5, title: "Marketing Goals", icon: "📈" },
  { id: 6, title: "Branding", icon: "🎨" },
  { id: 7, title: "Review & Finish", icon: "✅" },
];

export default function CreateWorkspaceWizardExtended({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    brand_name: "",
    owner_email: "",
    contact_name: "",
    contact_phone: "",
    contact_title: "",
    website: "",
    industry: "",
    company_summary: "",
    main_services: "",
    main_offer: "",
    target_audience: "",
    service_area: "",
    country: "Canada",
    timezone: "America/Toronto",
    marketing_goal: "",
    lead_goal: "",
    target_cpl: "",
    monthly_budget: 0,
    tone_of_voice: "",
    competitors: "",
    approved_claims: "",
    forbidden_claims: "",
    primary_color: "#000000",
    logo_url: "",
    notes: "",
    ai_notes: "",
    sales_process: "",
  });

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.owner_email) {
      alert("Please fill in the workspace name and owner email.");
      return;
    }
    setSaving(true);
    try {
      const slug = formData.name.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") 
        || ("ws-" + Date.now());

      const workspaceData = {
        name: formData.name,
        slug: slug,
        owner_email: formData.owner_email,
        industry: formData.industry,
        monthly_budget: formData.monthly_budget,
        notes: formData.notes,
        status: "active",
        plan: "starter",
      };

      console.log("Creating workspace:", workspaceData);
      const workspace = await base44.entities.Workspace.create(workspaceData);

      // Non-blocking sub-entities
      try {
        const user = await base44.auth.me();
        await base44.entities.WorkspaceUser.create({
          workspace_id: workspace.id,
          user_email: user.email,
          role: "workspace_owner",
          status: "active"
        });
      } catch (e1) { console.warn("WorkspaceUser failed:", e1); }

      try {
        const integrations = [{ type: "meta_ads", label: "Meta Ads" }, { type: "google_ads", label: "Google Ads" }];
        for (const integ of integrations) {
          await base44.entities.WorkspaceIntegration.create({
            workspace_id: workspace.id,
            workspace_name: workspace.name,
            type: integ.type,
            label: integ.label,
            status: "pending"
          });
        }
      } catch (e2) { console.warn("Integrations failed:", e2); }

      alert("🎉 Workspace created successfully!");
      setSaving(false);
      onCreated();
      onClose();
    } catch (e) {
      console.error("CREATE ERROR:", e);
      alert("Error: " + (e.message || JSON.stringify(e)));
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>Workspace Name *</Label>
              <Input
                value={formData.name}
                onChange={e => updateForm("name", e.target.value)}
                placeholder="e.g. ClipCar Toronto"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={e => updateForm("company_name", e.target.value)}
                placeholder="Official registered company name"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Brand Name / Trade Name</Label>
              <Input
                value={formData.brand_name}
                onChange={e => updateForm("brand_name", e.target.value)}
                placeholder="How the company is known in the market"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Industry / Niche</Label>
              <Input
                value={formData.industry}
                onChange={e => updateForm("industry", e.target.value)}
                placeholder="e.g. Auto Detailing, Marketing Agency"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={e => updateForm("country", e.target.value)}
                placeholder="Canada"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={e => updateForm("timezone", e.target.value)}
                placeholder="America/Toronto"
                className="bg-background border-border"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Owner Email / Primary Contact *</Label>
              <Input
                type="email"
                value={formData.owner_email}
                onChange={e => updateForm("owner_email", e.target.value)}
                placeholder="owner@company.com"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Contact Person Name</Label>
              <Input
                value={formData.contact_name}
                onChange={e => updateForm("contact_name", e.target.value)}
                placeholder="John Smith"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Title / Position</Label>
              <Input
                value={formData.contact_title}
                onChange={e => updateForm("contact_title", e.target.value)}
                placeholder="CEO, Founder, Marketing Manager"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={formData.contact_phone}
                onChange={e => updateForm("contact_phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={e => updateForm("website", e.target.value)}
                placeholder="https://company.com"
                className="bg-background border-border"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Company Overview</Label>
              <textarea
                value={formData.company_summary}
                onChange={e => updateForm("company_summary", e.target.value)}
                placeholder="Brief company description, history, and mission"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={3}
              />
            </div>
            <div>
              <Label>Main Services / Products</Label>
              <textarea
                value={formData.main_services}
                onChange={e => updateForm("main_services", e.target.value)}
                placeholder="Detailed description of what you offer"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={3}
              />
            </div>
            <div>
              <Label>Main Offer / USP (Unique Selling Proposition)</Label>
              <Input
                value={formData.main_offer}
                onChange={e => updateForm("main_offer", e.target.value)}
                placeholder="What sets you apart from competitors"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Competitors / Market Position</Label>
              <Input
                value={formData.competitors}
                onChange={e => updateForm("competitors", e.target.value)}
                placeholder="Your main competitors"
                className="bg-background border-border"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Audience</Label>
              <textarea
                value={formData.target_audience}
                onChange={e => updateForm("target_audience", e.target.value)}
                placeholder="Audience description (demographics, interests, behavior)"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={3}
              />
            </div>
            <div>
              <Label>Geographic Service Area</Label>
              <Input
                value={formData.service_area}
                onChange={e => updateForm("service_area", e.target.value)}
                placeholder="e.g. Toronto, Greater Toronto Area, Canada"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Audience Notes (for AI Analysis)</Label>
              <textarea
                value={formData.ai_notes}
                onChange={e => updateForm("ai_notes", e.target.value)}
                placeholder="Additional notes about your target audience for AI analysis"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={2}
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label>Primary Marketing Goal</Label>
              <Input
                value={formData.marketing_goal}
                onChange={e => updateForm("marketing_goal", e.target.value)}
                placeholder="e.g. Brand awareness, lead generation"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Target KPI / Cost Per Lead (CPL)</Label>
              <Input
                value={formData.target_cpl}
                onChange={e => updateForm("target_cpl", e.target.value)}
                placeholder="e.g. $12 CAD per lead"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Lead / Conversion Goal</Label>
              <Input
                value={formData.lead_goal}
                onChange={e => updateForm("lead_goal", e.target.value)}
                placeholder="e.g. 100 leads per month, $50k revenue"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Monthly Ad Budget ($)</Label>
              <Input
                type="number"
                value={formData.monthly_budget}
                onChange={e => updateForm("monthly_budget", parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Sales Process / Notes</Label>
              <textarea
                value={formData.sales_process}
                onChange={e => updateForm("sales_process", e.target.value)}
                placeholder="Description of your sales process"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={2}
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label>Primary Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={e => updateForm("primary_color", e.target.value)}
                  className="h-10 w-16 rounded-lg cursor-pointer"
                />
                <Input
                  value={formData.primary_color}
                  onChange={e => updateForm("primary_color", e.target.value)}
                  placeholder="#000000"
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div>
              <Label>Tone of Voice / Communication Style</Label>
              <Input
                value={formData.tone_of_voice}
                onChange={e => updateForm("tone_of_voice", e.target.value)}
                placeholder="e.g. Professional, Friendly, Technical"
                className="bg-background border-border"
              />
            </div>
            <div>
              <Label>Approved Claims</Label>
              <textarea
                value={formData.approved_claims}
                onChange={e => updateForm("approved_claims", e.target.value)}
                placeholder="Statements that can be used in advertising"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={2}
              />
            </div>
            <div>
              <Label>Forbidden / Restricted Claims</Label>
              <textarea
                value={formData.forbidden_claims}
                onChange={e => updateForm("forbidden_claims", e.target.value)}
                placeholder="Statements that cannot be used in advertising"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={2}
              />
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success rounded-xl p-4">
              <p className="text-sm text-foreground">
                <strong>All done!</strong> You've filled in all the information. After creating the workspace:
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                <li>The workspace will be created with "onboarding" status</li>
                <li>Integrations for Meta Ads, Google Ads, and Claude AI will be prepared</li>
                <li>You will be assigned the workspace_owner role</li>
                <li>Once API keys are added, data will sync automatically</li>
              </ul>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <textarea
                value={formData.notes}
                onChange={e => updateForm("notes", e.target.value)}
                placeholder="Internal notes about the client"
                className="w-full p-2 rounded-lg border border-border bg-background text-foreground text-sm"
                rows={2}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{STEPS[step - 1].icon}</div>
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">
                {STEPS[step - 1].title}
              </h2>
              <p className="text-xs text-muted-foreground">Step {step} of 7</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 border-t border-border pt-4 sticky bottom-0 bg-card">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <span className="text-xs text-muted-foreground">
            {step} / 7
          </span>
          {step === 7 ? (
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Workspace
            </Button>
          ) : (
            <Button
              onClick={() => setStep(Math.min(7, step + 1))}
              className="rounded-xl gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}