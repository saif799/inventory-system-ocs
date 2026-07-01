import { db } from "@/lib/db";
import { borrower } from "@/lib/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const borrowers = await db
      .select({
        id: borrower.id,
        name: borrower.name,
      })
      .from(borrower)
      .orderBy(asc(borrower.name));

    return Response.json(borrowers);
  } catch (error) {
    console.error("Failed to fetch borrowers:", error);
    return Response.json({ error: "Failed to fetch borrowers" }, { status: 500 });
  }
}
