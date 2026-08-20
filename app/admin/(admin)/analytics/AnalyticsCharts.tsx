"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
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
import { formatCompact, formatDA } from "@/lib/format";
import type { MonthlyRow, NamedCount, ProductRow } from "@/lib/analytics";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Generic {label, value}[] horizontal bar — used for source/wilaya/products/stock. */
export type BarDatum = { label: string; value: number };

export function HorizontalBars({
  data,
  color = "var(--chart-1)",
  valueLabel = "Value",
  money = false,
}: {
  data: BarDatum[];
  color?: string;
  valueLabel?: string;
  money?: boolean;
}) {
  const config = { value: { label: valueLabel, color } } satisfies ChartConfig;
  if (data.length === 0) return <EmptyChart />;
  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 40 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={130}
          tick={{ fontSize: 12 }}
        />
        <XAxis type="number" dataKey="value" hide />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(v) => (money ? formatDA(Number(v)) : formatCompact(Number(v)))}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={4}>
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            fontSize={11}
            formatter={(v: number) => (money ? formatCompact(v) : formatCompact(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function MonthlyRevenueChart({ data }: { data: MonthlyRow[] }) {
  const config = {
    revenue: { label: "Revenue", color: "var(--chart-1)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => formatCompact(Number(v))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(v) => formatDA(Number(v))} hideLabel={false} />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function MonthlyOrdersChart({ data }: { data: MonthlyRow[] }) {
  const config = {
    orders: { label: "Delivered orders", color: "var(--chart-2)" },
    storeSales: { label: "Store sales", color: "var(--chart-3)" },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={4} />
        <Bar dataKey="storeSales" fill="var(--color-storeSales)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function StatusDonut({ data }: { data: NamedCount[] }) {
  if (data.length === 0) return <EmptyChart />;
  const chartData = data.map((d, i) => ({
    name: d.name,
    value: d.count,
    fill: PALETTE[i % PALETTE.length],
  }));
  const config: ChartConfig = {};
  chartData.forEach((d) => {
    config[d.name] = { label: d.name, color: d.fill };
  });
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[300px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} strokeWidth={3}>
          {chartData.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-1 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}

export function ProviderDonut({ data }: { data: { name: string; orders: number }[] }) {
  if (data.length === 0) return <EmptyChart />;
  const chartData = data.map((d, i) => ({
    name: d.name,
    value: d.orders,
    fill: PALETTE[i % PALETTE.length],
  }));
  const config: ChartConfig = {};
  chartData.forEach((d) => {
    config[d.name] = { label: d.name, color: d.fill };
  });
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[260px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie data={chartData} dataKey="value" nameKey="name" strokeWidth={3}>
          {chartData.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

/** Convenience adapter: ProductRow[] -> HorizontalBars. */
export function ProductBars({
  data,
  color,
  valueLabel,
}: {
  data: ProductRow[];
  color?: string;
  valueLabel?: string;
}) {
  return (
    <HorizontalBars
      data={data.map((d) => ({ label: d.label, value: d.units }))}
      color={color}
      valueLabel={valueLabel ?? "Units"}
    />
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      No data for this period.
    </div>
  );
}
