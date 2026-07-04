import { db, txClient } from "@/lib/db";
import {
  LendedShoes,
  orderItems,
  ordersTable,
  shoeInventory,
  stautsGroupsTable,
} from "@/lib/schema";
import { flagNotifier } from "@/lib/notifier";
import { DELIVERY_PROVIDERS } from "@/lib/delivery";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    // Group our order ids by provider so each provider syncs only its own
    // parcels (Yalidine filters its histories query by these; DHD ignores them).
    const orderProviders = await db
      .select({ id: ordersTable.id, provider: ordersTable.provider })
      .from(ordersTable);

    const trackingsByProvider: Record<string, string[]> = {};
    for (const o of orderProviders) {
      (trackingsByProvider[o.provider ?? "dhd"] ??= []).push(o.id);
    }

    // Pull parcels + statuses from every provider. A provider failing (or having
    // no orders) must not break the whole sync.
    const providerStatuses = (
      await Promise.all(
        DELIVERY_PROVIDERS.map((p) =>
          p.fetchStatuses(trackingsByProvider[p.name] ?? []).catch((e) => {
            console.log(`${p.name} status sync failed`, e);
            return [];
          }),
        ),
      )
    ).flat();

    // get all statuses from the db and map their names to ids
    const dbStatuses = await db.select().from(stautsGroupsTable);

    const statusNameToId: Record<string, string> = {};
    dbStatuses.forEach((s) => {
      statusNameToId[s.name] = s.id;
    });

    // group the (provider) parcels by our internal status name
    const groupedStatuses: Record<string, Array<string>> = {};

    providerStatuses.forEach((order) => {
      const originalstatus = dbStatuses.find((s) =>
        s.external_statuses.includes(order.status),
      );
      if (!originalstatus) return;
      if (!groupedStatuses[originalstatus.name]) {
        groupedStatuses[originalstatus.name] = [];
      }
      groupedStatuses[originalstatus.name].push(order.tracking);
    });

    // Only orders we created (id exists) AND whose status wasn't already set to
    // retour. Manually-added dashboard parcels never match a row here.
    const ordersToReturn = await db
      .select({ orderId: ordersTable.id, borrowerId: ordersTable.borrowerId })
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.id, groupedStatuses["retour"] || []),
          ne(ordersTable.statusId, statusNameToId["retour"]),
        ),
      );

    if (ordersToReturn.length > 0) {
      const borrowerByOrder = new Map(
        ordersToReturn.map((o) => [o.orderId, o.borrowerId] as const),
      );

      const itemsToreturn = await db
        .select({
          shoeInventoryId: orderItems.shoeInventoryId,
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
          // current stock BEFORE we add the returned units back
          prevQuantity: shoeInventory.quantity,
        })
        .from(orderItems)
        .innerJoin(
          shoeInventory,
          eq(orderItems.shoeInventoryId, shoeInventory.id),
        )
        .where(
          inArray(
            orderItems.orderId,
            ordersToReturn.map((o) => o.orderId),
          ),
        );

      await txClient().transaction(async (tx) => {
        for (const item of itemsToreturn) {
          await tx
            .update(shoeInventory)
            .set({
              quantity: sql`${shoeInventory.quantity} + ${item.quantity}`,
            })
            .where(eq(shoeInventory.id, item.shoeInventoryId));

          // If the returned order was placed by a borrower, hand the units back
          // to that borrower's held stock too.
          const borrowerId = borrowerByOrder.get(item.orderId);
          if (borrowerId) {
            await tx.insert(LendedShoes).values({
              borrowerId,
              shoeInventoryId: item.shoeInventoryId,
              quantity: item.quantity,
            });
          }

          // gallery add-back only for variants that were out of stock before
          if (item.prevQuantity === 0) {
            await flagNotifier(
              item.shoeInventoryId,
              "restock",
              item.orderId,
              tx,
            );
          }
        }
      });
    }

    // changing the status of the orders in the db (only rows whose id matches)
    await Promise.all(
      Object.keys(groupedStatuses).map(async (externalStatus) => {
        await db
          .update(ordersTable)
          .set({ statusId: statusNameToId[externalStatus] })
          .where(inArray(ordersTable.id, groupedStatuses[externalStatus]));
      }),
    );

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/add-shoes");

    return Response.json({ groupedStatuses }, { status: 200 });
  } catch (error) {
    console.log("failed with this error ", error);
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
