import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLOR_CLASSES } from "@/lib/constants";

export function StatusBadge({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_COLOR_CLASSES[color] ?? STATUS_COLOR_CLASSES.gray, className)}>
      {label}
    </Badge>
  );
}
