"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import type { ActivityChartPoint } from "@/lib/queries/activity-chart";

// Validated categorical palette (dataviz skill / references/palette.md), light surface —
// this app's UI is a fixed light theme (see spec: "white/light interface"), so only the light
// steps are needed. Fixed slot order, assigned by each competitor's stable position (not by
// rank in the current filtered view) so a competitor's color never changes when the
// competitor-selection filter changes.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

function cssSafe(name: string) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function ActivityChart({
  points,
  seriesNames,
  stableOrder,
}: {
  points: ActivityChartPoint[];
  seriesNames: string[];
  stableOrder: string[];
}) {
  const colorFor = (name: string) => {
    const idx = stableOrder.indexOf(name);
    return SERIES_COLORS[(idx >= 0 ? idx : 0) % SERIES_COLORS.length];
  };

  const config: ChartConfig = Object.fromEntries(
    seriesNames.map((name) => [cssSafe(name), { label: name, color: colorFor(name) }]),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <LineChart data={points} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => format(parseISO(value), "d MMM")}
          fontSize={11}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => format(parseISO(String(value)), "d MMM yyyy")} />} />
        {seriesNames.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {seriesNames.map((name) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={`var(--color-${cssSafe(name)})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
