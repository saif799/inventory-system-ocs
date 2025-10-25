import { db } from "@/lib/db"

export async function GET() {
  try {
    const models = db.shoeModels.getAll()
    return Response.json(models)
  } catch (error) {
    return Response.json({ error: "Failed to fetch models" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { modelName } = await request.json()

    if (!modelName) {
      return Response.json({ error: "Model name is required" }, { status: 400 })
    }

    const result = db.shoeModels.create(modelName)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: "Failed to create model" }, { status: 500 })
  }
}
