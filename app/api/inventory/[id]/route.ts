import { db } from "@/lib/db"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await request.json()
    const id = Number.parseInt(params.id)

    if (action === "decrease") {
      const item = db.inventory.getById(id)

      if (!item) {
        return Response.json({ error: "Item not found" }, { status: 404 })
      }

      const newQuantity = Math.max(0, item.quantity - 1)
      const result = db.inventory.update(id, newQuantity)

      return Response.json(result)
    }

    return Response.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return Response.json({ error: "Failed to update inventory" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const success = db.inventory.delete(id)

    if (!success) {
      return Response.json({ error: "Item not found" }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: "Failed to delete inventory item" }, { status: 500 })
  }
}
