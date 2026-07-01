import { db, txClient } from "@/lib/db";
import {
  LendedShoes,
  orderItems,
  ordersTable,
  shoeInventory,
  shoeModels,
} from "@/lib/schema";
import { flagNotifier } from "@/lib/notifier";
import { getProvider } from "@/lib/delivery";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

    // Distinct inventory ids (parity with the existing decrement-by-distinct
    // behaviour) — one unit per selected variant.
    const inventoryIds: string[] = Array.from(new Set(selectedSizeShoeId));

    // For a borrower-placed order, make sure the borrower actually holds each
    // selected variant before we let them sell it.
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
            inArray(LendedShoes.shoeInventoryId, inventoryIds),
          ),
        )
        .groupBy(LendedShoes.shoeInventoryId);

      const heldMap = new Map(holdings.map((h) => [h.inventoryId, Number(h.held)]));
      const missing = inventoryIds.filter((id) => (heldMap.get(id) ?? 0) < 1);
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
        selectedSizeShoeId.map((shoeId: string) => ({
          orderId: tracking,
          shoeInventoryId: shoeId,
        }))
      );

      for (const inventoryId of inventoryIds) {
        const [row] = await tx
          .update(shoeInventory)
          .set({ quantity: sql`GREATEST(0, ${shoeInventory.quantity} - 1)` })
          .where(eq(shoeInventory.id, inventoryId))
          .returning({ id: shoeInventory.id, quantity: shoeInventory.quantity });

        // A borrower-placed order is drawn from the borrower's own held stock:
        // also record a -1 lend row so their holdings drop while the owner's
        // sellable store is left unchanged.
        if (borrowerId) {
          await tx.insert(LendedShoes).values({
            borrowerId,
            shoeInventoryId: inventoryId,
            quantity: -1,
          });
        }

        // Gallery: variant just hit total 0 -> remove its photo.
        if (row?.quantity === 0) {
          await flagNotifier(inventoryId, "remove", undefined, tx);
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/add-shoes");
    if (borrowerId) revalidatePath(`/${borrowerId}`);

    return Response.json({ message: "Order created successfully" });
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

    // Read the order's variants WITH their current (pre-increment) stock so we
    // can tell which ones are coming back from being out of stock.
    const items = await db
      .selectDistinct({
        id: shoeInventory.id,
        quantity: shoeInventory.quantity,
      })
      .from(orderItems)
      .innerJoin(shoeInventory, eq(orderItems.shoeInventoryId, shoeInventory.id))
      .where(eq(orderItems.orderId, orderId));

    await txClient().transaction(async (tx) => {
      // set status to canceled
      await tx
        .update(ordersTable)
        .set({ statusId: "e01a36c1-087c-46ab-aa4c-12b1a5186bf1" })
        .where(eq(ordersTable.id, orderId));

      for (const item of items) {
        // Reverse the stock decrement done at creation.
        await tx
          .update(shoeInventory)
          .set({ quantity: sql`${shoeInventory.quantity} + 1` })
          .where(eq(shoeInventory.id, item.id));

        // If it was a borrower order, also give the unit back to the borrower.
        if (order.borrowerId) {
          await tx.insert(LendedShoes).values({
            borrowerId: order.borrowerId,
            shoeInventoryId: item.id,
            quantity: 1,
          });
        }

        // Gallery add-back only for variants that were out of stock before.
        if (item.quantity === 0) {
          await flagNotifier(item.id, "restock", orderId, tx);
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/orders");
    revalidatePath("/add-shoes");
    if (order.borrowerId) revalidatePath(`/${order.borrowerId}`);

    return Response.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log(error);
    return Response.json(
      { error: `Failed to delete order: ${error}` },
      { status: 500 }
    );
  }
}
