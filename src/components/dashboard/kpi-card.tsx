import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "default" | "blue" | "amber" | "green";
}) {
  const accentClasses: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className={cn("flex size-9 items-center justify-center rounded-lg", accentClasses[accent ?? "default"])}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
