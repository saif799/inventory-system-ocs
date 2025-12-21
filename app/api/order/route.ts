import { db } from "@/lib/db";
import { ordersTable, shoeInventory, shoeModels } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
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
      modelId,
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
    } = await request.json();

    if (!nom_client) {
      return Response.json(
        { error: "Nom client (Customer name) is required." },
        { status: 400 }
      );
    }
    if (!telephone) {
      return Response.json(
        { error: "Telephone is required." },
        { status: 400 }
      );
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
      return Response.json(
        { error: "Stop desk is required." },
        { status: 400 }
      );
    }

    const res = await fetch(`https://platform.dhd-dz.com/api/v1/create/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.NEXT_PUBLIC_DHD_API_KEY}`,
      },
      body: JSON.stringify({
        nom_client,
        telephone,
        adresse,
        code_wilaya,
        commune,
        montant,
        reference: produit,
        produit,
        type,
        stop_desk,
        remarque,
        telephone_2,
      }),
    });

    if (res.ok) {
      const apiResponse = await res.json();
      const tracking: string = apiResponse?.tracking;
      if (!tracking) {
        return Response.json(
          { error: "Failed to create order" },
          { status: 500 }
        );
      }

      console.log("inserting the order");

      // Ensure the "reference" field in ordersTable is correctly set.
      // Use "reference: produit" since that is what is sent to DHD, and our schema allows it to be null or string.

      const AvailableSources: Record<string, string> = {
        i: "instagram",
        f: "facebook",
        t: "tiktok",
        w: "whatsapp",
        k: "Ignore",
        m: "mossab",
      };

      // const platform =
      //   typeof produit === "string" ? produit.slice(-1).toLowerCase() : "";
      // const source = AvailableSources[platform] ?? "unknown";

      await db.insert(ordersTable).values({
        id: tracking,
        reference: produit, // Add this field, as it's required by the table and is a default/optional param, but sometimes needed for Drizzle PG
        nom_client,
        telephone,
        telephone_2,
        adresse,
        commune,
        code_wilaya,
        montant,
        remarque,
        shoeInventoryId: modelId,
        type,
        stop_desk,
        source,
      });

      // Decrement shoe inventory by 1
      await db
        .update(shoeInventory)
        .set({
          quantity: sql`${shoeInventory.quantity} - 1`,
        })
        .where(eq(shoeInventory.id, modelId));

      console.log("decremented the quantity of the shoe");
      revalidatePath("/");
      revalidatePath("/orders");
      revalidatePath("/add-shoes");
      //   revalidatePath("/inventory");
    } else {
      console.log("eror happend in the backend");

      return Response.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // TODO make sure to revalidate hte orders path when u add it

    return Response.json({ message: "Order created successfully" });
  } catch (error) {
    return Response.json(
      { error: `Failed to create order ${error}` },
      { status: 500 }
    );
  }
}
