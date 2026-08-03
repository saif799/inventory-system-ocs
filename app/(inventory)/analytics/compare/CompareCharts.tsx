"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ComparedModel, WideRow } from "@/lib/analytics";

function buildConfig(models: ComparedModel[]): ChartConfig {
  const config: ChartConfig = {};
  models.forEach((m) => {
    config[m.id] = { label: m.name, color: m.color };
  });
  return config;
}

export function UnitsTrendChart({
  data,
  models,
}: {
  data: WideRow[];
  models: ComparedModel[];
}) {
  if (data.length === 0) return <Empty text="No sales in this period." />;
  return (
    <ChartContainer config={buildConfig(models)} className="aspect-auto h-[320px] w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="key"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {models.map((m) => (
          <Line
            key={m.id}
            type="monotone"
            dataKey={m.id}
            stroke={`var(--color-${m.id})`}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

export function SizeDemandChart({
  data,
  models,
}: {
  data: WideRow[];
  models: ComparedModel[];
}) {
  if (data.length === 0) return <Empty text="No size data for this period." />;
  return (
    <ChartContainer config={buildConfig(models)} className="aspect-auto h-[300px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {models.map((m) => (
          <Bar key={m.id} dataKey={m.id} fill={`var(--color-${m.id})`} radius={3} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
