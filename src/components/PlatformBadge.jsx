import { cn } from "@/lib/utils";

export default function PlatformBadge({ platform }) {
  const isMeta = platform === "Meta Ads";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
      isMeta ? "bg-chart-4/10 text-chart-4" : "bg-chart-5/10 text-chart-5"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", isMeta ? "bg-chart-4" : "bg-chart-5")} />
      {platform}
    </span>
  );
}