import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/storefront/seo";
import { getT } from "@/app/i18n/server";
import { localePath, type Locale } from "@/i18n.config";

/**
 * Static — no DB, no hero table (see ADR-0002, superseding ADR-0001 §1).
 *
 * Documentation, not marketing: a light ground with hairline dividers rather
 * than a photo + scrim. The one flourish is the Volt "100% authentique" tag;
 * everything else borrows the system's vocabulary (--sf-ink for the primary
 * CTA).
 *
 * The delivery block that used to sit here — a prose sentence plus a
 * four-row stat list (Livraison / Couverture / Paiement / Vérification) — was
 * removed deliberately. The delivery promise still lives in the authenticity
 * band, the trust band and the FAQ; repeating it three screens above those was
 * the noisiest of the four. With it gone the hero is a single column.
 */
export default async function Hero({ lng }: { lng: Locale }) {
  const { t } = await getT(lng, "home");

  return (
    <section className="relative overflow-hidden border-b border-(--sf-line) bg-(--sf-bg)">
      <div className="mx-auto flex min-h-[calc(100svh-var(--sf-nav-h))] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="sf-body text-[11px] font-medium uppercase tracking-[0.08em] text-(--sf-highlight-fg)"
              style={{ borderRadius: "var(--sf-radius-sm)", backgroundColor: "var(--sf-highlight)", padding: "4px 6px" }}
            >
              {t("hero.badge")}
            </span>
            <span className="sf-body text-xs font-normal uppercase tracking-[0.12em] text-(--sf-muted) md:text-sm">
              {BRAND.name}
            </span>
          </div>

          <h1 className="sf-heading mt-6 text-4xl font-medium leading-none tracking-[-0.04em] text-(--sf-text) md:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>

          <div className="my-8 h-px bg-(--sf-line)" />

          <p className="sf-body max-w-lg text-sm font-normal leading-relaxed text-(--sf-muted) md:text-base">
            {t("hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={localePath(lng, "/products")}
              className="sf-heading inline-flex items-center bg-(--sf-ink) px-6 py-3.5 text-sm font-normal text-(--sf-ink-fg) transition-opacity hover:opacity-90"
              style={{ borderRadius: "var(--sf-radius)" }}
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href={localePath(lng, "/products")}
              className="sf-heading inline-flex items-center gap-2 px-4 py-3.5 text-sm font-normal text-(--sf-text) transition-opacity hover:opacity-70"
            >
              {t("hero.ctaSecondary")}
              {/* Points "forward", which is leftward in RTL. */}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <p className="sf-body mt-14 text-xs font-normal uppercase tracking-[0.25em] text-(--sf-muted)">
          {t("hero.tagline")}
        </p>
      </div>
    </section>
  );
}
