"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
];

export function ActivityControls({ competitors }: { competitors: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedIds = new Set((searchParams.get("competitors") ?? "").split(",").filter(Boolean));

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleCompetitor(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateParam("competitors", next.size > 0 ? Array.from(next).join(",") : null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select defaultValue={searchParams.get("range") ?? "last_30_days"} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-1.5">
        {competitors.map((c) => {
          const active = selectedIds.size === 0 || selectedIds.has(c.id);
          return (
            <Badge
              key={c.id}
              variant="outline"
              role="button"
              onClick={() => toggleCompetitor(c.id)}
              className={cn("cursor-pointer select-none", active ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground")}
            >
              {c.name}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
