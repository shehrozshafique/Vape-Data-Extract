"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DateCompetitorBreakdownRow } from "@/lib/queries/dashboard";

const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

/** One bar per competitor for a single selected date — each bar keeps that competitor's
 * stable color slot so it matches the same competitor's color everywhere else in the app. */
export function CompetitorCountBarChart({ rows, stableOrder }: { rows: DateCompetitorBreakdownRow[]; stableOrder: string[] }) {
  const config: ChartConfig = { count: { label: "Products" } };

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis dataKey="competitorName" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {rows.map((row) => {
            const idx = stableOrder.indexOf(row.competitorName);
            return <Cell key={row.competitorId} fill={SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length]} />;
          })}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
