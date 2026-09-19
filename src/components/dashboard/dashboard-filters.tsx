"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANGE_OPTIONS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
] as const;

const ALL = "all";

/** Global dashboard filters. Changing either control updates KPIs, chart, and latest products.
 * The Competitor Activity table always compares every competitor in the project. */
export function DashboardFilters({ competitors }: { competitors: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const competitorItems = useMemo(
    () => ({
      [ALL]: "All competitors",
      ...Object.fromEntries(competitors.map((competitor) => [competitor.id, competitor.name])),
    }),
    [competitors],
  );
  const rangeItems = useMemo(
    () => Object.fromEntries(RANGE_OPTIONS.map((option) => [option.value, option.label])),
    [],
  );

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const competitorValue = searchParams.get("competitor") ?? ALL;
  const rangeValue = searchParams.get("range") ?? "last_7_days";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={competitorValue} items={competitorItems} onValueChange={(value) => updateParam("competitor", value)}>
        <SelectTrigger className="h-9 min-w-[11rem]" aria-label="Filter by competitor">
          <SelectValue placeholder="All competitors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All competitors">
            All competitors
          </SelectItem>
          {competitors.map((competitor) => (
            <SelectItem key={competitor.id} value={competitor.id} label={competitor.name}>
              {competitor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={rangeValue} items={rangeItems} onValueChange={(value) => updateParam("range", value)}>
        <SelectTrigger className="h-9 min-w-[9.5rem]" aria-label="Date range">
          <SelectValue placeholder="Last 7 days" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} label={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
