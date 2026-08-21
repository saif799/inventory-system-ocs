import { db, txClient } from "@/lib/db";
import { ordersTable, orderItems } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { getAllStatusGroups, buildNameToIdMap } from "@/lib/orders/status";
import { DELIVERY_PROVIDERS } from "@/lib/delivery";
import { and, eq, inArray, ne } from "drizzle-orm";

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

    const dbStatuses = await getAllStatusGroups();
    const statusNameToId = buildNameToIdMap(dbStatuses);

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
      const itemsToReturn = await db
        .select({
          shoeInventoryId: orderItems.shoeInventoryId,
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            ordersToReturn.map((o) => o.orderId),
          ),
        );

      await txClient().transaction(async (tx) => {
        for (const order of ordersToReturn) {
          const items = itemsToReturn
            .filter((it) => it.orderId === order.orderId)
            .map((it) => ({ inventoryId: it.shoeInventoryId, quantity: it.quantity }));

          if (items.length === 0) continue;

          await applyMovement(
            {
              reason: "retour",
              items,
              borrowerId: order.borrowerId ?? undefined,
              orderId: order.orderId,
            },
            tx,
          );
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

    revalidateStockPaths();

    return Response.json({ groupedStatuses }, { status: 200 });
  } catch (error) {
    console.log("failed with this error ", error);
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
