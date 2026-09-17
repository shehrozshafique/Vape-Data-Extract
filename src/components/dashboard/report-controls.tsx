"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const GROUPINGS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const RANGES = [
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
];

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select defaultValue={grouping} onValueChange={(v) => updateParam("grouping", v)}>
        <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {GROUPINGS.map((g) => (
            <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={range} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
