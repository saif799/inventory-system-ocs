import Hero from "@/components/storefront/Hero";
import AuthenticityBand from "@/components/storefront/AuthenticityBand";
import SectionCarousel from "@/components/storefront/SectionCarousel";
import FaqSection from "@/components/storefront/FaqSection";
import { getVisibleSections } from "@/lib/storefront/homepage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "OCS Store — Sneakers en Algérie",
  description:
    "Sneakers authentiques, livrées partout en Algérie. Paiement à la livraison.",
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
    </>
  );
}
