// import { TrendingUp } from "lucide-react";
// import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   ChartContainer,
//   ChartLegend,
//   ChartLegendContent,
//   ChartTooltip,
//   ChartTooltipContent,
//   type ChartConfig,
// } from "@/components/ui/chart";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { orderItems, ordersTable, storeSales } from "@/lib/schema";

export const description = "A stacked bar chart with a legend";

// const chartData = [
//   { month: "January", desktop: 186, mobile: 80 },
//   { month: "February", desktop: 305, mobile: 200 },
//   { month: "March", desktop: 237, mobile: 120 },
//   { month: "April", desktop: 73, mobile: 190 },
//   { month: "May", desktop: 209, mobile: 130 },
//   { month: "June", desktop: 214, mobile: 140 },
// ];

// const chartConfig = {
//   desktop: {
//     label: "Desktop",
//     color: "var(--chart-1)",
//   },
//   mobile: {
//     label: "Mobile",
//     color: "var(--chart-2)",
//   },
// } satisfies ChartConfig;


// IMportant: complete this

async function getChartData(year: number = 2026) {
  const result = await db.execute(sql`
    WITH orders_by_month AS (
      SELECT 
        TO_CHAR(o.created_at, 'Month') as month,
        EXTRACT(MONTH FROM o.created_at) as month_num,
        COUNT(oi.id) as orders
      FROM ${ordersTable} o
      JOIN ${orderItems} oi ON oi.order_id = o.id
      WHERE o.status_id = '830826fd-80f5-4a29-829b-6421264c7695'
        AND EXTRACT(YEAR FROM o.created_at) = ${year}
      GROUP BY TO_CHAR(o.created_at, 'Month'), EXTRACT(MONTH FROM o.created_at)
    ),
    sales_by_month AS (
      SELECT 
        TO_CHAR(created_at, 'Month') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as store_sale
      FROM ${storeSales}
      WHERE EXTRACT(YEAR FROM created_at) = ${year}
      GROUP BY TO_CHAR(created_at, 'Month'), EXTRACT(MONTH FROM created_at)
    )
    SELECT 
      COALESCE(o.month, s.month) as month,
      COALESCE(o.month_num, s.month_num) as month_num,
      COALESCE(o.orders, 0) as orders,
      COALESCE(s.store_sale, 0) as "storeSale"
    FROM orders_by_month o
    FULL OUTER JOIN sales_by_month s ON o.month_num = s.month_num
    ORDER BY month_num
  `);

  const chartData = result.rows.map((row: any) => ({
    month: row.month.trim(),
    orders: parseInt(row.orders),
    storeSale: parseInt(row.storeSale),
  }));

  return chartData;
}

export default async function ChartBarStacked() {
  const t = await getChartData();
  console.log(t);

  return (
    <div></div>
    // <Card>
    //   <CardHeader>
    //     <CardTitle>Bar Chart - Stacked + Legend</CardTitle>
    //     <CardDescription>January - June 2024</CardDescription>
    //   </CardHeader>
    //   <CardContent>
    //     <ChartContainer config={chartConfig}>
    //       <BarChart accessibilityLayer data={chartData}>
    //         <CartesianGrid vertical={false} />
    //         <XAxis
    //           dataKey="month"
    //           tickLine={false}
    //           tickMargin={10}
    //           axisLine={false}
    //           tickFormatter={(value) => value.slice(0, 3)}
    //         />
    //         <ChartTooltip content={<ChartTooltipContent hideLabel />} />
    //         <ChartLegend content={<ChartLegendContent />} />
    //         <Bar
    //           dataKey="desktop"
    //           stackId="a"
    //           fill="var(--color-desktop)"
    //           radius={[0, 0, 4, 4]}
    //         />
    //         <Bar
    //           dataKey="mobile"
    //           stackId="a"
    //           fill="var(--color-mobile)"
    //           radius={[4, 4, 0, 0]}
    //         />
    //       </BarChart>
    //     </ChartContainer>
    //   </CardContent>
    //   <CardFooter className="flex-col items-start gap-2 text-sm">
    //     <div className="flex gap-2 leading-none font-medium">
    //       Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
    //     </div>
    //     <div className="text-muted-foreground leading-none">
    //       Showing total visitors for the last 6 months
    //     </div>
    //   </CardFooter>
    // </Card>
  );
}
