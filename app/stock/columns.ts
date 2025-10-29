"use client"

import { ColumnDef } from "@tanstack/react-table"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Stock = {
  id: string
  model: string
  color: string
  size: number
  amount: number
  status: "pending" | "processing" | "success" | "failed"
}

export const columns: ColumnDef<Stock>[] = [
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "amount",
    header: "Amount",
  },
]