import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { ordersTable } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";

import wilayas from "@/wilayas.json";

interface Order {
  id: string;
  nom_client: string;
  telephone: string;
  telephone_2?: string | null;
  adresse: string;
  commune: string;
  code_wilaya: number;
  montant: number;
  remarque?: string | null;
  produit: string;
  type: number;
  stop_desk: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function getOrders(): Promise<InferSelectModel<typeof ordersTable>[]> {
  const Orders = await db.select().from(ordersTable);

  return Orders;
}

export default async function OrdersPage() {
  const orders = await getOrders();
  const AvailableSources = [
    { code: "i", value: "instagram" },
    { code: "f", value: "facebook" },
    { code: "t", value: "tiktok" },
    { code: "w", value: "whatsapp" },
    { code: "k", value: "Ignore" },
    { code: "m", value: "mossab" },
  ];
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>A list of all customer orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Wilaya</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stop Desk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>source</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Saif paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.reference}</TableCell>

                      <TableCell className="font-medium">
                        {order.nom_client}
                      </TableCell>

                      <TableCell>{order.telephone}</TableCell>
                      <TableCell>{order.adresse}</TableCell>
                      <TableCell>
                        {
                          wilayas.find(
                            (wilaya) =>
                              wilaya.wilaya_id === Number(order.code_wilaya)
                          )?.wilaya_name
                        }
                      </TableCell>
                      <TableCell>{order.commune}</TableCell>
                      <TableCell>{order.montant} DZD</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.type
                              ? "bg-amber-500 text-white"
                              : "bg-sky-500 text-white"
                          }`}
                        >
                          {!order.type ? "a domicile" : "bureau"}
                        </span>
                      </TableCell>
                      <TableCell>{order.stop_desk}</TableCell>

                      <TableCell>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${
                              order.status === "en livraison"
                                ? "bg-orange-500 text-white"
                                : order.status === "livré"
                                ? "bg-green-500 text-green-800"
                                : "bg-red-500 text-red-800"
                            }
                          `}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${
                              order.source === "i"
                                ? "bg-violet-500 text-white"
                                : order.source === "p"
                                ? "bg-blue-500 text-white"
                                : order.source === "t"
                                ? "bg-green-500 text-white"
                                : order.source === "w"
                                ? "bg-yellow-500 text-white"
                                : order.source === "k"
                                ? "bg-red-500 text-white"
                                : order.source === "m"
                                ? "bg-purple-500 text-white"
                                : "bg-red-100 text-red-800"
                            }
                          `}
                        >
                          {
                            AvailableSources.find(
                              (source) => source.code === order.source
                            )?.value
                          }{" "}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.saif_paid ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
