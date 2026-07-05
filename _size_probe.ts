import dotenv from "dotenv";
dotenv.config();
import { db } from "./lib/db";
import { sql } from "drizzle-orm";

const DELIVERED = "830826fd-80f5-4a29-829b-6421264c7695";
const IDS = "'8694f9bd-4c88-474a-91bb-a44741c8ab3a','ba6cbff9-ef8d-454b-a17b-28f25a7f40f6'";

async function main() {
  const sold = await db.execute(sql.raw(`
    WITH sold AS (
      SELECT oi.shoe_inventory_id AS inv FROM order_items oi
        JOIN orders o ON o.id = oi.order_id WHERE o.status_id = '${DELIVERED}'
      UNION ALL SELECT shoe_inventory_id AS inv FROM store_sales
    )
    SELECT m.model_name AS model, si.size AS size, COUNT(*)::int AS sold
    FROM sold JOIN shoe_inventory si ON si.id = sold.inv
    JOIN shoes sh ON sh.id=si.shoe_id JOIN shoe_models m ON m.id=sh.model_id
    WHERE m.id::text IN (${IDS})
    GROUP BY m.model_name, si.size ORDER BY m.model_name, si.size::int
  `));
  console.log("=== SOLD by (model,size) ===");
  console.log(sold.rows);

  const stock = await db.execute(sql.raw(`
    SELECT m.model_name AS model, si.size AS size, SUM(si.quantity)::int AS stock
    FROM shoe_inventory si JOIN shoes sh ON sh.id=si.shoe_id JOIN shoe_models m ON m.id=sh.model_id
    WHERE m.id::text IN (${IDS})
    GROUP BY m.model_name, si.size ORDER BY m.model_name, si.size::int
  `));
  console.log("\n=== CURRENT STOCK by (model,size) [inventory row = ever offered] ===");
  console.log(stock.rows);
}

main().catch((e) => { console.error(e); process.exit(1); });
