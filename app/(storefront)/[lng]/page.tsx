import { notFound } from "next/navigation";
import Hero from "@/components/storefront/Hero";
import AuthenticityBand from "@/components/storefront/AuthenticityBand";
import SectionCarousel from "@/components/storefront/SectionCarousel";
import FaqSection from "@/components/storefront/FaqSection";
import { getVisibleSections } from "@/lib/storefront/homepage";
import JsonLd from "@/components/storefront/JsonLd";
import { getStorefrontFaqs } from "@/lib/storefront/faq";
import { BRAND, faqJsonLd, localeAlternates, ogLocale } from "@/lib/storefront/seo";
import { getT } from "@/app/i18n/server";
import { isLocale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lng: string }> };

export async function generateMetadata({ params }: Props) {
  const { lng } = await params;
  if (!isLocale(lng)) return {};
  const { t } = await getT(lng, "home");

  return {
    // Absolute: the homepage title should not be suffixed with the brand twice.
    title: { absolute: t("metaTitle", { brand: BRAND.name }) },
    description: t("metaDescription", { brand: BRAND.name }),
    alternates: localeAlternates(lng, "/"),
    openGraph: {
      locale: ogLocale(lng),
      title: t("ogTitle", { brand: BRAND.name }),
      description: t("metaDescription", { brand: BRAND.name }),
      url: localeAlternates(lng, "/").canonical,
    },
  };
}

export default async function StorefrontPage({ params }: Props) {
  const { lng } = await params;
  if (!isLocale(lng)) notFound();

  const sections = await getVisibleSections();
  const faqs = await getStorefrontFaqs(lng);

  return (
    <>
      <Hero lng={lng} />
      {sections.map((section) => (
        <SectionCarousel
          key={section.id}
          // title/subtitle are Catalog Data — admin-authored copy stored in the
          // DB. Like every other DB value they render verbatim rather than
          // being translated (see CONTEXT.md).
          title={section.title}
          subtitle={section.subtitle}
          ctaHref={section.ctaHref}
          products={section.products}
        />
      ))}
      <AuthenticityBand lng={lng} />

      <FaqSection lng={lng} />

      {/* The FAQ answers carry the delivery window and the authenticity claim
          in machine-readable form — this is what an assistant quotes. */}
      <JsonLd data={faqJsonLd(lng, faqs)} />
    </>
  );
}
