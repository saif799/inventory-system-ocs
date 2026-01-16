import { DeliveryOrderType } from "@/lib/dataTypes";
import { db } from "@/lib/db";
import {
  ImageNotifierTable,
  orderItems,
  ordersTable,
  shoeInventory,
  stautsGroupsTable,
} from "@/lib/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// fetch the data from dhd(handle all posssible states) +> update the status in the orders table -> edit what needs to be edited from adding a shoe if the sate is retour ->notify me to add teh pic back if its a reour

// suspendu, TODO make sure to handle thi state

export async function GET() {
  try {
    const res = await fetch(`https://platform.dhd-dz.com/api/v1/get/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.NEXT_PUBLIC_DHD_API_KEY}`,
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch orders from DHD" },
        { status: res.status }
      );
    }

    const data: { data: Array<DeliveryOrderType> } = await res.json();

    // get all statuses from the db and map their names to ids
    const dbStatuses = await db.select().from(stautsGroupsTable);

    // mapping all the status names to their ids for easy access
    const statusNameToId: Record<string, string> = {};

    dbStatuses.forEach((s) => {
      statusNameToId[s.name] = s.id;
    });

    // grouping the orders by their status (retour : [...], livre:[])
    const groupedStatuses: Record<string, Array<string>> = {};

    data.data.map((order) => {
      const originalstatus = dbStatuses.find((s) =>
        s.external_statuses.includes(order.status)
      );

      if (!originalstatus) {
        return;
      }
      if (!groupedStatuses[originalstatus.name]) {
        groupedStatuses[originalstatus.name] = [];
      }

      groupedStatuses[originalstatus.name].push(order.tracking);
    });

    const ordersToReturn = await db
      .select()
      .from(ordersTable)
      .where(inArray(ordersTable.id, groupedStatuses["retour"] || []));
    if (ordersToReturn.length > 0) {
      // adding back the quantity of the shoe in inventory + notify IF we didnt already add them back before (check using the filter on the items to return)
      const itemsToreturn = db
        .select({
          shoeInventoryId: orderItems.shoeInventoryId,
          orderId: orderItems.orderId,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, groupedStatuses["retour"] || []));

      await Promise.all(
        ordersToReturn
          // this makes sure we dont repeat the addition of quantity and notifier if we already did it before
          .filter((order) => order.statusId !== statusNameToId["retour"])
          .map(async (order) => {
            await db
              .update(shoeInventory)
              .set({ quantity: sql`${shoeInventory.quantity} + 1` })
              .where(inArray(shoeInventory.id, itemsToreturn));
            // currently this is notifying for everything while it should be notifying only for the items that had previous quantity 0 and now have more than 0
            await db.execute(sql`
  INSERT INTO ${ImageNotifierTable} (shoe_inventory_id, order_id)
  SELECT shoe_inventory_id, order_id
  FROM ${orderItems}
  WHERE order_id = ${order.id}
`);
          })
      );
    }

    // changing the status of the orders in the db
    await Promise.all(
      Object.keys(groupedStatuses).map(async (externalStatus) => {
        await db
          .update(ordersTable)
          .set({ statusId: statusNameToId[externalStatus] })
          .where(inArray(ordersTable.id, groupedStatuses[externalStatus]));

        console.log("updated orders with status ", externalStatus);
      })
    );

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/add-shoes");

    return Response.json({ groupedStatuses }, { status: 200 });
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
