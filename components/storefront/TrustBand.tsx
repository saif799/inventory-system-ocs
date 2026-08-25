import { ShieldCheck, Wallet, Truck } from "lucide-react";
import { getT } from "@/app/i18n/server";
import type { Locale } from "@/i18n.config";

export default async function TrustBand({ lng }: { lng: Locale }) {
  const { t } = await getT(lng, "common");

  const items = [
    { icon: ShieldCheck, label: t("trust.authentic") },
    { icon: Wallet, label: t("trust.cod") },
    { icon: Truck, label: t("trust.delivery") },
  ];

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
