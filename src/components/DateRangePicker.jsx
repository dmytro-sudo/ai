import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const PRESETS = [
  { label: "7D", value: "last_7d", days: 7 },
  { label: "14D", value: "last_14d", days: 14 },
  { label: "30D", value: "last_30d", days: 30 },
  { label: "90D", value: "last_90d", days: 90 },
  { label: "Custom", value: "custom" },
];

// Returns { datePreset?, since?, until? }
export default function DateRangePicker({ onChange }) {
  const [selected, setSelected] = useState("last_30d");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset) => {
    setSelected(preset.value);
    if (preset.value === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange({ datePreset: preset.value });
    }
  };

  const applyCustom = () => {
    if (!since || !until) return;
    setShowCustom(false);
    onChange({ since, until });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => handlePreset(p)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              selected === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.value === "custom" && <CalendarDays className="w-3 h-3" />}
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3 flex-wrap">
          <input
            type="date"
            value={since}
            onChange={e => setSince(e.target.value)}
            max={until || undefined}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={until}
            onChange={e => setUntil(e.target.value)}
            min={since || undefined}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={applyCustom}
            disabled={!since || !until}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}