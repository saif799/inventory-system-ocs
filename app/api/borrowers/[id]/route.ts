import { db } from "@/lib/db";
import { LendedShoes, borrower, ordersTable } from "@/lib/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const MAX_NAME_LENGTH = 80;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!id) {
      return Response.json({ error: "Invalid borrower id" }, { status: 400 });
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    if (cleanName.length > MAX_NAME_LENGTH) {
      return Response.json(
        { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` },
        { status: 400 },
      );
    }

    // Reject a rename that collides with a DIFFERENT borrower (case-insensitive).
    const [clash] = await db
      .select({ id: borrower.id })
      .from(borrower)
      .where(
        and(
          sql`LOWER(${borrower.name}) = LOWER(${cleanName})`,
          ne(borrower.id, id),
        ),
      )
      .limit(1);

    if (clash) {
      return Response.json(
        { error: "Another borrower already has that name" },
        { status: 409 },
      );
    }

    const [updated] = await db
      .update(borrower)
      .set({ name: cleanName })
      .where(eq(borrower.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "Borrower not found" }, { status: 404 });
    }

    revalidatePath("/borrowers");
    revalidatePath(`/${id}`);
    return Response.json(updated);
  } catch (error) {
    console.error("Failed to rename borrower", error);
    return Response.json({ error: "Failed to rename borrower" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: "Invalid borrower id" }, { status: 400 });
    }

    // Guard: cannot delete a borrower who still holds shoes.
    const [summary] = await db
      .select({
        held: sql<number>`COALESCE(SUM(${LendedShoes.quantity}), 0)`,
      })
      .from(LendedShoes)
      .where(eq(LendedShoes.borrowerId, id));

    if (Number(summary?.held ?? 0) > 0) {
      return Response.json(
        {
          error:
            "This borrower still holds shoes. Bring everything back before deleting.",
        },
        { status: 409 },
      );
    }

    // Detach any historical orders they placed (keep the orders, drop the link),
    // then clear their net-zero lending history, then delete.
    await db
      .update(ordersTable)
      .set({ borrowerId: null })
      .where(eq(ordersTable.borrowerId, id));
    await db.delete(LendedShoes).where(eq(LendedShoes.borrowerId, id));
    const [deleted] = await db
      .delete(borrower)
      .where(eq(borrower.id, id))
      .returning({ id: borrower.id });

    if (!deleted) {
      return Response.json({ error: "Borrower not found" }, { status: 404 });
    }

    revalidatePath("/borrowers");
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete borrower", error);
    return Response.json({ error: "Failed to delete borrower" }, { status: 500 });
  }
}
