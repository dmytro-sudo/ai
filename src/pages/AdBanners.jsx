import { Image, Sparkles, Clock } from "lucide-react";
import PageHeader from "../components/PageHeader";

export default function AdBanners() {
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="AI Ad Banners" subtitle="Create stunning ad creatives with AI" />

      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-8 relative">
            <Image className="w-10 h-10 text-primary" />
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Coming Soon
          </div>

          <h2 className="text-2xl font-display font-bold text-foreground mb-3">
            AI-Powered Ad Creatives
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            This feature will be added soon. You will be able to generate high-converting ad banners for Meta and Google Ads using AI, create multiple variations, and let TopNotch pick the best performers automatically.
          </p>

          <div className="grid grid-cols-3 gap-4">
            {["Auto-generate banners", "A/B test creatives", "Performance tracking"].map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}