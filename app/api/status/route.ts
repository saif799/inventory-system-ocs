import { DeliveryOrderType } from "@/lib/dataTypes";
import { db } from "@/lib/db";
import {
  ImageNotifierTable,
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

    const statusNameToId: Record<string, string> = {};

    dbStatuses.forEach((s) => {
      statusNameToId[s.name] = s.id;
    });

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

    // todo: make sure to retrieve the orders of the status return before u update it

    const ordersToReturn = await db
      .select()
      .from(ordersTable)
      .where(inArray(ordersTable.id, groupedStatuses["retour"] || []));

    // add shoe back to inventory if it wasnt added yet
    if (ordersToReturn.length > 0) {
      await Promise.all(
        ordersToReturn
          .filter((order) => order.statusId !== statusNameToId["retour"])
          .map(async (order) => {
            await db
              .update(shoeInventory)
              .set({ quantity: sql`${shoeInventory.quantity} + 1` })
              .where(eq(shoeInventory.id, order.shoeInventoryId));

            await db.insert(ImageNotifierTable).values({
              shoeInventoryId: order.shoeInventoryId,
              orderId: order.id,
            });
          })
      );
    }

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
