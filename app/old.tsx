"use client"
import Link from "next/link"
import { Package, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Shoe Inventory Manager</h1>
          <p className="text-xl text-slate-300">Manage your shoe store inventory with ease</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Link href="/add-shoes">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <CardHeader>
                <Package className="w-12 h-12 text-blue-400 mb-2" />
                <CardTitle className="text-white">Add Shoes</CardTitle>
                <CardDescription className="text-slate-400">Add new shoes to inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Get Started</Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-slate-800 border-slate-700">
              <CardHeader>
                <BarChart3 className="w-12 h-12 text-emerald-400 mb-2" />
                <CardTitle className="text-white">View Inventory</CardTitle>
                <CardDescription className="text-slate-400">Manage and track all shoes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">View</Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  )
}
