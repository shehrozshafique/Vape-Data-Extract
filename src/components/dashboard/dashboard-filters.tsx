"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANGE_OPTIONS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
];

const ALL = "__all__";

/** The global filter row: changing either control updates every widget below it (KPIs, chart,
 * latest products) except the Competitor Activity Table, which is deliberately always an
 * all-competitors comparison. */
export function DashboardFilters({ competitors }: { competitors: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select defaultValue={searchParams.get("competitor") ?? ALL} onValueChange={(v) => updateParam("competitor", v)}>
        <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All competitors" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All competitors</SelectItem>
          {competitors.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("range") ?? "last_7_days"} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
