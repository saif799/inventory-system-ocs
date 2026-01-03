import { db } from "@/lib/db";
import { columnsOrder } from "./columns";
import { DataTable } from "./data-table";
import { ordersTable, stautsGroupsTable } from "@/lib/schema";
import { desc } from "drizzle-orm";

export default async function DemoPage() {
  const dbStatus = await db.select().from(stautsGroupsTable);
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt));

  return (
    <div className="container mx-auto py-5">
      <DataTable columns={columnsOrder} data={orders} Statuses={dbStatus} />
    </div>
  );
}
