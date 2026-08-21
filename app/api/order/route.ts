import { db, txClient } from "@/lib/db";
import { orderItems, ordersTable, shoeModels } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { CANCELED_STATUS_ID } from "@/lib/orders/status";
import { placeOrder, type OrderDraft } from "@/lib/orders/placeOrder";
import { getProvider } from "@/lib/delivery";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const models = await db.select().from(shoeModels);
    return Response.json(models);
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const draft = (await request.json()) as OrderDraft;
    const result = await placeOrder(draft);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    revalidateStockPaths(draft.borrowerId ?? undefined);

    return Response.json({
      message: "Order created successfully",
      orderId: result.orderId,
    });
  } catch (error) {
    return Response.json(
      { error: `Failed to create order ${error}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return Response.json({ error: "order ID is required." }, { status: 400 });
    }

    const [order] = await db
      .select({
        provider: ordersTable.provider,
        borrowerId: ordersTable.borrowerId,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const provider = getProvider(order.provider);

    let deletion;
    try {
      deletion = await provider.deleteOrder(orderId);
    } catch (providerError) {
      console.log("provider failed to delete order", providerError);
      return Response.json(
        { error: `Failed to delete order: ${(providerError as Error).message}` },
        { status: 502 }
      );
    }

    if (!deletion.ok) {
      return Response.json(
        { error: "Provider failed to delete order" },
        { status: 500 }
      );
    }

    const items = await db
      .select({
        inventoryId: orderItems.shoeInventoryId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    await txClient().transaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set({ statusId: CANCELED_STATUS_ID })
        .where(eq(ordersTable.id, orderId));

      await applyMovement(
        {
          reason: "cancel",
          items,
          borrowerId: order.borrowerId ?? undefined,
          orderId,
        },
        tx,
      );
    });

    revalidateStockPaths(order.borrowerId ?? undefined);

    return Response.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log(error);
    return Response.json(
      { error: `Failed to delete order: ${error}` },
      { status: 500 }
    );
  }
}
