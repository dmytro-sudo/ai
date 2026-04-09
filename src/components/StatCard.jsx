import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, change, changeType, icon: Icon, prefix = "", suffix = "" }) {
  const isPositive = changeType === "positive";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}%
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-display font-bold text-foreground">{prefix}{value}{suffix}</p>
    </div>
  );
}