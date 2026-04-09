import { cn } from "@/lib/utils";

const statusStyles = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  completed: "bg-muted text-muted-foreground",
  draft: "bg-secondary text-secondary-foreground",
  open: "bg-primary/10 text-primary",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  generated: "bg-primary/10 text-primary",
  sent: "bg-success/10 text-success",
  read: "bg-muted text-muted-foreground",
};

const statusLabels = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  generated: "Generated",
  sent: "Sent",
  read: "Read",
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium capitalize",
      statusStyles[status] || "bg-secondary text-secondary-foreground"
    )}>
      {statusLabels[status] || status}
    </span>
  );
}