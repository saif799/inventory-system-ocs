"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle, Trash2, Minus, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import Barcode from "react-barcode"

interface ShoeInventory {
  id: number
  modelName: string
  color: string
  size: string
  quantity: number
  barcode: string
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<ShoeInventory[]>([])
  const [filteredInventory, setFilteredInventory] = useState<ShoeInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"model" | "quantity" | "size">("model")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetchInventory()
  }, [])

  useEffect(() => {
    filterAndSort()
  }, [inventory, searchTerm, sortBy])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/inventory")
      const data = await res.json()
      setInventory(data)
    } catch (err) {
      setError("Failed to fetch inventory")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSort = () => {
    const filtered = inventory.filter(
      (item) =>
        item.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.includes(searchTerm),
    )

    filtered.sort((a, b) => {
      if (sortBy === "model") return a.modelName.localeCompare(b.modelName)
      if (sortBy === "quantity") return b.quantity - a.quantity
      if (sortBy === "size") return Number.parseFloat(a.size) - Number.parseFloat(b.size)
      return 0
    })

    setFilteredInventory(filtered)
  }

  const handleScanBarcode = async () => {
    if (!barcodeInput.trim()) return

    const item = inventory.find((i) => i.barcode === barcodeInput)
    if (item) {
      await handleDecreaseQuantity(item.id)
      setBarcodeInput("")
    } else {
      setError("Barcode not found")
      setTimeout(() => setError(""), 3000)
    }
  }

  const handleDecreaseQuantity = async (id: number) => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decrease" }),
      })

      if (res.ok) {
        fetchInventory()
      }
    } catch (err) {
      setError("Failed to update quantity")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchInventory()
      }
    } catch (err) {
      setError("Failed to delete item")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
        <div className="container mx-auto px-4">
          <p className="text-slate-300">Loading inventory...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Inventory Management</h1>
          <p className="text-slate-400">Total items: {filteredInventory.length}</p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Barcode Scanner</CardTitle>
            <CardDescription className="text-slate-400">Scan a barcode to decrease quantity by 1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Scan barcode here..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleScanBarcode()}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                autoFocus
              />
              <Button onClick={handleScanBarcode} className="bg-blue-600 hover:bg-blue-700">
                Scan
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search by model, color, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pl-10"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-md"
              >
                <option value="model">Sort by Model</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="size">Sort by Size</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {filteredInventory.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-center">No items found</p>
              </CardContent>
            </Card>
          ) : (
            filteredInventory.map((item) => (
              <Card
                key={item.id}
                className={`bg-slate-800 border-slate-700 ${item.quantity < 5 ? "border-yellow-600" : ""}`}
              >
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm text-slate-400">Model</p>
                      <p className="text-white font-semibold">{item.modelName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Color</p>
                      <p className="text-white">{item.color}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Size</p>
                      <p className="text-white">{item.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Quantity</p>
                      <p className={`text-lg font-bold ${item.quantity < 5 ? "text-yellow-400" : "text-white"}`}>
                        {item.quantity}
                      </p>
                      {item.quantity < 5 && <p className="text-xs text-yellow-400">Low stock!</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDecreaseQuantity(item.id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        size="sm"
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">Barcode</p>
                    <div className="bg-white p-2 rounded inline-block">
                      <Barcode value={item.barcode} width={1.5} height={40} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
