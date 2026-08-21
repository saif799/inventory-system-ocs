import { db, txClient } from "@/lib/db";
import { LendedShoes, orderItems, ordersTable, shoeModels } from "@/lib/schema";
import { applyMovement } from "@/lib/stock/movement";
import { revalidateStockPaths } from "@/lib/stock/revalidate";
import { CANCELED_STATUS_ID } from "@/lib/orders/status";
import { getProvider } from "@/lib/delivery";
import { and, eq, inArray, sql } from "drizzle-orm";

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
    const {
      nom_client,
      telephone,
      telephone_2,
      adresse,
      commune,
      code_wilaya,
      montant,
      remarque,
      produit,
      type,
      stop_desk,
      source,
      selectedSizeShoeId,
      provider: providerName,
      borrowerId,
    } = await request.json();

    if (!nom_client) {
      return Response.json(
        { error: "Nom client (Customer name) is required." },
        { status: 400 }
      );
    }
    if (!selectedSizeShoeId || selectedSizeShoeId.length === 0) {
      return Response.json(
        { error: "Selected size ID is required." },
        { status: 400 }
      );
    }
    if (!telephone) {
      return Response.json({ error: "Telephone is required." }, { status: 400 });
    }
    if (!adresse) {
      return Response.json(
        { error: "Adresse (Address) is required." },
        { status: 400 }
      );
    }
    if (!commune) {
      return Response.json({ error: "Commune is required." }, { status: 400 });
    }
    if (!code_wilaya) {
      return Response.json(
        { error: "Code wilaya is required." },
        { status: 400 }
      );
    }
    if (!montant) {
      return Response.json(
        { error: "Montant (Amount) is required." },
        { status: 400 }
      );
    }
    if (!produit) {
      return Response.json(
        { error: "Produit (Product) is required." },
        { status: 400 }
      );
    }
    if (!type) {
      return Response.json({ error: "Type is required." }, { status: 400 });
    }
    if (isNaN(stop_desk) || stop_desk < 0) {
      return Response.json({ error: "Stop desk is required." }, { status: 400 });
    }

    const provider = getProvider(providerName);

    // Honour line multiplicity: the same variant selected twice is one
    // orderItems row with quantity = n, and stock moves by n — not n rows of
    // quantity 1 each, which used to restore a phantom unit on retour.
    const countsByInventoryId = new Map<string, number>();
    for (const id of selectedSizeShoeId as string[]) {
      countsByInventoryId.set(id, (countsByInventoryId.get(id) ?? 0) + 1);
    }
    const items = Array.from(countsByInventoryId, ([inventoryId, quantity]) => ({
      inventoryId,
      quantity,
    }));

    // For a borrower-placed order, make sure the borrower actually holds
    // enough of each selected variant before we let them sell it.
    if (borrowerId) {
      const holdings = await db
        .select({
          inventoryId: LendedShoes.shoeInventoryId,
          held: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
        })
        .from(LendedShoes)
        .where(
          and(
            eq(LendedShoes.borrowerId, borrowerId),
            inArray(
              LendedShoes.shoeInventoryId,
              items.map((i) => i.inventoryId),
            ),
          ),
        )
        .groupBy(LendedShoes.shoeInventoryId);

      const heldMap = new Map(holdings.map((h) => [h.inventoryId, Number(h.held)]));
      const missing = items.filter(
        (item) => (heldMap.get(item.inventoryId) ?? 0) < item.quantity,
      );
      if (missing.length > 0) {
        return Response.json(
          { error: "This borrower does not hold one or more selected items." },
          { status: 400 }
        );
      }
    }

    // Create the parcel with the chosen provider FIRST (we need the tracking).
    let tracking: string;
    try {
      const created = await provider.createOrder({
        nom_client,
        telephone,
        telephone_2,
        adresse,
        commune,
        code_wilaya,
        montant,
        remarque,
        produit,
        type,
        stop_desk,
      });
      tracking = created.tracking;
    } catch (providerError) {
      console.log("provider failed to create order", providerError);
      return Response.json(
        { error: `Failed to create order: ${(providerError as Error).message}` },
        { status: 502 }
      );
    }

    // Persist everything atomically.
    await txClient().transaction(async (tx) => {
      await tx.insert(ordersTable).values({
        id: tracking,
        reference: produit,
        nom_client,
        telephone,
        telephone_2,
        adresse,
        commune,
        code_wilaya,
        montant,
        remarque,
        type,
        stop_desk,
        source,
        provider: provider.name,
        borrowerId: borrowerId ?? null,
      });

      await tx.insert(orderItems).values(
        items.map((item) => ({
          orderId: tracking,
          shoeInventoryId: item.inventoryId,
          quantity: item.quantity,
        })),
      );

      await applyMovement(
        {
          reason: borrowerId ? "borrower-sale" : "sale",
          items,
          borrowerId: borrowerId ?? undefined,
          orderId: tracking,
        },
        tx,
      );
    });

    revalidateStockPaths(borrowerId ?? undefined);

    return Response.json({ message: "Order created successfully", orderId: tracking });
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
