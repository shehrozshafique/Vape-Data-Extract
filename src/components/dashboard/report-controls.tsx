"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const GROUPINGS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
] as const;

const RANGES = [
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
] as const;

export function ReportControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const grouping = searchParams.get("grouping") ?? "day";
  const range = searchParams.get("range") ?? "last_30_days";
  const exportQuery = new URLSearchParams({ grouping, preset: range }).toString();
  const groupingItems = Object.fromEntries(GROUPINGS.map((item) => [item.value, item.label]));
  const rangeItems = Object.fromEntries(RANGES.map((item) => [item.value, item.label]));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={grouping} items={groupingItems} onValueChange={(value) => updateParam("grouping", value)}>
        <SelectTrigger className="h-9 min-w-[8rem]" aria-label="Report grouping">
          <SelectValue placeholder="Daily" />
        </SelectTrigger>
        <SelectContent>
          {GROUPINGS.map((item) => (
            <SelectItem key={item.value} value={item.value} label={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={range} items={rangeItems} onValueChange={(value) => updateParam("range", value)}>
        <SelectTrigger className="h-9 min-w-[10rem]" aria-label="Report date range">
          <SelectValue placeholder="Last 30 days" />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((item) => (
            <SelectItem key={item.value} value={item.value} label={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={`/api/reports/export?${exportQuery}&format=csv`}>
              <Download className="size-3.5" /> CSV
            </a>
          }
        />
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={`/api/reports/export?${exportQuery}&format=xlsx`}>
              <Download className="size-3.5" /> XLSX
            </a>
          }
        />
      </div>
    </div>
  );
}
