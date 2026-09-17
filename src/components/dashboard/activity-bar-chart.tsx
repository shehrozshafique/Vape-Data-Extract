"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import type { ReportRow } from "@/lib/queries/reports";

// Same validated categorical palette as ActivityChart — see references/palette.md.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

function cssSafe(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function ActivityBarChart({
  rows,
  competitorNames,
  stableOrder,
}: {
  rows: ReportRow[];
  competitorNames: string[];
  stableOrder: string[];
}) {
  const colorFor = (name: string) => {
    const idx = stableOrder.indexOf(name);
    return SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length];
  };

  const config: ChartConfig = Object.fromEntries(competitorNames.map((name) => [cssSafe(name), { label: name, color: colorFor(name) }]));

  const data = rows.map((row) => ({ bucket: row.bucket, ...row.competitorTotals }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {competitorNames.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {competitorNames.map((name) => (
          <Bar key={name} dataKey={name} stackId="total" fill={`var(--color-${cssSafe(name)})`} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
