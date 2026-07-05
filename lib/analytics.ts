/**
 * Analytics aggregates for the /analytics page. Every function is a read-only
 * Drizzle query. Revenue = SUM(montant) of DELIVERED orders only (there is no
 * product price stored anywhere, and store sales carry no amount — so store
 * sales are counted as units). Money is "COD collected".
 */
import { db } from "@/lib/db";
import {
  orderItems,
  ordersTable,
  shoeInventory,
  shoeModels,
  shoes,
  stautsGroupsTable,
  storeSales,
} from "@/lib/schema";
import { sql } from "drizzle-orm";
import wilayas from "@/wilayas.json";
import { CHART_PALETTE } from "@/lib/format";

// Status group ids (from status_groups_table; see lib/helpers.ts).
export const DELIVERED_STATUS_ID = "830826fd-80f5-4a29-829b-6421264c7695"; // "Livre"
export const RETURNED_STATUS_ID = "e4983321-f0c7-452d-8b36-68d42dfb7be4"; // "retour"
export const CANCELED_STATUS_ID = "e01a36c1-087c-46ab-aa4c-12b1a5186bf1"; // "Cancel"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Order `source` code -> label (mirrors AvailableSources in sendShoeOrder.tsx).
const SOURCE_LABELS: Record<string, string> = {
  i: "Instagram",
  f: "Facebook",
  t: "TikTok",
  w: "WhatsApp",
  k: "Ignore",
  m: "Mossab",
};

const WILAYA_NAMES: Record<string, string> = Object.fromEntries(
  (wilayas as { wilaya_id: number; wilaya_name: string }[]).map((w) => [
    String(w.wilaya_id),
    w.wilaya_name,
  ]),
);

const n = (v: unknown) => Number(v ?? 0);

// Reusable SQL fragment: numeric value of the (varchar) montant column.
const MONTANT = sql`CAST(NULLIF(${ordersTable.montant}, '') AS NUMERIC)`;

export type Kpis = {
  revenue: number;
  deliveredOrders: number;
  totalOrders: number;
  returnedOrders: number;
  successRate: number; // 0..1
  storeSaleUnits: number;
  unitsSold: number;
  stockUnits: number;
  outOfStockVariants: number;
  totalVariants: number;
};

export type MonthlyRow = {
  month: string;
  orders: number;
  revenue: number;
  storeSales: number;
};

export type NamedCount = { name: string; count: number };
export type SourceRow = { label: string; orders: number; revenue: number };
export type WilayaRow = { name: string; orders: number; revenue: number };
export type ProviderRow = { name: string; orders: number };
export type ProductRow = { label: string; units: number };

export type AnalyticsData = {
  year: number;
  years: number[];
  kpis: Kpis;
  monthly: MonthlyRow[];
  status: {
    breakdown: NamedCount[];
    delivered: number;
    returned: number;
    exchanges: number;
    total: number;
    successRate: number;
  };
  bySource: SourceRow[];
  byWilaya: WilayaRow[];
  byProvider: ProviderRow[];
  topModels: ProductRow[];
  topColors: ProductRow[];
  stockByModel: ProductRow[];
};

async function getAvailableYears(): Promise<number[]> {
  const res = await db.execute(sql`
    SELECT DISTINCT EXTRACT(YEAR FROM ${ordersTable.createdAt})::int AS y
    FROM ${ordersTable}
    ORDER BY y DESC
  `);
  const years = res.rows.map((r) => n((r as { y: unknown }).y));
  return years.length ? years : [new Date().getFullYear()];
}

async function getKpis(): Promise<Kpis> {
  const [orders, deliveredUnits, stock, storeUnits] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID})::int AS delivered,
        COUNT(*) FILTER (WHERE ${ordersTable.statusId} = ${RETURNED_STATUS_ID})::int AS returned,
        COALESCE(SUM(${MONTANT}) FILTER (WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}), 0)::float8 AS revenue
      FROM ${ordersTable}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(${orderItems.quantity}), 0)::int AS units
      FROM ${orderItems}
      JOIN ${ordersTable} ON ${ordersTable.id} = ${orderItems.orderId}
      WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}
    `),
    db.execute(sql`
      SELECT
        COALESCE(SUM(${shoeInventory.quantity}), 0)::int AS stock_units,
        COUNT(*)::int AS total_variants,
        COUNT(*) FILTER (WHERE ${shoeInventory.quantity} = 0)::int AS out_of_stock
      FROM ${shoeInventory}
    `),
    db.execute(sql`SELECT COUNT(*)::int AS units FROM ${storeSales}`),
  ]);

  const o = orders.rows[0] as Record<string, unknown>;
  const delivered = n(o.delivered);
  const returned = n(o.returned);
  const storeSaleUnits = n((storeUnits.rows[0] as { units: unknown }).units);
  const deliveredUnitCount = n((deliveredUnits.rows[0] as { units: unknown }).units);
  const s = stock.rows[0] as Record<string, unknown>;

  return {
    revenue: n(o.revenue),
    deliveredOrders: delivered,
    totalOrders: n(o.total_orders),
    returnedOrders: returned,
    successRate: delivered + returned > 0 ? delivered / (delivered + returned) : 0,
    storeSaleUnits,
    unitsSold: deliveredUnitCount + storeSaleUnits,
    stockUnits: n(s.stock_units),
    outOfStockVariants: n(s.out_of_stock),
    totalVariants: n(s.total_variants),
  };
}

async function getMonthlyTrends(year: number): Promise<MonthlyRow[]> {
  const res = await db.execute(sql`
    WITH months AS (SELECT gs AS m FROM generate_series(1, 12) gs),
    o AS (
      SELECT EXTRACT(MONTH FROM ${ordersTable.createdAt})::int AS m,
             COUNT(*)::int AS orders,
             COALESCE(SUM(${MONTANT}), 0)::float8 AS revenue
      FROM ${ordersTable}
      WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}
        AND EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
      GROUP BY 1
    ),
    s AS (
      SELECT EXTRACT(MONTH FROM ${storeSales.createdAt})::int AS m, COUNT(*)::int AS store_sales
      FROM ${storeSales}
      WHERE EXTRACT(YEAR FROM ${storeSales.createdAt}) = ${year}
      GROUP BY 1
    )
    SELECT months.m AS m,
           COALESCE(o.orders, 0)::int AS orders,
           COALESCE(o.revenue, 0)::float8 AS revenue,
           COALESCE(s.store_sales, 0)::int AS store_sales
    FROM months
    LEFT JOIN o ON o.m = months.m
    LEFT JOIN s ON s.m = months.m
    ORDER BY months.m
  `);

  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      month: MONTHS[n(row.m) - 1] ?? String(row.m),
      orders: n(row.orders),
      revenue: n(row.revenue),
      storeSales: n(row.store_sales),
    };
  });
}

async function getStatusBreakdown(year: number) {
  const [breakdown, totals] = await Promise.all([
    db.execute(sql`
      SELECT ${stautsGroupsTable.name} AS name, COUNT(${ordersTable.id})::int AS count
      FROM ${ordersTable}
      JOIN ${stautsGroupsTable} ON ${stautsGroupsTable.id} = ${ordersTable.statusId}
      WHERE EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
      GROUP BY ${stautsGroupsTable.name}
      ORDER BY count DESC
    `),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID})::int AS delivered,
        COUNT(*) FILTER (WHERE ${ordersTable.statusId} = ${RETURNED_STATUS_ID})::int AS returned,
        COUNT(*) FILTER (WHERE ${ordersTable.type} = 2)::int AS exchanges
      FROM ${ordersTable}
      WHERE EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
    `),
  ]);

  const t = totals.rows[0] as Record<string, unknown>;
  const delivered = n(t.delivered);
  const returned = n(t.returned);

  return {
    breakdown: breakdown.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { name: String(row.name), count: n(row.count) };
    }),
    delivered,
    returned,
    exchanges: n(t.exchanges),
    total: n(t.total),
    successRate: delivered + returned > 0 ? delivered / (delivered + returned) : 0,
  };
}

async function getBySource(year: number): Promise<SourceRow[]> {
  const res = await db.execute(sql`
    SELECT ${ordersTable.source} AS source,
           COUNT(*)::int AS orders,
           COALESCE(SUM(${MONTANT}) FILTER (WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}), 0)::float8 AS revenue
    FROM ${ordersTable}
    WHERE EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
    GROUP BY ${ordersTable.source}
    ORDER BY orders DESC
  `);
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const code = String(row.source ?? "");
    return {
      label: SOURCE_LABELS[code] ?? (code || "Unknown"),
      orders: n(row.orders),
      revenue: n(row.revenue),
    };
  });
}

async function getByWilaya(year: number): Promise<WilayaRow[]> {
  const res = await db.execute(sql`
    SELECT ${ordersTable.code_wilaya} AS code,
           COUNT(*)::int AS orders,
           COALESCE(SUM(${MONTANT}) FILTER (WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}), 0)::float8 AS revenue
    FROM ${ordersTable}
    WHERE EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
    GROUP BY ${ordersTable.code_wilaya}
    ORDER BY orders DESC
    LIMIT 10
  `);
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const code = String(row.code ?? "");
    return {
      name: WILAYA_NAMES[code] ? `${code} · ${WILAYA_NAMES[code]}` : code || "?",
      orders: n(row.orders),
      revenue: n(row.revenue),
    };
  });
}

async function getByProvider(year: number): Promise<ProviderRow[]> {
  const res = await db.execute(sql`
    SELECT ${ordersTable.provider} AS provider, COUNT(*)::int AS orders
    FROM ${ordersTable}
    WHERE EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
    GROUP BY ${ordersTable.provider}
    ORDER BY orders DESC
  `);
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const p = String(row.provider ?? "dhd");
    return { name: p === "yalidine" ? "Yalidine" : "DHD", orders: n(row.orders) };
  });
}

/** Units sold (delivered order items + store sales) grouped by a product column. */
async function getTopSold(
  year: number,
  by: "model" | "color",
): Promise<ProductRow[]> {
  const groupCol = by === "model" ? shoeModels.modelName : shoes.color;
  const res = await db.execute(sql`
    WITH sold AS (
      SELECT ${orderItems.shoeInventoryId} AS inv_id, ${orderItems.quantity}::int AS qty
      FROM ${orderItems}
      JOIN ${ordersTable} ON ${ordersTable.id} = ${orderItems.orderId}
      WHERE ${ordersTable.statusId} = ${DELIVERED_STATUS_ID}
        AND EXTRACT(YEAR FROM ${ordersTable.createdAt}) = ${year}
      UNION ALL
      SELECT ${storeSales.shoeInventoryId} AS inv_id, 1 AS qty
      FROM ${storeSales}
      WHERE EXTRACT(YEAR FROM ${storeSales.createdAt}) = ${year}
    )
    SELECT ${groupCol} AS label, SUM(sold.qty)::int AS units
    FROM sold
    JOIN ${shoeInventory} ON ${shoeInventory.id} = sold.inv_id
    JOIN ${shoes} ON ${shoes.id} = ${shoeInventory.shoeId}
    JOIN ${shoeModels} ON ${shoeModels.id} = ${shoes.modelId}
    GROUP BY ${groupCol}
    ORDER BY units DESC
    LIMIT 10
  `);
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return { label: String(row.label ?? "?"), units: n(row.units) };
  });
}

async function getStockByModel(): Promise<ProductRow[]> {
  const res = await db.execute(sql`
    SELECT ${shoeModels.modelName} AS label, SUM(${shoeInventory.quantity})::int AS units
    FROM ${shoeInventory}
    JOIN ${shoes} ON ${shoes.id} = ${shoeInventory.shoeId}
    JOIN ${shoeModels} ON ${shoeModels.id} = ${shoes.modelId}
    GROUP BY ${shoeModels.modelName}
    ORDER BY units DESC
    LIMIT 10
  `);
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>;
    return { label: String(row.label ?? "?"), units: n(row.units) };
  });
}

/** Loads everything the /analytics page needs for the given year. */
export async function getAnalyticsData(requestedYear?: number): Promise<AnalyticsData> {
  const years = await getAvailableYears();
  const year =
    requestedYear && years.includes(requestedYear) ? requestedYear : years[0];

  const [kpis, monthly, status, bySource, byWilaya, byProvider, topModels, topColors, stockByModel] =
    await Promise.all([
      getKpis(),
      getMonthlyTrends(year),
      getStatusBreakdown(year),
      getBySource(year),
      getByWilaya(year),
      getByProvider(year),
      getTopSold(year, "model"),
      getTopSold(year, "color"),
      getStockByModel(),
    ]);

  return {
    year,
    years,
    kpis,
    monthly,
    status,
    bySource,
    byWilaya,
    byProvider,
    topModels,
    topColors,
    stockByModel,
  };
}

// ---------------------------------------------------------------------------
// Model comparison (/analytics/compare)
// ---------------------------------------------------------------------------

export type BucketUnit = "day" | "week" | "month";

export type ComparedModel = { id: string; name: string; color: string };

export type ModelTotals = {
  modelId: string;
  modelName: string;
  unitsSold: number; // delivered order items + store sales in range
  deliveredOrders: number;
  returnedUnits: number;
  returnRate: number; // 0..1 (returned / (delivered units + returned units))
  revenueApprox: number; // montant split proportionally across an order's items
  currentStock: number; // snapshot, not range-bound
};

// Wide rows for the charts: { bucket|size, [modelId]: units, ... }
export type WideRow = { key: string } & Record<string, number | string>;

export type ModelComparison = {
  models: ComparedModel[];
  bucketUnit: BucketUnit;
  timeSeries: WideRow[]; // key = bucket label
  sizeDemand: WideRow[]; // key = size
  totals: ModelTotals[];
};

function pickBucketUnit(from: Date, to: Date): BucketUnit {
  const days = Math.max(1, (to.getTime() - from.getTime()) / 86_400_000);
  if (days <= 45) return "day";
  if (days <= 210) return "week";
  return "month";
}

function bucketLabel(iso: string, unit: BucketUnit): string {
  const d = new Date(iso);
  if (unit === "month") {
    return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
  }
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

/**
 * Compares the given models over [from, to]. `to` is treated as inclusive of the
 * whole day. Returns chart-ready wide rows plus a per-model totals table.
 */
export async function getModelComparison(params: {
  modelIds: string[];
  from: Date;
  to: Date;
}): Promise<ModelComparison> {
  const modelIds = Array.from(new Set(params.modelIds));
  const unit = pickBucketUnit(params.from, params.to);

  if (modelIds.length === 0) {
    return { models: [], bucketUnit: unit, timeSeries: [], sizeDemand: [], totals: [] };
  }

  const fromISO = params.from.toISOString();
  // Make `to` inclusive of its whole day.
  const toExclusive = new Date(params.to.getTime() + 86_400_000).toISOString();
  const idList = sql.join(
    modelIds.map((id) => sql`${id}`),
    sql`, `,
  );

  // Units sold in range = delivered order items + store sales, tagged with size.
  const soldUnion = sql`(
    SELECT o.created_at::timestamptz AS dt, si.size AS size, m.id AS model_id, oi.quantity::int AS qty
    FROM ${ordersTable} o
    JOIN ${orderItems} oi ON oi.order_id = o.id
    JOIN ${shoeInventory} si ON si.id = oi.shoe_inventory_id
    JOIN ${shoes} sh ON sh.id = si.shoe_id
    JOIN ${shoeModels} m ON m.id = sh.model_id
    WHERE o.status_id = ${DELIVERED_STATUS_ID}
      AND o.created_at >= ${fromISO} AND o.created_at < ${toExclusive}
      AND m.id::text IN (${idList})
    UNION ALL
    SELECT ss.created_at::timestamptz AS dt, si.size AS size, m.id AS model_id, 1 AS qty
    FROM ${storeSales} ss
    JOIN ${shoeInventory} si ON si.id = ss.shoe_inventory_id
    JOIN ${shoes} sh ON sh.id = si.shoe_id
    JOIN ${shoeModels} m ON m.id = sh.model_id
    WHERE ss.created_at >= ${fromISO} AND ss.created_at < ${toExclusive}
      AND m.id::text IN (${idList})
  ) AS sold`;

  const [tsRes, sizeRes, orderStatsRes, revenueRes, stockRes, nameRes] =
    await Promise.all([
      db.execute(sql`
        SELECT date_trunc(${unit}, sold.dt) AS bucket, sold.model_id AS model_id, SUM(sold.qty)::int AS units
        FROM ${soldUnion}
        GROUP BY 1, 2
        ORDER BY 1
      `),
      db.execute(sql`
        SELECT sold.size AS size, sold.model_id AS model_id, SUM(sold.qty)::int AS units
        FROM ${soldUnion}
        GROUP BY 1, 2
      `),
      db.execute(sql`
        SELECT m.id AS model_id,
          COUNT(oi.id) FILTER (WHERE o.status_id = ${DELIVERED_STATUS_ID})::int AS delivered_units,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status_id = ${DELIVERED_STATUS_ID})::int AS delivered_orders,
          COUNT(oi.id) FILTER (WHERE o.status_id = ${RETURNED_STATUS_ID})::int AS returned_units
        FROM ${ordersTable} o
        JOIN ${orderItems} oi ON oi.order_id = o.id
        JOIN ${shoeInventory} si ON si.id = oi.shoe_inventory_id
        JOIN ${shoes} sh ON sh.id = si.shoe_id
        JOIN ${shoeModels} m ON m.id = sh.model_id
        WHERE o.status_id IN (${DELIVERED_STATUS_ID}, ${RETURNED_STATUS_ID})
          AND o.created_at >= ${fromISO} AND o.created_at < ${toExclusive}
          AND m.id::text IN (${idList})
        GROUP BY m.id
      `),
      db.execute(sql`
        WITH ot AS (
          SELECT order_id, COUNT(*)::numeric AS total_items FROM ${orderItems} GROUP BY order_id
        ),
        mi AS (
          SELECT oi.order_id AS order_id, m.id AS model_id, COUNT(*)::numeric AS model_items
          FROM ${orderItems} oi
          JOIN ${shoeInventory} si ON si.id = oi.shoe_inventory_id
          JOIN ${shoes} sh ON sh.id = si.shoe_id
          JOIN ${shoeModels} m ON m.id = sh.model_id
          WHERE m.id::text IN (${idList})
          GROUP BY oi.order_id, m.id
        )
        SELECT mi.model_id AS model_id,
          COALESCE(SUM(CAST(NULLIF(o.montant, '') AS NUMERIC) * mi.model_items / ot.total_items), 0)::float8 AS revenue
        FROM mi
        JOIN ot ON ot.order_id = mi.order_id
        JOIN ${ordersTable} o ON o.id = mi.order_id
        WHERE o.status_id = ${DELIVERED_STATUS_ID}
          AND o.created_at >= ${fromISO} AND o.created_at < ${toExclusive}
        GROUP BY mi.model_id
      `),
      db.execute(sql`
        SELECT m.id AS model_id, COALESCE(SUM(si.quantity), 0)::int AS stock
        FROM ${shoeInventory} si
        JOIN ${shoes} sh ON sh.id = si.shoe_id
        JOIN ${shoeModels} m ON m.id = sh.model_id
        WHERE m.id::text IN (${idList})
        GROUP BY m.id
      `),
      db.execute(sql`
        SELECT id AS model_id, model_name FROM ${shoeModels} WHERE id::text IN (${idList})
      `),
    ]);

  const nameById = new Map<string, string>();
  for (const r of nameRes.rows) {
    const row = r as Record<string, unknown>;
    nameById.set(String(row.model_id), String(row.model_name));
  }

  // Preserve the caller's model order; assign a stable palette color per model.
  const models: ComparedModel[] = modelIds.map((id, i) => ({
    id,
    name: nameById.get(id) ?? "Unknown model",
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));

  // --- time series (pivot long -> wide, fill missing model -> 0) ---
  const bucketOrder: string[] = [];
  const seenBucket = new Set<string>();
  const unitsByBucket = new Map<string, Record<string, number>>();
  const unitsTotal = new Map<string, number>();
  for (const r of tsRes.rows) {
    const row = r as Record<string, unknown>;
    const bucket = String(row.bucket);
    const modelId = String(row.model_id);
    const units = n(row.units);
    if (!seenBucket.has(bucket)) {
      seenBucket.add(bucket);
      bucketOrder.push(bucket);
    }
    const bucketRow = unitsByBucket.get(bucket) ?? {};
    bucketRow[modelId] = units;
    unitsByBucket.set(bucket, bucketRow);
    unitsTotal.set(modelId, (unitsTotal.get(modelId) ?? 0) + units);
  }
  const timeSeries: WideRow[] = bucketOrder.map((b) => {
    const row: WideRow = { key: bucketLabel(b, unit) };
    for (const m of models) row[m.id] = unitsByBucket.get(b)?.[m.id] ?? 0;
    return row;
  });

  // --- size demand (pivot long -> wide, sizes sorted numerically) ---
  const sizeByModel = new Map<string, Record<string, number>>();
  for (const r of sizeRes.rows) {
    const row = r as Record<string, unknown>;
    const size = String(row.size);
    const rec = sizeByModel.get(size) ?? {};
    rec[String(row.model_id)] = n(row.units);
    sizeByModel.set(size, rec);
  }
  const sizeDemand: WideRow[] = Array.from(sizeByModel.keys())
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
    .map((size) => {
      const row: WideRow = { key: size };
      for (const m of models) row[m.id] = sizeByModel.get(size)?.[m.id] ?? 0;
      return row;
    });

  // --- totals ---
  const statsById = new Map<string, Record<string, unknown>>();
  for (const r of orderStatsRes.rows) {
    const row = r as Record<string, unknown>;
    statsById.set(String(row.model_id), row);
  }
  const revenueById = new Map<string, number>();
  for (const r of revenueRes.rows) {
    const row = r as Record<string, unknown>;
    revenueById.set(String(row.model_id), n(row.revenue));
  }
  const stockById = new Map<string, number>();
  for (const r of stockRes.rows) {
    const row = r as Record<string, unknown>;
    stockById.set(String(row.model_id), n(row.stock));
  }

  const totals: ModelTotals[] = models.map((m) => {
    const s = statsById.get(m.id) ?? {};
    const deliveredUnits = n(s.delivered_units);
    const returnedUnits = n(s.returned_units);
    return {
      modelId: m.id,
      modelName: m.name,
      unitsSold: unitsTotal.get(m.id) ?? 0,
      deliveredOrders: n(s.delivered_orders),
      returnedUnits,
      returnRate:
        deliveredUnits + returnedUnits > 0
          ? returnedUnits / (deliveredUnits + returnedUnits)
          : 0,
      revenueApprox: revenueById.get(m.id) ?? 0,
      currentStock: stockById.get(m.id) ?? 0,
    };
  });

  return { models, bucketUnit: unit, timeSeries, sizeDemand, totals };
}

