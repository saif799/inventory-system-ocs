import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND, DELIVERY } from "@/lib/storefront/seo";

/**
 * Static — no DB, no hero table (see ADR-0002, superseding ADR-0001 §1).
 *
 * Documentation, not marketing: a light ground with hairline dividers and a
 * stat list standing in for hero imagery, rather than a photo + scrim. The
 * one flourish is the Volt "100% authentique" tag; everything else borrows
 * the system's vocabulary (Pine for the one verified stat, --sf-ink for the
 * primary CTA).
 */
const stats: { label: string; value: string; accent?: boolean }[] = [
  { label: "Livraison", value: `${DELIVERY.minHours}–${DELIVERY.maxHours}h` },
  { label: "Couverture", value: `${DELIVERY.wilayas} wilayas` },
  { label: "Paiement", value: "À la livraison" },
  { label: "Vérification", value: "Chaque paire", accent: true },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-(--sf-line) bg-(--sf-bg)">
      <div className="mx-auto flex min-h-[calc(100svh-var(--sf-nav-h))] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-end gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-12">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="sf-body text-[11px] font-medium uppercase tracking-[0.08em] text-(--sf-highlight-fg)"
                style={{ borderRadius: "var(--sf-radius-sm)", backgroundColor: "var(--sf-highlight)", padding: "4px 6px" }}
              >
                100% authentique
              </span>
              <span className="sf-body text-xs font-normal uppercase tracking-[0.12em] text-(--sf-muted) md:text-sm">
                {BRAND.name}
              </span>
            </div>

            <h1 className="sf-heading mt-6 max-w-3xl text-4xl font-medium leading-[1] tracking-[-0.04em] text-(--sf-text) md:text-5xl lg:text-6xl">
              Chaussures de basketball authentiques en Algérie
            </h1>

            <div className="my-8 h-px bg-(--sf-line)" />

            <p className="sf-body max-w-lg text-sm font-normal leading-relaxed text-(--sf-muted) md:text-base">
              {DELIVERY.sentenceFr}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="sf-heading inline-flex items-center bg-(--sf-ink) px-6 py-3.5 text-sm font-normal text-(--sf-ink-fg) transition-opacity hover:opacity-90"
                style={{ borderRadius: "var(--sf-radius)" }}
              >
                Découvrir la collection
              </Link>
              <Link
                href="/products"
                className="sf-heading inline-flex items-center gap-2 px-4 py-3.5 text-sm font-normal text-(--sf-text) transition-opacity hover:opacity-70"
              >
                Voir les nouveautés
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <dl className="m-0 flex flex-col border-t border-(--sf-line)">
            {stats.map(({ label, value, accent }) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between gap-4 border-b border-(--sf-line) py-3",
                  accent && "hidden md:flex",
                )}
              >
                <dt className="sf-body text-xs font-normal uppercase tracking-[0.12em] text-(--sf-muted)">
                  {label}
                </dt>
                <dd
                  className={cn(
                    "sf-body m-0 text-sm font-normal",
                    accent ? "text-(--sf-accent)" : "text-(--sf-text)",
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="sf-body mt-14 text-xs font-normal uppercase tracking-[0.25em] text-(--sf-muted)">
          Every Pair Counts
        </p>
      </div>
    </section>
  );
}
