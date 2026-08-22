import Hero from "@/components/storefront/Hero";
import AuthenticityBand from "@/components/storefront/AuthenticityBand";
import SectionCarousel from "@/components/storefront/SectionCarousel";
import FaqSection from "@/components/storefront/FaqSection";
import { getVisibleSections } from "@/lib/storefront/homepage";
import JsonLd from "@/components/storefront/JsonLd";
import { STOREFRONT_FAQS } from "@/lib/storefront/faq";
import { BRAND, faqJsonLd } from "@/lib/storefront/seo";

export const dynamic = "force-dynamic";

export const metadata = {
  // Absolute: the homepage title should not be suffixed with the brand twice.
  title: {
    absolute: `${BRAND.name} — Chaussures de basketball authentiques en Algérie | Livraison 24-48h`,
  },
  description: BRAND.descriptionFr,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.descriptionFr,
    url: "/",
  },
};

export default async function StorefrontPage() {
  const sections = await getVisibleSections();

  return (
    <>
      <Hero />
      {sections.map((section) => (
        <SectionCarousel
          key={section.id}
          title={section.title}
          subtitle={section.subtitle}
          ctaHref={section.ctaHref}
          products={section.products}
        />
      ))}
      <AuthenticityBand />

      <FaqSection />

      {/* The FAQ answers carry the delivery window and the authenticity claim
          in machine-readable form — this is what an assistant quotes. */}
      <JsonLd data={faqJsonLd(STOREFRONT_FAQS)} />
    </>
  );
}
