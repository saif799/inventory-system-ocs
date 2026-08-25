import { ShieldCheck, Wallet, Truck } from "lucide-react";
import { BRAND } from "@/lib/storefront/seo";
import { getT } from "@/app/i18n/server";
import type { Locale } from "@/i18n.config";

/**
 * Landing-page trust section. Unlike the footer/hero, this sits on the muted
 * --sf-surface fill between hairline top/bottom borders — a documentation
 * block, not a color field. Heading and body stay left-aligned; the three
 * facts switch from a horizontal icon+label row (mobile) to a vertical
 * icon-over-label column (desktop), each divided by the same hairline.
 */
export default async function AuthenticityBand({ lng }: { lng: Locale }) {
  const { t } = await getT(lng, ["home", "common"]);

  const items = [
    { icon: ShieldCheck, label: t("common:trust.authentic") },
    { icon: Wallet, label: t("common:trust.cod") },
    { icon: Truck, label: t("common:trust.delivery") },
  ];

  return (
    <section className="border-y border-(--sf-line) bg-(--sf-surface)">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <h2 className="sf-heading max-w-xl text-xl font-medium leading-tight tracking-[-0.02em] text-(--sf-text) md:text-3xl">
          {t("home:authenticity.title")}
        </h2>
        <p className="sf-body mt-3 max-w-lg text-sm font-normal leading-relaxed text-(--sf-muted) md:mt-4">
          {t("home:authenticity.body", { brand: BRAND.name })}
        </p>

        <div className="mt-6 grid grid-cols-1 divide-y divide-(--sf-line) border-b border-t border-(--sf-line) sm:mt-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:border-b-0">
          {items.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 py-4 sm:flex-col sm:items-start sm:gap-3 sm:px-6 sm:py-0 sm:first:ps-0"
            >
              <Icon className="h-6 w-6 shrink-0 text-(--sf-accent)" strokeWidth={1.5} />
              <span className="sf-body text-sm font-normal leading-relaxed text-(--sf-text)">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
