import { db } from "@/lib/db"

export async function GET() {
  try {
    const inventory = db.inventory.getAll()
    return Response.json(inventory)
  } catch (error) {
    return Response.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { shoeId, size, quantity } = await request.json()

    if (!shoeId || !size || !quantity) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = db.inventory.create(shoeId, size, quantity)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: "Failed to create inventory entry" }, { status: 500 })
  }
}
