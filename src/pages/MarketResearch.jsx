import { useState, useEffect, useRef } from "react";
import { getStore, setStore, subscribeStore } from "../lib/backgroundStore";
import { base44 } from "@/api/supabaseClient";
import { Search, Sparkles, TrendingUp, Users, MapPin, Calendar, Loader2, BarChart3, Newspaper, Target, Globe, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import PageHeader from "../components/PageHeader";

const exampleSearches = [
  { product: "Paint Protection Film", location: "Miami, FL", period: "last_month" },
  { product: "Ceramic Coating", location: "Los Angeles, CA", period: "last_quarter" },
  { product: "Window Tinting", location: "New York, NY", period: "last_year" },
];

export default function MarketResearch() {
  const [form, setForm] = useState({ product: "", service_type: "product", location: "", location_type: "city", period: "last_month", industry: "" });
  const [loading, setLoading] = useState(() => getStore('research_loading') || false);
  const [result, setResult] = useState(() => getStore('research_result') || null);
  const taskRef = useRef(null);

  // Restore form if we have a result
  useEffect(() => {
    const savedForm = getStore('research_form');
    if (savedForm) setForm(savedForm);
    const unsub = subscribeStore('research_result', setResult);
    const unsubL = subscribeStore('research_loading', setLoading);
    return () => { unsub(); unsubL(); };
  }, []);

  const runResearch = async (overrideForm) => {
    const data = overrideForm || form;
    if (!data.product || !data.location) return;
    setStore('research_loading', true);
    setStore('research_result', null);
    setStore('research_form', data);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert market research analyst specializing in digital advertising and consumer behavior. 
      
Conduct a comprehensive market research report for:
- Product/Service: "${data.product}"
- Location: ${data.location} (${data.location_type})
- Time Period: ${data.period.replace("_", " ")}
- Industry: ${data.industry || "General"}

Please provide a detailed analysis in the following exact structure with markdown headers:

## 🔍 Search Trend Analysis
Analyze how frequently people search for "${data.product}" in ${data.location}. Include estimated monthly search volume, trend direction (growing/declining), seasonal patterns, and peak months. Be specific with numbers.

## 👥 Audience Demographics
Who is searching for this? Break down by:
- Age groups (with percentages)
- Gender split
- Income levels
- Interests and behaviors
- Device usage (mobile vs desktop)

## 📊 Market Size & Competition
- Estimated market size in ${data.location}
- Number of competitors
- Market saturation level (Low/Medium/High)
- Average pricing in the market
- Top 3-5 competitor characteristics

## 📰 Recent News & Trends
List 4-5 relevant recent news, trends, or events affecting this market in ${data.period.replace("_", " ")}.

## 🎯 Advertising Intelligence
- Best performing ad formats for this product
- Recommended Facebook/Instagram interests to target
- Recommended Google keywords (high intent)
- Estimated CPC range
- Best times to run ads

## ⚡ AI Recommendations for EI Marketing
Provide 5 specific, actionable recommendations for running ads for this product/service in this location, based on the data above.

Be specific, data-driven, and professional. Use realistic numbers based on industry knowledge.`,
      add_context_from_internet: true,
      model: "gemini_3_pro",
    });

    const newResult = { ...data, content: res };
    setStore('research_result', newResult);
    setStore('research_loading', false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Market Research" subtitle="AI-powered market intelligence for your ad campaigns" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" /> Research Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Product / Service *</Label>
                <Input
                  placeholder="e.g. Paint Protection Film"
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Industry / Niche</Label>
                <Input
                  placeholder="e.g. Automotive, Real Estate..."
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Location *</Label>
                <Input
                  placeholder="e.g. Miami, FL or Texas"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Location Type</Label>
                <Select value={form.location_type} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="state">State / Province</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="metro">Metro Area</SelectItem>
                    <SelectItem value="zip">ZIP Code Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Time Period</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter (3 months)</SelectItem>
                    <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="last_3_years">Last 3 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => runResearch()}
                disabled={loading || !form.product || !form.location}
                className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 h-11"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Researching...</> : <><Sparkles className="w-4 h-4" /> Run AI Research</>}
              </Button>
            </div>
          </div>

          {/* Quick examples */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Examples</h3>
            <div className="space-y-2">
              {exampleSearches.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const f = { ...form, product: ex.product, location: ex.location, period: ex.period };
                    setForm(f);
                    runResearch(f);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <p className="text-sm font-medium text-foreground">{ex.product}</p>
                  <p className="text-xs text-muted-foreground">{ex.location} · {ex.period.replace("_", " ")}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading && (
            <div className="bg-card border border-border rounded-2xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-foreground font-medium">Researching the market...</p>
                <p className="text-sm text-muted-foreground mt-2">Analyzing trends, demographics, and competitors</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="bg-card border-2 border-dashed border-border rounded-2xl flex items-center justify-center min-h-[500px]">
              <div className="text-center">
                <Globe className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-foreground font-medium">Enter a product and location</p>
                <p className="text-sm text-muted-foreground mt-1">EI will analyze the market and provide insights</p>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">{result.product}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{result.location}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{result.period.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors">
                      <Presentation className="w-3.5 h-3.5" /> Export Presentation
                    </button>
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                      <Sparkles className="w-3.5 h-3.5" /> AI Research
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <ReactMarkdown
                  className="text-sm prose prose-sm prose-invert max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3 [&_h2:first-child]:mt-0 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground [&_ul]:space-y-1 [&_ul]:my-2 [&_li]:leading-relaxed"
                >
                  {result.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}