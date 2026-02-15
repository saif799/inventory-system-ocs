import { DeliveryOrderType } from "@/lib/dataTypes";
import { db } from "@/lib/db";
import {
  ImageNotifierTable,
  orderItems,
  ordersTable,
  shoeInventory,
  stautsGroupsTable,
} from "@/lib/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
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
        { status: res.status },
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
        s.external_statuses.includes(order.status),
      );

      if (!originalstatus) {
        return;
      }
      if (!groupedStatuses[originalstatus.name]) {
        groupedStatuses[originalstatus.name] = [];
      }

      groupedStatuses[originalstatus.name].push(order.tracking);
    });

    // fetch the orders that need to be returned and their status wasnt changed before
    const ordersToReturn = await db
      .select({ orderId: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.id, groupedStatuses["retour"] || []),
          // makes sure we dont fetch orders where status was alreayd chnaged to retour
          ne(ordersTable.statusId, statusNameToId["retour"]),
        ),
      );

    // get all orders to retunr -> update the items(shoeinventory) that didnt get updated and dont update the items that ogt updated (their order id is alreay set to return)
    if (ordersToReturn.length > 0) {
      // adding back the quantity of the shoe in inventory + notify IF we didnt already add them back before -> update image notifier by adding the new items
      const itemsToreturn = await db
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

      console.log("selected the items");

      await Promise.all([
        itemsToreturn.map(async (item) => {
          await db
            .update(shoeInventory)
            .set({
              quantity: sql`${shoeInventory.quantity} + ${item.quantity}`,
            })
            .where(eq(shoeInventory.id, item.shoeInventoryId));
        }),
        db.insert(ImageNotifierTable).values(
          itemsToreturn.map((item) => ({
            shoeInventoryId: item.shoeInventoryId,
            orderId: item.orderId,
          })),
        ),
      ]);
    }

    console.log("updated the shoe inventory and the image notifier table");

    // changing the status of the orders in the db
    await Promise.all(
      Object.keys(groupedStatuses).map(async (externalStatus) => {
        await db
          .update(ordersTable)
          .set({ statusId: statusNameToId[externalStatus] })
          .where(inArray(ordersTable.id, groupedStatuses[externalStatus]));

        console.log("updated orders with status ", externalStatus);
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
