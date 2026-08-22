import { ShieldCheck, Wallet, Truck } from "lucide-react";
import { BRAND, DELIVERY } from "@/lib/storefront/seo";

const items = [
  { icon: ShieldCheck, label: "Basketball 100% authentique" },
  { icon: Wallet, label: "Paiement à la livraison" },
  { icon: Truck, label: `${DELIVERY.labelFr} — ${DELIVERY.wilayas} wilayas` },
];

/**
 * Landing-page trust section. Sits on --sf-footer (the same charcoal as the
 * footer) rather than the white ground, so it reads as a distinct full-bleed
 * band between the product rails — the one place besides the footer that
 * breaks from white. Everything is centered, and top/bottom padding is the
 * same value so the block doesn't look bottom-heavy.
 */
export default function AuthenticityBand() {
  return (
    <section className="bg-(--sf-footer) py-14 md:py-16">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="sf-heading text-xl font-medium text-(--sf-footer-fg) md:text-2xl">
          Authenticité garantie, livraison en 24-48h
        </h2>
        <p className="sf-body mx-auto mt-2 max-w-xl text-sm font-normal text-(--sf-footer-muted)">
          {BRAND.name} vérifie chaque paire de chaussures de basketball avant
          expédition, sans exception. {DELIVERY.sentenceFr}
        </p>

        <div className="mx-auto mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <Icon className="h-7 w-7 text-(--sf-footer-fg)" strokeWidth={1.5} />
              <span className="sf-body text-sm font-normal text-(--sf-footer-muted)">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
