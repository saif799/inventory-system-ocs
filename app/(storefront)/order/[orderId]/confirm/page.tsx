import { db } from "@/lib/db";
import { ordersTable, orderItems, shoeInventory, shoes, shoeModels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { formatDA } from "@/lib/format";

type Props = { params: Promise<{ orderId: string }> };

export const metadata = {
  title: "Commande confirmée — OCS Store",
};

export default async function OrderConfirmPage({ params }: Props) {
  const { orderId } = await params;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) notFound();

  const items = await db
    .select({
      inventoryId: shoeInventory.id,
      size: shoeInventory.size,
      color: shoes.color,
      modelName: shoeModels.modelName,
    })
    .from(orderItems)
    .innerJoin(shoeInventory, eq(orderItems.shoeInventoryId, shoeInventory.id))
    .innerJoin(shoes, eq(shoeInventory.shoeId, shoes.id))
    .innerJoin(shoeModels, eq(shoes.modelId, shoeModels.id))
    .where(eq(orderItems.orderId, orderId));

  const whatsappMessage = encodeURIComponent(
    `Bonjour ! Je viens de passer une commande.\nCommande : ${order.reference || orderId}\nNom : ${order.nom_client}\nTotal : ${formatDA(Number(order.montant))}`,
  );
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "213XXXXXXXXX";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="flex flex-col items-center gap-5 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-600" strokeWidth={1.5} />
        <div>
          <h1 className="sf-heading text-xl font-medium text-green-600 md:text-2xl">
            Commande passée !
          </h1>
          <p className="sf-body mt-2 text-sm font-light text-(--sf-muted)">
            Merci, {order.nom_client}. Votre commande a bien été reçue.
          </p>
        </div>
      </div>

      <div className="sf-body mt-8 space-y-4 text-sm">
        {/* <div className="flex justify-between">
          <span className="text-(--sf-muted)">Numéro de commande</span>
          <span className="font-medium">{order.reference || orderId}</span>
        </div> */}

        <div className="space-y-3 pt-4">
          <p className="font-medium">Articles</p>
          {items.map((item) => (
            <div key={item.inventoryId} className="flex justify-between">
              <span>
                {item.modelName} — {item.color}
              </span>
              <span className="text-(--sf-text)">Pointure {item.size}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-(--sf-line) pt-4">
          <div className="flex justify-between">
            <span className="text-(--sf-text)">Livraison</span>
            <span>
              {order.commune}, Wilaya {order.code_wilaya}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-(--sf-text)">Téléphone</span>
            <span>{order.telephone}</span>
          </div>
        </div>

        <div className="my-4 border-t border-(--sf-text)" />
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span className="text-(--sf-text)">{formatDA(Number(order.montant))}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 bg-green-600 py-4 text-sm font-medium text-(--sf-ink-fg) transition-opacity hover:opacity-90"
          style={{ borderRadius: "var(--sf-radius)" }}
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          Nous contacter sur WhatsApp
        </a>
        <Link
          href="/products"
          className="flex w-full items-center justify-center border border-(--sf-line) py-4 text-sm font-medium text-(--sf-text) transition-colors hover:bg-(--sf-hover)"
          style={{ borderRadius: "var(--sf-radius)" }}
        >
          Continuer mes achats
        </Link>
      </div>
    </main>
  );
}
