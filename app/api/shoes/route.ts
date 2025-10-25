import { db } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: Request) {
  try {
    const { modelId, color, size, quantity } = await request.json()

    if (!modelId || !color || !size || !quantity) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const barcode = uuidv4().replace(/-/g, "").substring(0, 12)

    const result = db.shoes.create(modelId, color, barcode)
    const shoeId = result.id

    // Create inventory entry
    const inventoryRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shoeId,
        size,
        quantity,
      }),
    })

    return Response.json(result)
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to create shoe" }, { status: 500 })
  }
}
