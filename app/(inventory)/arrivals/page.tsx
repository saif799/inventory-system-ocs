import { db } from "@/lib/db";
import { arrivalItems, arrivals } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ArrivalsList } from "./ArrivalsList";

export default async function ArrivalsPage() {
  const rows = await db
    .select({
      id: arrivals.id,
      reference: arrivals.reference,
      note: arrivals.note,
      createdAt: arrivals.createdAt,
      variantCount: sql<number>`count(${arrivalItems.id})`.mapWith(Number),
      totalPairs:
        sql<number>`coalesce(sum(${arrivalItems.quantity}), 0)`.mapWith(Number),
    })
    .from(arrivals)
    .leftJoin(arrivalItems, eq(arrivalItems.arrivalId, arrivals.id))
    .groupBy(arrivals.id)
    .orderBy(desc(arrivals.createdAt));

  return (
    <div className="container mx-auto py-5">
      <h1 className="mb-4 text-2xl font-semibold">Arrivages</h1>
      <ArrivalsList arrivals={rows} />
    </div>
  );
}
