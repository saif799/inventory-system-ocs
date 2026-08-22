import { ShieldCheck, Wallet, Truck } from "lucide-react";
import { DELIVERY } from "@/lib/storefront/seo";

const items = [
  { icon: ShieldCheck, label: "Basketball 100% authentique" },
  { icon: Wallet, label: "Paiement à la livraison" },
  { icon: Truck, label: `${DELIVERY.labelFr} — ${DELIVERY.wilayas} wilayas` },
];

export default function TrustBand() {
  return (
    <div className="sf-body grid grid-cols-1 gap-4 border-t border-(--sf-line) py-6 sm:grid-cols-3">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 text-(--sf-text)" strokeWidth={1.5} />
          <span className="text-sm font-normal text-(--sf-text)">{label}</span>
        </div>
      ))}
    </div>
  );
}
